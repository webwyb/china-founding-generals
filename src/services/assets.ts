/** Local builds stay self contained; production resolves immutable COS objects. */
// Read the compile-time table once. A typeof guard would inline the full table
// twice in release builds. Standalone Node validators have no Taro constants.
const assetUrls: Record<string, string> = (() => {
  try { return __SHANHE_ASSET_URLS__ } catch { return {} }
})()

export function assetUrl(path: string): string {
  const key = path.split('?')[0].replace(/^\.\/static\//, '')
  const local = path.replace(/^\.\/static\//, '/static/')
  return assetUrls[key] || local
}
