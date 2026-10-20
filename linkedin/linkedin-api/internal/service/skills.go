package service

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"

	"github.com/linkedin-clone/api/internal/models"
	"github.com/linkedin-clone/api/internal/util"
)

// Limits shared with the frontend (src/lib/skills.ts).
const (
	MaxSkills          = 50
	MaxPinnedSkills    = 3
	MaxSkillNameLength = 80
)

// SkillError carries the HTTP status the handler should answer with.
type SkillError struct {
	Status  int
	Message string
}

func (e *SkillError) Error() string { return e.Message }

func skillErr(status int, format string, args ...any) *SkillError {
	return &SkillError{Status: status, Message: fmt.Sprintf(format, args...)}
}

var (
	ErrUserNotFound    = skillErr(404, "User not found")
	ErrSkillNotFound   = skillErr(404, "Skill not found")
	ErrNotSkillOwner   = skillErr(403, "You can only edit your own skills")
	ErrSkillNameEmpty  = skillErr(400, "Skill name is required")
	ErrSkillNameLength = skillErr(400, "Skill name must be %d characters or fewer", MaxSkillNameLength)
	ErrTooManySkills   = skillErr(400, "You can add up to %d skills", MaxSkills)
	ErrTooManyPinned   = skillErr(400, "You can pin up to %d top skills", MaxPinnedSkills)
	ErrPinnedInvalid   = skillErr(400, "pinned must be true or false")
	ErrEndorseSelf     = skillErr(400, "You can't endorse your own skills")
	ErrNotConnected    = skillErr(403, "Only 1st-degree connections can endorse skills")
	ErrAlreadyEndorsed = skillErr(409, "You already endorsed this skill")
	ErrNotEndorsed     = skillErr(409, "You haven't endorsed this skill")
)

// AsSkillError unwraps err into a *SkillError when it is one.
func AsSkillError(err error) (*SkillError, bool) {
	var se *SkillError
	ok := errors.As(err, &se)
	return se, ok
}

// SkillEndorser is the minimal person card used in previews and the endorsers list.
type SkillEndorser struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Headline  string `json:"headline"`
	AvatarURL string `json:"avatarUrl"`
	Degree    *int   `json:"degree"`
}

type ColleagueHighlight struct {
	Company string `json:"company"`
	Count   int    `json:"count"`
}

// SkillView is a skill as seen by one viewer.
type SkillView struct {
	ID                 string              `json:"id"`
	Name               string              `json:"name"`
	Endorsements       int                 `json:"endorsements"`
	Pinned             bool                `json:"pinned"`
	EndorsedByMe       bool                `json:"endorsedByMe"`
	Endorsers          []SkillEndorser     `json:"endorsers"`
	ColleagueHighlight *ColleagueHighlight `json:"colleagueHighlight,omitempty"`
}

type SkillsResponse struct {
	Skills     []SkillView `json:"skills"`
	IsOwner    bool        `json:"isOwner"`
	CanEndorse bool        `json:"canEndorse"`
}

type SkillRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SkillEndorsersResponse struct {
	Skill SkillRef        `json:"skill"`
	Items []SkillEndorser `json:"items"`
}

// NormalizeSkillName trims and collapses whitespace.
func NormalizeSkillName(name string) string {
	return strings.Join(strings.Fields(name), " ")
}

// ResolveSkillOwner finds a profile by id or username; "me" means the viewer.
func ResolveSkillOwner(db *models.Database, ref, viewerID string) (*models.User, error) {
	if ref == "me" {
		ref = viewerID
	}
	u := FindUser(db, ref)
	if u == nil {
		return nil, ErrUserNotFound
	}
	return u, nil
}

func findSkill(u *models.User, skillID string) (*models.Skill, error) {
	for i := range u.Skills {
		if u.Skills[i].ID == skillID {
			return &u.Skills[i], nil
		}
	}
	return nil, ErrSkillNotFound
}

// AddSkill validates and appends a new skill to the owner's profile.
func AddSkill(db *models.Database, ownerRef, viewerID, rawName string) (*models.User, *models.Skill, error) {
	owner, err := ResolveSkillOwner(db, ownerRef, viewerID)
	if err != nil {
		return nil, nil, err
	}
	if owner.ID != viewerID {
		return nil, nil, ErrNotSkillOwner
	}
	name := NormalizeSkillName(rawName)
	if name == "" {
		return nil, nil, ErrSkillNameEmpty
	}
	if utf8.RuneCountInString(name) > MaxSkillNameLength {
		return nil, nil, ErrSkillNameLength
	}
	for _, s := range owner.Skills {
		if strings.EqualFold(s.Name, name) {
			return nil, nil, skillErr(409, "%s is already on your profile", s.Name)
		}
	}
	if len(owner.Skills) >= MaxSkills {
		return nil, nil, ErrTooManySkills
	}
	owner.Skills = append(owner.Skills, models.Skill{
		ID: util.GenerateID("sk"), Name: name, EndorserIDs: []string{},
	})
	return owner, &owner.Skills[len(owner.Skills)-1], nil
}

