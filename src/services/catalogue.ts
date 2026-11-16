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
  return people.filter(person =>
    (state.rank === '全部' || person.rank === state.rank) &&
    (state.province === '全部' || person.province === state.province) &&
    (!state.rememberedOnly || rememberedIds.has(person.id)) &&
    words.every(word => `${person.name} ${person.aliases?.join(' ') || ''} ${person.hometown} ${person.rank} ${person.story}`.toLocaleLowerCase().includes(word)))
}
