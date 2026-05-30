/**
 * Scheduled Report Service
 * Uses node-cron to execute scheduled report generation jobs.
 * Stores schedules in Firestore, sends reports via Resend email.
 */

import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import { getFirestore } from '../firebase.js';
import { sendEmail, buildScheduledReportEmail } from './EmailService.js';

const REPORT_FROM = 'FundTracer Reports <alert@fundtracer.xyz>';
const REFRESH_INTERVAL = 60_000; // 60s — check for new/updated schedules
const MAX_OUTPUT_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface ReportSchedule {
  id: string;
  userId: string;
  name: string;
  cronExpression: string;
  format: 'pdf' | 'csv' | 'json';
  chain: string;
  addresses: string[];
  timePeriod: '24h' | '7d' | '30d' | 'all';
  deliveryMethod: 'email' | 'download';
  emailRecipient: string | null;
  lastRunAt: number | null;
  nextRunAt: number | null;
  lastError: string | null;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

interface ReportOutput {
  id: string;
  scheduleId: string;
  userId: string;
  format: string;
  filename: string;
  content: string; // base64
  contentType: string;
  createdAt: number;
  expiresAt: number;
}

class ScheduledReportService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;
  private running = false;

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log('[ScheduledReports] Starting service...');

    await this.loadSchedules();

    // Periodic refresh for new/updated/deleted schedules
    this.refreshTimer = setInterval(() => {
      this.loadSchedules().catch(err => console.error('[ScheduledReports] Refresh error:', err));
    }, REFRESH_INTERVAL);
  }

  stop(): void {
    this.running = false;
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    for (const [id, job] of this.jobs) { job.stop(); }
    this.jobs.clear();
    console.log('[ScheduledReports] Service stopped');
  }

  private async loadSchedules(): Promise<void> {
    try {
      const db = getFirestore();
      const snap = await db.collection('scheduled_reports')
        .where('enabled', '==', true)
        .get();

      const activeIds = new Set<string>();
      const seen = new Set<string>();

      snap.forEach(doc => {
        const data = doc.data() as ReportSchedule;
        data.id = doc.id;
        activeIds.add(doc.id);

        if (seen.has(doc.id)) return;
        seen.add(doc.id);

        const existing = this.jobs.get(doc.id);
        if (existing) {
          // Only restart if the cron expression changed
          const oldExpr = (existing as any).__cronExpr;
          if (oldExpr === data.cronExpression) return;
          existing.stop();
          this.jobs.delete(doc.id);
        }

        if (!cron.validate(data.cronExpression)) {
          console.error(`[ScheduledReports] Invalid cron expression for ${doc.id}: ${data.cronExpression}`);
          return;
        }

        const job = cron.schedule(data.cronExpression, () => {
          this.executeSchedule(data).catch(err =>
            console.error(`[ScheduledReports] Execution error for ${doc.id}:`, err)
          );
        });

        (job as any).__cronExpr = data.cronExpression;
        this.jobs.set(doc.id, job);
        console.log(`[ScheduledReports] Scheduled: ${data.name} (${data.cronExpression})`);
      });

      // Remove jobs for deleted/disabled schedules
      for (const id of this.jobs.keys()) {
        if (!activeIds.has(id)) {
          this.jobs.get(id)?.stop();
          this.jobs.delete(id);
          console.log(`[ScheduledReports] Removed: ${id}`);
        }
      }
    } catch (error) {
      console.error('[ScheduledReports] Load error:', error);
    }
  }

  private async executeSchedule(schedule: ReportSchedule): Promise<void> {
    const startTime = Date.now();
    console.log(`[ScheduledReports] Executing: ${schedule.name} (${schedule.id})`);

    try {
      const db = getFirestore();

      // Generate report
      const reportData = await this.generateReportData(schedule);
      const { content, filename, contentType } = this.formatReport(schedule, reportData);

      let outputId: string | null = null;

      if (schedule.deliveryMethod === 'email' && schedule.emailRecipient) {
        // Send via email with attachment
        const base64Content = Buffer.isBuffer(content)
          ? (content as Buffer).toString('base64')
          : Buffer.from(content as string).toString('base64');

        const emailTemplate = buildScheduledReportEmail(
          schedule.name,
          schedule.chain,
          schedule.addresses.length,
          schedule.format
        );

        await sendEmail({
          to: schedule.emailRecipient,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          from: REPORT_FROM,
          attachments: [{
            filename,
            content: base64Content,
            contentType,
          }],
        });
        console.log(`[ScheduledReports] Emailed report to: ${schedule.emailRecipient}`);
      } else {
        // Store for download
        outputId = `out_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const base64Content = Buffer.isBuffer(content)
          ? (content as Buffer).toString('base64')
          : Buffer.from(content as string).toString('base64');

        const output: ReportOutput = {
          id: outputId,
          scheduleId: schedule.id,
          userId: schedule.userId,
          format: schedule.format,
          filename,
          content: base64Content,
          contentType,
          createdAt: Date.now(),
          expiresAt: Date.now() + MAX_OUTPUT_AGE,
        };

        await db.collection('report_outputs').doc(outputId).set(output);
        console.log(`[ScheduledReports] Stored output: ${outputId}`);
      }

      // Update schedule doc
      await db.collection('scheduled_reports').doc(schedule.id).update({
        lastRunAt: startTime,
        lastError: null,
        updatedAt: Date.now(),
      });
    } catch (error: any) {
      console.error(`[ScheduledReports] Failed: ${schedule.name}`, error);
      await db.collection('scheduled_reports').doc(schedule.id).update({
        lastError: error?.message || 'Unknown error',
        updatedAt: Date.now(),
      }).catch(() => {});
    }
  }

  private async generateReportData(schedule: ReportSchedule): Promise<any> {
    // For now, generate a structured summary based on the schedule config.
    // Future: call internal analysis pipeline for each address.
    const db = getFirestore();

    // Fetch basic user data
    const userDoc = await db.collection('users').doc(schedule.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Build report metadata
    const report = {
      reportName: schedule.name,
      generatedAt: new Date().toISOString(),
      chain: schedule.chain,
      timePeriod: schedule.timePeriod,
      format: schedule.format,
      addresses: schedule.addresses,
      summary: {
        totalAddresses: schedule.addresses.length,
        userEmail: userData?.email || schedule.emailRecipient || '',
        nextScheduledRun: this.getNextRunDescription(schedule.cronExpression),
      },
      // Per-address sections (basic for now)
      wallets: schedule.addresses.map((addr: string) => ({
        address: addr,
        chain: schedule.chain,
        note: 'Scheduled report entry — connect analysis pipeline for full data',
      })),
    };

    return report;
  }

  private formatReport(schedule: ReportSchedule, data: any): { content: string | Buffer; filename: string; contentType: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    switch (schedule.format) {
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          filename: `fundtracer-${schedule.name.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.json`,
          contentType: 'application/json',
        };

      case 'csv':
        return {
          content: this.generateCSV(data),
          filename: `fundtracer-${schedule.name.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.csv`,
          contentType: 'text/csv',
        };

      case 'pdf':
        return {
          content: this.generatePDF(schedule, data),
          filename: `fundtracer-${schedule.name.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.pdf`,
          contentType: 'application/pdf',
        };

      default:
        throw new Error(`Unsupported format: ${schedule.format}`);
    }
  }

  private generateCSV(data: any): string {
    const headers = ['Address', 'Chain', 'Note'];
    const rows = data.wallets.map((w: any) => [w.address, w.chain, w.note]);
    return [headers.join(','), ...rows.map((r: string[]) => r.map(c => `"${c}"`).join(','))].join('\n');
  }

  private generatePDF(schedule: ReportSchedule, data: any): Buffer {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(data.reportName, { align: 'left' });
    doc.fontSize(10).font('Helvetica').fillColor('#64748b')
      .text(`Generated: ${data.generatedAt}`, { paragraphGap: 4 })
      .text(`Chain: ${data.chain.toUpperCase()}  ·  Period: ${data.timePeriod}  ·  Addresses: ${data.summary.totalAddresses}`)
      .moveDown(1);

    // Divider
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

    // Address table
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('Wallets');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b');
    doc.text('Address', 50, tableTop);
    doc.text('Chain', 320, tableTop);
    doc.text('Status', 420, tableTop);
    doc.moveDown(0.5);

    // Rows
    doc.font('Helvetica').fillColor('#1e293b');
    for (const wallet of data.wallets) {
      const y = doc.y;
      doc.fontSize(8).text(wallet.address.slice(0, 42), 50, y, { width: 260 });
      doc.text(wallet.chain.toUpperCase(), 320, y);
      doc.text('Monitored', 420, y);
      doc.moveDown(0.8);
    }

    doc.moveDown(1);

    // Footer
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
      .text('Generated by FundTracer · fundtracer.xyz', { align: 'center' });

    doc.end();

    return Buffer.concat(chunks);
  }

  private getNextRunDescription(cronExpr: string): string {
    // Simple mapping for common presets
    const map: Record<string, string> = {
      '0 * * * *': 'Every hour',
      '0 */6 * * *': 'Every 6 hours',
      '0 9 * * *': 'Daily at 9 AM',
      '0 9 * * 1': 'Weekly Monday 9 AM',
      '0 9 * * 1-5': 'Weekdays at 9 AM',
      '0 9 1 * *': 'Monthly 1st 9 AM',
    };
    return map[cronExpr] || cronExpr;
  }

  /** Manually trigger a schedule run (used by API) */
  async runNow(scheduleId: string): Promise<boolean> {
    try {
      const db = getFirestore();
      const doc = await db.collection('scheduled_reports').doc(scheduleId).get();
      if (!doc.exists) return false;

      const schedule = doc.data() as ReportSchedule;
      schedule.id = doc.id;

      // Run in background — don't await
      this.executeSchedule(schedule).catch(err =>
        console.error(`[ScheduledReports] Manual run error for ${scheduleId}:`, err)
      );

      return true;
    } catch (error) {
      console.error('[ScheduledReports] RunNow error:', error);
      return false;
    }
  }
}

export const scheduledReportService = new ScheduledReportService();
