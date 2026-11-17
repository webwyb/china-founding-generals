import Taro from '@tarojs/taro'
import { createNavigationQueue } from './navigationQueue'
import { pageHref } from './personLinks'
import { loadPerson } from './personData'

type Page = 'index' | 'explore' | 'person' | 'card'
type Target = { page: Page; query: string; returning: boolean }
let busy = false
const subscribers = new Set<() => void>()
export const subscribeNavigation = (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener) } }
export const navigationPending = () => busy
let readyKey = ''
const readyListeners = new Set<(key: string) => void>()
function viewKey(url: string) {
  const value = new URL(url, 'https://shanhe.invalid')
  return value.pathname + (value.pathname === '/card/' ? `?id=${value.searchParams.get('id') || ''}` : '')
}
export function notifyNavigationReady(page: string, id?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !['index','explore','person','card'].includes(page)) return
  if ((page === 'person' || page === 'card') && !id) return
  const key = viewKey(pageHref(page as Page, id ? `id=${encodeURIComponent(id)}` : ''))
  if (viewKey(window.location.href) !== key) return
  readyKey = key
  document.documentElement.dataset.routeReady = key
  readyListeners.forEach(listener => listener(key))
}
function afterPaint() {
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 80) // Background tabs may suspend rAF.
    requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve() }))
  })
}
const queue = createNavigationQueue<Target>({
  key: target => pageHref(target.page, target.query) + (target.returning ? ':return' : ':open'),
  async prepare(target) {
    const id = new URLSearchParams(target.query).get('id')
    const data = id && (target.page === 'person' || target.page === 'card') ? loadPerson(id) : Promise.resolve()
    const page = target.page === 'person' ? import('../pages/person/index') : target.page === 'card' ? import('../pages/card/index') : target.page === 'explore' ? import('../pages/explore/index') : import('../pages/index/index')
    await Promise.all([data, page])
  },
  async commit(target) {
    const url = pageHref(target.page, target.query), key = viewKey(url)
    if (readyKey === key && viewKey(window.location.href) === key && (target.page !== 'explore' || target.returning || !target.query)) return
    let listener: (key: string) => void
    let timer: ReturnType<typeof setTimeout>
    const mounted = new Promise<void>((resolve, reject) => {
      listener = value => { if (value === key) resolve() }
      readyListeners.add(listener)
      timer = setTimeout(() => reject(Error('页面暂未打开，请重试。')), 8000)
    })
    try {
      const pages = Taro.getCurrentPages()
      // Native history traversal may be ignored during rapid/background actions.
      // A new catalogue instance restores the same in-memory reading snapshot.
      const action = target.page === 'index' || target.page === 'explore' ? Taro.reLaunch({ url })
        : target.returning || window.location.pathname.startsWith('/people/') || window.location.pathname === '/card/' || pages.length >= 8 ? Taro.redirectTo({ url }) : Taro.navigateTo({ url })
      await Promise.all([action, mounted])
      await afterPaint()
    } finally { clearTimeout(timer!); readyListeners.delete(listener!) }
  },
  busy(value) { busy = value; subscribers.forEach(listener => listener()) }
})
export async function navigate(page: Page, query = '', returning = false) {
  try { await queue.request({ page, query, returning }) }
  catch (error) { void Taro.showToast({ title: error instanceof Error ? error.message : '页面暂未打开，请重试。', icon: 'none' }) }
}
