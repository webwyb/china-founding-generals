import marshals from '../../data/topics/marshals.json'
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
export const topics: Topic[] = [marshals, shanghai]
export const getTopic = (id?: string) => topics.find(topic => topic.id === id)
export function sourceTitle(url: string) {
  return sourceRegistry.sources.find(source => source.url === url)?.title
    || (url.includes('cpc.people.com.cn/') ? '中国共产党新闻网 · 人物资料' : '查阅资料原文')
}
export const topicPath = (id?: string) => id ? `/topics/${encodeURIComponent(id)}/` : '/topics/'
