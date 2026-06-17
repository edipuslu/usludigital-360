import http from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.VERCEL ? '/tmp/usludigital-360-data' : path.join(__dirname, 'data')
const STORE_PATH = path.join(DATA_DIR, 'store.json')
const PORT = Number(process.env.API_PORT || 8787)
const HOST = process.env.API_HOST || '127.0.0.1'
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'change-this-verify-token'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_STORE_TABLE = process.env.SUPABASE_STORE_TABLE || 'ud360_store'
const SUPABASE_STORE_ID = process.env.SUPABASE_STORE_ID || 'default'
const GRAPH_BASE_URL = 'https://graph.facebook.com/v20.0'
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v20.0/dialog/oauth'
const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_posts',
  'pages_messaging',
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
].join(',')

const DEFAULT_STORE = {
  connections: {},
  companies: {},
  items: [],
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

const emptyDaily = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, date: `Day ${i + 1}`, clicks: 0, replies: 0 }))
const emptyHeatmap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
  day,
  hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, value: 0 })),
}))

function companyDefaults(row = {}) {
  const name = row.name || 'Company'
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'
  return {
    id: row.id || crypto.randomUUID(),
    name,
    slug,
    industry: row.industry || '',
    clientEmail: '',
    clientName: '',
    status: row.status || 'needs_update',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO',
    accentColor: '#2563EB',
    platforms: {
      instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null },
    },
    goal: 'push_to_whatsapp',
    whatsappLink: '',
    aiTraining: {
      status: 'needs_update',
      lastTrained: null,
      progress: 0,
      documents: [],
      websiteUrl: row.website_url || '',
      guardrails: true,
      fallbackMessage: 'For more info, please contact us directly.',
      description: '',
      tone: 'professional',
    },
    automation: {
      instagram: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      facebook: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      whatsapp: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
    },
    metrics: {
      thisMonth: {
        totalReplies: 0,
        waClicks: 0,
        responseRate: 0,
        avgReplyTime: '—',
        change: { replies: 0, waClicks: 0, responseRate: 0, avgReplyTime: 0 },
      },
      byPlatform: [
        { platform: 'Instagram', replies: 0, waClicks: 0, color: '#E1306C' },
        { platform: 'Facebook', replies: 0, waClicks: 0, color: '#1877F2' },
        { platform: 'YouTube', replies: 0, waClicks: 0, color: '#FF0000' },
        { platform: 'WhatsApp', replies: 0, waClicks: 0, color: '#25D366' },
      ],
      daily: emptyDaily,
      heatmap: emptyHeatmap,
      topPosts: [],
      funnel: { reached: 0, replied: 0, clickedWA: 0, converted: 0 },
    },
    reports: [],
    notifications: [],
    settings: {
      workspaceName: name,
      notificationEmail: 'admin@usludigital.com',
      timezone: 'Africa/Casablanca',
      adminAlerts: true,
      clientAlerts: true,
      monthlyReportEmail: true,
      spikeAlerts: true,
    },
  }
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(JSON.stringify(body))
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    'Access-Control-Allow-Origin': '*',
  })
  res.end()
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

function baseUrlFromRequest(req) {
  const envUrl = process.env.PUBLIC_API_BASE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = req.headers['x-forwarded-proto'] || 'http'
  return `${proto}://${req.headers.host}`
}

