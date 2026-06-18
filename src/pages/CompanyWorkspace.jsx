import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bell, Settings, ChevronRight, Zap, ExternalLink, CheckCircle2, Mail, Clock, Save, Trash2, AlertCircle } from 'lucide-react'
import Sidebar from '../components/layout/Sidebar'
import { StatusBadge } from '../components/ui/UIKit'
import { useAuth } from '../context/AuthContext'
import { loadCompanies, saveCompanies } from './AdminDashboard'
import { getCompanies, updateBackendCompany } from '../lib/backendApi'
import OverviewTab from '../components/tabs/OverviewTab'
import PlatformsTab from '../components/tabs/PlatformsTab'
import InboxTab from '../components/tabs/InboxTab'
import AITrainingTab from '../components/tabs/AITrainingTab'
import AutomationTab from '../components/tabs/AutomationTab'
import AnalyticsTab from '../components/tabs/AnalyticsTab'
import ReportsTab from '../components/tabs/ReportsTab'
import GrowthTab from '../components/tabs/GrowthTab'
import clsx from 'clsx'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'ai-training', label: 'AI Training' },
  { key: 'automation', label: 'Automation' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'reports', label: 'Reports' },
]

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

function SettingsPanel({ settings, onSave }) {
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const save = async () => {
    onSave(form)
    setSaved(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaved(false)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-slate-900 font-bold text-lg">Settings</h2>
          <p className="text-slate-500 text-sm mt-0.5">Control workspace identity, alerts, and report delivery.</p>
        </div>
        <button onClick={save} className="btn-primary">
          {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Settings</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <h3 className="text-slate-900 font-bold text-base flex items-center gap-2"><Settings size={15} className="text-slate-400" /> Workspace</h3>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Workspace Name</label>
            <input value={form.workspaceName || ''} onChange={e => update('workspaceName', e.target.value)} className="input-field" placeholder="Workspace name" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Timezone</label>
            <select value={form.timezone || 'Africa/Casablanca'} onChange={e => update('timezone', e.target.value)} className="input-field">
              <option value="Africa/Casablanca">Africa/Casablanca</option>
              <option value="Europe/Istanbul">Europe/Istanbul</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="text-slate-900 font-bold text-base flex items-center gap-2"><Mail size={15} className="text-slate-400" /> Notifications</h3>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notification Email</label>
            <input value={form.notificationEmail || ''} onChange={e => update('notificationEmail', e.target.value)} className="input-field" placeholder="alerts@domain.com" />
          </div>
          {[
            ['adminAlerts', 'Admin alerts', 'AI failures, unknown answers, and connection drops'],
            ['clientAlerts', 'Client alerts', 'Monthly reports and unusual message spikes'],
            ['monthlyReportEmail', 'Monthly report email', 'Send the report automatically when it is ready'],
            ['spikeAlerts', 'Spike alerts', 'Notify when message volume rises unusually fast'],
          ].map(([key, label, desc]) => (
            <button key={key} onClick={() => update(key, !form[key])} className="w-full flex items-center justify-between gap-4 text-left">
              <div>
                <div className="text-slate-800 text-sm font-semibold">{label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
              </div>
              <div className={clsx('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', form[key] ? 'bg-blue-600' : 'bg-slate-200')}>
                <div className={clsx('absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all', form[key] ? 'left-6' : 'left-1')} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5 bg-slate-900 text-white">
        <div className="flex items-center gap-2 mb-2"><Clock size={15} className="text-blue-300" /><span className="font-bold text-sm">What settings do now</span></div>
        <p className="text-slate-300 text-sm leading-relaxed">
          Saved settings update this workspace immediately and control which alerts appear in Notifications. When the backend is connected, these same values are ready to send to the API.
        </p>
      </div>
    </div>
  )
}

export default function CompanyWorkspace() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [workspaces, setWorkspaces] = useState(() => {
    return loadCompanies()
  })
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    let alive = true
    getCompanies()
      .then(data => {
        if (!alive) return
        setWorkspaces(data.companies || [])
        saveCompanies(data.companies || [])
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

  const company = useMemo(() => workspaces.find(c => c.id === companyId) || workspaces[0], [companyId, workspaces])
  const updateCompany = updater => {
    setWorkspaces(prev => {
      const current = prev.find(c => c.id === company.id) || prev[0]
      const nextCompany = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      const next = prev.map(c => c.id === current.id ? nextCompany : c)
      saveCompanies(next)
      updateBackendCompany(nextCompany)
        .then(() => setSyncError(''))
        .catch(err => setSyncError(err.message || 'Saved locally, but backend sync failed.'))
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

  if (!isAdmin && user?.companyId !== companyId) {
    navigate('/login')
    return null
  }

  const platformMap = {
    'growth-instagram': 'instagram',
    'growth-facebook': 'facebook',
    'growth-youtube': 'youtube',
    'growth-whatsapp': 'whatsapp',
  }

  const tabContent = {
    overview: <OverviewTab company={company} onNavigate={setActiveTab} />,
    platforms: <PlatformsTab company={company} onUpdate={updateCompany} onNotify={addNotification} />,
    inbox: <InboxTab company={company} onNotify={addNotification} />,
    growth: <GrowthTab company={company} />,
    'growth-instagram': <GrowthTab company={company} platform="instagram" />,
    'growth-facebook': <GrowthTab company={company} platform="facebook" />,
    'growth-youtube': <GrowthTab company={company} platform="youtube" />,
    'growth-whatsapp': <GrowthTab company={company} platform="whatsapp" />,
    'ai-training': <AITrainingTab company={company} onUpdate={updateCompany} onNotify={addNotification} />,
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
        settings={company.settings || {}}
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
        currentSection={activeTab}
        onNavigate={setActiveTab}
        notificationCount={(company.notifications || []).filter(n => !n.read).length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <Zap size={11} className="text-blue-500" />
              <span>Usludigital 360</span>
              {isAdmin && (
                <>
                  <ChevronRight size={11} />
                  <button onClick={() => navigate('/admin')} className="hover:text-blue-600 cursor-pointer transition-colors">Companies</button>
                </>
              )}
              <ChevronRight size={11} />
              <span className="text-slate-600 font-medium">{company.name}</span>
              <ChevronRight size={11} />
              <span className="text-slate-600 font-medium capitalize">{activeTab.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-slate-900 text-xl font-bold">{company.name}</h1>
              <StatusBadge status={company.status} />
              <span className="text-slate-400 text-sm hidden sm:block">{company.industry}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab('notifications')} className="relative p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
              <Bell size={18} className="text-slate-500" />
              {(company.notifications || []).some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {company.aiTraining.websiteUrl && <a
              href={`https://${company.aiTraining.websiteUrl.replace('https://', '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <ExternalLink size={14} />
              Visit Site
            </a>}
            {isAdmin && (
              <button onClick={() => setActiveTab('settings')} className="btn-secondary">
                <Settings size={14} />
                Settings
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-8">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-4 py-3.5 text-sm font-semibold border-b-2 cursor-pointer transition-all duration-150 -mb-px',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <main className="flex-1 p-8 animate-fade-in" key={activeTab}>
          {syncError && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {syncError}
            </div>
          )}
          {tabContent[activeTab]}
        </main>
      </div>
    </div>
  )
}
