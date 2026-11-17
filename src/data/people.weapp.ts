import catalogue from './catalogue-lite.generated.json'
import { assetUrl } from '../services/assets'
import type { Person } from './people'
export type { Person, Rank } from './people'
export { lifeYears } from './historyLabels'
export const clientData = true
const featuredIds = ['zhude','xuxiangqian','suyu','xuhaidong','hongxuezhi','chenqihan','zhangzhen','lizhen']
// Only the compact catalogue ships in the main package. Full records are versioned HTTPS JSON.
export const people: Person[] = catalogue.map(record => ({ ...record, story: '', timeline: [], sources: [], imageSource: '',
  portrait: featuredIds.includes(record.id) ? assetUrl(`./static/featured/${record.id}.jpg`) : record.portraitFile ? assetUrl(`./static/portraits/${record.portraitFile}`) : '/static/portrait-placeholder.png',
  portraitMissing: !record.portraitFile && !featuredIds.includes(record.id)
})) as Person[]
export const featuredPeople = featuredIds.map(id => people.find(person => person.id === id)!).filter(Boolean)
export const catalogueStats = { total: people.length, portraits: people.filter(p => !p.portraitMissing).length,
 biographies: people.filter(p => p.dataStatus !== 'roster').length, pendingPeople: people.filter(p => p.pendingFields?.length).length }