function encodeState(state) {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

function decodeState(value) {
  try {
    return JSON.parse(Buffer.from(value || '', 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

async function graphGet(pathname, params = {}) {
  const url = new URL(`${GRAPH_BASE_URL}${pathname}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, value)
  })
  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Meta HTTP ${response.status}`)
  }

  return data
}

async function loadStore() {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const base = SUPABASE_URL.replace(/\/$/, '')
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const storeUrl = `${base}/rest/v1/${SUPABASE_STORE_TABLE}?id=eq.${encodeURIComponent(SUPABASE_STORE_ID)}&select=data&limit=1`
    const response = await fetch(storeUrl, {
      headers,
    })
    const rows = await response.json().catch(() => [])
    if (response.ok) {
      return { ...structuredClone(DEFAULT_STORE), ...(rows[0]?.data || {}) }
    }

    if (response.status !== 404) {
      throw new Error(rows?.message || `Supabase load failed with HTTP ${response.status}`)
    }

    const companiesResponse = await fetch(`${base}/rest/v1/companies?select=*&order=created_at.desc`, { headers })
    const companyRows = await companiesResponse.json().catch(() => [])
    if (!companiesResponse.ok) {
      throw new Error(companyRows?.message || `Supabase companies load failed with HTTP ${companiesResponse.status}`)
    }

    const connectionsResponse = await fetch(`${base}/rest/v1/platform_connections?select=*&is_active=eq.true&order=created_at.desc`, { headers })
    const connectionRows = await connectionsResponse.json().catch(() => [])
    if (!connectionsResponse.ok && connectionsResponse.status !== 404) {
      throw new Error(connectionRows?.message || `Supabase connections load failed with HTTP ${connectionsResponse.status}`)
    }

    const companies = Object.fromEntries(companyRows.map(row => [row.id, companyDefaults(row)]))
    const connections = {}
    for (const row of Array.isArray(connectionRows) ? connectionRows : []) {
      if (!row.company_id || !row.platform || !row.account_id) continue
      const key = connectionKey(row.platform, row.account_id)
      if (connections[key]) continue
      connections[key] = {
        companyId: row.company_id,
        platform: row.platform,
        externalId: row.account_id,
        handle: row.account_id,
        credentials: { accessToken: row.access_token },
        updatedAt: row.created_at || new Date().toISOString(),
      }
      if (companies[row.company_id]?.platforms?.[row.platform]) {
        companies[row.company_id].platforms[row.platform] = {
          ...companies[row.company_id].platforms[row.platform],
          connected: true,
          handle: row.account_id,
          lastSync: row.created_at || null,
        }
      }
    }

    return {
      ...structuredClone(DEFAULT_STORE),
      companies,
      connections,
    }
  }

  await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(STORE_PATH)) {
    await writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2))
    return structuredClone(DEFAULT_STORE)
  }
  try {
    return { ...DEFAULT_STORE, ...JSON.parse(await readFile(STORE_PATH, 'utf8')) }
  } catch {
    return structuredClone(DEFAULT_STORE)
  }
}

async function saveStore(store) {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const base = SUPABASE_URL.replace(/\/$/, '')
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }
    const storeUrl = `${base}/rest/v1/${SUPABASE_STORE_TABLE}`
    const response = await fetch(storeUrl, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: SUPABASE_STORE_ID,
        data: store,
        updated_at: new Date().toISOString(),
      }),
    })
    if (response.ok) {
      return
    }

    if (response.status !== 404) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.message || `Supabase save failed with HTTP ${response.status}`)
    }

    const companies = Object.values(store.companies || {})
    if (!companies.length) return

    const upsertResponse = await fetch(`${base}/rest/v1/companies`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(companies.map(company => ({
        id: company.id,
        name: company.name || 'Company',
        industry: company.industry || '',
        status: company.status || 'needs_update',
        website_url: company.aiTraining?.websiteUrl || null,
        created_at: company.createdAt || new Date().toISOString(),
      }))),
    })
    if (!upsertResponse.ok) {
      const error = await upsertResponse.json().catch(() => ({}))
      throw new Error(error?.message || `Supabase companies save failed with HTTP ${upsertResponse.status}`)
    }

    for (const connection of Object.values(store.connections || {})) {
      if (!connection.companyId || !connection.platform || !connection.externalId) continue
      await fetch(`${base}/rest/v1/platform_connections?company_id=eq.${encodeURIComponent(connection.companyId)}&platform=eq.${encodeURIComponent(connection.platform)}`, {
        method: 'DELETE',
        headers,
      })
      const connectionResponse = await fetch(`${base}/rest/v1/platform_connections`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          company_id: connection.companyId,
          platform: connection.platform,
          access_token: connection.credentials?.pageAccessToken || connection.credentials?.accessToken || '',
          account_id: connection.externalId,
          is_active: true,
        }),
      })
      if (!connectionResponse.ok && connectionResponse.status !== 404) {
        const error = await connectionResponse.json().catch(() => ({}))
        throw new Error(error?.message || `Supabase connection save failed with HTTP ${connectionResponse.status}`)
      }
    }
    return
  }

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2))
}

