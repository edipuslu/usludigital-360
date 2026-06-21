import { useState, useEffect } from 'react'
import { FileText, Download, Send, TrendingUp, MessageSquare, Star, ChevronRight, Calendar, BarChart3, CheckCircle2, Trash2, Zap, AlertCircle } from 'lucide-react'
import { EmptyState, StatusBadge, UsluLoader } from '../ui/UIKit'
import clsx from 'clsx'
import html2pdf from 'html2pdf.js'

const MONTHLY_REPORT_LIMIT = 3

const getCurrentMonth = () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const thunderLogoSvg = `
  <div style="width: 44px; height: 44px; border-radius: 12px; background: #030918; display: flex; align-items: center; justify-content: center;">
    <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M37 7 17 35h14l-4 22 20-29H34l3-21Z" fill="white"></path>
    </svg>
  </div>
`

function ReportCard({ report, isAdmin, company, onNotify, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailForm, setEmailForm] = useState({
    fromEmail: company.settings?.notificationEmail || '',
    toEmail: company.clientEmail || ''
  })

  const handleSendClick = () => {
    setShowEmailDialog(true)
  }

  const handleConfirmSend = async () => {
    if (!emailForm.toEmail || !emailForm.toEmail.includes('@')) {
      onNotify?.('Please enter a valid recipient email address.', 'error')
      return
    }
    if (!emailForm.fromEmail || !emailForm.fromEmail.includes('@')) {
      onNotify?.('Please enter a valid sender email address.', 'error')
      return
    }

    setSending(true)
    try {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'
      const response = await fetch(`${backendUrl}/api/companies/${company.id}/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: emailForm.fromEmail,
          toEmail: emailForm.toEmail,
          month: report.month,
          totalReplies: report.totalReplies,
          waClicks: report.waClicks,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setSending(false)
      setSent(true)
      setShowEmailDialog(false)
      onNotify?.(`Report sent to ${emailForm.toEmail}`, 'success')
      setTimeout(() => setSent(false), 3000)
    } catch (error) {
      setSending(false)
      onNotify?.(error.message, 'error')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await new Promise(r => setTimeout(r, 400))
    onDelete?.(report.id)
    onNotify?.('Report deleted.', 'success')
  }

  const handleDownload = () => {
    const element = document.createElement('div')
    element.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 48px; color: #0f172a; background: #ffffff; line-height: 1.55;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 42px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${thunderLogoSvg}
            <div>
              <div style="font-size: 23px; font-weight: 800; letter-spacing: -0.8px;">Uslu360Digital</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">Monthly Performance Report</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div><strong>${company.name}</strong></div>
            <div>Generated ${report.generated}</div>
            <div>Report ${report.sequence ? `#${report.sequence}` : report.id.substring(0, 8)}</div>
          </div>
        </div>

        <div style="background: #030918; border-radius: 18px; padding: 34px; color: white; margin-bottom: 34px;">
          <div style="color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Executive snapshot</div>
          <h1 style="font-size: 42px; line-height: 1.05; font-weight: 850; letter-spacing: -1.8px; margin: 0 0 14px;">${report.month}</h1>
          <p style="max-width: 620px; color: #cbd5e1; font-size: 14px; margin: 0;">${report.summary}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px;">
          <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">AI Replies Sent</div>
            <div style="font-size: 42px; font-weight: 850; color: #255ff4;">${report.totalReplies.toLocaleString()}</div>
            <div style="font-size: 12px; color: #64748b;">Comments and messages handled by AI</div>
          </div>
          <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">WhatsApp Clicks</div>
            <div style="font-size: 42px; font-weight: 850; color: #25D366;">${report.waClicks.toLocaleString()}</div>
            <div style="font-size: 12px; color: #64748b;">Direct customer intent actions</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 34px;">
          <div style="background: #edf2ff; border-radius: 16px; padding: 20px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 750;">Response Rate</div>
            <div style="font-size: 30px; font-weight: 850; color: #0f172a;">98.2%</div>
          </div>
          <div style="background: #fff7ed; border-radius: 16px; padding: 20px;">
            <div style="font-size: 12px; color: #64748b; font-weight: 750;">Avg Response Time</div>
            <div style="font-size: 30px; font-weight: 850; color: #0f172a;">1m 23s</div>
          </div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; margin-bottom: 34px;">
          <div style="font-size: 15px; font-weight: 850; margin-bottom: 12px;">Best Performing Content</div>
          <div style="font-size: 14px; color: #255ff4; font-weight: 750; margin-bottom: 12px;">${report.bestPost}</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span style="border-radius: 999px; background: #edf2ff; color: #1d49c5; padding: 7px 11px; font-size: 11px; font-weight: 750;">Comments reviewed</span>
            <span style="border-radius: 999px; background: #fff0f7; color: #c91563; padding: 7px 11px; font-size: 11px; font-weight: 750;">AI replies tracked</span>
            <span style="border-radius: 999px; background: #fff7ed; color: #c66713; padding: 7px 11px; font-size: 11px; font-weight: 750;">Lead actions measured</span>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
          <div>Uslu360Digital | Confidential client report</div>
          <div>${report.id}</div>
        </div>
      </div>
    `

    const opt = {
      margin: 0,
      filename: `usludigital-report-${report.month.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    }

    html2pdf().set(opt).from(element).save()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-950 rounded-xl flex items-center justify-center flex-shrink-0 text-white">
            <Zap size={20} fill="white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold text-sm">{report.month} Report</span>
              {report.sequence && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">#{report.sequence}</span>}
              <StatusBadge status={report.status === 'ready' ? 'active' : 'training'} />
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Calendar size={11} /> Generated {report.generated}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 mr-2">
            <div className="text-center">
              <div className="text-slate-900 font-bold text-base">{report.totalReplies.toLocaleString()}</div>
              <div className="text-slate-400 text-xs">AI Replies</div>
            </div>
            <div className="text-center">
              <div className="text-slate-900 font-bold text-base">{report.waClicks.toLocaleString()}</div>
              <div className="text-slate-400 text-xs">WA Clicks</div>
            </div>
          </div>
          <ChevronRight size={16} className={clsx('text-slate-400 transition-transform', expanded && 'rotate-90')} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-5 animate-fade-in">
          {/* Report Summary */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-slate-400" />
              <span className="text-slate-700 font-bold text-sm">Monthly Summary</span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">{report.summary}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'AI Replies Sent', value: report.totalReplies.toLocaleString(), icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'WA Clicks', value: report.waClicks.toLocaleString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Response Rate', value: '98.2%', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Avg Reply Time', value: '1m 23s', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(m => (
              <div key={m.label} className={clsx('rounded-xl p-3 flex items-center gap-2.5', m.bg)}>
                <m.icon size={14} className={m.color} />
                <div>
                  <div className={clsx('font-bold text-sm', m.color)}>{m.value}</div>
                  <div className="text-slate-500 text-xs">{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Best Post */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star size={14} className="text-amber-600" fill="#f49725" />
              </div>
              <div className="flex-1">
                <div className="text-slate-900 font-bold text-sm mb-1">Best Performing Post</div>
                <div className="text-blue-600 text-sm font-medium mb-2">{report.bestPost}</div>
                <div className="flex flex-wrap gap-2">
                  {['Comments received', 'AI replies sent', 'WA clicks'].map((label, i) => (
                    <span key={label} className="bg-white border border-blue-100 rounded-full px-2.5 py-1 text-xs text-slate-600 font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={handleDownload} className="btn-primary">
              <Download size={14} /> Download PDF
            </button>
            {isAdmin && (
              <button onClick={handleSendClick} disabled={sending || sent} className={clsx('btn-secondary', sent && 'text-emerald-600 border-emerald-200 bg-emerald-50')}>
                {sending ? (
                  <><UsluLoader size="xs" />Sending...</>
                ) : sent ? (
                  <><CheckCircle2 size={14} className="text-emerald-600" />Sent</>
                ) : (
                  <><Send size={14} />Send Email</>
                )}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-red-500 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            )}
            <span className="text-slate-400 text-xs ml-auto">Report ID: {report.id}</span>
          </div>
        </div>
      )}

      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div>
              <h3 className="text-slate-900 font-bold text-lg">Send Report by Email</h3>
              <p className="text-slate-500 text-sm mt-1">Enter sender and recipient email addresses</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">From Email</label>
              <input
                type="email"
                value={emailForm.fromEmail}
                onChange={e => setEmailForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                placeholder="admin@usludigital.com"
                className="input-field w-full"
              />
              <p className="text-xs text-slate-400 mt-1">Your email address</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">To Email</label>
              <input
                type="email"
                value={emailForm.toEmail}
                onChange={e => setEmailForm(prev => ({ ...prev, toEmail: e.target.value }))}
                placeholder="client@business.com"
                className="input-field w-full"
              />
              <p className="text-xs text-slate-400 mt-1">Client or recipient email</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900"><strong>Preview:</strong> {report.month} report will be sent from <strong>{emailForm.fromEmail}</strong> to <strong>{emailForm.toEmail}</strong></p>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setShowEmailDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={sending}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><UsluLoader size="xs" />Sending...</>
                ) : (
                  <><Send size={14} />Send Report</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportSchedule({ currentMonth, used, remaining }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-white">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-slate-950">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-extrabold text-lg mb-1">Professional Monthly Report</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
              Create up to 3 reports per month for start, middle, and end-of-month reviews. Each report can be downloaded as a polished PDF or sent by email.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-white/5 p-2 text-center">
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <div className="text-2xl font-extrabold">{MONTHLY_REPORT_LIMIT}</div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Monthly limit</div>
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <div className="text-2xl font-extrabold">{used}</div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Used</div>
          </div>
          <div className="rounded-lg bg-white/5 px-4 py-3">
            <div className="text-2xl font-extrabold text-amber-300">{remaining}</div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Left</div>
          </div>
          <div className="col-span-3 rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300">
            {currentMonth}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportsTab({ company, isAdmin = true, onUpdate, onNotify }) {
  const [generating, setGenerating] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const reports = company.reports || []
  const currentMonth = getCurrentMonth()
  const currentMonthReports = reports.filter(r => r.month === currentMonth)
  const reportsUsed = currentMonthReports.length
  const reportsRemaining = Math.max(0, MONTHLY_REPORT_LIMIT - reportsUsed)
  const monthlyLimitReached = reportsRemaining === 0

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const generateReport = async () => {
    const now = new Date()

    if (currentMonthReports.length >= MONTHLY_REPORT_LIMIT) {
      onNotify?.(`Monthly report already created ${MONTHLY_REPORT_LIMIT} times for ${currentMonth}.`, 'warning')
      return
    }

    setGenerating(true)
    await new Promise(r => setTimeout(r, 600))

    const report = {
      id: `report-${Date.now()}`,
      month: currentMonth,
      sequence: currentMonthReports.length + 1,
      status: 'ready',
      generated: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      totalReplies: company.metrics.thisMonth.totalReplies,
      waClicks: company.metrics.thisMonth.waClicks,
      summary: 'Report generated from the current workspace metrics. Connect platforms and enable automation to populate performance details.',
      bestPost: 'No post selected yet',
    }
    onUpdate?.(current => ({ ...current, reports: [report, ...(current.reports || [])] }))
    onNotify?.(`Monthly report ${report.sequence} of ${MONTHLY_REPORT_LIMIT} generated.`, 'success')

    setGenerating(false)
    setCooldown(10)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Zap size={22} fill="white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Reports</h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              Clean monthly summaries with performance, AI activity, lead actions, best content, and next steps.
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={generateReport}
            disabled={generating || cooldown > 0 || monthlyLimitReached}
            className={clsx('btn-primary h-11 justify-center', (generating || cooldown > 0 || monthlyLimitReached) && 'opacity-50 cursor-not-allowed')}
          >
            {generating ? <UsluLoader size="xs" /> : monthlyLimitReached ? <AlertCircle size={14} /> : <FileText size={14} />}
            {generating ? 'Generating...' : monthlyLimitReached ? 'Monthly report already created' : cooldown > 0 ? `Wait ${cooldown}s` : 'Generate Report'}
          </button>
        )}
      </div>

      <ReportSchedule currentMonth={currentMonth} used={reportsUsed} remaining={reportsRemaining} />

      {monthlyLimitReached && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Monthly report already created {MONTHLY_REPORT_LIMIT} times for {currentMonth}. Delete one report if you need to create another version.
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate the first report when you are ready to share progress with the client."
        />
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              isAdmin={isAdmin}
              company={company}
              onNotify={onNotify}
              onDelete={(reportId) => {
                onUpdate?.(current => ({
                  ...current,
                  reports: (current.reports || []).filter(r => r.id !== reportId)
                }))
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
