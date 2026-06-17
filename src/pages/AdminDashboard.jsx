import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Trash2, LogOut, Zap, X, AlertTriangle, ArrowUpRight, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { deleteBackendCompany, getCompanies, saveBackendCompany } from '../lib/backendApi'
import clsx from 'clsx'

const STORAGE_KEY = 'ud360_companies_v2'

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
    status: 'needs_update',
    createdAt: new Date().toISOString(),
    initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO',
    accentColor: '#2563EB',
    platforms: {
      instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null },
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
      instagram: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      facebook: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      whatsapp: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
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
        { platform: 'Instagram', replies: 0, waClicks: 0, color: '#E1306C' },
        { platform: 'Facebook', replies: 0, waClicks: 0, color: '#1877F2' },
        { platform: 'YouTube', replies: 0, waClicks: 0, color: '#FF0000' },
        { platform: 'WhatsApp', replies: 0, waClicks: 0, color: '#25D366' },
      ],
      daily: emptyDaily,
      heatmap: emptyHeatmap,
      topPosts: [],
      funnel: { reached: 0, replied: 0, clickedWA: 0, converted: 0 },
    },
    reports: [],
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

export function loadCompanies() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCompanies(companies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [companies, setCompanies] = useState(loadCompanies)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleteCompany, setDeleteCompany] = useState(null)

  useEffect(() => {
    let alive = true
    getCompanies()
      .then(data => {
        if (!alive) return
        setCompanies(data.companies || [])
        saveCompanies(data.companies || [])
        setError('')
      })
      .catch(err => {
        if (!alive) return
        setError(err.message || 'Could not load companies from backend.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const totals = useMemo(() => ({
    companies: companies.length,
    connected: companies.reduce((sum, company) => sum + Object.values(company.platforms).filter(p => p.connected).length, 0),
  }), [companies])

  const persist = next => {
    setCompanies(next)
    saveCompanies(next)
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
    navigate(`/company/${company.id}`)
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

  const signOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className="w-[240px] h-screen sticky top-0 flex-shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, #07091A 0%, #060812 100%)' }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-glow-blue">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <div className="overflow-hidden">
            <div className="text-white font-bold text-base leading-tight tracking-tight">Usludigital</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">360</span>
              <span className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">Admin</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pt-2">
          <div className="px-4 mb-1 mt-3">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Admin Workspace</span>
          </div>
          <button className="w-full flex items-center gap-3 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 relative group px-3 py-2.5 bg-blue-600/20 text-white">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-full" />
            <LayoutDashboard size={16} className="text-blue-400" />
            <span className="flex-1 text-left">Companies</span>
          </button>
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.avatar || 'UA'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">Admin Workspace</div>
              <div className="text-slate-500 text-xs truncate">{user?.email || 'admin@usludigital.com'}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs font-medium cursor-pointer transition-colors rounded-lg hover:bg-red-500/10 px-2 py-1.5 w-full"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <Zap size={11} className="text-blue-500" />
              <span>Usludigital 360</span>
              <span>/</span>
              <span className="text-slate-600 font-medium">Admin Workspace</span>
            </div>
            <h1 className="text-slate-900 text-xl font-bold">Companies</h1>
            <div className="text-slate-500 text-sm mt-0.5">Add companies here. Open a company to set up its platforms and automation.</div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} /> New Company</button>
        </header>

        <main className="flex-1 p-8 space-y-6 animate-fade-in">
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-slate-500 text-sm">Companies</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">{totals.companies}</div>
            </div>
            <div className="card p-5">
              <div className="text-slate-500 text-sm">Connected Platforms</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">{totals.connected}</div>
            </div>
            <div className="card p-5">
              <div className="text-slate-500 text-sm">Admin Role</div>
              <div className="text-lg font-bold text-slate-900 mt-3">Manage companies only</div>
            </div>
          </div>

          {loading ? (
            <div className="card p-12 text-center">
              <div className="text-slate-900 font-bold text-lg">Loading companies...</div>
              <p className="text-slate-500 text-sm mt-1">Checking the shared backend workspace.</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="card p-12 text-center">
              <Building2 size={42} className="text-slate-300 mx-auto mb-4" />
              <div className="text-slate-900 font-bold text-lg">No companies yet</div>
              <p className="text-slate-500 text-sm mt-1 mb-5">Create a company first. Then open it to connect social platforms and set up automation.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto"><Plus size={14} /> New Company</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {companies.map(company => {
                const connected = Object.values(company.platforms).filter(p => p.connected).length
                return (
                  <div key={company.id} className="card card-hover p-5">
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold">{company.initials}</div>
                        <div>
                          <div className="text-slate-900 font-bold text-sm">{company.name}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{company.industry || 'No industry added'}</div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">{connected}/4 connected</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-400 text-xs">AI Training</div>
                        <div className="text-slate-900 font-bold text-sm capitalize mt-1">{company.aiTraining.status.replace('_', ' ')}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-400 text-xs">Reports</div>
                        <div className="text-slate-900 font-bold text-sm mt-1">{company.reports.length}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/company/${company.id}`)} className="btn-primary flex-1 justify-center">
                        Open <ArrowUpRight size={14} />
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
        </main>
      </div>

      {showCreate && <CompanyModal onClose={() => setShowCreate(false)} onCreate={create} />}
      {deleteCompany && <DeleteModal company={deleteCompany} onClose={() => setDeleteCompany(null)} onDelete={remove} />}
    </div>
  )
}
