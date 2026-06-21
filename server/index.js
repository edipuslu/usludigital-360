import http from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, createHmac } from 'node:crypto'
import nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.VERCEL ? '/tmp/usludigital-360-data' : path.join(__dirname, 'data')
const STORE_PATH = path.join(DATA_DIR, 'store.json')
const PORT = Number(process.env.API_PORT || 8787)
const HOST = process.env.API_HOST || '127.0.0.1'
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'usludigital360webhook'
const META_VERIFY_TOKENS = new Set([
  VERIFY_TOKEN,
  'usludigital360webhook',
  'change-this-verify-token',
].filter(Boolean))
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-nano'
const OPENAI_MODEL_FALLBACKS = [
  OPENAI_MODEL,
  ...(process.env.OPENAI_MODEL_FALLBACKS || 'gpt-4.1-mini,gpt-5-nano,gpt-5-mini')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean),
].filter((model, index, models) => models.indexOf(model) === index)
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_STORE_TABLE = process.env.SUPABASE_STORE_TABLE || 'ud360_store'
const SUPABASE_STORE_ID = process.env.SUPABASE_STORE_ID || 'default'
const GMAIL_USER = process.env.GMAIL_USER || ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || ''
const RAW_REPORT_FROM_EMAIL = process.env.REPORT_FROM_EMAIL || ''
const REPORT_FROM_EMAIL = RAW_REPORT_FROM_EMAIL || GMAIL_USER || ''
const REPORT_FROM_NAME = process.env.REPORT_FROM_NAME || 'Uslu360Digital Reports'
const REPORT_EMAIL_PROVIDER = String(process.env.REPORT_EMAIL_PROVIDER || '').trim().toLowerCase()
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const GRAPH_BASE_URL = 'https://graph.facebook.com/v20.0'
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v20.0/dialog/oauth'
const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
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

function automationDefaults() {
  return {
    schedule: { enabled: true, startAt: '', endAt: '', timezone: 'Africa/Casablanca' },
    instagram: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
    facebook: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
    youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
    whatsapp: { dmReply: true, commentReply: false, tone: 'professional', blacklist: [] },
    tiktok: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
  }
}

function companyDefaults(row = {}) {
  const name = row.name || 'Company'
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'
  return {
    id: row.id || crypto.randomUUID(),
    name,
    slug,
    industry: row.industry || '',
    clientEmail: row.clientEmail || row.client_email || '',
    clientName: row.clientName || row.client_name || '',
    clientPassword: row.clientPassword || row.client_password || '',
    status: row.status || 'needs_update',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    initials: name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'CO',
    accentColor: '#2563EB',
    platforms: {
      instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null },
      tiktok: { connected: false, handle: null, followers: null, lastSync: null, error: null },
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
    automation: automationDefaults(),
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
        { platform: 'TikTok', replies: 0, waClicks: 0, color: '#111827' },
      ],
      daily: emptyDaily,
      heatmap: emptyHeatmap,
      topPosts: [],
      funnel: { reached: 0, replied: 0, clickedWA: 0, converted: 0 },
    },
    reports: [],
    branches: row.branches || [],
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

function getWorkspaceOpenaiKey(store) {
  return process.env.OPENAI_API_KEY || Object.values(store.companies || {}).find(company => company.openaiKey)?.openaiKey || ''
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

function html(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

function parseReportRecipients(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,\n;]/)
  const recipients = raw.map(email => String(email || '').trim().toLowerCase()).filter(Boolean)
  const unique = [...new Set(recipients)]
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalid = unique.filter(email => !emailPattern.test(email))
  return { recipients: unique, invalid }
}

function reportEmailHtml({ company, report }) {
  const month = report.month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const replies = Number(report.totalReplies || 0).toLocaleString()
  const clicks = Number(report.waClicks || 0).toLocaleString()
  const summary = escapeHtml(report.summary || 'Monthly report generated from the current workspace metrics.')
  return `
    <div style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;padding:32px 20px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
          <div style="background:#030918;color:#ffffff;padding:28px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px;">
              <div style="width:44px;height:44px;border-radius:12px;background:#ffffff;display:flex;align-items:center;justify-content:center;">
                <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M37 7 17 35h14l-4 22 20-29H34l3-21Z" fill="#030918"></path>
                </svg>
              </div>
              <div>
                <div style="font-size:20px;font-weight:800;">Uslu360Digital</div>
                <div style="font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.7px;">Monthly Performance Report</div>
              </div>
            </div>
            <div style="font-size:13px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;">${escapeHtml(company.name || 'Company')}</div>
            <h1 style="margin:8px 0 10px;font-size:38px;line-height:1.05;letter-spacing:-1.3px;">${escapeHtml(month)}</h1>
            <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6;">${summary}</p>
          </div>
          <div style="padding:26px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
              <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                <div style="font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase;margin-bottom:8px;">AI Replies Sent</div>
                <div style="font-size:34px;font-weight:850;color:#255ff4;">${replies}</div>
              </div>
              <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
                <div style="font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase;margin-bottom:8px;">WhatsApp Clicks</div>
                <div style="font-size:34px;font-weight:850;color:#f42582;">${clicks}</div>
              </div>
            </div>
            <div style="border:1px solid #e2e8f0;border-radius:14px;padding:18px;background:#f8fafc;">
              <div style="font-size:14px;font-weight:800;margin-bottom:8px;">Best Performing Content</div>
              <div style="font-size:14px;color:#255ff4;font-weight:700;">${escapeHtml(report.bestPost || 'No post selected yet')}</div>
            </div>
            <p style="margin:24px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
              This report was sent from Uslu360Digital for ${escapeHtml(company.name || 'this workspace')}.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

function createReportPdfBuffer({ company, report }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks = []
    const month = report.month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const replies = Number(report.totalReplies || 0).toLocaleString()
    const clicks = Number(report.waClicks || 0).toLocaleString()

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.rect(0, 0, doc.page.width, 142).fill('#030918')
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('Uslu360Digital', 48, 42)
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('MONTHLY PERFORMANCE REPORT', 48, 74, { characterSpacing: 1 })
    doc.fillColor('#ffffff').fontSize(34).font('Helvetica-Bold').text(month, 48, 100, { width: 500 })

    doc.fillColor('#0f172a')
    doc.fontSize(11).font('Helvetica-Bold').text(company.name || 'Company', 48, 174)
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(report.summary || 'Monthly report generated from the current workspace metrics.', 48, 194, {
      width: 500,
      lineGap: 4,
    })

    const metricY = 260
    doc.roundedRect(48, metricY, 230, 112, 14).strokeColor('#e2e8f0').lineWidth(1).stroke()
    doc.roundedRect(306, metricY, 230, 112, 14).strokeColor('#e2e8f0').lineWidth(1).stroke()
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('AI REPLIES SENT', 68, metricY + 22)
    doc.fillColor('#255ff4').fontSize(34).font('Helvetica-Bold').text(replies, 68, metricY + 44)
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text('WHATSAPP CLICKS', 326, metricY + 22)
    doc.fillColor('#f42582').fontSize(34).font('Helvetica-Bold').text(clicks, 326, metricY + 44)

    doc.roundedRect(48, 410, 488, 96, 14).fillAndStroke('#f8fafc', '#e2e8f0')
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Best Performing Content', 68, 432)
    doc.fillColor('#255ff4').fontSize(11).font('Helvetica-Bold').text(report.bestPost || 'No post selected yet', 68, 458, { width: 450 })

    doc.moveTo(48, 740).lineTo(536, 740).strokeColor('#e2e8f0').stroke()
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('Uslu360Digital | Confidential client report', 48, 756)
    doc.text(report.id || '', 400, 756, { width: 136, align: 'right' })
    doc.end()
  })
}

function createReportTransporter() {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }

  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })
  }

  return null
}

function getReportEmailStatus() {
  const sender = REPORT_FROM_EMAIL || SMTP_USER || GMAIL_USER
  if (REPORT_EMAIL_PROVIDER === 'gmail') {
    return GMAIL_USER && GMAIL_APP_PASSWORD
      ? { configured: true, provider: 'gmail', sender: GMAIL_USER }
      : { configured: false, provider: 'gmail', sender: GMAIL_USER || '' }
  }
  if (REPORT_EMAIL_PROVIDER === 'resend') {
    return RESEND_API_KEY && RAW_REPORT_FROM_EMAIL
      ? { configured: true, provider: 'resend', sender: RAW_REPORT_FROM_EMAIL }
      : { configured: false, provider: 'resend', sender: RAW_REPORT_FROM_EMAIL || '' }
  }
  if (REPORT_EMAIL_PROVIDER === 'smtp') {
    return SMTP_HOST && SMTP_USER && SMTP_PASS
      ? { configured: true, provider: 'smtp', sender: sender || SMTP_USER }
      : { configured: false, provider: 'smtp', sender: sender || SMTP_USER || '' }
  }
  if (RESEND_API_KEY && RAW_REPORT_FROM_EMAIL) {
    return { configured: true, provider: 'resend', sender: RAW_REPORT_FROM_EMAIL }
  }
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && sender) {
    return { configured: true, provider: 'smtp', sender }
  }
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return { configured: true, provider: 'gmail', sender: sender || GMAIL_USER }
  }
  return { configured: false, provider: 'none', sender: sender || '' }
}

async function sendReportWithResend({ company, report, recipients, pdf, filename }) {
  const fromEmail = REPORT_FROM_EMAIL
  if (!RESEND_API_KEY || !fromEmail) {
    throw new Error('Resend is not configured. Add RESEND_API_KEY and REPORT_FROM_EMAIL in Vercel Environment Variables.')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${REPORT_FROM_NAME} <${fromEmail}>`,
      to: recipients,
      subject: `${company.name || 'Company'} ${report.month || 'Monthly'} Report`,
      html: reportEmailHtml({ company, report }),
      text: `${company.name || 'Company'} ${report.month || 'Monthly'} Report\n\nAI Replies: ${report.totalReplies || 0}\nWhatsApp Clicks: ${report.waClicks || 0}\n\n${report.summary || ''}`,
      attachments: [
        {
          filename,
          content: pdf.toString('base64'),
        },
      ],
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || `Resend email failed with HTTP ${response.status}`)
  }
  return { messageId: data.id || '', provider: 'resend' }
}

