import brand from '../../config/brand.json'
import { assetUrl } from './assets'
export const BRAND_NAME = brand.name
export const BRAND_TAGLINE = brand.tagline
export const BRAND_DESCRIPTION = brand.description
// The small icon is bundled locally on WeChat; H5 production may use COS.
export const BRAND_ICON = assetUrl('./static/brand/icon.png')
