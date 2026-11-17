import { useEffect, useState } from 'react'
import { cachedPerson, loadPerson } from './personData'
export function usePersonDetails(id?: string) {
  const [person, setPerson] = useState(() => cachedPerson(id))
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    if (!id) return
    loadPerson(id).then(value => { if (active) setPerson(value) }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : '人物资料暂未加载，请重试。') })
    return () => { active = false }
  }, [id, attempt])
  return { person: cachedPerson(id) || (person?.id === id ? person : undefined), error, retry: () => setAttempt(value => value + 1) }
}
