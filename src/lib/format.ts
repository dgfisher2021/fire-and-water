/** Bytes to "9.7 MB" (one decimal, megabytes only: every song is one). */
export function formatBytes(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

/** "M4A": the container an audio file comes in, from its extension. */
export function audioFormat(file: string) {
  return file.split('.').pop()?.toUpperCase() ?? ''
}

/** "48 min", "1 hr 12 min": how long a run of songs plays, to the minute. */
export function formatLength(seconds: number) {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${minutes} min`
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

/** "MP3 · 9.7 MB": what a download tap fetches. */
export function audioLabel(file: string, bytes: number) {
  return `${audioFormat(file)} · ${formatBytes(bytes)}`
}