function listCompanies(store) {
  return Object.values(store.companies || {})
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

async function deleteCompanyFromSupabase(companyId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/companies?id=eq.${encodeURIComponent(companyId)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || `Supabase company delete failed with HTTP ${response.status}`)
  }
  return response.ok
}

async function deleteConnectionFromSupabase(companyId, platform) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/platform_connections?company_id=eq.${encodeURIComponent(companyId)}&platform=eq.${encodeURIComponent(platform)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || `Supabase connection delete failed with HTTP ${response.status}`)
  }
  return response.ok
}

function connectionKey(platform, externalId) {
  return `${platform}:${externalId}`
}

function rememberConnection(store, companyId, platform, connection) {
  const externalId = connection?.verifiedId || connection?.id || connection?.pageId || connection?.phoneNumberId || connection?.channelId
  if (!externalId) return

  store.connections[connectionKey(platform, String(externalId))] = {
    companyId,
    platform,
    externalId: String(externalId),
    handle: connection.handle || connection.name || String(externalId),
    credentials: connection.credentials || {},
    updatedAt: new Date().toISOString(),
  }
}

function listConnections(store, companyId) {
  return Object.values(store.connections)
    .filter(connection => connection.companyId === companyId)
    .map(connection => ({
      platform: connection.platform,
      externalId: connection.externalId,
      handle: connection.handle,
      updatedAt: connection.updatedAt,
    }))
}

async function saveInstagramOAuthConnection(store, companyId, tokenData) {
  const accessToken = tokenData.access_token
  const accounts = await graphGet('/me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username,name}',
    access_token: accessToken,
  })

  const page = accounts.data?.find(account => account.instagram_business_account)
  if (!page?.instagram_business_account?.id) {
    throw new Error('No Instagram Business account found. Connect Instagram Business/Creator to a Facebook Page first.')
  }

  const instagram = page.instagram_business_account
  const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null

  rememberConnection(store, companyId, 'instagram', {
    verifiedId: instagram.id,
    handle: instagram.username || instagram.name || `Instagram ${instagram.id}`,
    credentials: {
      accessToken,
      pageId: page.id,
      pageAccessToken: page.access_token,
      tokenType: tokenData.token_type,
      expiresAt,
    },
  })

  rememberConnection(store, companyId, 'facebook', {
    verifiedId: page.id,
    handle: page.name || `Facebook Page ${page.id}`,
    credentials: {
      accessToken: page.access_token || accessToken,
      userAccessToken: accessToken,
      tokenType: tokenData.token_type,
      expiresAt,
    },
  })

  return {
    instagram,
    page: { id: page.id, name: page.name },
  }
}

function findCompanyId(store, candidates) {
  for (const candidate of candidates.filter(Boolean).map(String)) {
    for (const platform of ['instagram', 'facebook', 'whatsapp', 'youtube']) {
      const match = store.connections[connectionKey(platform, candidate)]
      if (match?.companyId) return { companyId: match.companyId, platform: match.platform }
    }
  }
  return { companyId: 'unmatched', platform: null }
}

function findCompanyConnection(store, companyId, platform) {
  return Object.values(store.connections).find(connection => connection.companyId === companyId && connection.platform === platform)
}

function monthWindows(now = new Date()) {
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { previousMonthStart, thisMonthStart, nextMonthStart }
}

function inRange(date, start, end) {
  return date >= start && date < end
}

async function fetchInstagramMedia(connection, token, previousMonthStart) {
  const media = []
  let after = ''

  for (let page = 0; page < 10; page += 1) {
    const data = await graphGet(`/${connection.externalId}/media`, {
      fields: 'id,caption,timestamp,comments_count,like_count,permalink,media_type',
      limit: 100,
      after,
      access_token: token,
    })

    const batch = data.data || []
    media.push(...batch)

    const oldest = batch
      .map(item => new Date(item.timestamp))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b)[0]

    after = data.paging?.cursors?.after || ''
    if (!after || (oldest && oldest < previousMonthStart)) break
  }

  return media
}

