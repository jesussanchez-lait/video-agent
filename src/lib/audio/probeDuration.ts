/**
 * Probe audio duration from a remote URL (MP3/WAV).
 */

/** Parse MPEG frame duration from buffer (approximate for CBR MP3). */
function estimateMp3DurationMs(buffer: Buffer): number | null {
  // ID3v2 skip
  let offset = 0;
  if (
    buffer.length > 10 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    const size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + size;
  }

  for (let i = offset; i < buffer.length - 4; i++) {
    if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
      const version = (buffer[i + 1] >> 3) & 0x03;
      const layer = (buffer[i + 1] >> 1) & 0x03;
      if (layer === 0) continue;
      const bitrateIndex = (buffer[i + 2] >> 4) & 0x0f;
      const sampleRateIndex = (buffer[i + 2] >> 2) & 0x03;
      if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
        continue;
      }

      const bitrates = [
        0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
      ];
      const sampleRates =
        version === 3
          ? [44100, 48000, 32000]
          : [22050, 24000, 16000];
      const bitrate = bitrates[bitrateIndex]! * 1000;
      const sampleRate = sampleRates[sampleRateIndex]!;
      if (!bitrate || !sampleRate) continue;

      const audioBytes = buffer.length - i;
      return Math.round((audioBytes * 8 * 1000) / bitrate);
    }
  }
  return null;
}

export async function probeAudioDurationMs(url: string): Promise<number> {
  const res = await fetch(url, {
    headers: { Range: "bytes=0-524287" },
  });
  if (!res.ok) {
    throw new Error(`No se pudo leer audio (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const mp3 = estimateMp3DurationMs(buf);
  if (mp3 && mp3 > 500) return mp3;

  // Full fetch fallback for short files
  const full = await fetch(url);
  if (!full.ok) throw new Error(`No se pudo leer audio completo`);
  const fullBuf = Buffer.from(await full.arrayBuffer());
  const fullMp3 = estimateMp3DurationMs(fullBuf);
  if (fullMp3 && fullMp3 > 500) return fullMp3;

  throw new Error("No se pudo determinar la duración del audio");
}
