import Taro from '@tarojs/taro'
import { people } from '../data/people'

const KEY = 'shanhe-remembered-v1'
const knownIds = new Set(people.map(person => person.id))

export function getRemembered(): string[] {
  try {
    const value: unknown = Taro.getStorageSync(KEY)
    return Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && knownIds.has(id)))) : []
  } catch { return [] }
}

export function toggleRemembered(id: string): boolean {
  if (!knownIds.has(id)) throw new Error('人物档案不存在')
  const current = getRemembered()
  const remembered = !current.includes(id)
  Taro.setStorageSync(KEY, remembered ? [...current, id] : current.filter(value => value !== id))
  return remembered
}
