import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ExternalLink, FileText, Loader, MessageCircle, RefreshCw, UserPlus, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SectionHeader, PlatformIcon } from '../ui/UIKit'
import { fetchGrowthMetrics } from '../../lib/backendApi'

const PLATFORM_ORDER = ['instagram', 'facebook', 'youtube', 'whatsapp']
const ANALYTICS_NAV = [
  { key: 'overview', label: 'Overview' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'whatsapp', label: 'WhatsApp' },
]

const PLATFORMS_CONFIG = {
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    bg: '#FDE8F1',
    description: 'Followers, following, posts, comments, and monthly analytics for the selected Instagram Business account.',
    empty: 'No Instagram analytics data yet.',
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    bg: '#E8F1FD',
    description: 'Followers, page likes, page posts, comments, and monthly analytics for the selected Facebook Page.',
    empty: 'No Facebook analytics data yet.',
  },
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    bg: '#FFE8E8',
    description: 'Subscribers, videos, comments, and channel analytics.',
    empty: 'No YouTube analytics data yet.',
  },
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    bg: '#E8FBF0',
    description: 'DM volume and message activity for WhatsApp Business.',
    empty: 'No WhatsApp analytics data yet.',
  },
}

const formatNumber = value => Number(value || 0).toLocaleString()

function platformStats(platform, data) {
  const summary = data?.summary
  const profile = data?.profile || {}

  if (!summary) {
    return [
      { key: 'followers', label: platform === 'youtube' ? 'Subscribers' : 'Followers', value: '0', icon: Users, muted: 'Not loaded yet' },
      { key: 'following', label: platform === 'facebook' ? 'Page likes' : platform === 'whatsapp' ? 'Contacts' : 'Following', value: '0', icon: UserPlus, muted: 'Not loaded yet' },
      { key: 'posts', label: platform === 'youtube' ? 'Videos' : platform === 'whatsapp' ? 'Messages' : 'Posts', value: '0', icon: FileText, muted: 'Not loaded yet' },
      { key: 'comments', label: platform === 'whatsapp' ? 'DMs' : 'Comments', value: '0', icon: MessageCircle, muted: 'Not loaded yet' },
    ]
  }

  return [
    {
      key: 'followers',
      label: platform === 'youtube' ? 'Subscribers' : 'Followers',
      value: formatNumber(summary.followers),
      icon: Users,
      muted: profile.username ? `@${profile.username}` : profile.name || 'Connected account',
    },
    {
      key: 'following',
      label: platform === 'facebook' ? 'Page likes' : platform === 'whatsapp' ? 'Contacts' : 'Following',
      value: formatNumber(summary.following ?? summary.pageLikes ?? 0),
      icon: UserPlus,
      muted: platform === 'instagram' ? 'Accounts followed' : platform === 'facebook' ? 'Page likes' : 'Available after connection',
    },
    {
      key: 'posts',
      label: platform === 'youtube' ? 'Videos' : platform === 'whatsapp' ? 'Messages' : 'Posts',
      value: formatNumber(summary.totalPosts ?? profile.totalPosts ?? summary.postsThisMonth ?? 0),
      icon: FileText,
      change: summary.postsChange,
      muted: `${formatNumber(summary.postsThisMonth)} this month`,
    },
    {
      key: 'comments',
      label: platform === 'whatsapp' ? 'DMs' : 'Comments',
      value: formatNumber(summary.commentsThisMonth),
      icon: MessageCircle,
      change: summary.commentsChange,
      muted: `vs ${summary.previousMonthLabel || 'previous month'}`,
    },
  ]
}

