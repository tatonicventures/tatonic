import { createClient } from '@/lib/supabase/server'
import InvestmentsClient from './InvestmentsClient'

export default async function InvestmentsPage() {
  const supabase = await createClient()

  const [{ data: holdings }, { data: positions }] = await Promise.all([
    supabase
      .from('private_holdings')
      .select('*')
      .order('amount_invested', { ascending: false }),
    supabase
      .from('portfolio_positions')
      .select('*')
      .order('open_date', { ascending: false }),
  ])

  return (
    <InvestmentsClient
      initialHoldings={holdings ?? []}
      initialPositions={positions ?? []}
    />
  )
}
