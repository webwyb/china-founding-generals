import Taro from '@tarojs/taro'
import { getTopic } from '../data/topics'

const KEY = 'shanhe-topic-reading-v1'
export function cleanReading(topicId: string, value: unknown): string[] {
  const known = new Set(getTopic(topicId)?.entries.map(entry => entry.id) || [])
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && known.has(id)))] : []
}
export function getTopicReading(topicId: string): string[] {
  try { return cleanReading(topicId, Taro.getStorageSync(`${KEY}:${topicId}`)) } catch { return [] }
}
export function setTopicRead(topicId: string, entryId: string, read: boolean): string[] {
  if (!getTopic(topicId)?.entries.some(entry => entry.id === entryId)) throw Error('未找到这节内容')
  const current = getTopicReading(topicId)
  const next = read ? cleanReading(topicId, [...current, entryId]) : current.filter(id => id !== entryId)
  Taro.setStorageSync(`${KEY}:${topicId}`, next)
  return next
}
export function resetTopicReading(topicId: string) {
  Taro.removeStorageSync(`${KEY}:${topicId}`)
}
