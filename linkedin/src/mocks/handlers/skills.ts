import { http, HttpResponse } from 'msw'
import {
  MAX_PINNED_SKILLS,
  MAX_SKILL_NAME_LENGTH,
  MAX_SKILLS,
  normalizeSkillName,
} from '@/lib/skills'
import type { Skill, SkillEndorser, SkillView, User } from '@/types'
import { generateId, getDb, requireUserId, setDb } from '../db'
import { connectionDegree } from './users'

type Db = ReturnType<typeof getDb>

// Mirrors linkedin-api/internal/service/skills.go: same rules, messages and status codes.

const fail = (message: string, status: number) => HttpResponse.json({ message }, { status })

function findUser(db: Db, ref: string, viewerId: string) {
  const id = ref === 'me' ? viewerId : ref
  return db.users.find((u) => u.id === id || u.username === id)
}

function currentCompany(db: Db, user: User) {
  if (user.companyId) {
    const company = db.companies.find((c) => c.id === user.companyId)
    if (company) return company.name
  }
  return user.experience.find((e) => e.current)?.company ?? ''
}

function toEndorser(db: Db, user: User, viewerId: string): SkillEndorser {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    headline: user.headline,
    avatarUrl: user.avatarUrl,
    degree: connectionDegree(viewerId, user.id, db),
  }
}

/** Viewer first, then the most recent endorsers. */
function orderedEndorserIds(skill: Skill, viewerId: string) {
  const ids = [...(skill.endorserIds ?? [])].reverse()
  const mine = ids.indexOf(viewerId)
  if (mine > 0) ids.unshift(...ids.splice(mine, 1))
  return ids
}

function toSkillView(db: Db, owner: User, skill: Skill, viewerId: string): SkillView {
  const ids = skill.endorserIds ?? []
  const endorsers = orderedEndorserIds(skill, viewerId)
    .map((id) => db.users.find((u) => u.id === id))
    .filter((u): u is User => Boolean(u))
    .slice(0, 3)
    .map((u) => toEndorser(db, u, viewerId))
  const company = currentCompany(db, owner)
  const colleagues = company
    ? ids.filter((id) => {
        const u = db.users.find((x) => x.id === id)
        return u && currentCompany(db, u).toLowerCase() === company.toLowerCase()
      }).length
    : 0
  return {
    id: skill.id,
    name: skill.name,
    endorsements: ids.length,
    pinned: Boolean(skill.pinned),
    endorsedByMe: ids.includes(viewerId),
    endorsers,
    ...(colleagues > 0 ? { colleagueHighlight: { company, count: colleagues } } : {}),
  }
}

/** Top skills first, then by endorsement count; ties keep the owner's order. */
function sortedSkills(skills: Skill[]) {
  return skills
    .map((s, i) => ({ s, i }))
    .sort(
      (a, b) =>
        Number(Boolean(b.s.pinned)) - Number(Boolean(a.s.pinned)) ||
        (b.s.endorserIds?.length ?? 0) - (a.s.endorserIds?.length ?? 0) ||
        a.i - b.i,
    )
    .map(({ s }) => s)
}

function endorsementNotificationId(skillId: string, endorserId: string) {
  return `n_endorse_${skillId}_${endorserId}`
}

/** Shared lookups for the per-skill routes; returns a Response on failure. */
function resolveSkill(params: Record<string, unknown>, headers: Headers) {
  const viewerId = requireUserId(headers)
  if (!viewerId) return fail('Unauthorized', 401)
  const db = getDb()
  const owner = findUser(db, String(params.id), viewerId)
  if (!owner) return fail('User not found', 404)
  const skill = owner.skills.find((s) => s.id === params.skillId)
  if (!skill) return fail('Skill not found', 404)
  return { viewerId, db, owner, skill }
}

function updateSkill(ownerId: string, skillId: string, fn: (skill: Skill, owner: User) => void) {
  setDb((d) => {
    const owner = d.users.find((u) => u.id === ownerId)
    const skill = owner?.skills.find((s) => s.id === skillId)
    if (owner && skill) fn(skill, owner)
  })
  const db = getDb()
  const owner = db.users.find((u) => u.id === ownerId)!
  return { db, owner, skill: owner.skills.find((s) => s.id === skillId)! }
}

