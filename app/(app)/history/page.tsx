import { createClient } from '@/lib/supabase/server'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: navHistory } = await supabase
    .from('nav_history')
    .select('*')
    .order('date', { ascending: true })

  return <HistoryClient data={navHistory ?? []} />
}
