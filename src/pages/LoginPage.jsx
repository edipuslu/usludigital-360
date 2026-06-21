import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { UsluLoader } from '../components/ui/UIKit'

const CHARACTER_COLORS = {
  red: '#f42f25',
  orange: '#f49725',
  blue: '#255ff4',
  pink: '#f42582',
}

const Pupil = ({ size = 12, maxDistance = 5, forceLookX, forceLookY }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const pupilRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = e => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const getPosition = () => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    if (!pupilRef.current) return { x: 0, y: 0 }

    const rect = pupilRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = mouse.x - centerX
    const deltaY = mouse.y - centerY
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance)
    const angle = Math.atan2(deltaY, deltaX)

    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
  }

  const position = getPosition()

  return (
    <div
      ref={pupilRef}
      className="rounded-full bg-slate-950"
      style={{
        width: size,
        height: size,
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: 'transform 100ms ease-out',
      }}
    />
  )
}

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, isBlinking = false, forceLookX, forceLookY }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const eyeRef = useRef(null)

  useEffect(() => {
    const handleMouseMove = e => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const getPosition = () => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    if (!eyeRef.current) return { x: 0, y: 0 }

    const rect = eyeRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = mouse.x - centerX
    const deltaY = mouse.y - centerY
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance)
    const angle = Math.atan2(deltaY, deltaX)

    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
  }

  const position = getPosition()

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center bg-white transition-all duration-150"
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full bg-slate-950"
          style={{
            width: pupilSize,
            height: pupilSize,
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: 'transform 100ms ease-out',
          }}
        />
      )}
    </div>
  )
}

const Smile = ({ width = 46, height = 18, color = '#020617', happy = true, className = '', style = {} }) => (
  <div className={className} style={{ width, height, ...style }}>
    <svg width="100%" height="100%" viewBox="0 0 60 28" fill="none" aria-hidden="true">
      <path
        d={happy ? 'M12 8C20 23 40 23 48 8' : 'M16 16C24 9 36 9 44 16'}
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  </div>
)

