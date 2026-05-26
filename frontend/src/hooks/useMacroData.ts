import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { MacroLog } from '../types/macro'

interface UseMacroDataResult {
  data: MacroLog | null
  loading: boolean
  error: string | null
  refetch: () => void
  lastFetchedAt: Date | null
}

const POLL_MS = 60_000

export function useMacroData(): UseMacroDataResult {
  const [data, setData]                   = useState<MacroLog | null>(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [tick, setTick]                   = useState(0)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const lastIdRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchLatest(initial: boolean) {
      if (initial) setLoading(true)
      setError(null)

      try {
        const { data: row, error: sbError } = await supabase
          .from('macro_logs')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(1)
          .single()

        if (sbError) throw new Error(sbError.message)
        if (cancelled) return

        const next = row as MacroLog
        if (next.id !== lastIdRef.current) {
          lastIdRef.current = next.id
          setData(next)
        }
        setLastFetchedAt(new Date())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled && initial) setLoading(false)
      }
    }

    fetchLatest(true)
    const id = window.setInterval(() => fetchLatest(false), POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') fetchLatest(false) }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [tick])

  return { data, loading, error, refetch: () => setTick(t => t + 1), lastFetchedAt }
}
