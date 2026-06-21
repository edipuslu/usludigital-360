import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bell, Settings, CheckCircle2, Save, Trash2, AlertCircle, GitBranch, MapPin, KeyRound, Eye, EyeOff } from 'lucide-react'
import Sidebar from '../components/layout/Sidebar'
import { PlatformIcon, UsluLoader } from '../components/ui/UIKit'
import { useAuth } from '../context/AuthContext'
import { normalizeCompany } from './AdminDashboard'
import { getBackendAiConfig, getCompanies, saveBackendAiConfig, updateBackendCompany } from '../lib/backendApi'
import OverviewTab from '../components/tabs/OverviewTab'
import PlatformsTab from '../components/tabs/PlatformsTab'
import InboxTab from '../components/tabs/InboxTab'
import AITrainingTab from '../components/tabs/AITrainingTab'
import AutomationTab from '../components/tabs/AutomationTab'
import AnalyticsTab from '../components/tabs/AnalyticsTab'
import ReportsTab from '../components/tabs/ReportsTab'
import GrowthTab from '../components/tabs/GrowthTab'
import clsx from 'clsx'

const SECTION_TO_TAB = {
  home: 'overview',
  overview: 'overview',
  inbox: 'inbox',
  'inbox-instagram': 'inbox-instagram',
  'inbox-facebook': 'inbox-facebook',
  'inbox-youtube': 'inbox-youtube',
  'inbox-whatsapp': 'inbox-whatsapp',
  growth: 'growth',
  'social-media-analytics': 'growth',
  'growth-instagram': 'growth-instagram',
  'growth-facebook': 'growth-facebook',
  'growth-youtube': 'growth-youtube',
  'growth-whatsapp': 'growth-whatsapp',
  'ai-training': 'ai-training',
  automation: 'automation',
  analytics: 'analytics',
  reports: 'reports',
  notifications: 'notifications',
  settings: 'settings',
}

const TAB_TO_SECTION = {
  overview: 'home',
  growth: 'social-media-analytics',
}

const UUID_SECTION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PLATFORM_DEFAULTS = {
  instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  tiktok: { connected: false, handle: null, followers: null, lastSync: null, error: null },
}

function tabFromSection(section) {
  return SECTION_TO_TAB[section || 'home'] || 'overview'
}

function sectionFromTab(tab) {
  return TAB_TO_SECTION[tab] || tab || 'home'
}

function NotificationsPanel({ notifications, onMarkAllRead, onRemove }) {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-slate-900 font-bold text-lg">Notifications</h2>
          <p className="text-slate-500 text-sm mt-0.5">Connection, AI, and report alerts appear here.</p>
        </div>
        <button onClick={onMarkAllRead} className="btn-primary">
          <CheckCircle2 size={14} /> Mark all read
        </button>
      </div>

      <div className="card p-5">
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell size={34} className="text-slate-300 mx-auto mb-3" />
            <div className="text-slate-700 font-semibold">No notifications</div>
            <div className="text-slate-400 text-sm mt-1">New alerts will show up as soon as something needs attention.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className={clsx(
                'flex items-start gap-3 p-4 rounded-xl border',
                n.read ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200',
                n.type === 'error' && !n.read && 'bg-red-50 border-red-200',
                n.type === 'success' && !n.read && 'bg-emerald-50 border-emerald-200',
                n.type === 'warning' && !n.read && 'bg-amber-50 border-amber-200'
              )}>
                {n.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className={clsx('mt-0.5 flex-shrink-0', n.type === 'error' ? 'text-red-500' : n.type === 'warning' ? 'text-amber-500' : 'text-blue-500')} />}
                <div className="flex-1 min-w-0">
                  <div className="text-slate-800 text-sm font-semibold">{n.message}</div>
                  <div className="text-slate-400 text-xs mt-1">{n.time}</div>
                </div>
                <button onClick={() => onRemove(n.id)} className="p-1.5 rounded-lg hover:bg-white/70 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SETTINGS_MAIN = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

const SETTINGS_CHANNELS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
]

function SettingsNavItem({ item, active, onClick, channel }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
        active ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      {channel ? <PlatformIcon platform={item.key} size={17} connected={true} /> : Icon ? <Icon size={16} className="text-slate-400" /> : null}
      <span className="truncate">{item.label}</span>
    </button>
  )
}

