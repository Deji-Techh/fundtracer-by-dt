import { Router } from 'express';
import { generateLinkCode, getPendingCode, isUserLinked, unlinkUser, getLinkedUserByUserId } from '../services/TelegramBot.js';

const router = Router();

router.post('/link-code', async (req, res) => {
    try {
        const { userId, tier } = req.body;
        
        if (!userId || !tier) {
            return res.status(400).json({ error: 'userId and tier are required' });
        }

        if (isUserLinked(userId)) {
            return res.status(400).json({ error: 'Account already linked to Telegram' });
        }

        const code = generateLinkCode(userId, tier);
        
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

router.post('/unlink', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const success = unlinkUser(userId);
        
        res.json({ success });
    } catch (error) {
        console.error('[Telegram API] Error unlinking:', error);
        res.status(500).json({ error: 'Failed to unlink account' });
    }
});

export const telegramRoutes = router;
