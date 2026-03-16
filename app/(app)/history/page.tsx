import { createClient } from '@/lib/supabase/server'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: navHistory } = await supabase
    .from('nav_history')
    .select('date, total_assets, net_equity, total_liabilities, total_return_pct')
    .order('date', { ascending: true })
    .limit(5000)

  return <HistoryClient data={navHistory ?? []} />
}
