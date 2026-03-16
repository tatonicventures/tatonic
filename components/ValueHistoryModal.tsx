'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'

type HistoryRow = { date: string; value: number }

type Props = {
  entityId: string
  entityName: string
  currentValue: number
  table: 'holding_value_history' | 'portfolio_value_history' | 'asset_value_history' | 'account_balance_history'
  idColumn: 'holding_id' | 'position_id' | 'asset_id' | 'account_id'
  valueColumn: 'value' | 'balance'
  /** Called with the new value when user saves a data point, so parent can update its state */
  onValueUpdate?: (newValue: number) => void
  onClose: () => void
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1f2937] rounded-lg px-3 py-2 text-xs shadow-xl border border-white/10">
      <div className="text-gray-400 mb-1">
        {label ? new Date(label + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
      </div>
      <div className="text-white font-mono font-medium">{fmtFull(payload[0].value)}</div>
    </div>
  )
}

export default function ValueHistoryModal({
  entityId, entityName, currentValue, table, idColumn, valueColumn, onValueUpdate, onClose,
}: Props) {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [value, setValue] = useState(String(currentValue))
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from(table)
        .select(`date, ${valueColumn}`)
        .eq(idColumn, entityId)
        .order('date', { ascending: true })

      setHistory((data ?? []).map((r: Record<string, unknown>) => ({
        date: r.date as string,
        value: r[valueColumn] as number,
      })))
      setLoading(false)
    }
    load()
  }, [entityId, table, idColumn, valueColumn])

  const firstValue = history[0]?.value
  const latestValue = history[history.length - 1]?.value ?? currentValue
  const change = firstValue != null ? latestValue - firstValue : null

  async function handleSave() {
    if (!value || !date) return
    setSaving(true)
    const numVal = Number(value)

    // 1. Upsert into history table
    await supabase.from(table).upsert(
      { [idColumn]: entityId, date, [valueColumn]: numVal },
      { onConflict: `${idColumn},date` }
    )

    // 2. Update the main record's current value
    const mainTable = {
      holding_value_history: 'private_holdings',
      portfolio_value_history: 'portfolio_positions',
      asset_value_history: 'assets',
      account_balance_history: 'accounts',
    }[table]

    const mainValueColumn = {
      holding_value_history: 'value',
      portfolio_value_history: 'current_value',
      asset_value_history: 'estimated_value',
      account_balance_history: 'balance',
    }[table]

    const mainIdColumn = {
      holding_value_history: 'id',
      portfolio_value_history: 'id',
      asset_value_history: 'id',
      account_balance_history: 'id',
    }[table]

    await supabase.from(mainTable).update({ [mainValueColumn]: numVal }).eq(mainIdColumn, entityId)

    // 3. Update NAV for today
    const { updateNavToday } = await import('@/lib/updateNav')
    await updateNavToday(supabase)

    // 4. Update local history state
    setHistory(prev => {
      const filtered = prev.filter(r => r.date !== date)
      return [...filtered, { date, value: numVal }].sort((a, b) => a.date.localeCompare(b.date))
    })

    onValueUpdate?.(numVal)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{entityName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={18} /></button>
        </div>

        {/* Summary stats */}
        <div className="flex gap-5 text-xs text-gray-500 mb-5">
          <span>Current: <span className="font-mono font-medium text-gray-800">{fmtFull(currentValue)}</span></span>
          {change != null && (
            <span>
              Since {new Date(history[0].date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}:{' '}
              <span className="font-mono font-medium" style={{ color: change >= 0 ? '#1D9E75' : '#D85A30' }}>
                {change >= 0 ? '+' : ''}{fmtFull(change)}
              </span>
            </span>
          )}
          <span>{history.length} data point{history.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : history.length > 1 ? (
          <div className="mb-5">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => new Date(v + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  minTickGap={40} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => fmt(v)} width={64} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="value" stroke="#BD2FA7" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#BD2FA7' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg mb-5">
            {history.length === 1 ? 'One data point — add more to see a chart.' : 'No history yet — add a data point below.'}
          </div>
        )}

        {/* Add data point */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Record value update</p>
          <div className="flex gap-2">
            <input type="date" className="input flex-1" value={date} onChange={e => setDate(e.target.value)} />
            <input
              type="number"
              className="input w-40 font-mono"
              placeholder="New value"
              value={value}
              onChange={e => setValue(e.target.value)}
            />
            <button
              onClick={handleSave}
              disabled={saving || !value || !date}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex-shrink-0"
              style={{ background: '#BD2FA7' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Saving will update the current value and record today's NAV snapshot.
          </p>
        </div>
      </div>

      <style jsx>{`
        .input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font-size: 14px; outline: none; }
        .input:focus { border-color: #BD2FA7; }
      `}</style>
    </div>
  )
}
