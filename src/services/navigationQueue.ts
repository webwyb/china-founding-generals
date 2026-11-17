/** Serializes route commits; only the latest uncommitted intent is prepared. */
export function createNavigationQueue<T>(adapter: {
  key(target: T): string
  prepare(target: T): Promise<unknown>
  commit(target: T): Promise<unknown>
  busy?(pending: boolean): void
}) {
  type Entry = { target: T; key: string; promise: Promise<void>; resolve(): void; reject(error: unknown): void }
  let queued: Entry | undefined
  let active: Entry | undefined
  let cancelPreparation: (() => void) | undefined
  let running = false
  async function drain() {
    running = true; adapter.busy?.(true)
    while (queued) {
      const entry: Entry = queued
      queued = undefined; active = entry
      let cancelled = false
      const cancelledPromise = new Promise<void>(resolve => { cancelPreparation = () => { cancelled = true; resolve() } })
      try {
        await Promise.race([adapter.prepare(entry.target), cancelledPromise])
        cancelPreparation = undefined
        if (!cancelled) await adapter.commit(entry.target)
        entry.resolve()
      } catch (error) { entry.reject(error) }
      finally { cancelPreparation = undefined; active = undefined }
    }
    running = false; adapter.busy?.(false)
  }
  return {
    request(target: T): Promise<void> {
      const key = adapter.key(target)
      if (queued?.key === key) return queued.promise
      if (active?.key === key && !cancelPreparation) {
        queued?.resolve(); queued = undefined
        return active.promise
      }
      if (active?.key === key && !queued) return active.promise
      queued?.resolve()
      let resolve!: () => void, reject!: (error: unknown) => void
      const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail })
      queued = { target, key, promise, resolve, reject }
      cancelPreparation?.()
      if (!running) void drain()
      return promise
    }
  }
}
