import Taro from '@tarojs/taro'

export interface CatalogueState { search: string; rank: string; province: string; visibleCount: number; rememberedOnly: boolean; scrollTop: number }
const KEY = 'shanhe-catalogue-view-v1'
export const defaultCatalogueState: CatalogueState = { search: '', rank: '全部', province: '全部', visibleCount: 24, rememberedOnly: false, scrollTop: 0 }

export function readCatalogueState(): CatalogueState {
  try {
    const value: unknown = Taro.getStorageSync(KEY)
    if (!value || typeof value !== 'object') return { ...defaultCatalogueState }
    const data = value as Partial<CatalogueState>
    return {
      search: typeof data.search === 'string' ? data.search.slice(0, 100) : '',
      rank: typeof data.rank === 'string' && ['全部','元帅','大将','上将','中将','少将'].includes(data.rank) ? data.rank : '全部',
      province: typeof data.province === 'string' ? data.province : '全部',
      visibleCount: typeof data.visibleCount === 'number' && Number.isFinite(data.visibleCount) ? Math.min(1614, Math.max(24, Math.floor(data.visibleCount))) : 24,
      rememberedOnly: data.rememberedOnly === true,
      scrollTop: typeof data.scrollTop === 'number' && Number.isFinite(data.scrollTop) ? Math.max(0, data.scrollTop) : 0,
    }
  } catch { return { ...defaultCatalogueState } }
}

export function saveCatalogueState(value: CatalogueState) {
  try { Taro.setStorageSync(KEY, value) } catch { /* Browsing stays available when storage is disabled. */ }
}
