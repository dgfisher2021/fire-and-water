import { toast } from 'sonner'

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
    toast.success('Link copied')
  } catch {
    toast.error('Could not copy the link')
  }
}
