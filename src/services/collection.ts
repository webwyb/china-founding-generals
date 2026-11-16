import Taro from '@tarojs/taro'

const KEY = 'shanhe-remembered-v1'

export function getRemembered(): string[] {
  try {
    const value: unknown = Taro.getStorageSync(KEY)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch { return [] }
}

export function toggleRemembered(id: string): boolean {
  const current = getRemembered()
  const remembered = !current.includes(id)
  Taro.setStorageSync(KEY, remembered ? [...current, id] : current.filter(value => value !== id))
  return remembered
}