async function instagramGrowthMetrics(store, companyId) {
  const connection = findCompanyConnection(store, companyId, 'instagram')
  if (!connection) {
    return {
      platform: 'instagram',
      connected: false,
      error: 'Instagram is not connected yet.',
      summary: null,
    }
  }

  const token = connection.credentials?.pageAccessToken || connection.credentials?.accessToken
  if (!token) {
    return {
      platform: 'instagram',
      connected: true,
      error: 'Instagram is connected, but the saved token is missing. Reconnect Instagram from Growth.',
      summary: null,
    }
  }

  const profile = await graphGet(`/${connection.externalId}`, {
    fields: 'id,username,name,followers_count,follows_count,media_count',
    access_token: token,
  })

  const { previousMonthStart, thisMonthStart, nextMonthStart } = monthWindows()
  const media = await fetchInstagramMedia(connection, token, previousMonthStart)
  const thisMonthPosts = media.filter(item => inRange(new Date(item.timestamp), thisMonthStart, nextMonthStart))
  const previousMonthPosts = media.filter(item => inRange(new Date(item.timestamp), previousMonthStart, thisMonthStart))
  const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0)
  const commentsThisMonth = sum(thisMonthPosts, 'comments_count')
  const commentsPreviousMonth = sum(previousMonthPosts, 'comments_count')
  const likesThisMonth = sum(thisMonthPosts, 'like_count')
  const followers = Number(profile.followers_count || 0)

  return {
    platform: 'instagram',
    connected: true,
    error: '',
    profile: {
      id: profile.id,
      username: profile.username || profile.name || connection.handle,
      followers,
      following: Number(profile.follows_count || 0),
      totalPosts: Number(profile.media_count || 0),
    },
    summary: {
      followers,
      postsThisMonth: thisMonthPosts.length,
      postsPreviousMonth: previousMonthPosts.length,
      postsChange: thisMonthPosts.length - previousMonthPosts.length,
      commentsThisMonth,
      commentsPreviousMonth,
      commentsChange: commentsThisMonth - commentsPreviousMonth,
      likesThisMonth,
      engagementRate: followers ? Number((((likesThisMonth + commentsThisMonth) / followers) * 100).toFixed(2)) : 0,
      currentMonthLabel: thisMonthStart.toLocaleString('en', { month: 'long', year: 'numeric' }),
      previousMonthLabel: previousMonthStart.toLocaleString('en', { month: 'long', year: 'numeric' }),
      lastSync: new Date().toISOString(),
    },
    recentPosts: thisMonthPosts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        caption: item.caption || '',
        timestamp: item.timestamp,
        comments: Number(item.comments_count || 0),
        likes: Number(item.like_count || 0),
        permalink: item.permalink || '',
        mediaType: item.media_type || '',
      })),
  }
}

function makePostLink(platform, value) {
  if (value?.permalink) return value.permalink
  if (platform === 'instagram' && value?.media_id) return `https://www.instagram.com/p/${value.media_id}`
  if (platform === 'facebook' && value?.post_id) return `https://www.facebook.com/${value.post_id}`
  if (platform === 'youtube' && value?.videoId) return `https://www.youtube.com/watch?v=${value.videoId}`
  return ''
}

