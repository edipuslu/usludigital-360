export const USERS = [
  { id: 'admin-1', email: 'admin@usludigital.com', password: 'admin123', role: 'admin', name: 'Usludigital Admin', avatar: 'UA', companyId: 'workspace' },
  { id: 'client-1', email: 'client@usludigital.com', password: 'client123', role: 'client', name: 'Client User', avatar: 'CU', companyId: 'workspace' },
]

const emptyDaily = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, date: `Jun ${i + 1}`, clicks: 0, replies: 0 }))

const emptyHeatmap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
  day,
  hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, value: 0 })),
}))

const disconnectedPlatforms = {
  instagram: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  facebook: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  youtube: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  whatsapp: { connected: false, handle: null, followers: null, lastSync: null, error: null },
  tiktok: { connected: false, handle: null, followers: null, lastSync: null, error: null },
}

const emptyMetrics = {
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
}

const emptyAI = {
  status: 'needs_update',
  lastTrained: null,
  progress: 0,
  documents: [],
  websiteUrl: '',
  guardrails: true,
  fallbackMessage: 'For more info, please contact us directly.',
  description: '',
  tone: 'professional',
}

export const COMPANIES = [
  {
    id: 'workspace',
    name: 'Workspace',
    slug: 'workspace',
    industry: 'Social Media Automation',
    clientEmail: 'client@usludigital.com',
    clientName: 'Client User',
    status: 'needs_update',
    createdAt: '2026-06-16',
    initials: 'UD',
    accentColor: '#2563EB',
    platforms: {
      instagram: { ...disconnectedPlatforms.instagram },
      facebook: { ...disconnectedPlatforms.facebook },
      youtube: { ...disconnectedPlatforms.youtube },
      whatsapp: { ...disconnectedPlatforms.whatsapp },
      tiktok: { ...disconnectedPlatforms.tiktok },
    },
    goal: 'push_to_whatsapp',
    whatsappLink: '',
    aiTraining: { ...emptyAI },
    automation: {
      schedule: { enabled: true, startAt: '', endAt: '', timezone: 'Africa/Casablanca' },
      instagram: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
      facebook: { dmReply: true, commentReply: true, tone: 'professional', blacklist: [] },
      youtube: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
      whatsapp: { dmReply: true, commentReply: false, tone: 'professional', blacklist: [] },
      tiktok: { dmReply: false, commentReply: false, tone: 'professional', blacklist: [] },
    },
    metrics: emptyMetrics,
    reports: [],
    notifications: [
      {
        id: 'setup-platforms',
        type: 'warning',
        message: 'Connect Instagram, Facebook, YouTube, or WhatsApp to start automation.',
        time: 'Just now',
        read: false,
      },
    ],
    settings: {
      workspaceName: 'Workspace',
      notificationEmail: 'admin@usludigital.com',
      timezone: 'Africa/Casablanca',
      adminAlerts: true,
      clientAlerts: true,
      monthlyReportEmail: true,
      spikeAlerts: true,
    },
  },
]

export const ADMIN_STATS = {
  totalCompanies: 0,
  activeCompanies: 0,
  totalRepliesThisMonth: 0,
  totalWAClicksThisMonth: 0,
  companiesWithErrors: 0,
}
