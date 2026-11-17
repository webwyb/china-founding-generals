import type { Person } from '../data/people'
import { PUBLIC_SITE_URL, personPath } from '../services/personLinks'

export type SeoPage = 'index' | 'explore' | 'person' | 'card' | 'directory' | 'about' | 'missing'
export interface PageMetadata {
  title: string
  description: string
  canonical?: string
  robots: string
  image?: string
  structuredData: Record<string, unknown>
}
const siteName = '山河有名'
const website = { '@type': 'WebSite', '@id': `${PUBLIC_SITE_URL}#website`, name: siteName, url: PUBLIC_SITE_URL, inLanguage: 'zh-CN' }
const absolute = (path: string) => new URL(path, PUBLIC_SITE_URL).href
const concise = (text: string, length = 150) => text.replace(/\s+/g, ' ').trim().slice(0, length)

export function pageMetadata(page: SeoPage, person?: Person): PageMetadata {
  const missing = page === 'missing' || (page === 'person' && !person)
  let title = '山河有名｜1614位开国将帅人物档案与生平故事'
  let description = '山河有名开国将帅数字纪念馆，收录1614位开国将帅，包括10位元帅、10位大将、57位上将、177位中将和1360位少将。按姓名、军衔与家乡查阅人物生平、人生足迹、历史肖像及资料出处。'
  let path = '/'
  if (page === 'explore' || page === 'directory') {
    title = `${page === 'directory' ? '全部人物档案索引' : '开国将帅名录'}｜1614位将帅姓名、军衔与家乡｜山河有名`
    path = page === 'directory' ? '/people/' : '/generals/'
  } else if (page === 'about') {
    title = '名录口径与资料来源｜关于山河有名'
    description = '了解山河有名的1614位开国将帅统计口径、人物资料与肖像出处、待核实字段及影像使用说明。人物档案保留可查阅的史料来源。'
    path = '/about/'
  } else if (page === 'card' && !person) {
    title = '制作人物纪念卡｜山河有名'
    description = '选择人物档案，制作带人物档案二维码的纪念卡。'
  } else if (person) {
    // Retain the catalogue's explicit uncertainty, including for homonyms.
    const identity = [person.name, person.rank, person.hometown]
    if (person.birth != null && !person.pendingFields?.includes('birth')) identity.push(`${person.birth}年生`)
    title = `${identity.join(' · ')}｜生平、人生足迹与史料｜山河有名`
    description = concise(`${person.name}，${person.rank}，${person.hometown}。${person.tagline}。查阅分段生平、人生足迹及历史肖像出处。${person.pendingFields?.length ? '部分资料待核实，详见档案说明。' : ''}`)
    path = personPath(person.id)
    if (page === 'card') title = `${person.name}的纪念卡｜山河有名`
  }
  if (missing) {
    title = '未找到这份档案｜山河有名'
    description = '未找到这份人物档案，可返回将帅名录按姓名、军衔或家乡查找。'
  }
  const canonical = missing || (page === 'card' && !person) ? undefined : absolute(path)
  const image = person && !person.portraitMissing ? absolute(person.portrait) : undefined
  const entity = person ? {
    '@type': 'Person', '@id': `${absolute(personPath(person.id))}#person`, name: person.name,
    identifier: person.id, url: absolute(personPath(person.id)), description: person.tagline,
    ...(image ? { image } : {})
  } : undefined
  const pageEntity = {
    '@type': page === 'directory' || page === 'explore' ? 'CollectionPage' : page === 'about' ? 'AboutPage' : 'WebPage',
    ...(canonical ? { '@id': `${canonical}#webpage`, url: canonical } : {}),
    name: title, description, inLanguage: 'zh-CN', isPartOf: { '@id': website['@id'] },
    ...(entity ? { mainEntity: entity, citation: person!.sources.map(source => ({ '@type': 'CreativeWork', name: source.title, url: source.url })) } : {})
  }
  const breadcrumb = person && canonical ? {
    '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteName, item: PUBLIC_SITE_URL },
      { '@type': 'ListItem', position: 2, name: '将帅名录', item: absolute('/generals/') },
      { '@type': 'ListItem', position: 3, name: person.name, item: canonical }
    ]
  } : undefined
  return {
    title, description, canonical, image,
    robots: missing || page === 'card' ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    structuredData: { '@context': 'https://schema.org', '@graph': [website, pageEntity, ...(breadcrumb ? [breadcrumb] : [])] }
  }
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
