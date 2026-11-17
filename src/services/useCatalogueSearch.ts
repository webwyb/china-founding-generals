import { useEffect, useState } from 'react'
import { clientData } from '../data/people'
import { cachedSearchIndex, loadSearchIndex } from './personData'
export function useCatalogueSearch(query: string) {
  const [index, setIndex] = useState(cachedSearchIndex)
  const [issue, setIssue] = useState({ query: '', message: '' })
  const error = issue.query === query ? issue.message : ''
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!clientData || !query.trim() || index) return
    let active = true
    setIssue({ query, message: '' })
    loadSearchIndex().then(value => { if (active) setIndex(value) }).catch(reason => { if (active) setIssue({ query, message: reason instanceof Error ? reason.message : '检索暂未完成，请重试。' }) })
    return () => { active = false }
  }, [query, attempt, index])
  return { index, pending: clientData && !!query.trim() && !index && !error, error: query.trim() ? error : '', retry: () => setAttempt(value => value + 1), warm: () => { if (clientData) void loadSearchIndex().then(setIndex).catch(() => {}) } }
}