async function sendReportEmail({ company, report, recipients }) {
  const pdf = await createReportPdfBuffer({ company, report })
  const filename = `uslu360digital-${String(report.month || 'monthly-report').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
  const status = getReportEmailStatus()
  if (!status.configured) {
    throw new Error('Professional email sending is not configured. Add REPORT_EMAIL_PROVIDER=gmail with GMAIL_USER and GMAIL_APP_PASSWORD, or configure Resend/SMTP in Vercel Environment Variables.')
  }

  if (status.provider === 'resend') {
    return sendReportWithResend({ company, report, recipients, pdf, filename })
  }

  const transporter = createReportTransporter()
  const fromEmail = status.sender
  if (!transporter || !fromEmail) {
    throw new Error('Professional email sending is not configured. Add REPORT_EMAIL_PROVIDER=gmail with GMAIL_USER and GMAIL_APP_PASSWORD, or configure Resend/SMTP in Vercel Environment Variables.')
  }

  const info = await transporter.sendMail({
    from: `"${REPORT_FROM_NAME}" <${fromEmail}>`,
    to: recipients,
    subject: `${company.name || 'Company'} ${report.month || 'Monthly'} Report`,
    html: reportEmailHtml({ company, report }),
    text: `${company.name || 'Company'} ${report.month || 'Monthly'} Report\n\nAI Replies: ${report.totalReplies || 0}\nWhatsApp Clicks: ${report.waClicks || 0}\n\n${report.summary || ''}`,
    attachments: [
      {
        filename,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  })
  return { messageId: info.messageId || '', provider: status.provider }
}

async function readFormBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
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
    let storedData = null
    if (response.ok) {
      storedData = rows[0]?.data || null
    } else if (response.status !== 404) {
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

    const companyConfigs = await loadCompanyConfigsFromSupabase(base, headers)
    const branchesByCompany = await loadBranchesFromSupabase(base, headers)
    const companies = Array.isArray(companyRows) && companyRows.length > 0
      ? Object.fromEntries(companyRows.map(row => {
        const defaults = companyDefaults(row)
        const config = companyConfigs[row.id] || {}
        const tableBranches = branchesByCompany[row.id] || []
        const configBranches = row.branches || config.branches || defaults.branches
        return [row.id, {
          ...defaults,
          openaiKey: config.openaiKey || defaults.openaiKey || '',
          clientEmail: config.clientEmail || defaults.clientEmail || '',
          clientName: config.clientName || defaults.clientName || '',
          clientPassword: config.clientPassword || defaults.clientPassword || '',
          goal: config.goal || defaults.goal,
          whatsappLink: config.whatsappLink || defaults.whatsappLink,
          aiTraining: { ...defaults.aiTraining, ...(config.aiTraining || {}) },
          automation: {
            ...defaults.automation,
            ...(config.automation || {}),
            schedule: { ...defaults.automation.schedule, ...(config.automation?.schedule || {}) },
          },
          settings: { ...defaults.settings, ...(config.settings || {}) },
          branches: tableBranches.length ? mergeBranchConfig(tableBranches, configBranches) : configBranches,
          updatedAt: config.updatedAt || defaults.updatedAt,
        }]
      }))
      : Object.fromEntries(Object.entries(storedData?.companies || {}).map(([id, company]) => {
        const defaults = companyDefaults({ id, name: company?.name || 'Company' })
        const tableBranches = branchesByCompany[id] || []
        const configBranches = company?.branches || defaults.branches
        return [id, {
          ...defaults,
          ...company,
          platforms: { ...defaults.platforms, ...(company?.platforms || {}) },
          aiTraining: { ...defaults.aiTraining, ...(company?.aiTraining || {}) },
          automation: {
            ...defaults.automation,
            ...(company?.automation || {}),
            schedule: { ...defaults.automation.schedule, ...(company?.automation?.schedule || {}) },
          },
          settings: { ...defaults.settings, ...(company?.settings || {}) },
          branches: tableBranches.length ? mergeBranchConfig(tableBranches, configBranches) : configBranches,
        }]
      }))
    const connections = {}
    for (const row of Array.isArray(connectionRows) ? connectionRows : []) {
      if (!row.company_id || !row.platform || !row.account_id) continue
      const branchId = row.branch_id || row.branchId || ''
      const key = connectionKey(row.platform, row.account_id, branchId)
      if (connections[key]) continue
      connections[key] = {
        companyId: row.company_id,
        branchId: branchId || null,
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

    const persistedItems = storedData?.items || await loadInboxItemsFromSupabase(base, headers)

    return {
      ...structuredClone(DEFAULT_STORE),
      ...(storedData || {}),
      companies,
      connections: {
        ...(storedData?.connections || {}),
        ...connections,
      },
      items: persistedItems,
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

async function saveStore(store, options = {}) {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const base = SUPABASE_URL.replace(/\/$/, '')
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }
    const companies = Object.values(store.companies || {})
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
      await saveBranchesToSupabase(base, headers, companies, options)
      return
    }

    if (response.status !== 404) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.message || `Supabase save failed with HTTP ${response.status}`)
    }

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

    await saveCompanyConfigsToSupabase(base, headers, companies)
    await saveBranchesToSupabase(base, headers, companies, options)
    await saveInboxItemsToSupabase(base, headers, store.items || [])
    return
  }

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2))
}

function listCompanies(store) {
  const workspaceOpenaiKey = getWorkspaceOpenaiKey(store)
  return Object.values(store.companies || {})
    .map(company => {
      const { openaiKey, ...safeCompany } = company
      return {
        ...safeCompany,
        hasOpenaiKey: Boolean(workspaceOpenaiKey || openaiKey),
      }
    })
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

function connectionKey(platform, externalId, branchId = '') {
  return `${platform}:${externalId}:${branchId || 'company'}`
}

function deterministicUuid(value) {
  const hex = createHash('sha256').update(String(value)).digest('hex').slice(0, 32)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${(parseInt(hex.slice(16, 18), 16) & 0x3f | 0x80).toString(16).padStart(2, '0')}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

function inboxMeta(item) {
  return {
    text: item.text || '',
    branchId: item.branchId || null,
    type: item.type || 'comment',
    externalId: item.externalId || item.id || '',
    sourceLink: item.sourceLink || item.postUrl || '',
    senderId: item.senderId || '',
    likes: Number(item.likes || 0),
    aiReply: item.aiReply || '',
    status: item.status || 'synced',
    error: item.error || '',
  }
}

function parseInboxContent(content) {
  try {
    const parsed = JSON.parse(content || '')
    if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') return parsed
  } catch {
    // Older rows may be plain text.
  }
  return { text: content || '' }
}

async function loadInboxItemsFromSupabase(base, headers) {
  const conversationsResponse = await fetch(`${base}/rest/v1/conversations?select=id,company_id,platform,customer_name,status,created_at&status=in.(comment,dm)&order=created_at.desc&limit=1000`, { headers })
  const conversations = await conversationsResponse.json().catch(() => [])
  if (!conversationsResponse.ok || !Array.isArray(conversations) || !conversations.length) return []

  const ids = conversations.map(conversation => conversation.id).filter(Boolean)
  if (!ids.length) return []

  const messagesResponse = await fetch(`${base}/rest/v1/messages?select=id,conversation_id,author_name,content,is_ai_reply,created_at&conversation_id=in.(${ids.join(',')})&order=created_at.desc&limit=1000`, { headers })
  const messages = await messagesResponse.json().catch(() => [])
  if (!messagesResponse.ok || !Array.isArray(messages)) return []

  const conversationById = Object.fromEntries(conversations.map(conversation => [conversation.id, conversation]))
  return messages
    .filter(message => !message.is_ai_reply && conversationById[message.conversation_id])
    .map(message => {
      const conversation = conversationById[message.conversation_id]
      const parsed = parseInboxContent(message.content)
      return {
        id: message.id,
        companyId: conversation.company_id,
        branchId: parsed.branchId || null,
        platform: conversation.platform,
        type: parsed.type || conversation.status || 'comment',
        senderName: message.author_name || conversation.customer_name || 'Customer',
        senderId: parsed.senderId || '',
        text: parsed.text || message.content || '',
        sourceLink: parsed.sourceLink || '',
        externalId: parsed.externalId || message.id,
        likes: Number(parsed.likes || 0),
        receivedAt: message.created_at || conversation.created_at || new Date().toISOString(),
        status: parsed.status || 'synced',
        aiReply: parsed.aiReply || '',
        error: parsed.error || '',
      }
    })
}

async function loadCompanyConfigsFromSupabase(base, headers) {
  const conversationsResponse = await fetch(`${base}/rest/v1/conversations?select=id,company_id,status,created_at&status=eq.config&order=created_at.desc&limit=1000`, { headers })
  const conversations = await conversationsResponse.json().catch(() => [])
  if (!conversationsResponse.ok || !Array.isArray(conversations) || !conversations.length) return {}

  const ids = conversations.map(conversation => conversation.id).filter(Boolean)
  if (!ids.length) return {}

  const messagesResponse = await fetch(`${base}/rest/v1/messages?select=conversation_id,content,created_at&conversation_id=in.(${ids.join(',')})&is_ai_reply=eq.true&order=created_at.desc&limit=1000`, { headers })
  const messages = await messagesResponse.json().catch(() => [])
  if (!messagesResponse.ok || !Array.isArray(messages)) return {}

  const conversationById = Object.fromEntries(conversations.map(conversation => [conversation.id, conversation]))
  const configs = {}
  for (const message of messages) {
    const conversation = conversationById[message.conversation_id]
    if (!conversation?.company_id || configs[conversation.company_id]) continue
    try {
      const parsed = JSON.parse(message.content || '{}')
      if (parsed.kind === 'company_config') configs[conversation.company_id] = parsed
    } catch {
      // Ignore old or malformed config rows.
    }
  }
  return configs
}

function normalizeBranchRow(row) {
  return {
    id: row.id,
    name: row.name || row.branch_name || 'Branch',
    location: row.location || row.address || row.city || '',
    status: row.status || 'active',
    phone: row.phone || row.phone_number || '',
    email: row.email || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || row.createdAt || new Date().toISOString(),
  }
}

function mergeBranchConfig(tableBranches = [], configBranches = []) {
  if (!Array.isArray(tableBranches) || !tableBranches.length) return configBranches
  const configById = Object.fromEntries((configBranches || []).filter(branch => branch?.id).map(branch => [branch.id, branch]))
  return tableBranches.map(branch => ({
    ...(configById[branch.id] || {}),
    ...branch,
    location: branch.location || configById[branch.id]?.location || '',
    platforms: branch.platforms || configById[branch.id]?.platforms || {},
    whatsappLink: branch.whatsappLink || configById[branch.id]?.whatsappLink || '',
  }))
}

async function loadBranchesFromSupabase(base, headers) {
  const response = await fetch(`${base}/rest/v1/branches?select=*&order=created_at.desc`, { headers })
  const rows = await response.json().catch(() => [])
  if (!response.ok || !Array.isArray(rows)) return {}

  return rows.reduce((groups, row) => {
    if (!row.company_id || !row.id) return groups
    groups[row.company_id] ||= []
    groups[row.company_id].push(normalizeBranchRow(row))
    return groups
  }, {})
}

async function saveBranchesToSupabase(base, headers, companies = [], options = {}) {
  const replaceCompanyIds = new Set(options.replaceBranchCompanyIds || [])
  const branchCompanies = companies.filter(company => company?.id)
  for (const company of branchCompanies) {
    const branches = Array.isArray(company.branches) ? company.branches : []
    if (!branches.length && !replaceCompanyIds.has(company.id)) continue

    const deleteResponse = await fetch(`${base}/rest/v1/branches?company_id=eq.${encodeURIComponent(company.id)}`, {
      method: 'DELETE',
      headers,
    })
    if (!deleteResponse.ok && deleteResponse.status !== 404) continue

    if (!branches.length) continue

    const insertResponse = await fetch(`${base}/rest/v1/branches`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(branches.map(branch => ({
        id: branch.id,
        company_id: company.id,
        name: branch.name || 'Branch',
        status: branch.status || 'active',
        created_at: branch.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))),
    })
    if (!insertResponse.ok && insertResponse.status !== 404) {
      const error = await insertResponse.json().catch(() => ({}))
      throw new Error(error?.message || `Supabase branches save failed with HTTP ${insertResponse.status}`)
    }
  }
}

async function saveCompanyConfigsToSupabase(base, headers, companies = []) {
  const configs = companies.filter(company => company?.id)
  if (!configs.length) return

  const conversations = []
  const messages = []

  for (const company of configs) {
    const conversationId = deterministicUuid(`${company.id}:company-config:conversation`)
    const messageId = deterministicUuid(`${company.id}:company-config:message`)
    conversations.push({
      id: conversationId,
      company_id: company.id,
      platform: 'system',
      customer_name: 'Usludigital 360',
      status: 'config',
      created_at: company.updatedAt || new Date().toISOString(),
    })
    messages.push({
      id: messageId,
      conversation_id: conversationId,
      author_name: 'Usludigital 360',
      content: JSON.stringify({
        kind: 'company_config',
        openaiKey: company.openaiKey || '',
        clientEmail: company.clientEmail || '',
        clientName: company.clientName || '',
        clientPassword: company.clientPassword || '',
        goal: company.goal || 'push_to_whatsapp',
        whatsappLink: company.whatsappLink || '',
        branches: company.branches || [],
        aiTraining: company.aiTraining || {},
        automation: company.automation || {},
        settings: company.settings || {},
        updatedAt: company.updatedAt || new Date().toISOString(),
      }),
      is_ai_reply: true,
      created_at: company.updatedAt || new Date().toISOString(),
    })
  }

  const conversationResponse = await fetch(`${base}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(conversations),
  })
  if (!conversationResponse.ok && conversationResponse.status !== 404) {
    const error = await conversationResponse.json().catch(() => ({}))
    throw new Error(error?.message || `Supabase config conversations save failed with HTTP ${conversationResponse.status}`)
  }

  const messageResponse = await fetch(`${base}/rest/v1/messages`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(messages),
  })
  if (!messageResponse.ok && messageResponse.status !== 404) {
    const error = await messageResponse.json().catch(() => ({}))
    throw new Error(error?.message || `Supabase config messages save failed with HTTP ${messageResponse.status}`)
  }
}

