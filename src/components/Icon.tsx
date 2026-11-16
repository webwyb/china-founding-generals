const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  external: 'M8 5h11v11M19 5 5 19',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M20 20 15 15m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  share: 'M9 12 4 7m0 0h7M4 7v7m4 6h12V8',
  pin: 'M12 22s7-7 7-13A7 7 0 0 0 5 9c0 6 7 13 7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  down: 'm6 9 6 6 6-6',
}

export default function Icon({ name, className = '' }: { name: keyof typeof paths; className?: string }) {
  return <svg className={`icon ${className}`} width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d={paths[name]} /></svg>
}
