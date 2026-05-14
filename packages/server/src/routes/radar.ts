/**
 * Radar API Routes
 * CRUD for wallet alerts and live activity
 */
import { Router, Request, Response } from 'express';
import { getFirestore, admin } from '../firebase.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { alertService, RadarAlert, RadarActivity } from '../services/AlertService.js';
import { sendEmail } from '../services/EmailService.js';
import { buildRadarAlertEmail } from '../services/RadarEmailService.js';

const router = Router();
const RADAR_FROM = 'Fundtracer Radar <alert@fundtracer.xyz>';

// All radar routes require authentication
router.use(authMiddleware);

// GET /api/radar/alerts - Get user's alerts
router.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.uid;
        const alerts = await alertService.getAlertsByUser(userId);
        res.json({ alerts });
    } catch (error) {
        console.error('[Radar] Get alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

// POST /api/radar/alerts - Create a new alert
router.post('/alerts', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.uid;
        const { address, label, chain, alertType, threshold, email, customMessage } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'wallet address required' });
        }

        const alertThreshold = threshold === undefined || threshold === null || threshold === 0 ? undefined : threshold;

        // Check for duplicate
        const existing = await alertService.getAlertByAddress(address, userId);
        if (existing) {
            return res.status(409).json({ error: 'Alert already exists for this address' });
        }

        const alertId = await alertService.createAlert({
            address,
            label,
            chain: chain || 'solana',
            alertType: alertType || 'any_transaction',
            threshold: alertThreshold,
            enabled: true,
            email: email || '',
            customMessage,
            userId
        });

        res.json({ alertId, success: true });
    } catch (error) {
        console.error('[Radar] Create alert error:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// PUT /api/radar/alerts/:id - Update an alert (owner only)
router.put('/alerts/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.uid;
        const { label, alertType, threshold, email, customMessage, enabled } = req.body;

        // Verify ownership
        const alerts = await alertService.getAlertsByUser(userId);
        const owned = alerts.find(a => a.id === id);
        if (!owned) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alertService.updateAlert(id, {
            label,
            alertType,
            threshold,
            email,
            customMessage,
            enabled
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Update alert error:', error);
        res.status(500).json({ error: 'Failed to update alert' });
    }
});

// DELETE /api/radar/alerts/:id - Delete an alert (owner only)
router.delete('/alerts/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.uid;

        // Verify ownership
        const alerts = await alertService.getAlertsByUser(userId);
        const owned = alerts.find(a => a.id === id);
        if (!owned) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alertService.deleteAlert(id);
        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Delete alert error:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// POST /api/radar/alerts/:id/toggle - Toggle alert enabled (owner only)
router.post('/alerts/:id/toggle', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.uid;
        const { enabled } = req.body;

        // Verify ownership
        const alerts = await alertService.getAlertsByUser(userId);
        const owned = alerts.find(a => a.id === id);
        if (!owned) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alertService.toggleAlert(id, enabled);
        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Toggle alert error:', error);
        res.status(500).json({ error: 'Failed to toggle alert' });
    }
});

// GET /api/radar/activity - Get live activity for user's alerts
router.get('/activity', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.uid;
        const limit = parseInt(req.query.limit as string) || 100;
        const activities = await alertService.getLiveActivity(userId, limit);

        const serialized = activities.map(a => ({
            ...a,
            timestamp: a.timestamp instanceof admin.firestore.Timestamp
                ? a.timestamp.toDate().toISOString()
                : a.timestamp
        }));

        res.json({ activities: serialized });
    } catch (error) {
        console.error('[Radar] Get activity error:', error);
        res.status(500).json({ error: 'Failed to get activity' });
    }
});

// GET /api/radar/activity/:alertId - Get activity for specific alert (owner only)
router.get('/activity/:alertId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { alertId } = req.params;
        const userId = req.user!.uid;
        const limit = parseInt(req.query.limit as string) || 50;

        // Verify ownership
        const alerts = await alertService.getAlertsByUser(userId);
        const owned = alerts.find(a => a.id === alertId);
        if (!owned) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const activities = await alertService.getRecentActivity(alertId, limit);

        const serialized = activities.map(a => ({
            ...a,
            timestamp: a.timestamp instanceof admin.firestore.Timestamp
                ? a.timestamp.toDate().toISOString()
                : a.timestamp
        }));

        res.json({ activities: serialized });
    } catch (error) {
        console.error('[Radar] Get alert activity error:', error);
        res.status(500).json({ error: 'Failed to get activity' });
    }
});

// POST /api/radar/test-email - Test radar email (for setup, authenticated)
router.post('/test-email', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'email required' });
        }

        await sendEmail({
            to: email,
            subject: 'Radar Alerts Test - Fundtracer',
            html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e293b;">Radar Alerts Test</h2>
  <p style="color: #475569;">If you're receiving this email, your Radar alerts are configured correctly!</p>
  <p style="color: #94a3b8; font-size: 12px;">
    You'll receive notifications here when monitored wallets make transactions.
  </p>
</div>`,
            from: RADAR_FROM
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Test email error:', error);
        res.status(500).json({ error: 'Failed to send test email' });
    }
});

// POST /api/radar/verify-email - Send verification email (authenticated)
router.post('/verify-email', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user!.uid;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        await sendEmail({
            to: email,
            subject: 'Verify your Radar alert email - Fundtracer',
            html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e293b;">Verify your Radar alerts</h2>
  <p style="color: #475569;">Click the button below to verify your email for Radar wallet alerts:</p>
  <a href="${process.env.APP_URL || 'https://fundtracer.xyz'}/radar/verify?email=${encodeURIComponent(email)}&userId=${userId}"
     style="display: inline-block; background: #00ff88; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
    Verify Email
  </a>
  <p style="color: #94a3b8; font-size: 12px;">
    If you didn't set up Radar alerts, you can ignore this email.
  </p>
</div>`,
            from: RADAR_FROM
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Verify email error:', error);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

export default router;
