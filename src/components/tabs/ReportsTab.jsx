import { useState, useEffect } from 'react'
import { FileText, Download, Send, TrendingUp, MessageSquare, Star, ChevronRight, Calendar, BarChart3, CheckCircle2, Trash2 } from 'lucide-react'
import { SectionHeader, EmptyState, StatusBadge, UsluLoader } from '../ui/UIKit'
import clsx from 'clsx'
import html2pdf from 'html2pdf.js'

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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; padding: 60px 50px; color: #0f172a; background: white; line-height: 1.6;">

        <!-- Logo & Company Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; border-bottom: 1px solid #e2e8f0; padding-bottom: 40px;">
          <div>
            <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.8px; color: #0f172a; margin-bottom: 4px;">USLUDIGITAL</div>
            <div style="font-size: 12px; color: #64748b; font-weight: 500;">Social Media Analytics Platform</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div style="margin-bottom: 6px;"><strong>Report Date:</strong> ${report.generated}</div>
            <div><strong>ID:</strong> ${report.id.substring(0, 12)}</div>
          </div>
        </div>

        <!-- Title Section -->
        <div style="margin-bottom: 50px;">
          <div style="font-size: 11px; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px;">Monthly Performance Report</div>
          <h1 style="font-size: 42px; font-weight: 700; margin: 0; color: #0f172a; letter-spacing: -1px;">${report.month}</h1>
        </div>

        <!-- KPI Grid - Clean & Corporate -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 60px;">
          <!-- KPI 1 -->
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 12px;">AI Replies Sent</div>
            <div style="font-size: 48px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${report.totalReplies.toLocaleString()}</div>
            <div style="font-size: 12px; color: #94a3b8;">Automated responses generated</div>
          </div>
          <!-- KPI 2 -->
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 12px;">WhatsApp Clicks</div>
            <div style="font-size: 48px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${report.waClicks.toLocaleString()}</div>
            <div style="font-size: 12px; color: #94a3b8;">Direct message initiations</div>
          </div>
        </div>

        <!-- Secondary Metrics -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 60px;">
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 12px;">Response Rate</div>
            <div style="font-size: 38px; font-weight: 700; color: #0f172a;">98.2%</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 12px;">Avg Response Time</div>
            <div style="font-size: 38px; font-weight: 700; color: #0f172a;">1m 23s</div>
          </div>
        </div>

        <!-- Divider -->
        <div style="height: 1px; background: #e2e8f0; margin: 60px 0;"></div>

        <!-- Executive Summary -->
        <div style="margin-bottom: 60px;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 16px; letter-spacing: -0.3px;">Summary</div>
          <p style="font-size: 13px; color: #475569; line-height: 1.7; margin: 0;">${report.summary}</p>
        </div>

        <!-- Divider -->
        <div style="height: 1px; background: #e2e8f0; margin: 60px 0;"></div>

        <!-- Footer -->
        <div style="font-size: 11px; color: #94a3b8; text-align: center; padding-top: 30px; border-top: 1px solid #e2e8f0;">
          <div style="margin-bottom: 8px;">Usludigital 360 | Professional Social Media Automation Platform</div>
          <div>© 2026 All Rights Reserved. This report is confidential and for authorized recipients only.</div>
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
    <div className="card overflow-hidden">
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold text-sm">{report.month} Report</span>
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
                <Star size={14} className="text-amber-600" fill="#FCD34D" />
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

function ReportSchedule() {
  return (
    <div className="card p-5 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Calendar size={18} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-base mb-1">Auto-Generated Monthly Reports</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Reports are automatically generated on the 1st of each month. Workspace users are notified in the dashboard and reports can be sent by email at any time.
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-slate-400 text-xs">Next report</div>
          <div className="text-white font-bold">Aug 1, 2026</div>
        </div>
      </div>
    </div>
  )
}

export default function ReportsTab({ company, isAdmin = true, onUpdate, onNotify }) {
  const [generating, setGenerating] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const generateReport = async () => {
    const now = new Date()
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Check if report already exists for this month
    const existingReport = company.reports?.find(r => r.month === currentMonth)
    if (existingReport) {
      onNotify?.(`Report for ${currentMonth} already exists. Delete it first to generate a new one.`, 'warning')
      setCooldown(5)
      return
    }

    setGenerating(true)
    await new Promise(r => setTimeout(r, 600))

    const report = {
      id: `report-${Date.now()}`,
      month: currentMonth,
      status: 'ready',
      generated: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      totalReplies: company.metrics.thisMonth.totalReplies,
      waClicks: company.metrics.thisMonth.waClicks,
      summary: 'Report generated from the current workspace metrics. Connect platforms and enable automation to populate performance details.',
      bestPost: 'No post selected yet',
    }
    onUpdate?.(current => ({ ...current, reports: [report, ...(current.reports || [])] }))
    onNotify?.('Monthly report generated.', 'success')

    setGenerating(false)
    setCooldown(10)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <SectionHeader
        title="Monthly Reports"
        description="Auto-generated performance reports for each calendar month"
        action={
          isAdmin && (
            <button
              onClick={generateReport}
              disabled={generating || cooldown > 0}
              className={clsx('btn-primary', (generating || cooldown > 0) && 'opacity-50 cursor-not-allowed')}
            >
              <FileText size={14} />
              {generating ? 'Generating...' : cooldown > 0 ? `Wait ${cooldown}s` : 'Generate Report'}
            </button>
          )
        }
      />

      <ReportSchedule />

      {company.reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Reports are generated automatically at the end of each month."
        />
      ) : (
        <div className="space-y-4">
          {company.reports.map(report => (
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
