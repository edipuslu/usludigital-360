import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Send, Search, Filter, Heart, MessageSquare, Calendar, User, ExternalLink, Loader, AlertTriangle, Calculator, RefreshCw, Plus } from 'lucide-react'
import { PlatformIcon, SectionHeader } from '../ui/UIKit'
import { estimateBackfillReplies, fetchInbox, replyToInboxItem, runBackfillReplies, createTestDM } from '../../lib/backendApi'
import clsx from 'clsx'

const PLATFORMS = ['instagram', 'facebook', 'youtube', 'whatsapp']
const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', whatsapp: 'WhatsApp' }

function formatInboxDate(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function normalizeInboxItem(item) {
  return {
    id: item.id,
    platform: item.platform || 'instagram',
    isDM: item.type === 'dm',
    authorName: item.senderName || item.authorName || 'Customer',
    authorUrl: item.sourceLink || '',
    content: item.text || item.content || '',
    date: formatInboxDate(item.receivedAt || item.date),
    likes: Number(item.likes || 0),
    aiReplied: Boolean(item.aiReply),
    aiReply: item.aiReply || '',
    error: item.error || '',
    status: item.status || '',
    replies: [],
  }
}

function formatSyncWarning(warning) {
  if (/Instagram DMs:.*capability|instagram_manage_messages|Advanced Access/i.test(warning)) {
    return 'Instagram DMs work in Development Mode only for Meta App Roles/Test Users who accepted the invite. Public customer DMs need Meta approval before they can sync or reply.'
  }
  return warning
}

function MessageCard({ msg, onReply, isReply = false, isAdmin = true }) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSendReply = async () => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await onReply(msg.id, replyText)
      setReplyText('')
      setShowReplyBox(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={clsx('card p-4 mb-3 transition-all', isReply && 'ml-8 bg-slate-50 border-slate-200')}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-900 font-semibold text-sm">{msg.authorName}</span>
            {msg.authorUrl && (
              <a href={msg.authorUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                <ExternalLink size={12} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <PlatformIcon platform={msg.platform} size={12} connected={true} />
            <span className="text-slate-400 text-xs">{PLATFORM_LABELS[msg.platform]}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Calendar size={10} /> {msg.date}
            </span>
          </div>
        </div>
        {msg.likes > 0 && (
          <div className="flex items-center gap-1 text-red-500 text-xs font-medium flex-shrink-0">
            <Heart size={12} fill="currentColor" /> {msg.likes}
          </div>
        )}
      </div>
      <p className="text-slate-700 text-sm leading-relaxed mb-3">{msg.content}</p>
      {msg.replies?.length > 0 && !isReply && (
        <div className="space-y-2 mb-3">
          {msg.replies.map(reply => (
            <MessageCard key={reply.id} msg={reply} onReply={onReply} isReply={true} />
          ))}
        </div>
      )}
      {!isReply && !msg.aiReplied && isAdmin && (
        <>
          {!showReplyBox ? (
            <button onClick={() => setShowReplyBox(true)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer flex items-center gap-1">
              <MessageSquare size={12} /> Reply
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply…" rows={2} className="input-field flex-1 resize-none text-xs" />
              <div className="flex flex-col gap-2">
                <button onClick={handleSendReply} disabled={!replyText.trim() || sending} className="btn-primary text-xs py-2 px-3 justify-center disabled:opacity-50">
                  {sending ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
                <button onClick={() => { setShowReplyBox(false); setReplyText('') }} className="btn-secondary text-xs py-2 px-3 justify-center">Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
      {msg.aiReplied && (
        <div className={clsx('mt-3 p-3 rounded-lg border', msg.status === 'reply_failed' ? 'bg-red-50 border-red-200' : ['reply_ready', 'test_ready'].includes(msg.status) ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200')}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className={clsx('w-4 h-4 rounded-full flex items-center justify-center', msg.status === 'reply_failed' ? 'bg-red-600' : ['reply_ready', 'test_ready'].includes(msg.status) ? 'bg-amber-500' : 'bg-blue-600')}>
              <span className="text-white text-[8px] font-bold">AI</span>
            </div>
            <span className={clsx('text-xs font-semibold', msg.status === 'reply_failed' ? 'text-red-800' : ['reply_ready', 'test_ready'].includes(msg.status) ? 'text-amber-800' : 'text-blue-800')}>
              {msg.status === 'reply_failed' ? 'Reply Generated, Posting Failed' : ['reply_ready', 'test_ready'].includes(msg.status) ? 'Reply Generated, Not Posted' : 'Reply Sent'}
            </span>
          </div>
          <p className={clsx('text-xs leading-relaxed', msg.status === 'reply_failed' ? 'text-red-700' : ['reply_ready', 'test_ready'].includes(msg.status) ? 'text-amber-700' : 'text-blue-700')}>{msg.aiReply}</p>
          {msg.error && <p className={clsx('text-xs mt-2', msg.status === 'reply_failed' ? 'text-red-600' : 'text-amber-700')}>{msg.error}</p>}
        </div>
      )}
    </div>
  )
}

function PlatformSection({ platform, messages, onReply, isDM = false, isAdmin = true }) {
  const filtered = messages.filter(m => m.platform === platform && m.isDM === isDM)
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} size={16} connected={true} />
          <h3 className="text-slate-900 font-bold text-base">{PLATFORM_LABELS[platform]}</h3>
          <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-full">{filtered.length}</span>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <MessageCircle size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No {isDM ? 'DM' : 'comment'} messages yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => <MessageCard key={msg.id} msg={msg} onReply={onReply} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  )
}

function OverviewPanel({ messages, onRefresh, company }) {
  const [testing, setTesting] = useState(false)
  const PLATFORM_CONFIG = {
    instagram: { label: 'Instagram', color: '#E1306C', bg: '#FDE8F1' },
    facebook: { label: 'Facebook', color: '#1877F2', bg: '#E8F1FD' },
    youtube: { label: 'YouTube', color: '#FF0000', bg: '#FFE8E8' },
    whatsapp: { label: 'WhatsApp', color: '#25D366', bg: '#E8FBF0' },
  }

  const handleTestDM = async (platform) => {
    setTesting(true)
    try {
      await createTestDM(company.id, platform)
      await new Promise(r => setTimeout(r, 500))
      onRefresh?.()
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 font-bold text-2xl">Overview</h2>
          <p className="text-slate-500 text-sm mt-1">Choose a platform to inspect comments and DMs.</p>
        </div>
        <button onClick={() => handleTestDM('instagram')} disabled={testing} className="btn-secondary text-xs">
          {testing ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />} Test DM
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {PLATFORMS.map(platformKey => {
          const config = PLATFORM_CONFIG[platformKey]
          const platformMessages = messages.filter(m => m.platform === platformKey)
          const comments = platformMessages.filter(m => !m.isDM).length
          const dms = platformMessages.filter(m => m.isDM).length
          const total = comments + dms

          return (
            <div key={platformKey} className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                    <PlatformIcon platform={platformKey} size={22} connected={true} />
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold text-base">{config.label}</div>
                    <div className="text-slate-500 text-xs mt-1">{total} message{total === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div className={total > 0 ? 'text-emerald-600 text-xs font-bold' : 'text-slate-400 text-xs font-bold'}>
                  {total > 0 ? 'Active' : 'No messages'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div>
                  <div className="text-slate-900 text-lg font-bold">{comments}</div>
                  <div className="text-slate-400 text-xs">Comments</div>
                </div>
                <div>
                  <div className="text-slate-900 text-lg font-bold">{dms}</div>
                  <div className="text-slate-400 text-xs">Direct Messages</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BackfillPanel({ company, platform, onCompleted }) {
  const [selectedPlatform, setSelectedPlatform] = useState(platform || 'instagram')
  const [maxItems, setMaxItems] = useState(100)
  const [estimate, setEstimate] = useState(null)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const payload = { platform: selectedPlatform, maxItems: Number(maxItems || 100) }

  const handleEstimate = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await estimateBackfillReplies(company.id, payload)
      setEstimate(data)
    } catch (err) {
      setError(err.message || 'Could not estimate previous messages.')
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    if (confirm !== 'CONFIRM') return
    setRunning(true)
    setError('')
    try {
      const data = await runBackfillReplies(company.id, { ...payload, confirm })
      setResult(data)
      setConfirm('')
      onCompleted?.()
    } catch (err) {
      setError(err.message || 'Could not run previous-message replies.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-slate-900 font-bold text-sm">Previous Messages Reply Permission</div>
          <p className="text-slate-600 text-xs mt-1">
            Normal AI replies only answer messages after the activation start time. Use this paid/manual mode only when you approve old comments or DMs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Platform</label>
              <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} className="input-field bg-white">
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="all">All connected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max messages to reply</label>
              <input type="number" min="1" max="1000" value={maxItems} onChange={e => setMaxItems(e.target.value)} className="input-field bg-white" />
            </div>
            <div className="flex items-end">
              <button onClick={handleEstimate} disabled={loading} className="btn-secondary w-full justify-center">
                {loading ? <Loader size={14} className="animate-spin" /> : <Calculator size={14} />} Estimate
              </button>
            </div>
          </div>

          {estimate && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-white p-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><div className="text-slate-900 font-bold">{estimate.found}</div><div className="text-slate-400 text-xs">Old pending found</div></div>
                <div><div className="text-slate-900 font-bold">{estimate.selected}</div><div className="text-slate-400 text-xs">Selected replies</div></div>
                <div><div className="text-slate-900 font-bold">${estimate.estimate?.estimatedOpenaiUsd}</div><div className="text-slate-400 text-xs">Approx OpenAI cost</div></div>
                <div><div className="text-slate-900 font-bold">${estimate.estimate?.suggestedClientPriceUsd}</div><div className="text-slate-400 text-xs">Suggested client price</div></div>
              </div>
              <div className="text-slate-500 text-xs mt-3">
                Includes {estimate.comments} comment{estimate.comments === 1 ? '' : 's'} and {estimate.dms} DM{estimate.dms === 1 ? '' : 's'} in this selection.
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <input value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="Type CONFIRM to start replying" />
                <button onClick={handleRun} disabled={confirm !== 'CONFIRM' || running || !estimate.selected} className={clsx('btn-danger justify-center', (confirm !== 'CONFIRM' || running || !estimate.selected) && 'opacity-50 cursor-not-allowed')}>
                  {running ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Start Replies
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              Backfill started: AI processed {result.processed} previous message{result.processed === 1 ? '' : 's'}.
            </div>
          )}
          {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default function InboxTab({ company, platform, isAdmin = true }) {
  const [activeSection, setActiveSection] = useState('comments')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncedCount, setSyncedCount] = useState(0)
  const [autoRepliedCount, setAutoRepliedCount] = useState(0)
  const [syncWarnings, setSyncWarnings] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    fetchInbox(company.id, 'all')
      .then(data => {
        if (!alive) return
        setMessages((data.items || []).map(normalizeInboxItem))
        setSyncedCount(Number(data.synced || 0))
        setAutoRepliedCount(Number(data.autoReplied || 0))
        setSyncWarnings(data.syncErrors || [])
        setLastUpdated(new Date())
      })
      .catch(err => {
        if (!alive) return
        setError(err.message || 'Could not load inbox messages.')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [company.id])

  useEffect(() => {
    let cancelled = false
    let busy = false

    const refreshSaved = async () => {
      if (busy) return
      busy = true
      try {
        const data = await fetchInbox(company.id, 'all')
        if (cancelled) return
        setMessages((data.items || []).map(normalizeInboxItem))
        setLastUpdated(new Date())
      } catch {
        // Keep polling quiet so Inbox still feels instant, like a cached chat inbox.
      } finally {
        busy = false
      }
    }

    const timer = window.setInterval(refreshSaved, 6000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [company.id])

  const reloadInbox = async () => {
    const data = await fetchInbox(company.id, 'all')
    setMessages((data.items || []).map(normalizeInboxItem))
    setSyncedCount(Number(data.synced || 0))
    setAutoRepliedCount(Number(data.autoReplied || 0))
    setSyncWarnings(data.syncErrors || [])
    setLastUpdated(new Date())
  }

  const syncLiveMessages = async () => {
    setSyncing(true)
    setError('')
    try {
      const data = await fetchInbox(company.id, 'all', { sync: true })
      setMessages((data.items || []).map(normalizeInboxItem))
      setSyncedCount(Number(data.synced || 0))
      setAutoRepliedCount(Number(data.autoReplied || 0))
      setSyncWarnings(data.syncErrors || [])
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Could not sync live inbox messages.')
    } finally {
      setSyncing(false)
    }
  }

  const handleReply = async (msgId, text) => {
    const data = await replyToInboxItem(company.id, msgId, text)
    const updated = normalizeInboxItem(data.item)
    setMessages(msgs => msgs.map(msg => msg.id === msgId ? updated : msg))
  }

  const platformsToShow = platform ? [platform] : PLATFORMS
  const visibleMessages = useMemo(
    () => platform ? messages.filter(message => message.platform === platform) : messages,
    [messages, platform]
  )
  const commentCount = visibleMessages.filter(m => !m.isDM).length
  const dmCount = visibleMessages.filter(m => m.isDM).length
  const platformLabel = platform ? PLATFORM_LABELS[platform] : 'All Platforms'

  return (
    <div className="space-y-6 animate-slide-in">
      {!loading && !platform && <OverviewPanel messages={messages} company={company} onRefresh={reloadInbox} />}

      {!loading && isAdmin && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="text-slate-900 text-sm font-bold">Inbox updates in the background</div>
            <div className="text-slate-500 text-xs mt-0.5">
              Cached messages load instantly. New webhook messages appear automatically; Instagram DMs can auto-reply in Development Mode for accepted Meta test users.
              {lastUpdated && ` Last updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`}
            </div>
          </div>
          <button onClick={syncLiveMessages} disabled={syncing} className="btn-secondary justify-center flex-shrink-0">
            {syncing ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync now
          </button>
        </div>
      )}

      {!loading && isAdmin && (
        <BackfillPanel company={company} platform={platform} onCompleted={reloadInbox} />
      )}

      {!loading && !platform && syncedCount > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Synced {syncedCount} new message{syncedCount === 1 ? '' : 's'} from connected accounts.
          {autoRepliedCount > 0 && ` AI replied to ${autoRepliedCount}.`}
        </div>
      )}
      {!loading && !platform && syncWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Some inbox data could not sync from Meta: {syncWarnings.slice(0, 2).map(formatSyncWarning).join(' · ')}
        </div>
      )}

      {!loading && platform && (
        <>
          <SectionHeader title={`${platformLabel} Inbox`} description={`View ${platformLabel} comments and DMs only.`} action={
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {[['comments', `Comments (${commentCount})`], ['dms', `DMs (${dmCount})`]].map(([v, l]) => (
                <button key={v} onClick={() => setActiveSection(v)} className={clsx('px-4 py-2 rounded-md text-xs font-semibold cursor-pointer', activeSection === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {l}
                </button>
              ))}
            </div>
          } />

          {!loading && syncedCount > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Synced {syncedCount} new message{syncedCount === 1 ? '' : 's'} from connected accounts.
              {autoRepliedCount > 0 && ` AI replied to ${autoRepliedCount}.`}
            </div>
          )}
          {!loading && syncWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Some inbox data could not sync from Meta: {syncWarnings.slice(0, 2).map(formatSyncWarning).join(' · ')}
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name or content…" className="input-field pl-9 w-full" />
            </div>
            <button className="btn-secondary"><Filter size={14} /> Filter</button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {activeSection === 'comments' ? (
            <div>
              <h2 className="text-slate-900 font-bold text-lg mb-4">{platformLabel} Comments</h2>
              <div className="space-y-6">
                <PlatformSection platform={platform} messages={messages} onReply={handleReply} isDM={false} isAdmin={isAdmin} />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-slate-900 font-bold text-lg mb-4">{platformLabel} Direct Messages</h2>
              <div className="space-y-6">
                <PlatformSection platform={platform} messages={messages} onReply={handleReply} isDM={true} isAdmin={isAdmin} />
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader size={28} className="animate-spin text-blue-600" />
        </div>
      )}
    </div>
  )
}
