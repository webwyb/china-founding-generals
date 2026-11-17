import { clientData, people, type Person } from '../data/people'

const byId = new Map(people.map(person => [person.id, person]))
const cache = new Map<string, Person>()
const pending = new Map<string, Promise<Person>>()
const dataRoot = `/js/person-data/${typeof __SHANHE_DATA_VERSION__ === 'undefined' ? 'local' : __SHANHE_DATA_VERSION__}`
let inlineRead = false
function readInline() {
  if (inlineRead || typeof document === 'undefined') return
  inlineRead = true
  const node = document.getElementById('page-person-data')
  if (!node?.textContent) return
  try {
    const person = JSON.parse(node.textContent) as Person
    if (byId.get(person.id)?.name === person.name && Array.isArray(person.biographySections) && Array.isArray(person.sources)) cache.set(person.id, person)
  } catch { /* The versioned resource remains available for retry. */ }
}
export function cachedPerson(id?: string): Person | undefined {
  if (!id) return undefined
  if (!clientData) return byId.get(id)
  readInline()
  return cache.get(id)
}
export function loadPerson(id: string): Promise<Person> {
  const cached = cachedPerson(id)
  if (cached) return Promise.resolve(cached)
  if (!byId.has(id)) return Promise.reject(new Error('未找到这份人物档案。'))
  const existing = pending.get(id)
  if (existing) return existing
  const request = fetch(`${dataRoot}/${encodeURIComponent(id)}.json`, { cache: 'force-cache' }).then(async response => {
    if (!response.ok) throw Error('人物资料暂未加载，请重试。')
    const person = await response.json() as Person
    if (person.id !== id || person.name !== byId.get(id)!.name || !Array.isArray(person.biographySections) || !Array.isArray(person.sources) || !Array.isArray(person.timeline)) throw Error('人物资料未能核对，请重试。')
    cache.set(id, person)
    return person
  }).finally(() => pending.delete(id))
  pending.set(id, request)
  return request
}
let searchIndex: Record<string, string> | undefined
let searchRequest: Promise<Record<string, string>> | undefined
export function cachedSearchIndex() { return searchIndex }
export function loadSearchIndex(): Promise<Record<string, string>> {
  if (searchIndex) return Promise.resolve(searchIndex)
  if (searchRequest) return searchRequest
  searchRequest = fetch(`${dataRoot}/search.json`, { cache: 'force-cache' }).then(async response => {
    if (!response.ok) throw Error('检索暂未完成，请重试。')
    const index = await response.json() as Record<string, string>
    if (!people.every(person => typeof index[person.id] === 'string')) throw Error('检索资料未能核对，请重试。')
    searchIndex = index
    return index
  }).finally(() => { searchRequest = undefined })
  return searchRequest
}