function MetricButton({ stat, color, active, onClick }) {
  const Icon = stat.icon
  const numericChange = Number(stat.change || 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${active ? 'bg-white shadow-sm' : 'bg-slate-50 hover:bg-white hover:border-slate-300'}`}
      style={{ borderColor: active ? color : undefined, '--tw-ring-color': color }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
          <Icon size={18} />
        </div>
        {stat.change !== undefined && (
          <div className={numericChange >= 0 ? 'text-emerald-600 text-xs font-bold' : 'text-red-600 text-xs font-bold'}>
            {numericChange >= 0 ? '+' : ''}{numericChange}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-4">{stat.value}</div>
      <div className="text-slate-600 text-sm font-semibold mt-1">{stat.label}</div>
      {stat.muted && <div className="text-slate-400 text-xs mt-2 truncate">{stat.muted}</div>}
    </button>
  )
}

function AnalyticsGraph({ platform, data }) {
  const config = PLATFORMS_CONFIG[platform]
  const summary = data?.summary

  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <BarChart3 size={16} className="text-slate-400" />
          Monthly trend graph
        </div>
        <p className="text-slate-500 text-sm mt-2">Analytics will appear here after platform data is synced.</p>
      </div>
    )
  }

  const previousLabel = summary.previousMonthLabel || 'Previous month'
  const currentLabel = summary.currentMonthLabel || 'Current month'
  const chartData = [
    {
      name: previousLabel,
      posts: Number(summary.postsPreviousMonth || 0),
      comments: Number(summary.commentsPreviousMonth || 0),
      likes: Number(summary.likesPreviousMonth || 0),
    },
    {
      name: currentLabel,
      posts: Number(summary.postsThisMonth || 0),
      comments: Number(summary.commentsThisMonth || 0),
      likes: Number(summary.likesThisMonth || 0),
    },
  ]

  const totals = chartData.reduce((total, row) => total + row.posts + row.comments + row.likes, 0)
  const changeTotal = Number(summary.postsChange || 0) + Number(summary.commentsChange || 0) + Number(summary.likesChange || 0)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="text-slate-900 font-bold text-sm flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-400" />
            Monthly trend graph
          </div>
          <p className="text-slate-500 text-xs mt-1">Previous month compared with the current month.</p>
        </div>
        <div className={changeTotal >= 0 ? 'text-emerald-600 text-xs font-bold' : 'text-red-600 text-xs font-bold'}>
          {changeTotal >= 0 ? '+' : ''}{formatNumber(changeTotal)} total change
        </div>
      </div>

      {totals === 0 ? (
        <div className="h-56 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
          No monthly activity yet.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: '#F8FAFC' }}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}
              />
              <Bar dataKey="posts" name="Posts" fill={config.color} radius={[4, 4, 0, 0]} />
              <Bar dataKey="comments" name="Comments" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="likes" name="Likes" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function DetailPanel({ platform, type, data }) {
  const config = PLATFORMS_CONFIG[platform]
  const summary = data?.summary
  const profile = data?.profile || {}
  const recentPosts = data?.recentPosts || []

  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="text-slate-900 font-bold text-sm">{config.label} {type} details</div>
        <p className="text-slate-500 text-sm mt-1">{data?.error || config.empty}</p>
      </div>
    )
  }

  if (type === 'followers' || type === 'following') {
    const count = type === 'followers' ? summary.followers : summary.following ?? summary.pageLikes ?? 0
    const label = type === 'followers'
      ? platform === 'youtube' ? 'Subscribers' : 'Followers'
      : platform === 'facebook' ? 'Page likes' : platform === 'whatsapp' ? 'Contacts' : 'Following'

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-slate-900 font-bold text-sm">{label}</div>
            <div className="text-slate-500 text-sm mt-1">{profile.username ? `@${profile.username}` : profile.name || config.label}</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatNumber(count)}</div>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
          {platform === 'instagram' || platform === 'facebook'
            ? 'Meta gives the count here. It does not provide the full list of individual followers through this API.'
            : 'The account list will appear here when this platform analytics API is connected.'}
        </div>
      </div>
    )
  }

  if (type === 'comments') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-slate-900 font-bold text-sm">{platform === 'whatsapp' ? 'DMs' : 'Comments'} this month</div>
            <div className="text-slate-500 text-sm mt-1">{formatNumber(summary.commentsThisMonth)} total across this month&apos;s content</div>
          </div>
          <MessageCircle size={18} className="text-slate-400" />
        </div>
        {recentPosts.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No comment details found for this month yet.</div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map(post => (
              <PostRow key={post.id} post={post} platform={platform} showFocus="comments" />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-slate-900 font-bold text-sm">{platform === 'youtube' ? 'Videos' : platform === 'whatsapp' ? 'Messages' : 'Posts'} this month</div>
          <div className="text-slate-500 text-sm mt-1">{formatNumber(summary.postsThisMonth)} this month, {formatNumber(summary.postsPreviousMonth)} last month</div>
        </div>
        <BarChart3 size={18} className="text-slate-400" />
      </div>
      {recentPosts.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">No posts found for this month yet.</div>
      ) : (
        <div className="space-y-3">
          {recentPosts.map(post => (
            <PostRow key={post.id} post={post} platform={platform} />
          ))}
        </div>
      )}
    </div>
  )
}

function PostRow({ post, platform, showFocus }) {
  const title = post.caption || post.mediaType || `${PLATFORMS_CONFIG[platform].label} post`

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
      <div className="min-w-0">
        <div className="text-slate-800 text-sm font-semibold truncate">{title}</div>
        <div className="text-slate-400 text-xs mt-1">{post.timestamp ? new Date(post.timestamp).toLocaleDateString() : 'No date'}</div>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-600 flex-shrink-0">
        {showFocus !== 'comments' && <span>{formatNumber(post.likes)} likes</span>}
        <span>{formatNumber(post.comments)} comments</span>
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700" title="Open post">
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  )
}

function AnalyticsNavItem({ item, active, platformData, onClick }) {
  const isPlatform = item.key !== 'overview'
  const summary = isPlatform ? platformData?.[item.key]?.summary : null
  const hasData = Boolean(summary)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${active ? 'bg-slate-200 text-slate-950' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
    >
      <span className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
        {isPlatform ? (
          <PlatformIcon platform={item.key} size={15} connected={hasData} />
        ) : (
          <BarChart3 size={15} className="text-slate-500" />
        )}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
      {isPlatform && hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  )
}

function OverviewPanel({ platformData, onSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 font-bold text-2xl">Overview</h2>
        <p className="text-slate-500 text-sm mt-1">Choose a platform to inspect followers, posts, comments, and monthly progress.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {PLATFORM_ORDER.map(platform => {
          const config = PLATFORMS_CONFIG[platform]
          const data = platformData?.[platform]
          const summary = data?.summary
          const connected = Boolean(summary)
          return (
            <button
              key={platform}
              type="button"
              onClick={() => onSelect(platform)}
              className="text-left rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm p-5 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                    <PlatformIcon platform={platform} size={22} connected={connected} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-slate-900 font-bold text-base">{config.label}</div>
                    <div className="text-slate-500 text-xs mt-1">{connected ? 'Analytics synced' : 'Waiting for synced data'}</div>
                  </div>
                </div>
                <div className={connected ? 'text-emerald-600 text-xs font-bold' : 'text-slate-400 text-xs font-bold'}>
                  {connected ? 'Active' : 'No data'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <div>
                  <div className="text-slate-900 text-lg font-bold">{formatNumber(summary?.followers || 0)}</div>
                  <div className="text-slate-400 text-xs">Followers</div>
                </div>
                <div>
                  <div className="text-slate-900 text-lg font-bold">{formatNumber(summary?.totalPosts || summary?.postsThisMonth || 0)}</div>
                  <div className="text-slate-400 text-xs">{platform === 'youtube' ? 'Videos' : platform === 'whatsapp' ? 'Messages' : 'Posts'}</div>
                </div>
                <div>
                  <div className="text-slate-900 text-lg font-bold">{formatNumber(summary?.commentsThisMonth || 0)}</div>
                  <div className="text-slate-400 text-xs">{platform === 'whatsapp' ? 'DMs' : 'Comments'}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlatformSection({ platform, data, activeDetail, onDetailChange }) {
  const config = PLATFORMS_CONFIG[platform]
  const hasData = Boolean(data?.summary)
  const stats = platformStats(platform, data)

  return (
    <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="p-5 border-b border-slate-200" style={{ borderTop: `4px solid ${config.color}` }}>
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
            <PlatformIcon platform={platform} size={24} connected={hasData} />
          </div>
          <div className="min-w-0">
            <h3 className="text-slate-900 font-bold text-base">{config.label} Analytics</h3>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map(stat => (
            <MetricButton
              key={stat.key}
              stat={stat}
              color={config.color}
              active={activeDetail.platform === platform && activeDetail.type === stat.key}
              onClick={() => onDetailChange(platform, stat.key)}
            />
          ))}
        </div>

        <AnalyticsGraph platform={platform} data={data} />

        <DetailPanel platform={platform} type={activeDetail.platform === platform ? activeDetail.type : 'posts'} data={data} />

        {data?.summary?.lastSync && (
          <div className="text-slate-400 text-xs">Last sync {new Date(data.summary.lastSync).toLocaleString()}</div>
        )}
      </div>
    </section>
  )
}

export default function GrowthTab({ company, platform }) {
  const [growth, setGrowth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activePanel, setActivePanel] = useState(platform || 'overview')
  const [activeDetail, setActiveDetail] = useState({ platform: platform || 'instagram', type: 'posts' })

  useEffect(() => {
    loadGrowth()
  }, [company.id])

  useEffect(() => {
    if (platform) {
      setActivePanel(platform)
      setActiveDetail(current => ({ platform, type: current.type || 'posts' }))
    }
  }, [platform])

  const loadGrowth = async () => {
    try {
      setLoading(true)
      setGrowth(await fetchGrowthMetrics(company.id))
    } catch (err) {
      console.error('Failed to load growth:', err)
    } finally {
      setLoading(false)
    }
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

  const platformData = useMemo(() => growth?.platforms || {
    instagram: growth?.instagram,
    facebook: growth?.facebook,
    youtube: growth?.youtube,
    whatsapp: growth?.whatsapp,
  }, [growth])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  const activeConfig = activePanel !== 'overview' ? PLATFORMS_CONFIG[activePanel] : null
  const activeTitle = activePanel === 'overview' ? 'Social Media Analytics' : `${activeConfig.label} Analytics`
  const activeDescription = activePanel === 'overview'
    ? 'A simpler view for platform performance. Pick a section on the left to see only that platform on the right.'
    : activeConfig.description

  return (
    <div className="animate-slide-in">
      <div className="flex flex-col lg:flex-row min-h-[680px] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <aside className="w-full lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/80 p-4">
          <div className="px-2 py-2 mb-3">
            <div className="text-slate-900 font-bold text-base">Social Media Analytics</div>
            <div className="text-slate-500 text-xs mt-1">Platform performance</div>
          </div>
          <div className="space-y-1">
            {ANALYTICS_NAV.map(item => (
              <AnalyticsNavItem
                key={item.key}
                item={item}
                active={activePanel === item.key}
                platformData={platformData}
                onClick={() => {
                  setActivePanel(item.key)
                  if (item.key !== 'overview') setActiveDetail({ platform: item.key, type: 'posts' })
                }}
              />
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 bg-white p-5 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <SectionHeader title={activeTitle} description={activeDescription} />
            <button onClick={refreshGrowth} disabled={refreshing} className="btn-secondary self-start">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {activePanel === 'overview' ? (
            <OverviewPanel platformData={platformData} onSelect={nextPlatform => {
              setActivePanel(nextPlatform)
              setActiveDetail({ platform: nextPlatform, type: 'posts' })
            }} />
          ) : (
            <PlatformSection
              platform={activePanel}
              data={platformData?.[activePanel]}
              activeDetail={activeDetail}
              onDetailChange={(nextPlatform, type) => setActiveDetail({ platform: nextPlatform, type })}
            />
          )}
        </main>
      </div>
    </div>
  )
}
