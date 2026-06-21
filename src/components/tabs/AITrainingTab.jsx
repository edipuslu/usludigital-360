import { useEffect, useState } from 'react'
import { Upload, FileText, Trash2, CheckCircle2, RefreshCw, Brain, Shield, Globe, MessageSquare, Plus, Eye, EyeOff, ExternalLink, AlertCircle, Zap, Key, Sparkles, Send } from 'lucide-react'
import { StatusBadge, Toggle, UsluLoader } from '../ui/UIKit'
import { getBackendAiConfig, saveBackendAiConfig, testBackendAiReply } from '../../lib/backendApi'
import clsx from 'clsx'

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Formal, clear, business-oriented' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, conversational, approachable' },
  { value: 'luxury', label: 'Luxury', desc: 'Elegant, premium, sophisticated' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, natural, informal' },
]

const FILE_TYPES = {
  pdf: { label: 'PDF', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  sheet: { label: 'XLS', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  doc: { label: 'DOC', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
}

function AiPreviewCard({ type, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-lg"
    >
      <div className="h-[220px] overflow-hidden rounded-lg bg-slate-950 p-6 transition-transform group-hover:-translate-y-0.5">
        {type === 'replies' && (
          <div className="flex h-full flex-col justify-center gap-4">
            <div className="max-w-[210px] rounded-2xl bg-slate-800 px-4 py-3 text-sm font-medium text-white">How long is the course?</div>
            <div className="ml-auto max-w-[235px] rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold leading-relaxed text-white">
              8 weeks. Video lessons, worksheets, and lifetime access.
            </div>
          </div>
        )}
        {type === 'comments' && (
          <div className="flex h-full flex-col justify-center gap-4">
            <div className="-rotate-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
              Your feedback helps us improve every week.
            </div>
            <div className="rotate-2 rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-500">
              Thanks for sharing this. We appreciate you.
            </div>
            <div className="mt-auto flex gap-4 border-t border-white/20 pt-4 text-white">
              <MessageSquare size={24} />
              <Send size={24} />
            </div>
          </div>
        )}
        {type === 'goals' && (
          <div className="flex h-full flex-col justify-center rounded-[28px] border border-slate-800 bg-black px-6">
            <div className="text-xs font-bold text-slate-400">Jessica Peel · 2h</div>
            <div className="mt-1 text-sm text-white">Love this.</div>
            <div className="mt-5 rounded-2xl bg-violet-600 p-5 text-white">
              <div className="text-sm font-semibold leading-relaxed">Happy to hear you loved it. Want the registration link?</div>
              <div className="mt-4 rounded-lg bg-white/20 px-4 py-3 text-center text-sm font-bold">Register now</div>
            </div>
          </div>
        )}
      </div>
      <h3 className="mt-5 text-base font-extrabold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </button>
  )
}

function DocumentRow({ doc, onRemove }) {
  const ft = FILE_TYPES[doc.type] || FILE_TYPES.doc
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 group">
      <div className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 text-xs font-bold', ft.bg, ft.text, ft.border)}>
        {ft.label}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-900 text-sm font-medium truncate">{doc.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-slate-400 text-xs">{doc.size}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400 text-xs">{doc.uploaded}</span>
          <span className="text-slate-300">·</span>
          <StatusBadge status={doc.status === 'active' ? 'active' : 'training'} />
        </div>
      </div>
      {onRemove && (
        <button onClick={() => onRemove(doc.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-lg cursor-pointer text-slate-400 hover:text-red-500">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function DropZone({ onFileDrop }) {
  const [dragOver, setDragOver] = useState(false)
  const handleDrop = e => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    onFileDrop(files)
  }
  const handleChange = e => {
    const files = Array.from(e.target.files)
    onFileDrop(files)
  }
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={clsx(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
      )}
    >
      <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Upload size={22} className="text-blue-600" />
      </div>
      <div className="text-slate-900 font-semibold text-sm mb-1">Drop files here or click to upload</div>
      <div className="text-slate-400 text-xs mb-4">PDF, DOCX, XLSX up to 20MB · Product catalogs, Q&A pairs, brand guides</div>
      <label className="btn-primary mx-auto text-xs cursor-pointer inline-flex items-center gap-1.5">
        <Plus size={12} />
        Choose Files
        <input type="file" multiple accept=".pdf,.docx,.xlsx,.csv" className="hidden" onChange={handleChange} />
      </label>
    </div>
  )
}

function OpenAIKeySection({ apiKey, hasSavedKey, onKeyChange }) {
  const [showKey, setShowKey] = useState(false)
  const [inputKey, setInputKey] = useState(apiKey || '')
  const [status, setStatus] = useState(hasSavedKey || apiKey ? 'saved' : 'empty') // empty | testing | valid | invalid | saved
  const [errorMsg, setErrorMsg] = useState('')
  const [removeMode, setRemoveMode] = useState(false)
  const [removeText, setRemoveText] = useState('')

  useEffect(() => {
    if (apiKey) setInputKey(apiKey)
    setStatus(hasSavedKey || apiKey ? 'saved' : 'empty')
  }, [apiKey, hasSavedKey])

  const testKey = async () => {
    if (!inputKey.trim()) return
    setStatus('testing')
    setErrorMsg('')
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${inputKey.trim()}` },
      })
      if (res.ok) {
        setStatus('valid')
        setRemoveMode(false)
        setRemoveText('')
        onKeyChange(inputKey.trim())
      } else {
        const data = await res.json()
        setStatus('invalid')
        setErrorMsg(data?.error?.message || 'Invalid API key. Please check and try again.')
      }
    } catch (err) {
      setStatus('invalid')
      setErrorMsg('Connection failed. Check your internet connection.')
    }
  }

  const clearKey = () => {
    if (removeText !== 'DELETE') return
    setInputKey('')
    setStatus('empty')
    setRemoveMode(false)
    setRemoveText('')
    onKeyChange('')
    localStorage.removeItem('ud360_openai_key')
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Key size={16} className="text-slate-400" />
        <h3 className="text-slate-900 font-bold text-base">OpenAI API Key</h3>
        {status === 'valid' || status === 'saved' ? (
          <span className="ml-auto badge-active text-xs">Connected</span>
        ) : null}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
        <div className="text-slate-700 text-sm font-semibold mb-1 flex items-center gap-1.5">
          <Zap size={13} className="text-blue-600" />
          How to get your API key
        </div>
        <ol className="space-y-1.5 mt-2">
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
            Go to{' '}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
              platform.openai.com/api-keys <ExternalLink size={11} />
            </a>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
            Sign in or create an OpenAI account
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
            Click <strong>"Create new secret key"</strong> → Name it "Usludigital 360" → Copy the key (starts with <code className="bg-slate-200 px-1 rounded text-xs">sk-...</code>)
          </li>
        </ol>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your API Key</label>
          {hasSavedKey && !inputKey ? (
            <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              OpenAI key is already saved on the backend. Paste a new key only if you want to replace it.
            </div>
          ) : null}
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={inputKey}
              onChange={e => { setInputKey(e.target.value); setStatus('empty') }}
              placeholder={hasSavedKey ? 'Saved on backend - paste new key to replace' : 'sk-proj-...'}
              className={clsx('input-field pr-20 font-mono text-sm', status === 'valid' && 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200', status === 'invalid' && 'border-red-400 focus:border-red-500 focus:ring-red-200')}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {status === 'invalid' && errorMsg && (
            <div className="mt-2 flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-700 text-xs">{errorMsg}</span>
            </div>
          )}
          {(status === 'valid') && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
              <CheckCircle2 size={12} /> API key verified successfully — AI is ready
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={testKey}
            disabled={!inputKey.trim() || status === 'testing'}
            className={clsx('btn-primary flex-1 justify-center', (!inputKey.trim() || status === 'testing') && 'opacity-50 cursor-not-allowed')}
          >
            {status === 'testing' ? (
              <><UsluLoader size="xs" />Verifying Key...</>
            ) : (
              <><CheckCircle2 size={14} />Verify & Save Key</>
            )}
          </button>
          {(status === 'valid' || status === 'saved') && (
            <button onClick={() => setRemoveMode(true)} className="btn-danger">Remove</button>
          )}
        </div>

        {removeMode && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <div className="text-red-800 text-xs font-semibold mb-2">
              This removes the OpenAI key from every company. Type <span className="font-bold">DELETE</span> to confirm.
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={removeText}
                onChange={e => setRemoveText(e.target.value)}
                className="input-field bg-white"
                placeholder="DELETE"
              />
              <button
                onClick={clearKey}
                disabled={removeText !== 'DELETE'}
                className={clsx('btn-danger justify-center', removeText !== 'DELETE' && 'opacity-50 cursor-not-allowed')}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => { setRemoveMode(false); setRemoveText('') }}
                className="btn-secondary justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
        <Shield size={12} className="mt-0.5 flex-shrink-0" />
        Your key is saved once for the admin workspace and used by every company automatically.
      </div>
    </div>
  )
}

export default function AITrainingTab({ company, onUpdate, onNotify, isAdmin = true }) {
  const [docs, setDocs] = useState(company.aiTraining.documents)
  const [guardrails, setGuardrails] = useState(company.aiTraining.guardrails)
  const [description, setDescription] = useState(company.aiTraining.description)
  const [websiteUrl, setWebsiteUrl] = useState(company.aiTraining.websiteUrl)
  const [fallback, setFallback] = useState(company.aiTraining.fallbackMessage)
  const [selectedTone, setSelectedTone] = useState(company.aiTraining.tone || 'professional')
  const [testInput, setTestInput] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')
  const [hasSavedApiKey, setHasSavedApiKey] = useState(() => Boolean(company.hasOpenaiKey))
  const [setupOpen, setSetupOpen] = useState(() => Boolean(company.aiTraining.description || company.aiTraining.websiteUrl || company.aiTraining.documents?.length || company.hasOpenaiKey))
  const [focusSection, setFocusSection] = useState('knowledge')

  useEffect(() => {
    let alive = true
    getBackendAiConfig(company.id)
      .then(config => {
        if (!alive) return
        setHasSavedApiKey(Boolean(config.hasOpenaiKey))
      })
      .catch(() => {
        if (!alive) return
        setHasSavedApiKey(Boolean(company.hasOpenaiKey))
      })
    return () => {
      alive = false
    }
  }, [company.id, company.hasOpenaiKey])

  const handleFileDrop = files => {
    const newDocs = files.map((f, i) => {
      const ext = f.name.split('.').pop().toLowerCase()
      const type = ext === 'pdf' ? 'pdf' : ['xlsx', 'csv'].includes(ext) ? 'sheet' : 'doc'
      return {
        id: Date.now() + i,
        name: f.name,
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
        uploaded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'active',
        type,
      }
    })
    setDocs(d => [...d, ...newDocs])
  }

  const handleRemove = id => setDocs(d => d.filter(doc => doc.id !== id))

  const saveTraining = async status => {
    const nextCompany = {
      ...company,
      aiTraining: {
        ...company.aiTraining,
        status,
        lastTrained: status === 'active' ? new Date().toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' }) : company.aiTraining.lastTrained,
        progress: status === 'active' ? 100 : company.aiTraining.progress,
        documents: docs,
        websiteUrl,
        guardrails,
        fallbackMessage: fallback,
        description,
        tone: selectedTone,
      },
    }

    onUpdate?.(current => ({
      ...current,
      aiTraining: nextCompany.aiTraining,
    }))

    try {
      await saveBackendAiConfig(nextCompany)
      onNotify?.('AI training synced to backend.', 'success')
    } catch (err) {
      onNotify?.(`AI saved locally, but backend sync failed: ${err.message}`, 'warning')
    }
  }

  const handleTest = async () => {
    if (!testInput.trim()) return
    if (!hasSavedApiKey) {
      setTestError('Add the shared OpenAI API key in Settings > API Keys first.')
      return
    }
    setTesting(true)
    setTestError('')
    setTestResponse('')

    try {
      const data = await testBackendAiReply(company.id, testInput)
      setTestResponse(data.reply)
    } catch (err) {
      setTestError(err.message)
    } finally {
      setTesting(false)
    }
  }

  const openSetup = section => {
    setFocusSection(section)
    setSetupOpen(true)
  }

  if (!setupOpen) {
    return (
      <div className="animate-slide-in">
        <div className="-mx-8 -mt-8 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-8 py-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Usludigital AI</h1>
            <span className="text-lg font-semibold text-slate-400">BETA for Instagram</span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => openSetup('test')}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Sparkles size={16} /> Test AI
            </button>
          )}
        </div>

        <section className="mx-auto max-w-5xl px-2 py-16 text-center">
          <p className="text-sm font-semibold text-slate-500">Welcome to Usludigital AI</p>
          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-950">Meet your new social media assistant</h2>

          <div className="mt-10 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
            <AiPreviewCard
              type="replies"
              title="AI Replies"
              description="Share your business knowledge, then AI uses it to reply around the clock."
              onClick={() => openSetup('knowledge')}
            />
            <AiPreviewCard
              type="comments"
              title="AI Comments"
              description="Set your brand tone, then AI replies to comments in the style you choose."
              onClick={() => openSetup('behavior')}
            />
            <AiPreviewCard
              type="goals"
              title="AI Goals"
              description="Guide replies toward leads, clicks, bookings, or whichever result matters most."
              onClick={() => openSetup('goals')}
            />
          </div>

          <button
            type="button"
            onClick={() => openSetup('knowledge')}
            className="mt-10 inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-7 text-base font-bold text-white hover:bg-blue-700"
          >
            Set Up Usludigital AI
          </button>

          <p className="mx-auto mt-28 max-w-2xl text-sm font-medium text-slate-500">
            AI is not human and may need review. Replies use the business context, tone, guardrails, and fallback message you configure here.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="-mx-8 -mt-8 flex flex-col gap-5 border-b border-slate-200 bg-slate-50 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Usludigital AI</h1>
            <span className="text-lg font-semibold text-slate-400">BETA for Instagram</span>
            <StatusBadge status={isAdmin ? (hasSavedApiKey ? 'active' : 'needs_update') : company.aiTraining.status} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['knowledge', 'Knowledge'],
              ['behavior', 'Behavior'],
              ['goals', 'Goals'],
              ...(isAdmin ? [['test', 'Test AI']] : []),
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFocusSection(key)}
                className={clsx(
                  'h-10 rounded-lg px-4 text-sm font-bold transition-colors',
                  focusSection === key ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && docs.length > 0 && (
            <button onClick={() => saveTraining('active')} className="btn-primary">
              <RefreshCw size={14} /> Retrain AI
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setFocusSection('test')}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Sparkles size={16} /> Test AI
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — provider status + documents */}
        <div className="lg:col-span-2 space-y-5">
          {isAdmin ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950">Shared AI Provider</h3>
                    <p className="text-sm font-medium text-slate-500">The OpenAI key is managed once in Settings and applies to every company.</p>
                  </div>
                </div>
                <span className={clsx('inline-flex w-fit rounded-full px-3 py-1 text-xs font-extrabold', hasSavedApiKey ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700')}>
                  {hasSavedApiKey ? 'Ready for testing' : 'Needs key'}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ['Scope', 'All companies'],
                  ['Replies', 'Comments and DMs'],
                  ['Manage', 'Settings > API Keys'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{label}</div>
                    <div className="mt-1 text-sm font-bold text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={15} className="text-slate-400" />
                <h3 className="text-slate-900 font-bold text-base">AI Connection</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                OpenAI API keys and platform credentials are managed only by the admin workspace.
              </p>
            </div>
          )}

          {/* Documents */}
          <div className={clsx('card p-5', focusSection === 'knowledge' && 'ring-2 ring-blue-200')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
                <FileText size={15} className="text-slate-400" /> Training Documents
              </h3>
              <span className="text-slate-400 text-xs">{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
            </div>
            {isAdmin ? (
              <DropZone onFileDrop={handleFileDrop} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Training files are managed by the admin workspace.
              </div>
            )}
            {docs.length > 0 && (
              <div className="mt-4">
                {docs.map(doc => <DocumentRow key={doc.id} doc={doc} onRemove={isAdmin ? handleRemove : undefined} />)}
              </div>
            )}
          </div>

          {/* Website + Description */}
          <div className={clsx('card p-5', focusSection === 'knowledge' && 'ring-2 ring-blue-200')}>
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2 mb-4">
              <Globe size={15} className="text-slate-400" /> Business Context
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website URL</label>
                <div className="flex gap-2">
                  <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} disabled={!isAdmin} className="input-field flex-1 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="https://yourbusiness.com" />
                  {isAdmin && <button onClick={() => saveTraining('training')} className="btn-secondary flex-shrink-0">Crawl</button>}
                </div>
                <p className="text-slate-400 text-xs mt-1.5">AI will use your website content as additional context</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  rows={4}
                  className="input-field resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Describe this business: what it sells, who the customers are, location, unique selling points, anything the AI needs to know to reply correctly…"
                />
              </div>
            </div>
          </div>

          {/* AI Test Console */}
          {isAdmin && <div className={clsx('card p-5', focusSection === 'test' && 'ring-2 ring-blue-200')}>
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2 mb-1">
              <Brain size={15} className="text-slate-400" /> Test AI Responses
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {hasSavedApiKey ? 'Powered by the cheapest available OpenAI model — type any question a customer might ask' : 'Add your shared OpenAI API key in Settings > API Keys to test real AI responses'}
            </p>
            <div className="space-y-3">
              <textarea
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                rows={2}
                disabled={!hasSavedApiKey}
                className="input-field resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={hasSavedApiKey ? 'e.g. How much does the Luna Sofa cost? Do you deliver to Ankara?' : 'Add OpenAI API key first...'}
              />
              <button
                onClick={handleTest}
                disabled={!testInput.trim() || testing || !hasSavedApiKey}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? <><UsluLoader size="xs" />Generating...</> : <><Brain size={14} />Generate AI Reply</>}
              </button>
              {testError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{testError}</span>
                </div>
              )}
              {testResponse && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <Brain size={12} className="text-white" />
                    </div>
                    <span className="text-slate-700 text-xs font-semibold">AI Reply</span>
                    <span className="text-slate-400 text-xs ml-auto">Live response</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{testResponse}</p>
                </div>
              )}
            </div>
          </div>}
        </div>

        {/* Right — settings */}
        <div className="space-y-5">
          <div className={clsx('card p-5', focusSection === 'behavior' && 'ring-2 ring-blue-200')}>
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2 mb-4">
              <Shield size={15} className="text-slate-400" /> AI Guardrails
            </h3>
            <div className="space-y-4">
              <Toggle
                checked={guardrails}
                onChange={setGuardrails}
                label="Strict Mode"
                description="AI only replies based on trained context. Never invents prices or products."
              />
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fallback Message</label>
                <p className="text-slate-400 text-xs mb-2">What to say when AI is not confident</p>
                <textarea
                  value={fallback}
                  onChange={e => setFallback(e.target.value)}
                  disabled={!isAdmin}
                  rows={3}
                  className="input-field resize-none text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className={clsx('card p-5', focusSection === 'behavior' && 'ring-2 ring-blue-200')}>
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2 mb-4">
              <MessageSquare size={15} className="text-slate-400" /> Default Reply Tone
            </h3>
            <div className="space-y-2">
              {TONES.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  disabled={!isAdmin}
                  className={clsx(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left disabled:cursor-not-allowed disabled:opacity-70',
                    isAdmin && 'cursor-pointer',
                    selectedTone === tone.value ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0', selectedTone === tone.value ? 'border-blue-600 bg-blue-600' : 'border-slate-300')}>
                    {selectedTone === tone.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <div>
                    <div className="text-slate-900 text-sm font-semibold">{tone.label}</div>
                    <div className="text-slate-400 text-xs">{tone.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={clsx('card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100', focusSection === 'goals' && 'ring-2 ring-blue-200')}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-blue-600" />
              <span className="text-blue-900 font-bold text-sm">Setup Checklist</span>
            </div>
            <ul className="space-y-2">
              {[
                ...(isAdmin ? [{ label: 'OpenAI API key added', done: hasSavedApiKey }] : []),
                { label: 'Business description written', done: !!description.trim() },
                { label: 'Training documents uploaded', done: docs.length > 0 },
                { label: 'Fallback message set', done: !!fallback.trim() },
                { label: 'Reply tone selected', done: !!selectedTone },
              ].map(item => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  <div className={clsx('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0', item.done ? 'bg-emerald-500' : 'bg-slate-200')}>
                    {item.done && <CheckCircle2 size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className={item.done ? 'text-slate-700' : 'text-slate-400'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
