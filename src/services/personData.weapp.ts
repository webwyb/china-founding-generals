import Taro from '@tarojs/taro'
import { people, type Person } from '../data/people'
const byId = new Map(people.map(person => [person.id, person]))
const cache = new Map<string, Person>()
const pending = new Map<string, Promise<Person>>()
export function cachedPerson(id?: string) { return id ? cache.get(id) : undefined }
async function request<T>(file: string): Promise<T> {
  const response = await Taro.request<T>({ url: `${__SHANHE_MINI_DATA_ROOT__}/${file}.json`, timeout: 15000 })
  if (response.statusCode !== 200 || typeof response.data !== 'object' || !response.data) throw Error('人物资料暂未加载，请检查网络后重试。')
  return response.data
}
export function loadPerson(id: string): Promise<Person> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!)
  const brief = byId.get(id)
  if (!brief) return Promise.reject(Error('未找到这份人物档案。'))
  const existing = pending.get(id)
  if (existing) return existing
  const task = request<Person>(encodeURIComponent(id)).then(person => {
    if (person.id !== id || person.name !== brief.name || !Array.isArray(person.sources) || !Array.isArray(person.biographySections) || !Array.isArray(person.timeline)) throw Error('人物资料未能核对，请重试。')
    // Release JSON may contain H5 bundle paths. Use the same immutable image as the native catalogue.
    const value = { ...person, portrait: brief.portrait }
    cache.set(id, value)
    if (cache.size > 24) cache.delete(cache.keys().next().value!)
    return value
  }).finally(() => pending.delete(id))
  pending.set(id, task)
  return task
}
let index: Record<string, string> | undefined
let indexTask: Promise<Record<string, string>> | undefined
export const cachedSearchIndex = () => index
export function loadSearchIndex(): Promise<Record<string, string>> {
  if (index) return Promise.resolve(index)
  if (indexTask) return indexTask
  indexTask = request<Record<string, string>>('search').then(value => {
    if (!people.every(p => typeof value[p.id] === 'string')) throw Error('检索资料未能核对，请重试。')
    return index = value
  }).finally(() => { indexTask = undefined })
  return indexTask
}
