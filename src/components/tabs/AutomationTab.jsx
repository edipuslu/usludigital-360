import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  Check,
  Eye,
  FastForward,
  FolderPlus,
  MessageCircle,
  Plus,
  Redo2,
  Save,
  Search,
  Send,
  Trash2,
  Triangle,
  Undo2,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import { PlatformIcon, UsluLoader } from '../ui/UIKit'
import { saveBackendAiConfig } from '../../lib/backendApi'
import clsx from 'clsx'

const DEFAULT_SCHEDULE = { enabled: true, startAt: '', endAt: '', timezone: 'Africa/Casablanca' }
const DEFAULT_AUTOMATION = {
  schedule: DEFAULT_SCHEDULE,
  instagram: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
  facebook: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
  youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
  whatsapp: { dmReply: true, commentReply: false, tone: 'professional', blacklist: [] },
}

const TRIGGERS = [
  { id: 'instagram_comment', platform: 'instagram', type: 'comment', title: 'Instagram Comment', description: 'Starts when someone comments on a post or reel.' },
  { id: 'instagram_dm', platform: 'instagram', type: 'dm', title: 'Instagram DM', description: 'Starts when someone sends a direct message.' },
  { id: 'facebook_comment', platform: 'facebook', type: 'comment', title: 'Facebook Comment', description: 'Starts when someone comments on a Page post.' },
  { id: 'facebook_dm', platform: 'facebook', type: 'dm', title: 'Messenger DM', description: 'Starts when someone messages the Page.' },
  { id: 'youtube_comment', platform: 'youtube', type: 'comment', title: 'YouTube Comment', description: 'Starts when someone comments on a video.' },
  { id: 'whatsapp_dm', platform: 'whatsapp', type: 'dm', title: 'WhatsApp Message', description: 'Starts when someone sends a WhatsApp message.' },
]

const ACTIONS = [
  { id: 'ai_reply', title: 'AI Reply', description: 'Use AI Training to write a natural answer.', icon: Bot },
  { id: 'send_message', title: 'Send Message', description: 'Send the exact text you write below.', icon: Send },
  { id: 'handoff', title: 'Human Handoff', description: 'Save the message and wait for a person.', icon: MessageCircle },
]

const SECTION_ITEMS = [
  { id: 'my', label: 'My Automations', icon: Workflow },
  { id: 'basic', label: 'Basic', icon: Triangle },
  { id: 'sequences', label: 'Sequences', icon: FastForward },
]

function makeFlow(overrides = {}) {
  const trigger = overrides.trigger || TRIGGERS[0]
  return {
    id: overrides.id || `automation-${Date.now()}`,
    name: overrides.name || 'Untitled automation',
    folderId: overrides.folderId || null,
    triggerId: trigger.id,
    platform: trigger.platform,
    triggerType: trigger.type,
    triggerTitle: trigger.title,
    actionType: overrides.actionType || 'ai_reply',
    message: overrides.message ?? '',
    status: overrides.status || 'draft',
    updatedAt: overrides.updatedAt || new Date().toISOString(),
  }
}

function normalizeFlow(flow) {
  const trigger = TRIGGERS.find(item => item.id === flow.triggerId) || TRIGGERS[0]
  return makeFlow({
    ...flow,
    trigger,
    id: flow.id,
    name: flow.name,
    folderId: flow.folderId || null,
    actionType: flow.actionType || 'ai_reply',
    message: flow.message ?? '',
    status: flow.status || 'draft',
    updatedAt: flow.updatedAt,
  })
}

function toAutomationSettings(current, flow) {
  const next = {
    ...DEFAULT_AUTOMATION,
    ...(current || {}),
    schedule: { ...DEFAULT_SCHEDULE, ...(current?.schedule || {}) },
  }
  const existing = next[flow.platform] || DEFAULT_AUTOMATION[flow.platform] || {}
  next[flow.platform] = {
    ...existing,
    dmReply: flow.triggerType === 'dm' ? true : Boolean(existing.dmReply),
    commentReply: flow.triggerType === 'comment' ? true : Boolean(existing.commentReply),
  }
  return next
}