const AnimatedLoginCharacters = ({ isTyping, showPassword, passwordValue }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [isPinkBlinking, setIsPinkBlinking] = useState(false)
  const [isRedBlinking, setIsRedBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPinkPeeking, setIsPinkPeeking] = useState(false)
  const pinkRef = useRef(null)
  const redRef = useRef(null)
  const blueRef = useRef(null)
  const orangeRef = useRef(null)
  const hasPassword = passwordValue.length > 0

  useEffect(() => {
    const handleMouseMove = e => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const scheduleBlink = setter => {
      const timeout = setTimeout(() => {
        setter(true)
        setTimeout(() => {
          setter(false)
          scheduleBlink(setter)
        }, 150)
      }, Math.random() * 4000 + 3000)
      return timeout
    }

    const pinkTimeout = scheduleBlink(setIsPinkBlinking)
    const redTimeout = scheduleBlink(setIsRedBlinking)
    return () => {
      clearTimeout(pinkTimeout)
      clearTimeout(redTimeout)
    }
  }, [])

  useEffect(() => {
    if (!isTyping) {
      setIsLookingAtEachOther(false)
      return undefined
    }

    setIsLookingAtEachOther(true)
    const timer = setTimeout(() => setIsLookingAtEachOther(false), 800)
    return () => clearTimeout(timer)
  }, [isTyping])

  useEffect(() => {
    if (!hasPassword || !showPassword) {
      setIsPinkPeeking(false)
      return undefined
    }

    const timeout = setTimeout(() => {
      setIsPinkPeeking(true)
      setTimeout(() => setIsPinkPeeking(false), 800)
    }, Math.random() * 3000 + 1600)

    return () => clearTimeout(timeout)
  }, [hasPassword, showPassword, isPinkPeeking])

  const calculatePosition = ref => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 3
    const deltaX = mouse.x - centerX
    const deltaY = mouse.y - centerY

    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    }
  }

  const pinkPos = calculatePosition(pinkRef)
  const redPos = calculatePosition(redRef)
  const bluePos = calculatePosition(blueRef)
  const orangePos = calculatePosition(orangeRef)
  const passwordMode = hasPassword && showPassword
  const privateTyping = isTyping || (hasPassword && !showPassword)

  return (
    <div className="relative w-[550px] h-[430px] max-w-full scale-[0.92] xl:scale-100 origin-bottom">
      <div className="absolute bottom-[-18px] left-3 h-7 w-[470px] rounded-full bg-black/25 blur-lg" />
      <div
        ref={pinkRef}
        className="absolute bottom-0 shadow-2xl shadow-black/20 transition-all duration-700 ease-in-out"
        style={{
          left: 70,
          width: 180,
          height: privateTyping ? 430 : 390,
          backgroundColor: CHARACTER_COLORS.pink,
          borderRadius: '12px 12px 0 0',
          zIndex: 1,
          transform: passwordMode
            ? 'skewX(0deg)'
            : privateTyping
              ? `skewX(${(pinkPos.bodySkew || 0) - 12}deg) translateX(40px)`
              : `skewX(${pinkPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-700 ease-in-out"
          style={{
            left: passwordMode ? 20 : isLookingAtEachOther ? 55 : 45 + pinkPos.faceX,
            top: passwordMode ? 35 : isLookingAtEachOther ? 65 : 40 + pinkPos.faceY,
          }}
        >
          <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isPinkBlinking} forceLookX={passwordMode ? (isPinkPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined} forceLookY={passwordMode ? (isPinkPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
          <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isPinkBlinking} forceLookX={passwordMode ? (isPinkPeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined} forceLookY={passwordMode ? (isPinkPeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
        </div>
        <Smile
          className="absolute transition-all duration-700 ease-in-out"
          width={44}
          height={18}
          happy={!passwordMode || isPinkPeeking}
          style={{
            left: passwordMode ? 39 : isLookingAtEachOther ? 72 : 65 + pinkPos.faceX,
            top: passwordMode ? 72 : isLookingAtEachOther ? 102 : 78 + pinkPos.faceY,
            opacity: passwordMode && !isPinkPeeking ? 0.45 : 1,
          }}
        />
      </div>

      <div
        ref={redRef}
        className="absolute bottom-0 shadow-2xl shadow-black/20 transition-all duration-700 ease-in-out"
        style={{
          left: 240,
          width: 120,
          height: 310,
          backgroundColor: CHARACTER_COLORS.red,
          borderRadius: '10px 10px 0 0',
          zIndex: 2,
          transform: passwordMode
            ? 'skewX(0deg)'
            : isLookingAtEachOther
              ? `skewX(${(redPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
              : privateTyping
                ? `skewX(${(redPos.bodySkew || 0) * 1.5}deg)`
                : `skewX(${redPos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-700 ease-in-out"
          style={{
            left: passwordMode ? 10 : isLookingAtEachOther ? 32 : 26 + redPos.faceX,
            top: passwordMode ? 28 : isLookingAtEachOther ? 12 : 32 + redPos.faceY,
          }}
        >
          <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isRedBlinking} forceLookX={passwordMode ? -4 : isLookingAtEachOther ? 0 : undefined} forceLookY={passwordMode ? -4 : isLookingAtEachOther ? -4 : undefined} />
          <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isRedBlinking} forceLookX={passwordMode ? -4 : isLookingAtEachOther ? 0 : undefined} forceLookY={passwordMode ? -4 : isLookingAtEachOther ? -4 : undefined} />
        </div>
        <Smile
          className="absolute transition-all duration-700 ease-in-out"
          width={34}
          height={15}
          style={{
            left: passwordMode ? 24 : isLookingAtEachOther ? 46 : 42 + redPos.faceX,
            top: passwordMode ? 58 : isLookingAtEachOther ? 40 : 60 + redPos.faceY,
          }}
        />
      </div>

      <div
        ref={orangeRef}
        className="absolute bottom-0 shadow-2xl shadow-black/20 transition-all duration-700 ease-in-out"
        style={{
          left: 0,
          width: 240,
          height: 200,
          zIndex: 3,
          backgroundColor: CHARACTER_COLORS.orange,
          borderRadius: '120px 120px 0 0',
          transform: passwordMode ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-200 ease-out"
          style={{
            left: passwordMode ? 50 : 82 + orangePos.faceX,
            top: passwordMode ? 85 : 90 + orangePos.faceY,
          }}
        >
          <EyeBall size={19} pupilSize={7} maxDistance={5} forceLookX={passwordMode ? -5 : undefined} forceLookY={passwordMode ? -4 : undefined} />
          <EyeBall size={19} pupilSize={7} maxDistance={5} forceLookX={passwordMode ? -5 : undefined} forceLookY={passwordMode ? -4 : undefined} />
        </div>
        <Smile
          className="absolute transition-all duration-200 ease-out"
          width={54}
          height={20}
          style={{
            left: passwordMode ? 78 : 101 + orangePos.faceX,
            top: passwordMode ? 118 : 122 + orangePos.faceY,
          }}
        />
      </div>

      <div
        ref={blueRef}
        className="absolute bottom-0 shadow-2xl shadow-black/20 transition-all duration-700 ease-in-out"
        style={{
          left: 310,
          width: 140,
          height: 230,
          backgroundColor: CHARACTER_COLORS.blue,
          borderRadius: '70px 70px 0 0',
          zIndex: 4,
          transform: passwordMode ? 'skewX(0deg)' : `skewX(${bluePos.bodySkew || 0}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-200 ease-out"
          style={{
            left: passwordMode ? 20 : 52 + bluePos.faceX,
            top: passwordMode ? 35 : 40 + bluePos.faceY,
          }}
        >
          <EyeBall size={18} pupilSize={7} maxDistance={5} forceLookX={passwordMode ? -5 : undefined} forceLookY={passwordMode ? -4 : undefined} />
          <EyeBall size={18} pupilSize={7} maxDistance={5} forceLookX={passwordMode ? -5 : undefined} forceLookY={passwordMode ? -4 : undefined} />
        </div>
        <Smile
          className="absolute transition-all duration-200 ease-out"
          width={58}
          height={22}
          style={{
            left: passwordMode ? 28 : 43 + bluePos.faceX,
            top: passwordMode ? 90 : 92 + bluePos.faceY,
          }}
        />
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [])

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
    if (result.user.companyId) {
      window.sessionStorage.setItem('ud360_active_company_id', result.user.companyId)
    }
    navigate(result.user.role === 'admin' ? '/admin' : '/company/home')
  }

  const fillDemo = (email, password) => setForm({ email, password })

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#060912' }}>
      {/* Left panel */}
      <div className="hidden lg:flex relative w-[52%] h-screen flex-col overflow-hidden px-12 py-10 text-white">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center">
              <Zap size={20} className="text-slate-950" fill="#020617" />
            </div>
            <div>
              <div className="font-bold text-lg leading-none">Uslu360Digital</div>
              <div className="text-white/50 text-xs mt-1">AI automation workspace</div>
            </div>
          </div>
          <div className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">Live dashboard</div>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <AnimatedLoginCharacters isTyping={isTyping} showPassword={showPw} passwordValue={form.password} />
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 text-sm">
          {[
            ['Comments', 'AI replies'],
            ['DMs', 'Smart inbox'],
            ['Reports', 'Monthly growth'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-white/45 text-xs">{label}</div>
              <div className="mt-1 font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8 overflow-hidden" style={{ background: '#F8FAFC' }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center">
              <Zap size={18} className="text-white" fill="white" />
            </div>
            <div className="text-slate-900 font-bold text-lg">Uslu360Digital</div>
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
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
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
                  className="text-[#255ff4] text-xs font-medium hover:text-[#1c49d7] cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
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
              <div className="bg-[#f42f25]/10 border border-[#f42f25]/25 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f42f25] flex-shrink-0" />
                <span className="text-[#b91f18] text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#255ff4] hover:bg-[#1c49d7] disabled:bg-[#255ff4]/60 text-white rounded-lg py-3 text-sm font-semibold cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <UsluLoader size="xs" />
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
                  <div className="flex items-center gap-1.5 text-[#255ff4] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