async function saveInboxItemsToSupabase(base, headers, items = []) {
  const inboxItems = items.filter(item => item.companyId && item.platform && item.type && item.text)
  if (!inboxItems.length) return

  const conversations = []
  const messages = []
  const seen = new Set()

  for (const item of inboxItems) {
    const externalId = item.externalId || item.id
    const conversationId = deterministicUuid(`${item.companyId}:${item.branchId || 'company'}:${item.platform}:${item.type}:${externalId}:conversation`)
    const messageId = deterministicUuid(`${item.companyId}:${item.branchId || 'company'}:${item.platform}:${item.type}:${externalId}:message`)
    if (seen.has(messageId)) continue
    seen.add(messageId)

    conversations.push({
      id: conversationId,
      company_id: item.companyId,
      platform: item.platform,
      customer_name: item.senderName || 'Customer',
      status: item.type,
      created_at: item.receivedAt || new Date().toISOString(),
    })
    messages.push({
      id: messageId,
      conversation_id: conversationId,
      author_name: item.senderName || 'Customer',
      content: JSON.stringify(inboxMeta({ ...item, externalId })),
      is_ai_reply: false,
      created_at: item.receivedAt || new Date().toISOString(),
    })
  }

  const conversationResponse = await fetch(`${base}/rest/v1/conversations`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(conversations),
  })
  if (!conversationResponse.ok && conversationResponse.status !== 404) {
    const error = await conversationResponse.json().catch(() => ({}))
    throw new Error(error?.message || `Supabase inbox conversations save failed with HTTP ${conversationResponse.status}`)
  }

  const messageResponse = await fetch(`${base}/rest/v1/messages`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(messages),
  })
  if (!messageResponse.ok && messageResponse.status !== 404) {
    const error = await messageResponse.json().catch(() => ({}))
    throw new Error(error?.message || `Supabase inbox messages save failed with HTTP ${messageResponse.status}`)
  }
}

function rememberConnection(store, companyId, platform, connection, branchId = '') {
  const externalId = connection?.verifiedId || connection?.id || connection?.pageId || connection?.phoneNumberId || connection?.channelId
  if (!externalId) return

  store.connections[connectionKey(platform, String(externalId), branchId)] = {
    companyId,
    branchId: branchId || null,
    platform,
    externalId: String(externalId),
    handle: connection.handle || connection.name || String(externalId),
    credentials: connection.credentials || {},
    updatedAt: new Date().toISOString(),
  }
}

function listConnections(store, companyId, branchId = '') {
  return Object.values(store.connections)
    .filter(connection => connection.companyId === companyId && String(connection.branchId || '') === String(branchId || ''))
    .map(connection => ({
      branchId: connection.branchId || null,
      platform: connection.platform,
      externalId: connection.externalId,
      handle: connection.handle,
      updatedAt: connection.updatedAt,
    }))
}

async function getInstagramAccountOptions(accessToken) {
  const accounts = await graphGet('/me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username,name}',
    access_token: accessToken,
  })

  return (accounts.data || [])
    .filter(account => account.instagram_business_account?.id)
    .map(account => ({
      pageId: account.id,
      pageName: account.name || `Facebook Page ${account.id}`,
      pageAccessToken: account.access_token,
      instagram: account.instagram_business_account,
    }))
}

async function getFacebookPageOptions(accessToken) {
  const accounts = await graphGet('/me/accounts', {
    fields: 'id,name,access_token,fan_count,followers_count',
    access_token: accessToken,
  })

  return (accounts.data || []).map(account => ({
    pageId: account.id,
    pageName: account.name || `Facebook Page ${account.id}`,
    pageAccessToken: account.access_token,
    followers: account.followers_count || account.fan_count || null,
    pageLikes: account.fan_count || null,
  }))
}

function renderInstagramAccountChooser(res, { tokenData, companyId, branchId = '', redirectUri, options }) {
  const rows = options.map(option => `
    <label class="option">
      <input type="radio" name="page_id" value="${escapeHtml(option.pageId)}" required>
      <span>
        <strong>@${escapeHtml(option.instagram.username || option.instagram.name || option.instagram.id)}</strong>
        <small>${escapeHtml(option.pageName)}</small>
      </span>
    </label>
  `).join('')

  return html(res, 200, `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Choose Instagram account</title>
        <style>
          body{font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:32px}
          .wrap{max-width:640px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 18px 50px rgba(15,23,42,.08);overflow:hidden}
          .head{padding:24px;border-bottom:1px solid #e2e8f0}
          h1{font-size:22px;margin:0 0 8px}
          p{margin:0;color:#64748b;line-height:1.5}
          form{padding:20px 24px 24px}
          .option{display:flex;gap:12px;align-items:center;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px;cursor:pointer}
          .option:hover{border-color:#2563eb;background:#eff6ff}
          input[type=radio]{width:18px;height:18px}
          strong{display:block;font-size:15px}
          small{display:block;color:#64748b;margin-top:3px}
          button{width:100%;border:0;background:#2563eb;color:white;font-weight:700;border-radius:10px;padding:13px 16px;margin-top:12px;cursor:pointer}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="head">
            <h1>Choose the Instagram account for this company</h1>
            <p>Select Codeclipse or the exact Instagram Business account you want to save in Usludigital 360.</p>
          </div>
          <form method="post" action="/api/oauth/instagram/choose">
            <input type="hidden" name="company_id" value="${escapeHtml(companyId)}">
            <input type="hidden" name="branch_id" value="${escapeHtml(branchId)}">
            <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
            <input type="hidden" name="access_token" value="${escapeHtml(tokenData.access_token)}">
            <input type="hidden" name="token_type" value="${escapeHtml(tokenData.token_type || '')}">
            <input type="hidden" name="expires_in" value="${escapeHtml(tokenData.expires_in || '')}">
            ${rows}
            <button type="submit">Connect selected account</button>
          </form>
        </div>
      </body>
    </html>`)
}

