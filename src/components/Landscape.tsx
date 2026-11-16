import type { ProvinceLandscape } from '../data/landscapes'

export default function Landscape({ landscape, className = '', eager = false }: { landscape: ProvinceLandscape; className?: string; eager?: boolean }) {
  return <img className={`landscape-image ${className}`} src={landscape.image} alt={`${landscape.province}·${landscape.landmark}水墨意象`} loading={eager ? 'eager' : 'lazy'} decoding='async' />
}