// SetSkillPinned toggles a skill as one of the owner's top skills.
func SetSkillPinned(db *models.Database, ownerRef, viewerID, skillID string, pinned *bool) (*models.User, *models.Skill, error) {
	owner, err := ResolveSkillOwner(db, ownerRef, viewerID)
	if err != nil {
		return nil, nil, err
	}
	skill, err := findSkill(owner, skillID)
	if err != nil {
		return nil, nil, err
	}
	if owner.ID != viewerID {
		return nil, nil, ErrNotSkillOwner
	}
	if pinned == nil {
		return nil, nil, ErrPinnedInvalid
	}
	if *pinned && !skill.Pinned {
		count := 0
		for _, s := range owner.Skills {
			if s.Pinned {
				count++
			}
		}
		if count >= MaxPinnedSkills {
			return nil, nil, ErrTooManyPinned
		}
	}
	skill.Pinned = *pinned
	return owner, skill, nil
}

// RemoveSkill deletes a skill and the endorsement notifications that point at it.
func RemoveSkill(db *models.Database, ownerRef, viewerID, skillID string) error {
	owner, err := ResolveSkillOwner(db, ownerRef, viewerID)
	if err != nil {
		return err
	}
	if _, err := findSkill(owner, skillID); err != nil {
		return err
	}
	if owner.ID != viewerID {
		return ErrNotSkillOwner
	}
	kept := owner.Skills[:0]
	for _, s := range owner.Skills {
		if s.ID != skillID {
			kept = append(kept, s)
		}
	}
	owner.Skills = kept
	prefix := "n_endorse_" + skillID + "_"
	notifications := db.Notifications[:0]
	for _, n := range db.Notifications {
		if !strings.HasPrefix(n.ID, prefix) {
			notifications = append(notifications, n)
		}
	}
	db.Notifications = notifications
	return nil
}

func endorsementNotificationID(skillID, endorserID string) string {
	return "n_endorse_" + skillID + "_" + endorserID
}

func removeNotification(db *models.Database, id string) {
	for i := range db.Notifications {
		if db.Notifications[i].ID == id {
			db.Notifications = append(db.Notifications[:i], db.Notifications[i+1:]...)
			return
		}
	}
}

// Endorse adds the viewer's endorsement and notifies the profile owner.
// Only 1st-degree connections may endorse, and never their own skills.
func Endorse(db *models.Database, ownerRef, viewerID, skillID string) (*models.User, *models.Skill, error) {
	owner, err := ResolveSkillOwner(db, ownerRef, viewerID)
	if err != nil {
		return nil, nil, err
	}
	skill, err := findSkill(owner, skillID)
	if err != nil {
		return nil, nil, err
	}
	if owner.ID == viewerID {
		return nil, nil, ErrEndorseSelf
	}
	if !util.Contains(owner.ConnectionIDs, viewerID) {
		return nil, nil, ErrNotConnected
	}
	if util.Contains(skill.EndorserIDs, viewerID) {
		return nil, nil, ErrAlreadyEndorsed
	}
	skill.EndorserIDs = append(skill.EndorserIDs, viewerID)
	skill.Endorsements = len(skill.EndorserIDs)

	viewer := FindUser(db, viewerID)
	if viewer != nil {
		nid := endorsementNotificationID(skill.ID, viewerID)
		removeNotification(db, nid)
		db.Notifications = append(db.Notifications, models.Notification{
			ID: nid, UserID: owner.ID, Type: "skill_endorsement",
			Title:   fmt.Sprintf("%s %s endorsed you for %s", viewer.FirstName, viewer.LastName, skill.Name),
			Body:    viewer.Headline,
			Link:    "/in/" + owner.Username + "?tab=skills",
			ActorID: viewerID, CreatedAt: util.NowISO(),
		})
	}
	return owner, skill, nil
}

// Unendorse withdraws the viewer's endorsement. There is no connection check so
// someone who disconnected later can still take an endorsement back.
func Unendorse(db *models.Database, ownerRef, viewerID, skillID string) (*models.User, *models.Skill, error) {
	owner, err := ResolveSkillOwner(db, ownerRef, viewerID)
	if err != nil {
		return nil, nil, err
	}
	skill, err := findSkill(owner, skillID)
	if err != nil {
		return nil, nil, err
	}
	if owner.ID == viewerID {
		return nil, nil, ErrEndorseSelf
	}
	if !util.Contains(skill.EndorserIDs, viewerID) {
		return nil, nil, ErrNotEndorsed
	}
	skill.EndorserIDs = util.RemoveString(skill.EndorserIDs, viewerID)
	skill.Endorsements = len(skill.EndorserIDs)
	removeNotification(db, endorsementNotificationID(skill.ID, viewerID))
	return owner, skill, nil
}

