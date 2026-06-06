import { useState, useEffect, useCallback } from 'react';
import { ChainSelector } from '../common/ChainSelector';
import type { ChainId } from '../../types';
import { useNotify } from '../../contexts/ToastContext';
import { getAuthToken } from '../../api/client';
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  runScheduledReport,
  listReportOutputs,
  downloadReportOutput,
  type ReportSchedule,
  type CreateReportScheduleParams,
  type ReportOutputMeta,
} from '../../api/client';

const TIME_PERIODS = [
  { label: 'Last 24 hours', value: '24h' as const, desc: 'Transactions from the past day' },
  { label: 'Last 7 days', value: '7d' as const, desc: 'Weekly activity summary' },
  { label: 'Last 30 days', value: '30d' as const, desc: 'Monthly activity summary' },
  { label: 'All time', value: 'all' as const, desc: 'Full transaction history' },
];

const FREQUENCIES = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function buildCron(frequency: string, hour: number, minute: number, weekDay: number, monthDay: number): string {
  if (frequency === 'daily') return `0 ${minute} ${hour} * * *`;
  if (frequency === 'weekly') return `0 ${minute} ${hour} * * ${weekDay}`;
  if (frequency === 'monthly') return `0 ${minute} ${hour} ${monthDay} * *`;
  return frequency; // preset
}

function humanCron(expr: string): string {
  const match = FREQUENCIES.find(p => p.value === expr);
  if (match) return match.label;
  // Parse back for display
  const parts = expr.split(' ');
  if (parts.length === 5) {
    const [min, hour, dom, , dow] = parts;
    if (dom !== '*' && dom !== '*/6' && dom !== '*/12') return `Monthly (${dom}, ${hour}:${min.padStart(2, '0')})`;
    if (dow !== '*' && dow !== '1-5') return `Weekly (${WEEKDAYS[parseInt(dow)]}, ${hour}:${min.padStart(2, '0')})`;
    return `Daily at ${hour}:${min.padStart(2, '0')}`;
  }
  return expr;
}

const FORMATS = [
  { label: 'PDF', value: 'pdf' as const, icon: 'pdf', desc: 'Formatted document' },
  { label: 'CSV', value: 'csv' as const, icon: 'csv', desc: 'Spreadsheet data' },
  { label: 'JSON', value: 'json' as const, icon: 'json', desc: 'Raw machine-readable' },
];

