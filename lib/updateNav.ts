import { SupabaseClient } from '@supabase/supabase-js'

export async function updateNavToday(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]

  const [{ data: holdings }, { data: portfolio }, { data: assets }, { data: accounts }, { data: liabilities }] =
    await Promise.all([
      supabase.from('private_holdings').select('value').eq('status', 'Open'),
      supabase.from('portfolio_positions').select('current_value, action_price, qty_shares').eq('status', 'Open'),
      supabase.from('assets').select('estimated_value'),
      supabase.from('accounts').select('balance'),
      supabase.from('liabilities').select('current_balance'),
    ])

  const totalAssets =
    (holdings ?? []).reduce((s, h) => s + (h.value ?? 0), 0) +
    (portfolio ?? []).reduce((s, p) => s + (p.current_value ?? (p.action_price ?? 0) * (p.qty_shares ?? 0)), 0) +
    (assets ?? []).reduce((s, a) => s + (a.estimated_value ?? 0), 0) +
    (accounts ?? []).reduce((s, a) => s + (a.balance ?? 0), 0)

  const totalLiabilities = (liabilities ?? []).reduce((s, l) => s + (l.current_balance ?? 0), 0)
  const netEquity = totalAssets - totalLiabilities

  await supabase.from('nav_history').upsert(
    {
      date: today,
      total_assets: totalAssets,
      total_liabilities: -totalLiabilities,
      net_equity: netEquity,
    },
    { onConflict: 'date' }
  )
}
