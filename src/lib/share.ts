import { useToasts } from '@/store/toasts'

export type ShareInput = { title: string; text: string; url: string }

/** Native share sheet where it exists, clipboard elsewhere, toast on copy. */
export async function share(input: ShareInput) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(input)
    } catch {
      // User dismissed the sheet; nothing to report.
    }
    return
  }
  if (!navigator.clipboard) return
  try {
    await navigator.clipboard.writeText(input.url)
    useToasts.getState().push('Link copied', 'success')
  } catch {
    useToasts.getState().push('Could not copy the link', 'error')
  }
}

/** Trigger a file download without leaving the app. */
export function download(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
}
