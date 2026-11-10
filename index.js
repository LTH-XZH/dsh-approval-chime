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
 *
 * Windows notification sounds are mastered quietly (around -12 dBFS peak), so the
 * plugin reads the system WAV once, applies digital gain in memory, and plays that
 * buffer with SND_MEMORY. Nothing derived from it is written to disk or shipped.
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
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

/** Gain applied to the system WAV; override with DSH_APPROVAL_CHIME_GAIN_DB. */
const DEFAULT_GAIN_DB = 9

/** SND_FILENAME | SND_ASYNC | SND_NODEFAULT */
const FILE_FLAGS = 0x00020000 | 0x00000001 | 0x00000002
/** SND_MEMORY | SND_ASYNC | SND_NODEFAULT */
const MEMORY_FLAGS = 0x00000004 | 0x00000001 | 0x00000002

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
 * Read the gain override, clamped to a range that cannot destroy the sound.
 * @returns gain in decibels.
 */
function resolveGainDb() {
  const raw = Number(process.env.DSH_APPROVAL_CHIME_GAIN_DB)
  if (!Number.isFinite(raw)) return DEFAULT_GAIN_DB
  return Math.min(12, Math.max(0, raw))
}

/**
 * Locate the PCM data chunk of a RIFF/WAVE buffer.
 * @param buffer - whole file.
 * @returns the byte range of the samples, or undefined when the file is not
 * 16-bit PCM (those are played untouched instead).
 */
function readPcm16(buffer) {
  if (buffer.length < 12) return undefined
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') return undefined
  let offset = 12
  let bitsPerSample = 0
  let audioFormat = 0
  let data
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const body = offset + 8
    if (id === 'fmt ' && size >= 16) {
      audioFormat = buffer.readUInt16LE(body)
      bitsPerSample = buffer.readUInt16LE(body + 14)
    } else if (id === 'data') {
      data = { offset: body, size: Math.min(size, buffer.length - body) }
    }
    offset = body + size + (size % 2)
    if (data !== undefined && audioFormat !== 0) break
  }
  if (data === undefined || audioFormat !== 1 || bitsPerSample !== 16) return undefined
  return data
}

/**
 * Amplify 16-bit PCM samples in a copy of the file, keeping the header intact.
 * @param buffer - whole file.
 * @param gainDb - digital gain.
 * @returns the amplified WAV image, or undefined when the file is not PCM 16.
 */
function amplifyPcm16(buffer, gainDb) {
  const chunk = readPcm16(buffer)
  if (chunk === undefined) return undefined
  const out = Buffer.from(buffer)
  const gain = 10 ** (gainDb / 20)
  for (let i = chunk.offset; i + 1 < chunk.offset + chunk.size; i += 2) {
    const scaled = out.readInt16LE(i) * gain
    out.writeInt16LE(scaled > 32767 ? 32767 : scaled < -32768 ? -32768 : Math.round(scaled), i)
  }
  return out
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
 * Bind winmm!PlaySoundW for memory and file playback.
 * @returns the bound functions, or undefined when the FFI route is unavailable.
 */
function bindPlaySound() {
  const path = resolveKoffi()
  if (path === undefined) {
    console.warn('[dsh-approval-chime] koffi was not found; falling back to a PowerShell player')
    return undefined
  }
  try {
    const koffi = require(path)
    const winmm = koffi.load('winmm.dll')
    return {
      playMemory: winmm.func('bool PlaySoundW(void *pszSound, void *hmod, uint32_t fdwSound)'),
      playFile: winmm.func('bool PlaySoundW(str16 pszSound, void *hmod, uint32_t fdwSound)'),
    }
  } catch (error) {
    console.warn('[dsh-approval-chime] winmm binding failed; falling back to a PowerShell player', error)
    return undefined
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

  let sound
  let bound = false
  let lastPlayedAt = 0

  const load = () => {
    bound = true
    const winmm = bindPlaySound()
    let buffer
    try {
      buffer = amplifyPcm16(readFileSync(file), resolveGainDb())
    } catch (error) {
      console.warn('[dsh-approval-chime] could not prepare the chime buffer', error)
    }
    sound = { file, buffer, winmm }
  }

  const play = () => {
    if (!bound) load()
    if (sound.buffer !== undefined && sound.winmm !== undefined) {
      try {
        if (sound.winmm.playMemory(sound.buffer, null, MEMORY_FLAGS) === true) return
      } catch {
        /* fall through to file playback */
      }
    }
    if (sound.winmm !== undefined) {
      try {
        if (sound.winmm.playFile(sound.file, null, FILE_FLAGS) === true) return
      } catch {
        /* fall through to the external player */
      }
    }
    spawnPlayer(sound.file)
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
