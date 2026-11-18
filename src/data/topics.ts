import marshals from '../../data/topics/marshals.json'
import schools from '../../data/topics/military-schools.json'
import supply from '../../data/topics/supply.json'
import specialists from '../../data/topics/specialists.json'
import service from '../../data/topics/public-service.json'
import reunions from '../../data/topics/reunions.json'
import earlyLives from '../../data/topics/early-lives.json'
import shanghai from '../../data/topics/shanghai.json'
import sourceRegistry from '../../data/topics/sources.json'

export interface TopicEntry {
  id: string
  name: string
  field: string
  focus: string
  archiveId?: string | null
  paragraphs: { text: string; sourceUrls: string[] }[]
  milestones: { label: string; text: string; sourceUrl: string }[]
  connection: { kind: string; place: string; text: string; sourceUrls: string[] } | null
  question: string
  pendingFields: string[]
  fieldNote?: string | null
  fieldSourceUrls?: string[]
  relatedEntries?: { id: string; label: string; reason: string; sourceUrls: string[] }[]
}
export interface Topic {
  id: string
  title: string
  subtitle: string
  kind: string
  readMinutes: number
  intro: string
  scopeNote: string
  updatedAt: string
  entries: TopicEntry[]
}
export const topics: Topic[] = [marshals, schools, supply, specialists, service, reunions, earlyLives, shanghai]
export const featuredTopic: Topic = schools
export const homeTopics: Topic[] = [marshals, schools, shanghai]
export function relatedTopics(current: Topic) {
  const people = new Set(current.entries.map(entry => entry.archiveId).filter(Boolean))
  const ranked = topics.filter(topic => topic !== current)
    .map(topic => ({ topic, shared: topic.entries.filter(entry => entry.archiveId && people.has(entry.archiveId)).length }))
    .sort((a, b) => b.shared - a.shared)
  const localConnection = ranked.find(item => item.shared > 0 && item.topic.kind !== current.kind)
  const suggested = ranked.slice(0, 2).map(item => item.topic)
  if (localConnection && !suggested.includes(localConnection.topic)) suggested[1] = localConnection.topic
  return suggested
}
export const getTopic = (id?: string) => topics.find(topic => topic.id === id)
export function sourceTitle(url: string) {
  return sourceRegistry.sources.find(source => source.url === url)?.title
    || (url.includes('cpc.people.com.cn/') ? '中国共产党新闻网 · 人物资料' : '查阅资料原文')
}
export const topicPath = (id?: string) => id ? `/topics/${encodeURIComponent(id)}/` : '/topics/'
