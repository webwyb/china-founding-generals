import { useEffect } from 'react'
import { useDidShow } from '@tarojs/taro'
import type { Person } from '../data/people'
import { pageMetadata, serializeStructuredData, type SeoPage } from './metadata'
import { notifyNavigationReady } from '../services/navigation'

export function updatePageMetadata(page: SeoPage, person?: Person) {
  const data = pageMetadata(page, person)
  document.title = data.title
  const meta = (key: string, content?: string, property = false) => {
    const attribute = property ? 'property' : 'name'
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    if (content === undefined) { element?.remove(); return }
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element) }
    element.content = content
  }
  meta('description', data.description)
  meta('robots', data.robots)
  for (const [key, value] of Object.entries({ title: data.title, description: data.description, url: data.canonical, type: 'website', site_name: '山河有名', locale: 'zh_CN', image: data.image, 'image:alt': data.image ? `${person!.name}历史肖像` : undefined })) meta(`og:${key}`, value, true)
  for (const [key, value] of Object.entries({ card: 'summary', title: data.title, description: data.description, image: data.image })) meta(`twitter:${key}`, value)
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!data.canonical) canonical?.remove()
  else {
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = data.canonical
  }
  let structured = document.getElementById('page-structured-data')
  if (!structured) { structured = document.createElement('script'); structured.id = 'page-structured-data'; structured.setAttribute('type', 'application/ld+json'); document.head.appendChild(structured) }
  structured.textContent = serializeStructuredData(data.structuredData)
}

export function usePageMetadata(page: SeoPage, person?: Person) {
  const update = () => { if (process.env.TARO_ENV === 'h5') { updatePageMetadata(page, person); notifyNavigationReady(page, person?.id) } }
  useDidShow(update)
  useEffect(update, [page, person])
}