function renderFacebookPageChooser(res, { tokenData, companyId, branchId = '', redirectUri, options }) {
  const rows = options.map(option => `
    <label class="option">
      <input type="radio" name="page_id" value="${escapeHtml(option.pageId)}" required>
      <span>
        <strong>${escapeHtml(option.pageName)}</strong>
        <small>Facebook Page ID ${escapeHtml(option.pageId)}</small>
      </span>
    </label>
  `).join('')

  return html(res, 200, `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Choose Facebook Page</title>
        <style>
          body{font-family:Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:32px}
          .wrap{max-width:640px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 18px 50px rgba(15,23,42,.08);overflow:hidden}
          .head{padding:24px;border-bottom:1px solid #e2e8f0}
          h1{font-size:22px;margin:0 0 8px}
          p{margin:0;color:#64748b;line-height:1.5}
          form{padding:20px 24px 24px}
          .option{display:flex;gap:12px;align-items:center;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px;cursor:pointer}
          .option:hover{border-color:#2563eb;background:#eff6ff}
          input[type=radio]{width:18px;height:18px}
          strong{display:block;font-size:15px}
          small{display:block;color:#64748b;margin-top:3px}
          button{width:100%;border:0;background:#2563eb;color:white;font-weight:700;border-radius:10px;padding:13px 16px;margin-top:12px;cursor:pointer}
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="head">
            <h1>Choose the Facebook Page for this company</h1>
            <p>Select the exact Facebook Page you want to save in Usludigital 360.</p>
          </div>
          <form method="post" action="/api/oauth/facebook/choose">
            <input type="hidden" name="company_id" value="${escapeHtml(companyId)}">
            <input type="hidden" name="branch_id" value="${escapeHtml(branchId)}">
            <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
            <input type="hidden" name="access_token" value="${escapeHtml(tokenData.access_token)}">
            <input type="hidden" name="token_type" value="${escapeHtml(tokenData.token_type || '')}">
            <input type="hidden" name="expires_in" value="${escapeHtml(tokenData.expires_in || '')}">
            ${rows}
            <button type="submit">Connect selected page</button>
          </form>
        </div>
      </body>
    </html>`)
}

function saveSelectedInstagramOAuthConnection(store, companyId, tokenData, option, branchId = '') {
  const accessToken = tokenData.access_token
  const instagram = option.instagram
  const expiresAt = tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : null

  rememberConnection(store, companyId, 'instagram', {
    verifiedId: instagram.id,
    handle: instagram.username || instagram.name || `Instagram ${instagram.id}`,
    credentials: {
      accessToken,
      pageId: option.pageId,
      pageAccessToken: option.pageAccessToken,
      tokenType: tokenData.token_type,
      expiresAt,
    },
  }, branchId)

  return {
    instagram,
    page: { id: option.pageId, name: option.pageName },
  }
}

function saveSelectedFacebookOAuthConnection(store, companyId, tokenData, option, branchId = '') {
  const accessToken = tokenData.access_token
  const expiresAt = tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : null

  rememberConnection(store, companyId, 'facebook', {
    verifiedId: option.pageId,
    handle: option.pageName || `Facebook Page ${option.pageId}`,
    credentials: {
      accessToken: option.pageAccessToken || accessToken,
      userAccessToken: accessToken,
      tokenType: tokenData.token_type,
      expiresAt,
    },
  }, branchId)

  return {
    facebook: { id: option.pageId, name: option.pageName },
  }
}

async function saveInstagramOAuthConnection(store, companyId, tokenData, selectedPageId = '', branchId = '') {
  const accessToken = tokenData.access_token
  const options = await getInstagramAccountOptions(accessToken)
  if (!options.length) {
    throw new Error('No Instagram Business account found. Connect Instagram Business/Creator to a Facebook Page first.')
  }

  const option = options.find(item => item.pageId === selectedPageId) || options[0]
  return saveSelectedInstagramOAuthConnection(store, companyId, tokenData, option, branchId)
}

async function saveFacebookOAuthConnection(store, companyId, tokenData, selectedPageId = '', branchId = '') {
  const accessToken = tokenData.access_token
  const options = await getFacebookPageOptions(accessToken)
  if (!options.length) {
    throw new Error('No Facebook Page found for this Meta account.')
  }

  const option = options.find(item => item.pageId === selectedPageId) || options[0]
  return saveSelectedFacebookOAuthConnection(store, companyId, tokenData, option, branchId)
}

