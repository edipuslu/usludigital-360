import { useEffect, useState } from 'react'
import { Upload, FileText, Trash2, CheckCircle2, RefreshCw, Brain, Shield, Globe, MessageSquare, Plus, Eye, EyeOff, ExternalLink, AlertCircle, Zap, Key } from 'lucide-react'
import { StatusBadge, SectionHeader, Toggle } from '../ui/UIKit'
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
    if (removeText !== 'Remove') return
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
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying Key…</>
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
              This removes the OpenAI key from every company. Type <span className="font-bold">Remove</span> to confirm.
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={removeText}
                onChange={e => setRemoveText(e.target.value)}
                className="input-field bg-white"
                placeholder="Remove"
              />
              <button
                onClick={clearKey}
                disabled={removeText !== 'Remove'}
                className={clsx('btn-danger justify-center', removeText !== 'Remove' && 'opacity-50 cursor-not-allowed')}
              >
                Confirm Remove
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ud360_openai_key') || '')
  const [hasSavedApiKey, setHasSavedApiKey] = useState(() => Boolean(localStorage.getItem('ud360_openai_key') || company.hasOpenaiKey))

  useEffect(() => {
    let alive = true
    getBackendAiConfig(company.id)
      .then(config => {
        if (!alive) return
        setHasSavedApiKey(Boolean(config.hasOpenaiKey))
      })
      .catch(() => {
        if (!alive) return
        setHasSavedApiKey(Boolean(localStorage.getItem('ud360_openai_key') || company.hasOpenaiKey))
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
    if (!apiKey && !hasSavedApiKey) {
      setTestError('Please add and verify your OpenAI API key first.')
      return
    }
    setTesting(true)
    setTestError('')
    setTestResponse('')

    try {
      if (apiKey) {
        await saveBackendAiConfig({
          ...company,
          aiTraining: {
            ...company.aiTraining,
            documents: docs,
            websiteUrl,
            guardrails,
            fallbackMessage: fallback,
            description,
            tone: selectedTone,
          },
        }, apiKey)
      }
      const data = await testBackendAiReply(company.id, testInput)
      setTestResponse(data.reply)
    } catch (err) {
      setTestError(err.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <SectionHeader
        title="AI Training Center"
        description={isAdmin ? "Add your OpenAI key and upload business context so the AI replies accurately in your brand's voice" : "View the AI training status and business context configured by the admin."}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={isAdmin ? (hasSavedApiKey ? 'active' : 'needs_update') : company.aiTraining.status} />
            {isAdmin && docs.length > 0 && (
              <button onClick={() => saveTraining('active')} className="btn-primary">
                <RefreshCw size={14} /> Retrain AI
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — OpenAI key + documents */}
        <div className="lg:col-span-2 space-y-5">
          {isAdmin ? (
            <OpenAIKeySection apiKey={apiKey} hasSavedKey={hasSavedApiKey} onKeyChange={async key => {
              setApiKey(key)
              setHasSavedApiKey(Boolean(key))
              const automation = key ? {
                ...company.automation,
                instagram: { ...(company.automation?.instagram || {}), dmReply: true, commentReply: true },
                facebook: { ...(company.automation?.facebook || {}), dmReply: true, commentReply: true },
                whatsapp: { ...(company.automation?.whatsapp || {}), dmReply: true },
              } : company.automation
              try {
                await saveBackendAiConfig({
                  ...company,
                  automation,
                  aiTraining: {
                    ...company.aiTraining,
                    documents: docs,
                    websiteUrl,
                    guardrails,
                    fallbackMessage: fallback,
                    description,
                    tone: selectedTone,
                  },
                }, key)
                onUpdate?.(current => ({ ...current, automation, hasOpenaiKey: Boolean(key) }))
                onNotify?.(key ? 'OpenAI key saved for all companies. Comment and DM auto-replies are enabled.' : 'OpenAI key removed from all companies.', 'success')
              } catch (err) {
                onNotify?.(`OpenAI key changed locally, but backend sync failed: ${err.message}`, 'warning')
              }
            }} />
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
          <div className="card p-5">
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
          <div className="card p-5">
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
          {isAdmin && <div className="card p-5">
            <h3 className="text-slate-900 font-bold text-base flex items-center gap-2 mb-1">
              <Brain size={15} className="text-slate-400" /> Test AI Responses
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {hasSavedApiKey ? 'Powered by the cheapest available OpenAI model — type any question a customer might ask' : 'Add your OpenAI API key above to test real AI responses'}
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
                {testing ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</> : <><Brain size={14} />Generate AI Reply</>}
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
                    <span className="text-slate-700 text-xs font-semibold">AI Reply (GPT-4o mini)</span>
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
          <div className="card p-5">
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

          <div className="card p-5">
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

          <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
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
