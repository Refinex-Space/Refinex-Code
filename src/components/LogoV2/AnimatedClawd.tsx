import { useEffect, useRef, useState } from 'react'
import { Box } from '../../ink.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { Clawd, type ClawdPose } from './Clawd.js'

type Frame = {
  pose: ClawdPose
  verticalOffset: number
  horizontalOffset: number
}

// ─── Layout constants (must match Clawd.tsx ghost size) ──────────────────────
const GHOST_WIDTH        = 13
const HORIZONTAL_TRAVEL  = 2   // max chars the ghost drifts left/right
const CLAWD_HEIGHT       = 7   // 6 ghost rows + 1 row for vertical float room
const CLAWD_WIDTH        = GHOST_WIDTH + HORIZONTAL_TRAVEL  // 15
const FRAME_MS           = 155  // ms per frame — slightly snappier than original

// ─── Static fallback for reduced-motion ──────────────────────────────────────
const REDUCED_MOTION_FRAME: Frame = {
  pose:             'default',
  verticalOffset:   0,
  horizontalOffset: 1,
}

// ─── Frame-building helpers ───────────────────────────────────────────────────

/** Repeat the same frame n times. */
function hold(
  pose: ClawdPose,
  verticalOffset: number,
  horizontalOffset: number,
  frames: number,
): Frame[] {
  return Array.from({ length: frames }, () => ({ pose, verticalOffset, horizontalOffset }))
}

/**
 * A gentle floating bob: rises (v=0) → dips (v=1) → rises again.
 * Creates that classic ghost hover-bounce feel.
 */
function bob(
  pose: ClawdPose,
  horizontalOffset: number,
  totalFrames: number,
): Frame[] {
  const up   = Math.ceil(totalFrames * 0.45)
  const dip  = Math.ceil(totalFrames * 0.15)
  const back = totalFrames - up - dip
  return [
    ...hold(pose, 0, horizontalOffset, up),
    ...hold(pose, 1, horizontalOffset, dip),
    ...hold(pose, 0, horizontalOffset, back),
  ]
}

/**
 * A slow side-to-side drift: center → left-float → center → right-float → center.
 * Gives a lazy, drifting ghost motion.
 */
function drift(pose: ClawdPose, hold_center: number): Frame[] {
  return [
    ...hold(pose,        0, 1, hold_center),
    ...hold('float-left',  1, 0, 3),
    ...hold(pose,        0, 1, 2),
    ...hold('float-right', 1, 2, 3),
    ...hold(pose,        0, 1, hold_center),
  ]
}

// ─── Animation sequences ──────────────────────────────────────────────────────

/**
 * IDLE — loops forever.
 * Pacing: long holds punctuated by glances, blinks, shy moments, and drifts.
 */
const IDLE_SEQUENCE: readonly Frame[] = [
  ...hold('default',     0, 1, 7),
  ...bob('default',         1, 6),           // gentle bob
  ...hold('look-left',   0, 0, 4),           // curious glance left
  ...hold('default',     0, 1, 5),
  ...hold('blink',       0, 1, 3),           // slow blink
  ...hold('default',     0, 1, 4),
  ...drift('default',       4),              // lazy drift across
  ...hold('shy',         0, 1, 5),           // suddenly shy
  ...hold('default',     0, 1, 3),
  ...bob('smile',           1, 5),           // happy little bounce
  ...hold('default',     0, 1, 6),
  ...hold('look-right',  0, 2, 4),           // curious glance right
  ...hold('default',     0, 1, 4),
  ...hold('blink',       0, 1, 3),           // another blink
  ...hold('default',     0, 1, 5),
  ...bob('default',         1, 7),           // longer bob before looping
]

/**
 * HELLO WAVE — triggered on click.
 * Ghost bounces left-right enthusiastically, then settles into a smile.
 */
const HELLO_WAVE: readonly Frame[] = [
  ...hold('smile',       0, 1, 3),
  ...hold('float-left',  1, 0, 3),
  ...hold('smile',       0, 1, 2),
  ...hold('float-right', 1, 2, 3),
  ...hold('smile',       0, 1, 2),
  ...hold('float-left',  1, 0, 2),
  ...hold('smile',       0, 1, 2),
  ...hold('float-right', 1, 2, 2),
  ...hold('blink',       0, 1, 3),
  ...hold('smile',       0, 1, 4),
]