async function subscribePageToWebhookEvents(pageAccessToken, pageId, fields = 'messages,messaging_postbacks,messaging_optins') {
  try {
    const url = new URL(`${GRAPH_BASE_URL}/${pageId}/subscribed_apps`)
    url.searchParams.set('subscribed_fields', fields)
    url.searchParams.set('access_token', pageAccessToken)
    const response = await fetch(url.toString(), { method: 'POST' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.error) {
      console.error('[webhook-subscribe] Meta error:', data?.error?.message || `HTTP ${response.status}`)
      return null
    }
    console.log('[webhook-subscribe] success for page', pageId)
    return data
  } catch (err) {
    console.error('[webhook-subscribe] failed:', err.message)
    return null
  }
}

function findCompanyId(store, candidates) {
  for (const candidate of candidates.filter(Boolean).map(String)) {
    for (const platform of ['instagram', 'facebook', 'whatsapp', 'youtube']) {
      const match = Object.values(store.connections || {}).find(connection => (
        connection.platform === platform && connection.externalId === candidate
      ))
      if (match?.companyId) return { companyId: match.companyId, branchId: match.branchId || null, platform: match.platform }
    }
  }
  return { companyId: 'unmatched', branchId: null, platform: null }
}

function findCompanyConnection(store, companyId, platform, branchId = '') {
  return Object.values(store.connections).find(connection => (
    connection.companyId === companyId &&
    connection.platform === platform &&
    String(connection.branchId || '') === String(branchId || '')
  ))
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

async function instagramGrowthMetrics(store, companyId, branchId = '') {
  const connection = findCompanyConnection(store, companyId, 'instagram', branchId)
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
  const likesPreviousMonth = sum(previousMonthPosts, 'like_count')
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
      following: Number(profile.follows_count || 0),
      totalPosts: Number(profile.media_count || 0),
      postsThisMonth: thisMonthPosts.length,
      postsPreviousMonth: previousMonthPosts.length,
      postsChange: thisMonthPosts.length - previousMonthPosts.length,
      commentsThisMonth,
      commentsPreviousMonth,
      commentsChange: commentsThisMonth - commentsPreviousMonth,
      likesThisMonth,
      likesPreviousMonth,
      likesChange: likesThisMonth - likesPreviousMonth,
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

async function fetchFacebookPosts(connection, token, previousMonthStart) {
  const posts = []
  let after = ''

  for (let page = 0; page < 8; page += 1) {
    const data = await graphGet(`/${connection.externalId}/posts`, {
      fields: 'id,message,created_time,permalink_url,comments.summary(true),likes.summary(true)',
      limit: 100,
      after,
      access_token: token,
    })

    const batch = data.data || []
    posts.push(...batch)

    const oldest = batch
      .map(item => new Date(item.created_time))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b)[0]

    after = data.paging?.cursors?.after || ''
    if (!after || (oldest && oldest < previousMonthStart)) break
  }

  return posts
}

async function facebookGrowthMetrics(store, companyId, branchId = '') {
  const connection = findCompanyConnection(store, companyId, 'facebook', branchId)
  if (!connection) {
    return {
      platform: 'facebook',
      connected: false,
      error: 'Facebook Page is not connected yet.',
      summary: null,
    }
  }

  const token = connection.credentials?.accessToken
  if (!token) {
    return {
      platform: 'facebook',
      connected: true,
      error: 'Facebook is connected, but the saved token is missing. Reconnect from Growth.',
      summary: null,
    }
  }

  const profile = await graphGet(`/${connection.externalId}`, {
    fields: 'id,name,fan_count,followers_count',
    access_token: token,
  })

  const { previousMonthStart, thisMonthStart, nextMonthStart } = monthWindows()
  const posts = await fetchFacebookPosts(connection, token, previousMonthStart)
  const thisMonthPosts = posts.filter(item => inRange(new Date(item.created_time), thisMonthStart, nextMonthStart))
  const previousMonthPosts = posts.filter(item => inRange(new Date(item.created_time), previousMonthStart, thisMonthStart))
  const commentsThisMonth = thisMonthPosts.reduce((total, item) => total + Number(item.comments?.summary?.total_count || 0), 0)
  const commentsPreviousMonth = previousMonthPosts.reduce((total, item) => total + Number(item.comments?.summary?.total_count || 0), 0)
  const likesThisMonth = thisMonthPosts.reduce((total, item) => total + Number(item.likes?.summary?.total_count || 0), 0)
  const likesPreviousMonth = previousMonthPosts.reduce((total, item) => total + Number(item.likes?.summary?.total_count || 0), 0)
  const followers = Number(profile.followers_count || profile.fan_count || 0)

  return {
    platform: 'facebook',
    connected: true,
    error: '',
    profile: {
      id: profile.id,
      name: profile.name || connection.handle,
      followers,
      pageLikes: Number(profile.fan_count || 0),
    },
    summary: {
      followers,
      pageLikes: Number(profile.fan_count || 0),
      postsThisMonth: thisMonthPosts.length,
      postsPreviousMonth: previousMonthPosts.length,
      postsChange: thisMonthPosts.length - previousMonthPosts.length,
      commentsThisMonth,
      commentsPreviousMonth,
      commentsChange: commentsThisMonth - commentsPreviousMonth,
      likesThisMonth,
      likesPreviousMonth,
      likesChange: likesThisMonth - likesPreviousMonth,
      engagementRate: followers ? Number((((likesThisMonth + commentsThisMonth) / followers) * 100).toFixed(2)) : 0,
      currentMonthLabel: thisMonthStart.toLocaleString('en', { month: 'long', year: 'numeric' }),
      previousMonthLabel: previousMonthStart.toLocaleString('en', { month: 'long', year: 'numeric' }),
      lastSync: new Date().toISOString(),
    },
    recentPosts: thisMonthPosts
      .sort((a, b) => new Date(b.created_time) - new Date(a.created_time))
      .slice(0, 8)
      .map(item => ({
        id: item.id,
        caption: item.message || '',
        timestamp: item.created_time,
        comments: Number(item.comments?.summary?.total_count || 0),
        likes: Number(item.likes?.summary?.total_count || 0),
        permalink: item.permalink_url || '',
        mediaType: 'post',
      })),
  }
}

function youtubeGrowthMetrics(store, companyId, branchId = '') {
  const connection = findCompanyConnection(store, companyId, 'youtube', branchId)
  return {
    platform: 'youtube',
    connected: Boolean(connection),
    error: connection
      ? 'YouTube growth needs YouTube Data API credentials before live channel metrics can load.'
      : 'YouTube is not connected yet.',
    summary: null,
    recentPosts: [],
  }
}

function whatsappGrowthMetrics(store, companyId, branchId = '') {
  const connection = findCompanyConnection(store, companyId, 'whatsapp', branchId)
  return {
    platform: 'whatsapp',
    connected: Boolean(connection),
    error: connection
      ? 'WhatsApp message analytics need WhatsApp Business webhook events before live growth data can load.'
      : 'WhatsApp Business is not connected yet.',
    summary: null,
    recentPosts: [],
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
            branchId: routed.branchId || null,
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
        branchId: routed.branchId || null,
        type: isMessage ? 'dm' : 'comment',
        platform: routed.platform || platform,
        senderName: value.from?.name || value.sender?.name || value.sender_name || 'Customer',
        senderId: value.from?.id || value.sender?.id || value.sender_id || '',
        text: typeof value.message === 'string'
          ? value.message
          : value.message?.text || value.text || value.comment?.text || '',
        sourceLink: makePostLink(platform, value),
        externalId: value.comment_id || value.message_id || value.message?.mid || value.id || `${entryId}-${Date.now()}`,
        raw: { entry, change },
      })
    }

    for (const event of entry.messaging || []) {
      const routed = findCompanyId(store, [event.recipient?.id, entryId])
      items.push({
        companyId: routed.companyId,
        branchId: routed.branchId || null,
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

function rememberInboxItem(store, item) {
  if (!item.companyId || !item.platform || !item.externalId || !item.text) return null
  const exists = (store.items || []).find(existing =>
    existing.companyId === item.companyId &&
    String(existing.branchId || '') === String(item.branchId || '') &&
    existing.platform === item.platform &&
    existing.type === item.type &&
    existing.externalId === item.externalId
  )
  if (exists) return null

  const savedItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: item.receivedAt || new Date().toISOString(),
    status: 'synced',
    aiReply: '',
    error: '',
    ...item,
  }
  store.items.unshift(savedItem)
  store.items = store.items.slice(0, 1000)
  return savedItem
}

function replyKey(item) {
  return [item?.companyId, item?.branchId, item?.platform, item?.type, item?.externalId].map(value => String(value || '')).join(':')
}

function ensureReplyTracking(store) {
  if (!store.replyLocks || typeof store.replyLocks !== 'object') store.replyLocks = {}
  if (!store.repliedKeys || typeof store.repliedKeys !== 'object') store.repliedKeys = {}
}

function hasLiveReply(store, item) {
  ensureReplyTracking(store)
  const key = replyKey(item)
  if (!key || store.repliedKeys[key]) return Boolean(store.repliedKeys[key])
  return (store.items || []).some(existing =>
    existing.companyId === item.companyId &&
    String(existing.branchId || '') === String(item.branchId || '') &&
    existing.platform === item.platform &&
    existing.type === item.type &&
    existing.externalId === item.externalId &&
    ['replied_live', 'test_ready'].includes(existing.status)
  )
}

function beginReply(store, item) {
  ensureReplyTracking(store)
  const key = replyKey(item)
  const now = Date.now()
  const lock = store.replyLocks[key]
  const lockIsFresh = lock && now - Number(lock.startedAt || 0) < 10 * 60 * 1000
  if (store.repliedKeys[key] || lockIsFresh || hasLiveReply(store, item)) return false
  store.replyLocks[key] = { startedAt: now }
  item.status = 'replying'
  return true
}

function finishReply(store, item, result = {}) {
  ensureReplyTracking(store)
  const key = replyKey(item)
  delete store.replyLocks[key]
  if (['replied_live', 'test_ready'].includes(result.status)) {
    store.repliedKeys[key] = {
      repliedAt: new Date().toISOString(),
      itemId: item.id || '',
    }
  }
}

async function syncInstagramInbox(store, companyId, branchId = '') {
  const connection = findCompanyConnection(store, companyId, 'instagram', branchId)
  if (!connection) return []
  const token = connection.credentials?.pageAccessToken || connection.credentials?.accessToken
  if (!token) return []

  const synced = []
  const errors = []

  const mediaResponse = await graphGet(`/${connection.externalId}/media`, {
    fields: 'id,caption,timestamp,permalink,comments_count',
    limit: 100,
    access_token: token,
  }).catch(err => {
    errors.push(`Instagram media: ${err.message}`)
    return { data: [] }
  })

  for (const media of mediaResponse.data || []) {
    if (!Number(media.comments_count || 0)) continue
    const commentsResponse = await graphGet(`/${media.id}/comments`, {
      fields: 'id,text,username,timestamp,like_count,permalink',
      limit: 50,
      access_token: token,
    }).catch(err => {
      errors.push(`Instagram comments for ${media.id}: ${err.message}`)
      return { data: [] }
    })

    for (const comment of commentsResponse.data || []) {
      const saved = rememberInboxItem(store, {
        companyId,
        branchId: branchId || null,
        type: 'comment',
        platform: 'instagram',
        senderName: comment.username || 'Instagram user',
        senderId: comment.username || '',
        text: comment.text || '',
        sourceLink: comment.permalink || media.permalink || '',
        externalId: comment.id,
        likes: Number(comment.like_count || 0),
        receivedAt: comment.timestamp || media.timestamp || new Date().toISOString(),
        raw: { media, comment, synced: true },
      })
      if (saved) synced.push(saved)
    }
  }

  const conversationsResponse = await graphGet(`/${connection.externalId}/conversations`, {
    platform: 'instagram',
    fields: 'id,updated_time,participants,messages.limit(10){id,message,created_time,from,to}',
    limit: 25,
    access_token: token,
  }).catch(err => {
    errors.push(`Instagram DMs: ${err.message}`)
    return { data: [] }
  })

  for (const conversation of conversationsResponse.data || []) {
    for (const message of conversation.messages?.data || []) {
      const text = message.message || ''
      if (!text) continue
      const fromId = message.from?.id || ''
      if (fromId && fromId === connection.externalId) continue
      const saved = rememberInboxItem(store, {
        companyId,
        branchId: branchId || null,
        type: 'dm',
        platform: 'instagram',
        senderName: message.from?.username || message.from?.name || message.from?.id || 'Instagram user',
        senderId: fromId,
        text,
        sourceLink: '',
        externalId: message.id,
        receivedAt: message.created_time || conversation.updated_time || new Date().toISOString(),
        raw: { conversationId: conversation.id, message, synced: true },
      })
      if (saved) synced.push(saved)
    }
  }

  return { items: synced, errors }
}

async function syncFacebookInbox(store, companyId, branchId = '') {
  const connection = findCompanyConnection(store, companyId, 'facebook', branchId)
  if (!connection) return []
  const token = connection.credentials?.accessToken
  if (!token) return []

  const synced = []
  const errors = []

  const postsResponse = await graphGet(`/${connection.externalId}/posts`, {
    fields: 'id,message,created_time,permalink_url,comments.limit(50){id,message,from,created_time,like_count,permalink_url}',
    limit: 100,
    access_token: token,
  }).catch(err => {
    errors.push(`Facebook posts: ${err.message}`)
    return { data: [] }
  })

  for (const post of postsResponse.data || []) {
    for (const comment of post.comments?.data || []) {
      const saved = rememberInboxItem(store, {
        companyId,
        branchId: branchId || null,
        type: 'comment',
        platform: 'facebook',
        senderName: comment.from?.name || 'Facebook user',
        senderId: comment.from?.id || '',
        text: comment.message || '',
        sourceLink: comment.permalink_url || post.permalink_url || '',
        externalId: comment.id,
        likes: Number(comment.like_count || 0),
        receivedAt: comment.created_time || post.created_time || new Date().toISOString(),
        raw: { post, comment, synced: true },
      })
      if (saved) synced.push(saved)
    }
  }

  const conversationsResponse = await graphGet(`/${connection.externalId}/conversations`, {
    fields: 'id,updated_time,participants,messages.limit(10){id,message,created_time,from,to}',
    limit: 25,
    access_token: token,
  }).catch(err => {
    errors.push(`Facebook DMs: ${err.message}`)
    return { data: [] }
  })

  for (const conversation of conversationsResponse.data || []) {
    for (const message of conversation.messages?.data || []) {
      const text = message.message || ''
      if (!text) continue
      const fromId = message.from?.id || ''
      if (fromId && fromId === connection.externalId) continue
      const saved = rememberInboxItem(store, {
        companyId,
        branchId: branchId || null,
        type: 'dm',
        platform: 'facebook',
        senderName: message.from?.name || message.from?.id || 'Facebook user',
        senderId: fromId,
        text,
        sourceLink: '',
        externalId: message.id,
        receivedAt: message.created_time || conversation.updated_time || new Date().toISOString(),
        raw: { conversationId: conversation.id, message, synced: true },
      })
      if (saved) synced.push(saved)
    }
  }

  return { items: synced, errors }
}

async function syncLiveInbox(store, companyId, branchId = '') {
  const results = await Promise.allSettled([
    syncInstagramInbox(store, companyId, branchId),
    syncFacebookInbox(store, companyId, branchId),
  ])
  return results.reduce((acc, result) => {
    if (result.status === 'fulfilled') {
      acc.items.push(...(result.value?.items || []))
      acc.errors.push(...(result.value?.errors || []))
    } else {
      acc.errors.push(result.reason?.message || 'Inbox sync failed.')
    }
    return acc
  }, { items: [], errors: [] })
}

function systemPromptFor(company, item) {
  const training = company?.aiTraining || {}
  const automation = company?.automation?.[item.platform] || {}
  const fallback = training.fallbackMessage || 'Please contact us directly for more details.'
  return [
    `You are replying for ${company?.name || 'this company'}.`,
    training.description ? `Business context: ${training.description}` : '',
    `Incoming ${item.type} on ${item.platform}: "${item.text || ''}"`,
    `Tone: ${automation.tone || training.tone || 'professional'}.`,
    item.type === 'comment' ? 'Write a public comment reply that directly reacts to this specific comment. Do not sound copied or generic.' : '',
    item.type === 'dm' ? 'Write a private DM reply that answers the customer naturally and moves the conversation forward.' : '',
    company?.goal === 'push_to_whatsapp' && company?.whatsappLink ? `Include this WhatsApp link naturally when helpful: ${company.whatsappLink}` : '',
    training.guardrails ? `If you are not sure, reply with this fallback: "${fallback}"` : '',
    'Every reply must be different in wording. Do not reuse the same greeting or sentence pattern repeatedly.',
    'Answer based on the message. If they ask price, availability, timing, location, or details you do not know, ask one helpful follow-up or use the fallback instead of inventing.',
    'Keep replies concise, human, warm, and safe. Avoid sounding like an AI assistant.',
  ].filter(Boolean).join('\n')
}

function isAutomationScheduleActive(company) {
  const schedule = company?.automation?.schedule || {}
  if (schedule.enabled === false) return false
  const now = Date.now()
  const start = schedule.startAt ? Date.parse(schedule.startAt) : null
  const end = schedule.endAt ? Date.parse(schedule.endAt) : null
  if (start && Number.isFinite(start) && now < start) return false
  if (end && Number.isFinite(end) && now > end) return false
  return true
}

function getAutomationStartTime(company) {
  const value = company?.automation?.schedule?.startAt
  const time = value ? Date.parse(value) : null
  return time && Number.isFinite(time) ? time : null
}

function isAfterAutomationStart(company, item) {
  const start = getAutomationStartTime(company)
  if (!start) return true
  const received = item?.receivedAt ? Date.parse(item.receivedAt) : Date.now()
  return Number.isFinite(received) && received >= start
}

function shouldAutoReply(company, item) {
  if (!isAutomationScheduleActive(company)) return false
  if (!isAfterAutomationStart(company, item)) return false
  const settings = company?.automation?.[item.platform]
  if (!settings) return false
  if (item.type === 'comment' && !settings.commentReply) return false
  if (item.type === 'dm' && !settings.dmReply) return false
  const lowered = item.text.toLowerCase()
  if ((settings.blacklist || []).some(word => lowered.includes(String(word).toLowerCase()))) return false
  return true
}

function isBackfillCandidate(company, item, platform = 'all') {
  if (!item || item.companyId !== company.id || item.aiReply || item.status === 'replied_live' || item.status === 'reply_failed') return false
  if (platform !== 'all' && item.platform !== platform) return false
  const start = getAutomationStartTime(company)
  if (!start) return false
  const received = item.receivedAt ? Date.parse(item.receivedAt) : 0
  return Number.isFinite(received) && received < start
}

function estimateBackfillCost(count) {
  const inputTokensPerMessage = 450
  const outputTokensPerReply = 90
  const inputPricePerMillion = 0.4
  const outputPricePerMillion = 1.6
  const inputTokens = count * inputTokensPerMessage
  const outputTokens = count * outputTokensPerReply
  const estimatedOpenaiUsd = (inputTokens / 1_000_000) * inputPricePerMillion + (outputTokens / 1_000_000) * outputPricePerMillion
  return {
    model: 'gpt-4.1-mini fallback estimate',
    estimatedReplies: count,
    inputTokens,
    outputTokens,
    estimatedOpenaiUsd: Number(estimatedOpenaiUsd.toFixed(4)),
    suggestedClientPriceUsd: Number(Math.max(5, estimatedOpenaiUsd * 8).toFixed(2)),
  }
}

async function generateAiReply(company, item, options = {}) {
  const apiKey = company?.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return { reply: '', status: 'needs_openai_key', error: 'OpenAI key is missing on the backend.' }
  if (!options.force && !shouldAutoReply(company, item)) return { reply: '', status: 'received', error: '' }

  let lastError = ''
  for (const model of OPENAI_MODEL_FALLBACKS) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPromptFor(company, item) },
          { role: 'user', content: item.text },
        ],
        temperature: 0.85,
        presence_penalty: 0.35,
        frequency_penalty: 0.45,
        max_tokens: 180,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      return { reply: data.choices?.[0]?.message?.content || '', status: 'ai_replied', error: '', model }
    }

    lastError = data?.error?.message || `OpenAI HTTP ${response.status}`
    const canTryNextModel = /does not have access to model|model .* does not exist|invalid model|model_not_found/i.test(lastError)
    if (!canTryNextModel) break
  }

  return { reply: '', status: 'ai_error', error: lastError || 'OpenAI request failed.' }
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
  const token = connection?.credentials?.pageAccessToken || connection?.credentials?.accessToken

  if (item.type === 'dm' && String(item.senderId || '').startsWith('test-dm-')) {
    return {
      status: 'test_ready',
      error: 'Test DM generated locally. Real Instagram DM sending requires a valid Instagram-scoped sender ID from Meta webhooks.',
    }
  }

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
    const existing = (store.items || []).find(existing =>
      existing.companyId === item.companyId &&
      existing.platform === item.platform &&
      existing.type === item.type &&
      existing.externalId === item.externalId
    )
    if (existing) continue
    if (hasLiveReply(store, item)) continue

    const company = store.companies[item.companyId] || {}
    let replyStarted = false
    const ai = await generateAiReply(company, item).catch(err => ({
      reply: '',
      status: 'ai_error',
      error: err.message,
    }))
    let postResult = { status: ai.status, error: ai.error }
    if (ai.reply) {
      replyStarted = beginReply(store, item)
      postResult = replyStarted
        ? await postPlatformReply(store, item, ai.reply).catch(err => ({ status: 'reply_failed', error: err.message }))
        : { status: 'already_replied', error: 'This comment or message already has a live reply.' }
      if (replyStarted) finishReply(store, item, postResult)
    }
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

