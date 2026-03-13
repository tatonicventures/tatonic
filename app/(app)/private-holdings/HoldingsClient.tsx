'use client'

import { useState } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

const EMPTY: Omit<Holding, 'id' | 'return_dollars' | 'return_pct'> = {
  name: '', type: 'Stock', status: 'Open',
  action_date: '', amount_invested: 0, valuation_at_investment: null,
  current_valuation: null, value: 0, notes: '',
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

export default function HoldingsClient({ initialHoldings }: { initialHoldings: Holding[] }) {
  const [holdings, setHoldings] = useState(initialHoldings)
  const [filter, setFilter] = useState<Filter>('All')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<Omit<Holding, 'id' | 'return_dollars' | 'return_pct'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const filtered = filter === 'All' ? holdings : holdings.filter(h => h.status === filter)

  const totals = filtered.reduce(
    (acc, h) => ({
      invested: acc.invested + (h.amount_invested ?? 0),
      value: acc.value + (h.value ?? 0),
    }),
    { invested: 0, value: 0 }
  )
  const totalReturn = totals.value - totals.invested
  const totalRetPct = totals.invested > 0 ? totalReturn / totals.invested : 0

  function openAdd() {
    setForm(EMPTY)
    setEditId(null)
    setModal('add')
  }

  function openEdit(h: Holding) {
    setForm({
      name: h.name, type: h.type, status: h.status,
      action_date: h.action_date ?? '',
      amount_invested: h.amount_invested,
      valuation_at_investment: h.valuation_at_investment,
      current_valuation: h.current_valuation,
      value: h.value, notes: h.notes ?? '',
    })
    setEditId(h.id)
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      amount_invested: Number(form.amount_invested),
      value: Number(form.value),
      valuation_at_investment: form.valuation_at_investment ? Number(form.valuation_at_investment) : null,
      current_valuation: form.current_valuation ? Number(form.current_valuation) : null,
      action_date: form.action_date || null,
    }

    if (modal === 'add') {
      const { data, error } = await supabase.from('private_holdings').insert(payload).select().single()
      if (!error && data) setHoldings(prev => [data, ...prev])
    } else if (editId) {
      const { data, error } = await supabase.from('private_holdings').update(payload).eq('id', editId).select().single()
      if (!error && data) setHoldings(prev => prev.map(h => h.id === editId ? data : h))
    }

    setSaving(false)
    setModal(null)
    router.refresh()
  }

  async function handleClose(id: string) {
    const exitVal = prompt('Enter exit valuation:')
    if (!exitVal) return
    const { data } = await supabase
      .from('private_holdings')
      .update({ status: 'Closed', current_valuation: Number(exitVal) })
      .eq('id', id)
      .select()
      .single()
    if (data) setHoldings(prev => prev.map(h => h.id === id ? data : h))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Private Holdings</h1>
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
          { label: 'Total Invested', value: fmt(totals.invested) },
          { label: 'Current Value', value: fmt(totals.value) },
          { label: 'Return ($)', value: fmt(totalReturn), color: totalReturn >= 0 ? '#1D9E75' : '#D85A30' },
          { label: 'Return (%)', value: fmtPct(totalRetPct), color: totalRetPct >= 0 ? '#1D9E75' : '#D85A30' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{c.label}</div>
            <div className="text-xl font-mono font-semibold" style={{ color: c.color ?? '#1a1a1a' }}>{c.value}</div>
          </div>
        ))}
      </div>

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
              <th className="text-left px-4 py-3">Entity</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Invested</th>
              <th className="text-right px-4 py-3">Value</th>
              <th className="text-right px-4 py-3">Return $</th>
              <th className="text-right px-4 py-3">Return %</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(h => {
              const ret = (h.value ?? 0) - (h.amount_invested ?? 0)
              const retPct = (h.amount_invested ?? 0) > 0 ? ret / h.amount_invested : null
              return (
                <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">{h.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      h.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>{h.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{fmt(h.amount_invested)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(h.value)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: ret >= 0 ? '#1D9E75' : '#D85A30' }}>{fmt(ret)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: (retPct ?? 0) >= 0 ? '#1D9E75' : '#D85A30' }}>{fmtPct(retPct)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {h.action_date ? new Date(h.action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <Pencil size={13} />
                      </button>
                      {h.status === 'Open' && (
                        <button onClick={() => handleClose(h.id)} className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700">
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10 text-sm">No positions.</p>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add' ? 'Add Position' : 'Edit Position'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Entity Name</label>
                  <input className="input-field w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select className="input-field w-full" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Stock</option>
                    <option>Distribution</option>
                    <option>Finance Payment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select className="input-field w-full" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option>Open</option>
                    <option>Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input type="date" className="input-field w-full" value={form.action_date ?? ''} onChange={e => setForm(p => ({ ...p, action_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount Invested</label>
                  <input type="number" className="input-field w-full font-mono" value={form.amount_invested} onChange={e => setForm(p => ({ ...p, amount_invested: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current Value</label>
                  <input type="number" className="input-field w-full font-mono" value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Valuation at Investment</label>
                  <input type="number" className="input-field w-full font-mono" value={form.valuation_at_investment ?? ''} onChange={e => setForm(p => ({ ...p, valuation_at_investment: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea className="input-field w-full resize-none" rows={2} value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: '#BD2FA7' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-field {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #BD2FA7;
        }
      `}</style>
    </div>
  )
}
