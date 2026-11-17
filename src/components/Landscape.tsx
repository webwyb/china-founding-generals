import type { ProvinceLandscape } from '../data/landscapes'

export default function Landscape({ landscape, className = '', eager = false }: { landscape: ProvinceLandscape; className?: string; eager?: boolean }) {
  return <img className={`landscape-image ${className}`} src={landscape.image} alt={`${landscape.province}·${landscape.landmark}，AI生成的地域景观意象`} loading={eager ? 'eager' : 'lazy'} decoding='async' />
}
