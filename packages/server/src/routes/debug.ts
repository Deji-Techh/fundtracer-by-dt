// Diagnostic route to verify deployment
import { Router, Request, Response } from 'express';
const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'Debug endpoint working'
  });
});

export { router as debugRoutes };
