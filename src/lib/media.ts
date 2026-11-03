import versions from '@/data/media.json'

const BASE = import.meta.env.VITE_MEDIA_BASE ?? ''
const VERSIONS: Record<string, string> = versions

/**
 * Where a song or hook video loads from: the media CDN (VITE_MEDIA_BASE) in
 * production, with its content hash so a replaced file gets a fresh URL;
 * the app's own public/ in development. `file` is the path under public/.
 */
export function mediaUrl(file: string) {
  if (!BASE) return file
  const version = VERSIONS[file]
  return `${BASE}${file}${version ? `?v=${version}` : ''}`
}
