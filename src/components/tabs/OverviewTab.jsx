import { ArrowRight, Bot, CheckCircle2, ExternalLink, GitBranch, Globe, Inbox, MapPin, MessageCircle, TrendingUp, Zap } from 'lucide-react'

const PLATFORM_KEYS = ['instagram', 'facebook', 'whatsapp', 'tiktok', 'youtube']

const adminQuickActions = [
  {
    title: 'Auto-reply to comments',
    label: 'Quick Automation',
    target: 'automation',
    badge: 'POPULAR',
  },
  {
    title: 'Generate leads from DMs',
    label: 'Quick Automation',
    target: 'inbox-instagram',
  },
  {
    title: 'Respond to all DMs',
    label: 'Quick Automation',
    target: 'inbox',
  },
]

const clientQuickActions = [
  {
    title: 'Review new messages',
    label: 'Inbox',
    target: 'inbox',
  },
  {
    title: 'Check social growth',
    label: 'Analytics',
    target: 'growth',
  },
  {
    title: 'Open monthly reports',
    label: 'Reports',
    target: 'reports',
  },
]

const adminNextSteps = [
  { label: 'Connect Instagram or Facebook', test: company => PLATFORM_KEYS.some(key => company.platforms?.[key]?.connected), target: 'settings' },
  { label: 'Train the AI with business details', test: company => company.aiTraining?.status === 'active' || company.aiTraining?.documents?.length > 0 || company.aiTraining?.websiteUrl, target: 'ai-training' },
  { label: 'Review inbox replies', test: company => Number(company.metrics?.thisMonth?.totalReplies || 0) > 0, target: 'inbox' },
]

const clientNextSteps = [
  { label: 'Review inbox replies', test: company => Number(company.metrics?.thisMonth?.totalReplies || 0) > 0, target: 'inbox' },
  { label: 'Check Social Media Analytics', test: company => PLATFORM_KEYS.some(key => company.platforms?.[key]?.connected), target: 'growth' },
  { label: 'Open monthly report', test: company => Boolean(company.reports?.length), target: 'reports' },
]

function connectedCount(company) {
  return PLATFORM_KEYS.filter(key => company.platforms?.[key]?.connected).length
}

