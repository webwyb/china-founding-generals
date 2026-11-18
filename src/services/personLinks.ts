import site from '../../config/site.json'

/** Shared public destination for SEO and permanent, image-based sharing. */
export const PUBLIC_SITE_URL = new URL('/', site.origin).href
export const PUBLIC_SITE_HOST = new URL(PUBLIC_SITE_URL).host

export function personMiniProgramPath(id: string): string {
  return `/pages/person/index?id=${encodeURIComponent(id)}`
}

export function publicPersonUrl(id: string): string {
  return new URL(personPath(id), PUBLIC_SITE_URL).href
}

export function personPath(id: string): string {
  return `/people/${encodeURIComponent(id)}/`
}

export function pageHref(page: 'index' | 'explore' | 'person' | 'card' | 'topics', query = ''): string {
  const params = new URLSearchParams(query)
  if (page === 'person') return params.get('id') ? personPath(params.get('id')!) : '/people/'
  if (page === 'topics') return params.get('id') ? `/topics/${encodeURIComponent(params.get('id')!)}/` : '/topics/'
  const path = page === 'index' ? '/' : page === 'explore' ? '/generals/' : '/card/'
  const search = params.toString()
  return `${path}${search ? `?${search}` : ''}`
}

/** Keep links and QR images shared before the clean URLs were introduced working. */
export function legacyDestination(hash: string): string | undefined {
  const [path, query = ''] = hash.replace(/^#/, '').split('?')
  const page = /^\/pages\/(index|explore|person|card)\/index\/?$/.exec(path)?.[1]
  return page ? pageHref(page as Parameters<typeof pageHref>[0], query) : undefined
}
