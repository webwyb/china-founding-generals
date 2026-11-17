import type { Person } from '../data/people'
import type { SeoPage } from './metadata'
// Web SEO metadata has no native equivalent; avoid shipping document APIs.
export function usePageMetadata(_page: SeoPage, _person?: Person) {}
