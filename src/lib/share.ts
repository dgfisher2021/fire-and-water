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
  await copyText(input.url, 'Link copied')
}

/** Put text on the clipboard and say so; says so too when the browser will not allow it. */
export async function copyText(text: string, done = 'Copied') {
  if (!navigator.clipboard) {
    useToasts.getState().push('Copying is not available here', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    useToasts.getState().push(done, 'success')
  } catch {
    useToasts.getState().push('Could not copy', 'error')
  }
}

/** Trigger a file download without leaving the app. */
export function download(url: string, name = '') {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
}

/** Download text the app built (a lyrics file, a timing fragment) as `name`. */
export function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  download(url, name)
  URL.revokeObjectURL(url)
}