function normalizeMetaWebhook(body, store) {
  const items = []
  const object = body.object || ''

  for (const entry of body.entry || []) {
    const entryId = entry.id || entry.uid || entry.messaging?.[0]?.recipient?.id

    for (const change of entry.changes || []) {
      const value = change.value || {}
      const field = change.field || ''
      const platform = object.includes('instagram') || field.includes('instagram') ? 'instagram' : object.includes('whatsapp') ? 'whatsapp' : 'facebook'
      const isMessage = Boolean(value.messages?.length || value.message || field.includes('messages'))
      const candidateIds = [value.from?.id, value.page_id, value.phone_number_id, value.metadata?.phone_number_id, value.instagram_business_account_id, entryId]
      const routed = findCompanyId(store, candidateIds)

      if (platform === 'whatsapp' && value.messages?.length) {
        for (const message of value.messages) {
          items.push({
            companyId: routed.companyId,
            type: 'dm',
            platform,
            senderName: message.from || 'WhatsApp contact',
            senderId: message.from,
            text: message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '',
            sourceLink: '',
            externalId: message.id,
            raw: { entry, change },
          })
        }
        continue
      }

      items.push({
        companyId: routed.companyId,
        type: isMessage ? 'dm' : 'comment',
        platform: routed.platform || platform,
        senderName: value.from?.name || value.sender_name || 'Customer',
        senderId: value.from?.id || value.sender_id || '',
        text: value.message || value.text || value.comment?.text || '',
        sourceLink: makePostLink(platform, value),
        externalId: value.comment_id || value.message_id || value.id || `${entryId}-${Date.now()}`,
        raw: { entry, change },
      })
    }

    for (const event of entry.messaging || []) {
      const routed = findCompanyId(store, [event.recipient?.id, entryId])
      items.push({
        companyId: routed.companyId,
        type: 'dm',
        platform: routed.platform || (object.includes('instagram') ? 'instagram' : 'facebook'),
        senderName: event.sender?.id || 'Customer',
        senderId: event.sender?.id,
        text: event.message?.text || event.postback?.title || '',
        sourceLink: '',
        externalId: event.message?.mid || `${event.sender?.id}-${Date.now()}`,
        raw: event,
      })
    }
  }

  return items.filter(item => item.text)
}

function systemPromptFor(company, item) {
  const training = company?.aiTraining || {}
  const automation = company?.automation?.[item.platform] || {}
  const fallback = training.fallbackMessage || 'Please contact us directly for more details.'
  return [
    `You are replying for ${company?.name || 'this company'}.`,
    training.description ? `Business context: ${training.description}` : '',
    `Platform: ${item.platform}. Message type: ${item.type}.`,
    `Tone: ${automation.tone || training.tone || 'professional'}.`,
    company?.goal === 'push_to_whatsapp' && company?.whatsappLink ? `Include this WhatsApp link naturally when helpful: ${company.whatsappLink}` : '',
    training.guardrails ? `If you are not sure, reply with this fallback: "${fallback}"` : '',
    'Keep the reply concise, helpful, and safe. Do not invent prices, stock, dates, or promises.',
  ].filter(Boolean).join('\n')
}

function shouldAutoReply(company, item) {
  const settings = company?.automation?.[item.platform]
  if (!settings) return false
  if (item.type === 'comment' && !settings.commentReply) return false
  if (item.type === 'dm' && !settings.dmReply) return false
  const lowered = item.text.toLowerCase()
  if ((settings.blacklist || []).some(word => lowered.includes(String(word).toLowerCase()))) return false
  return true
}

async function generateAiReply(company, item) {
  const apiKey = company?.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return { reply: '', status: 'needs_openai_key', error: 'OpenAI key is missing on the backend.' }
  if (!shouldAutoReply(company, item)) return { reply: '', status: 'received', error: '' }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPromptFor(company, item) },
        { role: 'user', content: item.text },
      ],
      temperature: 0.6,
      max_tokens: 180,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { reply: '', status: 'ai_error', error: data?.error?.message || `OpenAI HTTP ${response.status}` }
  }

  return { reply: data.choices?.[0]?.message?.content || '', status: 'ai_replied', error: '' }
}

async function graphPost(pathname, token, body) {
  const response = await fetch(`${GRAPH_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Meta HTTP ${response.status}`)
  }

  return data
}