/**
 * SHY GLANCE — triggered on click.
 * Ghost peeks left then right, gets shy, then cheers up.
 */
const SHY_GLANCE: readonly Frame[] = [
  ...hold('look-left',  0, 0, 4),
  ...hold('shy',        0, 1, 5),
  ...hold('blink',      0, 1, 2),
  ...hold('look-right', 0, 2, 4),
  ...hold('shy',        0, 1, 3),
  ...hold('smile',      0, 1, 4),
]

/**
 * SURPRISED PEEK — triggered on click.
 * Ghost pops eyes wide, wiggles around, then laughs it off.
 */
const SURPRISED_PEEK: readonly Frame[] = [
  ...hold('surprised',   0, 1, 3),
  ...hold('float-left',  1, 0, 2),
  ...hold('surprised',   0, 1, 2),
  ...hold('float-right', 1, 2, 2),
  ...hold('blink',       0, 1, 3),
  ...bob('happy',           1, 5),
  ...hold('smile',       0, 1, 3),
]

/**
 * HAPPY DANCE — triggered on click.
 * Pure joy: bounces around at max energy.
 */
const HAPPY_DANCE: readonly Frame[] = [
  ...hold('happy',       0, 1, 2),
  ...hold('float-left',  1, 0, 2),
  ...hold('happy',       0, 1, 2),
  ...hold('float-right', 1, 2, 2),
  ...hold('happy',       0, 1, 2),
  ...hold('float-left',  1, 0, 2),
  ...hold('happy',       0, 1, 2),
  ...hold('blink',       0, 1, 3),
  ...hold('smile',       0, 1, 4),
]

const CLICK_SEQUENCES: readonly (readonly Frame[])[] = [
  HELLO_WAVE,
  SHY_GLANCE,
  SURPRISED_PEEK,
  HAPPY_DANCE,
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AnimatedClawd() {
  const { pose, verticalOffset, horizontalOffset, onClick } = useClawdAnimation()

  return (
    <Box
      height={CLAWD_HEIGHT}
      width={CLAWD_WIDTH}
      flexDirection="column"
      alignItems="flex-start"
      onClick={onClick}
    >
      <Box
        marginTop={verticalOffset}
        marginLeft={horizontalOffset}
        flexShrink={0}
      >
        <Clawd pose={pose} />
      </Box>
    </Box>
  )
}

// ─── Animation hook ───────────────────────────────────────────────────────────

function useClawdAnimation(): {
  pose:             ClawdPose
  verticalOffset:   number
  horizontalOffset: number
  onClick:          () => void
} {
  const [reducedMotion] = useState(
    () => getInitialSettings().prefersReducedMotion ?? false,
  )

  const [frameIndex, setFrameIndex] = useState(0)
  const sequenceRef                 = useRef<readonly Frame[]>(IDLE_SEQUENCE)
  // Track which click-sequence was last played so we don't repeat immediately
  const lastClickSeqRef             = useRef<number>(-1)

  const onClick = () => {
    if (reducedMotion) return

    // Pick a random click sequence, avoiding the last one if possible
    let idx: number
    do {
      idx = Math.floor(Math.random() * CLICK_SEQUENCES.length)
    } while (idx === lastClickSeqRef.current && CLICK_SEQUENCES.length > 1)

    lastClickSeqRef.current = idx
    sequenceRef.current     = CLICK_SEQUENCES[idx] ?? HELLO_WAVE
    setFrameIndex(0)
  }

  useEffect(() => {
    if (reducedMotion) return

    const timer = setTimeout(() => {
      setFrameIndex(currentIndex => {
        const next = currentIndex + 1

        if (next < sequenceRef.current.length) {
          return next
        }

        // Sequence finished — return to idle
        sequenceRef.current = IDLE_SEQUENCE
        return 0
      })
    }, FRAME_MS)

    return () => clearTimeout(timer)
  }, [frameIndex, reducedMotion])

  const current = reducedMotion
    ? REDUCED_MOTION_FRAME
    : (sequenceRef.current[frameIndex] ?? REDUCED_MOTION_FRAME)

  return {
    pose:             current.pose,
    verticalOffset:   current.verticalOffset,
    horizontalOffset: current.horizontalOffset,
    onClick,
  }
}