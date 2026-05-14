import { Router, Request, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { generateLinkCode, isUserLinked, unlinkUser, getLinkedUserByUserId } from '../services/TelegramBot.js';

const router = Router();

router.post('/link-code', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId, tier, walletAddress } = req.body;

        if (!userId || !tier || !walletAddress) {
            return res.status(400).json({ error: 'userId, tier, and walletAddress are required' });
        }

        // Ensure the authenticated user can only generate a code for themselves
        if (req.user?.uid !== userId) {
            return res.status(403).json({ error: 'You can only generate a link code for your own account' });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        if (isUserLinked(userId)) {
            return res.status(400).json({ error: 'Account already linked to Telegram' });
        }

        const code = generateLinkCode(userId, tier, walletAddress.toLowerCase());
        
        res.json({ 
            success: true, 
            code,
            expiresIn: 600
        });
    } catch (error) {
        console.error('[Telegram API] Error generating link code:', error);
        res.status(500).json({ error: 'Failed to generate link code' });
    }
});

router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const linked = isUserLinked(userId);
        
        if (linked) {
            const user = getLinkedUserByUserId(userId);
            res.json({
                linked: true,
                telegramId: user?.telegramId,
                watches: user?.watches?.length || 0,
                tier: user?.tier,
                alertFrequency: user?.alertFrequency
            });
        } else {
            res.json({ linked: false });
        }
    } catch (error) {
        console.error('[Telegram API] Error checking status:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

router.post('/unlink', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Ensure the authenticated user can only unlink their own account
        if (req.user?.uid !== userId) {
            return res.status(403).json({ error: 'You can only unlink your own account' });
        }

        const success = unlinkUser(userId);
        
        res.json({ success });
    } catch (error) {
        console.error('[Telegram API] Error unlinking:', error);
        res.status(500).json({ error: 'Failed to unlink account' });
    }
});

export const telegramRoutes = router;
