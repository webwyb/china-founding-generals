import { useEffect, useState } from 'react'
import { useDidShow, useRouter } from '@tarojs/taro'

/** Taro can reuse an existing H5 page with its previous router parameters. */
export function usePersonRouteId(page: 'person' | 'card') {
  const { params } = useRouter()
  const readId = () => {
    if (process.env.TARO_ENV === 'h5') {
      const [path, query = ''] = window.location.hash.slice(1).split('?')
      if (path === `/pages/${page}/index`) return new URLSearchParams(query).get('id') || undefined
    }
    return params.id
  }
  const [id, setId] = useState<string | undefined>(readId)
  useDidShow(() => setId(readId()))
  useEffect(() => { setId(readId()) }, [params.id])
  return id
}
