'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Holding = { name: string; amount_invested: number; value: number; type: string }
type PortfolioPos = { asset_name: string; current_value: number | null; action_price: number; qty_shares: number }
type Asset = { name: string; type: string; purchase_price: number; estimated_value: number }
type Liability = { name: string; principal: number; current_balance: number; interest_rate: number | null; term_years: number | null }
type Account = { institution: string; account_name: string; account_type: string; balance: number; last_updated: string | null }

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function DashboardClient({
  holdings, portfolio, assets, liabilities, accounts,
}: {
  holdings: Holding[]
  portfolio: PortfolioPos[]
  assets: Asset[]
  liabilities: Liability[]
  accounts: Account[]
}) {
  const holdingsValue  = holdings.reduce((s, h) => s + (h.value ?? 0), 0)
  const portfolioValue = portfolio.reduce((s, p) => s + (p.current_value ?? p.action_price * p.qty_shares), 0)
  const assetsValue    = assets.reduce((s, a) => s + (a.estimated_value ?? 0), 0)
  const cashBalance    = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + (l.current_balance ?? 0), 0)
  const totalAssets    = holdingsValue + portfolioValue + assetsValue + cashBalance
  const netEquity      = totalAssets - totalLiabilities

  const sbaLoan = liabilities.find(l => l.name.includes('SBA')) ?? liabilities[0]

  const donutData = [
    { name: 'Private Holdings', value: holdingsValue },
    { name: 'Portfolio',        value: portfolioValue },
    { name: 'Assets',           value: assetsValue },
    { name: 'Cash',             value: cashBalance },
  ].filter(d => d.value > 0)

  const COLORS = ['#BD2FA7', '#1D9E75', '#3B82F6', '#F59E0B']

  const summaryRows = [
    { label: 'Private Holdings', value: holdingsValue },
    { label: 'Portfolio',        value: portfolioValue },
    { label: 'Physical Assets',  value: assetsValue },
    { label: 'Cash',             value: cashBalance },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Metric Cards — Current Value + Net Equity only */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Value</div>
          <div className="text-3xl font-mono font-semibold text-gray-900">{fmt(totalAssets)}</div>
          <div className="text-xs text-gray-400 mt-1">Gross assets before liabilities</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Net Equity</div>
          <div className="text-3xl font-mono font-semibold" style={{ color: netEquity >= 0 ? '#1D9E75' : '#D85A30' }}>
            {fmt(netEquity)}
          </div>
          <div className="text-xs text-gray-400 mt-1">After {fmtFull(totalLiabilities)} in liabilities</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Allocation Donut */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Allocation</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v as number)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {donutData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
                <span className="font-mono text-gray-800">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Summary — value only, no return columns */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 col-span-2">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Holdings Summary</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2">Category</th>
                <th className="text-right pb-2">Value</th>
                <th className="text-right pb-2">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summaryRows.map(row => (
                <tr key={row.label}>
                  <td className="py-2.5 text-gray-700">{row.label}</td>
                  <td className="py-2.5 text-right font-mono text-gray-800">{fmt(row.value)}</td>
                  <td className="py-2.5 text-right font-mono text-gray-500">
                    {totalAssets > 0 ? ((row.value / totalAssets) * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 font-medium">
                <td className="pt-2.5 text-gray-800">Total</td>
                <td className="pt-2.5 text-right font-mono">{fmt(totalAssets)}</td>
                <td className="pt-2.5 text-right font-mono text-gray-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Liability Gauge */}
        {sbaLoan && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Liabilities</h2>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-600">{sbaLoan.name}</span>
                <span className="font-mono text-gray-800">{fmtFull(sbaLoan.current_balance)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{ width: `${(sbaLoan.current_balance / sbaLoan.principal) * 100}%`, background: '#D85A30' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>$0</span>
                <span>Original: {fmtFull(sbaLoan.principal)}</span>
              </div>
            </div>
            {sbaLoan.interest_rate && (
              <div className="text-xs text-gray-500">
                {(sbaLoan.interest_rate * 100).toFixed(1)}% APR · {sbaLoan.term_years}yr term
              </div>
            )}
          </div>
        )}

        {/* Bank Accounts */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Bank Accounts</h2>
          <div className="space-y-3">
            {accounts.map(acct => (
              <div key={acct.account_name} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-700">{acct.account_name}</div>
                  <div className="text-xs text-gray-400">{acct.institution} · {acct.account_type}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-gray-800">{fmtFull(acct.balance)}</div>
                  {acct.last_updated && (
                    <div className="text-xs text-gray-400">
                      {new Date(acct.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {accounts.length === 0 && <p className="text-sm text-gray-400">No accounts yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