export function ScheduledReportsSection() {
  const token = getAuthToken();
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [addresses, setAddresses] = useState('');
  const [chain, setChain] = useState<ChainId>('ethereum');
  const [format, setFormat] = useState<'pdf' | 'csv' | 'json'>('pdf');
  const [frequency, setFrequency] = useState('daily');
  const [customHour, setCustomHour] = useState(9);
  const [customMinute, setCustomMinute] = useState(0);
  const [customWeekDay, setCustomWeekDay] = useState(1); // Monday
  const [customMonthDay, setCustomMonthDay] = useState(1);
  const [timePeriod, setTimePeriod] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'download'>('email');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const notify = useNotify();

  const loadSchedules = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      setError(null);
      const { schedules } = await getScheduledReports();
      setSchedules(schedules);
    } catch {
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const resetForm = () => {
    setName('');
    setAddresses('');
    setChain('ethereum');
    setFormat('pdf');
    setFrequency('daily');
    setCustomHour(9);
    setCustomMinute(0);
    setCustomWeekDay(1);
    setCustomMonthDay(1);
    setTimePeriod('7d');
    setDeliveryMethod('email');
    setEmailRecipient('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const addrList = addresses.split(/[\n,]+/).map(a => a.trim()).filter(Boolean);
    if (!name.trim()) { notify.error('Enter a report name'); return; }
    if (addrList.length === 0) { notify.error('Enter at least one address'); return; }
    if (deliveryMethod === 'email' && !emailRecipient.trim()) { notify.error('Enter an email recipient'); return; }
    if (!token) { notify.error('Sign in to create schedules'); return; }

    setSubmitting(true);
    try {
      const cronExpression = buildCron(frequency, customHour, customMinute, customWeekDay, customMonthDay);
      const data: CreateReportScheduleParams = {
        name: name.trim(),
        cronExpression,
        format,
        chain,
        addresses: addrList,
        timePeriod,
        deliveryMethod,
        emailRecipient: deliveryMethod === 'email' ? emailRecipient.trim() : undefined,
      };

      if (editingId) {
        await updateScheduledReport(editingId, data);
        notify.success('Schedule updated');
      } else {
        await createScheduledReport(data);
        notify.success('Report scheduled');
      }
      resetForm();
      loadSchedules();
    } catch (err: any) {
      notify.error(err?.message || 'Failed to save schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduledReport(id);
      notify.info('Schedule removed');
      loadSchedules();
    } catch { notify.error('Failed to remove'); }
  };

  const handleToggle = async (s: ReportSchedule) => {
    try {
      await updateScheduledReport(s.id, { enabled: !s.enabled });
      loadSchedules();
    } catch { notify.error('Failed to update'); }
  };

  const handleRunNow = async (id: string) => {
    try {
      await runScheduledReport(id);
      notify.success('Report generation started — check your email or downloads shortly');
      // Refresh to get updated lastOutputId
      setTimeout(() => loadSchedules(), 2000);
    } catch (err: any) {
      notify.error(err?.message || 'Failed to run report');
    }
  };

  const handleDownload = async (s: ReportSchedule) => {
    try {
      // If we have a recent output, download it directly
      if (s.lastOutputId && s.lastOutputFilename) {
        await downloadReportOutput(s.id, s.lastOutputId, s.lastOutputFilename);
        return;
      }
      // Otherwise fetch the latest output
      const { outputs } = await listReportOutputs(s.id);
      if (outputs.length === 0) {
        notify.info('No reports generated yet. Click "Run Now" to generate one.');
        return;
      }
      await downloadReportOutput(s.id, outputs[0].id, outputs[0].filename);
    } catch (err: any) {
      notify.error(err?.message || 'Failed to download report');
    }
  };

  const startEdit = (s: ReportSchedule) => {
    setName(s.name);
    setAddresses(s.addresses.join('\n'));
    setChain(s.chain as ChainId);
    setFormat(s.format);
    // Parse cron expression into simple fields
    const preset = FREQUENCIES.find(p => p.value === s.cronExpression);
    if (preset && preset.value !== 'daily' && preset.value !== 'weekly' && preset.value !== 'monthly') {
      setFrequency(preset.value);
    } else {
      const parts = s.cronExpression.split(' ');
      if (parts.length === 5) {
        const [min, hour, dom, , dow] = parts;
        setCustomMinute(parseInt(min));
        setCustomHour(parseInt(hour));
        if (dom !== '*') { setFrequency('monthly'); setCustomMonthDay(parseInt(dom)); }
        else if (dow !== '*') { setFrequency('weekly'); setCustomWeekDay(parseInt(dow)); }
        else { setFrequency('daily'); }
      }
    }
    setTimePeriod(s.timePeriod);
    setDeliveryMethod(s.deliveryMethod);
    setEmailRecipient(s.emailRecipient || '');
    setEditingId(s.id);
    setShowForm(true);
  };

  // ── Not signed in ──
  if (!token) {
    return (
      <div style={{ maxWidth: 660 }}>
        <h2 style={headingStyle}>Scheduled Reports</h2>
        <p style={mutedStyle}>Sign in to create automated reports delivered to your email.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ ...headingStyle, marginBottom: 0 }}>Scheduled Reports</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={createBtnStyle}>
            <PlusIcon /> New Schedule
          </button>
        )}
      </div>

      <p style={{ ...mutedStyle, marginBottom: 20 }}>
        Generate recurring analysis reports delivered to your email or available for download.
      </p>

      {/* ── Create / Edit form ── */}
      {showForm && (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>
            {editingId ? 'Edit Schedule' : 'New Schedule'}
          </div>

          {/* Name */}
          <input
            type="text" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Report name (e.g., Weekly ETH Monitor)"
            style={inputStyle}
          />

          {/* Addresses */}
          <textarea
            value={addresses}
            onChange={e => setAddresses(e.target.value)}
            placeholder="Wallet addresses (one per line or comma-separated)"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          {/* Row 1: Chain + Format dropdowns */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <ChainSelector value={chain} onChange={setChain} />

            {/* Format dropdown with icons */}
            <div style={{ position: 'relative' }}>
              <select value={format} onChange={e => setFormat(e.target.value as any)} style={selectStyle}>
                {FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>
                ))}
              </select>
            </div>

            {/* Time period dropdown */}
            <select value={timePeriod} onChange={e => setTimePeriod(e.target.value as any)} style={selectStyle}>
              {TIME_PERIODS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Row 2: Frequency + time/day pickers */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Frequency */}
            <select value={frequency} onChange={e => setFrequency(e.target.value)} style={selectStyle}>
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Time picker (for daily/weekly/monthly) */}
            {(frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--fg-tertiary)', whiteSpace: 'nowrap' }}>at</span>
                <select value={customHour} onChange={e => setCustomHour(Number(e.target.value))} style={{ ...selectStyle, width: 'auto', paddingRight: 20 }}>
                  {HOURS.map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span style={{ fontSize: 12, color: 'var(--fg-tertiary)' }}>:</span>
                <select value={customMinute} onChange={e => setCustomMinute(Number(e.target.value))} style={{ ...selectStyle, width: 'auto', paddingRight: 20 }}>
                  {MINUTES.map(m => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <span style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>UTC</span>
              </div>
            )}

            {/* Day of week (for weekly) */}
            {frequency === 'weekly' && (
              <select value={customWeekDay} onChange={e => setCustomWeekDay(Number(e.target.value))} style={selectStyle}>
                {WEEKDAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            )}

            {/* Day of month (for monthly) */}
            {frequency === 'monthly' && (
              <select value={customMonthDay} onChange={e => setCustomMonthDay(Number(e.target.value))} style={selectStyle}>
                {MONTH_DAYS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Row 3: Delivery method */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
              <button
                onClick={() => setDeliveryMethod('email')}
                style={{
                  ...toggleBtnStyle,
                  background: deliveryMethod === 'email' ? 'var(--accent)' : 'transparent',
                  color: deliveryMethod === 'email' ? '#fff' : 'var(--fg-tertiary)',
                }}>
                <MailIcon /> Email
              </button>
              <button
                onClick={() => setDeliveryMethod('download')}
                style={{
                  ...toggleBtnStyle,
                  background: deliveryMethod === 'download' ? 'var(--accent)' : 'transparent',
                  color: deliveryMethod === 'download' ? '#fff' : 'var(--fg-tertiary)',
                }}>
                <DownloadIcon /> Download
              </button>
            </div>
          </div>

          {/* Email recipient (conditional) */}
          {deliveryMethod === 'email' && (
            <input
              type="email" value={emailRecipient}
              onChange={e => setEmailRecipient(e.target.value)}
              placeholder="Email recipient (e.g., you@example.com)"
              style={{ ...inputStyle, height: 'auto' }}
            />
          )}

          {/* Time period description */}
          <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginBottom: 12, lineHeight: 1.5 }}>
            <strong>{FORMATS.find(f => f.value === format)?.label}</strong> report ·{' '}
            <strong>{humanCron(buildCron(frequency, customHour, customMinute, customWeekDay, customMonthDay))}</strong> (UTC) ·{' '}
            <strong>{TIME_PERIODS.find(t => t.value === timePeriod)?.label}</strong> ·{' '}
            {deliveryMethod === 'email' ? `Emailed to ${emailRecipient || '...'}` : 'Available for download'}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} disabled={submitting} style={submitBtnStyle}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Schedule'}
            </button>
            <button onClick={resetForm} style={cancelBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Loading / Error / Empty / List ── */}
      {loading ? (
        <div style={skeletonStyle}>
          {[1, 2].map(i => (
            <div key={i} style={{ ...cardStyle, height: 72, opacity: 0.4 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 13 }}>
          {error}
          <button onClick={loadSchedules} style={{ ...pillBtnStyle, marginLeft: 8 }}>Retry</button>
        </div>
      ) : schedules.length === 0 ? (
        <div style={emptyStyle}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }}>
            <ReportIcon />
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)', fontWeight: 600 }}>No scheduled reports</div>
          <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>
            Create one to get automated reports via email or download.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {schedules.map(s => (
            <div key={s.id} style={{
              ...cardStyle,
              opacity: s.enabled ? 1 : 0.55,
              transition: 'opacity 0.2s',
            }}>
              {/* Top row: name + actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{s.name}</span>
                    <span style={badgeStyle(s.format)}>{s.format.toUpperCase()}</span>
                    <span style={chainBadgeStyle}>{s.chain.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 2 }}>
                    {humanCron(s.cronExpression)} · {TIME_PERIODS.find(t => t.value === s.timePeriod)?.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>
                    {s.addresses.length} address{s.addresses.length > 1 ? 'es' : ''} ·{' '}
                    {s.deliveryMethod === 'email' ? `Email to ${s.emailRecipient}` : s.lastOutputFilename ? `Download: ${s.lastOutputFilename}` : 'Download'}
                    {!s.enabled && <span style={{ color: 'var(--destructive)', marginLeft: 6 }}>Paused</span>}
                    {s.lastError && <span style={{ color: 'var(--destructive)', marginLeft: 6 }} title={s.lastError}>Error</span>}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  {s.deliveryMethod === 'download' && (
                    <button onClick={() => handleDownload(s)} style={{ ...actionBtnStyle, color: 'var(--accent)' }} title="Download latest report">
                      <DownloadIcon />
                    </button>
                  )}
                  <button onClick={() => handleRunNow(s.id)} style={actionBtnStyle} title="Run now">
                    <PlayIcon />
                  </button>
                  <button onClick={() => startEdit(s)} style={actionBtnStyle} title="Edit">
                    <EditIcon />
                  </button>
                  <button onClick={() => handleToggle(s)} style={actionBtnStyle} title={s.enabled ? 'Pause' : 'Resume'}>
                    {s.enabled ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button onClick={() => handleDelete(s.id)} style={{ ...actionBtnStyle, color: 'var(--destructive)' }} title="Delete">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tiny SVG Icons ──

const svg = (d: string, size = 14) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const PlusIcon = () => svg('M12 5v14M5 12h14');
const PlayIcon = () => svg('M5 3l14 9-14 9V3z', 12);
const PauseIcon = () => svg('M6 4h4v16H6zM14 4h4v16h-4z', 12);
const EditIcon = () => svg('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', 12);
const TrashIcon = () => svg('M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 12);
const MailIcon = () => svg('M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6', 12);
const DownloadIcon = () => svg('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', 12);
const ReportIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── Styles ──

const headingStyle: React.CSSProperties = {
  fontSize: 18, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)',
};

const mutedStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--card)', borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--hairline)', padding: 16, marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--card-border)', background: 'var(--bg)',
  color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
  marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
  padding: '8px 32px 8px 10px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--card-border)', background: 'var(--bg)',
  color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 6px center', backgroundRepeat: 'no-repeat', backgroundSize: 18,
};

const pillBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
  background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)',
  cursor: 'pointer', whiteSpace: 'nowrap',
};

const toggleBtnStyle: React.CSSProperties = {
  padding: '6px 12px', border: 'none', fontSize: 11, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
  transition: 'background 0.15s, color 0.15s',
};

const createBtnStyle: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 'var(--radius-md)', border: 'none',
  background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600,
  fontFamily: 'var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 'var(--radius-md)', border: 'none',
  background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
  background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 12,
  fontFamily: 'var(--font-sans)', cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: 'none',
  background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const skeletonStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
};

const emptyStyle: React.CSSProperties = {
  padding: 40, textAlign: 'center', fontFamily: 'var(--font-sans)',
  background: 'var(--card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--hairline)',
};

const badgeStyle = (fmt: string): React.CSSProperties => ({
  padding: '1px 6px', borderRadius: 'var(--radius-sm)',
  fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)',
  background: fmt === 'pdf' ? 'rgba(239,68,68,0.12)' : fmt === 'csv' ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
  color: fmt === 'pdf' ? '#ef4444' : fmt === 'csv' ? '#22c55e' : '#3b82f6',
});

const chainBadgeStyle: React.CSSProperties = {
  padding: '1px 6px', borderRadius: 'var(--radius-sm)',
  fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)',
  background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
};
