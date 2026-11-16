import catalogue from './catalog.generated.json'
import { people as curatedPeople } from './featured'
import placeholder from '../assets/portrait-placeholder.svg'
export { lifeYears } from './historyLabels'

export type Rank = '元帅' | '大将' | '上将' | '中将' | '少将'

export interface Person {
  id: string
  name: string
  rank: Rank
  province: string
  hometown: string
  hometownType?: string
  birth: number | null
  death: number | null
  portrait: string
  portraitMissing?: boolean
  tagline: string
  story: string
  timeline: { year: number; text: string }[]
  sources: { title: string; url: string }[]
  imageSource: string
  grantYear?: number | null
  aliases?: string[]
  missingFields?: string[]
  pendingFields?: string[]
  dataStatus?: 'profile' | 'roster'
  portraitFile?: string | null
  portraitVersion?: string
  fieldNote?: string
}

const curatedByName = new Map(curatedPeople.map(person => [person.name, person]))
const imported = catalogue as Omit<Person, 'portrait'>[]

export const people: Person[] = imported.length ? imported.map(record => {
  const curated = curatedByName.get(record.name)
  if (curated) return {
    ...record,
    portrait: curated.portrait,
    portraitMissing: false,
    sources: [...new Map([...curated.sources, ...record.sources].map(source => [source.url, source])).values()],
  }
  return { ...record, portrait: record.portraitFile ? `./static/portraits/${record.portraitFile}${record.portraitVersion ? `?v=${record.portraitVersion}` : ''}` : placeholder, portraitMissing: !record.portraitFile }
}) : curatedPeople

export const featuredPeople = curatedPeople.map(person => people.find(record => record.id === person.id)!).filter(Boolean)
export const catalogueStats = {
  total: people.length,
  portraits: people.filter(person => !person.portraitMissing).length,
  biographies: people.filter(person => person.dataStatus !== 'roster').length,
  missingBirth: people.filter(person => !person.birth).length,
  missingDeath: people.filter(person => !person.death).length,
  missingHometown: people.filter(person => person.hometown === '籍贯待补').length,
  pendingPeople: people.filter(person => person.pendingFields?.length).length,
}
