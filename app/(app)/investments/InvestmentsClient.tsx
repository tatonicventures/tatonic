'use client'

import { useState } from 'react'
import { Plus, X, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ValueHistoryModal from '@/components/ValueHistoryModal'

// ── Types ─────────────────────────────────────────────────────────────────────
type Holding = {
  id: string
  name: string
  type: string
  status: string
  action_date: string | null
  amount_invested: number
  valuation_at_investment: number | null
  current_valuation: number | null
  value: number
  return_dollars: number | null
  return_pct: number | null
  notes: string | null
}

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

const EMPTY_HOLDING: Omit<Holding, 'id' | 'return_dollars' | 'return_pct'> = {
  name: '', type: 'Stock', status: 'Open', action_date: '',
  amount_invested: 0, valuation_at_investment: null, current_valuation: null, value: 0, notes: '',
}

const EMPTY_POSITION: Omit<Position, 'id'> = {
  asset_name: '', ticker: '', status: 'Open', open_date: '', close_date: null,
  action_price: null, qty_shares: null, exit_price: null, current_value: null,
  return_dollars: null, return_pct: null, spy_price_on_date: null, notes: '', realized_profits: null,
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toFixed(0)
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%'
}

type Tab = 'Private' | 'Stocks'
type HoldingFilter = 'All' | 'Open' | 'Closed'

// ── Main Component ────────────────────────────────────────────────────────────
export default function InvestmentsClient({
  initialHoldings,
  initialPositions,
}: {
  initialHoldings: Holding[]
  initialPositions: Position[]
}) {
  const [tab, setTab] = useState<Tab>('Private')
  const [holdings, setHoldings] = useState(initialHoldings)
  const [positions, setPositions] = useState(initialPositions)
  const [holdingFilter, setHoldingFilter] = useState<HoldingFilter>('All')
  const [posFilter, setPosFilter] = useState<HoldingFilter>('All')

  // Modal state
  const [modal, setModal] = useState<null | 'add-holding' | 'edit-holding' | 'add-position' | 'edit-position'>(null)
  const [holdingForm, setHoldingForm] = useState<Omit<Holding, 'id' | 'return_dollars' | 'return_pct'>>(EMPTY_HOLDING)
  const [posForm, setPosForm] = useState<Omit<Position, 'id'>>(EMPTY_POSITION)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // History modal
  const [historyModal, setHistoryModal] = useState<{
    entityId: string; entityName: string; currentValue: number
    table: 'holding_value_history' | 'portfolio_value_history'
    idColumn: 'holding_id' | 'position_id'
    valueColumn: 'value'
    onValueUpdate: (v: number) => void
  } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // ── Derived totals ──────────────────────────────────────────────────────────
  const filteredHoldings = holdingFilter === 'All' ? holdings : holdings.filter(h => h.status === holdingFilter)
  const filteredPositions = posFilter === 'All' ? positions : positions.filter(p => p.status === posFilter)

  const holdingTotals = holdings.filter(h => h.status === 'Open').reduce(
    (a, h) => ({ invested: a.invested + (h.amount_invested ?? 0), value: a.value + (h.value ?? 0) }),
    { invested: 0, value: 0 }
  )
  const posTotals = positions.filter(p => p.status === 'Open').reduce(
    (a, p) => ({ cost: a.cost + (p.action_price ?? 0) * (p.qty_shares ?? 0), value: a.value + (p.current_value ?? 0) }),
    { cost: 0, value: 0 }
  )

  // ── Holding CRUD ────────────────────────────────────────────────────────────
  function openAddHolding() { setHoldingForm(EMPTY_HOLDING); setEditId(null); setModal('add-holding') }
  function openEditHolding(h: Holding) {
    setHoldingForm({ name: h.name, type: h.type, status: h.status, action_date: h.action_date ?? '',
      amount_invested: h.amount_invested, valuation_at_investment: h.valuation_at_investment,
      current_valuation: h.current_valuation, value: h.value, notes: h.notes ?? '' })
    setEditId(h.id); setModal('edit-holding')
  }

  async function saveHolding() {
    setSaving(true)
    const payload = { ...holdingForm,
      amount_invested: Number(holdingForm.amount_invested),
      value: Number(holdingForm.value),
      valuation_at_investment: holdingForm.valuation_at_investment ? Number(holdingForm.valuation_at_investment) : null,
      current_valuation: holdingForm.current_valuation ? Number(holdingForm.current_valuation) : null,
      action_date: holdingForm.action_date || null,
    }
    if (modal === 'add-holding') {
      const { data } = await supabase.from('private_holdings').insert(payload).select().single()
      if (data) setHoldings(p => [data, ...p])
    } else if (editId) {
      const { data } = await supabase.from('private_holdings').update(payload).eq('id', editId).select().single()
      if (data) {
        setHoldings(p => p.map(h => h.id === editId ? data : h))
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('holding_value_history').upsert(
          { holding_id: editId, date: today, value: payload.value },
          { onConflict: 'holding_id,date' }
        )
        const { updateNavToday } = await import('@/lib/updateNav')
        await updateNavToday(supabase)
      }
    }
    setSaving(false); setModal(null); router.refresh()
  }

  async function deleteHolding(id: string) {
    if (!confirm('Delete this holding? This cannot be undone.')) return
    await supabase.from('private_holdings').delete().eq('id', id)
    setHoldings(p => p.filter(h => h.id !== id))
  }

  // ── Position CRUD ───────────────────────────────────────────────────────────
  function openAddPosition() { setPosForm(EMPTY_POSITION); setEditId(null); setModal('add-position') }
  function openEditPosition(p: Position) {
    setPosForm({ ...p }); setEditId(p.id); setModal('edit-position')
  }

  async function savePosition() {
    setSaving(true)
    if (modal === 'add-position') {
      const { data } = await supabase.from('portfolio_positions').insert(posForm).select().single()
      if (data) setPositions(p => [data, ...p])
    } else if (editId) {
      const { data } = await supabase.from('portfolio_positions').update(posForm).eq('id', editId).select().single()
      if (data) {
        setPositions(p => p.map(pos => pos.id === editId ? data : pos))
        const val = posForm.current_value ?? (posForm.action_price ?? 0) * (posForm.qty_shares ?? 0)
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('portfolio_value_history').upsert(
          { position_id: editId, date: today, value: val },
          { onConflict: 'position_id,date' }
        )
        const { updateNavToday } = await import('@/lib/updateNav')
        await updateNavToday(supabase)
      }
    }
    setSaving(false); setModal(null); router.refresh()
  }

  async function deletePosition(id: string) {
    if (!confirm('Delete this position?')) return
    await supabase.from('portfolio_positions').delete().eq('id', id)
    setPositions(p => p.filter(pos => pos.id !== id))
  }

  // ── History modal ───────────────────────────────────────────────────────────
  function openHistoryHolding(h: Holding) {
    setHistoryModal({
      entityId: h.id, entityName: h.name, currentValue: h.value,
      table: 'holding_value_history', idColumn: 'holding_id', valueColumn: 'value',
      onValueUpdate: (v) => setHoldings(prev => prev.map(x => x.id === h.id ? { ...x, value: v } : x)),
    })
  }

  function openHistoryPosition(p: Position) {
    const val = p.current_value ?? (p.action_price ?? 0) * (p.qty_shares ?? 0)
    setHistoryModal({
      entityId: p.id, entityName: p.asset_name, currentValue: val,
      table: 'portfolio_value_history', idColumn: 'position_id', valueColumn: 'value',
      onValueUpdate: (v) => setPositions(prev => prev.map(x => x.id === p.id ? { ...x, current_value: v } : x)),
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Investments</h1>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6">
        {(['Private', 'Stocks'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'text-white' : 'text-gray-500 bg-white border border-gray-200 hover:text-gray-700'
            }`}
            style={tab === t ? { background: '#BD2FA7' } : {}}>
            {t === 'Private' ? 'Holdings' : 'Stock Portfolio'}
          </button>
        ))}
      </div>

      {/* ── PRIVATE TAB ── */}
      {tab === 'Private' && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total Invested', value: fmt(holdingTotals.invested) },
              { label: 'Current Value', value: fmt(holdingTotals.value) },
              { label: 'Return ($)', value: fmt(holdingTotals.value - holdingTotals.invested), color: (holdingTotals.value - holdingTotals.invested) >= 0 ? '#1D9E75' : '#D85A30' },
              { label: 'Return (%)', value: holdingTotals.invested > 0 ? fmtPct((holdingTotals.value - holdingTotals.invested) / holdingTotals.invested) : '—', color: (holdingTotals.value - holdingTotals.invested) >= 0 ? '#1D9E75' : '#D85A30' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{c.label}</div>
                <div className="text-xl font-mono font-semibold" style={{ color: c.color ?? '#1a1a1a' }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {(['All', 'Open', 'Closed'] as HoldingFilter[]).map(f => (
                <button key={f} onClick={() => setHoldingFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    holdingFilter === f ? 'text-white' : 'text-gray-500 bg-white border border-gray-200'
                  }`}
                  style={holdingFilter === f ? { background: '#BD2FA7' } : {}}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={openAddHolding}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#BD2FA7' }}>
              <Plus size={15} /> Add holding
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-4 py-3">Entity</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Invested</th>
                  <th className="text-right px-4 py-3">Value</th>
                  <th className="text-right px-4 py-3">Return $</th>
                  <th className="text-right px-4 py-3">Return %</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredHoldings.map(h => {
                  const ret = (h.value ?? 0) - (h.amount_invested ?? 0)
                  const retPct = (h.amount_invested ?? 0) > 0 ? ret / h.amount_invested : null
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">{h.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">{fmt(h.amount_invested)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(h.value)}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: ret >= 0 ? '#1D9E75' : '#D85A30' }}>{fmt(ret)}</td>
                      <td className="px-4 py-3 text-right font-mono" style={{ color: (retPct ?? 0) >= 0 ? '#1D9E75' : '#D85A30' }}>{fmtPct(retPct)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {h.action_date ? new Date(h.action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openHistoryHolding(h)} title="Value history" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#BD2FA7]">
                            <TrendingUp size={13} />
                          </button>
                          <button onClick={() => openEditHolding(h)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteHolding(h.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredHoldings.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No holdings.</p>}
          </div>
        </>
      )}

      {/* ── STOCKS TAB ── */}
      {tab === 'Stocks' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Open Positions', value: String(positions.filter(p => p.status === 'Open').length) },
              { label: 'Closed Positions', value: String(positions.filter(p => p.status === 'Closed').length) },
              { label: 'Total Realized P&L', value: fmt(positions.filter(p => p.status === 'Closed').reduce((s, p) => s + (p.realized_profits ?? 0), 0)),
                color: positions.filter(p => p.status === 'Closed').reduce((s, p) => s + (p.realized_profits ?? 0), 0) >= 0 ? '#1D9E75' : '#D85A30' },
              { label: 'Open Value', value: fmt(posTotals.value) },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{c.label}</div>
                <div className="text-xl font-mono font-semibold" style={{ color: c.color ?? '#1a1a1a' }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {(['All', 'Open', 'Closed'] as HoldingFilter[]).map(f => (
                <button key={f} onClick={() => setPosFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    posFilter === f ? 'text-white' : 'text-gray-500 bg-white border border-gray-200'
                  }`}
                  style={posFilter === f ? { background: '#BD2FA7' } : {}}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={openAddPosition}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#BD2FA7' }}>
              <Plus size={15} /> Add position
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Ticker</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Opened</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Shares</th>
                  <th className="text-right px-4 py-3">Value / Exit</th>
                  <th className="text-right px-4 py-3">Return $</th>
                  <th className="text-right px-4 py-3">Return %</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPositions.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.asset_name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{p.ticker ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
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
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openHistoryPosition(p)} title="Value history" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#BD2FA7]">
                          <TrendingUp size={13} />
                        </button>
                        <button onClick={() => openEditPosition(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => deletePosition(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPositions.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No positions.</p>}
          </div>
        </>
      )}

      {/* ── HOLDING ADD/EDIT MODAL ── */}
      {(modal === 'add-holding' || modal === 'edit-holding') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add-holding' ? 'Add Holding' : 'Edit Holding'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Entity Name</label>
                <input className="input w-full" value={holdingForm.name} onChange={e => setHoldingForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select className="input w-full" value={holdingForm.type} onChange={e => setHoldingForm(p => ({ ...p, type: e.target.value }))}>
                  <option>Stock</option><option>Distribution</option><option>Finance Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select className="input w-full" value={holdingForm.status} onChange={e => setHoldingForm(p => ({ ...p, status: e.target.value }))}>
                  <option>Open</option><option>Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" className="input w-full" value={holdingForm.action_date ?? ''} onChange={e => setHoldingForm(p => ({ ...p, action_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount Invested</label>
                <input type="number" className="input w-full font-mono" value={holdingForm.amount_invested} onChange={e => setHoldingForm(p => ({ ...p, amount_invested: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Value</label>
                <input type="number" className="input w-full font-mono" value={holdingForm.value} onChange={e => setHoldingForm(p => ({ ...p, value: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valuation at Investment</label>
                <input type="number" className="input w-full font-mono" value={holdingForm.valuation_at_investment ?? ''} onChange={e => setHoldingForm(p => ({ ...p, valuation_at_investment: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea className="input w-full resize-none" rows={2} value={holdingForm.notes ?? ''} onChange={e => setHoldingForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveHolding} disabled={saving || !holdingForm.name} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#BD2FA7' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POSITION ADD/EDIT MODAL ── */}
      {(modal === 'add-position' || modal === 'edit-position') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add-position' ? 'Add Position' : 'Edit Position'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Asset Name', key: 'asset_name', span: 2 },
                { label: 'Ticker', key: 'ticker' },
                { label: 'Status', key: 'status', type: 'select', opts: ['Open', 'Closed'] },
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
                { label: 'Notes', key: 'notes', span: 2 },
              ].map(f => (
                <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input w-full" value={(posForm as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setPosForm(p => ({ ...p, [f.key]: e.target.value }))}>
                      {f.opts?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type ?? 'text'} className="input w-full"
                      value={(posForm as Record<string, unknown>)[f.key] as string ?? ''}
                      onChange={e => setPosForm(p => ({ ...p, [f.key]: f.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null) }))} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={savePosition} disabled={saving} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#BD2FA7' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY MODAL ── */}
      {historyModal && (
        <ValueHistoryModal
          entityId={historyModal.entityId}
          entityName={historyModal.entityName}
          currentValue={historyModal.currentValue}
          table={historyModal.table}
          idColumn={historyModal.idColumn}
          valueColumn={historyModal.valueColumn}
          onValueUpdate={historyModal.onValueUpdate}
          onClose={() => setHistoryModal(null)}
        />
      )}

      <style jsx>{`
        .input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font-size: 14px; outline: none; }
        .input:focus { border-color: #BD2FA7; }
      `}</style>
    </div>
  )
}
