import { Box, Text } from '../../ink.js'

export type ClawdPose =
  | 'default'
  | 'blink'
  | 'look-left'
  | 'look-right'
  | 'smile'
  | 'shy'
  | 'float-left'
  | 'float-right'
  | 'surprised'
  | 'happy'

type Props = {
  pose?: ClawdPose
}

type FaceAlign = 'left' | 'center' | 'right'

type GhostPose = {
  eyes: string
  mouth: string
  eyesAlign?: FaceAlign
  hem?: string
  /** Optional extra blank lines above eyes for a "puffier" look */
  topPad?: number
}

// ─── Layout constants ────────────────────────────────────────────────────────
//
//  Ghost is 13 chars wide, 7 visible rows tall:
//
//     ▄▄▄▄▄▄▄▄▄      ← TOP_CAP        (row 1)
//   ▗           ▖    ← SHOULDER row   (row 2 — adds roundness above eyes)
//   ▐  ◕     ◕  ▌    ← eyes row       (row 3)
//   ▐     ᵕ     ▌    ← mouth row      (row 4)
//   ▐           ▌    ← SHOULDER row   (row 5 — adds roundness below mouth)
//   ▝▄▀▄▀▄▀▄▀▄▀▘    ← HEM            (row 6)
//
// ─────────────────────────────────────────────────────────────────────────────

const FACE_WIDTH  = 9   // inner content width (between shell chars)
const GHOST_WIDTH = 13  // total rendered width

//                          123456789012 3
const TOP_CAP      = '  ▄▄▄▄▄▄▄▄▄  '  // 13
const SHOULDER_L   = ' ▗'              //  2
const SHOULDER_R   = '▖ '              //  2
const BODY_L       = ' ▐'              //  2
const BODY_R       = '▌ '              //  2
const DEFAULT_HEM  = ' ▝▄▀▄▀▄▀▄▀▄▘ '  // 13

// Hem variants for directional floats
const HEM_FLOAT_L  = ' ▝▙▄▞▄▞▄▞▄▟▘ '  // 13 — left-leaning waves
const HEM_FLOAT_R  = ' ▝▛▄▚▄▚▄▚▄▜▘ '  // 13 — right-leaning waves
const HEM_HAPPY    = ' ▝▗▀▄▀▄▀▄▀▖▘ '  // 13 — high bounce

const GHOST_POSES: Record<ClawdPose, GhostPose> = {
  // ── Neutral ──────────────────────────────────────────────────────────────
  default: {
    eyes:  '◕     ◕',
    mouth: '  ᵕ  ',
  },

  // ── Blink (horizontal squint lines) ──────────────────────────────────────
  blink: {
    eyes:  '⌒     ⌒',
    mouth: '  ᵕ  ',
  },

  // ── Directional glances ───────────────────────────────────────────────────
  'look-left': {
    eyes:      '◕     ◕',
    eyesAlign: 'left',
    mouth:     '  ᵕ  ',
  },
  'look-right': {
    eyes:      '◕     ◕',
    eyesAlign: 'right',
    mouth:     '  ᵕ  ',
  },

  // ── Smile ─────────────────────────────────────────────────────────────────
  smile: {
    eyes:  '◕     ◕',
    mouth: ' ˶ ᵕ ˶ ',
  },

  // ── Shy (downturn eyes + scrunched mouth) ─────────────────────────────────
  shy: {
    eyes:  '◡     ◡',
    mouth: '  ˏˋˎ  ',
  },

  // ── Surprised (wide open eyes + open mouth) ───────────────────────────────
  surprised: {
    eyes:  '◉     ◉',
    mouth: '   ᗜ   ',
  },

  // ── Happy bounce (same as smile but higher hem) ───────────────────────────
  happy: {
    eyes:  '◕     ◕',
    mouth: ' ˶ ᵕ ˶ ',
    hem:   HEM_HAPPY,
  },

  // ── Float left (body tilts left, wavy hem skews left) ─────────────────────
  'float-left': {
    eyes:  '◕     ◕',
    mouth: ' ˶ ᵕ ˶ ',
    hem:   HEM_FLOAT_L,
  },

  // ── Float right (body tilts right, wavy hem skews right) ──────────────────
  'float-right': {
    eyes:  '◕     ◕',
    mouth: ' ˶ ᵕ ˶ ',
    hem:   HEM_FLOAT_R,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alignFace(content: string, align: FaceAlign = 'center'): string {
  if (align === 'left')  return content.padEnd(FACE_WIDTH, ' ')
  if (align === 'right') return content.padStart(FACE_WIDTH, ' ')
  const padding     = Math.max(FACE_WIDTH - content.length, 0)
  const leftPadding = Math.floor(padding / 2)
  return ' '.repeat(leftPadding) + content + ' '.repeat(padding - leftPadding)
}

/** Renders one body row: colored border chars + ide-background interior */
function renderBodyRow(left: string, content: string, right: string) {
  return (
    <Text>
      <Text color="ide">{left}</Text>
      <Text color="clawd_background" backgroundColor="ide">
        {content}
      </Text>
      <Text color="ide">{right}</Text>
    </Text>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Clawd({ pose = 'default' }: Props) {
  const p   = GHOST_POSES[pose]
  const hem = p.hem ?? DEFAULT_HEM

  return (
    <Box flexDirection="column" width={GHOST_WIDTH}>
      {/* ── Dome top ── */}
      <Text color="ide">{TOP_CAP}</Text>

      {/* ── Upper shoulder pad (makes ghost rounder above eyes) ── */}
      {renderBodyRow(SHOULDER_L, ' '.repeat(FACE_WIDTH), SHOULDER_R)}

      {/* ── Eyes ── */}
      {renderBodyRow(BODY_L, alignFace(p.eyes, p.eyesAlign), BODY_R)}

      {/* ── Mouth ── */}
      {renderBodyRow(BODY_L, alignFace(p.mouth), BODY_R)}

      {/* ── Lower shoulder pad (makes ghost rounder below mouth) ── */}
      {renderBodyRow(SHOULDER_L, ' '.repeat(FACE_WIDTH), SHOULDER_R)}

      {/* ── Wavy hem ── */}
      <Text color="ide">{hem}</Text>
    </Box>
  )
}