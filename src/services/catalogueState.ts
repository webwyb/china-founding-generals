export interface CatalogueState { search: string; rank: string; province: string; visibleCount: number; rememberedOnly: boolean; scrollTop: number }
export const defaultCatalogueState: CatalogueState = { search: '', rank: '全部', province: '全部', visibleCount: 24, rememberedOnly: false, scrollTop: 0 }
// Return from a story to the same reading position. A browser refresh starts
// a new module instance, so filters never survive into a later visit.
let currentView = { ...defaultCatalogueState }

export function readCatalogueState(): CatalogueState {
  return { ...currentView }
}

export function saveCatalogueState(value: CatalogueState) {
  currentView = { ...value }
}
