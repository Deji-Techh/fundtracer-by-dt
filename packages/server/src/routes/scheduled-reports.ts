/**
 * Scheduled Reports API Routes
 * CRUD for scheduled reports — stores in Firestore, executed by ScheduledReportService.
 */

import { Router, Response } from 'express';
import cron from 'node-cron';
import { getFirestore } from '../firebase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { scheduledReportService } from '../services/ScheduledReportService.js';

const router = Router();

router.use(authMiddleware);

interface CreateReportBody {
  name: string;
  cronExpression: string;
  format: 'pdf' | 'csv' | 'json';
  chain: string;
  addresses: string[];
  timePeriod: '24h' | '7d' | '30d' | 'all';
  deliveryMethod: 'email' | 'download';
  emailRecipient?: string;
}

// GET /api/scheduled-reports — list user's schedules
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const snap = await db.collection('scheduled_reports')
      .where('userId', '==', req.user!.uid)
      .get();

    // Sort in-memory to avoid requiring a composite index
    const schedules = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json({ schedules });
  } catch (error) {
    console.error('[ScheduledReports] List error:', error);
    res.status(500).json({ error: 'Failed to list schedules' });
  }
});

// POST /api/scheduled-reports — create new schedule
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, cronExpression, format, chain, addresses, timePeriod, deliveryMethod, emailRecipient } = req.body as CreateReportBody;

    // Validation
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!cronExpression || !cron.validate(cronExpression)) return res.status(400).json({ error: 'Invalid cron expression' });
    if (!['pdf', 'csv', 'json'].includes(format)) return res.status(400).json({ error: 'Format must be pdf, csv, or json' });
    if (!chain) return res.status(400).json({ error: 'Chain is required' });
    if (!addresses?.length || addresses.length > 50) return res.status(400).json({ error: '1-50 addresses required' });
    if (!['email', 'download'].includes(deliveryMethod)) return res.status(400).json({ error: 'Delivery method must be email or download' });
    if (deliveryMethod === 'email' && !emailRecipient?.trim()) return res.status(400).json({ error: 'Email recipient required for email delivery' });
    if (!['24h', '7d', '30d', 'all'].includes(timePeriod)) return res.status(400).json({ error: 'Invalid time period' });

    // Rate limit: max 10 schedules per free user
    const db = getFirestore();
    const existing = await db.collection('scheduled_reports')
      .where('userId', '==', req.user!.uid)
      .get();

    if (existing.size >= 10) {
      return res.status(429).json({ error: 'Maximum 10 schedules per user' });
    }

    const now = Date.now();
    const docData = {
      userId: req.user!.uid,
      name: name.trim(),
      cronExpression,
      format,
      chain: chain.toLowerCase(),
      addresses,
      timePeriod,
      deliveryMethod,
      emailRecipient: deliveryMethod === 'email' ? emailRecipient!.trim() : null,
      lastRunAt: null,
      nextRunAt: null,
      lastError: null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('scheduled_reports').add(docData);
    console.log(`[ScheduledReports] Created: ${docRef.id} by ${req.user!.uid}`);

    res.status(201).json({ id: docRef.id, ...docData });
  } catch (error) {
    console.error('[ScheduledReports] Create error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PATCH /api/scheduled-reports/:id — update schedule
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('scheduled_reports').doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Schedule not found' });

    const data = doc.data()!;
    if (data.userId !== req.user!.uid) return res.status(403).json({ error: 'Not authorized' });

    const updates: Record<string, any> = { updatedAt: Date.now() };
    const body = req.body as Partial<CreateReportBody & { enabled: boolean }>;

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.cronExpression !== undefined) {
      if (!cron.validate(body.cronExpression)) return res.status(400).json({ error: 'Invalid cron expression' });
      updates.cronExpression = body.cronExpression;
    }
    if (body.format !== undefined) {
      if (!['pdf', 'csv', 'json'].includes(body.format)) return res.status(400).json({ error: 'Invalid format' });
      updates.format = body.format;
    }
    if (body.chain !== undefined) updates.chain = body.chain.toLowerCase();
    if (body.addresses !== undefined) {
      if (!body.addresses.length || body.addresses.length > 50) return res.status(400).json({ error: '1-50 addresses required' });
      updates.addresses = body.addresses;
    }
    if (body.timePeriod !== undefined) {
      if (!['24h', '7d', '30d', 'all'].includes(body.timePeriod)) return res.status(400).json({ error: 'Invalid time period' });
      updates.timePeriod = body.timePeriod;
    }
    if (body.deliveryMethod !== undefined) {
      if (!['email', 'download'].includes(body.deliveryMethod)) return res.status(400).json({ error: 'Invalid delivery method' });
      updates.deliveryMethod = body.deliveryMethod;
    }
    if (body.emailRecipient !== undefined) updates.emailRecipient = body.emailRecipient?.trim() || null;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    await db.collection('scheduled_reports').doc(req.params.id).update(updates);
    res.json({ id: req.params.id, ...data, ...updates });
  } catch (error) {
    console.error('[ScheduledReports] Update error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/scheduled-reports/:id — delete schedule
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('scheduled_reports').doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Schedule not found' });

    const data = doc.data()!;
    if (data.userId !== req.user!.uid) return res.status(403).json({ error: 'Not authorized' });

    await db.collection('scheduled_reports').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('[ScheduledReports] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// POST /api/scheduled-reports/:id/run — trigger manual run
router.post('/:id/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('scheduled_reports').doc(req.params.id).get();

    if (!doc.exists) return res.status(404).json({ error: 'Schedule not found' });

    const data = doc.data()!;
    if (data.userId !== req.user!.uid) return res.status(403).json({ error: 'Not authorized' });

    const success = await scheduledReportService.runNow(req.params.id);
    if (success) {
      res.json({ success: true, message: 'Report generation started' });
    } else {
      res.status(500).json({ error: 'Failed to start report generation' });
    }
  } catch (error) {
    console.error('[ScheduledReports] Run error:', error);
    res.status(500).json({ error: 'Failed to run report' });
  }
});

// GET /api/scheduled-reports/:id/outputs — list available download outputs for a schedule
router.get('/:id/outputs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();

    // Verify schedule ownership
    const doc = await db.collection('scheduled_reports').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Schedule not found' });
    const data = doc.data()!;
    if (data.userId !== req.user!.uid) return res.status(403).json({ error: 'Not authorized' });

    const snap = await db.collection('report_outputs')
      .where('scheduleId', '==', req.params.id)
      .where('userId', '==', req.user!.uid)
      .limit(20)
      .get();

    // Sort in-memory to avoid requiring a composite index
    const outputs = snap.docs
      .map(d => {
        const o = d.data();
        return {
          id: d.id,
          filename: o.filename,
          format: o.format,
          contentType: o.contentType,
          createdAt: o.createdAt,
          expiresAt: o.expiresAt,
        };
      })
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    res.json({ outputs });
  } catch (error) {
    console.error('[ScheduledReports] List outputs error:', error);
    res.status(500).json({ error: 'Failed to list outputs' });
  }
});

// GET /api/scheduled-reports/:id/download/:outputId — download stored report
router.get('/:id/download/:outputId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const outputDoc = await db.collection('report_outputs').doc(req.params.outputId).get();

    if (!outputDoc.exists) return res.status(404).json({ error: 'Report not found' });

    const output = outputDoc.data()!;
    if (output.userId !== req.user!.uid) return res.status(403).json({ error: 'Not authorized' });
    if (output.expiresAt < Date.now()) {
      await db.collection('report_outputs').doc(req.params.outputId).delete();
      return res.status(410).json({ error: 'Report expired' });
    }

    const buffer = Buffer.from(output.content, 'base64');
    res.setHeader('Content-Type', output.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${output.filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('[ScheduledReports] Download error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

export { router as scheduledReportRoutes };
