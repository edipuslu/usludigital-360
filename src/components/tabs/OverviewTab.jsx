import { MessageSquare, TrendingUp, Activity, Clock, AlertCircle, CheckCircle2, Brain, Globe, Zap, Building2, Bot, ClipboardList, FileBarChart } from 'lucide-react'
import { StatCard, StatusBadge, StatusDot, PlatformIcon } from '../ui/UIKit'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

const PLATFORM_KEYS = ['instagram', 'facebook', 'youtube', 'whatsapp']
const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', whatsapp: 'WhatsApp Business' }

const GoalLabels = {
  push_to_whatsapp: 'Push to WhatsApp',
  grow_followers: 'Grow Followers',
  reply_everyone: 'Reply Everyone',
  custom: 'Custom Goal',
}

const enterpriseModules = [
  {
    key: 'branches',
    title: 'Multi-Branch',
    label: 'Branch routing',
    icon: Building2,
    target: 'settings',
    points: [
      'Messages can be routed by location.',
      'Each branch can have its own sales owner.',
      'Performance can be reviewed branch by branch.',
    ],
  },
  {
    key: 'agent',
    title: 'Custom AI Agent',
    label: 'Brand-trained AI',
    icon: Bot,
    target: 'ai-training',
    points: [
      'Learns products, services, prices, and campaigns.',
      'Replies in the company sales tone.',
      'Avoids generic chatbot answers.',
    ],
  },
  {
    key: 'crm',
    title: 'CRM',
    label: 'Lead tracking',
    icon: ClipboardList,
    target: 'inbox',
    points: [
      'New customers are tracked as leads.',
      'Lead stages can move from new to interested to sale.',
      'Sales follow-up can be assigned to the right person.',
    ],
  },
  {
    key: 'reports',
    title: 'Reporting',
    label: 'Monthly progress',
    icon: FileBarChart,
    target: 'reports',
    points: [
      'Reports show replies, clicks, growth, and performance.',
      'Progress can be compared month by month.',
      'Clients can receive clean monthly summaries.',
    ],
  },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function EnterpriseModuleCard({ module, value, onOpen }) {
  const Icon = module.icon

  return (
    <button
      type="button"
      onClick={() => onOpen?.(module.target)}
      className="text-left rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600">
          <Icon size={18} />
        </div>
        <div className="text-right">
          <div className="text-slate-900 text-lg font-bold">{value}</div>
          <div className="text-slate-400 text-xs">{module.label}</div>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-slate-900 text-sm font-bold">{module.title}</h3>
        <div className="mt-3 space-y-2">
          {module.points.map(point => (
            <div key={point} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}

function EnterpriseSetup({ company, onNavigate }) {
  const connectedPlatforms = PLATFORM_KEYS.filter(key => company.platforms?.[key]?.connected).length
  const moduleValues = {
    branches: String(company.branches?.length || 0),
    agent: company.aiTraining?.status === 'active' ? 'Active' : 'Setup',
    crm: String(company.leads?.length || 0),
    reports: String(company.reports?.length || 0),
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="text-slate-900 font-bold text-lg">Enterprise AI Automation</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-3xl">
            One simple structure for multi-branch routing, a custom AI sales agent, CRM follow-up, and monthly reporting.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 self-start lg:self-auto">
          <Globe size={13} className="text-slate-400" />
          {connectedPlatforms}/4 platforms connected
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {enterpriseModules.map(module => (
          <EnterpriseModuleCard
            key={module.key}
            module={module}
            value={moduleValues[module.key]}
            onOpen={onNavigate}
          />
        ))}
      </div>
    </section>
  )
}

export default function OverviewTab({ company, onNavigate }) {
  const m = company.metrics.thisMonth
  const last7 = company.metrics.daily.slice(-7)

  const kpis = [
    { label: 'AI Replies This Month', value: m.totalReplies.toLocaleString(), icon: MessageSquare, iconColor: 'blue', change: m.change.replies },
    { label: 'WhatsApp Clicks', value: m.waClicks.toLocaleString(), icon: TrendingUp, iconColor: 'emerald', change: m.change.waClicks },
    { label: 'Response Rate', value: `${m.responseRate}%`, icon: Activity, iconColor: 'indigo', change: m.change.responseRate },
    { label: 'Avg Reply Time', value: m.avgReplyTime, icon: Clock, iconColor: 'amber', change: m.change.avgReplyTime },
  ]

  const notifications = company.notifications || []

  return (
    <div className="space-y-8 animate-slide-in">
      <EnterpriseSetup company={company} onNavigate={onNavigate} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-slate-900 font-bold text-base">This Week's Activity</h3>
              <p className="text-slate-400 text-xs mt-0.5">Replies sent and WhatsApp clicks</p>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="repliesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="replies" stroke="#2563EB" strokeWidth={2} fill="url(#repliesGrad)" dot={false} name="replies" />
                <Area type="monotone" dataKey="clicks" stroke="#10B981" strokeWidth={2} fill="url(#clicksGrad)" dot={false} name="wa clicks" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-600 rounded" /><span className="text-xs text-slate-500">AI Replies</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-500 rounded" /><span className="text-xs text-slate-500">WA Clicks</span></div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Platform Health */}
          <div className="card p-5">
            <h3 className="text-slate-900 font-bold text-sm mb-4 flex items-center gap-2">
              <Globe size={14} className="text-slate-400" /> Platform Status
            </h3>
            <div className="space-y-3">
              {PLATFORM_KEYS.map(key => {
                const p = company.platforms[key]
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PlatformIcon platform={key} size={16} connected={p.connected} hasError={!!p.error} />
                      <span className="text-slate-700 text-sm">{PLATFORM_LABELS[key]}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={!p.connected ? 'offline' : p.error ? 'error' : 'active'} />
                      <span className={clsx('text-xs font-medium', !p.connected ? 'text-slate-400' : p.error ? 'text-red-500' : 'text-emerald-600')}>
                        {!p.connected ? 'Not connected' : p.error ? 'Error' : 'Connected'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Status */}
          <div className="card p-5">
            <h3 className="text-slate-900 font-bold text-sm mb-3 flex items-center gap-2">
              <Brain size={14} className="text-slate-400" /> AI Training Status
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={company.aiTraining.status} />
            </div>
            <div className="text-slate-500 text-xs">
              Last trained: <span className="text-slate-700 font-medium">{company.aiTraining.lastTrained}</span>
            </div>
            <div className="text-slate-500 text-xs mt-1">
              Documents: <span className="text-slate-700 font-medium">{company.aiTraining.documents.length} files</span>
            </div>
            {company.aiTraining.status === 'training' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Training progress</span>
                  <span className="font-semibold text-blue-600">{company.aiTraining.progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${company.aiTraining.progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Goal */}
          <div className="card p-5">
            <h3 className="text-slate-900 font-bold text-sm mb-3 flex items-center gap-2">
              <Zap size={14} className="text-slate-400" /> Business Goal
            </h3>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
              <div className="text-blue-700 text-sm font-semibold">{GoalLabels[company.goal] || company.goal}</div>
              {company.goal === 'push_to_whatsapp' && company.whatsappLink && (
                <div className="text-blue-600 text-xs mt-1 truncate">{company.whatsappLink}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="card p-5">
          <h3 className="text-slate-900 font-bold text-base mb-4">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className={clsx(
                'flex items-start gap-3 p-3 rounded-lg border',
                n.type === 'error' ? 'bg-red-50 border-red-200' :
                n.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                n.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                'bg-blue-50 border-blue-200'
              )}>
                {n.type === 'error' ? <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" /> :
                 n.type === 'success' ? <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" /> :
                 <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                <div className="flex-1">
                  <div className={clsx('text-sm font-medium', n.type === 'error' ? 'text-red-800' : n.type === 'success' ? 'text-emerald-800' : 'text-amber-800')}>
                    {n.message}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
