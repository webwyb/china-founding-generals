/// <reference types="@tarojs/taro" />

declare const __SHANHE_ASSET_URLS__: Record<string, string>
declare const __SHANHE_CLIENT__: boolean
declare const __SHANHE_DATA_VERSION__: string

declare module '*.scss'
declare module '*.css'
declare module '*.png' {
  const path: string
  export default path
}
declare module '*.jpg' {
  const path: string
  export default path
}
declare module '*.jpeg' {
  const path: string
  export default path
}
declare module '*.webp' {
  const path: string
  export default path
}
declare module '*.svg' {
  const path: string
  export default path
}
