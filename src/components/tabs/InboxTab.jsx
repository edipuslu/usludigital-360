import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Send, Search, Filter, Heart, MessageSquare, Calendar, User, ExternalLink, Loader } from 'lucide-react'
import { PlatformIcon, SectionHeader } from '../ui/UIKit'
import { fetchInbox } from '../../lib/backendApi'
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

function MessageCard({ msg, onReply, isReply = false, isAdmin = true }) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSendReply = async () => {
    if (!replyText.trim()) return
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    onReply(msg.id, replyText)
    setReplyText('')
    setSending(false)
    setShowReplyBox(false)
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
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">AI</span>
            </div>
            <span className="text-blue-800 text-xs font-semibold">AI Reply Sent</span>
          </div>
          <p className="text-blue-700 text-xs leading-relaxed">{msg.aiReply}</p>
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

export default function InboxTab({ company, platform, isAdmin = true }) {
  const [activeSection, setActiveSection] = useState('comments')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    fetchInbox(company.id, 'all')
      .then(data => {
        if (!alive) return
        setMessages((data.items || []).map(normalizeInboxItem))
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

  const handleReply = (msgId, text) => {
    setMessages(msgs => msgs.map(msg => msg.id === msgId ? { ...msg, aiReplied: true, aiReply: text } : msg))
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
      <SectionHeader title={platform ? `${platformLabel} Inbox` : 'Inbox & Messages'} description={platform ? `View ${platformLabel} comments and DMs only.` : 'View and reply to comments and DMs from all connected platforms'} action={
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {[['comments', `Comments (${commentCount})`], ['dms', `DMs (${dmCount})`]].map(([v, l]) => (
            <button key={v} onClick={() => setActiveSection(v)} className={clsx('px-4 py-2 rounded-md text-xs font-semibold cursor-pointer', activeSection === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {l}
            </button>
          ))}
        </div>
      } />
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
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader size={28} className="animate-spin text-blue-600" />
        </div>
      )}
      {!loading && <div>
        {activeSection === 'comments' ? (
          <div>
            <h2 className="text-slate-900 font-bold text-lg mb-4">{platform ? `${platformLabel} Comments` : 'All Comments'}</h2>
            <div className="grid grid-cols-1 gap-6">
              {platformsToShow.map(platformKey => <PlatformSection key={platformKey} platform={platformKey} messages={messages} onReply={handleReply} isDM={false} isAdmin={isAdmin} />)}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-slate-900 font-bold text-lg mb-4">{platform ? `${platformLabel} Direct Messages` : 'Direct Messages'}</h2>
            <div className="grid grid-cols-1 gap-6">
              {platformsToShow.map(platformKey => <PlatformSection key={platformKey} platform={platformKey} messages={messages} onReply={handleReply} isDM={true} isAdmin={isAdmin} />)}
            </div>
          </div>
        )}
      </div>}
    </div>
  )
}
