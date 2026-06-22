import { useState } from 'react'
import { Save, Plus, X, Zap, MessageSquare, Link2, Volume2, ShieldOff } from 'lucide-react'
import { PlatformIcon, Toggle, UsluLoader } from '../ui/UIKit'
import { saveBackendAiConfig } from '../../lib/backendApi'
import clsx from 'clsx'

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'whatsapp']
const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', whatsapp: 'WhatsApp Business' }
const TONES = ['professional', 'friendly', 'luxury', 'casual']
const DEFAULT_SCHEDULE = { enabled: true, startAt: '', endAt: '', timezone: 'Africa/Casablanca' }
const DEFAULT_AUTOMATION = {
  schedule: DEFAULT_SCHEDULE,
  instagram: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
  facebook: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
  youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
  whatsapp: { dmReply: true, commentReply: false, tone: 'professional', blacklist: [] },
}
const GOALS = [
  { value: 'push_to_whatsapp', label: 'Push to WhatsApp', description: 'Every AI reply includes a WhatsApp CTA link' },
  { value: 'grow_followers', label: 'Grow Followers', description: 'Encourage following and sharing content' },
  { value: 'reply_everyone', label: 'Reply Everyone', description: 'Engage with all comments and messages' },
  { value: 'custom', label: 'Custom', description: 'Define a custom goal and CTA strategy' },
]

