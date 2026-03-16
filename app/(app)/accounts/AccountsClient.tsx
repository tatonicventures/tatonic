'use client'

import { useState } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Account = {
  id: string
  institution: string
  account_name: string
  account_type: string
  balance: number
  last_updated: string | null
  notes: string | null
}

type Liability = {
  id: string
  name: string
  principal: number
  current_balance: number
  interest_rate: number | null
  term_years: number | null
  notes: string | null
}

const EMPTY_ACCOUNT: Omit<Account, 'id'> = {
  institution: '', account_name: '', account_type: 'Checking',
  balance: 0, last_updated: new Date().toISOString().split('T')[0], notes: '',
}

const EMPTY_LIABILITY: Omit<Liability, 'id'> = {
  name: '', principal: 0, current_balance: 0, interest_rate: null, term_years: null, notes: '',
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export default function AccountsClient({
  initialAccounts,
  initialLiabilities,
}: {
  initialAccounts: Account[]
  initialLiabilities: Liability[]
}) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [liabilities, setLiabilities] = useState(initialLiabilities)
  const [modal, setModal] = useState<null | 'add-account' | 'edit-account' | 'add-liability' | 'edit-liability'>(null)
  const [accountForm, setAccountForm] = useState<Omit<Account, 'id'>>(EMPTY_ACCOUNT)
  const [liabilityForm, setLiabilityForm] = useState<Omit<Liability, 'id'>>(EMPTY_LIABILITY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const totalCash = accounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const totalDebt = liabilities.reduce((s, l) => s + (l.current_balance ?? 0), 0)

  // ── Accounts CRUD ────────────────────────────────────────────────────────────
  function openAddAccount() { setAccountForm(EMPTY_ACCOUNT); setEditId(null); setModal('add-account') }
  function openEditAccount(a: Account) {
    setAccountForm({ institution: a.institution, account_name: a.account_name, account_type: a.account_type,
      balance: a.balance, last_updated: a.last_updated ?? '', notes: a.notes ?? '' })
    setEditId(a.id); setModal('edit-account')
  }

  async function saveAccount() {
    setSaving(true)
    const payload = { ...accountForm, balance: Number(accountForm.balance), last_updated: accountForm.last_updated || null }
    if (modal === 'add-account') {
      const { data } = await supabase.from('accounts').insert(payload).select().single()
      if (data) setAccounts(p => [...p, data].sort((a, b) => a.institution.localeCompare(b.institution)))
    } else if (editId) {
      const { data } = await supabase.from('accounts').update(payload).eq('id', editId).select().single()
      if (data) setAccounts(p => p.map(a => a.id === editId ? data : a))
    }
    setSaving(false); setModal(null); router.refresh()
  }

  async function deleteAccount(id: string) {
    if (!confirm('Delete this account?')) return
    await supabase.from('accounts').delete().eq('id', id)
    setAccounts(p => p.filter(a => a.id !== id))
  }

  // ── Liabilities CRUD ─────────────────────────────────────────────────────────
  function openAddLiability() { setLiabilityForm(EMPTY_LIABILITY); setEditId(null); setModal('add-liability') }
  function openEditLiability(l: Liability) {
    setLiabilityForm({ name: l.name, principal: l.principal, current_balance: l.current_balance,
      interest_rate: l.interest_rate, term_years: l.term_years, notes: l.notes ?? '' })
    setEditId(l.id); setModal('edit-liability')
  }

  async function saveLiability() {
    setSaving(true)
    const payload = {
      ...liabilityForm,
      principal: Number(liabilityForm.principal),
      current_balance: Number(liabilityForm.current_balance),
      interest_rate: liabilityForm.interest_rate ? Number(liabilityForm.interest_rate) : null,
      term_years: liabilityForm.term_years ? Number(liabilityForm.term_years) : null,
    }
    if (modal === 'add-liability') {
      const { data } = await supabase.from('liabilities').insert(payload).select().single()
      if (data) setLiabilities(p => [...p, data])
    } else if (editId) {
      const { data } = await supabase.from('liabilities').update(payload).eq('id', editId).select().single()
      if (data) setLiabilities(p => p.map(l => l.id === editId ? data : l))
    }
    setSaving(false); setModal(null); router.refresh()
  }

  async function deleteLiability(id: string) {
    if (!confirm('Delete this liability?')) return
    await supabase.from('liabilities').delete().eq('id', id)
    setLiabilities(p => p.filter(l => l.id !== id))
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Accounts</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Cash</div>
          <div className="text-3xl font-mono font-semibold text-gray-900">{fmtFull(totalCash)}</div>
          <div className="text-xs text-gray-400 mt-1">Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Debt</div>
          <div className="text-3xl font-mono font-semibold" style={{ color: '#D85A30' }}>{fmtFull(totalDebt)}</div>
          <div className="text-xs text-gray-400 mt-1">Across {liabilities.length} liabilit{liabilities.length !== 1 ? 'ies' : 'y'}</div>
        </div>
      </div>

      {/* ── Bank Accounts ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Bank Accounts</h2>
          <button onClick={openAddAccount}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#BD2FA7' }}>
            <Plus size={15} /> Add account
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left px-4 py-3">Institution</th>
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Last Updated</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{a.institution}</td>
                  <td className="px-4 py-3 text-gray-600">{a.account_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600">{a.account_type}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">{fmtFull(a.balance)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {a.last_updated ? new Date(a.last_updated + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{a.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEditAccount(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteAccount(a.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-medium text-sm">
                <td colSpan={3} className="px-4 py-3 text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-mono">{fmtFull(totalCash)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
          {accounts.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No accounts yet.</p>}
        </div>
      </div>

      {/* ── Liabilities ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Liabilities</h2>
          <button onClick={openAddLiability}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#BD2FA7' }}>
            <Plus size={15} /> Add liability
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-right px-4 py-3">Original Principal</th>
                <th className="text-right px-4 py-3">Current Balance</th>
                <th className="text-right px-4 py-3">Rate</th>
                <th className="text-right px-4 py-3">Term</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {liabilities.map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{l.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">{fmtFull(l.principal)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ color: '#D85A30' }}>{fmtFull(l.current_balance)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {l.interest_rate != null ? (l.interest_rate * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{l.term_years ? l.term_years + 'yr' : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{l.notes ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEditLiability(l)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteLiability(l.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-medium text-sm">
                <td className="px-4 py-3 text-gray-700">Total</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">
                  {fmtFull(liabilities.reduce((s, l) => s + l.principal, 0))}
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: '#D85A30' }}>{fmtFull(totalDebt)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
          {liabilities.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No liabilities yet.</p>}
        </div>
      </div>

      {/* ── Account Modal ── */}
      {(modal === 'add-account' || modal === 'edit-account') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add-account' ? 'Add Account' : 'Edit Account'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Institution', key: 'institution' },
                { label: 'Account Name', key: 'account_name' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input className="input w-full" value={(accountForm as Record<string, unknown>)[f.key] as string}
                    onChange={e => setAccountForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account Type</label>
                <select className="input w-full" value={accountForm.account_type}
                  onChange={e => setAccountForm(p => ({ ...p, account_type: e.target.value }))}>
                  <option>Checking</option><option>Savings</option>
                  <option>Brokerage</option><option>Money Market</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Balance</label>
                <input type="number" className="input w-full font-mono" value={accountForm.balance}
                  onChange={e => setAccountForm(p => ({ ...p, balance: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Updated</label>
                <input type="date" className="input w-full" value={accountForm.last_updated ?? ''}
                  onChange={e => setAccountForm(p => ({ ...p, last_updated: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input className="input w-full" value={accountForm.notes ?? ''}
                  onChange={e => setAccountForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveAccount} disabled={saving || !accountForm.institution} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#BD2FA7' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Liability Modal ── */}
      {(modal === 'add-liability' || modal === 'edit-liability') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">{modal === 'add-liability' ? 'Add Liability' : 'Edit Liability'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input className="input w-full" value={liabilityForm.name}
                  onChange={e => setLiabilityForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Original Principal</label>
                  <input type="number" className="input w-full font-mono" value={liabilityForm.principal}
                    onChange={e => setLiabilityForm(p => ({ ...p, principal: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Current Balance</label>
                  <input type="number" className="input w-full font-mono" value={liabilityForm.current_balance}
                    onChange={e => setLiabilityForm(p => ({ ...p, current_balance: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Interest Rate (e.g. 0.03)</label>
                  <input type="number" step="0.001" className="input w-full font-mono" value={liabilityForm.interest_rate ?? ''}
                    onChange={e => setLiabilityForm(p => ({ ...p, interest_rate: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Term (years)</label>
                  <input type="number" className="input w-full font-mono" value={liabilityForm.term_years ?? ''}
                    onChange={e => setLiabilityForm(p => ({ ...p, term_years: e.target.value ? Number(e.target.value) : null }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input className="input w-full" value={liabilityForm.notes ?? ''}
                  onChange={e => setLiabilityForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={saveLiability} disabled={saving || !liabilityForm.name} className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#BD2FA7' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; font-size: 14px; outline: none; width: 100%; }
        .input:focus { border-color: #BD2FA7; }
      `}</style>
    </div>
  )
}
