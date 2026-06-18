import { useEffect, useState } from 'react'
import { X, ExternalLink, ChevronRight, Copy, CheckCircle2, AlertCircle, Link2, Info, Server, KeyRound, Bot, Database, LogIn, Loader } from 'lucide-react'
import { PlatformIcon, SectionHeader } from '../ui/UIKit'
import { backendUrl, deleteConnection, getConnections, registerConnection, saveBackendAiConfig } from '../../lib/backendApi'
import clsx from 'clsx'

const PLATFORM_GUIDES = {
  instagram: {
    name: 'Instagram',
    color: '#E1306C',
    bg: '#FDE8F1',
    subtitle: 'Instagram Graph API via Meta for Developers',
    fields: [
      { key: 'pageId', label: 'Instagram Business Account ID', placeholder: '17841400123456789', type: 'text' },
      { key: 'accessToken', label: 'Page Access Token (Long-lived)', placeholder: 'EAABs...long token...', type: 'password' },
    ],
    steps: [
      {
        num: 1,
        title: 'Create or Open Meta Developer App',
        description: 'Go to Meta for Developers, open My Apps, and create a Business app for this company connection.',
        link: { label: 'Open Meta for Developers', url: 'https://developers.facebook.com' },
        note: 'This is only the Meta app. Real auto-replies also need the backend webhook steps below.',
      },
      {
        num: 2,
        title: 'Connect Instagram to a Facebook Page',
        description: 'The Instagram account must be Business or Creator and linked to a Facebook Page. Personal Instagram accounts cannot be used for auto-reply.',
        note: 'This is required because Instagram comment webhooks and replies go through Meta business assets.',
      },
      {
        num: 3,
        title: 'Add Webhooks Product',
        description: 'Inside the Meta app, add Webhooks. The app must call your backend callback URL whenever Instagram comments arrive.',
      },
      {
        num: 4,
        title: 'Add Backend Callback URL',
        description: 'Paste your backend URL, for example https://api.yourdomain.com/meta/webhook, and set a verify token. Meta will verify this URL before sending events.',
        note: 'This dashboard cannot receive live comments by itself. A deployed backend endpoint is required.',
      },
      {
        num: 5,
        title: 'Subscribe to Comment Events',
        description: 'Subscribe the app to Instagram comment-related webhook events for the connected business/page asset. This is what triggers the AI when a new comment appears.',
      },
      {
        num: 6,
        title: 'Get Long-Lived Access Token',
        description: 'Use Graph API Explorer or OAuth to generate a long-lived token with permissions to read comments and publish replies.',
        link: { label: 'Open Graph API Explorer', url: 'https://developers.facebook.com/tools/explorer' },
        note: 'In production, OAuth should collect and refresh tokens automatically instead of manually pasting tokens.',
      },
      {
        num: 7,
        title: 'Connect AI Reply Engine',
        description: 'The backend receives the comment webhook, sends the comment plus company training context to the AI model, then posts the generated reply back to Instagram.',
      },
      {
        num: 8,
        title: 'Paste Temporary Credentials Below',
        description: 'For this prototype, paste the Instagram Business Account ID and token below. For the real product, these should be saved by OAuth and encrypted on the backend.',
      },
    ],
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    bg: '#E8F1FD',
    subtitle: 'Facebook Page API via Meta for Developers',
    fields: [
      { key: 'pageId', label: 'Facebook Page ID', placeholder: '123456789012345', type: 'text' },
      { key: 'accessToken', label: 'Page Access Token (Long-lived)', placeholder: 'EAABs...long token...', type: 'password' },
    ],
    steps: [
      {
        num: 1,
        title: 'Create a Meta Developer Account',
        description: 'Go to Meta for Developers and log in with your Facebook account.',
        link: { label: 'Open Meta for Developers', url: 'https://developers.facebook.com' },
      },
      {
        num: 2,
        title: 'Create a New App',
        description: 'Click "My Apps" → "Create App" → Select "Business" as the app type → Name it and click "Create App".',
        note: 'Use the same app you created for Instagram if you already did Step 1 of the Instagram guide.',
      },
      {
        num: 3,
        title: 'Add Webhooks Product',
        description: 'In your app dashboard, add Webhooks and connect it to your backend callback URL.',
      },
      {
        num: 4,
        title: 'Subscribe to Page Comment Events',
        description: 'Subscribe the Facebook Page to feed/comment-related webhook events. New comments will be sent to your backend.',
        note: 'Without webhook subscription, the AI will not know when a new Facebook comment arrives.',
      },
      {
        num: 5,
        title: 'Generate a Page Access Token',
        description: 'Generate a long-lived Page token with permissions to read page engagement and publish comment replies.',
        link: { label: 'Open Graph API Explorer', url: 'https://developers.facebook.com/tools/explorer' },
      },
      {
        num: 6,
        title: 'Connect AI Reply Engine',
        description: 'The backend receives the Facebook comment webhook, asks the AI for the safest reply, then posts that reply back to the comment thread.',
      },
      {
        num: 7,
        title: 'Paste Credentials Below',
        description: 'Enter your Facebook Page ID and long-lived Page Access Token below for prototype testing. In production, OAuth should handle this.',
      },
    ],
  },
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    bg: '#FFE8E8',
    subtitle: 'YouTube Data API v3 via Google Cloud Console',
    fields: [
      { key: 'channelId', label: 'YouTube Channel ID', placeholder: 'UCxxxxxxxxxxxxxxxxxxxxxx', type: 'text' },
      { key: 'apiKey', label: 'YouTube Data API Key', placeholder: 'AIzaSy...', type: 'password' },
    ],
    steps: [
      {
        num: 1,
        title: 'Open Google Cloud Console',
        description: 'Go to Google Cloud Console and sign in with the Google account that owns your YouTube channel.',
        link: { label: 'Open Google Cloud Console', url: 'https://console.cloud.google.com' },
      },
      {
        num: 2,
        title: 'Create a New Project',
        description: 'Click the project dropdown at the top → "New Project" → Name it (e.g. "Usludigital Bot") → Click "Create".',
      },
      {
        num: 3,
        title: 'Enable YouTube Data API v3',
        description: 'In the left menu, go to "APIs & Services" → "Library". Search for "YouTube Data API v3" → Click on it → Click "Enable".',
        link: { label: 'Open API Library', url: 'https://console.cloud.google.com/apis/library' },
      },
      {
        num: 4,
        title: 'Create an API Key',
        description: 'Go to "APIs & Services" → "Credentials" → "Create Credentials" → "API Key". Copy the key that appears.',
        link: { label: 'Open Credentials', url: 'https://console.cloud.google.com/apis/credentials' },
        note: 'Optionally restrict the key to "YouTube Data API v3" under "API restrictions" for security.',
      },
      {
        num: 5,
        title: 'Find Your Channel ID',
        description: 'Go to YouTube → Click your profile photo → "Your channel". Look at the URL: youtube.com/channel/UCxxxxxx — the part after /channel/ is your Channel ID.',
        note: 'If your URL shows a custom name like youtube.com/@YourName, go to: youtube.com/account_advanced to find your numeric Channel ID.',
        link: { label: 'Find Channel ID', url: 'https://www.youtube.com/account_advanced' },
      },
      {
        num: 6,
        title: 'Paste Credentials Below',
        description: 'Enter your Channel ID (starts with UC...) and the API Key in the fields below.',
        note: 'YouTube only supports comment replies, not DMs. DM Auto-Reply will be disabled for this platform.',
      },
    ],
  },
  whatsapp: {
    name: 'WhatsApp Business',
    color: '#25D366',
    bg: '#E8FBF0',
    subtitle: 'WhatsApp Business API via Meta for Developers',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '123456789012345', type: 'text' },
      { key: 'accessToken', label: 'Permanent System User Token', placeholder: 'EAABs...long token...', type: 'password' },
      { key: 'whatsappLink', label: 'WhatsApp Click Link (wa.me)', placeholder: 'https://wa.me/905XXXXXXXXX', type: 'text' },
    ],
    steps: [
      {
        num: 1,
        title: 'Create a Meta Developer Account & App',
        description: 'Go to Meta for Developers → "My Apps" → "Create App" → Select "Business" → Name it → Click "Create App".',
        link: { label: 'Open Meta for Developers', url: 'https://developers.facebook.com' },
        note: 'You can use the same app as Instagram/Facebook if you already created one.',
      },
      {
        num: 2,
        title: 'Add WhatsApp Product',
        description: 'Inside your app, click "Add Product" → Find "WhatsApp" → Click "Set Up".',
      },
      {
        num: 3,
        title: 'Connect a WhatsApp Business Account',
        description: 'In the WhatsApp "Getting Started" section, click "Add phone number" or select an existing WhatsApp Business number. Follow the verification steps (you\'ll receive a code via WhatsApp).',
        note: 'You need a WhatsApp Business account, not a regular WhatsApp. Download the WhatsApp Business app first if you haven\'t already.',
      },
      {
        num: 4,
        title: 'Get Your Phone Number ID',
        description: 'After adding your number, you will see it listed under "API Setup". Click on your number — the "Phone number ID" is shown there. Copy it.',
        note: 'The Phone Number ID is NOT your phone number. It\'s a long numeric ID like 123456789012345.',
      },
      {
        num: 5,
        title: 'Create a Permanent System User Token',
        description: 'Go to your Meta Business Suite → Settings → Users → System Users → "Add". Create a system user → Click "Generate New Token" → Select your WhatsApp App → Grant "whatsapp_business_messaging" permission → Copy the token.',
        link: { label: 'Open Business Settings', url: 'https://business.facebook.com/settings/system-users' },
        note: 'Do NOT use the temporary token from "Getting Started" — it expires in 24 hours. Always use a System User token.',
      },
      {
        num: 6,
        title: 'Create Your wa.me Link',
        description: 'Your WhatsApp click link format is: https://wa.me/COUNTRYCODE+PHONENUMBER. Example for Turkey: https://wa.me/905321234567 (no + or spaces). This link will be included in every AI reply.',
      },
      {
        num: 7,
        title: 'Paste Credentials Below',
        description: 'Enter your Phone Number ID, the permanent System User Token, and your wa.me link in the fields below.',
      },
    ],
  },
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
      {copied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
      <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

const GRAPH_BASE_URL = 'https://graph.facebook.com/v20.0'

async function fetchJson(url, errorPrefix) {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))

  if (!res.ok || data?.error) {
    const message = data?.error?.message || `HTTP ${res.status}`
    throw new Error(`${errorPrefix}: ${message}`)
  }

  return data
}

