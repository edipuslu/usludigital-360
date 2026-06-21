import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Trash2, LogOut, X, AlertTriangle, ArrowUpRight, GitBranch, MapPin, Search, RefreshCw, ShieldCheck, KeyRound, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { deleteBackendCompany, getCompanies, saveBackendCompany, updateBackendCompany } from '../lib/backendApi'
import { UsluLoader } from '../components/ui/UIKit'
import clsx from 'clsx'

const emptyDaily = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, date: `Jun ${i + 1}`, clicks: 0, replies: 0 }))
const emptyHeatmap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
  day,
  hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, value: 0 })),
}))

export function createCompany({ name, industry }) {
  const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `company-${Date.now()}`
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${id}-${Date.now().toString(36)}`,
    name,
    slug: id,
    industry,
    clientEmail: '',
    clientName: '',
    clientPassword: '',
    status: 'needs_update',
    createdAt: new Date().toISOString(),
    initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO',
    accentColor: '#255ff4',
    platforms: {
      instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      tiktok: { connected: false, handle: null, followers: null, lastSync: null, error: null },
    },
    goal: 'push_to_whatsapp',
    whatsappLink: '',
    aiTraining: {
      status: 'needs_update',
      lastTrained: null,
      progress: 0,
      documents: [],
      websiteUrl: '',
      guardrails: true,
      fallbackMessage: 'For more info, please contact us directly.',
      description: '',
      tone: 'professional',
    },
    automation: {
      schedule: { enabled: true, startAt: '', endAt: '', timezone: 'Africa/Casablanca' },
      instagram: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
      facebook: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
      youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      whatsapp: { dmReply: true, commentReply: false, tone: 'professional', blacklist: [] },
      tiktok: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
    },
    metrics: {
      thisMonth: {
        totalReplies: 0,
        waClicks: 0,
        responseRate: 0,
        avgReplyTime: '—',
        change: { replies: 0, waClicks: 0, responseRate: 0, avgReplyTime: 0 },
      },
      byPlatform: [
        { platform: 'Instagram', replies: 0, waClicks: 0, color: '#f42582' },
        { platform: 'Facebook', replies: 0, waClicks: 0, color: '#255ff4' },
        { platform: 'YouTube', replies: 0, waClicks: 0, color: '#f42f25' },
        { platform: 'WhatsApp', replies: 0, waClicks: 0, color: '#25D366' },
      ],
      daily: emptyDaily,
      heatmap: emptyHeatmap,
      topPosts: [],
      funnel: { reached: 0, replied: 0, clickedWA: 0, converted: 0 },
    },
    reports: [],
    branches: [],
    notifications: [
      {
        id: `setup-${Date.now()}`,
        type: 'warning',
        message: 'Connect this company to its first platform.',
        time: 'Just now',
        read: false,
      },
    ],
    settings: {
      workspaceName: name,
      notificationEmail: 'admin@usludigital.com',
      timezone: 'Africa/Casablanca',
      adminAlerts: true,
      clientAlerts: true,
      monthlyReportEmail: true,
      spikeAlerts: true,
    },
  }
}

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function BranchModal({ company, onClose, onSave }) {
  const [branches, setBranches] = useState(company.branches || [])
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')

  const addBranch = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setBranches(current => [
      ...current,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `branch-${Date.now().toString(36)}`,
        name: trimmedName,
        location: location.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ])
    setName('')
    setLocation('')
  }

  const removeBranch = id => {
    setBranches(current => current.filter(branch => branch.id !== id))
  }

  const save = () => {
    onSave({
      ...company,
      branches,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-bold">Branches for {company.name}</div>
            <div className="text-slate-500 text-xs mt-0.5">Only admin can add or remove branches. Clients can only view and switch tabs.</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Branch Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Istanbul Branch" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className="input-field" placeholder="City or address" />
            </div>
            <div className="flex items-end">
              <button onClick={addBranch} disabled={!name.trim()} className={clsx('btn-primary h-[42px] justify-center', !name.trim() && 'opacity-50 cursor-not-allowed')}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {branches.length === 0 ? (
              <div className="py-10 text-center">
                <GitBranch size={28} className="text-slate-300 mx-auto mb-2" />
                <div className="text-slate-800 text-sm font-bold">No branches added</div>
                <div className="text-slate-400 text-xs mt-1">Add a branch here and it will appear in the company sidebar.</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {branches.map(branch => (
                  <div key={branch.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="text-slate-900 text-sm font-bold truncate">{branch.name}</div>
                      <div className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        <span className="truncate">{branch.location || 'No location added'}</span>
                      </div>
                    </div>
                    <button onClick={() => removeBranch(branch.id)} className="btn-danger px-3 py-2 flex-shrink-0">
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary">
            Save Branches
          </button>
        </div>
      </div>
    </div>
  )
}

export function normalizeCompany(company) {
  if (!company) return company
  return {
    ...company,
    clientEmail: company.clientEmail || '',
    clientName: company.clientName || '',
    clientPassword: company.clientPassword || '',
    platforms: {
      instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null, ...(company.platforms?.instagram || {}) },
      facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null, ...(company.platforms?.facebook || {}) },
      youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null, ...(company.platforms?.youtube || {}) },
      whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null, ...(company.platforms?.whatsapp || {}) },
      tiktok: { connected: false, handle: null, followers: null, lastSync: null, error: null, ...(company.platforms?.tiktok || {}) },
    },
    automation: {
      ...(company.automation || {}),
      schedule: { enabled: true, startAt: '', endAt: '', timezone: 'Africa/Casablanca', ...(company.automation?.schedule || {}) },
      instagram: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [], ...(company.automation?.instagram || {}) },
      facebook: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [], ...(company.automation?.facebook || {}) },
      youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [], ...(company.automation?.youtube || {}) },
      whatsapp: { dmReply: true, commentReply: false, tone: 'professional', blacklist: [], ...(company.automation?.whatsapp || {}) },
      tiktok: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [], ...(company.automation?.tiktok || {}) },
    },
    aiTraining: {
      status: 'needs_update',
      lastTrained: null,
      progress: 0,
      documents: [],
      websiteUrl: '',
      guardrails: true,
      fallbackMessage: 'For more info, please contact us directly.',
      description: '',
      tone: 'professional',
      ...(company.aiTraining || {}),
    },
    branches: company.branches || [],
    reports: company.reports || [],
    notifications: company.notifications || [],
    settings: {
      workspaceName: company.name || 'Workspace',
      notificationEmail: 'admin@usludigital.com',
      timezone: 'Africa/Casablanca',
      adminAlerts: true,
      clientAlerts: true,
      monthlyReportEmail: true,
      spikeAlerts: true,
      ...(company.settings || {}),
    },
  }
}

function CompanyModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-bold">New Company</div>
            <div className="text-slate-500 text-xs mt-0.5">Create the business first, then open its setup dashboard.</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Business name" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
            <input value={industry} onChange={e => setIndustry(e.target.value)} className="input-field" placeholder="Industry or category" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => name.trim() && onCreate({ name: name.trim(), industry: industry.trim() })}
            disabled={!name.trim()}
            className={clsx('btn-primary', !name.trim() && 'opacity-50 cursor-not-allowed')}
          >
            <Plus size={14} /> Create Company
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ company, onClose, onDelete }) {
  const [confirm, setConfirm] = useState('')
  const ready = confirm.trim() === 'DELETE'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-bold">Delete {company.name}</div>
            <div className="text-slate-500 text-xs mt-0.5">This removes its setup, reports, credentials, and notifications.</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 mt-0.5" />
            <div className="text-red-800 text-sm">To avoid deleting by mistake, type <strong>DELETE</strong> below.</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type DELETE to confirm</label>
            <input value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="DELETE" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button disabled={!ready} onClick={onDelete} className={clsx('btn-danger', !ready && 'opacity-50 cursor-not-allowed')}>
            <Trash2 size={14} /> Delete Company
          </button>
        </div>
      </div>
    </div>
  )
}

function AccessModal({ company, onClose, onSave }) {
  const [clientEmail, setClientEmail] = useState(company.clientEmail || '')
  const [clientName, setClientName] = useState(company.clientName || company.name || '')
  const [clientPassword, setClientPassword] = useState(company.clientPassword || '')
  const [showPassword, setShowPassword] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [copied, setCopied] = useState('')
  const hasAccess = Boolean(company.clientEmail || company.clientPassword)
  const canDelete = deleteConfirm.trim() === 'DELETE'

  const copyText = async (label, text) => {
    if (!text) return
    await navigator.clipboard?.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 1200)
  }

  const save = () => {
    onSave({
      ...company,
      clientEmail: clientEmail.trim(),
      clientName: clientName.trim(),
      clientPassword: clientPassword.trim(),
    })
  }

  const removeAccess = () => {
    if (!canDelete) return
    onSave({
      ...company,
      clientEmail: '',
      clientName: '',
      clientPassword: '',
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-slate-900 font-bold">Client Access for {company.name}</div>
            <div className="text-slate-500 text-xs mt-0.5">Create and view the login ID and password for this company.</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Company ID</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{company.id}</code>
              <button type="button" onClick={() => copyText('companyId', company.id)} className="btn-secondary px-3 py-2">
                {copied === 'companyId' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                Copy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client Name</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-field" placeholder="Client name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Login ID / Email</label>
              <div className="flex gap-2">
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="input-field flex-1" placeholder="client@company.com" />
                <button type="button" onClick={() => copyText('email', clientEmail)} className="btn-secondary px-3 py-2" disabled={!clientEmail}>
                  {copied === 'email' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <div className="relative">
                <input
                  value={clientPassword}
                  onChange={e => setClientPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Create a password"
                />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="button" onClick={() => setClientPassword(generatePassword())} className="btn-secondary justify-center">
                Generate
              </button>
              <button type="button" onClick={() => copyText('password', clientPassword)} className="btn-secondary justify-center" disabled={!clientPassword}>
                {copied === 'password' ? <CheckCircle2 size={14} /> : <Copy size={14} />} Copy
              </button>
              <button type="button" onClick={save} disabled={!clientEmail.trim() || !clientPassword.trim()} className={clsx('btn-primary justify-center', (!clientEmail.trim() || !clientPassword.trim()) && 'opacity-50 cursor-not-allowed')}>
                Save Access
              </button>
            </div>
          </div>

          {hasAccess && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 text-red-500" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-red-900">Delete client login access</div>
                  <div className="mt-1 text-xs text-red-700">To delete the login ID and password, type DELETE. This does not delete the company.</div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} className="input-field bg-white sm:max-w-xs" placeholder="DELETE" />
                    <button type="button" onClick={removeAccess} disabled={!canDelete} className={clsx('btn-danger justify-center', !canDelete && 'opacity-50 cursor-not-allowed')}>
                      <Trash2 size={14} /> Delete Access
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteCompany, setDeleteCompany] = useState(null)
  const [branchCompany, setBranchCompany] = useState(null)
  const [accessCompany, setAccessCompany] = useState(null)
  const [query, setQuery] = useState('')

  const loadFromBackend = async alive => {
    setLoading(true)
    getCompanies()
      .then(data => {
        if (alive === false) return
        const backendCompanies = Array.isArray(data.companies) ? data.companies.map(normalizeCompany) : []
        setCompanies(backendCompanies)
        setError('')
      })
      .catch(err => {
        if (alive === false) return
        setError(err.message || 'Could not load companies from backend.')
      })
      .finally(() => alive !== false && setLoading(false))
  }

  useEffect(() => {
    let alive = true
    loadFromBackend(alive)
    return () => {
      alive = false
    }
  }, [])

  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return companies
    return companies.filter(company => `${company.name} ${company.industry} ${company.clientEmail}`.toLowerCase().includes(term))
  }, [companies, query])

  const totals = useMemo(() => ({
    companies: companies.length,
    connected: companies.reduce((sum, company) => sum + Object.values(company.platforms).filter(p => p.connected).length, 0),
    branches: companies.reduce((sum, company) => sum + (company.branches?.length || 0), 0),
  }), [companies])

  const persist = next => {
    setCompanies(next)
  }

  const create = async payload => {
    const company = createCompany(payload)
    persist([company, ...companies])
    try {
      await saveBackendCompany(company)
      setError('')
    } catch (err) {
      setError(err.message || 'Company was saved on this device, but backend save failed.')
    }
    setShowCreate(false)
    window.sessionStorage.setItem('ud360_active_company_id', company.id)
    navigate('/company/home')
  }

  const remove = async () => {
    const next = companies.filter(c => c.id !== deleteCompany.id)
    persist(next)
    try {
      await deleteBackendCompany(deleteCompany.id)
      setError('')
    } catch (err) {
      setError(err.message || 'Company was removed on this device, but backend delete failed.')
    }
    setDeleteCompany(null)
  }

  const saveBranches = async company => {
    const next = companies.map(current => current.id === company.id ? company : current)
    persist(next)
    try {
      await updateBackendCompany(company, { allowBranchUpdate: true })
      setError('')
    } catch (err) {
      setError(err.message || 'Branches were saved on this device, but backend sync failed.')
    }
    setBranchCompany(null)
  }

  const saveAccess = async company => {
    const normalized = normalizeCompany(company)
    const next = companies.map(current => current.id === normalized.id ? normalized : current)
    persist(next)
    try {
      await updateBackendCompany(normalized, { allowBranchUpdate: true })
      setError('')
    } catch (err) {
      setError(err.message || 'Client access was saved on this device, but backend sync failed.')
    }
    setAccessCompany(null)
  }

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="flex min-h-[76px] items-center justify-between gap-4 px-8">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Admin Workspace</h1>
            <div className="mt-1 text-sm font-medium text-slate-500">{user?.email || 'admin@usludigital.com'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => loadFromBackend(true)} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {loading ? <UsluLoader size="xs" /> : <RefreshCw size={15} />} Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary h-11"><Plus size={14} /> New Company</button>
            <button onClick={signOut} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8 space-y-7 animate-fade-in">
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {error}
            </div>
          )}

          <section className="rounded-lg bg-slate-950 px-6 py-5 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                  <ShieldCheck size={16} />
                  Company control center
                </div>
                <h2 className="mt-2 text-2xl font-extrabold">Create companies, open dashboards, and manage branches.</h2>
              </div>
              <button onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-teal-500 px-6 text-sm font-bold text-slate-950 hover:bg-teal-400">
                Add company <ArrowUpRight size={16} />
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Companies</h2>
                <p className="mt-1 text-sm text-slate-500">Open one company to set up channels, AI, inbox, analytics, and reports.</p>
              </div>
              <div className="relative w-full max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  placeholder="Search companies"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <UsluLoader size="lg" className="mb-3" />
                <div className="text-lg font-bold text-slate-900">Loading companies...</div>
                <p className="mt-1 text-sm text-slate-500">Checking Supabase through the backend.</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 size={42} className="mx-auto mb-4 text-slate-300" />
                <div className="text-lg font-bold text-slate-900">{companies.length === 0 ? 'No companies yet' : 'No company found'}</div>
                <p className="mt-1 mb-5 text-sm text-slate-500">
                  {companies.length === 0 ? 'Create a company first. Then open it to connect social platforms and set up automation.' : 'Try a different search term.'}
                </p>
                {companies.length === 0 && <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto"><Plus size={14} /> New Company</button>}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredCompanies.map(company => {
                  const connected = Object.values(company.platforms).filter(p => p.connected).length
                  const branchCount = company.branches?.length || 0
                  return (
                    <div key={company.id} className="grid grid-cols-1 gap-4 px-5 py-5 transition-colors hover:bg-slate-50 lg:grid-cols-[1fr_150px_130px_190px_340px] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">{company.initials}</div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-950">{company.name}</div>
                          <div className="mt-0.5 truncate text-xs font-medium text-slate-500">{company.industry || 'No industry added'}</div>
                          <div className="mt-1 truncate text-[11px] font-semibold text-slate-400">ID: {company.id}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Channels</div>
                        <div className="mt-1 text-sm font-extrabold text-slate-900">{connected}/5 connected</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Branches</div>
                        <div className="mt-1 text-sm font-extrabold text-slate-900">{branchCount}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Client Access</div>
                        <div className="mt-1 min-w-0">
                          {company.clientEmail && company.clientPassword ? (
                            <>
                              <div className="truncate text-sm font-extrabold text-slate-900">{company.clientEmail}</div>
                              <div className="truncate text-xs font-semibold text-slate-400">Password saved</div>
                            </>
                          ) : (
                            <div className="text-sm font-extrabold text-amber-700">Not created</div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button onClick={() => {
                          window.sessionStorage.setItem('ud360_active_company_id', company.id)
                          navigate('/company/home')
                        }} className="btn-primary justify-center">
                          Open <ArrowUpRight size={14} />
                        </button>
                        <button onClick={() => setBranchCompany(company)} className="btn-secondary justify-center">
                          <GitBranch size={14} /> Branches
                        </button>
                        <button onClick={() => setAccessCompany(company)} className="btn-secondary justify-center">
                          <KeyRound size={14} /> Access
                        </button>
                        <button onClick={() => setDeleteCompany(company)} className="btn-danger">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
      </main>

      {showCreate && <CompanyModal onClose={() => setShowCreate(false)} onCreate={create} />}
      {deleteCompany && <DeleteModal company={deleteCompany} onClose={() => setDeleteCompany(null)} onDelete={remove} />}
      {branchCompany && <BranchModal company={branchCompany} onClose={() => setBranchCompany(null)} onSave={saveBranches} />}
      {accessCompany && <AccessModal company={accessCompany} onClose={() => setAccessCompany(null)} onSave={saveAccess} />}
    </div>
  )
}
