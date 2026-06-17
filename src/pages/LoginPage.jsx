import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle2, Shield, Brain, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Feature = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={15} className="text-blue-400" />
    </div>
    <div>
      <div className="text-white text-sm font-semibold">{title}</div>
      <div className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</div>
    </div>
  </div>
)

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const result = login(form.email, form.password)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    navigate(result.user.role === 'admin' ? '/admin' : `/company/${result.user.companyId}`)
  }

  const fillDemo = (email, password) => setForm({ email, password })

  return (
    <div className="min-h-screen flex" style={{ background: '#060912' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden p-12">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(37,99,235,0.4) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(99,102,241,0.2) 0%, transparent 40%),
              radial-gradient(circle at 60% 80%, rgba(37,99,235,0.15) 0%, transparent 40%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(37,99,235,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-glow-blue">
              <Zap size={20} className="text-white" fill="white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">Usludigital</div>
              <div className="flex items-center gap-1.5">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">360</span>
                <span className="text-slate-500 text-[10px] uppercase tracking-widest font-medium">Platform</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 bg-blue-600/15 border border-blue-500/30 rounded-full px-3 py-1 text-blue-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-slow" />
                AI-Powered Automation
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              The smartest way to<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #818CF8 100%)' }}>
                run social support
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-md">
              Connect Instagram, Facebook, YouTube, and WhatsApp, then manage AI replies, automation, and alerts from one workspace.
            </p>

            <div className="space-y-5 mb-10">
              <Feature icon={Brain} title="Context-Aware AI Replies" desc="AI trained on your actual products, tone and goals — never generic responses." />
              <Feature icon={Zap} title="Multi-Platform Automation" desc="Instagram, Facebook, YouTube and WhatsApp — managed simultaneously in one workspace." />
              <Feature icon={BarChart3} title="Real-Time Analytics" desc="Track replies, WhatsApp clicks, response rates and conversions with live dashboards." />
              <Feature icon={Shield} title="Strict Guardrails" desc="AI never invents prices, products or promises. Falls back to WhatsApp when uncertain." />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {['Instagram', 'Facebook', 'YouTube', 'WhatsApp'].map(platform => (
              <div key={platform}>
                <div className="text-white text-xl font-bold">Ready</div>
                <div className="text-slate-500 text-xs">{platform}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: '#F8FAFC' }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <div className="text-slate-900 font-bold text-lg">Usludigital <span className="text-blue-600">360</span></div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setError('Password reset is ready for backend email delivery. Use a demo account for now.')}
                  className="text-blue-600 text-xs font-medium hover:text-blue-700 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg py-3 text-sm font-semibold cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo Accounts</p>
            <div className="space-y-2">
              {[
                { label: 'Admin Workspace', email: 'admin@usludigital.com', password: 'admin123' },
                { label: 'Client Workspace', email: 'client@usludigital.com', password: 'client123' },
              ].map(demo => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => fillDemo(demo.email, demo.password)}
                  className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer transition-colors group"
                >
                  <div className="text-left">
                    <div className="text-slate-800 text-xs font-semibold">{demo.label}</div>
                    <div className="text-slate-500 text-xs mt-0.5 font-mono">{demo.email}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 size={13} />
                    Use
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
