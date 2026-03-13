import { createClient } from '@/lib/supabase/server'
import HoldingsClient from './HoldingsClient'

export default async function PrivateHoldingsPage() {
  const supabase = await createClient()
  const { data: holdings } = await supabase
    .from('private_holdings')
    .select('*')
    .order('action_date', { ascending: false })

  return <HoldingsClient initialHoldings={holdings ?? []} />
}
