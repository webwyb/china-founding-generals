import { useEffect, useState } from 'react'
import { useDidShow, useRouter } from '@tarojs/taro'

/** Taro can reuse an existing H5 page with its previous router parameters. */
export function usePersonRouteId(page: 'person' | 'card') {
  const { params } = useRouter()
  const readId = () => {
    if (process.env.TARO_ENV === 'h5') {
      if (page === 'person') {
        const match = /^\/people\/([^/]+)\/?$/.exec(window.location.pathname)
        if (match) {
          try { return decodeURIComponent(match[1]) } catch { return undefined }
        }
      }
      return new URLSearchParams(window.location.search).get('id') || undefined
    }
    return params.id
  }
  const [id, setId] = useState<string | undefined>(readId)
  useDidShow(() => setId(readId()))
  useEffect(() => { setId(readId()) }, [params.id])
  return id
}
