'use client'

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

type NavRow = {
  date: string
  total_assets: number | null
  net_equity: number | null
  total_liabilities: number | null
  total_return_pct: number | null
}

type Range = '1Y' | '3Y' | '5Y' | 'All'

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toFixed(0)
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1f2937] rounded-lg p-3 text-sm shadow-xl border border-white/10">
      <div className="text-gray-400 text-xs mb-2">
        {label ? new Date(label + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
      </div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-mono font-medium">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function HistoryClient({ data }: { data: NavRow[] }) {
  const [range, setRange] = useState<Range>('All')

  const filtered = useMemo(() => {
    if (range === 'All') return data
    const now = new Date()
    const years = range === '1Y' ? 1 : range === '3Y' ? 3 : 5
    const cutoff = new Date(now.getFullYear() - years, now.getMonth(), now.getDate())
    return data.filter(d => new Date(d.date + 'T12:00:00') >= cutoff)
  }, [data, range])

  // Use the most recent row from the full dataset for summary cards
  const latest = data[data.length - 1]

  const chartData = filtered.map(d => ({
    date: d.date,
    'Net Equity': d.net_equity,
    'Total Assets': d.total_assets,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">NAV History</h1>

      {data.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
          <p className="text-sm">No NAV history data yet.</p>
        </div>
      ) : (
        <>
          {/* Summary cards — always show latest values */}
          {latest && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Net Equity', value: latest.net_equity, color: '#1a1a1a' },
                { label: 'Total Assets', value: latest.total_assets, color: '#1a1a1a' },
                { label: 'Total Liabilities', value: latest.total_liabilities, color: '#D85A30' },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{c.label}</div>
                  <div className="text-xl font-mono font-semibold" style={{ color: c.color }}>
                    {c.value != null ? fmtFull(c.value) : '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(latest.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Range selector */}
          <div className="flex gap-1 mb-4">
            {(['1Y', '3Y', '5Y', 'All'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  range === r ? 'text-white' : 'text-gray-500 hover:text-gray-700 bg-white border border-gray-200'
                }`}
                style={range === r ? { background: '#BD2FA7' } : {}}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  minTickGap={60}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => fmt(v)}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="Net Equity" stroke="#BD2FA7" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Total Assets" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
