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

export function updateBackendCompany(company) {
  return request(`/api/companies/${encodeURIComponent(company.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ company }),
  })
}

export function deleteBackendCompany(companyId) {
  return request(`/api/companies/${encodeURIComponent(companyId)}`, {
    method: 'DELETE',
  })
}

// Register platform connection (Instagram, Facebook, YouTube)
export function registerConnection(companyId, platform, connection) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/connections`, {
    method: 'POST',
    body: JSON.stringify({ platform, connection }),
  })
}

// Get all platform connections for a company
export function getConnections(companyId) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/connections`)
}

export function deleteConnection(companyId, platform) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/connections/${encodeURIComponent(platform)}`, {
    method: 'DELETE',
  })
}

// Fetch growth metrics (followers, posts, engagement)
export function fetchGrowthMetrics(companyId) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/growth`)
}

// Save AI config and training data
export function saveBackendAiConfig(company) {
  const openaiKey = localStorage.getItem('ud360_openai_key') || ''
  return request(`/api/companies/${encodeURIComponent(company.id)}/ai-config`, {
    method: 'POST',
    body: JSON.stringify({
      openaiKey,
      company: {
        id: company.id,
        name: company.name,
        goal: company.goal,
        whatsappLink: company.whatsappLink,
        aiTraining: company.aiTraining,
        automation: company.automation,
      },
    }),
  })
}

// Fetch inbox (comments and DMs)
export function fetchInbox(companyId, type = 'all') {
  return request(`/api/companies/${encodeURIComponent(companyId)}/inbox?type=${encodeURIComponent(type)}`)
}

export function replyToInboxItem(companyId, itemId, text) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/inbox/${encodeURIComponent(itemId)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// Post a new message to inbox
export function createTestInboxItem(companyId, payload) {
  return request(`/api/companies/${encodeURIComponent(companyId)}/inbox`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Health check
export function checkBackendHealth() {
  return request('/health')
}