function looksLikeMetaToken(token) {
  return /^EA[A-Za-z0-9_-]{20,}$/.test(token.trim())
}

function ensureNumericId(value, label) {
  const id = value.trim()
  if (!/^\d{8,}$/.test(id)) {
    throw new Error(`${label} must be the numeric ID from Meta, not a username or page URL.`)
  }
  return id
}

function ensureYouTubeChannelId(value) {
  const id = value.trim()
  if (!/^UC[A-Za-z0-9_-]{10,}$/.test(id)) {
    throw new Error('YouTube Channel ID must start with UC. A @handle or channel URL is not enough.')
  }
  return id
}

function ensureWaMeLink(value) {
  const link = value.trim()
  if (!/^https:\/\/wa\.me\/\d{8,15}$/.test(link)) {
    throw new Error('WhatsApp link must look like https://wa.me/905321234567 with no +, spaces, or dashes.')
  }
  return link
}

async function verifyPlatformCredentials(platform, creds) {
  if (platform === 'instagram') {
    const pageId = ensureNumericId(creds.pageId || '', 'Instagram Business Account ID')
    const accessToken = (creds.accessToken || '').trim()

    if (!looksLikeMetaToken(accessToken)) {
      throw new Error('Access token does not look like a Meta long-lived token. It usually starts with EA...')
    }

    const data = await fetchJson(
      `${GRAPH_BASE_URL}/${pageId}?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`,
      'Instagram verification failed'
    )

    if (String(data.id) !== pageId) {
      throw new Error('The token responded, but it did not match this Instagram Business Account ID.')
    }

    return { id: data.id, name: data.username || data.name || `Instagram ${data.id}` }
  }

  if (platform === 'facebook') {
    const pageId = ensureNumericId(creds.pageId || '', 'Facebook Page ID')
    const accessToken = (creds.accessToken || '').trim()

    if (!looksLikeMetaToken(accessToken)) {
      throw new Error('Access token does not look like a Meta Page token. It usually starts with EA...')
    }

    const data = await fetchJson(
      `${GRAPH_BASE_URL}/${pageId}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
      'Facebook verification failed'
    )

    if (String(data.id) !== pageId) {
      throw new Error('The token responded, but it did not match this Facebook Page ID.')
    }

    return { id: data.id, name: data.name || `Facebook Page ${data.id}` }
  }

  if (platform === 'whatsapp') {
    const phoneNumberId = ensureNumericId(creds.phoneNumberId || '', 'Phone Number ID')
    const accessToken = (creds.accessToken || '').trim()
    const whatsappLink = ensureWaMeLink(creds.whatsappLink || '')

    if (!looksLikeMetaToken(accessToken)) {
      throw new Error('Access token does not look like a Meta System User token. It usually starts with EA...')
    }

    const data = await fetchJson(
      `${GRAPH_BASE_URL}/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${encodeURIComponent(accessToken)}`,
      'WhatsApp verification failed'
    )

    if (String(data.id) !== phoneNumberId) {
      throw new Error('The token responded, but it did not match this WhatsApp Phone Number ID.')
    }

    return { id: data.id, name: data.verified_name || data.display_phone_number || whatsappLink }
  }

  if (platform === 'youtube') {
    const channelId = ensureYouTubeChannelId(creds.channelId || '')
    const apiKey = (creds.apiKey || '').trim()

    if (!/^AIza[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
      throw new Error('YouTube API key should start with AIza and come from Google Cloud Console.')
    }

    const data = await fetchJson(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`,
      'YouTube verification failed'
    )

    if (!data.items?.length) {
      throw new Error('The API key worked, but this Channel ID was not found.')
    }

    return { id: channelId, name: data.items[0]?.snippet?.title || channelId }
  }

  throw new Error('Unsupported platform.')
}

