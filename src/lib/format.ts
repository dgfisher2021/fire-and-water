/** Seconds to m:ss, floored, for time labels. */
export function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** Bytes to "9.7 MB" (one decimal, megabytes only: every song is one). */
export function formatBytes(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

/** "MP3 · 9.7 MB": what a download tap fetches. */
export function audioLabel(file: string, bytes: number) {
  return `${file.split('.').pop()?.toUpperCase()} · ${formatBytes(bytes)}`
}
