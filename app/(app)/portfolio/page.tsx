import { createClient } from '@/lib/supabase/server'
import PortfolioClient from './PortfolioClient'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: positions } = await supabase
    .from('portfolio_positions')
    .select('*')
    .order('open_date', { ascending: false })

  return <PortfolioClient initialPositions={positions ?? []} />
}
