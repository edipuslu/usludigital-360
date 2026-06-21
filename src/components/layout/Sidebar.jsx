import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, BarChart3, Brain, FileText,
  Bell, Settings, LogOut, Zap, ArrowLeft, Inbox, TrendingUp,
  GitBranch, MapPin,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const MAIN_NAV = [
  { icon: LayoutDashboard, label: 'Home', key: 'overview', roles: ['admin', 'client'] },
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
      aria-label={label}
      className={clsx(
        'group relative h-11 w-11 rounded-lg flex items-center justify-center cursor-pointer transition-colors',
        active ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon size={21} />
      <span className="pointer-events-none absolute left-[58px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
        {label}
      </span>
      {badge != null && (
        <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-4 text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({
  onNavigate,
  currentSection,
  notificationCount = 0,
  companyName = 'Workspace',
  companyInitials = 'CO',
  branches = [],
  activeBranchId = 'all',
  onBranchChange,
}) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const branchMenuRef = useRef(null)
  const role = user?.email === 'admin@usludigital.com' ? 'admin' : 'client'
  const mainItems = MAIN_NAV.filter(item => item.roles.includes(role))

  useEffect(() => {
    if (!branchMenuOpen) return
    const handlePointerDown = event => {
      if (branchMenuRef.current && !branchMenuRef.current.contains(event.target)) {
        setBranchMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [branchMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sticky top-0 z-30 flex h-screen w-[76px] flex-shrink-0 flex-col items-center border-r border-slate-200 bg-white">
        <div className="flex h-[72px] w-full items-center justify-center border-b border-slate-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Zap size={20} fill="white" />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 py-4">
          <div ref={branchMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setBranchMenuOpen(open => !open)}
                aria-label="View branches"
                className={clsx(
                  'group relative flex h-11 w-11 items-center justify-center rounded-lg cursor-pointer transition-colors',
                  branchMenuOpen ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <GitBranch size={21} />
                <span className="pointer-events-none absolute left-[58px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  Branches
                </span>
                {branches.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-4 text-white">
                    {branches.length}
                  </span>
                )}
              </button>

              {branchMenuOpen && (
                <div className="absolute left-[58px] top-0 w-[360px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      onBranchChange?.('all')
                      setBranchMenuOpen(false)
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left cursor-pointer transition-colors',
                      activeBranchId === 'all' ? 'bg-blue-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-extrabold text-white">
                        {companyInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-bold text-slate-950">{companyName}</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-400">All branches</div>
                      </div>
                    </div>
                    <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {branches.length}
                    </span>
                  </button>

                  <div className="my-2 h-px bg-slate-200" />

                  <div className="max-h-[320px] space-y-1 overflow-y-auto">
                    {branches.length === 0 ? (
                      <div className="rounded-lg bg-slate-50 px-4 py-6 text-center">
                        <GitBranch size={22} className="mx-auto mb-2 text-slate-300" />
                        <div className="text-sm font-bold text-slate-800">No branches added</div>
                        <div className="mt-1 text-xs leading-relaxed text-slate-500">
                          Add branches from the admin page and they will appear here.
                        </div>
                      </div>
                    ) : branches.map(branch => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => {
                          onBranchChange?.(branch.id)
                          setBranchMenuOpen(false)
                        }}
                        className={clsx(
                          'flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left cursor-pointer transition-colors',
                          activeBranchId === branch.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-600">
                            {(branch.name || 'B').slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-slate-900">{branch.name}</div>
                            <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                              <MapPin size={11} />
                              <span className="truncate">{branch.location || 'No location'}</span>
                            </div>
                          </div>
                        </div>
                        {activeBranchId === branch.id && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>

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
            aria-label="Sign out"
            className="group relative mt-2 h-11 w-11 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer transition-colors"
          >
            <LogOut size={20} />
            <span className="pointer-events-none absolute left-[58px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              Sign out
            </span>
          </button>
          <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
            {user?.avatar || 'U'}
          </div>
        </div>
    </aside>
  )
}
