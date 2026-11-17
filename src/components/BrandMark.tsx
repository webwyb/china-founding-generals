import { BRAND_ICON, BRAND_NAME } from '../services/brand'
export default function BrandMark() {
  return <img className='brand-icon' src={BRAND_ICON} alt={`${BRAND_NAME}图标`} width={40} height={40}/>
}
