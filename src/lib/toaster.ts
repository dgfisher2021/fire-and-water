import { createMobileToaster } from '@dust-ui/ui'

/** In-frame toasts for the shell's MobileToastStack; callable from anywhere. */
export const toaster = createMobileToaster({ autoDismissMs: 3500 })