async function processAutoReplies(store, items = []) {
  const processed = []
  for (const item of items) {
    const savedItem = (store.items || []).find(existing => existing.id === item.id) || item
    if (!savedItem || savedItem.aiReply || savedItem.status === 'replied_live' || savedItem.status === 'reply_failed' || savedItem.status === 'replying') continue
    if (!beginReply(store, savedItem)) continue

    const company = store.companies[savedItem.companyId] || {}
    const ai = await generateAiReply(company, savedItem).catch(err => ({
      reply: '',
      status: 'ai_error',
      error: err.message,
    }))
    const postResult = ai.reply
      ? await postPlatformReply(store, savedItem, ai.reply).catch(err => ({ status: 'reply_failed', error: err.message }))
      : { status: ai.status, error: ai.error }
    finishReply(store, savedItem, postResult)

    Object.assign(savedItem, {
      status: ai.reply ? postResult.status : ai.status,
      aiReply: ai.reply,
      error: postResult.error || ai.error,
    })
    if (ai.reply) processed.push(savedItem)
  }
  return processed
}

async function processBackfillReplies(store, company, items = []) {
  const processed = []
  for (const item of items) {
    const savedItem = (store.items || []).find(existing => existing.id === item.id) || item
    if (!savedItem || savedItem.aiReply || savedItem.status === 'replied_live' || savedItem.status === 'reply_failed' || savedItem.status === 'replying') continue
    if (!beginReply(store, savedItem)) continue

    const settings = company?.automation?.[savedItem.platform]
    if (!settings) {
      finishReply(store, savedItem, { status: 'received' })
      continue
    }
    if (savedItem.type === 'comment' && !settings.commentReply) {
      finishReply(store, savedItem, { status: 'received' })
      continue
    }
    if (savedItem.type === 'dm' && !settings.dmReply) {
      finishReply(store, savedItem, { status: 'received' })
      continue
    }
    const lowered = String(savedItem.text || '').toLowerCase()
    if ((settings.blacklist || []).some(word => lowered.includes(String(word).toLowerCase()))) {
      finishReply(store, savedItem, { status: 'received' })
      continue
    }

    const ai = await generateAiReply(company, savedItem, { force: true }).catch(err => ({
      reply: '',
      status: 'ai_error',
      error: err.message,
    }))
    const postResult = ai.reply
      ? await postPlatformReply(store, savedItem, ai.reply).catch(err => ({ status: 'reply_failed', error: err.message }))
      : { status: ai.status, error: ai.error }
    finishReply(store, savedItem, postResult)

    Object.assign(savedItem, {
      status: ai.reply ? postResult.status : ai.status,
      aiReply: ai.reply,
      error: postResult.error || ai.error,
      backfilledAt: new Date().toISOString(),
    })
    if (ai.reply) processed.push(savedItem)
  }
  return processed
}

