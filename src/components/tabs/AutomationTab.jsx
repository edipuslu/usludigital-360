import { useState } from 'react'
import { Save, Plus, X, Zap, MessageSquare, Link2, Volume2, ShieldOff, Clock } from 'lucide-react'
import { PlatformIcon, Toggle, SectionHeader, UsluLoader } from '../ui/UIKit'
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
  const isYoutube = platform === 'youtube'

  const addBlacklist = () => {
    if (!newBlack.trim()) return
    onChange({ ...settings, blacklist: [...settings.blacklist, newBlack.trim().toLowerCase()] })
    setNewBlack('')
  }

  const removeBlacklist = word => {
    onChange({ ...settings, blacklist: settings.blacklist.filter(w => w !== word) })
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
          <PlatformIcon platform={platform} size={18} connected={true} />
        </div>
        <div>
          <div className="text-slate-900 font-bold text-sm">{PLATFORM_LABELS[platform]}</div>
          <div className="text-slate-400 text-xs">Automation settings</div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto-Reply</span>
        </div>
        {!isYoutube && (
          <Toggle
            checked={settings.dmReply}
            onChange={v => onChange({ ...settings, dmReply: v })}
            label="DM Auto-Reply"
            description="AI automatically replies to direct messages"
          />
        )}
        <Toggle
          checked={settings.commentReply}
          onChange={v => onChange({ ...settings, commentReply: v })}
          label="Comment Auto-Reply"
          description={isYoutube ? 'AI replies to video comments' : 'AI replies to post comments publicly'}
        />
      </div>

      {/* Tone */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reply Tone</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TONES.map(tone => (
            <button
              key={tone}
              onClick={() => onChange({ ...settings, tone })}
              className={clsx(
                'py-2 px-3 rounded-lg text-sm font-medium cursor-pointer transition-all border capitalize',
                settings.tone === tone
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
              )}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* Blacklist */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldOff size={13} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blacklist Words</span>
        </div>
        <p className="text-slate-400 text-xs mb-3">AI won't reply if a comment contains these words</p>
        {settings.blacklist.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {settings.blacklist.map(word => (
              <span key={word} className="flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
                {word}
                <button onClick={() => removeBlacklist(word)} className="cursor-pointer hover:text-red-900">
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
            placeholder="Add word…"
            className="input-field text-xs flex-1"
          />
          <button onClick={addBlacklist} className="btn-secondary text-xs py-2">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
    </div>
  )
}

function toLocalInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function fromLocalInputValue(value) {
  return value ? new Date(value).toISOString() : ''
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
      <SectionHeader
        title="Automation Settings"
        description="Control how AI behaves across each platform — reply types, tone and restrictions"
        action={
          <button onClick={handleSave} className="btn-primary">
            {saved ? <><UsluLoader size="xs" />Saving...</> : <><Save size={14} />Save Changes</>}
          </button>
        }
      />

      {/* Activation schedule */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            <h3 className="text-slate-900 font-bold text-base">AI Activation Time</h3>
          </div>
          <Toggle
            checked={settings.schedule?.enabled !== false}
            onChange={v => setSettings(prev => ({ ...prev, schedule: { ...(prev.schedule || DEFAULT_SCHEDULE), enabled: v } }))}
            label="Active"
            description=""
          />
        </div>
        <p className="text-slate-500 text-sm mb-4">
          Times are controlled in Morocco time. Leave stop time empty to keep AI running nonstop.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start replying from</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(settings.schedule?.startAt)}
              onChange={e => setSettings(prev => ({ ...prev, schedule: { ...(prev.schedule || DEFAULT_SCHEDULE), startAt: fromLocalInputValue(e.target.value), timezone: 'Africa/Casablanca' } }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stop replying at</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(settings.schedule?.endAt)}
              onChange={e => setSettings(prev => ({ ...prev, schedule: { ...(prev.schedule || DEFAULT_SCHEDULE), endAt: fromLocalInputValue(e.target.value), timezone: 'Africa/Casablanca' } }))}
              className="input-field"
            />
            <button
              onClick={() => setSettings(prev => ({ ...prev, schedule: { ...(prev.schedule || DEFAULT_SCHEDULE), endAt: '' } }))}
              className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Run nonstop
            </button>
          </div>
        </div>
      </div>

      {/* Business Goal */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-blue-600" />
          <h3 className="text-slate-900 font-bold text-base">Business Goal</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={clsx(
                'text-left p-4 rounded-xl border transition-all cursor-pointer',
                goal === g.value
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={clsx('w-3.5 h-3.5 rounded-full border-2 flex-shrink-0', goal === g.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300')}>
                  {goal === g.value && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto" />}
                </div>
                <span className="text-slate-900 text-sm font-semibold">{g.label}</span>
              </div>
              <p className="text-slate-500 text-xs pl-5">{g.description}</p>
            </button>
          ))}
        </div>
        {goal === 'push_to_whatsapp' && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              <Link2 size={13} className="inline mr-1.5 text-slate-400" />
              WhatsApp Redirect Link
            </label>
            <input
              value={waLink}
              onChange={e => setWaLink(e.target.value)}
              placeholder="https://wa.me/90XXXXXXXXXX"
              className="input-field"
            />
            <p className="text-slate-400 text-xs mt-1.5">This link will be included in every AI reply across all platforms</p>
          </div>
        )}
      </div>

      {/* Platform tabs */}
      <div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {PLATFORMS.map(p => (
            <button
              key={p}
              onClick={() => setActiveP(p)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all flex-shrink-0',
                activeP === p
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <PlatformIcon platform={p} size={14} connected={company.platforms[p]?.connected} />
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
        <PlatformAutomation
          key={activeP}
          platform={activeP}
          settings={settings[activeP] || DEFAULT_AUTOMATION[activeP]}
          onChange={s => setSettings(prev => ({ ...prev, [activeP]: s }))}
        />
      </div>
    </div>
  )
}
