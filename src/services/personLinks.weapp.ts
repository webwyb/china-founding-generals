import site from '../../config/site.json'
export const PUBLIC_SITE_URL = site.origin.replace(/\/+$/, '') + '/'
export const PUBLIC_SITE_HOST = PUBLIC_SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
export const personMiniProgramPath = (id: string) => `/pages/person/index?id=${encodeURIComponent(id)}`
export const personPath = (id: string) => `/people/${encodeURIComponent(id)}/`
export const publicPersonUrl = (id: string) => PUBLIC_SITE_URL.replace(/\/$/, '') + personPath(id)
export function pageHref(page: 'index' | 'explore' | 'person' | 'card', query = '') {
  return `/pages/${page}/index${query ? `?${query}` : ''}`
}
