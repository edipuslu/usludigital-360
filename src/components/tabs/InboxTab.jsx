import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Send, Search, Filter, Heart, MessageSquare, Calendar, User, ExternalLink, AlertTriangle, Calculator, RefreshCw, Plus, Settings, Archive, Clock } from 'lucide-react'
import { PlatformIcon, UsluLoader } from '../ui/UIKit'
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
                  {sending ? <UsluLoader size="xs" /> : <Send size={12} />}
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

function EmptyInboxArt() {
  return (
    <div className="relative mx-auto h-60 w-64">
      <div className="absolute left-10 top-16 h-28 w-24 bg-cyan-300" />
      <div className="absolute left-10 top-16 grid h-28 w-24 grid-cols-2 grid-rows-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={i % 2 === 0 ? 'bg-cyan-300' : 'bg-pink-700'} />
        ))}
      </div>
      <div className="absolute left-24 top-10 h-24 w-40 rounded-[48px] bg-pink-700" />
      <div className="absolute left-28 top-24 h-24 w-36 rounded-[36px] bg-pink-700" />
      <div className="absolute left-20 top-[120px] h-16 w-28 rounded-[40px] bg-fuchsia-500" />
      <div className="absolute left-28 top-20 h-28 w-20 bg-white [clip-path:polygon(18%_0,80%_0,80%_100%,42%_88%,32%_56%,0_42%)]" />
      <div className="absolute left-[120px] top-24 h-20 w-16 bg-cyan-300 [clip-path:polygon(0_0,100%_0,100%_100%,0_78%)]" />
      <div className="absolute left-44 top-20 space-y-4">
        <div className="h-4 w-24 bg-cyan-300" />
        <div className="h-4 w-24 bg-cyan-300" />
        <div className="h-4 w-24 bg-cyan-300" />
      </div>
    </div>
  )
}