function PlatformAutomation({ platform, settings, onChange }) {
  const [newBlack, setNewBlack] = useState('')

  const addBlacklist = () => {
    if (!newBlack.trim()) return
    onChange({ ...settings, blacklist: [...settings.blacklist, newBlack.trim().toLowerCase()] })
    setNewBlack('')
  }

  const removeBlacklist = word => {
    onChange({ ...settings, blacklist: settings.blacklist.filter(w => w !== word) })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
            <PlatformIcon platform={platform} size={19} connected={true} />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-950">{PLATFORM_LABELS[platform]}</div>
            <div className="text-sm text-slate-500">Reply controls, tone, and blocked words.</div>
          </div>
        </div>
        <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 sm:block">
          {settings.dmReply || settings.commentReply ? 'Enabled' : 'Paused'}
        </div>
      </div>

      <div className="divide-y divide-slate-200">
        <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-[220px_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
              <Volume2 size={15} className="text-blue-600" />
              Reply tone
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Set the voice customers will receive.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TONES.map(tone => (
              <button
                key={tone}
                onClick={() => onChange({ ...settings, tone })}
                className={clsx(
                  'h-10 rounded-lg border px-3 text-sm font-bold capitalize cursor-pointer transition-colors',
                  settings.tone === tone
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-[220px_1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
              <ShieldOff size={15} className="text-blue-600" />
              Blocked words
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">AI will not reply when these words appear.</p>
          </div>
          <div>
            {settings.blacklist.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {settings.blacklist.map(word => (
                  <span key={word} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                    {word}
                    <button type="button" onClick={() => removeBlacklist(word)} className="cursor-pointer hover:text-red-900" aria-label={`Remove ${word}`}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newBlack}
                onChange={e => setNewBlack(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBlacklist()}
                placeholder="Add word"
                className="input-field text-xs flex-1"
              />
              <button onClick={addBlacklist} className="btn-secondary text-xs py-2">
                <Plus size={12} /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AutomationTab({ company, onUpdate, onNotify }) {
  const [activeP, setActiveP] = useState('instagram')
  const initialAutomation = {
    ...DEFAULT_AUTOMATION,
    ...(company.automation || {}),
    schedule: { ...DEFAULT_SCHEDULE, ...(company.automation?.schedule || {}) },
  }
  const [settings, setSettings] = useState(initialAutomation)
  const [goal, setGoal] = useState(company.goal)
  const [waLink, setWaLink] = useState(company.whatsappLink)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    const nextCompany = {
      ...company,
      goal,
      whatsappLink: waLink,
      automation: settings,
    }

    onUpdate?.(current => ({
      ...current,
      goal,
      whatsappLink: waLink,
      automation: settings,
    }))
    try {
      await saveBackendAiConfig(nextCompany)
      onNotify?.('Automation settings saved and synced to backend.', 'success')
    } catch (err) {
      onNotify?.(`Automation saved locally, but backend sync failed: ${err.message}`, 'warning')
    }
    setSaved(true)
    await new Promise(r => setTimeout(r, 1500))
    setSaved(false)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Zap size={22} fill="white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Automation</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              Control when AI replies, what goal it follows, and how each platform behaves.
            </p>
          </div>
        </div>
        <button onClick={handleSave} className="btn-primary h-11 justify-center">
          {saved ? <><UsluLoader size="xs" />Saving...</> : <><Save size={14} />Save Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap size={16} className="text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-950">1. Business Goal</h3>
          </div>
          <p className="mb-4 text-sm text-slate-500">Choose what AI should optimize for.</p>
          <div className="space-y-2">
            {GOALS.map(g => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={clsx(
                  'w-full rounded-lg border p-3 text-left transition-all cursor-pointer',
                  goal === g.value
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={clsx('w-3.5 h-3.5 rounded-full border-2 flex-shrink-0', goal === g.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300')}>
                    {goal === g.value && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto" />}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{g.label}</span>
                </div>
              </button>
            ))}
          </div>
          {goal === 'push_to_whatsapp' && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                <Link2 size={13} className="inline mr-1.5 text-slate-400" />
                WhatsApp Link
              </label>
              <input
                value={waLink}
                onChange={e => setWaLink(e.target.value)}
                placeholder="https://wa.me/90XXXXXXXXXX"
                className="input-field"
              />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-950">2. Comment Replies</h3>
          </div>
          <p className="mb-4 text-sm text-slate-500">Turn public comment replies on or off per channel.</p>
          <div className="space-y-2">
            {PLATFORMS.map(p => (
              <Toggle
                key={p}
                checked={Boolean(settings[p]?.commentReply)}
                onChange={v => setSettings(prev => ({ ...prev, [p]: { ...(prev[p] || DEFAULT_AUTOMATION[p]), commentReply: v } }))}
                label={PLATFORM_LABELS[p]}
                description={p === 'whatsapp' ? 'WhatsApp comments are not available' : 'AI can answer public comments'}
              />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-950">3. DM Replies</h3>
          </div>
          <p className="mb-4 text-sm text-slate-500">Turn private inbox replies on or off per channel.</p>
          <div className="space-y-2">
            {PLATFORMS.map(p => (
              <Toggle
                key={p}
                checked={Boolean(settings[p]?.dmReply)}
                onChange={v => setSettings(prev => ({ ...prev, [p]: { ...(prev[p] || DEFAULT_AUTOMATION[p]), dmReply: v } }))}
                label={PLATFORM_LABELS[p]}
                description={p === 'youtube' ? 'YouTube has no DMs' : 'AI can answer private messages'}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Platform tabs */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="px-3 py-2 text-xs font-bold uppercase text-slate-400">Channels</div>
          <div className="space-y-1">
            {PLATFORMS.map(p => {
              const enabled = settings[p]?.dmReply || settings[p]?.commentReply
              return (
                <button
                  key={p}
                  onClick={() => setActiveP(p)}
                  className={clsx(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold cursor-pointer transition-colors',
                    activeP === p
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <PlatformIcon platform={p} size={16} connected={company.platforms[p]?.connected} />
                    <span className="truncate">{PLATFORM_LABELS[p]}</span>
                  </span>
                  <span className={clsx('h-2 w-2 rounded-full', enabled ? 'bg-emerald-500' : 'bg-slate-300')} />
                </button>
              )
            })}
          </div>
        </aside>
        <div className="min-w-0">
          <PlatformAutomation
            key={activeP}
            platform={activeP}
            settings={settings[activeP] || DEFAULT_AUTOMATION[activeP]}
            onChange={s => setSettings(prev => ({ ...prev, [activeP]: s }))}
          />
        </div>
      </div>
    </div>
  )
}
