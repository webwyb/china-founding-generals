/** Local builds stay self contained; production resolves immutable COS objects. */
export function assetUrl(path: string): string {
  const key = path.split('?')[0].replace(/^\.\/static\//, '')
  return typeof __SHANHE_ASSET_URLS__ === 'undefined' ? path : (__SHANHE_ASSET_URLS__[key] || path)
}