async function postPlatformReply(store, item, reply) {
  const connection = findCompanyConnection(store, item.companyId, item.platform)
  const token = connection?.credentials?.accessToken

  if (!token) {
    return { status: 'reply_ready', error: 'AI reply is ready, but no platform token is registered on the backend.' }
  }

  if (item.type === 'comment' && item.platform === 'instagram') {
    await graphPost(`/${item.externalId}/replies`, token, { message: reply })
    return { status: 'replied_live', error: '' }
  }

  if (item.type === 'comment' && item.platform === 'facebook') {
    await graphPost(`/${item.externalId}/comments`, token, { message: reply })
    return { status: 'replied_live', error: '' }
  }

  if (item.type === 'dm' && item.platform === 'facebook') {
    await graphPost('/me/messages', token, {
      recipient: { id: item.senderId },
      message: { text: reply },
    })
    return { status: 'replied_live', error: '' }
  }

  if (item.type === 'dm' && item.platform === 'instagram') {
    await graphPost('/me/messages', token, {
      recipient: { id: item.senderId },
      message: { text: reply },
    })
    return { status: 'replied_live', error: '' }
  }

  if (item.type === 'dm' && item.platform === 'whatsapp') {
    await graphPost(`/${connection.externalId}/messages`, token, {
      messaging_product: 'whatsapp',
      to: item.senderId,
      type: 'text',
      text: { body: reply },
    })
    return { status: 'replied_live', error: '' }
  }

  return { status: 'reply_ready', error: 'This event type is stored, but live posting is not supported for this platform yet.' }
}

async function saveIncomingItems(store, incoming) {
  const saved = []
  for (const item of incoming) {
    const company = store.companies[item.companyId] || {}
    const ai = await generateAiReply(company, item).catch(err => ({
      reply: '',
      status: 'ai_error',
      error: err.message,
    }))
    const postResult = ai.reply
      ? await postPlatformReply(store, item, ai.reply).catch(err => ({ status: 'reply_failed', error: err.message }))
      : { status: ai.status, error: ai.error }
    const savedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: new Date().toISOString(),
      status: ai.reply ? postResult.status : ai.status,
      aiReply: ai.reply,
      error: postResult.error || ai.error,
      ...item,
    }
    store.items.unshift(savedItem)
    saved.push(savedItem)
  }
  store.items = store.items.slice(0, 1000)
  return saved
}

function routeParams(pathname, pattern) {
  const names = []
  const regex = new RegExp(`^${pattern.replace(/:([^/]+)/g, (_, name) => {
    names.push(name)
    return '([^/]+)'
  })}$`)
  const match = pathname.match(regex)
  if (!match) return null
  return Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])]))
}

