import { createClient } from '@/lib/supabase/server'
import AssetsClient from './AssetsClient'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .order('purchase_date', { ascending: false })

  return <AssetsClient initialAssets={assets ?? []} />
}