function PlaceholderSetting({ title, description, icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={22} />
      </div>
      <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

function ApiKeysSetting({ company, onNotify }) {
  const [key, setKey] = useState('')
  const [hasSavedKey, setHasSavedKey] = useState(Boolean(company?.hasOpenaiKey))
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [deleteText, setDeleteText] = useState('')

  useEffect(() => {
    let alive = true
    getBackendAiConfig(company.id)
      .then(config => {
        if (!alive) return
        setHasSavedKey(Boolean(config.hasOpenaiKey))
      })
      .catch(() => {
        if (!alive) return
        setHasSavedKey(Boolean(company?.hasOpenaiKey))
      })
    return () => {
      alive = false
    }
  }, [company?.id, company?.hasOpenaiKey])

  const saveKey = async () => {
    const trimmedKey = key.trim()
    if (!trimmedKey) {
      setStatus('Paste the OpenAI API key before saving.')
      return
    }
    setSaving(true)
    setStatus('')
    try {
      await saveBackendAiConfig(company, trimmedKey)
      setHasSavedKey(true)
      setKey('')
      onNotify?.('Shared OpenAI API key saved for all companies.', 'success')
      setStatus('Saved. This key is now used by every company workspace.')
    } catch (err) {
      setStatus(err.message || 'Could not save the API key.')
      onNotify?.(`OpenAI key save failed: ${err.message}`, 'warning')
    } finally {
      setSaving(false)
    }
  }

  const removeKey = async () => {
    if (deleteText !== 'DELETE') {
      setStatus('Type DELETE exactly before removing the shared key.')
      return
    }
    setSaving(true)
    setStatus('')
    try {
      await saveBackendAiConfig(company, '')
      setHasSavedKey(false)
      setDeleteText('')
      onNotify?.('Shared OpenAI API key removed.', 'success')
      setStatus('Removed. AI replies will stay off until a key is saved again.')
    } catch (err) {
      setStatus(err.message || 'Could not remove the API key.')
      onNotify?.(`OpenAI key removal failed: ${err.message}`, 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-slide-in">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">API Keys</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">One shared AI provider key is used across every company you manage.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <KeyRound size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-950">OpenAI</h3>
              <p className="text-sm font-medium text-slate-500">Used for AI comment replies, DM replies, and reply testing.</p>
            </div>
          </div>
          <span className={clsx('inline-flex w-fit rounded-full px-3 py-1 text-xs font-extrabold', hasSavedKey ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700')}>
            {hasSavedKey ? 'Connected' : 'Missing key'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_280px]">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Shared OpenAI API Key</label>
            <div className="flex gap-2">
              <input
                value={key}
                onChange={e => setKey(e.target.value)}
                type={showKey ? 'text' : 'password'}
                className="input-field"
                placeholder={hasSavedKey ? 'A key is already saved. Paste a new key to replace it.' : 'sk-...'}
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowKey(value => !value)} className="btn-secondary px-3" title={showKey ? 'Hide key' : 'Show key'}>
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Save it once here. New and existing companies will use the same provider key automatically.
            </p>
          </div>

          <div className="flex items-end">
            <button type="button" onClick={saveKey} disabled={saving || !key.trim()} className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <><UsluLoader size="xs" /> Saving</> : <><Save size={14} /> Save Key</>}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Remove shared key</label>
              <input
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                className="input-field"
                placeholder="Type DELETE to remove"
              />
            </div>
            <button type="button" onClick={removeKey} disabled={saving || deleteText !== 'DELETE'} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 size={14} /> Remove Key
            </button>
          </div>
          {status && <p className="mt-3 text-sm font-semibold text-slate-600">{status}</p>}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ company, settings, onSave, onUpdate, onNotify, isAdmin }) {
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [selected, setSelected] = useState('general')

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const save = async () => {
    onSave(form)
    setSaved(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaved(false)
  }

  const renderSelected = () => {
    if (SETTINGS_CHANNELS.some(item => item.key === selected)) {
      return (
        <PlatformsTab
          company={company}
          onUpdate={onUpdate}
          onNotify={onNotify}
          branchId={company.branchId || ''}
          selectedPlatform={selected}
          compact
        />
      )
    }

    if (selected === 'general') {
      return (
        <div className="animate-slide-in">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">General</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Workspace identity and default operating timezone.</p>
            </div>
            <button onClick={save} className="btn-primary">
              {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save</>}
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Workspace Name</label>
                <input value={form.workspaceName || ''} onChange={e => update('workspaceName', e.target.value)} className="input-field" placeholder="Workspace name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Timezone</label>
                <select value={form.timezone || 'Africa/Casablanca'} onChange={e => update('timezone', e.target.value)} className="input-field">
                  <option value="Africa/Casablanca">Africa/Casablanca</option>
                  <option value="Europe/Istanbul">Europe/Istanbul</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (selected === 'notifications') {
      return (
        <div className="animate-slide-in">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Notifications</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Choose which workspace alerts should be sent or shown.</p>
            </div>
            <button onClick={save} className="btn-primary">
              {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save</>}
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notification Email</label>
              <input value={form.notificationEmail || ''} onChange={e => update('notificationEmail', e.target.value)} className="input-field max-w-xl" placeholder="alerts@domain.com" />
            </div>
            <div className="divide-y divide-slate-200">
              {[
                ['adminAlerts', 'Admin alerts', 'AI failures, unknown answers, and connection drops'],
                ['clientAlerts', 'Client alerts', 'Monthly reports and unusual message spikes'],
                ['monthlyReportEmail', 'Monthly report email', 'Send the report automatically when it is ready'],
                ['spikeAlerts', 'Spike alerts', 'Notify when message volume rises unusually fast'],
              ].map(([key, label, desc]) => (
                <button key={key} onClick={() => update(key, !form[key])} className="flex w-full items-center justify-between gap-4 py-4 text-left">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
                  </div>
                  <div className={clsx('relative h-6 w-11 flex-shrink-0 rounded-full transition-colors', form[key] ? 'bg-blue-600' : 'bg-slate-200')}>
                    <div className={clsx('absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all', form[key] ? 'left-6' : 'left-1')} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (selected === 'api-keys') {
      return <ApiKeysSetting company={company} onNotify={onNotify} />
    }

    return <PlaceholderSetting title="Settings" description="Choose a settings section from the left." icon={Settings} />
  }

  return (
    <div className="animate-slide-in">
      <div className="-mx-8 -mt-8 border-b border-slate-200 bg-slate-50 px-8 py-7">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-8">
          <div>
            <div className="mb-3 px-3 text-base font-extrabold text-slate-950">Main</div>
            <div className="space-y-1">
              {SETTINGS_MAIN.map(item => (
                <SettingsNavItem key={item.key} item={item} active={selected === item.key} onClick={() => setSelected(item.key)} />
              ))}
            </div>
          </div>

          {isAdmin && (
            <div>
              <div className="mb-3 px-3 text-base font-extrabold text-slate-950">Admin</div>
              <SettingsNavItem item={{ key: 'api-keys', label: 'API Keys', icon: KeyRound }} active={selected === 'api-keys'} onClick={() => setSelected('api-keys')} />
            </div>
          )}

          <div>
            <div className="mb-3 px-3 text-base font-extrabold text-slate-950">Channels</div>
            <div className="space-y-1">
              {SETTINGS_CHANNELS.map(item => (
                <SettingsNavItem key={item.key} item={item} channel active={selected === item.key} onClick={() => setSelected(item.key)} />
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          {renderSelected()}
        </section>
      </div>
    </div>
  )
}

export default function CompanyWorkspace() {
  const { section } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState('')
  const [activeBranchId, setActiveBranchId] = useState('all')
  const activeTab = tabFromSection(section)
  const selectedCompanyId = isAdmin
    ? window.sessionStorage.getItem('ud360_active_company_id')
    : user?.companyId || window.sessionStorage.getItem('ud360_active_company_id')

  useEffect(() => {
    let alive = true
    getCompanies()
      .then(data => {
        if (!alive) return
        const backendCompanies = Array.isArray(data.companies) ? data.companies.map(normalizeCompany) : []
        setWorkspaces(backendCompanies)
        setSyncError('')
      })
      .catch(err => {
        if (!alive) return
        setSyncError(err.message || 'Could not sync this company with the backend.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const company = useMemo(() => workspaces.find(c => c.id === selectedCompanyId) || workspaces[0], [selectedCompanyId, workspaces])
  const branches = company?.branches || []
  const activeBranch = branches.find(branch => branch.id === activeBranchId)
  const scopedCompany = useMemo(() => {
    if (!activeBranch) return company
    return {
      ...company,
      branchId: activeBranch.id,
      branchName: activeBranch.name,
      branchLocation: activeBranch.location || '',
      platforms: {
        ...PLATFORM_DEFAULTS,
        ...(activeBranch.platforms || {}),
      },
      whatsappLink: activeBranch.whatsappLink || company.whatsappLink,
    }
  }, [company, activeBranch])

  useEffect(() => {
    if (!section) {
      navigate('/company/home', { replace: true })
      return
    }
    if (UUID_SECTION_PATTERN.test(section)) {
      window.sessionStorage.setItem('ud360_active_company_id', section)
      navigate('/company/home', { replace: true })
      return
    }
    if (loading) return
    if (!section || !SECTION_TO_TAB[section]) {
      const legacyCompany = workspaces.find(c => c.id === section)
      if (legacyCompany) {
        window.sessionStorage.setItem('ud360_active_company_id', legacyCompany.id)
      }
      navigate('/company/home', { replace: true })
    }
  }, [section, workspaces, loading, navigate])

  const navigateToTab = tab => {
    navigate(`/company/${sectionFromTab(tab)}`)
  }

  useEffect(() => {
    if (activeBranchId !== 'all' && company && !branches.some(branch => branch.id === activeBranchId)) {
      setActiveBranchId('all')
    }
  }, [activeBranchId, company, branches])

  const changeBranch = branchId => {
    const nextBranchId = branchId || 'all'
    setActiveBranchId(nextBranchId)
    window.sessionStorage.setItem(`ud360_active_branch_id:${company.id}`, nextBranchId)
  }

  useEffect(() => {
    if (!company?.id) return
    const savedBranchId = window.sessionStorage.getItem(`ud360_active_branch_id:${company.id}`)
    if (savedBranchId && savedBranchId !== activeBranchId) {
      setActiveBranchId(savedBranchId)
    }
  }, [company?.id])

  const updateCompany = updater => {
    setWorkspaces(prev => {
      const current = prev.find(c => c.id === company.id) || prev[0]
      const nextCompany = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      const next = prev.map(c => c.id === current.id ? nextCompany : c)
      const { branches: _branches, ...companyWithoutBranches } = nextCompany
      updateBackendCompany(companyWithoutBranches)
        .then(() => setSyncError(''))
        .catch(err => setSyncError(err.message || 'Saved locally, but backend sync failed.'))
      return next
    })
  }

  const updateScopedCompany = updater => {
    if (!activeBranch) return updateCompany(updater)
    setWorkspaces(prev => {
      const current = prev.find(c => c.id === company.id) || prev[0]
      const currentBranch = (current.branches || []).find(branch => branch.id === activeBranch.id) || activeBranch
      const currentScoped = {
        ...current,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        branchLocation: currentBranch.location || '',
        platforms: { ...PLATFORM_DEFAULTS, ...(currentBranch.platforms || {}) },
        whatsappLink: currentBranch.whatsappLink || current.whatsappLink,
      }
      const nextScoped = typeof updater === 'function' ? updater(currentScoped) : { ...currentScoped, ...updater }
      const nextBranches = (current.branches || []).map(branch => branch.id === currentBranch.id ? {
        ...branch,
        platforms: nextScoped.platforms || branch.platforms || {},
        whatsappLink: nextScoped.whatsappLink || branch.whatsappLink || '',
        updatedAt: new Date().toISOString(),
      } : branch)
      const nextCompany = { ...current, branches: nextBranches }
      const next = prev.map(c => c.id === current.id ? nextCompany : c)
      updateBackendCompany(nextCompany, { allowBranchUpdate: true })
        .then(() => setSyncError(''))
        .catch(err => setSyncError(err.message || 'Saved locally, but branch backend sync failed.'))
      return next
    })
  }

  const addNotification = (message, type = 'success') => {
    updateCompany(current => ({
      ...current,
      notifications: [
        { id: `${Date.now()}`, message, type, time: 'Just now', read: false },
        ...(current.notifications || []),
      ],
    }))
  }

  if (loading && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <UsluLoader size="lg" className="mb-4" />
          <div className="text-slate-900 font-bold text-xl mb-2">Loading workspace...</div>
          <div className="text-slate-500 text-sm">Checking the shared backend data.</div>
        </div>
      </div>
    )
  }

  if (!company && isAdmin) {
    navigate('/admin')
    return null
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-slate-900 font-bold text-xl mb-2">Workspace not found</div>
          <button onClick={() => navigate('/admin')} className="btn-primary mx-auto">Back to Companies</button>
        </div>
      </div>
    )
  }

  if (!isAdmin && user?.companyId && company?.id !== user.companyId) {
    navigate('/login')
    return null
  }

  const tabContent = {
    overview: <OverviewTab company={scopedCompany} onNavigate={navigateToTab} isAdmin={isAdmin} />,
    inbox: <InboxTab company={scopedCompany} branchId={activeBranch?.id || ''} onNotify={addNotification} isAdmin={isAdmin} />,
    'inbox-instagram': <InboxTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="instagram" onNotify={addNotification} isAdmin={isAdmin} />,
    'inbox-facebook': <InboxTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="facebook" onNotify={addNotification} isAdmin={isAdmin} />,
    'inbox-youtube': <InboxTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="youtube" onNotify={addNotification} isAdmin={isAdmin} />,
    'inbox-whatsapp': <InboxTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="whatsapp" onNotify={addNotification} isAdmin={isAdmin} />,
    growth: <GrowthTab company={scopedCompany} branchId={activeBranch?.id || ''} isAdmin={isAdmin} />,
    'growth-instagram': <GrowthTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="instagram" isAdmin={isAdmin} />,
    'growth-facebook': <GrowthTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="facebook" isAdmin={isAdmin} />,
    'growth-youtube': <GrowthTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="youtube" isAdmin={isAdmin} />,
    'growth-whatsapp': <GrowthTab company={scopedCompany} branchId={activeBranch?.id || ''} platform="whatsapp" isAdmin={isAdmin} />,
    'ai-training': <AITrainingTab company={company} onUpdate={updateCompany} onNotify={addNotification} isAdmin={isAdmin} />,
    automation: <AutomationTab company={company} onUpdate={updateCompany} onNotify={addNotification} />,
    analytics: <AnalyticsTab company={company} />,
    reports: <ReportsTab company={company} isAdmin={isAdmin} onUpdate={updateCompany} onNotify={addNotification} />,
    notifications: (
      <NotificationsPanel
        notifications={company.notifications || []}
        onMarkAllRead={() => updateCompany(c => ({ ...c, notifications: (c.notifications || []).map(n => ({ ...n, read: true })) }))}
        onRemove={id => updateCompany(c => ({ ...c, notifications: (c.notifications || []).filter(n => n.id !== id) }))}
      />
    ),
    settings: (
      <SettingsPanel
        company={scopedCompany}
        settings={company.settings || {}}
        onUpdate={activeBranch ? updateScopedCompany : updateCompany}
        onNotify={addNotification}
        isAdmin={isAdmin}
        onSave={settings => {
          updateCompany(c => ({ ...c, name: settings.workspaceName || c.name, settings }))
          addNotification('Settings saved successfully.', 'success')
        }}
      />
    ),
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        companyId={company.id}
        companyName={company.name}
        companyInitials={company.initials}
        currentSection={activeTab}
        onNavigate={navigateToTab}
        notificationCount={(company.notifications || []).filter(n => !n.read).length}
        branches={branches}
        activeBranchId={activeBranchId}
        onBranchChange={changeBranch}
      />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Tab Content */}
        <main className="flex-1 p-8 animate-fade-in" key={activeTab}>
          {syncError && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {syncError}
            </div>
          )}
          {activeTab !== 'overview' && branches.length > 0 && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <GitBranch size={15} className="text-slate-400" />
                  {activeBranch ? activeBranch.name : 'All branches'}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={11} className="text-slate-400" />
                  <span className="truncate">{activeBranch?.location || 'Viewing company-wide information'}</span>
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-400">
                Active branch
              </div>
            </div>
          )}
          {tabContent[activeTab]}
        </main>
      </div>
    </div>
  )
}
