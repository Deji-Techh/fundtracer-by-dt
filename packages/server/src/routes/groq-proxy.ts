import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { fetchGroqChatCompletion } from '../lib/gemini-client.js';

const router = Router();

router.post('/groq', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { model, messages, stream, temperature, max_tokens } = req.body;

    const groqResponse = await fetchGroqChatCompletion({
      model: model || 'llama-3.3-70b-versatile',
      messages,
      stream: stream === true,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 150,
    });

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({}));
      return res.status(groqResponse.status).json(errData);
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'disable');

      const bodyStream = groqResponse.body as any;
      if (bodyStream && typeof bodyStream.pipe === 'function') {
        bodyStream.pipe(res);
      } else {
        for await (const chunk of bodyStream) {
          res.write(chunk);
        }
        res.end();
      }
    } else {
      const data = await groqResponse.json();
      res.json(data);
    }
  } catch (error: any) {
    console.error('[Groq Proxy] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy Groq request' });
    }
  }
});

export default router;
export { router as groqProxyRoutes };