function AutomationSideNav({ activeSection, onSectionChange }) {
  return (
    <aside className="w-full border-r border-slate-200 bg-[#f6f6f6] px-4 py-8 lg:w-[280px]">
      <div className="mb-8 px-3">
        <h2 className="text-4xl font-extrabold tracking-tight text-[#2b2b2b]">Automation</h2>
      </div>
      <div className="space-y-2">
        {SECTION_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={clsx(
                'flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-xl font-semibold transition-colors',
                activeSection === item.id
                  ? 'bg-[#d9d9d9] text-[#2b2b2b]'
                  : 'text-[#3e3e3e] hover:bg-white'
              )}
            >
              <Icon size={20} className="text-[#777]" />
              {item.label}
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function EmptyAutomationState({ onNewAutomation }) {
  return (
    <div className="mt-16 rounded-lg bg-white px-6 py-20 text-center">
      <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-[34px] bg-blue-50">
        <div className="relative h-20 w-20">
          <div className="absolute left-2 top-3 h-14 w-14 rounded-full bg-[#8bd7df]" />
          <div className="absolute right-2 top-7 h-12 w-12 rounded-full bg-[#4251d6]" />
          <div className="absolute left-4 top-10 h-9 w-16 rotate-[-24deg] rounded-full bg-[#ffea00]" />
          <Zap size={34} className="absolute right-2 top-1 fill-[#ffea00] text-[#ffea00]" />
        </div>
      </div>
      <h3 className="text-2xl font-extrabold text-[#2b2b2b]">Create your first Automation</h3>
      <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-[#777]">
        Automations are where you create chat replies in an easy visual format.
        Start with a trigger, then choose what should happen next.
      </p>
      <button onClick={onNewAutomation} className="mt-8 inline-flex h-12 items-center gap-3 rounded-lg bg-[#255ff4] px-6 text-lg font-bold text-white hover:bg-[#1f50d0]">
        <Plus size={22} />
        New Automation
      </button>
    </div>
  )
}

function FlowRow({ flow, onOpen, onDelete }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-slate-200 bg-white px-5 py-4">
      <button onClick={onOpen} className="min-w-0 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <PlatformIcon platform={flow.platform} size={20} connected />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold text-slate-950">{flow.name}</div>
            <div className="mt-0.5 truncate text-sm font-medium text-slate-500">
              {flow.triggerTitle} {'->'} {ACTIONS.find(action => action.id === flow.actionType)?.title || 'Action'}
            </div>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-3">
        <span className={clsx(
          'rounded-full px-3 py-1 text-xs font-extrabold uppercase',
          flow.status === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
        )}>
          {flow.status}
        </span>
        <button onClick={onDelete} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-[#f42f25]" aria-label={`Delete ${flow.name}`}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}

function AutomationList({
  activeSection,
  flows,
  folders,
  search,
  onSearch,
  onNewFolder,
  onNewAutomation,
  onOpenFlow,
  onDeleteFlow,
}) {
  if (activeSection !== 'my') {
    const isBasic = activeSection === 'basic'
    return (
      <main className="flex-1 bg-[#f6f6f6] px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-extrabold text-[#2b2b2b]">{isBasic ? 'Basic' : 'Sequences'}</h1>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(isBasic ? TRIGGERS.slice(0, 3) : TRIGGERS.slice(3)).map(trigger => (
              <button
                key={trigger.id}
                onClick={() => onNewAutomation(trigger)}
                className="rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:border-[#255ff4] hover:shadow-sm"
              >
                <PlatformIcon platform={trigger.platform} size={24} connected />
                <div className="mt-4 text-lg font-extrabold text-slate-950">{trigger.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{trigger.description}</p>
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 bg-[#f6f6f6] px-8 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <h1 className="text-4xl font-extrabold text-[#2b2b2b]">My Automations</h1>
          <button onClick={() => onNewAutomation()} className="inline-flex h-12 items-center justify-center gap-3 rounded-lg bg-[#255ff4] px-5 text-lg font-bold text-white hover:bg-[#1f50d0]">
            <Plus size={22} />
            New Automation
          </button>
        </div>

        <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-md">
            <Search size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]" />
            <input
              value={search}
              onChange={event => onSearch(event.target.value)}
              placeholder="Search all Automations"
              className="h-14 w-full rounded-lg border border-slate-300 bg-white pl-14 pr-4 text-xl text-slate-900 outline-none focus:border-[#255ff4] focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <button type="button" className="inline-flex items-center gap-2 text-lg font-bold text-[#255ff4] hover:text-[#1f50d0]">
            <Trash2 size={18} />
            Trash
          </button>
        </div>

        <button
          onClick={onNewFolder}
          className="mt-9 inline-flex h-14 min-w-[360px] items-center gap-4 rounded-lg border border-dashed border-[#255ff4] bg-white px-6 text-xl font-bold text-[#255ff4] hover:bg-blue-50"
        >
          <Plus size={26} />
          New Folder
        </button>

        {folders.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {folders.map(folder => (
              <div key={folder.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <FolderPlus size={18} className="text-[#255ff4]" />
                <span className="font-bold text-slate-800">{folder.name}</span>
              </div>
            ))}
          </div>
        )}

        {flows.length === 0 ? (
          <EmptyAutomationState onNewAutomation={() => onNewAutomation()} />
        ) : (
          <div className="mt-10 space-y-3">
            {flows.map(flow => (
              <FlowRow
                key={flow.id}
                flow={flow}
                onOpen={() => onOpenFlow(flow)}
                onDelete={() => onDeleteFlow(flow.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function TriggerPicker({ selectedId, onSelect }) {
  return (
    <div className="space-y-2">
      {TRIGGERS.map(trigger => (
        <button
          key={trigger.id}
          onClick={() => onSelect(trigger)}
          className={clsx(
            'w-full rounded-lg border p-3 text-left transition',
            selectedId === trigger.id
              ? 'border-[#255ff4] bg-blue-50'
              : 'border-slate-200 bg-white hover:border-[#255ff4]'
          )}
        >
          <div className="flex items-center gap-3">
            <PlatformIcon platform={trigger.platform} size={20} connected />
            <div>
              <div className="font-extrabold text-slate-950">{trigger.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{trigger.description}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function FlowNode({ type, title, description, platform, selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-[320px] rounded-xl border bg-white p-4 text-left shadow-sm transition',
        selected ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-[#255ff4]'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
          {platform ? <PlatformIcon platform={platform} size={21} connected /> : <Zap size={20} className="text-[#255ff4]" />}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold uppercase text-slate-500">{type}</div>
          <div className="mt-1 text-base font-extrabold text-slate-950">{title}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </button>
  )
}

function PreviewPanel({ flow, onClose }) {
  const action = ACTIONS.find(item => item.id === flow.actionType)
  return (
    <div className="absolute right-8 top-24 z-20 w-[360px] rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-slate-950">Preview</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
          <X size={18} />
        </button>
      </div>
      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <PlatformIcon platform={flow.platform} size={16} connected />
          {flow.triggerTitle}
        </div>
        <div className="mt-4 rounded-2xl bg-[#255ff4] px-4 py-3 text-sm font-semibold text-white">
          {action?.id === 'ai_reply' ? 'AI will generate a different reply using the training context.' : flow.message}
        </div>
      </div>
    </div>
  )
}

function FlowEditor({ flow, onChange, onBack, onSave, saving, saved }) {
  const [selectedPanel, setSelectedPanel] = useState('trigger')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const selectedTrigger = TRIGGERS.find(item => item.id === flow.triggerId) || TRIGGERS[0]
  const selectedAction = ACTIONS.find(item => item.id === flow.actionType) || ACTIONS[0]
  const ActionIcon = selectedAction.icon

  const updateTrigger = trigger => {
    onChange({
      ...flow,
      triggerId: trigger.id,
      platform: trigger.platform,
      triggerType: trigger.type,
      triggerTitle: trigger.title,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="relative flex min-h-[calc(100vh-120px)] flex-col bg-[#f6f6f6]">
      <div className="flex min-h-[82px] items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950" aria-label="Back to automations">
            <ArrowLeft size={22} />
          </button>
          <input
            value={flow.name}
            onChange={event => onChange({ ...flow, name: event.target.value, updatedAt: new Date().toISOString() })}
            className="w-[360px] border-none bg-transparent text-4xl font-extrabold text-[#2b2b2b] outline-none"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 text-lg font-semibold text-slate-500">
            <Check size={22} />
            {saved ? 'Saved' : 'Draft'}
          </span>
          <button disabled className="rounded-lg p-2 text-slate-300">
            <Undo2 size={22} />
          </button>
          <button disabled className="rounded-lg p-2 text-slate-300">
            <Redo2 size={22} />
          </button>
          <button onClick={() => setPreviewOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-lg font-bold text-[#2b2b2b] hover:bg-slate-50">
            <Eye size={20} />
            Preview
          </button>
          <button onClick={onSave} className="inline-flex h-12 items-center gap-3 rounded-lg bg-[#255ff4] px-8 text-lg font-bold text-white hover:bg-[#1f50d0]">
            {saving ? <UsluLoader size="xs" /> : <Save size={20} />}
            Set Live
          </button>
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[420px_1fr]">
        <aside className="border-r border-slate-200 bg-white">
          <section className="border-b border-slate-200 bg-emerald-50/70 p-6">
            <h2 className="text-2xl font-extrabold text-[#2b2b2b]">When...</h2>
            <button
              onClick={() => setSelectedPanel('trigger')}
              className="mt-6 flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 bg-white text-lg font-bold text-[#255ff4] hover:border-[#255ff4]"
            >
              <Plus size={20} />
              New Trigger
            </button>
          </section>

          <section className="p-6">
            <h2 className="text-2xl font-extrabold text-[#2b2b2b]">Then...</h2>
            <div className="mt-5 rounded-xl border border-slate-300 bg-white">
              <button
                onClick={() => setSelectedPanel('action')}
                className={clsx(
                  'flex w-full items-center gap-4 p-4 text-left',
                  selectedPanel === 'action' && 'bg-blue-50'
                )}
              >
                <PlatformIcon platform={flow.platform} size={28} connected />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-extrabold text-[#2b2b2b]">{selectedAction.title}</div>
                  <div className="truncate text-sm font-semibold text-slate-500">{flow.message}</div>
                </div>
                <X size={22} className="text-slate-400" />
              </button>
            </div>
          </section>

          <section className="border-t border-slate-200 p-6">
            {selectedPanel === 'trigger' ? (
              <>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Choose trigger</h3>
                <div className="mt-4">
                  <TriggerPicker selectedId={flow.triggerId} onSelect={updateTrigger} />
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Choose action</h3>
                <div className="mt-4 grid gap-2">
                  {ACTIONS.map(action => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.id}
                        onClick={() => onChange({ ...flow, actionType: action.id, updatedAt: new Date().toISOString() })}
                        className={clsx(
                          'rounded-lg border p-3 text-left transition',
                          flow.actionType === action.id ? 'border-[#255ff4] bg-blue-50' : 'border-slate-200 hover:border-[#255ff4]'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={20} className="mt-0.5 text-[#255ff4]" />
                          <div>
                            <div className="font-extrabold text-slate-950">{action.title}</div>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{action.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <label className="mt-5 block text-sm font-extrabold uppercase tracking-wide text-slate-500">
                  Message or instruction
                </label>
                <textarea
                  value={flow.message}
                  onChange={event => onChange({ ...flow, message: event.target.value, updatedAt: new Date().toISOString() })}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm font-medium text-slate-900 outline-none focus:border-[#255ff4] focus:ring-4 focus:ring-blue-100"
                />
              </>
            )}
          </section>
        </aside>

        <main className="relative overflow-hidden bg-[#f8f8f8]">
          {previewOpen && <PreviewPanel flow={flow} onClose={() => setPreviewOpen(false)} />}
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-100 px-5 py-2 text-lg font-semibold text-slate-500">
            Edit step in sidebar
          </div>

          <div className="flex h-full min-h-[720px] items-center justify-center">
            <div
              className="relative flex items-center gap-36 transition-transform"
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <FlowNode
                type="When..."
                title={selectedTrigger.title}
                description={selectedTrigger.description}
                selected={selectedPanel === 'trigger'}
                onClick={() => setSelectedPanel('trigger')}
              >
                <div className="mt-4 rounded-lg border border-dashed border-[#255ff4] px-4 py-3 text-center text-sm font-extrabold text-[#255ff4]">
                  + New Trigger
                </div>
                <div className="mt-4 flex justify-end text-xs font-bold text-slate-400">Then</div>
              </FlowNode>

              <svg className="absolute left-[305px] top-1/2 h-28 w-40 -translate-y-1/2 overflow-visible" viewBox="0 0 160 112" aria-hidden="true">
                <path d="M4 58 C 46 58, 58 4, 104 42 S 116 58, 156 58" fill="none" stroke="#94a3b8" strokeWidth="3" />
                <circle cx="4" cy="58" r="5" fill="#94a3b8" />
                <circle cx="156" cy="58" r="5" fill="#94a3b8" />
              </svg>

              <FlowNode
                type={selectedAction.title}
                title={`${selectedTrigger.platform === 'facebook' ? 'Messenger' : selectedTrigger.title.split(' ')[0]} ${selectedAction.title}`}
                description={selectedAction.description}
                platform={flow.platform}
                selected={selectedPanel === 'action'}
                onClick={() => setSelectedPanel('action')}
              >
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-xs font-semibold text-slate-500">
                  {flow.message || 'Add text'}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <ActionIcon size={13} />
                    Action
                  </span>
                  <span>Next Step</span>
                </div>
              </FlowNode>
            </div>
          </div>

          <div className="absolute right-6 top-28 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button onClick={() => setZoom(value => Math.min(value + 10, 140))} className="h-14 w-14 text-2xl font-bold text-[#255ff4] hover:bg-blue-50">+</button>
            <button onClick={() => setZoom(value => Math.max(value - 10, 70))} className="h-14 w-14 border-t border-slate-200 text-2xl font-bold text-[#255ff4] hover:bg-blue-50">-</button>
            <button onClick={() => setZoom(100)} className="h-14 w-14 border-t border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50">{zoom}%</button>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function AutomationTab({ company, onUpdate, onNotify }) {
  const initialFlows = useMemo(
    () => Array.isArray(company.automationFlows) ? company.automationFlows.map(normalizeFlow) : [],
    [company.automationFlows]
  )
  const initialFolders = useMemo(
    () => Array.isArray(company.automationFolders) ? company.automationFolders : [],
    [company.automationFolders]
  )
  const [view, setView] = useState('list')
  const [activeSection, setActiveSection] = useState('my')
  const [search, setSearch] = useState('')
  const [flows, setFlows] = useState(initialFlows)
  const [folders, setFolders] = useState(initialFolders)
  const [draft, setDraft] = useState(initialFlows[0] || makeFlow())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const visibleFlows = flows.filter(flow => {
    const term = search.trim().toLowerCase()
    if (!term) return flow.status !== 'deleted'
    return flow.status !== 'deleted' && `${flow.name} ${flow.triggerTitle} ${flow.platform}`.toLowerCase().includes(term)
  })

  const saveCompany = async (nextFlows, nextFolders, options = {}) => {
    const liveFlow = options.liveFlow
    const nextAutomation = liveFlow ? toAutomationSettings(company.automation, liveFlow) : company.automation
    const nextCompany = {
      ...company,
      automation: nextAutomation,
      automationFlows: nextFlows,
      automationFolders: nextFolders,
    }

    onUpdate?.(current => ({
      ...current,
      automation: nextAutomation,
      automationFlows: nextFlows,
      automationFolders: nextFolders,
    }))

    await saveBackendAiConfig(nextCompany)
  }

  const handleNewAutomation = trigger => {
    setDraft(makeFlow({ trigger }))
    setSaved(false)
    setView('editor')
  }

  const handleOpenFlow = flow => {
    setDraft(normalizeFlow(flow))
    setSaved(flow.status === 'live')
    setView('editor')
  }

  const handleNewFolder = async () => {
    const nextFolders = [
      ...folders,
      { id: `folder-${Date.now()}`, name: `Folder ${folders.length + 1}`, createdAt: new Date().toISOString() },
    ]
    setFolders(nextFolders)
    try {
      await saveCompany(flows, nextFolders)
      onNotify?.('Folder saved.', 'success')
    } catch (error) {
      onNotify?.(`Folder saved locally, but backend sync failed: ${error.message}`, 'warning')
    }
  }

  const handleDeleteFlow = async flowId => {
    const nextFlows = flows.filter(flow => flow.id !== flowId)
    setFlows(nextFlows)
    try {
      await saveCompany(nextFlows, folders)
      onNotify?.('Automation moved out of the list.', 'success')
    } catch (error) {
      onNotify?.(`Automation removed locally, but backend sync failed: ${error.message}`, 'warning')
    }
  }

  const handleSetLive = async () => {
    const liveDraft = { ...draft, status: 'live', updatedAt: new Date().toISOString() }
    const exists = flows.some(flow => flow.id === liveDraft.id)
    const nextFlows = exists
      ? flows.map(flow => flow.id === liveDraft.id ? liveDraft : flow)
      : [liveDraft, ...flows]

    setSaving(true)
    setFlows(nextFlows)
    setDraft(liveDraft)
    try {
      await saveCompany(nextFlows, folders, { liveFlow: liveDraft })
      setSaved(true)
      onNotify?.('Automation is live and synced to the company.', 'success')
    } catch (error) {
      onNotify?.(`Automation saved locally, but backend sync failed: ${error.message}`, 'warning')
    } finally {
      setSaving(false)
    }
  }

  if (view === 'editor') {
    return (
      <FlowEditor
        flow={draft}
        onChange={nextDraft => {
          setDraft(nextDraft)
          setSaved(false)
        }}
        onBack={() => setView('list')}
        onSave={handleSetLive}
        saving={saving}
        saved={saved}
      />
    )
  }

  return (
    <div className="min-h-[calc(100vh-120px)] overflow-hidden border-t border-slate-200 bg-[#f6f6f6] lg:flex">
      <AutomationSideNav activeSection={activeSection} onSectionChange={setActiveSection} />
      <AutomationList
        activeSection={activeSection}
        flows={visibleFlows}
        folders={folders}
        search={search}
        onSearch={setSearch}
        onNewFolder={handleNewFolder}
        onNewAutomation={handleNewAutomation}
        onOpenFlow={handleOpenFlow}
        onDeleteFlow={handleDeleteFlow}
      />
    </div>
  )
}
