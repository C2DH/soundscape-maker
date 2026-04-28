import { siteBase } from './utils/paths'

export const SiteBasename = siteBase

export const CanonicalUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SITE
    ? import.meta.env?.PUBLIC_SITE
    : 'https://localhost:4321'
