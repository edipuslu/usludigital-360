import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BarChart3, Brain, FileText,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Zap, Globe, ArrowLeft, Inbox, TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const Logo = ({ collapsed }) => (
  <div className={clsx('flex items-center gap-3 px-4 py-5 border-b border-white/8', collapsed && 'justify-center px-2')}>
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-glow-blue">
      <Zap size={18} className="text-white" fill="white" />
    </div>
    {!collapsed && (
      <div className="overflow-hidden">
        <div className="text-white font-bold text-base leading-tight tracking-tight">Usludigital</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none">360</span>
          <span className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">Platform</span>
        </div>
      </div>
    )}
  </div>
)

const NavSection = ({ label, children, collapsed }) => (
  <div className="mb-1">
    {!collapsed && label && (
      <div className="px-4 mb-1 mt-3">
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
    )}
    {collapsed && label && <div className="my-2 border-t border-white/5" />}
    {children}
  </div>
)

const NavItem = ({ icon: Icon, label, to, badge, collapsed, active, onClick }) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={clsx(
      'w-full flex items-center gap-3 rounded-lg text-sm font-medium cursor-pointer transition-all duration-150 relative group',
      collapsed ? 'justify-center p-2.5 mx-auto' : 'px-3 py-2.5',
      active
        ? 'bg-blue-600/20 text-white'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    )}
  >
    {active && !collapsed && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-full" />
    )}
    <Icon size={16} className={clsx('flex-shrink-0', active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
    {!collapsed && <span className="flex-1 text-left">{label}</span>}
    {!collapsed && badge != null && (
      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
        {badge}
      </span>
    )}
    {collapsed && badge != null && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
        {badge}
      </span>
    )}
    {collapsed && (
      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </div>
    )}
  </button>
)

export default function Sidebar({ companyId, companyName, onNavigate, currentSection, notificationCount = 0 }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const [growthExpanded, setGrowthExpanded] = useState(false)

  // Role-based navigation
  const allTabs = [
    { icon: LayoutDashboard, label: 'Overview', key: 'overview', roles: ['admin', 'client'] },
    { icon: Globe, label: 'Platforms', key: 'platforms', roles: ['admin'] },
    { icon: Inbox, label: 'Inbox', key: 'inbox', roles: ['admin', 'client'] },
    { icon: TrendingUp, label: 'Social Media Analytics', key: 'growth', submenu: true, roles: ['admin', 'client'] },
    { icon: Brain, label: 'AI Training', key: 'ai-training', roles: ['admin'] },
    { icon: Zap, label: 'Automation', key: 'automation', roles: ['admin'] },
    { icon: BarChart3, label: 'Analytics', key: 'analytics', roles: ['admin', 'client'] },
    { icon: FileText, label: 'Reports', key: 'reports', roles: ['admin', 'client'] },
  ]

  const userRole = user?.email === 'admin@usludigital.com' ? 'admin' : 'client'
  const companyNav = allTabs.filter(tab => tab.roles.includes(userRole))

  const platformGrowth = [
    { icon: '📷', label: 'Instagram Analytics', key: 'growth-instagram', platform: 'instagram' },
    { icon: '👥', label: 'Facebook Analytics', key: 'growth-facebook', platform: 'facebook' },
    { icon: '▶️', label: 'YouTube Analytics', key: 'growth-youtube', platform: 'youtube' },
    { icon: '💬', label: 'WhatsApp Analytics', key: 'growth-whatsapp', platform: 'whatsapp' },
  ]

  const bottomNav = [
    { icon: Bell, label: 'Notifications', key: 'notifications', badge: notificationCount || null },
    { icon: Settings, label: 'Settings', key: 'settings' },
  ]

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen sticky top-0 flex-shrink-0 transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
      style={{ background: 'linear-gradient(180deg, #07091A 0%, #060812 100%)' }}
    >
      <Logo collapsed={collapsed} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2 scrollbar-thin">
        <>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className={clsx(
                'w-full flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-medium cursor-pointer transition-colors mb-3 mt-1 px-3 py-1.5 rounded-lg hover:bg-white/5',
                collapsed && 'justify-center px-2'
              )}
            >
              <ArrowLeft size={13} />
              {!collapsed && 'Back to Companies'}
            </button>
          )}

          {companyName && !collapsed && (
            <div className="px-3 mb-3">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg px-3 py-2">
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Company</div>
                <div className="text-white text-sm font-semibold truncate">{companyName}</div>
              </div>
            </div>
          )}

          <NavSection label="Company Dashboard" collapsed={collapsed}>
            {companyNav.map(item => (
              <div key={item.key}>
                <NavItem
                  icon={item.icon}
                  label={item.label}
                  collapsed={collapsed}
                  active={currentSection === item.key || (item.submenu && currentSection?.startsWith('growth'))}
                  onClick={() => {
                    if (item.submenu) {
                      setGrowthExpanded(!growthExpanded)
                    } else {
                      onNavigate?.(item.key)
                    }
                  }}
                />
                {item.submenu && growthExpanded && !collapsed && (
                  <div className="bg-white/5 rounded-lg mt-1 p-2 space-y-1 ml-2 border-l border-blue-500/20">
                    {platformGrowth.map(platform => (
                      <button
                        key={platform.key}
                        onClick={() => onNavigate?.(platform.key)}
                        className={clsx(
                          'w-full flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors rounded px-2 py-1.5',
                          currentSection === platform.key
                            ? 'bg-blue-600/30 text-blue-300'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        )}
                        title={platform.label}
                      >
                        <span>{platform.icon}</span>
                        <span className="flex-1 text-left text-xs">{platform.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </NavSection>
        </>

        <NavSection label="Account" collapsed={collapsed}>
          {bottomNav.map(item => (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              collapsed={collapsed}
              active={currentSection === item.key}
              onClick={() => onNavigate?.(item.key)}
            />
          ))}
        </NavSection>
      </div>

      <div className={clsx('border-t border-white/8 p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors mb-1 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.avatar}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.name}</div>
              <div className="text-slate-500 text-xs truncate">{isAdmin ? 'Administrator' : 'Workspace user'}</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center cursor-pointer mb-1">
            <span className="text-white text-xs font-bold">{user?.avatar}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs font-medium cursor-pointer transition-colors rounded-lg hover:bg-red-500/10 px-2 py-1.5',
            collapsed ? 'justify-center w-full' : 'w-full'
          )}
        >
          <LogOut size={13} />
          {!collapsed && 'Sign out'}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors z-10 shadow-md"
      >
        {collapsed ? <ChevronRight size={12} className="text-slate-400" /> : <ChevronLeft size={12} className="text-slate-400" />}
      </button>
    </aside>
  )
}
