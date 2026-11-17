import { Image } from '@tarojs/components'
import { BRAND_ICON, BRAND_NAME } from '../services/brand'
export default function BrandMark() {
  return <Image className='brand-icon' src={BRAND_ICON} mode='aspectFit' aria-label={`${BRAND_NAME}图标`}/>
}
