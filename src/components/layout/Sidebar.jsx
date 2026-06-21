import {
  LayoutDashboard, BarChart3, Brain, FileText,
  Bell, Settings, LogOut, Zap, Globe, ArrowLeft, Inbox, TrendingUp,
  GitBranch, MapPin,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const MAIN_NAV = [
  { icon: LayoutDashboard, label: 'Home', key: 'overview', roles: ['admin', 'client'] },
  { icon: Globe, label: 'Platforms', key: 'platforms', roles: ['admin'] },
  { icon: Inbox, label: 'Inbox', key: 'inbox', roles: ['admin', 'client'] },
  { icon: TrendingUp, label: 'Social Media Analytics', key: 'growth', roles: ['admin', 'client'] },
  { icon: Brain, label: 'AI Training', key: 'ai-training', roles: ['admin'] },
  { icon: Zap, label: 'Automation', key: 'automation', roles: ['admin'] },
  { icon: BarChart3, label: 'Analytics', key: 'analytics', roles: ['admin', 'client'] },
  { icon: FileText, label: 'Reports', key: 'reports', roles: ['admin', 'client'] },
]

const ACCOUNT_NAV = [
  { icon: Bell, label: 'Notifications', key: 'notifications' },
  { icon: Settings, label: 'Settings', key: 'settings' },
]

const INBOX_NAV = [
  { label: 'All chats', key: 'inbox' },
  { label: 'Instagram Inbox', key: 'inbox-instagram' },
  { label: 'Facebook Inbox', key: 'inbox-facebook' },
  { label: 'YouTube Inbox', key: 'inbox-youtube' },
  { label: 'WhatsApp Inbox', key: 'inbox-whatsapp' },
]

function isActive(currentSection, key) {
  if (key === 'inbox') return currentSection === 'inbox' || currentSection?.startsWith('inbox-')
  if (key === 'growth') return currentSection === 'growth' || currentSection?.startsWith('growth-')
  return currentSection === key
}

function IconButton({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={clsx(
        'relative h-11 w-11 rounded-lg flex items-center justify-center cursor-pointer transition-colors',
        active ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon size={21} />
      {badge != null && (
        <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-4 text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function TextNavItem({ label, active, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors',
        active ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <span className="truncate">{label}</span>
      {badge != null && <span className="text-xs text-slate-400">{badge}</span>}
    </button>
  )
}

function currentMainItem(currentSection, items) {
  return items.find(item => isActive(currentSection, item.key)) || items[0]
}

function currentSidebarItem(currentSection, mainItems) {
  return ACCOUNT_NAV.find(item => item.key === currentSection) || currentMainItem(currentSection, mainItems)
}

export default function Sidebar({
  companyName,
  onNavigate,
  currentSection,
  notificationCount = 0,
  branches = [],
  activeBranchId = 'all',
  onBranchChange,
}) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.email === 'admin@usludigital.com' ? 'admin' : 'client'
  const mainItems = MAIN_NAV.filter(item => item.roles.includes(role))
  const selected = currentSidebarItem(currentSection, mainItems)
  const showInboxMenu = selected?.key === 'inbox'
  const showBranchMenu = branches.length > 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sticky top-0 flex h-screen flex-shrink-0 border-r border-slate-200 bg-white">
      <div className="flex w-[76px] flex-col items-center border-r border-slate-200 bg-white">
        <div className="flex h-[72px] w-full items-center justify-center border-b border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Zap size={20} fill="white" />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 py-4">
          {isAdmin && (
            <IconButton
              icon={ArrowLeft}
              label="Back to Companies"
              active={false}
              onClick={() => navigate('/admin')}
            />
          )}
          {mainItems.map(item => (
            <IconButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={isActive(currentSection, item.key)}
              onClick={() => onNavigate?.(item.key)}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-slate-200 py-4">
          {ACCOUNT_NAV.map(item => (
            <IconButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              badge={item.key === 'notifications' ? notificationCount || null : null}
              active={currentSection === item.key}
              onClick={() => onNavigate?.(item.key)}
            />
          ))}
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="mt-2 h-11 w-11 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer transition-colors"
          >
            <LogOut size={20} />
          </button>
          <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {user?.avatar || 'U'}
          </div>
        </div>
      </div>

      <div className="hidden w-[280px] flex-col bg-slate-50/70 px-6 py-7 lg:flex">
        <div className={clsx('mb-6', !showInboxMenu && !showBranchMenu && 'mb-0')}>
          <div className="truncate text-3xl font-extrabold tracking-tight text-slate-950">
            {selected?.label || 'Dashboard'}
          </div>
          {companyName && (
            <div className="mt-1 truncate text-xs font-semibold text-slate-400">{companyName}</div>
          )}
        </div>

        {showInboxMenu && (
          <div className="mb-7 space-y-1">
            {INBOX_NAV.map(item => (
              <TextNavItem
                key={item.key}
                label={item.label}
                active={currentSection === item.key}
                onClick={() => onNavigate?.(item.key)}
              />
            ))}
          </div>
        )}

        {showBranchMenu && (
          <div className="border-t border-slate-200 pt-5">
            <div className="mb-3 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
              <GitBranch size={13} />
              Branches
            </div>
            <div className="space-y-1">
              <TextNavItem
                label="All branches"
                active={activeBranchId === 'all'}
                onClick={() => onBranchChange?.('all')}
                badge={branches.length}
              />
              {branches.map(branch => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => onBranchChange?.(branch.id)}
                  className={clsx(
                    'w-full rounded-lg px-3 py-2.5 text-left cursor-pointer transition-colors',
                    activeBranchId === branch.id ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="truncate text-sm font-semibold">{branch.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={10} />
                    <span className="truncate">{branch.location || 'No location'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
