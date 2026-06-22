// Local dev uses the Node/Worker API on 8787. Production uses same-origin Vercel routes.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : ''
)

async function request(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data?.error || `Request failed with HTTP ${res.status}`)
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

export function backendUrl(path = '') {
  return `${API_BASE_URL}${path}`
}

export function getCompanies() {
  return request('/api/companies')
}

export function saveBackendCompany(company) {
  return request('/api/companies', {
    method: 'POST',
    body: JSON.stringify({ company }),
  })
}

export function updateBackendCompany(company, options = {}) {
  return request(`/api/companies/${encodeURIComponent(company.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      company,
      allowBranchUpdate: Boolean(options.allowBranchUpdate),
    }),
  })
}

export function deleteBackendCompany(companyId) {
  return request(`/api/companies/${encodeURIComponent(companyId)}`, {
    method: 'DELETE',
  })
}

// Register platform connection (Instagram, Facebook, YouTube)
export function registerConnection(companyId, platform, connection, options = {}) {
  const branch = options.branchId && options.branchId !== 'all' ? `?branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/connections${branch}`, {
    method: 'POST',
    body: JSON.stringify({ platform, connection, branchId: options.branchId || null }),
  })
}

// Get all platform connections for a company
export function getConnections(companyId, options = {}) {
  const branch = options.branchId && options.branchId !== 'all' ? `?branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/connections${branch}`)
}

export function deleteConnection(companyId, platform, options = {}) {
  const branch = options.branchId && options.branchId !== 'all' ? `?branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/connections/${encodeURIComponent(platform)}${branch}`, {
    method: 'DELETE',
  })
}

// Fetch growth metrics (followers, posts, engagement)
export function fetchGrowthMetrics(companyId, options = {}) {
  const branch = options.branchId && options.branchId !== 'all' ? `?branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/growth${branch}`)
}

// Save AI config and training data. Only send openaiKey when it is being changed,
// so normal training saves do not erase a key stored on the backend.
export function saveBackendAiConfig(company, openaiKey) {
  const body = {
    company: {
      id: company.id,
      name: company.name,
      goal: company.goal,
      whatsappLink: company.whatsappLink,
      aiTraining: company.aiTraining,
      automation: company.automation,
      automationFlows: company.automationFlows,
      automationFolders: company.automationFolders,
    },
  }

  if (arguments.length > 1) {
    body.openaiKey = openaiKey || ''
  }

  return request(`/api/companies/${encodeURIComponent(company.id)}/ai-config`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getBackendAiConfig(companyId) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/ai-config`)
}

export function analyzeBackendWebsite(companyId, websiteUrl) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/analyze-website`, {
    method: 'POST',
    body: JSON.stringify({ websiteUrl }),
  })
}

export function testBackendAiReply(companyId, text, options = {}) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/ai-test`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      type: options.type || 'dm',
      platform: options.platform || 'instagram',
    }),
  })
}

export function sendBackendReport(companyId, payload) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/send-report`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getReportEmailStatus() {
  return request('/api/report-email/status')
}

// Fetch inbox (comments and DMs). Live Meta sync is opt-in because it can be slow.
export function fetchInbox(companyId, type = 'all', options = {}) {
  const sync = options.sync ? '&sync=1' : ''
  const branch = options.branchId && options.branchId !== 'all' ? `&branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/inbox?type=${encodeURIComponent(type)}${sync}${branch}`)
}

export function replyToInboxItem(companyId, itemId, text, options = {}) {
  const branch = options.branchId && options.branchId !== 'all' ? `?branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/inbox/${encodeURIComponent(itemId)}/reply${branch}`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export function estimateBackfillReplies(companyId, payload) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/backfill/estimate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function runBackfillReplies(companyId, payload) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/backfill/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Post a new message to inbox
export function createTestInboxItem(companyId, payload, options = {}) {
  const branch = options.branchId && options.branchId !== 'all' ? `?branch_id=${encodeURIComponent(options.branchId)}` : ''
  return request(`/api/companies/${encodeURIComponent(companyId)}/inbox${branch}`, {
    method: 'POST',
    body: JSON.stringify({ ...payload, branchId: options.branchId || payload.branchId || null }),
  })
}

// Create test DM
export function createTestDM(companyId, platform = 'instagram', options = {}) {
  return createTestInboxItem(companyId, {
    type: 'dm',
    platform,
    senderName: 'Test Customer',
    senderId: `test-dm-${Date.now()}`,
    text: 'Hi! Is this product available? I am interested in learning more.',
    externalId: `test-dm-${Date.now()}`,
  }, options)
}

// Health check
export function checkBackendHealth() {
  return request('/health')
}