async function replyToInboxItem(store, companyId, itemId, text) {
  const item = (store.items || []).find(existing => existing.companyId === companyId && existing.id === itemId)
  if (!item) throw new Error('Inbox item was not found.')
  if (!text?.trim()) throw new Error('Reply text is required.')
  if (!beginReply(store, item)) throw new Error('This comment or message already has a live reply.')

  const postResult = await postPlatformReply(store, item, text.trim()).catch(err => ({
    status: 'reply_failed',
    error: err.message,
  }))
  finishReply(store, item, postResult)
  Object.assign(item, {
    status: postResult.status,
    aiReply: text.trim(),
    error: postResult.error || '',
    repliedAt: new Date().toISOString(),
  })
  return item
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
      return json(res, 200, {
        ok: true,
        service: 'usludigital-360-api',
        storage: SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'temporary',
        companies: Object.keys(store.companies || {}).length,
      })
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
        branchId: url.searchParams.get('branch_id') || '',
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
      const branchId = state.branchId || ''
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

      let connected
      if (platform === 'instagram') {
        const options = await getInstagramAccountOptions(tokenData.access_token)
        if (options.length > 1) {
          return renderInstagramAccountChooser(res, {
            tokenData,
            companyId: state.companyId,
            branchId,
            redirectUri: fallbackRedirect,
            options,
          })
        }
        connected = options.length === 1
          ? saveSelectedInstagramOAuthConnection(store, state.companyId, tokenData, options[0], branchId)
          : await saveInstagramOAuthConnection(store, state.companyId, tokenData, '', branchId)
        const igConnection = findCompanyConnection(store, state.companyId, 'instagram', branchId)
        if (igConnection?.credentials?.pageAccessToken && igConnection?.credentials?.pageId) {
          await subscribePageToWebhookEvents(igConnection.credentials.pageAccessToken, igConnection.credentials.pageId, 'messages,messaging_postbacks,messaging_optins')
        }
      } else {
        const options = await getFacebookPageOptions(tokenData.access_token)
        if (options.length > 1) {
          return renderFacebookPageChooser(res, {
            tokenData,
            companyId: state.companyId,
            branchId,
            redirectUri: fallbackRedirect,
            options,
          })
        }
        connected = options.length === 1
          ? saveSelectedFacebookOAuthConnection(store, state.companyId, tokenData, options[0], branchId)
          : await saveFacebookOAuthConnection(store, state.companyId, tokenData, '', branchId)
        const fbConnection = findCompanyConnection(store, state.companyId, 'facebook', branchId)
        if (fbConnection?.credentials?.accessToken) {
          await subscribePageToWebhookEvents(fbConnection.credentials.accessToken, fbConnection.externalId, 'messages,messaging_postbacks,messaging_optins,comments')
        }
      }
      await saveStore(store)

      const success = new URL(fallbackRedirect)
      success.searchParams.set('platform', platform)
      success.searchParams.set('connected', 'true')
      if (branchId) success.searchParams.set('branch_id', branchId)
      if (connected.instagram?.id) success.searchParams.set('instagram_id', connected.instagram.id)
      if (connected.facebook?.id) success.searchParams.set('facebook_id', connected.facebook.id)
      return redirect(res, success.toString())
    }

    if (req.method === 'POST' && url.pathname === '/api/oauth/instagram/choose') {
      const body = await readFormBody(req)
      const companyId = body.get('company_id')
      const branchId = body.get('branch_id') || ''
      const selectedPageId = body.get('page_id')
      const redirectUri = body.get('redirect_uri') || '/'
      const accessToken = body.get('access_token')

      if (!companyId || !selectedPageId || !accessToken) {
        return json(res, 400, { error: 'Missing selected Instagram account details.' })
      }
      if (SUPABASE_URL && !isUuid(companyId)) {
        return json(res, 400, { error: 'Open a real company from the dashboard and connect Instagram again.' })
      }

      const options = await getInstagramAccountOptions(accessToken)
      const selected = options.find(option => option.pageId === selectedPageId)
      if (!selected) return json(res, 400, { error: 'Selected Instagram account was not found in Meta response.' })

      const connected = saveSelectedInstagramOAuthConnection(store, companyId, {
        access_token: accessToken,
        token_type: body.get('token_type') || '',
        expires_in: body.get('expires_in') || '',
      }, selected, branchId)
      const igConnection = findCompanyConnection(store, companyId, 'instagram', branchId)
      if (igConnection?.credentials?.pageAccessToken && igConnection?.credentials?.pageId) {
        await subscribePageToWebhookEvents(igConnection.credentials.pageAccessToken, igConnection.credentials.pageId, 'messages,messaging_postbacks,messaging_optins')
      }
      await saveStore(store)

      const success = new URL(redirectUri)
      success.searchParams.set('platform', 'instagram')
      success.searchParams.set('connected', 'true')
      if (branchId) success.searchParams.set('branch_id', branchId)
      success.searchParams.set('instagram_id', connected.instagram.id)
      return redirect(res, success.toString())
    }

    if (req.method === 'POST' && url.pathname === '/api/oauth/facebook/choose') {
      const body = await readFormBody(req)
      const companyId = body.get('company_id')
      const branchId = body.get('branch_id') || ''
      const selectedPageId = body.get('page_id')
      const redirectUri = body.get('redirect_uri') || '/'
      const accessToken = body.get('access_token')

      if (!companyId || !selectedPageId || !accessToken) {
        return json(res, 400, { error: 'Missing selected Facebook Page details.' })
      }
      if (SUPABASE_URL && !isUuid(companyId)) {
        return json(res, 400, { error: 'Open a real company from the dashboard and connect Facebook again.' })
      }

      const options = await getFacebookPageOptions(accessToken)
      const selected = options.find(option => option.pageId === selectedPageId)
      if (!selected) return json(res, 400, { error: 'Selected Facebook Page was not found in Meta response.' })

      const connected = saveSelectedFacebookOAuthConnection(store, companyId, {
        access_token: accessToken,
        token_type: body.get('token_type') || '',
        expires_in: body.get('expires_in') || '',
      }, selected, branchId)
      const fbConnection = findCompanyConnection(store, companyId, 'facebook', branchId)
      if (fbConnection?.credentials?.accessToken) {
        await subscribePageToWebhookEvents(fbConnection.credentials.accessToken, fbConnection.externalId, 'messages,messaging_postbacks,messaging_optins,comments')
      }
      await saveStore(store)

      const success = new URL(redirectUri)
      success.searchParams.set('platform', 'facebook')
      success.searchParams.set('connected', 'true')
      if (branchId) success.searchParams.set('branch_id', branchId)
      success.searchParams.set('facebook_id', connected.facebook.id)
      return redirect(res, success.toString())
    }

    if (req.method === 'GET' && url.pathname === '/meta/webhook') {
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')
      if (mode === 'subscribe' && META_VERIFY_TOKENS.has(token)) {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        return res.end(challenge || '')
      }
      return json(res, 403, { error: 'Webhook verify token does not match.' })
    }

    if (req.method === 'POST' && url.pathname === '/meta/webhook') {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const rawBody = Buffer.concat(chunks)
      const body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {}

      const appSecret = process.env.META_APP_SECRET
      if (appSecret) {
        const sig = req.headers['x-hub-signature-256'] || ''
        const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
        if (sig !== expected) return json(res, 403, { error: 'Invalid webhook signature.' })
      }

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
      const workspaceOpenaiKey = getWorkspaceOpenaiKey(store)
      const existingCompany = store.companies[body.company.id] || {}
      store.companies[body.company.id] = {
        ...existingCompany,
        ...body.company,
        branches: Array.isArray(existingCompany.branches) && existingCompany.branches.length
          ? existingCompany.branches
          : body.company.branches || [],
        openaiKey: body.company.openaiKey || existingCompany.openaiKey || workspaceOpenaiKey,
        updatedAt: new Date().toISOString(),
      }
      await saveStore(store)
      return json(res, 200, { ok: true, company: store.companies[body.company.id] })
    }

    const companyParams = routeParams(url.pathname, '/api/companies/:companyId')
    if (req.method === 'PUT' && companyParams) {
      const body = await readBody(req)
      const incomingCompany = body.company || {}
      const allowBranchUpdate = body.allowBranchUpdate === true
      const existingCompany = store.companies[companyParams.companyId] || companyDefaults({
        id: companyParams.companyId,
        name: incomingCompany.name || 'Company',
      })
      store.companies[companyParams.companyId] = {
        ...existingCompany,
        ...incomingCompany,
        branches: allowBranchUpdate
          ? (Array.isArray(incomingCompany.branches) ? incomingCompany.branches : existingCompany.branches || [])
          : existingCompany.branches || [],
        id: companyParams.companyId,
        updatedAt: new Date().toISOString(),
      }
      await saveStore(store, allowBranchUpdate ? { replaceBranchCompanyIds: [companyParams.companyId] } : {})
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
      const branchId = url.searchParams.get('branch_id') || ''
      return json(res, 200, { connections: listConnections(store, connectionParams.companyId, branchId) })
    }

    if (req.method === 'POST' && connectionParams) {
      const body = await readBody(req)
      const branchId = url.searchParams.get('branch_id') || body.branchId || ''
      rememberConnection(store, connectionParams.companyId, body.platform, body.connection, branchId)
      await saveStore(store)
      return json(res, 200, { ok: true })
    }

    const connectionPlatformParams = routeParams(url.pathname, '/api/companies/:companyId/connections/:platform')
    if (req.method === 'DELETE' && connectionPlatformParams) {
      const branchId = url.searchParams.get('branch_id') || ''
      store.connections = Object.fromEntries(
        Object.entries(store.connections || {}).filter(([, connection]) => (
          connection.companyId !== connectionPlatformParams.companyId ||
          connection.platform !== connectionPlatformParams.platform ||
          String(connection.branchId || '') !== String(branchId || '')
        ))
      )
      if (branchId || !(await deleteConnectionFromSupabase(connectionPlatformParams.companyId, connectionPlatformParams.platform))) {
        await saveStore(store)
      }
      return json(res, 200, { ok: true })
    }

    const growthParams = routeParams(url.pathname, '/api/companies/:companyId/growth')
    if (req.method === 'GET' && growthParams) {
      const branchId = url.searchParams.get('branch_id') || ''
      const connections = listConnections(store, growthParams.companyId, branchId)
      const instagram = await instagramGrowthMetrics(store, growthParams.companyId, branchId).catch(err => ({
        platform: 'instagram',
        connected: Boolean(findCompanyConnection(store, growthParams.companyId, 'instagram', branchId)),
        error: err.message || 'Could not load Instagram growth data.',
        summary: null,
      }))
      const facebook = await facebookGrowthMetrics(store, growthParams.companyId, branchId).catch(err => ({
        platform: 'facebook',
        connected: Boolean(findCompanyConnection(store, growthParams.companyId, 'facebook', branchId)),
        error: err.message || 'Could not load Facebook growth data.',
        summary: null,
      }))
      const youtube = youtubeGrowthMetrics(store, growthParams.companyId, branchId)
      const whatsapp = whatsappGrowthMetrics(store, growthParams.companyId, branchId)
      return json(res, 200, {
        connectedPlatforms: connections.length,
        connections,
        instagram,
        facebook,
        youtube,
        whatsapp,
        platforms: { instagram, facebook, youtube, whatsapp },
        metrics: instagram.summary || {
          followers: 0,
          following: 0,
          totalPosts: 0,
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
    if (req.method === 'GET' && aiParams) {
      const company = store.companies[aiParams.companyId]
      if (!company) return json(res, 404, { error: 'Company not found.' })
      return json(res, 200, {
        hasOpenaiKey: Boolean(getWorkspaceOpenaiKey(store) || company.openaiKey),
        model: OPENAI_MODEL,
        modelFallbacks: OPENAI_MODEL_FALLBACKS,
        aiTraining: company.aiTraining || {},
        automation: company.automation || {},
      })
    }

    if (req.method === 'POST' && aiParams) {
      const body = await readBody(req)
      const existing = store.companies[aiParams.companyId] || companyDefaults({ id: aiParams.companyId, name: body.company?.name || 'Company' })
      const hasOpenaiKeyChange = Object.prototype.hasOwnProperty.call(body, 'openaiKey')
      const nextOpenaiKey = hasOpenaiKeyChange ? body.openaiKey : existing.openaiKey || getWorkspaceOpenaiKey(store)
      store.companies[aiParams.companyId] = {
        ...existing,
        ...(body.company || {}),
        id: aiParams.companyId,
        branches: existing.branches || [],
        aiTraining: {
          ...(existing.aiTraining || {}),
          ...(body.company?.aiTraining || {}),
        },
        automation: {
          ...(existing.automation || {}),
          ...(body.company?.automation || {}),
          schedule: {
            ...(existing.automation?.schedule || automationDefaults().schedule),
            ...(body.company?.automation?.schedule || {}),
            startAt: body.company?.automation?.schedule?.startAt || existing.automation?.schedule?.startAt || new Date().toISOString(),
          },
        },
        openaiKey: nextOpenaiKey,
        updatedAt: new Date().toISOString(),
      }
      if (hasOpenaiKeyChange) {
        for (const company of Object.values(store.companies || {})) {
          company.openaiKey = nextOpenaiKey
          company.hasOpenaiKey = Boolean(nextOpenaiKey)
          company.updatedAt = new Date().toISOString()
        }
      }
      await saveStore(store)
      return json(res, 200, { ok: true, appliedToAllCompanies: hasOpenaiKeyChange, hasOpenaiKey: Boolean(nextOpenaiKey) })
    }

    const aiTestParams = routeParams(url.pathname, '/api/companies/:companyId/ai-test')
    if (req.method === 'POST' && aiTestParams) {
      const body = await readBody(req)
      const company = store.companies[aiTestParams.companyId]
      if (!company) return json(res, 404, { error: 'Company not found.' })
      if (!String(body.text || '').trim()) return json(res, 400, { error: 'text is required.' })
      const result = await generateAiReply(company, {
        platform: 'instagram',
        type: 'dm',
        text: String(body.text || '').trim(),
      }, { force: true })
      if (result.error) return json(res, result.status === 'needs_openai_key' ? 400 : 502, { error: result.error, status: result.status })
      return json(res, 200, { reply: result.reply, model: result.model || OPENAI_MODEL })
    }

    if (req.method === 'GET' && url.pathname === '/api/report-email/status') {
      const status = getReportEmailStatus()
      return json(res, 200, {
        ...status,
        senderLabel: status.sender || REPORT_FROM_NAME,
      })
    }

    const sendReportParams = routeParams(url.pathname, '/api/companies/:companyId/send-report')
    if (req.method === 'POST' && sendReportParams) {
      const body = await readBody(req)
      const company = store.companies[sendReportParams.companyId]
      if (!company) return json(res, 404, { error: 'Company not found.' })

      const { recipients, invalid } = parseReportRecipients(body.toEmails || body.toEmail)
      if (!recipients.length) return json(res, 400, { error: 'Add at least one recipient email.' })
      if (recipients.length > 3) return json(res, 400, { error: 'You can send a report to maximum 3 email addresses.' })
      if (invalid.length) return json(res, 400, { error: `Invalid recipient email: ${invalid[0]}` })

      const report = {
        id: body.reportId || `manual-${Date.now()}`,
        month: body.month,
        summary: body.summary,
        bestPost: body.bestPost,
        totalReplies: body.totalReplies,
        waClicks: body.waClicks,
      }

      const info = await sendReportEmail({ company, report, recipients })
      return json(res, 200, {
        ok: true,
        recipients,
        fromEmail: REPORT_FROM_EMAIL || SMTP_USER || GMAIL_USER,
        provider: info.provider || getReportEmailStatus().provider,
        messageId: info.messageId || '',
      })
    }

    const inboxReplyParams = routeParams(url.pathname, '/api/companies/:companyId/inbox/:itemId/reply')
    if (req.method === 'POST' && inboxReplyParams) {
      const body = await readBody(req)
      const item = await replyToInboxItem(store, inboxReplyParams.companyId, inboxReplyParams.itemId, body.text || body.reply || '')
      await saveStore(store)
      return json(res, 200, { ok: true, item })
    }

    const backfillEstimateParams = routeParams(url.pathname, '/api/companies/:companyId/backfill/estimate')
    if (req.method === 'POST' && backfillEstimateParams) {
      const body = await readBody(req)
      const company = store.companies[backfillEstimateParams.companyId]
      if (!company) return json(res, 404, { error: 'Company not found.' })
      const platform = body.platform || 'all'
      const maxItems = Math.max(1, Math.min(Number(body.maxItems || 100), 1000))
      const syncResult = await syncLiveInbox(store, backfillEstimateParams.companyId)
      if (syncResult.items.length) await saveStore(store)
      const candidates = (store.items || [])
        .filter(item => isBackfillCandidate(company, item, platform))
        .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0))
      const selected = candidates.slice(0, maxItems)
      return json(res, 200, {
        ok: true,
        platform,
        found: candidates.length,
        selected: selected.length,
        comments: selected.filter(item => item.type === 'comment').length,
        dms: selected.filter(item => item.type === 'dm').length,
        estimate: estimateBackfillCost(selected.length),
        syncErrors: syncResult.errors,
      })
    }

    const backfillRunParams = routeParams(url.pathname, '/api/companies/:companyId/backfill/run')
    if (req.method === 'POST' && backfillRunParams) {
      const body = await readBody(req)
      if (body.confirm !== 'CONFIRM') return json(res, 400, { error: 'Type CONFIRM to start replying to previous messages.' })
      const company = store.companies[backfillRunParams.companyId]
      if (!company) return json(res, 404, { error: 'Company not found.' })
      const platform = body.platform || 'all'
      const maxItems = Math.max(1, Math.min(Number(body.maxItems || 100), 1000))
      const syncResult = await syncLiveInbox(store, backfillRunParams.companyId)
      const candidates = (store.items || [])
        .filter(item => isBackfillCandidate(company, item, platform))
        .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0))
        .slice(0, maxItems)
      const processed = await processBackfillReplies(store, company, candidates)
      await saveStore(store)
      return json(res, 200, {
        ok: true,
        found: candidates.length,
        processed: processed.length,
        estimate: estimateBackfillCost(candidates.length),
        syncErrors: syncResult.errors,
      })
    }

    const inboxParams = routeParams(url.pathname, '/api/companies/:companyId/inbox')
    if (req.method === 'GET' && inboxParams) {
      const type = url.searchParams.get('type') || 'all'
      const shouldSync = url.searchParams.get('sync') === '1'
      const branchId = url.searchParams.get('branch_id') || ''
      const syncResult = shouldSync ? await syncLiveInbox(store, inboxParams.companyId, branchId) : { items: [], errors: [] }
      const pendingItems = shouldSync
        ? store.items
          .filter(item => item.companyId === inboxParams.companyId && String(item.branchId || '') === String(branchId || '') && !item.aiReply && item.status !== 'reply_failed')
          .sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0))
          .slice(0, 50)
        : []
      const replies = shouldSync ? await processAutoReplies(store, pendingItems) : []
      if (shouldSync && (syncResult.items.length || replies.length)) await saveStore(store)
      const items = store.items.filter(item => {
        if (item.companyId !== inboxParams.companyId) return false
        if (String(item.branchId || '') !== String(branchId || '')) return false
        return type === 'all' || item.type === type
      }).sort((a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0))
      return json(res, 200, { items, synced: syncResult.items.length, autoReplied: replies.length, syncErrors: syncResult.errors, liveSynced: shouldSync })
    }

    if (req.method === 'POST' && inboxParams) {
      const body = await readBody(req)
      const branchId = url.searchParams.get('branch_id') || body.branchId || ''
      const incoming = [{
        companyId: inboxParams.companyId,
        branchId: branchId || null,
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
