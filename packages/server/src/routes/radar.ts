/**
 * Radar API Routes
 * CRUD for wallet alerts and live activity
 */
import { Router, Request, Response } from 'express';
import { getFirestore, admin } from '../firebase.js';
import { alertService, RadarAlert, RadarActivity } from '../services/AlertService.js';
import { sendEmail } from '../services/EmailService.js';
import { buildRadarAlertEmail } from '../services/RadarEmailService.js';

const router = Router();
const RADAR_FROM = 'Fundtracer Radar <alert@fundtracer.xyz>';

// Middleware to get userId from request (simplified - would use auth middleware in production)
function getUserId(req: Request): string {
    // In production, this would come from auth middleware
    // For now, accept userId from query or body
    return req.query.userId as string || req.body.userId as string || 'anonymous';
}

// GET /api/radar/alerts - Get user's alerts
router.get('/alerts', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const alerts = await alertService.getAlertsByUser(userId);
        res.json({ alerts });
    } catch (error) {
        console.error('[Radar] Get alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

// POST /api/radar/alerts - Create a new alert
router.post('/alerts', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const { address, label, chain, alertType, threshold, email, customMessage } = req.body;

        if (!address || !email) {
            return res.status(400).json({ error: 'address and email required' });
        }

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
            threshold,
            enabled: true,
            email,
            customMessage,
            userId
        });

        res.json({ alertId, success: true });
    } catch (error) {
        console.error('[Radar] Create alert error:', error);
        res.status(500).json({ error: 'Failed to create alert' });
    }
});

// PUT /api/radar/alerts/:id - Update an alert
router.put('/alerts/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { label, alertType, threshold, email, customMessage, enabled } = req.body;

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

// DELETE /api/radar/alerts/:id - Delete an alert
router.delete('/alerts/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await alertService.deleteAlert(id);
        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Delete alert error:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
});

// POST /api/radar/alerts/:id/toggle - Toggle alert enabled
router.post('/alerts/:id/toggle', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        await alertService.toggleAlert(id, enabled);
        res.json({ success: true });
    } catch (error) {
        console.error('[Radar] Toggle alert error:', error);
        res.status(500).json({ error: 'Failed to toggle alert' });
    }
});

// GET /api/radar/activity - Get live activity for user's alerts
router.get('/activity', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const limit = parseInt(req.query.limit as string) || 100;
        const activities = await alertService.getLiveActivity(userId, limit);

        // Convert timestamps to ISO strings
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

// GET /api/radar/activity/:alertId - Get activity for specific alert
router.get('/activity/:alertId', async (req: Request, res: Response) => {
    try {
        const { alertId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

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

// POST /api/radar/test-email - Test radar email (for setup)
router.post('/test-email', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'email required' });
        }

        // Send test email
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

export default router;