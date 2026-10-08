import { shareLink } from '@dust-ui/ui'
import { toaster } from '@/lib/toaster'

export type ShareInput = { title: string; text: string; url: string }

/** Native share sheet where it exists, clipboard elsewhere; the toast stays in the frame. */
export async function share(input: ShareInput) {
  const result = await shareLink(input, {
    copiedMessage: false,
    errorMessage: false,
  })
  if (result === 'copied') toaster.push('Link copied', 'success')
  else if (result === 'failed') toaster.push('Could not copy', 'error')
  else if (result === 'unavailable')
    toaster.push('Copying is not available here', 'error')
}

/** Put text on the clipboard and say so; says so too when the browser will not allow it. */
export async function copyText(text: string, done = 'Copied') {
  if (!navigator.clipboard) {
    toaster.push('Copying is not available here', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    toaster.push(done, 'success')
  } catch {
    toaster.push('Could not copy', 'error')
  }
}
