'use client'

import { useState } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Asset = {
  id: string
  name: string
  type: string
  location: string | null
  purchase_date: string | null
  purchase_price: number
  estimated_value: number
  return_dollars: number | null
  return_pct: number | null
  notes: string | null
}

const EMPTY: Omit<Asset, 'id' | 'return_dollars' | 'return_pct'> = {
  name: '', type: 'Asset', location: '', purchase_date: '', purchase_price: 0, estimated_value: 0, notes: '',
}

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%'
}

type Tab = 'Asset' | 'Investment'

export default function AssetsClient({ initialAssets }: { initialAssets: Asset[] }) {
  const [assets, setAssets] = useState(initialAssets)
  const [tab, setTab] = useState<Tab>('Asset')
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null)
  const [form, setForm] = useState<Omit<Asset, 'id' | 'return_dollars' | 'return_pct'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [inlineEdit, setInlineEdit] = useState<string | null>(null)
  const [inlineValue, setInlineValue] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const filtered = assets.filter(a => a.type === tab)
  const totals = {
    cost: filtered.reduce((s, a) => s + (a.purchase_price ?? 0), 0),
    value: filtered.reduce((s, a) => s + (a.estimated_value ?? 0), 0),
  }
  const totalReturn = totals.value - totals.cost

  function openAdd() {
    setForm({ ...EMPTY, type: tab })
    setEditId(null)
    setModal('add')
  }

  function openEdit(a: Asset) {
    setForm({
      name: a.name, type: a.type, location: a.location ?? '',
      purchase_date: a.purchase_date ?? '', purchase_price: a.purchase_price,
      estimated_value: a.estimated_value, notes: a.notes ?? '',
    })
    setEditId(a.id)
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      ...form,
      purchase_price: Number(form.purchase_price),
      estimated_value: Number(form.estimated_value),
      purchase_date: form.purchase_date || null,
    }

    if (modal === 'add') {
      const { data, error } = await supabase.from('assets').insert(payload).select().single()
      if (!error && data) setAssets(prev => [data, ...prev])
    } else if (editId) {
      const { data, error } = await supabase.from('assets').update(payload).eq('id', editId).select().single()
      if (!error && data) setAssets(prev => prev.map(a => a.id === editId ? data : a))
    }

    setSaving(false)
    setModal(null)
    router.refresh()
  }

  async function handleInlineSave(id: string) {
    const val = Number(inlineValue)
    const { data } = await supabase.from('assets').update({ estimated_value: val }).eq('id', id).select().single()
    if (data) setAssets(prev => prev.map(a => a.id === id ? data : a))
    setInlineEdit(null)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Assets</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#BD2FA7' }}
        >
          <Plus size={15} /> Add item
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6">
        {(['Asset', 'Investment'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'text-white' : 'text-gray-500 hover:text-gray-700 bg-white border border-gray-200'
            }`}
            style={tab === t ? { background: '#BD2FA7' } : {}}
          >
            {t === 'Asset' ? 'Depreciating Assets' : 'Investments / Collectibles'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Location</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-right px-4 py-3">Cost</th>
              <th className="text-right px-4 py-3">Est. Value</th>
              <th className="text-right px-4 py-3">Return $</th>
              <th className="text-right px-4 py-3">Return %</th>
              <th className="text-left px-4 py-3">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(a => {
              const ret = (a.estimated_value ?? 0) - (a.purchase_price ?? 0)
              const retPct = (a.purchase_price ?? 0) > 0 ? ret / a.purchase_price : null
              return (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.location ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {a.purchase_date ? new Date(a.purchase_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{fmt(a.purchase_price)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {inlineEdit === a.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          className="w-24 border border-[#BD2FA7] rounded px-2 py-0.5 text-xs font-mono text-right focus:outline-none"
                          value={inlineValue}
                          onChange={e => setInlineValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(a.id); if (e.key === 'Escape') setInlineEdit(null) }}
                          autoFocus
                        />
                        <button onClick={() => handleInlineSave(a.id)} className="text-xs text-[#1D9E75] font-medium">✓</button>
                        <button onClick={() => setInlineEdit(null)} className="text-xs text-gray-400">✕</button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:underline text-gray-800"
                        onClick={() => { setInlineEdit(a.id); setInlineValue(String(a.estimated_value)) }}
                        title="Click to edit"
                      >
                        {fmt(a.estimated_value)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: ret >= 0 ? '#1D9E75' : '#D85A30' }}>{fmt(ret)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: (retPct ?? 0) >= 0 ? '#1D9E75' : '#D85A30' }}>{fmtPct(retPct)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{a.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200 font-medium text-sm">
              <td colSpan={3} className="px-4 py-3 text-gray-600">Total</td>
              <td className="px-4 py-3 text-right font-mono">{fmt(totals.cost)}</td>
              <td className="px-4 py-3 text-right font-mono">{fmt(totals.value)}</td>
              <td className="px-4 py-3 text-right font-mono" style={{ color: totalReturn >= 0 ? '#1D9E75' : '#D85A30' }}>{fmt(totalReturn)}</td>
              <td className="px-4 py-3 text-right font-mono" style={{ color: totalReturn >= 0 ? '#1D9E75' : '#D85A30' }}>
                {totals.cost > 0 ? fmtPct(totalReturn / totals.cost) : '—'}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No items.</p>}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add' ? 'Add Item' : 'Edit Item'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input className="input-field w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select className="input-field w-full" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  <option>Asset</option>
                  <option>Investment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Location</label>
                <input className="input-field w-full" value={form.location ?? ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Purchase Date</label>
                <input type="date" className="input-field w-full" value={form.purchase_date ?? ''} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} />
              </div>
              <div />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Purchase Price</label>
                <input type="number" className="input-field w-full font-mono" value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estimated Value</label>
                <input type="number" className="input-field w-full font-mono" value={form.estimated_value} onChange={e => setForm(p => ({ ...p, estimated_value: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea className="input-field w-full resize-none" rows={2} value={form.notes ?? ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#BD2FA7' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-field { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font-size: 14px; outline: none; }
        .input-field:focus { border-color: #BD2FA7; }
      `}</style>
    </div>
  )
}
