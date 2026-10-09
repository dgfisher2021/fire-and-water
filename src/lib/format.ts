/** Bytes to "9.7 MB" (one decimal, megabytes only: every song is one). */
export function formatBytes(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

/** "M4A": the container an audio file comes in, from its extension. */
export function audioFormat(file: string) {
  return file.split('.').pop()?.toUpperCase() ?? ''
}

/** "MP3 · 9.7 MB": what a download tap fetches. */
export function audioLabel(file: string, bytes: number) {
  return `${audioFormat(file)} · ${formatBytes(bytes)}`
}
