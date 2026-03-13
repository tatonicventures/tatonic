'use client'

import { useState, useMemo } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Position = {
  id: string
  asset_name: string
  ticker: string | null
  status: string
  open_date: string | null
  close_date: string | null
  action_price: number | null
  qty_shares: number | null
  exit_price: number | null
  current_value: number | null
  return_dollars: number | null
  return_pct: number | null
  spy_price_on_date: number | null
  notes: string | null
  realized_profits: number | null
}

const EMPTY_POS: Omit<Position, 'id'> = {
  asset_name: '', ticker: '', status: 'Open', open_date: '', close_date: null,
  action_price: null, qty_shares: null, exit_price: null, current_value: null,
  return_dollars: null, return_pct: null, spy_price_on_date: null, notes: '', realized_profits: null,
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%'
}

type Filter = 'All' | 'Open' | 'Closed'

export default function PortfolioClient({ initialPositions }: { initialPositions: Position[] }) {
  const [positions, setPositions] = useState(initialPositions)
  const [filter, setFilter] = useState<Filter>('All')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<Omit<Position, 'id'>>(EMPTY_POS)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const filtered = filter === 'All' ? positions : positions.filter(p => p.status === filter)
  const open = positions.filter(p => p.status === 'Open')
  const closed = positions.filter(p => p.status === 'Closed')
  const totalRealized = closed.reduce((s, p) => s + (p.realized_profits ?? 0), 0)

  // Monthly returns bar chart data from closed positions
  const monthlyData = useMemo(() => {
    const byMonth: Record<string, number> = {}
    closed.forEach(p => {
      if (!p.close_date || !p.realized_profits) return
      const key = p.close_date.slice(0, 7) // YYYY-MM
      byMonth[key] = (byMonth[key] ?? 0) + p.realized_profits
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value,
      }))
  }, [closed])

  function openAdd() { setForm(EMPTY_POS); setEditId(null); setModal('add') }
  function openEdit(p: Position) {
    setForm({ ...p })
    setEditId(p.id)
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form }

    if (modal === 'add') {
      const { data, error } = await supabase.from('portfolio_positions').insert(payload).select().single()
      if (!error && data) setPositions(prev => [data, ...prev])
    } else if (editId) {
      const { data, error } = await supabase.from('portfolio_positions').update(payload).eq('id', editId).select().single()
      if (!error && data) setPositions(prev => prev.map(p => p.id === editId ? data : p))
    }

    setSaving(false)
    setModal(null)
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Portfolio</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#BD2FA7' }}
        >
          <Plus size={15} /> Add position
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Realized P&L', value: fmt(totalRealized), color: totalRealized >= 0 ? '#1D9E75' : '#D85A30' },
          { label: 'Open Positions', value: String(open.length) },
          { label: 'Closed Positions', value: String(closed.length) },
          { label: 'Win Rate', value: closed.length > 0 ? `${Math.round((closed.filter(p => (p.realized_profits ?? 0) > 0).length / closed.length) * 100)}%` : '—' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{c.label}</div>
            <div className="text-xl font-mono font-semibold" style={{ color: c.color ?? '#1a1a1a' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly Returns Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Monthly Realized Returns</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barSize={28}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v as number)} />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {monthlyData.map((d, i) => (
                  <Cell key={i} fill={d.value >= 0 ? '#1D9E75' : '#D85A30'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4">
        {(['All', 'Open', 'Closed'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'text-white' : 'text-gray-500 hover:text-gray-700 bg-white border border-gray-200'
            }`}
            style={filter === f ? { background: '#BD2FA7' } : {}}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Ticker</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Open Date</th>
              <th className="text-right px-4 py-3">Cost</th>
              <th className="text-right px-4 py-3">Shares</th>
              <th className="text-right px-4 py-3">Current / Exit</th>
              <th className="text-right px-4 py-3">Return $</th>
              <th className="text-right px-4 py-3">Return %</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{p.asset_name}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{p.ticker ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    p.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500 text-xs">
                  {p.open_date ? new Date(p.open_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">{fmt(p.action_price)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">{p.qty_shares ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(p.current_value ?? p.exit_price)}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: (p.return_dollars ?? 0) >= 0 ? '#1D9E75' : '#D85A30' }}>{fmt(p.return_dollars)}</td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: (p.return_pct ?? 0) >= 0 ? '#1D9E75' : '#D85A30' }}>{fmtPct(p.return_pct)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No positions.</p>}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add' ? 'Add Position' : 'Edit Position'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Asset Name', key: 'asset_name', colSpan: 2 },
                { label: 'Ticker', key: 'ticker' },
                { label: 'Status', key: 'status', type: 'select', options: ['Open', 'Closed'] },
                { label: 'Open Date', key: 'open_date', type: 'date' },
                { label: 'Close Date', key: 'close_date', type: 'date' },
                { label: 'Action Price', key: 'action_price', type: 'number' },
                { label: 'Shares', key: 'qty_shares', type: 'number' },
                { label: 'Exit Price', key: 'exit_price', type: 'number' },
                { label: 'Current Value', key: 'current_value', type: 'number' },
                { label: 'Return $', key: 'return_dollars', type: 'number' },
                { label: 'Return %', key: 'return_pct', type: 'number' },
                { label: 'Realized Profits', key: 'realized_profits', type: 'number' },
                { label: 'SPY Price at Open', key: 'spy_price_on_date', type: 'number' },
                { label: 'Notes', key: 'notes', colSpan: 2 },
              ].map(f => (
                <div key={f.key} className={f.colSpan === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input-field w-full" value={(form as Record<string, unknown>)[f.key] as string ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      {f.options?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type ?? 'text'}
                      className="input-field w-full"
                      value={(form as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setForm(p => ({
                        ...p,
                        [f.key]: f.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value || null
                      }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#BD2FA7' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-field { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font-size: 14px; outline: none; width: 100%; }
        .input-field:focus { border-color: #BD2FA7; }
      `}</style>
    </div>
  )
}
