import { createClient } from '@/lib/supabase/server'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()

  // Paginate to bypass Supabase's 1000-row server cap
  const PAGE = 1000
  let allData: { date: string; total_assets: number | null; net_equity: number | null; total_liabilities: number | null; total_return_pct: number | null }[] = []
  let page = 0

  while (true) {
    const { data } = await supabase
      .from('nav_history')
      .select('date, total_assets, net_equity, total_liabilities, total_return_pct')
      .order('date', { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1)

    if (!data || data.length === 0) break
    allData = [...allData, ...data]
    if (data.length < PAGE) break
    page++
  }

  return <HistoryClient data={allData} />
}
