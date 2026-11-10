/**
 * dsh-approval-chime
 *
 * Plays a short Windows notification chime whenever the Harness asks the user to
 * approve a tool request, so you do not have to watch the window.
 *
 * The listener sits on the Host `approval/request` waterfall. It starts the sound
 * and then delegates with `next()`, so the decision itself still belongs to the
 * composed approval answerers (the conversation UI).
 *
 * Playback goes straight to winmm.dll!PlaySoundW through koffi, which ships with
 * the DSH desktop runtime: no child process, no startup delay, and it works while
 * the window is minimized or hidden in the tray.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)

const IS_WINDOWS = process.platform === 'win32'

/** Used in order; the first file that exists wins. */
const DEFAULT_SOUNDS = [
  'C:\\Windows\\Media\\Windows Notify System Generic.wav',
  'C:\\Windows\\Media\\Windows Notify Messaging.wav',
  'C:\\Windows\\Media\\Windows Notify Calendar.wav',
  'C:\\Windows\\Media\\Windows Notify Email.wav',
]

/** SND_FILENAME | SND_ASYNC | SND_NODEFAULT */
const PLAY_FLAGS = 0x00020000 | 0x00000001 | 0x00000002

/** Collapse a burst of parallel tool requests into one sound. */
const MIN_INTERVAL_MS = 1200

/**
 * Pick the WAV to play.
 * @returns the first existing candidate, an explicit `DSH_APPROVAL_CHIME_WAV`
 * override when it exists, or undefined.
 */
function resolveSound() {
  const override = process.env.DSH_APPROVAL_CHIME_WAV
  if (override !== undefined && override.length > 0 && existsSync(override)) return override
  return DEFAULT_SOUNDS.find((candidate) => existsSync(candidate))
}

/**
 * Resolve the koffi entry shipped with the desktop app's own dsh runtime.
 * @returns an absolute module path, or undefined when no candidate exists.
 */
function resolveKoffi() {
  const candidates = []
  try {
    candidates.push(require.resolve('koffi'))
  } catch {
    /* koffi is not a profile dependency; the runtime copy below is the usual source */
  }
  const resources = join(dirname(process.execPath), 'resources')
  candidates.push(join(resources, 'app.asar.unpacked', 'dsh', 'node_modules', 'koffi', 'index.cjs'))
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

/**
 * Bind winmm!PlaySoundW once.
 * @returns the bound function, or null when the FFI route is unavailable.
 */
function bindPlaySound() {
  const path = resolveKoffi()
  if (path === undefined) {
    console.warn('[dsh-approval-chime] koffi was not found; falling back to a PowerShell player')
    return null
  }
  try {
    const koffi = require(path)
    const winmm = koffi.load('winmm.dll')
    return winmm.func('bool PlaySoundW(str16 pszSound, void *hmod, uint32_t fdwSound)')
  } catch (error) {
    console.warn('[dsh-approval-chime] winmm binding failed; falling back to a PowerShell player', error)
    return null
  }
}

/**
 * Last-resort player for setups without koffi.
 * @param file - absolute WAV path.
 */
function spawnPlayer(file) {
  try {
    const script = `(New-Object System.Media.SoundPlayer '${file}').PlaySync()`
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
      { windowsHide: true, stdio: 'ignore' }
    )
    child.on('error', () => {})
    child.unref()
  } catch {
    /* a silent fallback is better than breaking the approval flow */
  }
}

/**
 * Install the approval chime.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  if (!IS_WINDOWS) {
    console.warn(`[dsh-approval-chime] Windows playback only; idle on ${process.platform}`)
    return
  }
  const file = resolveSound()
  if (file === undefined) {
    console.warn('[dsh-approval-chime] no notification WAV was found; nothing to play')
    return
  }

  let playSound
  let bound = false
  let lastPlayedAt = 0

  const play = () => {
    if (!bound) {
      bound = true
      playSound = bindPlaySound()
    }
    if (playSound !== null) {
      try {
        if (playSound(file, null, PLAY_FLAGS) === true) return
      } catch {
        /* fall through to the external player */
      }
    }
    spawnPlayer(file)
  }

  ctx.on('approval/request', function (request, next) {
    const now = Date.now()
    if (now - lastPlayedAt >= MIN_INTERVAL_MS) {
      lastPlayedAt = now
      try {
        play()
      } catch {
        /* never delay or reject an approval because the cue failed */
      }
    }
    return next()
  })
}
