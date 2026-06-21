import { ChevronUp, ChevronDown, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

export const UsluLoader = ({ size = 'md', label, className }) => {
  const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-12 w-12',
    lg: 'h-20 w-20',
    xl: 'h-24 w-24',
  }

  return (
    <div className={clsx('inline-flex items-center justify-center gap-3', className)}>
      <svg
        className={clsx('uslu-loader flex-shrink-0', sizes[size] || sizes.md)}
        viewBox="0 0 240 240"
        aria-hidden={label ? undefined : 'true'}
        role={label ? 'img' : undefined}
      >
        {label && <title>{label}</title>}
        <circle className="uslu-loader__ring uslu-loader__ring--a" cx="120" cy="120" r="105" fill="none" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round" />
        <circle className="uslu-loader__ring uslu-loader__ring--b" cx="120" cy="120" r="35" fill="none" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round" />
        <circle className="uslu-loader__ring uslu-loader__ring--c" cx="85" cy="120" r="70" fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
        <circle className="uslu-loader__ring uslu-loader__ring--d" cx="155" cy="120" r="70" fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
      </svg>
      {label && <span className="text-sm font-bold text-slate-700">{label}</span>}
    </div>
  )
}

export const StatusDot = ({ status, size = 'sm' }) => {
  const colors = { active: 'bg-emerald-500', paused: 'bg-amber-400', error: 'bg-red-500', offline: 'bg-slate-300', training: 'bg-blue-500' }
  const sizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' }
  return (
    <span className={clsx('rounded-full inline-block flex-shrink-0', sizes[size], colors[status] || 'bg-slate-300', status === 'active' && 'shadow-[0_0_6px_rgba(16,185,129,0.6)]')} />
  )
}

export const StatusBadge = ({ status }) => {
  const configs = {
    active: { cls: 'badge-active', label: 'Active' },
    paused: { cls: 'badge-paused', label: 'Paused' },
    error: { cls: 'badge-error', label: 'Error' },
    offline: { cls: 'badge-offline', label: 'Offline' },
    training: { cls: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200', label: 'Training' },
    needs_update: { cls: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200', label: 'Needs Update' },
  }
  const cfg = configs[status] || configs.offline
  return (
    <span className={cfg.cls}>
      <StatusDot status={status === 'needs_update' ? 'paused' : status} />
      {cfg.label}
    </span>
  )
}

const ICON_COLORS = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
  pink: { bg: 'bg-pink-50', icon: 'text-pink-600', border: 'border-pink-100' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-100' },
}

export const StatCard = ({ label, value, icon: Icon, iconColor = 'blue', change, subtitle, className }) => {
  const colors = ICON_COLORS[iconColor] || ICON_COLORS.blue
  return (
    <div className={clsx('card p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center', colors.bg, colors.border)}>
          <Icon size={18} className={colors.icon} />
        </div>
        {change != null && (
          <div className={clsx('flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full', change >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50')}>
            {change >= 0 ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-0.5">{value}</div>
      <div className="text-slate-500 text-sm font-medium">{label}</div>
      {subtitle && <div className="text-slate-400 text-xs mt-1">{subtitle}</div>}
    </div>
  )
}

export const PlatformIcon = ({ platform, size = 20, connected = true, hasError = false }) => {
  const configs = {
    instagram: { color: '#f42582', bg: '#FDE8F1' },
    facebook: { color: '#255ff4', bg: '#E8F1FD' },
    youtube: { color: '#f42f25', bg: '#FFE8E8' },
    whatsapp: { color: '#25D366', bg: '#E8FBF0' },
    tiktok: { color: '#111827', bg: '#F1F5F9' },
    messenger: { color: '#255ff4', bg: '#E8F1FD' },
  }
  const cfg = configs[platform] || { color: '#94A3B8', bg: '#F1F5F9' }

  const icons = {
    instagram: (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={connected ? cfg.color : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="1.5" fill={connected ? cfg.color : '#94A3B8'} stroke="none"/>
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={connected ? cfg.color : '#CBD5E1'}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" fill={connected ? cfg.color : '#CBD5E1'}/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
      </svg>
    ),
    whatsapp: (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={connected ? cfg.color : '#CBD5E1'}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={connected ? cfg.color : '#CBD5E1'}>
        <path d="M16.5 3c.4 2.3 1.8 3.8 4 4.2v3.5c-1.5 0-2.8-.4-4-1.2v5.7c0 3.5-2.6 5.8-6 5.8-3.2 0-5.8-2.3-5.8-5.4 0-3.2 2.6-5.5 6-5.5.4 0 .8 0 1.2.1v3.6c-.4-.1-.8-.2-1.2-.2-1.2 0-2.2.8-2.2 2 0 1.1.9 1.9 2 1.9 1.2 0 2.1-.8 2.1-2.4V3h3.9Z" />
      </svg>
    ),
    messenger: (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={connected ? cfg.color : '#CBD5E1'}>
        <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.9 1.45 5.49 3.72 7.18V22l3.4-1.87c.91.25 1.88.38 2.88.38 5.52 0 10-4.14 10-9.25S17.52 2 12 2Zm1 12.46-2.55-2.72-4.98 2.72 5.48-5.82 2.6 2.72 4.93-2.72L13 14.46Z" />
      </svg>
    ),
  }

  return icons[platform] || null
}

export const SectionHeader = ({ title, description, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-slate-900 font-bold text-lg">{title}</h2>
      {description && <p className="text-slate-500 text-sm mt-0.5">{description}</p>}
    </div>
    {action}
  </div>
)

export const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      {label && <div className="text-slate-800 text-sm font-semibold">{label}</div>}
      {description && <div className="text-slate-500 text-xs mt-0.5">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0',
        checked ? 'bg-blue-600' : 'bg-slate-200'
      )}
    >
      <div className={clsx(
        'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200',
        checked ? 'left-6' : 'left-1'
      )} />
    </button>
  </div>
)

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-16">
    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Icon size={28} className="text-slate-400" />
    </div>
    <h3 className="text-slate-700 font-semibold mb-1">{title}</h3>
    {description && <p className="text-slate-400 text-sm mb-4">{description}</p>}
    {action}
  </div>
)