export async function appHandler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true })

  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const store = await loadStore()

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'usludigital-360-api' })
    }

    const oauthAuthorize = url.pathname.match(/^\/(?:api\/)?oauth\/([^/]+)\/authorize$/)
    if (req.method === 'GET' && oauthAuthorize) {
      const platform = oauthAuthorize[1]
      if (platform !== 'instagram' && platform !== 'facebook') {
        return json(res, 400, { error: `${platform} OAuth is not implemented yet.` })
      }

      const appId = process.env.META_APP_ID
      if (!appId) {
        return json(res, 500, { error: 'META_APP_ID is missing on the backend.' })
      }

      const companyId = url.searchParams.get('company_id')
      if (!companyId) {
        return json(res, 400, { error: 'company_id is required.' })
      }
      if (SUPABASE_URL && !isUuid(companyId)) {
        return json(res, 400, { error: 'Open a real company from the dashboard first, then start Instagram login from Growth. The test-company link cannot be saved to Supabase.' })
      }

      const callbackUrl = `${baseUrlFromRequest(req)}/api/oauth/${platform}/callback`
      const state = encodeState({
        companyId,
        redirectUri: url.searchParams.get('redirect_uri') || '',
      })
      const authUrl = new URL(FACEBOOK_OAUTH_URL)
      authUrl.searchParams.set('client_id', appId)
      authUrl.searchParams.set('redirect_uri', callbackUrl)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('scope', META_SCOPES)
      authUrl.searchParams.set('response_type', 'code')

      return redirect(res, authUrl.toString())
    }

    const oauthCallback = url.pathname.match(/^\/(?:api\/)?oauth\/([^/]+)\/callback$/)
    if (req.method === 'GET' && oauthCallback) {
      const platform = oauthCallback[1]
      const state = decodeState(url.searchParams.get('state'))
      const code = url.searchParams.get('code')
      const fallbackRedirect = state.redirectUri || '/'

      if (url.searchParams.get('error')) {
        const message = url.searchParams.get('error_description') || url.searchParams.get('error') || 'OAuth was cancelled.'
        const failed = new URL(fallbackRedirect)
        failed.searchParams.set('platform', platform)
        failed.searchParams.set('connected', 'false')
        failed.searchParams.set('error', message)
        return redirect(res, failed.toString())
      }

      if (!code || !state.companyId) {
        return json(res, 400, { error: 'OAuth callback is missing code or company state.' })
      }
      if (SUPABASE_URL && !isUuid(state.companyId)) {
        return json(res, 400, { error: 'This OAuth login used a test company ID. Open a real company from the dashboard and click Login with Instagram again.' })
      }

      const appId = process.env.META_APP_ID
      const appSecret = process.env.META_APP_SECRET
      if (!appId || !appSecret) {
        return json(res, 500, { error: 'META_APP_ID and META_APP_SECRET are required for OAuth callback.' })
      }

      const callbackUrl = `${baseUrlFromRequest(req)}/api/oauth/${platform}/callback`
      const tokenData = await graphGet('/oauth/access_token', {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: callbackUrl,
        code,
      })

      const connected = await saveInstagramOAuthConnection(store, state.companyId, tokenData)
      await saveStore(store)

      const success = new URL(fallbackRedirect)
      success.searchParams.set('platform', platform)
      success.searchParams.set('connected', 'true')
      success.searchParams.set('instagram_id', connected.instagram.id)
      return redirect(res, success.toString())
    }

    if (req.method === 'GET' && url.pathname === '/meta/webhook') {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        return res.end(challenge || '')
      }
      return json(res, 403, { error: 'Webhook verify token does not match.' })
    }

    if (req.method === 'POST' && url.pathname === '/meta/webhook') {
      const body = await readBody(req)
      const incoming = normalizeMetaWebhook(body, store)
      const saved = await saveIncomingItems(store, incoming)
      await saveStore(store)
      return json(res, 200, { ok: true, received: saved.length })
    }

    if (req.method === 'GET' && url.pathname === '/api/companies') {
      return json(res, 200, { companies: listCompanies(store) })
    }

    if (req.method === 'POST' && url.pathname === '/api/companies') {
      const body = await readBody(req)
      if (!body.company?.id) return json(res, 400, { error: 'company.id is required.' })
      store.companies[body.company.id] = {
        ...(store.companies[body.company.id] || {}),
        ...body.company,
        updatedAt: new Date().toISOString(),
      }
      await saveStore(store)
      return json(res, 200, { ok: true, company: store.companies[body.company.id] })
    }

    const companyParams = routeParams(url.pathname, '/api/companies/:companyId')
    if (req.method === 'PUT' && companyParams) {
      const body = await readBody(req)
      if (!store.companies[companyParams.companyId]) return json(res, 404, { error: 'Company not found.' })
      store.companies[companyParams.companyId] = {
        ...store.companies[companyParams.companyId],
        ...(body.company || {}),
        id: companyParams.companyId,
        updatedAt: new Date().toISOString(),
      }
      await saveStore(store)
      return json(res, 200, { ok: true, company: store.companies[companyParams.companyId] })
    }

    if (req.method === 'DELETE' && companyParams) {
      delete store.companies[companyParams.companyId]
      store.connections = Object.fromEntries(
        Object.entries(store.connections || {}).filter(([, connection]) => connection.companyId !== companyParams.companyId)
      )
      store.items = (store.items || []).filter(item => item.companyId !== companyParams.companyId)
      if (!(await deleteCompanyFromSupabase(companyParams.companyId))) {
        await saveStore(store)
      }
      return json(res, 200, { ok: true })
    }

    const connectionParams = routeParams(url.pathname, '/api/companies/:companyId/connections')
    if (req.method === 'GET' && connectionParams) {
      return json(res, 200, { connections: listConnections(store, connectionParams.companyId) })
    }

    if (req.method === 'POST' && connectionParams) {
      const body = await readBody(req)
      rememberConnection(store, connectionParams.companyId, body.platform, body.connection)
      await saveStore(store)
      return json(res, 200, { ok: true })
    }

    const connectionPlatformParams = routeParams(url.pathname, '/api/companies/:companyId/connections/:platform')
    if (req.method === 'DELETE' && connectionPlatformParams) {
      store.connections = Object.fromEntries(
        Object.entries(store.connections || {}).filter(([, connection]) => (
          connection.companyId !== connectionPlatformParams.companyId ||
          connection.platform !== connectionPlatformParams.platform
        ))
      )
      if (!(await deleteConnectionFromSupabase(connectionPlatformParams.companyId, connectionPlatformParams.platform))) {
        await saveStore(store)
      }
      return json(res, 200, { ok: true })
    }

    const growthParams = routeParams(url.pathname, '/api/companies/:companyId/growth')
    if (req.method === 'GET' && growthParams) {
      const connections = listConnections(store, growthParams.companyId)
      const instagram = await instagramGrowthMetrics(store, growthParams.companyId).catch(err => ({
        platform: 'instagram',
        connected: Boolean(findCompanyConnection(store, growthParams.companyId, 'instagram')),
        error: err.message || 'Could not load Instagram growth data.',
        summary: null,
      }))
      return json(res, 200, {
        connectedPlatforms: connections.length,
        connections,
        instagram,
        metrics: instagram.summary || {
          followers: 0,
          postsThisMonth: 0,
          postsPreviousMonth: 0,
          postsChange: 0,
          commentsThisMonth: 0,
          commentsPreviousMonth: 0,
          commentsChange: 0,
          engagementRate: 0,
          lastSync: connections[0]?.updatedAt || null,
        },
      })
    }

    const aiParams = routeParams(url.pathname, '/api/companies/:companyId/ai-config')
    if (req.method === 'POST' && aiParams) {
      const body = await readBody(req)
      store.companies[aiParams.companyId] = {
        ...(body.company || {}),
        openaiKey: body.openaiKey || store.companies[aiParams.companyId]?.openaiKey || process.env.OPENAI_API_KEY || '',
        updatedAt: new Date().toISOString(),
      }
      await saveStore(store)
      return json(res, 200, { ok: true })
    }

    const inboxParams = routeParams(url.pathname, '/api/companies/:companyId/inbox')
    if (req.method === 'GET' && inboxParams) {
      const type = url.searchParams.get('type') || 'all'
      const items = store.items.filter(item => {
        if (item.companyId !== inboxParams.companyId) return false
        return type === 'all' || item.type === type
      })
      return json(res, 200, { items })
    }

    if (req.method === 'POST' && inboxParams) {
      const body = await readBody(req)
      const incoming = [{
        companyId: inboxParams.companyId,
        type: body.type || 'comment',
        platform: body.platform || 'instagram',
        senderName: body.senderName || 'Test Customer',
        senderId: body.senderId || 'test-user',
        text: body.text || 'Hi, can you send me more information?',
        sourceLink: body.sourceLink || '',
        externalId: body.externalId || `manual-${Date.now()}`,
        raw: body,
      }]
      const saved = await saveIncomingItems(store, incoming)
      await saveStore(store)
      return json(res, 200, { ok: true, item: saved[0] })
    }

    const testParams = routeParams(url.pathname, '/api/companies/:companyId/test-inbox')
    if (req.method === 'POST' && testParams) {
      const body = await readBody(req)
      const incoming = [{
        companyId: testParams.companyId,
        type: body.type || 'comment',
        platform: body.platform || 'instagram',
        senderName: body.senderName || 'Test Customer',
        senderId: 'test-user',
        text: body.text || 'Hi, can you send me more information?',
        sourceLink: body.sourceLink || 'https://www.instagram.com/',
        externalId: `test-${Date.now()}`,
        raw: body,
      }]
      const saved = await saveIncomingItems(store, incoming)
      await saveStore(store)
      return json(res, 200, { ok: true, item: saved[0] })
    }

    return json(res, 404, { error: 'Not found' })
  } catch (err) {
    return json(res, 500, { error: err.message || 'Server error' })
  }
}

if (!process.env.VERCEL) {
  const server = http.createServer(appHandler)

  server.listen(PORT, HOST, () => {
    console.log(`Usludigital 360 API listening on http://${HOST}:${PORT}`)
    console.log(`Meta webhook callback: http://${HOST}:${PORT}/meta/webhook`)
  })
}
