import { useState, useEffect } from 'react'
import { BarChart3, ExternalLink, Loader, LogIn, MessageCircle, RefreshCw, Send, Trash2, TrendingUp, UserPlus, Users } from 'lucide-react'
import { SectionHeader, PlatformIcon } from '../ui/UIKit'
import { backendUrl, deleteConnection, fetchGrowthMetrics, getConnections } from '../../lib/backendApi'

const PLATFORMS_CONFIG = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    bg: '#FDE8F1',
    description: 'Connect the Instagram Business account through its linked Meta/Facebook Page.',
    oauth: true,
    cta: 'Connect Instagram via Meta',
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bg: '#E8F1FD',
    description: 'Connect the Facebook Page for page followers, posts, and comments.',
    oauth: true,
    cta: 'Connect Facebook Page',
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    bg: '#FFE8E8',
    description: 'YouTube growth is prepared, but OAuth/API credentials are not connected yet.',
    oauth: false,
    cta: 'Coming soon',
  },
}

function PlatformCard({ platform, isConnected, accounts, onDisconnect, companyId }) {
  const config = PLATFORMS_CONFIG[platform]
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!config.oauth) return
    setLoading(true)
    window.location.href = backendUrl(`/api/oauth/${platform}/authorize?company_id=${encodeURIComponent(companyId)}&redirect_uri=${encodeURIComponent(window.location.href)}`)
  }

  return (
    <div className="card p-5" style={{ borderLeft: `4px solid ${config.color}` }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
            <PlatformIcon platform={platform} size={22} connected={true} />
          </div>
          <div className="min-w-0">
            <h3 className="text-slate-900 font-bold text-sm">{config.label}</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{config.description}</p>
            {accounts.length > 0 && (
              <div className="mt-3 space-y-1">
                {accounts.map(account => (
                  <div key={`${account.platform}-${account.externalId}`} className="text-xs text-slate-600 truncate">
                    Connected: <span className="font-semibold">{account.handle || account.externalId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isConnected ? (
          <button
            onClick={onDisconnect}
            title={`Disconnect ${config.label}`}
            className="p-2 hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-red-500 flex-shrink-0"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading || !config.oauth}
            className="text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
            style={{ backgroundColor: config.oauth ? config.color : '#64748B' }}
          >
            {loading ? <Loader size={14} className="animate-spin" /> : <LogIn size={14} />}
            {loading ? 'Opening...' : config.cta}
          </button>
        )}
      </div>
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

function AnalyticsPanel({ platform, data }) {
  const config = PLATFORMS_CONFIG[platform]
  const summary = data?.summary
  const profile = data?.profile || {}
  const recentPosts = data?.recentPosts || []
  const formatNumber = value => Number(value || 0).toLocaleString()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PlatformIcon platform={platform} size={18} connected={Boolean(summary)} />
        <h3 className="text-slate-900 font-bold text-base">{config.label} analytics</h3>
      </div>

      {summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard icon={Users} label="Followers" value={formatNumber(summary.followers)} muted={profile.username ? `@${profile.username}` : profile.name || ''} />
            <StatCard icon={UserPlus} label={platform === 'instagram' ? 'Following' : 'Page likes'} value={formatNumber(summary.following ?? summary.pageLikes ?? 0)} />
            <StatCard icon={Send} label={`Posts in ${summary.currentMonthLabel}`} value={formatNumber(summary.postsThisMonth)} change={summary.postsChange} muted={`Total posts: ${formatNumber(summary.totalPosts ?? profile.totalPosts ?? 0)}`} />
            <StatCard icon={MessageCircle} label={`Comments in ${summary.currentMonthLabel}`} value={formatNumber(summary.commentsThisMonth)} change={summary.commentsChange} muted={`vs ${summary.previousMonthLabel}`} />
            <StatCard icon={TrendingUp} label="Engagement rate" value={`${summary.engagementRate}%`} muted="likes plus comments divided by followers" />
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                  <BarChart3 size={16} className="text-slate-400" /> This month posts
                </h4>
                <p className="text-slate-500 text-sm mt-1">Latest posts with likes and comments for month-end progress review.</p>
              </div>
              {summary.lastSync && <div className="text-slate-400 text-xs">Last sync {new Date(summary.lastSync).toLocaleString()}</div>}
            </div>

            {recentPosts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">No posts found for this month yet.</div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                    <div className="min-w-0">
                      <div className="text-slate-800 text-sm font-semibold truncate">{post.caption || post.mediaType || `${config.label} post`}</div>
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
          <div className="text-slate-900 font-bold text-sm">No {config.label} growth data yet</div>
          <p className="text-slate-500 text-sm mt-1">{data?.error || `Connect ${config.label} to show growth data.`}</p>
        </div>
      )}
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
      connectionData.connections?.forEach(connection => {
        connsMap[connection.platform] = [...(connsMap[connection.platform] || []), connection]
      })
      setConnections(connsMap)
      setGrowth(growthData)
    } catch (err) {
      console.error('Failed to load growth:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (platform) => {
    await deleteConnection(company.id, platform).catch(err => {
      console.error('Failed to disconnect platform:', err)
    })
    await loadConnections()
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

  const platformData = growth?.platforms || {
    instagram: growth?.instagram,
    facebook: growth?.facebook,
    youtube: growth?.youtube,
  }

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          title="Growth Analytics"
          description="View followers, following/page likes, post counts, comments, and monthly progress by platform."
        />
        <button onClick={refreshGrowth} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="space-y-7">
        {['instagram', 'facebook', 'youtube'].map(platform => (
          <AnalyticsPanel key={platform} platform={platform} data={platformData?.[platform]} />
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-slate-900 font-bold text-lg">Growth Connections</h2>
          <p className="text-slate-500 text-sm mt-1">Use this section only to connect, reconnect, or remove platform accounts.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Object.keys(PLATFORMS_CONFIG).map(platform => (
            <PlatformCard
              key={platform}
              platform={platform}
              accounts={connections[platform] || []}
              isConnected={Boolean(connections[platform]?.length)}
              onDisconnect={() => handleDisconnect(platform)}
              companyId={company.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
