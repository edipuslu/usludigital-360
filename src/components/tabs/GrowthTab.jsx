import { useState, useEffect } from 'react'
import { Loader, LogIn, Trash2 } from 'lucide-react'
import { SectionHeader, PlatformIcon } from '../ui/UIKit'
import { backendUrl, deleteConnection, getConnections } from '../../lib/backendApi'

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
    window.location.href = backendUrl(`/oauth/${platform}/authorize?company_id=${encodeURIComponent(companyId)}&redirect_uri=${encodeURIComponent(window.location.href)}`)
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

export default function GrowthTab({ company }) {
  const [connections, setConnections] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConnections()
  }, [company.id])

  const loadConnections = async () => {
    try {
      setLoading(true)
      const data = await getConnections(company.id)
      const connsMap = {}
      data.connections?.forEach(c => {
        connsMap[c.platform] = c
      })
      setConnections(connsMap)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  const allConnected = Object.keys(PLATFORMS_CONFIG).every(p => connections[p])

  return (
    <div className="space-y-6 animate-slide-in">
      <SectionHeader
        title="Growth Analytics"
        description="Connect your social media accounts to track followers, posts, and engagement in real-time"
      />

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
    </div>
  )
}
