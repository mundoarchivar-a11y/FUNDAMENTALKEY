import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { MacroLog } from '../types/macro'

interface UseMacroDataResult {
  data: MacroLog | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMacroData(): UseMacroDataResult {
  const [data, setData]       = useState<MacroLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchLatest() {
      setLoading(true)
      setError(null)

      try {
        const { data: rows, error: sbError } = await supabase
          .from('macro_logs')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(1)
          .single()

        if (sbError) throw new Error(sbError.message)
        if (!cancelled) setData(rows as MacroLog)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLatest()
    return () => { cancelled = true }
  }, [tick])

  return { data, loading, error, refetch: () => setTick(t => t + 1) }
}
