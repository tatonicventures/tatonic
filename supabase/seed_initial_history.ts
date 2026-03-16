/**
 * Seeds 2026-01-01 as the baseline data point for all entities.
 * Run: npx tsx --env-file=.env.local supabase/seed_initial_history.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DATE = '2026-01-01'

async function run() {
  // Holdings
  console.log('Seeding holding_value_history...')
  const { data: holdings } = await supabase.from('private_holdings').select('id, name, value')
  if (holdings) {
    const { error } = await supabase.from('holding_value_history').upsert(
      holdings.map(h => ({ holding_id: h.id, date: DATE, value: h.value })),
      { onConflict: 'holding_id,date' }
    )
    if (error) console.error(error)
    else console.log(`  ${holdings.length} holdings seeded`)
  }

  // Portfolio positions
  console.log('Seeding portfolio_value_history...')
  const { data: positions } = await supabase.from('portfolio_positions').select('id, asset_name, current_value, action_price, qty_shares')
  if (positions) {
    const rows = positions
      .filter(p => p.current_value != null || (p.action_price && p.qty_shares))
      .map(p => ({
        position_id: p.id,
        date: DATE,
        value: p.current_value ?? (p.action_price * p.qty_shares),
      }))
    const { error } = await supabase.from('portfolio_value_history').upsert(rows, { onConflict: 'position_id,date' })
    if (error) console.error(error)
    else console.log(`  ${rows.length} positions seeded`)
  }

  // Assets
  console.log('Seeding asset_value_history...')
  const { data: assets } = await supabase.from('assets').select('id, name, estimated_value')
  if (assets) {
    const { error } = await supabase.from('asset_value_history').upsert(
      assets.map(a => ({ asset_id: a.id, date: DATE, value: a.estimated_value })),
      { onConflict: 'asset_id,date' }
    )
    if (error) console.error(error)
    else console.log(`  ${assets.length} assets seeded`)
  }

  // Accounts
  console.log('Seeding account_balance_history...')
  const { data: accounts } = await supabase.from('accounts').select('id, account_name, balance')
  if (accounts) {
    const { error } = await supabase.from('account_balance_history').upsert(
      accounts.map(a => ({ account_id: a.id, date: DATE, balance: a.balance })),
      { onConflict: 'account_id,date' }
    )
    if (error) console.error(error)
    else console.log(`  ${accounts.length} accounts seeded`)
  }

  console.log('Done.')
}

run().catch(console.error)
