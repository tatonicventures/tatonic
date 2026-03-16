/**
 * Seeds nav_history from the Excel Data sheet and corrects asset data.
 * Run: npx tsx --env-file=.env.local supabase/seed_nav_and_assets.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function excelDateToISO(n: number): string {
  return new Date(Math.round((n - 25569) * 86400 * 1000)).toISOString().split('T')[0]
}

async function run() {
  const wb = XLSX.readFile('/Users/tatonic/Documents/Tatonic/Tatonic Holdings.xlsx')

  // ── 1. NAV History ──────────────────────────────────────────────────────────
  console.log('Seeding nav_history...')
  const dataSheet = XLSX.utils.sheet_to_json(wb.Sheets['Data'], { header: 1, defval: '' }) as (string | number)[][]

  const navRows = dataSheet
    .filter(r => typeof r[0] === 'number' && (r[0] as number) > 40000 && r[23] !== '')
    .map(r => ({
      date:              excelDateToISO(r[0] as number),
      total_assets:      Number(r[23]) || null,
      total_invested:    Number(r[22]) || null,
      total_liabilities: Number(r[27]) || null,
      net_equity:        Number(r[28]) || null,
      total_return_pct:  Number(r[24]) || null,
      cash_balance:      Number(r[18]) || null,
    }))
    .filter(r => r.total_assets !== null)

  // Deduplicate by date (keep last)
  const byDate = new Map<string, typeof navRows[0]>()
  navRows.forEach(r => byDate.set(r.date, r))
  const uniqueNav = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Upsert in batches of 500
  const BATCH = 500
  for (let i = 0; i < uniqueNav.length; i += BATCH) {
    const batch = uniqueNav.slice(i, i + BATCH)
    const { error } = await supabase
      .from('nav_history')
      .upsert(batch, { onConflict: 'date' })
    if (error) console.error(`nav_history batch ${i} error:`, error)
    else process.stdout.write(`  inserted rows ${i}–${Math.min(i + BATCH, uniqueNav.length)}\r`)
  }
  console.log(`\n  Done — ${uniqueNav.length} NAV rows upserted.`)

  // ── 2. Fix Assets ───────────────────────────────────────────────────────────
  console.log('Fixing assets...')
  await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000') // delete all

  const { error: ae } = await supabase.from('assets').insert([
    // Depreciating assets
    { name: '2018 Audi SQ5',                       type: 'Asset',      location: 'Twin Lakes Apt', purchase_price: 35000,  estimated_value: 23709.77 },
    { name: 'MacBook Pro 14-inch M1 Pro (2021)',    type: 'Asset',      location: 'Twin Lakes Apt', purchase_price: 1000,   estimated_value: 950 },
    { name: 'iPad Pro 12.9-inch 4th Gen',           type: 'Asset',      location: 'Twin Lakes Apt', purchase_price: 850,    estimated_value: 520 },
    // Collectible investments
    { name: 'Elmer T. Lee Bourbon',                 type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 40,     estimated_value: 200 },
    { name: "Blanton's Gold Barrel Select",         type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 100,    estimated_value: 260 },
    { name: 'Colonel EH Taylor Barrel Proof',       type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 112.75, estimated_value: 150 },
    { name: 'Buffalo Trace Barrel Select',          type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 27,     estimated_value: 40 },
    { name: 'George T. Stagg Bourbon',              type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 120,    estimated_value: 250 },
    { name: 'Johnnie Walker Blue Label James Jean', type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 250,    estimated_value: 350 },
    { name: "Shima Shanti - The Sea's Onrush",      type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 4000,   estimated_value: 4600 },
    { name: 'Shima Shanti - Mountains Crumble to the Sea', type: 'Investment', location: 'Twin Lakes Apt', purchase_price: 2800, estimated_value: 4600 },
  ])
  if (ae) console.error('assets error:', ae)
  else console.log('  Assets updated.')

  console.log('All done.')
}

run().catch(console.error)
