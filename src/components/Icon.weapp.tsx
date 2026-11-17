import { Image } from '@tarojs/components'
const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6', back: 'M20 12H4m6-6-6 6 6 6', external: 'M8 5h11v11M19 5 5 19', download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', bookmark: 'M6 3h12v18l-6-4-6 4V3Z', check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M6 18 18 6', search: 'M20 20 15 15m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', share: 'M12 16V3m-4 4 4-4 4 4M5 12v9h14v-9', pin: 'M12 22s7-7 7-13A7 7 0 0 0 5 9c0 6 7 13 7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', down: 'm6 9 6 6 6-6'
}
export default function Icon({ name, className = '' }: { name: keyof typeof paths; className?: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60736c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>`
  return <Image className={`icon ${className}`} src={`data:image/svg+xml,${encodeURIComponent(svg)}`} mode='aspectFit'/>
}
