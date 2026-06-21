import { useState } from 'react'
import { Calendar, ExternalLink, TrendingUp, MessageSquare, Activity, Clock } from 'lucide-react'
import { StatCard, PlatformIcon, SectionHeader } from '../ui/UIKit'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import clsx from 'clsx'

const CHART_COLORS = ['#255ff4', '#10B981', '#f49725', '#8B5CF6', '#f42f25', '#06B6D4']
const PLATFORM_COLORS = { instagram: '#f42582', facebook: '#255ff4', youtube: '#f42f25', whatsapp: '#25D366' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <div className="text-slate-400 mb-1.5 font-medium">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-slate-300 capitalize">{p.name}</span>
          </div>
          <span className="text-white font-semibold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

const PLATFORM_ICON_MAP = { instagram: 'instagram', facebook: 'facebook', youtube: 'youtube', whatsapp: 'whatsapp' }

function HeatmapChart({ data }) {
  const max = Math.max(...data.flatMap(d => d.hours.map(h => h.value)))
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex items-center gap-1 mb-2 pl-10">
          {hours.map(h => (
            <div key={h} className="flex-1 text-center text-[9px] text-slate-400 font-medium">
              {h % 4 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {data.map(row => (
          <div key={row.day} className="flex items-center gap-1 mb-1">
            <div className="w-8 text-right text-xs text-slate-400 pr-2 flex-shrink-0">{row.day}</div>
            {row.hours.map(h => {
              const intensity = max > 0 ? h.value / max : 0
              return (
                <div
                  key={h.hour}
                  title={`${row.day} ${h.hour}:00 — ${h.value} interactions`}
                  className="flex-1 h-5 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: intensity === 0
                      ? '#F1F5F9'
                      : `rgba(37, 95, 244, ${0.1 + intensity * 0.9})`,
                  }}
                />
              )
            })}
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 mt-3">
          <span className="text-xs text-slate-400">Less</span>
          {[0.05, 0.25, 0.5, 0.75, 1].map(i => (
            <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(37,95,244,${i})` }} />
          ))}
          <span className="text-xs text-slate-400">More</span>
        </div>
      </div>
    </div>
  )
}

function FunnelChart({ data }) {
  const max = data[0]?.value || 1
  const colors = ['#255ff4', '#255ff4', '#255ff4', '#93C5FD']
  return (
    <div className="space-y-2">
      {data.map((stage, i) => {
        const pct = Math.round((stage.value / max) * 100)
        const prevPct = i > 0 ? Math.round((data[i - 1].value / max) * 100) : 100
        const previousValue = data[i - 1]?.value || 0
        const dropPct = i > 0 && previousValue > 0 ? Math.round((1 - stage.value / previousValue) * 100) : 0
        return (
          <div key={stage.name}>
            {i > 0 && dropPct > 0 && (
              <div className="flex items-center justify-center py-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <div className="w-px h-3 bg-slate-200" />
                  <span className="text-red-400 font-medium">-{dropPct}% drop</span>
                  <div className="w-px h-3 bg-slate-200" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-24 text-right text-xs text-slate-500 flex-shrink-0">{stage.name}</div>
              <div className="flex-1 relative h-9 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg flex items-center pl-3 transition-all"
                  style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                >
                  <span className="text-white text-xs font-bold">{stage.value.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-12 text-xs text-slate-500 flex-shrink-0">{pct}%</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsTab({ company }) {
  const [range, setRange] = useState('this_month')
  const m = company.metrics
  const daily = m.daily

  const kpis = [
    { label: 'AI Replies', value: m.thisMonth.totalReplies.toLocaleString(), icon: MessageSquare, iconColor: 'blue', change: m.thisMonth.change.replies },
    { label: 'WhatsApp Clicks', value: m.thisMonth.waClicks.toLocaleString(), icon: TrendingUp, iconColor: 'emerald', change: m.thisMonth.change.waClicks },
    { label: 'Response Rate', value: `${m.thisMonth.responseRate}%`, icon: Activity, iconColor: 'indigo', change: m.thisMonth.change.responseRate },
    { label: 'Avg Reply Time', value: m.thisMonth.avgReplyTime, icon: Clock, iconColor: 'amber' },
  ]

  const funnelData = [
    { name: 'Reached', value: m.funnel.reached },
    { name: 'Replied', value: m.funnel.replied },
    { name: 'Clicked WA', value: m.funnel.clickedWA },
    { name: 'Converted', value: m.funnel.converted },
  ]

  return (
    <div className="space-y-8 animate-slide-in">
      <SectionHeader
        title="Analytics & Performance"
        description="Track AI engagement, WhatsApp conversions and platform performance"
        action={
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {[['this_month', 'This Month'], ['last_month', 'Last Month'], ['last_3m', 'Last 3 Months']].map(([v, l]) => (
              <button key={v} onClick={() => setRange(v)} className={clsx('px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all', range === v ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700')}>
                {l}
              </button>
            ))}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </div>

      {/* Row 2: Bar + Line charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-slate-900 font-bold text-base">Replies by Platform</h3>
            <p className="text-slate-400 text-xs mt-0.5">AI replies sent this month per platform</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.byPlatform} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="replies" radius={[6, 6, 0, 0]} name="AI Replies">
                  {m.byPlatform.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h3 className="text-slate-900 font-bold text-base">WhatsApp Clicks Over Time</h3>
            <p className="text-slate-400 text-xs mt-0.5">Daily WA link clicks this month</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ top: 0, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="clicks" stroke="#10B981" strokeWidth={2.5} dot={false} name="WA Clicks" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Pie + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-slate-900 font-bold text-base">Reply Breakdown</h3>
            <p className="text-slate-400 text-xs mt-0.5">Distribution by platform</p>
          </div>
          <div className="h-44 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={m.byPlatform} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="replies">
                  {m.byPlatform.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {m.byPlatform.map((p, i) => {
                const total = m.byPlatform.reduce((a, b) => a + b.replies, 0)
                const pct = total > 0 ? Math.round((p.replies / total) * 100) : 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-600 text-xs flex-1">{p.platform}</span>
                    <span className="text-slate-900 text-xs font-bold">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card p-5 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-slate-900 font-bold text-base">Peak Engagement Hours</h3>
            <p className="text-slate-400 text-xs mt-0.5">When most comments and DMs arrive</p>
          </div>
          <HeatmapChart data={m.heatmap} />
        </div>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-1">
          <div className="mb-5">
            <h3 className="text-slate-900 font-bold text-base">Conversion Funnel</h3>
            <p className="text-slate-400 text-xs mt-0.5">From reach to conversion</p>
          </div>
          <FunnelChart data={funnelData} />
        </div>

        {/* Top Posts Table */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-slate-900 font-bold text-base">Top Performing Posts</h3>
            <p className="text-slate-400 text-xs mt-0.5">Most AI interactions this month</p>
          </div>
          {m.topPosts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No post data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Post', 'Platform', 'Date', 'Comments', 'AI Replies', 'WA Clicks'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.topPosts.map(post => (
                    <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <a href={`https://${post.url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs font-medium max-w-[140px] truncate">
                          {post.url.split('/').pop()} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="py-2.5 pr-3">
                        <PlatformIcon platform={post.platform} size={14} connected={true} />
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500 text-xs whitespace-nowrap">{post.date}</td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900 text-xs">{post.comments}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900 text-xs">{post.aiReplies}</span>
                          {post.aiReplies === post.comments && (
                            <span className="text-emerald-600 text-[10px] font-bold">100%</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={clsx('font-bold text-xs', post.waClicks > 0 ? 'text-emerald-600' : 'text-slate-400')}>
                          {post.waClicks}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