function FirstStepCard({ action, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(action.target)}
      className="min-h-[118px] rounded-lg bg-white px-6 py-5 text-left cursor-pointer transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">{action.title}</h3>
          {action.badge && (
            <span className="rounded bg-amber-700 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
              {action.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Zap size={15} className="text-slate-400" />
          {action.label}
        </div>
      </div>
    </button>
  )
}

function NextMoves({ company, onNavigate, steps }) {
  const completed = steps.filter(step => step.test(company)).length
  const progress = Math.round((completed / steps.length) * 100)

  return (
    <section className="max-w-xl">
      <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-950">Your next best moves</h2>
      <div className="rounded-lg bg-white p-6">
        <div className="text-sm font-medium text-slate-400">First steps</div>
        <h3 className="mt-2 max-w-md text-xl font-extrabold leading-tight text-slate-900">
          Time to make life simple. Start with these quick automations
        </h3>

        <div className="mt-8">
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 text-sm font-medium text-slate-500">{completed} of {steps.length} completed</div>
        </div>

        <div className="mt-6 space-y-2">
          {steps.map(step => {
            const done = step.test(company)
            return (
              <button
                type="button"
                key={step.label}
                onClick={() => onNavigate?.(step.target)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${done ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-transparent'}`}>
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="truncate text-sm font-semibold text-slate-800">{step.label}</span>
                </div>
                <ArrowRight size={16} className="text-slate-500" />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function OverviewTab({ company, onNavigate, isAdmin = false }) {
  const connected = connectedCount(company)
  const companyName = company.clientName || company.name || 'there'
  const activeBranchName = company.branchName || ''
  const displayName = activeBranchName || companyName
  const quickActions = isAdmin ? adminQuickActions : clientQuickActions
  const nextSteps = isAdmin ? adminNextSteps : clientNextSteps
  const setupTarget = isAdmin ? 'settings' : 'inbox'

  return (
    <div className="animate-slide-in">
      <div className="-mx-8 -mt-8 border-b border-slate-200 bg-slate-50 px-8 py-7">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Home</h1>
          {activeBranchName && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
              <GitBranch size={14} />
              {activeBranchName}
            </span>
          )}
        </div>
        {activeBranchName && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
            <span>{companyName}</span>
            {company.branchLocation && (
              <>
                <span className="text-slate-300">/</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  {company.branchLocation}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-2 py-12">
        <section className="rounded-lg bg-slate-950 px-6 py-5 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-white text-slate-950">
                <Bot size={28} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xl font-extrabold">Instagram AI automation is ready to set up</div>
                <div className="mt-1 truncate text-sm font-medium text-slate-400">Connect channels, train the AI, and manage replies from one workspace.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.(setupTarget)}
              className="inline-flex h-11 items-center justify-center gap-3 rounded-full bg-teal-500 px-6 text-sm font-bold text-slate-950 transition-colors hover:bg-teal-400"
            >
              {isAdmin ? 'Connect' : 'Open Inbox'} <ArrowRight size={17} />
            </button>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-5xl font-extrabold tracking-tight text-slate-950 md:text-6xl">Hello, {displayName}!</h2>
          <div className="mt-4 flex flex-wrap items-center gap-5 text-base font-medium text-slate-800">
            {activeBranchName && <span className="text-slate-500">Branch of {companyName}</span>}
            <span>{connected} connected channel{connected === 1 ? '' : 's'}</span>
            <button type="button" onClick={() => onNavigate?.('growth')} className="text-blue-600 hover:text-blue-700">
              See Insights
            </button>
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Start here</h2>
            <button type="button" onClick={() => onNavigate?.(isAdmin ? 'automation' : 'reports')} className="text-sm font-bold text-blue-600 hover:text-blue-700">
              {isAdmin ? 'Explore automations' : 'Open reports'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {quickActions.map(action => (
              <FirstStepCard key={action.title} action={action} onNavigate={onNavigate} />
            ))}
          </div>
        </section>

        <div className="mt-16 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(360px,580px)_1fr]">
          <NextMoves company={company} onNavigate={onNavigate} steps={nextSteps} />

          <section>
            <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-slate-950">Workspace snapshot</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-1">
              <button type="button" onClick={() => onNavigate?.('inbox')} className="rounded-lg bg-white p-5 text-left cursor-pointer transition-colors hover:bg-slate-50">
                <Inbox size={20} className="text-slate-500" />
                <div className="mt-4 text-2xl font-extrabold text-slate-950">{company.metrics?.thisMonth?.totalReplies || 0}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">AI replies this month</div>
              </button>
              <button type="button" onClick={() => onNavigate?.(isAdmin ? 'settings' : 'growth')} className="rounded-lg bg-white p-5 text-left cursor-pointer transition-colors hover:bg-slate-50">
                <Globe size={20} className="text-slate-500" />
                <div className="mt-4 text-2xl font-extrabold text-slate-950">{connected}/5</div>
                <div className="mt-1 text-sm font-medium text-slate-500">Channels connected</div>
              </button>
              <button type="button" onClick={() => onNavigate?.('growth')} className="rounded-lg bg-white p-5 text-left cursor-pointer transition-colors hover:bg-slate-50">
                <TrendingUp size={20} className="text-slate-500" />
                <div className="mt-4 text-2xl font-extrabold text-slate-950">{company.branches?.length || 0}</div>
                <div className="mt-1 text-sm font-medium text-slate-500">Branches visible</div>
              </button>
            </div>

            {(company.notifications || []).length > 0 && (
              <button type="button" onClick={() => onNavigate?.('notifications')} className="mt-4 flex w-full items-center justify-between rounded-lg bg-white px-5 py-4 text-left cursor-pointer transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <MessageCircle size={19} className="text-slate-500" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">Recent notifications</div>
                    <div className="text-xs font-medium text-slate-500">{company.notifications.length} update{company.notifications.length === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <ExternalLink size={16} className="text-slate-400" />
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
