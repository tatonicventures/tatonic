/**
 * Tatonic Ventures — Seed Script
 * Run after schema is applied:
 *   npx tsx supabase/seed.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (Settings → API → service_role secret — keep this private!)
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS for seeding
)

async function seed() {
  console.log('Seeding private_holdings...')
  const { error: e1 } = await supabase.from('private_holdings').insert([
    {
      name: 'Gin & Luck SPV LLC.',
      type: 'Stock',
      status: 'Open',
      amount_invested: 1037.84,
      value: 1002.74,
    },
    {
      name: 'Hyalite Capital Partners, LLC.',
      type: 'Stock',
      status: 'Open',
      amount_invested: 210825.44,
      value: 54909.73,
    },
    {
      name: 'Jack Johnson Entertainment, LLC.',
      type: 'Stock',
      status: 'Open',
      amount_invested: 7000,
      value: 4000,
    },
    {
      name: 'Jack Johnson Entertainment, LLC.',
      type: 'Stock',
      status: 'Open',
      amount_invested: 4000,
      value: 4000,
    },
  ])
  if (e1) console.error('private_holdings error:', e1)

  console.log('Seeding liabilities...')
  const { error: e2 } = await supabase.from('liabilities').insert([
    {
      name: 'SBA EIDL Loan',
      principal: 79100,
      current_balance: 77994.96,
      interest_rate: 0.03,
      term_years: 30,
    },
  ])
  if (e2) console.error('liabilities error:', e2)

  console.log('Seeding accounts...')
  const { error: e3 } = await supabase.from('accounts').insert([
    {
      institution: 'First Interstate Bank',
      account_name: 'Checking (0961)',
      account_type: 'Checking',
      balance: 17890.82,
      last_updated: new Date().toISOString().split('T')[0],
    },
    {
      institution: 'Brokerage',
      account_name: 'Brokerage Cash',
      account_type: 'Brokerage',
      balance: 0,
      last_updated: new Date().toISOString().split('T')[0],
    },
  ])
  if (e3) console.error('accounts error:', e3)

  console.log('Seeding assets...')
  const { error: e4 } = await supabase.from('assets').insert([
    {
      name: '2018 Audi SQ5',
      type: 'Asset',
      purchase_price: 35000,
      estimated_value: 23709.77,
    },
    {
      name: 'Bourbon Collection (6 bottles)',
      type: 'Investment',
      purchase_price: 510,
      estimated_value: 1100,
    },
    {
      name: 'Shima Shanti x2',
      type: 'Investment',
      purchase_price: 6800,
      estimated_value: 9200,
    },
    {
      name: 'MacBook Pro 14" M1',
      type: 'Asset',
      purchase_price: 1000,
      estimated_value: 950,
    },
    {
      name: 'iPad Pro 12.9" 4th Gen',
      type: 'Asset',
      purchase_price: 850,
      estimated_value: 520,
    },
  ])
  if (e4) console.error('assets error:', e4)

  console.log('Done! All seed data inserted.')
}

seed().catch(console.error)
