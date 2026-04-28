/** The base URL of the site, derived from Vite's BASE_URL env variable. Defaults to '/'. */
export const siteBase = import.meta.env.BASE_URL || '/'

/** Normalized base without a trailing slash. Empty string when base is '/'. */
const normalizedSiteBase = siteBase === '/' ? '' : siteBase.replace(/\/$/, '')

/** Returns true if the given path is an absolute HTTP/HTTPS URL. */
const isAbsoluteUrl = (path: string) => /^https?:\/\//i.test(path)

/**
 * Prepends the site base to a relative path.
 * - Returns `siteBase` if path is empty.
 * - Returns the path unchanged if it is absolute or already starts with the base.
 */
export const withBase = (path: string) => {
  if (!path) return siteBase
  if (isAbsoluteUrl(path)) return path

  if (
    normalizedSiteBase &&
    (path === normalizedSiteBase || path.startsWith(`${normalizedSiteBase}/`))
  ) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return normalizedSiteBase
    ? `${normalizedSiteBase}${normalizedPath}`
    : normalizedPath
}

/**
 * Strips the site base prefix from a path, returning a root-relative path.
 * - Returns '/' if the path matches the base exactly.
 * - Returns the path unchanged if it does not start with the base.
 */
export const stripBase = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!normalizedSiteBase) return normalizedPath
  if (
    normalizedPath === normalizedSiteBase ||
    normalizedPath === `${normalizedSiteBase}/`
  )
    return '/'
  if (normalizedPath.startsWith(`${normalizedSiteBase}/`)) {
    return normalizedPath.slice(normalizedSiteBase.length) || '/'
  }

  return normalizedPath
}
