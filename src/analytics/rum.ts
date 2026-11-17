import type { WebConfig } from 'aegis-web-sdk'
import settings from '../../config/analytics.json'
import site from '../../config/site.json'

export interface AnalyticsView {
  href: string
  doNotTrack?: string | null
  globalPrivacyControl?: boolean
}

interface ReportRequest {
  url: string
  data?: unknown
  [key: string]: unknown
}

const collector = new URL(settings.hostUrl)
const reportPaths = new Set(['/collect/pv', '/speed/performance', '/speed/webvitals', '/collect/whitelist', '/rateConfig'])

/** Queries and section anchors do not define a separate page or leave the browser. */
export function pageAddress(value: string): string {
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : ''
  } catch { return '' }
}

export function shouldTrack(view: AnalyticsView): boolean {
  try {
    const url = new URL(view.href)
    return settings.enabled && url.origin === new URL(site.origin).origin
      && view.doNotTrack !== '1' && !view.globalPrivacyControl
      && !url.hash.startsWith('#/pages/')
  } catch { return false }
}

function sourceAddress(value: string): string {
  try {
    const decoded = /^https?%3A/i.test(value) ? decodeURIComponent(value) : value
    const url = new URL(decoded)
    if (!/^https?:$/.test(url.protocol)) return ''
    return url.origin === new URL(site.origin).origin ? pageAddress(url.href) : url.origin
  } catch { return '' }
}

function cleanPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanPayload)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'uin').map(([key, item]) => {
    if (typeof item === 'string' && ['from', 'originFrom', 'url'].includes(key)) return [key, sourceAddress(item)]
    if (typeof item === 'string' && ['referer', 'referrer'].includes(key)) return [key, sourceAddress(item)]
    return [key, cleanPayload(item)]
  }))
}

/** Last wire-level check also covers originFrom/referrer, which SDK pageUrl does not. */
export function cleanRequest(request: ReportRequest): ReportRequest | undefined {
  try {
    const url = new URL(request.url)
    if (url.origin !== collector.origin || url.username || url.password || !reportPaths.has(url.pathname)) return undefined
    url.searchParams.delete('uin')
    for (const key of ['from', 'originFrom', 'referer', 'referrer']) {
      if (url.searchParams.has(key)) url.searchParams.set(key, sourceAddress(url.searchParams.get(key) || ''))
    }
    let data = request.data
    if (typeof data === 'string' && data) data = JSON.stringify(cleanPayload(JSON.parse(data)))
    else if (data && typeof data === 'object') data = cleanPayload(data)
    return { ...request, url: url.href, data }
  } catch { return undefined }
}

export function analyticsOptions(view: () => AnalyticsView): WebConfig {
  let lastPage: string | undefined
  const address = () => pageAddress(view().href)
  return {
    id: settings.reportId,
    hostUrl: settings.hostUrl,
    env: 'production',
    spa: true,
    aid: true,
    uin: '',
    random: 1,
    urlHandler: address,
    pagePerformance: { firstScreenInfo: false, urlHandler: address },
    webVitals: true,
    reportApiSpeed: false,
    reportAssetSpeed: false,
    onError: false,
    consoleLog: false,
    clickElementLog: false,
    apiLog: false,
    pageLoadLog: false,
    slowPageLoadLog: false,
    assetLog: false,
    slowAssetLog: false,
    blankScreen: false,
    lagMonitor: false,
    memoryMonitor: false,
    websocketHack: false,
    reportRetry: false,
    beforeRequest(data: { logType: string; logs: unknown }) {
      if (!shouldTrack(view()) || !['pv', 'performance', 'vitals', 'whiteList'].includes(data.logType)) return false
      if (data.logType === 'pv') {
        const page = address()
        if (page === lastPage) return false
        lastPage = page
      }
      return data
    },
    onBeforeRequest(request: ReportRequest) {
      return shouldTrack(view()) ? cleanRequest(request) : undefined
    },
  }
}

let started = false
export async function startAnalytics(): Promise<void> {
  if (typeof window === 'undefined') return
  const view = (): AnalyticsView => ({
    href: window.location.href,
    doNotTrack: navigator.doNotTrack,
    globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
  })
  if (started || !shouldTrack(view())) return
  started = true
  try {
    const { default: Aegis } = await import('aegis-web-sdk')
    if (!shouldTrack(view())) return
    const instance = new Aegis(analyticsOptions(view))
    // SDK otherwise reads unrelated UIN cookies; this site uses only random AID.
    instance.setConfig({ uin: '' })
  } catch {
    // Analytics availability must not interrupt browsing or memorial card creation.
  }
}
