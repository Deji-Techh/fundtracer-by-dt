/**
 * Scheduled Report Service
 * Uses node-cron to execute scheduled report generation jobs.
 * Stores schedules in Firestore, sends reports via Resend email.
 */

import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import { getFirestore } from '../firebase.js';
import { sendEmail, buildScheduledReportEmail } from './EmailService.js';
import { WalletAnalyzer, ChainId } from '@fundtracer/core';
import { getAlchemyKeyPool } from '../utils/quicknode.js';

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
    const db = getFirestore();
    console.log(`[ScheduledReports] Executing: ${schedule.name} (${schedule.id})`);

    try {
      // Generate report
      const reportData = await this.generateReportData(schedule);
      const { content, filename, contentType } = await this.formatReport(schedule, reportData);

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

        console.log(`[ScheduledReports] Sending email: ${filename} (${base64Content.length} bytes base64)`);

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
        const outputId = `out_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
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

        // Save lastOutputId on the schedule doc so the client can find it
        await db.collection('scheduled_reports').doc(schedule.id).update({
          lastOutputId: outputId,
          lastOutputFilename: filename,
        });
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
    const alchemyKeyPool = getAlchemyKeyPool();
    const defaultKey = process.env.ALCHEMY_API_KEY || alchemyKeyPool[0];

    const analyzer = new WalletAnalyzer({
      alchemy: defaultKey || '',
      moralis: process.env.MORALIS_API_KEY,
      etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
      optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_OPTIMISM_API_KEY,
      polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY,
    });

    const chainId = schedule.chain as ChainId;

    // Compute timeRange filter from timePeriod setting
    const now = Math.floor(Date.now() / 1000);
    const periodSeconds: Record<string, number> = {
      '24h': 86400,
      '7d': 604800,
      '30d': 2592000,
    };
    const timeRange = schedule.timePeriod !== 'all'
      ? { start: now - (periodSeconds[schedule.timePeriod] || 0), end: now }
      : undefined;

    console.log(`[ScheduledReports] Analyzing ${schedule.addresses.length} wallet(s) on ${schedule.chain} (period: ${schedule.timePeriod})...`);

    const walletResults = await Promise.all(
      schedule.addresses.map(async (addr) => {
        try {
          const result = await analyzer.analyze(addr, chainId, {
            transactionLimit: 100,
            skipFundingTree: true,
            filters: timeRange ? { timeRange } : undefined,
          });
          return { address: addr, success: true, data: result };
        } catch (err: any) {
          console.error(`[ScheduledReports] Analysis failed for ${addr}:`, err?.message);
          return { address: addr, success: false, error: err?.message || 'Analysis failed' };
        }
      })
    );

    const successful = walletResults.filter(r => r.success);
    const failed = walletResults.filter(r => !r.success);

    // Aggregate portfolio totals from successful analyses
    let totalTxCount = 0;
    let highRiskCount = 0;
    let totalValueEth = 0;
    let totalUniqueAddresses = 0;
    const allIndicators: string[] = [];
    const allProjects = new Set<string>();

    for (const r of successful) {
      const d = (r as any).data;
      totalTxCount += d.summary?.totalTransactions || 0;
      totalValueEth += d.summary?.totalValueSentEth || 0;
      totalUniqueAddresses += d.summary?.uniqueInteractedAddresses || 0;
      if (d.overallRiskScore >= 60) highRiskCount++;
      if (d.suspiciousIndicators) {
        for (const ind of d.suspiciousIndicators) {
          if (ind?.type && allIndicators.length < 50) allIndicators.push(ind.type);
        }
      }
      if (d.projectsInteracted) {
        for (const p of d.projectsInteracted) {
          if (p?.projectName && allProjects.size < 100) allProjects.add(p.projectName);
        }
      }
    }

    return {
      reportName: schedule.name,
      generatedAt: new Date().toISOString(),
      chain: schedule.chain,
      timePeriod: schedule.timePeriod,
      format: schedule.format,
      summary: {
        totalAddresses: schedule.addresses.length,
        analyzed: successful.length,
        failed: failed.length,
        totalTransactions: totalTxCount,
        totalValueEth: Math.round(totalValueEth * 100) / 100,
        totalUniqueAddresses,
        highRiskWallets: highRiskCount,
        projectsInteracted: allProjects.size,
        topIndicators: [...new Set(allIndicators)].slice(0, 10),
        topProjects: [...allProjects].slice(0, 10),
        nextSchedule: this.getNextRunDescription(schedule.cronExpression),
      },
      wallets: walletResults,
    };
  }

  private async formatReport(schedule: ReportSchedule, data: any): Promise<{ content: string | Buffer; filename: string; contentType: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const base = `fundtracer-${schedule.name.replace(/\s+/g, '-').toLowerCase()}-${timestamp}`;

    switch (schedule.format) {
      case 'json':
        return {
          content: JSON.stringify(data, null, 2),
          filename: `${base}.json`,
          contentType: 'application/json',
        };

      case 'csv':
        return {
          content: this.generateCSV(data),
          filename: `${base}.csv`,
          contentType: 'text/csv',
        };

      case 'pdf':
        return {
          content: await this.generatePDF(schedule, data),
          filename: `${base}.pdf`,
          contentType: 'application/pdf',
        };

      default:
        throw new Error(`Unsupported format: ${schedule.format}`);
    }
  }

  private generateCSV(data: any): string {
    const rows: string[] = [];
    rows.push(['Address', 'Status', 'Balance (ETH)', 'Tx Count', 'Risk Score', 'Risk Level', 'Indicators'].join(','));

    for (const w of data.wallets) {
      if (!w.success) {
        rows.push([`"${w.address}"`, '"FAILED"', 'N/A', 'N/A', 'N/A', 'N/A', `"${w.error || 'Unknown'}"`].join(','));
        continue;
      }
      const d = w.data;
      const balance = d.wallet?.balance ? (Number(d.wallet.balance) / 1e18).toFixed(4) : '0';
      const txCount = d.transactions?.length || 0;
      const risk = d.overallRiskScore ?? 'N/A';
      const riskLevel = d.riskLevel || 'N/A';
      const indicators = (d.suspiciousIndicators || []).map((i: any) => i.type).join('; ');
      rows.push([`"${w.address}"`, 'OK', balance, String(txCount), String(risk), riskLevel, `"${indicators}"`].join(','));
    }

    return rows.join('\n');
  }

  private generatePDF(schedule: ReportSchedule, data: any): Promise<Buffer> {
    // Shared layout constants
    const MARGIN = 45;
    const PAGE_W = 595;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const BLUE = '#2563eb';
    const BLUE_DARK = '#1e40af';
    const BLUE_LIGHT = '#dbeafe';
    const GRAY_100 = '#f1f5f9';
    const GRAY_200 = '#e2e8f0';
    const GRAY_400 = '#94a3b8';
    const GRAY_600 = '#475569';
    const GRAY_800 = '#1e293b';
    const RED = '#ef4444';
    const GREEN = '#10b981';
    const AMBER = '#f59e0b';

    const s = data.summary;
    const timeLabel = { '24h': '24 Hours', '7d': '7 Days', '30d': '30 Days', 'all': 'All Time' }[data.timePeriod] || data.timePeriod;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      let page = 0;

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- Page footer ----
      const addFooter = () => {
        const py = doc.page.height - 35;
        doc.strokeColor(GRAY_200).lineWidth(0.5).moveTo(MARGIN, py).lineTo(PAGE_W - MARGIN, py).stroke();
        doc.fontSize(7).font('Helvetica').fillColor(GRAY_400)
          .text('Generated by FundTracer', MARGIN, py + 6, { width: CONTENT_W / 2, align: 'left' })
          .text(`Page ${++page}`, MARGIN + CONTENT_W / 2, py + 6, { width: CONTENT_W / 2, align: 'right' });
      };

      // Because we set margin: 0, we position manually
      let y = 0;

      // ---- HEADER BAR ----
      doc.rect(0, 0, PAGE_W, 72).fill(BLUE_DARK);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#93c5fd')
        .text('FUNDTRACER', MARGIN, 22, { width: CONTENT_W / 2, align: 'left' });
      doc.fontSize(8).font('Helvetica').fillColor('#bfdbfe')
        .text('Blockchain Intelligence Report', MARGIN, 38, { width: CONTENT_W / 2, align: 'left' });

      // Report name on right side of header
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff')
        .text(data.reportName, MARGIN + CONTENT_W / 2, 18, { width: CONTENT_W / 2, align: 'right' });
      doc.fontSize(8).font('Helvetica').fillColor('#bfdbfe')
        .text(`${new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, MARGIN + CONTENT_W / 2, 36, { width: CONTENT_W / 2, align: 'right' });

      y = 88;

      // ---- METADATA ROW ----
      const metaItems = [
        { label: 'Chain', value: data.chain.toUpperCase() },
        { label: 'Period', value: timeLabel },
        { label: 'Addresses', value: String(s.totalAddresses) },
        { label: 'Format', value: schedule.format.toUpperCase() },
      ];
      const metaW = CONTENT_W / metaItems.length;
      doc.fontSize(8).font('Helvetica');
      for (let i = 0; i < metaItems.length; i++) {
        const mx = MARGIN + i * metaW;
        doc.fillColor(GRAY_400).text(metaItems[i].label, mx, y, { width: metaW, align: 'center' });
        doc.fillColor(GRAY_800).font('Helvetica-Bold')
          .text(metaItems[i].value, mx, y + 12, { width: metaW, align: 'center' });
        doc.font('Helvetica');
      }

      // Divider
      y += 34;
      doc.strokeColor(GRAY_200).lineWidth(0.5).moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke();
      y += 16;

      // ---- SUMMARY DASHBOARD ----
      doc.fontSize(12).font('Helvetica-Bold').fillColor(GRAY_800).text('Summary Dashboard', MARGIN, y);
      y += 22;

      const statCards = [
        { label: 'Wallets Analyzed', value: `${s.analyzed}/${s.totalAddresses}`, color: BLUE },
        { label: 'Total Txs', value: String(s.totalTransactions), color: GREEN },
        { label: 'Value Moved', value: `${s.totalValueEth || 0} ETH`, color: BLUE_DARK },
        { label: 'High Risk', value: String(s.highRiskWallets), color: s.highRiskWallets > 0 ? RED : GREEN },
      ];

      const cardW = (CONTENT_W - 24) / 4;
      const cardH = 50;
      for (let i = 0; i < statCards.length; i++) {
        const cx = MARGIN + i * (cardW + 8);
        doc.roundedRect(cx, y, cardW, cardH, 4).fillOpacity(0.08).fill(statCards[i].color).fillOpacity(1);
        doc.roundedRect(cx, y, cardW, cardH, 4).strokeOpacity(0.3).stroke(statCards[i].color).strokeOpacity(1);
        doc.fontSize(8).font('Helvetica').fillColor(GRAY_600)
          .text(statCards[i].label, cx, y + 8, { width: cardW, align: 'center' });
        doc.fontSize(18).font('Helvetica-Bold').fillColor(statCards[i].color)
          .text(statCards[i].value, cx, y + 20, { width: cardW, align: 'center' });
      }

      y += cardH + 20;

      // ---- ALERTS SECTION ----
      if (s.topIndicators?.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor(GRAY_800).text('Detected Indicators', MARGIN, y);
        y += 18;
        const pillH = 20;
        let pillX = MARGIN;
        for (const ind of s.topIndicators) {
          const pillW = doc.widthOfString(ind) + 20;
          if (pillX + pillW > PAGE_W - MARGIN) { pillX = MARGIN; y += pillH + 6; }
          doc.roundedRect(pillX, y, pillW, pillH, 10).fill(RED).fillOpacity(0.1).stroke(RED).strokeOpacity(0.3).fillOpacity(1);
          doc.fontSize(7).font('Helvetica').fillColor(RED).text(ind, pillX, y + 4, { width: pillW, align: 'center' });
          pillX += pillW + 6;
        }
        y += pillH + 16;
      }

      // ---- PER-WALLET SECTION ----
      doc.fontSize(12).font('Helvetica-Bold').fillColor(GRAY_800).text('Wallet Details', MARGIN, y);
      y += 20;

      for (const w of data.wallets) {
        // Page break if not enough room (need ~140px min)
        if (y > doc.page.height - 180) {
          addFooter();
          doc.addPage();
          y = 50;
        }

        // Wallet card background
        const cardTop = y;
        const cardBottom = cardTop + 142;

        // Card bg
        doc.roundedRect(MARGIN, cardTop, CONTENT_W, cardBottom - cardTop, 6).fill(GRAY_100).stroke(GRAY_200);

        // Address header
        const shortAddr = w.address.slice(0, 10) + '...' + w.address.slice(-8);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(GRAY_800)
          .text(shortAddr, MARGIN + 12, cardTop + 12, { width: CONTENT_W - 100 });

        if (!w.success) {
          doc.fontSize(9).font('Helvetica').fillColor(RED)
            .text('Analysis failed', MARGIN + 12, cardTop + 30, { width: CONTENT_W - 24 });
          doc.fontSize(8).fillColor(GRAY_600)
            .text(w.error || 'Unknown error', MARGIN + 12, cardTop + 44, { width: CONTENT_W - 24 });
          y = cardBottom + 12;
          continue;
        }

        const d = w.data;
        const wallet = d.wallet || {};
        const balanceEth = wallet.balanceInEth || 0;
        const txCount = d.summary?.totalTransactions || d.transactions?.length || 0;
        const risk = d.overallRiskScore ?? 0;
        const riskLevel = d.riskLevel || 'Unknown';
        const riskColor = risk >= 60 ? RED : risk >= 30 ? AMBER : GREEN;

        // Risk badge (top right of card)
        const badgeX = PAGE_W - MARGIN - 80;
        doc.roundedRect(badgeX, cardTop + 10, 68, 22, 11).fill(riskColor).fillOpacity(0.12).stroke(riskColor).strokeOpacity(0.3).fillOpacity(1);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(riskColor)
          .text(riskLevel.toUpperCase(), badgeX, cardTop + 14, { width: 68, align: 'center' });

        // Stats row
        const statsY = cardTop + 34;
        const firstSeenDate = wallet.firstTxTimestamp
          ? new Date(wallet.firstTxTimestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'N/A';
        const statFields = [
          { label: 'Balance', value: `${balanceEth.toFixed(4)} ETH` },
          { label: 'Transactions', value: String(txCount) },
          { label: 'Risk Score', value: `${risk}/100` },
          { label: 'First Activity', value: firstSeenDate },
        ];
        const statW = (CONTENT_W - 24) / statFields.length;
        for (let i = 0; i < statFields.length; i++) {
          const sx = MARGIN + 12 + i * statW;
          doc.fontSize(7).font('Helvetica').fillColor(GRAY_400).text(statFields[i].label, sx, statsY, { width: statW });
          doc.fontSize(10).font('Helvetica-Bold').fillColor(GRAY_800).text(statFields[i].value, sx, statsY + 10, { width: statW });
        }

        // Risk bar
        const barY = statsY + 28;
        const barW = CONTENT_W - 24;
        doc.fontSize(7).font('Helvetica').fillColor(GRAY_400).text('Risk', MARGIN + 12, barY);
        doc.rect(MARGIN + 34, barY, barW - 36, 6).fill(GRAY_200);
        const barFill = Math.min(risk / 100, 1) * (barW - 36);
        doc.rect(MARGIN + 34, barY, barFill, 6).fill(riskColor);

        // Indicators row
        const indicators = d.suspiciousIndicators || [];
        if (indicators.length > 0) {
          const indY = barY + 14;
          doc.fontSize(7).font('Helvetica').fillColor(GRAY_400).text('Flags:', MARGIN + 12, indY);
          let ix = MARGIN + 42;
          for (const ind of indicators.slice(0, 4)) {
            const label = ind.type?.replace(/_/g, ' ') || ind.description || String(ind);
            const iw = doc.widthOfString(label) + 14;
            if (ix + iw > PAGE_W - MARGIN) break;
            doc.roundedRect(ix, indY - 1, iw, 14, 7).fill(RED).fillOpacity(0.08).stroke(RED).strokeOpacity(0.2).fillOpacity(1);
            doc.fontSize(6.5).fillColor(RED).text(label, ix, indY + 2, { width: iw, align: 'center' });
            ix += iw + 5;
          }
        }

        // Activity summary row (replaces non-existent tokens)
        const sum = d.summary;
        const sumY = indicators.length > 0 ? barY + 30 : barY + 14;
        const sumFields = [
          { label: 'Sent', value: `${(sum?.totalValueSentEth || 0).toFixed(2)} ETH` },
          { label: 'Received', value: `${(sum?.totalValueReceivedEth || 0).toFixed(2)} ETH` },
          { label: 'Counterparties', value: String(sum?.uniqueInteractedAddresses || 0) },
          { label: 'Activity Span', value: sum?.activityPeriodDays ? `${sum.activityPeriodDays}d` : 'N/A' },
        ];
        const sumW = (CONTENT_W - 24) / sumFields.length;
        for (let i = 0; i < sumFields.length; i++) {
          const sx = MARGIN + 12 + i * sumW;
          doc.fontSize(7).font('Helvetica').fillColor(GRAY_400).text(sumFields[i].label, sx, sumY, { width: sumW });
          doc.fontSize(9).font('Helvetica').fillColor(GRAY_600).text(sumFields[i].value, sx, sumY + 10, { width: sumW });
        }

        y = cardBottom + 12;
      }

      // ---- FOOTER ON LAST PAGE ----
      addFooter();

      doc.end();
    });
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