export const skillHandlers = [
  http.get('/api/users/:id/skills', ({ params, request }) => {
    const viewerId = requireUserId(request.headers)
    if (!viewerId) return fail('Unauthorized', 401)
    const db = getDb()
    const owner = findUser(db, String(params.id), viewerId)
    if (!owner) return fail('User not found', 404)
    const isOwner = owner.id === viewerId
    return HttpResponse.json({
      skills: sortedSkills(owner.skills).map((s) => toSkillView(db, owner, s, viewerId)),
      isOwner,
      canEndorse: !isOwner && owner.connectionIds.includes(viewerId),
    })
  }),

  http.post('/api/users/:id/skills', async ({ params, request }) => {
    const viewerId = requireUserId(request.headers)
    if (!viewerId) return fail('Unauthorized', 401)
    const owner = findUser(getDb(), String(params.id), viewerId)
    if (!owner) return fail('User not found', 404)
    if (owner.id !== viewerId) return fail('You can only edit your own skills', 403)
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null
    if (typeof body?.name !== 'string') return fail('Skill name is required', 400)
    const name = normalizeSkillName(body.name)
    if (!name) return fail('Skill name is required', 400)
    if ([...name].length > MAX_SKILL_NAME_LENGTH) {
      return fail(`Skill name must be ${MAX_SKILL_NAME_LENGTH} characters or fewer`, 400)
    }
    const existing = owner.skills.find((s) => s.name.toLowerCase() === name.toLowerCase())
    if (existing) return fail(`${existing.name} is already on your profile`, 409)
    if (owner.skills.length >= MAX_SKILLS) return fail(`You can add up to ${MAX_SKILLS} skills`, 400)
    const skill: Skill = { id: generateId('sk'), name, endorsements: 0, endorserIds: [] }
    setDb((d) => {
      d.users.find((u) => u.id === owner.id)!.skills.push(skill)
    })
    const db = getDb()
    const updated = db.users.find((u) => u.id === owner.id)!
    return HttpResponse.json(toSkillView(db, updated, skill, viewerId), { status: 201 })
  }),

  http.patch('/api/users/:id/skills/:skillId', async ({ params, request }) => {
    const ctx = resolveSkill(params, request.headers)
    if (ctx instanceof Response) return ctx
    const { viewerId, owner, skill } = ctx
    if (owner.id !== viewerId) return fail('You can only edit your own skills', 403)
    const body = (await request.json().catch(() => null)) as { pinned?: unknown } | null
    if (typeof body?.pinned !== 'boolean') return fail('pinned must be true or false', 400)
    const pinned = body.pinned
    if (pinned && !skill.pinned && owner.skills.filter((s) => s.pinned).length >= MAX_PINNED_SKILLS) {
      return fail(`You can pin up to ${MAX_PINNED_SKILLS} top skills`, 400)
    }
    const next = updateSkill(owner.id, skill.id, (s) => {
      if (pinned) s.pinned = true
      else delete s.pinned
    })
    return HttpResponse.json(toSkillView(next.db, next.owner, next.skill, viewerId))
  }),

  http.delete('/api/users/:id/skills/:skillId', ({ params, request }) => {
    const ctx = resolveSkill(params, request.headers)
    if (ctx instanceof Response) return ctx
    const { viewerId, owner, skill } = ctx
    if (owner.id !== viewerId) return fail('You can only edit your own skills', 403)
    setDb((d) => {
      const u = d.users.find((x) => x.id === owner.id)!
      u.skills = u.skills.filter((s) => s.id !== skill.id)
      d.notifications = d.notifications.filter(
        (n) => !n.id.startsWith(`n_endorse_${skill.id}_`),
      )
    })
    return HttpResponse.json({ ok: true })
  }),

  http.get('/api/users/:id/skills/:skillId/endorsers', ({ params, request }) => {
    const ctx = resolveSkill(params, request.headers)
    if (ctx instanceof Response) return ctx
    const { viewerId, db, skill } = ctx
    const items = orderedEndorserIds(skill, viewerId)
      .map((id) => db.users.find((u) => u.id === id))
      .filter((u): u is User => Boolean(u))
      .map((u) => toEndorser(db, u, viewerId))
    return HttpResponse.json({ skill: { id: skill.id, name: skill.name }, items })
  }),

  http.post('/api/users/:id/skills/:skillId/endorse', ({ params, request }) => {
    const ctx = resolveSkill(params, request.headers)
    if (ctx instanceof Response) return ctx
    const { viewerId, db, owner, skill } = ctx
    if (owner.id === viewerId) return fail("You can't endorse your own skills", 400)
    if (!owner.connectionIds.includes(viewerId)) {
      return fail('Only 1st-degree connections can endorse skills', 403)
    }
    if (skill.endorserIds?.includes(viewerId)) return fail('You already endorsed this skill', 409)
    const viewer = db.users.find((u) => u.id === viewerId)!
    const next = updateSkill(owner.id, skill.id, (s) => {
      s.endorserIds = [...(s.endorserIds ?? []), viewerId]
      s.endorsements = s.endorserIds.length
    })
    const notificationId = endorsementNotificationId(skill.id, viewerId)
    setDb((d) => {
      d.notifications = d.notifications.filter((n) => n.id !== notificationId)
      d.notifications.push({
        id: notificationId,
        userId: owner.id,
        type: 'skill_endorsement',
        title: `${viewer.firstName} ${viewer.lastName} endorsed you for ${skill.name}`,
        body: viewer.headline,
        link: `/in/${owner.username}?tab=skills`,
        read: false,
        createdAt: new Date().toISOString(),
        actorId: viewerId,
      })
    })
    return HttpResponse.json(toSkillView(getDb(), next.owner, next.skill, viewerId))
  }),

  http.delete('/api/users/:id/skills/:skillId/endorse', ({ params, request }) => {
    const ctx = resolveSkill(params, request.headers)
    if (ctx instanceof Response) return ctx
    const { viewerId, owner, skill } = ctx
    if (owner.id === viewerId) return fail("You can't endorse your own skills", 400)
    // No connection check: someone who later disconnected can still withdraw an endorsement.
    if (!skill.endorserIds?.includes(viewerId)) return fail("You haven't endorsed this skill", 409)
    const next = updateSkill(owner.id, skill.id, (s) => {
      s.endorserIds = (s.endorserIds ?? []).filter((id) => id !== viewerId)
      s.endorsements = s.endorserIds.length
    })
    const notificationId = endorsementNotificationId(skill.id, viewerId)
    setDb((d) => {
      d.notifications = d.notifications.filter((n) => n.id !== notificationId)
    })
    return HttpResponse.json(toSkillView(getDb(), next.owner, next.skill, viewerId))
  }),
]
