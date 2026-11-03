/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Where songs and hook videos load from (https://media.dgfisher.com/); unset, public/. */
  readonly VITE_MEDIA_BASE?: string
}
