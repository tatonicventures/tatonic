import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: holdings },
    { data: portfolio },
    { data: assets },
    { data: liabilities },
    { data: accounts },
  ] = await Promise.all([
    supabase.from('private_holdings').select('*').eq('status', 'Open'),
    supabase.from('portfolio_positions').select('*').eq('status', 'Open'),
    supabase.from('assets').select('*'),
    supabase.from('liabilities').select('*'),
    supabase.from('accounts').select('*').order('institution'),
  ])

  return (
    <DashboardClient
      holdings={holdings ?? []}
      portfolio={portfolio ?? []}
      assets={assets ?? []}
      liabilities={liabilities ?? []}
      accounts={accounts ?? []}
    />
  )
}
