import assert from 'node:assert/strict'
import test from 'node:test'

import { amplifyPcm16, readPcm16 } from '../index.js'

const HEADER_BYTES = 44

/**
 * Build a minimal RIFF/WAVE file the way Windows ships its notification sounds.
 * @param samples - integer samples, written as 16-bit or 8-bit PCM.
 * @param options - sample width and WAVE format tag.
 */
function wav(samples, { bits = 16, format = 1 } = {}) {
  const bytesPerSample = bits / 8
  const dataSize = samples.length * bytesPerSample
  const buffer = Buffer.alloc(HEADER_BYTES + dataSize)
  buffer.write('RIFF', 0, 'ascii')
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8, 'ascii')
  buffer.write('fmt ', 12, 'ascii')
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(format, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(8000, 24)
  buffer.writeUInt32LE(8000 * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(bits, 34)
  buffer.write('data', 36, 'ascii')
  buffer.writeUInt32LE(dataSize, 40)
  samples.forEach((sample, index) => {
    if (bits === 16) buffer.writeInt16LE(sample, HEADER_BYTES + index * 2)
    else buffer.writeInt8(sample, HEADER_BYTES + index * bytesPerSample)
  })
  return buffer
}

test('readPcm16 finds the samples of a 16-bit PCM file', () => {
  const buffer = wav([0, 1234, -1234])
  assert.deepEqual(readPcm16(buffer), { offset: HEADER_BYTES, size: 6 })
})

test('amplifyPcm16 applies the requested gain to every sample', () => {
  const buffer = wav([0, 1000, -1000, 500])
  const doubled = amplifyPcm16(buffer, 20 * Math.log10(2))
  assert.deepEqual(
    Array.from({ length: 4 }, (_, index) => doubled.readInt16LE(HEADER_BYTES + index * 2)),
    [0, 2000, -2000, 1000],
  )
})

test('amplifyPcm16 clamps instead of wrapping around', () => {
  const buffer = wav([30000, -30000])
  const doubled = amplifyPcm16(buffer, 20 * Math.log10(2))
  assert.equal(doubled.readInt16LE(HEADER_BYTES), 32767)
  assert.equal(doubled.readInt16LE(HEADER_BYTES + 2), -32768)
})

test('amplifyPcm16 keeps the header and untouched input intact', () => {
  const buffer = wav([100, 200])
  const amplified = amplifyPcm16(buffer, 9)
  assert.deepEqual(amplified.subarray(0, HEADER_BYTES), buffer.subarray(0, HEADER_BYTES))
  assert.equal(buffer.readInt16LE(HEADER_BYTES), 100)
})

test('readPcm16 declines files that are not 16-bit PCM', () => {
  assert.equal(readPcm16(wav([1, 2, 3], { bits: 8 })), undefined)
  assert.equal(readPcm16(wav([1, 2], { format: 3 })), undefined)
})

test('readPcm16 declines buffers that are not RIFF/WAVE', () => {
  assert.equal(readPcm16(Buffer.alloc(0)), undefined)
  assert.equal(readPcm16(Buffer.from('not a wav file at all')), undefined)
})
