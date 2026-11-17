export const navigationPending = () => false
export const subscribeNavigation = (_listener: () => void) => () => {}
export const notifyNavigationReady = (_page: string, _id?: string) => {}
export function navigate(_page: string, _query = '', _returning = false) { return Promise.resolve() }