function ConversationListItem({ msg, active, selected, onClick, onToggleSelect }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full gap-3 border-b border-slate-200 px-4 py-4 text-left transition-colors hover:bg-slate-50',
        active && 'bg-slate-100'
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={e => {
          e.stopPropagation()
          onToggleSelect?.()
        }}
        onClick={e => e.stopPropagation()}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
        <User size={17} className="text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-bold text-slate-900">{msg.authorName}</div>
          <div className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-400">
            <PlatformIcon platform={msg.platform} size={12} connected={true} />
            {msg.date}
          </div>
        </div>
        <div className="mt-1 truncate text-sm text-slate-500">{msg.content || 'No message text'}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className={clsx('rounded px-2 py-0.5 text-[10px] font-bold uppercase', msg.isDM ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600')}>
            {msg.isDM ? 'DM' : 'Comment'}
          </span>
          {msg.aiReplied && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">AI replied</span>}
          {msg.status === 'reply_failed' && <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Failed</span>}
        </div>
      </div>
    </button>
  )
}

function OverviewPanel({ messages, onRefresh, company }) {
  const [testing, setTesting] = useState(false)
  const PLATFORM_CONFIG = {
    instagram: { label: 'Instagram', color: '#f42582', bg: '#FDE8F1' },
    facebook: { label: 'Facebook', color: '#255ff4', bg: '#E8F1FD' },
    youtube: { label: 'YouTube', color: '#f42f25', bg: '#FFE8E8' },
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
          {testing ? <UsluLoader size="xs" /> : <Plus size={12} />} Test DM
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
                {loading ? <UsluLoader size="xs" /> : <Calculator size={14} />} Estimate
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
                  {running ? <UsluLoader size="xs" /> : <Send size={14} />} Start Replies
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
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncedCount, setSyncedCount] = useState(0)
  const [autoRepliedCount, setAutoRepliedCount] = useState(0)
  const [syncWarnings, setSyncWarnings] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [sortOrder, setSortOrder] = useState('newest')
  const [channelFilter, setChannelFilter] = useState(platform || 'all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedMessageId, setSelectedMessageId] = useState(null)

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

  const visibleMessages = useMemo(() => {
    const term = search.trim().toLowerCase()
    return messages
      .filter(message => !platform || message.platform === platform)
      .filter(message => channelFilter === 'all' || message.platform === channelFilter)
      .filter(message => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'replied') return message.aiReplied
        if (statusFilter === 'failed') return message.status === 'reply_failed'
        return message.status !== 'closed'
      })
      .filter(message => !onlyUnread || !message.aiReplied)
      .filter(message => labelFilter !== 'favorites' || message.likes > 0)
      .filter(message => labelFilter !== 'reminders' || message.status === 'reply_failed')
      .filter(message => !term || `${message.authorName} ${message.content} ${message.aiReply}`.toLowerCase().includes(term))
      .sort((a, b) => {
        const aTime = new Date(a.date).getTime() || 0
        const bTime = new Date(b.date).getTime() || 0
        return sortOrder === 'newest' ? bTime - aTime : aTime - bTime
      })
  }, [messages, platform, channelFilter, statusFilter, onlyUnread, labelFilter, search, sortOrder])

  const commentCount = visibleMessages.filter(m => !m.isDM).length
  const dmCount = visibleMessages.filter(m => m.isDM).length
  const failedCount = messages.filter(m => m.status === 'reply_failed').length
  const favoritesCount = messages.filter(m => m.likes > 0).length
  const selectedMessage = visibleMessages.find(message => message.id === selectedMessageId) || null
  const allVisibleSelected = visibleMessages.length > 0 && visibleMessages.every(message => selectedIds.includes(message.id))

  useEffect(() => {
    if (!visibleMessages.length) {
      setSelectedMessageId(null)
      return
    }
    if (!selectedMessageId || !visibleMessages.some(message => message.id === selectedMessageId)) {
      setSelectedMessageId(visibleMessages[0].id)
    }
  }, [visibleMessages, selectedMessageId])

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(ids => ids.filter(id => !visibleMessages.some(message => message.id === id)))
      return
    }
    setSelectedIds(ids => Array.from(new Set([...ids, ...visibleMessages.map(message => message.id)])))
  }

  const toggleSelected = id => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(existing => existing !== id) : [...ids, id])
  }

  const handleTestDM = async platformKey => {
    setSyncing(true)
    setError('')
    try {
      await createTestDM(company.id, platformKey)
      await reloadInbox()
    } catch (err) {
      setError(err.message || 'Could not create test DM.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="animate-slide-in">
      <div className="-mx-8 -mt-8 grid grid-cols-1 items-center gap-4 border-b border-slate-200 bg-slate-50 px-8 py-5 lg:grid-cols-[260px_1fr_auto]">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Inbox</h1>
        <div className="relative mx-auto w-full max-w-xl">
          <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            placeholder="Search through Inbox conversations"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(value => !value)}
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          title="Inbox settings"
        >
          <Settings size={22} />
        </button>
      </div>

      {(error || syncWarnings.length > 0 || syncedCount > 0) && (
        <div className="space-y-2 border-b border-slate-200 bg-white px-4 py-3">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
          {syncedCount > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Synced {syncedCount} new message{syncedCount === 1 ? '' : 's'} from connected accounts.
              {autoRepliedCount > 0 && ` AI replied to ${autoRepliedCount}.`}
            </div>
          )}
          {syncWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Some inbox data could not sync from Meta: {syncWarnings.slice(0, 2).map(formatSyncWarning).join(' · ')}
            </div>
          )}
        </div>
      )}

      <div className="-mx-8 grid min-h-[calc(100vh-137px)] grid-cols-1 bg-white lg:grid-cols-[300px_420px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-50/70 p-5">
          <button
            type="button"
            onClick={() => setLabelFilter('all')}
            className={clsx('mb-2 flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold', labelFilter === 'all' ? 'bg-slate-200 text-slate-950' : 'text-slate-600 hover:bg-slate-100')}
          >
            <span className="flex items-center gap-2"><Archive size={17} /> All chats</span>
            <span className="text-slate-400">{messages.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setLabelFilter('reminders')}
            className={clsx('mb-7 flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold', labelFilter === 'reminders' ? 'bg-slate-200 text-slate-950' : 'text-slate-600 hover:bg-slate-100')}
          >
            <span className="flex items-center gap-2"><Clock size={17} /> Reminders</span>
            <span className="text-slate-400">{failedCount}</span>
          </button>

          <div className="mb-3 flex items-center justify-between px-3 text-sm font-semibold text-slate-500">
            <span>Labels</span>
            <Plus size={16} />
          </div>
          <button
            type="button"
            onClick={() => setLabelFilter('favorites')}
            className={clsx('flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-bold', labelFilter === 'favorites' ? 'bg-slate-200 text-slate-950' : 'text-slate-600 hover:bg-slate-100')}
          >
            <span className="flex items-center gap-2"><Heart size={17} className="text-red-500" /> Favorites</span>
            <span className="text-slate-400">{favoritesCount}</span>
          </button>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
            <div className="font-bold text-slate-800">Live inbox</div>
            <div className="mt-1">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Waiting for first sync'}
            </div>
            {isAdmin && (
              <button onClick={syncLiveMessages} disabled={syncing} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                {syncing ? <UsluLoader size="xs" /> : <RefreshCw size={13} />} Sync now
              </button>
            )}
          </div>
        </aside>

        <section className="border-r border-slate-200">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-4">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="mr-2 h-5 w-5 rounded border-slate-300" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <option value="open">Open Chats</option>
              <option value="all">All Chats</option>
              <option value="replied">AI Replied</option>
              <option value="failed">Failed</option>
            </select>
            <button
              type="button"
              onClick={() => setOnlyUnread(value => !value)}
              className={clsx('h-10 rounded-lg border px-4 text-sm font-semibold', onlyUnread ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
            >
              Unread
            </button>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
            </select>
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} disabled={Boolean(platform)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-60">
              <option value="all">All Channels</option>
              {PLATFORMS.map(item => <option key={item} value={item}>{PLATFORM_LABELS[item]}</option>)}
            </select>
            <button type="button" onClick={() => setShowFilters(value => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Filter size={15} /> Filter
            </button>
          </div>

          {showFilters && (
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              {isAdmin && <BackfillPanel company={company} platform={platform} onCompleted={reloadInbox} />}
              {isAdmin && (
                <button onClick={() => handleTestDM(platform || 'instagram')} disabled={syncing} className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                  {syncing ? <UsluLoader size="xs" /> : <Plus size={14} />} Test DM
                </button>
              )}
            </div>
          )}

          <div className="h-[calc(100vh-215px)] overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <UsluLoader size="lg" />
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="text-lg font-bold text-slate-900">No opened conversations</div>
                <button type="button" onClick={() => setStatusFilter('all')} className="mt-8 text-sm font-bold text-blue-600 hover:text-blue-700">
                  Go To Closed Conversations
                </button>
              </div>
            ) : (
              visibleMessages.map(message => (
                <ConversationListItem
                  key={message.id}
                  msg={message}
                  active={selectedMessageId === message.id}
                  selected={selectedIds.includes(message.id)}
                  onClick={() => setSelectedMessageId(message.id)}
                  onToggleSelect={() => toggleSelected(message.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="min-h-full">
          {selectedMessage ? (
            <div className="mx-auto max-w-3xl p-8">
              <MessageCard msg={selectedMessage} onReply={handleReply} isAdmin={isAdmin} />
            </div>
          ) : (
            <div className="flex h-full min-h-[620px] flex-col items-center justify-center px-8 text-center">
              <h2 className="max-w-md text-xl font-bold text-slate-900">
                {messages.length === 0 ? 'Send a message to your bot to try Inbox' : 'Select a conversation to view details'}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                Comments and DMs from connected channels appear here and update automatically.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTestDM(platform || 'instagram')}
                  disabled={syncing}
                  className="mt-6 inline-flex h-12 items-center gap-3 rounded-lg bg-slate-100 px-5 text-sm font-bold text-slate-900 hover:bg-slate-200 disabled:opacity-50"
                >
                  <PlatformIcon platform={platform || 'instagram'} size={22} connected={true} />
                  {PLATFORM_LABELS[platform || 'instagram']}
                  <span className="text-blue-600">{syncing ? 'Opening...' : 'Open'}</span>
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
