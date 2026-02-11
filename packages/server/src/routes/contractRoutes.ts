import { Router } from 'express';
import { ContractScanner } from '../services/contractScanner.js';

const router = Router();

// POST /api/contract/scan
router.post('/scan', async (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ error: 'Contract address is required' });
  }
  
  const apiKey = process.env.DEFAULT_ALCHEMY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Alchemy API key not configured' });
  }
  
  try {
    const scanner = new ContractScanner(
      apiKey,
      process.env.LINEASCAN_API_KEY
    );
    
    const result = await scanner.scan(address);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Contract Scan Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scan contract';
    res.status(500).json({
      error: errorMessage,
      hint: errorMessage.includes('not a contract') 
        ? 'Please enter a valid smart contract address'
        : undefined
    });
  }
});

export default router;
