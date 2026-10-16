import type { WatchProgress } from '@prisma/client'

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

/** Below this we start from the beginning (YouTube doesn't resume a few seconds in). */
const RESUME_MIN_SEC = 5
/** Within this many seconds of the end the video counts as watched → start over next time. */
const FINISHED_TAIL_SEC = 10

type Progress = Pick<WatchProgress, 'position' | 'duration'>

export function isFinished(p: Progress) {
  return p.duration > 0 && p.position >= p.duration - FINISHED_TAIL_SEC
}

/** Where the player should start for this viewer. */
export function resumeAt(p: Progress | null | undefined) {
  if (!p || p.position < RESUME_MIN_SEC || isFinished(p)) return 0
  return p.position
}

/** 0–1 fraction for the red "watched" bar under thumbnails. */
export function watchedFraction(p: Progress | null | undefined) {
  if (!p || p.duration <= 0) return null
  return isFinished(p) ? 1 : Math.min(1, p.position / p.duration)
}

const TIMESTAMP = String.raw`(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}`
const CUE_TIMING = new RegExp(`^${TIMESTAMP}\\s+-->\\s+${TIMESTAMP}`, 'm')

/** Minimal WebVTT check: header line plus at least one cue timing line. Returns an error message or null. */
export function validateVtt(text: string) {
  const body = text.replace(/^﻿/, '')
  if (!/^WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(body)) return 'Subtitle file must start with "WEBVTT"'
  if (!CUE_TIMING.test(body)) return 'Subtitle file has no cues (expected lines like "00:00:01.000 --> 00:00:04.000")'
  return null
}
