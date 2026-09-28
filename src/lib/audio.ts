// The one <audio> element for the whole app, created lazily so the player
// survives route changes and never mounts twice under StrictMode.
let element: HTMLAudioElement | null = null

export function getAudio(): HTMLAudioElement {
  if (!element) {
    element = new Audio()
    element.preload = 'metadata'
  }
  return element
}

export const canShare = () =>
  typeof navigator !== 'undefined' &&
  (typeof navigator.share === 'function' || !!navigator.clipboard)