// currentCompany is the company name from companyId, else the current experience entry.
func currentCompany(db *models.Database, u *models.User) string {
	if u.CompanyID != "" {
		for _, c := range db.Companies {
			if c.ID == u.CompanyID {
				return c.Name
			}
		}
	}
	for _, e := range u.Experience {
		if e.Current {
			return e.Company
		}
	}
	return ""
}

func toEndorser(db *models.Database, u *models.User, viewerID string) SkillEndorser {
	return SkillEndorser{
		ID: u.ID, Username: u.Username, FirstName: u.FirstName, LastName: u.LastName,
		Headline: u.Headline, AvatarURL: u.AvatarURL, Degree: ConnectionDegree(viewerID, u, db),
	}
}

// orderedEndorsers puts the viewer first, then the most recent endorsers.
func orderedEndorsers(db *models.Database, skill *models.Skill, viewerID string) []*models.User {
	ids := make([]string, 0, len(skill.EndorserIDs))
	for i := len(skill.EndorserIDs) - 1; i >= 0; i-- {
		ids = append(ids, skill.EndorserIDs[i])
	}
	for i, id := range ids {
		if id == viewerID && i > 0 {
			copy(ids[1:i+1], ids[:i])
			ids[0] = viewerID
			break
		}
	}
	users := make([]*models.User, 0, len(ids))
	for _, id := range ids {
		if u := FindUser(db, id); u != nil {
			users = append(users, u)
		}
	}
	return users
}

// BuildSkillView renders one skill for a viewer.
func BuildSkillView(db *models.Database, owner *models.User, skill *models.Skill, viewerID string) SkillView {
	endorsers := []SkillEndorser{}
	for _, u := range orderedEndorsers(db, skill, viewerID) {
		if len(endorsers) == 3 {
			break
		}
		endorsers = append(endorsers, toEndorser(db, u, viewerID))
	}
	view := SkillView{
		ID: skill.ID, Name: skill.Name, Endorsements: len(skill.EndorserIDs), Pinned: skill.Pinned,
		EndorsedByMe: util.Contains(skill.EndorserIDs, viewerID), Endorsers: endorsers,
	}
	if company := currentCompany(db, owner); company != "" {
		count := 0
		for _, id := range skill.EndorserIDs {
			if u := FindUser(db, id); u != nil && strings.EqualFold(currentCompany(db, u), company) {
				count++
			}
		}
		if count > 0 {
			view.ColleagueHighlight = &ColleagueHighlight{Company: company, Count: count}
		}
	}
	return view
}

// BuildSkills lists top skills first, then by endorsement count; ties keep the owner's order.
func BuildSkills(db *models.Database, owner *models.User, viewerID string) SkillsResponse {
	skills := make([]*models.Skill, len(owner.Skills))
	for i := range owner.Skills {
		skills[i] = &owner.Skills[i]
	}
	sort.SliceStable(skills, func(i, j int) bool {
		if skills[i].Pinned != skills[j].Pinned {
			return skills[i].Pinned
		}
		return len(skills[i].EndorserIDs) > len(skills[j].EndorserIDs)
	})
	views := make([]SkillView, 0, len(skills))
	for _, s := range skills {
		views = append(views, BuildSkillView(db, owner, s, viewerID))
	}
	isOwner := owner.ID == viewerID
	return SkillsResponse{
		Skills:     views,
		IsOwner:    isOwner,
		CanEndorse: !isOwner && util.Contains(owner.ConnectionIDs, viewerID),
	}
}

// BuildEndorsers lists everyone who endorsed a skill, viewer first then most recent.
func BuildEndorsers(db *models.Database, ownerRef, viewerID, skillID string) (SkillEndorsersResponse, error) {
	owner, err := ResolveSkillOwner(db, ownerRef, viewerID)
	if err != nil {
		return SkillEndorsersResponse{}, err
	}
	skill, err := findSkill(owner, skillID)
	if err != nil {
		return SkillEndorsersResponse{}, err
	}
	items := []SkillEndorser{}
	for _, u := range orderedEndorsers(db, skill, viewerID) {
		items = append(items, toEndorser(db, u, viewerID))
	}
	return SkillEndorsersResponse{Skill: SkillRef{ID: skill.ID, Name: skill.Name}, Items: items}, nil
}
