import { createClient } from '@/lib/supabase/server'
import AccountsClient from './AccountsClient'

export default async function AccountsPage() {
  const supabase = await createClient()
  const [{ data: accounts }, { data: liabilities }] = await Promise.all([
    supabase.from('accounts').select('*').order('institution'),
    supabase.from('liabilities').select('*').order('name'),
  ])

  return <AccountsClient initialAccounts={accounts ?? []} initialLiabilities={liabilities ?? []} />
}