function ConnectionGuideModal({ platform, guide, onClose, onSave, existingCredentials }) {
  const [creds, setCreds] = useState(existingCredentials || {})
  const [saving, setSaving] = useState(false)
  const [showTokens, setShowTokens] = useState({})
  const [verification, setVerification] = useState({ status: 'idle', message: '', accountName: '' })

  const handleSave = async () => {
    const allFilled = guide.fields.every(f => creds[f.key]?.trim())
    if (!allFilled) return
    setSaving(true)
    setVerification({ status: 'testing', message: '', accountName: '' })
    try {
      const result = await verifyPlatformCredentials(platform, creds)
      setVerification({
        status: 'valid',
        message: `Verified ${result.name}. This token can access this exact account ID.`,
        accountName: result.name,
      })
      await onSave(creds, result)
      onClose()
    } catch (err) {
      setVerification({
        status: 'invalid',
        message: err.message || 'Verification failed. Check the ID, token, and permissions.',
        accountName: '',
      })
    } finally {
      setSaving(false)
    }
  }

  const allFilled = guide.fields.every(f => creds[f.key]?.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: guide.bg }}>
              <PlatformIcon platform={platform} size={22} connected={true} />
            </div>
            <div>
              <div className="text-slate-900 font-bold text-base">Connect {guide.name}</div>
              <div className="text-slate-500 text-xs">{guide.subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-blue-800 text-sm leading-relaxed">
              Follow the steps below to get your API credentials. This is a one-time setup. Your credentials are stored securely and never shared.
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {guide.steps.map((step, i) => (
              <div key={step.num} className="flex gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: guide.color }}
                  >
                    {step.num}
                  </div>
                  {i < guide.steps.length - 1 && (
                    <div className="w-px h-full ml-3.5 mt-2 bg-slate-200 min-h-[16px]" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="text-slate-900 font-semibold text-sm mb-1">{step.title}</div>
                  <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                  {step.note && (
                    <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-amber-800 text-xs leading-relaxed">{step.note}</span>
                    </div>
                  )}
                  {step.link && (
                    <a
                      href={step.link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-blue-600 hover:text-blue-700 text-xs font-semibold cursor-pointer"
                    >
                      {step.link.label} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Credentials Input */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-slate-900 font-bold text-sm mb-4 flex items-center gap-2">
              <Link2 size={14} className="text-slate-400" />
              Enter Your Credentials
            </h3>
            <div className="space-y-4">
              {guide.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.type === 'password' && !showTokens[field.key] ? 'password' : 'text'}
                      value={creds[field.key] || ''}
                      onChange={e => {
                        setCreds(c => ({ ...c, [field.key]: e.target.value }))
                        setVerification({ status: 'idle', message: '', accountName: '' })
                      }}
                      placeholder={field.placeholder}
                      className={clsx(
                        'input-field pr-16',
                        verification.status === 'invalid' && 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => setShowTokens(s => ({ ...s, [field.key]: !s[field.key] }))}
                          className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                        >
                          {showTokens[field.key] ? 'Hide' : 'Show'}
                        </button>
                      )}
                      {creds[field.key] && <CopyButton text={creds[field.key]} />}
                    </div>
                  </div>
                </div>
              ))}
              {verification.status === 'invalid' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-red-800 text-xs font-semibold">Not verified</div>
                    <div className="text-red-700 text-xs leading-relaxed mt-0.5">{verification.message}</div>
                  </div>
                </div>
              )}
              {verification.status === 'valid' && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 size={14} /> {verification.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!allFilled || saving}
            className={clsx('btn-primary', (!allFilled || saving) && 'opacity-50 cursor-not-allowed')}
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</>
            ) : (
              <><CheckCircle2 size={14} />Save & Verify Connection</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlatformCard({ platform, guide, data, backendConnections = [], onConnect, onOAuthLogin, onDisconnect }) {
  const [showGuide, setShowGuide] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  const primaryBackendConnection = backendConnections[0]
  const isConnected = !!data?.connected || backendConnections.length > 0
  const connectedHandle = primaryBackendConnection?.handle || data?.handle
  const supportsOAuth = platform === 'instagram' || platform === 'facebook'

  const handleSave = (creds, verification) => {
    onConnect(platform, creds, verification)
  }

  const handleOAuthLogin = () => {
    setOauthLoading(true)
    onOAuthLogin(platform)
  }

  const borderColor = {
    instagram: 'hover:border-pink-200',
    facebook: 'hover:border-blue-200',
    youtube: 'hover:border-red-200',
    whatsapp: 'hover:border-green-200',
  }[platform]

  return (
    <>
      <div className={clsx('card p-6 transition-all duration-200', borderColor, isConnected && 'border-emerald-200 bg-emerald-50/20')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: guide.bg }}>
              <PlatformIcon platform={platform} size={24} connected={true} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <span className="text-slate-900 font-bold text-base">{guide.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className={clsx('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-slate-300')} />
                  <span className={clsx('text-xs font-medium', isConnected ? 'text-emerald-600' : 'text-slate-400')}>
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <p className="text-slate-400 text-xs">{guide.subtitle}</p>
            </div>
          </div>
          {isConnected ? (
            <button
              onClick={() => onDisconnect(platform)}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 cursor-pointer transition-colors font-medium"
            >
              Disconnect
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {supportsOAuth && (
                <button
                  type="button"
                  onClick={handleOAuthLogin}
                  disabled={oauthLoading}
                  className="h-9 inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white cursor-pointer disabled:opacity-60 transition-colors"
                  style={{ background: guide.color }}
                >
                  {oauthLoading ? <Loader size={13} className="animate-spin" /> : <LogIn size={13} />}
                  Login
                </button>
              )}
              {!supportsOAuth && (
                <button
                  onClick={() => setShowGuide(true)}
                  className="btn-primary text-xs py-1.5"
                  style={{ background: guide.color }}
                >
                  Connect
                </button>
              )}
            </div>
          )}
        </div>

        {isConnected ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <div className="text-emerald-800 font-semibold text-sm">Successfully Connected</div>
              <div className="text-emerald-700 text-xs mt-0.5">
                Verified {connectedHandle || 'account'}. Last checked {data?.lastSync || primaryBackendConnection?.updatedAt || 'just now'}.
              </div>
            </div>
          </div>
        ) : (
          <div>
            {supportsOAuth && (
              <button
                type="button"
                onClick={handleOAuthLogin}
                disabled={oauthLoading}
                className="w-full flex items-center justify-between p-4 rounded-xl text-white cursor-pointer transition-all disabled:opacity-60"
                style={{ background: guide.color }}
              >
                <div className="flex items-center gap-2 text-left">
                  {oauthLoading ? <Loader size={16} className="animate-spin" /> : <LogIn size={16} />}
                  <div>
                    <div className="font-semibold text-sm">Login with {guide.name}</div>
                    <div className="text-white/80 text-xs mt-0.5">Choose the exact account or page to connect.</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/80" />
              </button>
            )}
            {!supportsOAuth && (
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl text-white cursor-pointer transition-all"
                style={{ background: guide.color }}
              >
                <div className="flex items-center gap-2 text-left">
                  <LogIn size={16} />
                  <div>
                    <div className="font-semibold text-sm">Connect {guide.name}</div>
                    <div className="text-white/80 text-xs mt-0.5">Enter the required account credentials.</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-white/80" />
              </button>
            )}
          </div>
        )}
      </div>

      {showGuide && (
        <ConnectionGuideModal
          platform={platform}
          guide={guide}
          onClose={() => setShowGuide(false)}
          onSave={handleSave}
          existingCredentials={data?.credentials}
        />
      )}
    </>
  )
}

function RequirementCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-blue-600" />
        </div>
        <div>
          <div className="text-slate-900 text-sm font-bold mb-1">{title}</div>
          <div className="text-slate-500 text-xs leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function PlatformsTab({ company, onUpdate, onNotify }) {
  const [backendConnections, setBackendConnections] = useState({})

  useEffect(() => {
    refreshConnections()
  }, [company.id])

  const refreshConnections = async () => {
    try {
      const data = await getConnections(company.id)
      const grouped = {}
      data.connections?.forEach(connection => {
        grouped[connection.platform] = [...(grouped[connection.platform] || []), connection]
      })
      setBackendConnections(grouped)
    } catch (err) {
      console.error('Failed to load platform connections:', err)
    }
  }

  const loginWithOAuth = platform => {
    window.location.href = backendUrl(`/api/oauth/${platform}/authorize?company_id=${encodeURIComponent(company.id)}&redirect_uri=${encodeURIComponent(window.location.href)}`)
  }

  const connectPlatform = async (platform, credentials, verification) => {
    const guide = PLATFORM_GUIDES[platform]
    const platformData = {
      connected: true,
      error: null,
      credentials,
      verifiedId: verification?.id || credentials.channelId || credentials.pageId || credentials.phoneNumberId,
      handle: verification?.name || credentials.channelId || credentials.pageId || credentials.phoneNumberId || 'Connected account',
      lastSync: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }

    onUpdate(current => ({
      ...current,
      status: 'active',
      whatsappLink: credentials.whatsappLink || current.whatsappLink,
      platforms: {
        ...current.platforms,
        [platform]: {
          ...current.platforms[platform],
          ...platformData,
        },
      },
    }))

    try {
      await registerConnection(company.id, platform, platformData)
      await refreshConnections()
      await saveBackendAiConfig({
        ...company,
        whatsappLink: credentials.whatsappLink || company.whatsappLink,
        platforms: {
          ...company.platforms,
          [platform]: { ...company.platforms[platform], ...platformData },
        },
      })
      onNotify?.(`${guide.name} verified and registered with the webhook backend.`, 'success')
    } catch (err) {
      onNotify?.(`${guide.name} verified, but backend registration failed: ${err.message}`, 'warning')
    }
  }

  const disconnectPlatform = async platform => {
    const guide = PLATFORM_GUIDES[platform]
    onUpdate(current => ({
      ...current,
      platforms: {
        ...current.platforms,
        [platform]: {
          ...current.platforms[platform],
          connected: false,
          error: null,
          credentials: null,
          handle: null,
          lastSync: null,
        },
      },
    }))
    try {
      await deleteConnection(company.id, platform)
      await refreshConnections()
      onNotify?.(`${guide.name} disconnected.`, 'warning')
    } catch (err) {
      onNotify?.(`${guide.name} removed locally, but backend disconnect failed: ${err.message}`, 'warning')
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <SectionHeader
        title="Platform Connections"
        description="Connect and manage Instagram, Facebook, YouTube, and WhatsApp in one place. Analytics pages only show results."
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-amber-900 font-semibold text-sm mb-0.5">All platform logins live here</div>
          <div className="text-amber-800 text-sm leading-relaxed">
            Use this page to connect, reconnect, or disconnect accounts. Social Media Analytics is only for viewing followers, posts, comments, and growth.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <RequirementCard icon={Server} title="1. Backend Webhook">
          Deploy an endpoint like <span className="font-mono">/meta/webhook</span> with GET verification and POST event handling.
        </RequirementCard>
        <RequirementCard icon={KeyRound} title="2. Meta App + Permissions">
          Create a Meta app, add webhook subscriptions, connect the Page/Instagram account, and approve read/reply permissions.
        </RequirementCard>
        <RequirementCard icon={Bot} title="3. AI Provider">
          Add an AI key, usually OpenAI or a cheaper compatible provider. The backend sends each comment to the model with company context.
        </RequirementCard>
        <RequirementCard icon={Database} title="4. Storage + Rules">
          Store tokens, company training, blacklist words, reply tone, logs, and whether auto-reply is ON or OFF.
        </RequirementCard>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-blue-900 font-semibold text-sm mb-0.5">How live replies work after connection</div>
          <div className="text-blue-700 text-sm leading-relaxed">
            New comments and messages are received by the backend webhook, saved to the inbox, sent to the AI when automation is enabled, and then replied back through the connected platform.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Object.entries(PLATFORM_GUIDES).map(([key, guide]) => (
          <PlatformCard
            key={key}
            platform={key}
            guide={guide}
            data={company.platforms[key]}
            backendConnections={backendConnections[key] || []}
            onConnect={connectPlatform}
            onOAuthLogin={loginWithOAuth}
            onDisconnect={disconnectPlatform}
          />
        ))}
      </div>
    </div>
  )
}
