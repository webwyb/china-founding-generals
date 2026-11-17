import type { Person } from '../data/people'
import type { CatalogueState } from './catalogueState'

export function regionFromQuery(value: string, provinces: readonly string[]): string {
  let region = value
  try { region = decodeURIComponent(value) } catch { return '全部' }
  return provinces.includes(region) ? region : '全部'
}

export function filterPeople(people: readonly Person[], state: CatalogueState, remembered: readonly string[]): Person[] {
  const words = state.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const rememberedIds = new Set(remembered)
  const matches = people.filter(person =>
    (state.rank === '全部' || person.rank === state.rank) &&
    (state.province === '全部' || person.province === state.province) &&
    (!state.rememberedOnly || rememberedIds.has(person.id)) &&
    words.every(word => `${person.name} ${person.aliases?.join(' ') || ''} ${person.hometown} ${person.rank} ${person.story}`.toLocaleLowerCase().includes(word)))
  // Longer biographies mention comrades. Keep the person explicitly searched
  // for ahead of people who only mention that name in their life story.
  if (!words.length) return matches
  const query = state.search.trim().toLocaleLowerCase()
  const relevance = (person: Person) => {
    const names = [person.name, ...(person.aliases || [])].map(name => name.toLocaleLowerCase())
    if (names.includes(query)) return 3
    if (words.some(word => names.includes(word))) return 2
    if (words.some(word => names.some(name => name.includes(word)))) return 1
    return 0
  }
  return matches.sort((a,b) => relevance(b) - relevance(a))
}

/** Home-region counts reflect the current scope, before choosing a region. */
export function provinceFacets(people: readonly Person[], state: CatalogueState, remembered: readonly string[]) {
  const counts = new Map<string, number>()
  for (const person of filterPeople(people, { ...state, province: '全部' }, remembered)) {
    counts.set(person.province, (counts.get(person.province) || 0) + 1)
  }
  return [...counts].map(([province, count]) => ({ province, count })).sort((a, b) => b.count - a.count)
}

export function applyCatalogueFilters(people: readonly Person[], state: CatalogueState, changes: Partial<CatalogueState>, remembered: readonly string[]): CatalogueState {
  const next = { ...state, ...changes, visibleCount: 24, scrollTop: 0 }
  // Changing rank must not leave an impossible home-region selection behind.
  if (changes.rank !== undefined && changes.rank !== state.rank && next.province !== '全部' &&
      !provinceFacets(people, next, remembered).some(item => item.province === next.province)) next.province = '全部'
  return next
}
