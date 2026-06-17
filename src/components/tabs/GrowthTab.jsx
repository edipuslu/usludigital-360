import { useState, useEffect } from 'react'
import { BarChart3, ExternalLink, Loader, LogIn, MessageCircle, RefreshCw, Send, Trash2, TrendingUp, Users } from 'lucide-react'
import { SectionHeader, PlatformIcon } from '../ui/UIKit'
import { backendUrl, deleteConnection, fetchGrowthMetrics, getConnections } from '../../lib/backendApi'

const PLATFORMS_CONFIG = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    bg: '#FDE8F1',
    description: 'Login with Meta to connect the Instagram Business account.',
    oauth: true,
    cta: 'Login with Instagram'
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bg: '#E8F1FD',
    description: 'Login with Meta to connect the Facebook Page.',
    oauth: true,
    cta: 'Login with Facebook'
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    bg: '#FFE8E8',
    description: 'YouTube OAuth is not connected in this build yet.',
    oauth: false,
    cta: 'Coming soon'
  }
}

function PlatformCard({ platform, isConnected, onDisconnect, companyId }) {
  const config = PLATFORMS_CONFIG[platform]
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!config.oauth) return
    setLoading(true)
    window.location.href = backendUrl(`/api/oauth/${platform}/authorize?company_id=${encodeURIComponent(companyId)}&redirect_uri=${encodeURIComponent(window.location.href)}`)
  }

  return (
    <div className="card p-6 flex items-start justify-between" style={{ borderLeft: `4px solid ${config.color}` }}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
          <PlatformIcon platform={platform} size={24} connected={true} />
        </div>
        <div>
          <h3 className="text-slate-900 font-bold text-base">{config.label}</h3>
          <p className="text-slate-400 text-sm mt-0.5">{config.description}</p>
        </div>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Connected
          </div>
          <button
            onClick={onDisconnect}
            title={`Disconnect ${config.label}`}
            className="p-2 hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading || !config.oauth}
          className="text-white font-semibold py-2 px-6 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: config.oauth ? config.color : '#64748B' }}
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <LogIn size={14} />}
          {loading ? 'Opening login...' : config.cta}
        </button>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, change, muted }) {
  const numericChange = Number(change || 0)
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <div className={numericChange >= 0 ? 'text-emerald-600 text-xs font-bold' : 'text-red-600 text-xs font-bold'}>
            {numericChange >= 0 ? '+' : ''}{numericChange}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-4">{value}</div>
      <div className="text-slate-500 text-sm mt-1">{label}</div>
      {muted && <div className="text-slate-400 text-xs mt-2">{muted}</div>}
    </div>
  )
}

export default function GrowthTab({ company }) {
  const [connections, setConnections] = useState({})
  const [growth, setGrowth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadConnections()
  }, [company.id])

  const loadConnections = async () => {
    try {
      setLoading(true)
      const [connectionData, growthData] = await Promise.all([
        getConnections(company.id),
        fetchGrowthMetrics(company.id),
      ])
      const connsMap = {}
      connectionData.connections?.forEach(c => {
        connsMap[c.platform] = c
      })
      setConnections(connsMap)
      setGrowth(growthData)
    } catch (err) {
      console.error('Failed to load connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (platform) => {
    await deleteConnection(company.id, platform).catch(err => {
      console.error('Failed to disconnect platform:', err)
    })
    setConnections(prev => {
      const newConns = { ...prev }
      delete newConns[platform]
      return newConns
    })
  }

  const refreshGrowth = async () => {
    try {
      setRefreshing(true)
      setGrowth(await fetchGrowthMetrics(company.id))
    } catch (err) {
      console.error('Failed to refresh growth:', err)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  const allConnected = Object.keys(PLATFORMS_CONFIG).every(p => connections[p])
  const instagram = growth?.instagram
  const summary = instagram?.summary
  const recentPosts = instagram?.recentPosts || []
  const formatNumber = value => Number(value || 0).toLocaleString()

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Growth Analytics"
          description="Track followers, posts, comments, and month-end progress from connected platforms."
        />
        <button onClick={refreshGrowth} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {allConnected && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <div className="text-emerald-800 text-sm font-medium">✓ All platforms connected and syncing daily</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {Object.entries(PLATFORMS_CONFIG).map(([platform, config]) => (
          <PlatformCard
            key={platform}
            platform={platform}
            isConnected={!!connections[platform]}
            onDisconnect={() => handleDisconnect(platform)}
            companyId={company.id}
          />
        ))}
      </div>

      {!allConnected && (
        <div className="card p-6 bg-blue-50 border-blue-200">
          <div className="text-blue-900 text-sm leading-relaxed">
            <strong>Getting Started:</strong> Click the Instagram or Facebook login button above. You will sign in with Meta, choose the Page/Instagram Business account, then return here connected.
          </div>
        </div>
      )}

      {summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Instagram followers" value={formatNumber(summary.followers)} muted={instagram.profile?.username ? `@${instagram.profile.username}` : ''} />
            <StatCard icon={Send} label={`Posts in ${summary.currentMonthLabel}`} value={formatNumber(summary.postsThisMonth)} change={summary.postsChange} muted={`vs ${summary.previousMonthLabel}`} />
            <StatCard icon={MessageCircle} label={`Comments in ${summary.currentMonthLabel}`} value={formatNumber(summary.commentsThisMonth)} change={summary.commentsChange} muted={`vs ${summary.previousMonthLabel}`} />
            <StatCard icon={TrendingUp} label="Engagement rate" value={`${summary.engagementRate}%`} muted="likes plus comments divided by followers" />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <BarChart3 size={16} className="text-slate-400" /> This month posts
                </h3>
                <p className="text-slate-500 text-sm mt-1">Latest Instagram posts with likes and comments for month-end review.</p>
              </div>
              {summary.lastSync && <div className="text-slate-400 text-xs">Last sync {new Date(summary.lastSync).toLocaleString()}</div>}
            </div>

            {recentPosts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">No Instagram posts found for this month yet.</div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                    <div className="min-w-0">
                      <div className="text-slate-800 text-sm font-semibold truncate">{post.caption || post.mediaType || 'Instagram post'}</div>
                      <div className="text-slate-400 text-xs mt-1">{new Date(post.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-shrink-0">
                      <span>{formatNumber(post.likes)} likes</span>
                      <span>{formatNumber(post.comments)} comments</span>
                      {post.permalink && (
                        <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card p-6">
          <div className="text-slate-900 font-bold text-base">No Instagram growth data yet</div>
          <p className="text-slate-500 text-sm mt-1">
            {instagram?.error || 'Connect Instagram from this company to show followers, posts, comments, and monthly progress.'}
          </p>
        </div>
      )}
    </div>
  )
}
