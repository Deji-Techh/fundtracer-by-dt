import { Router } from 'express';
import { ContractScanner } from '../services/contractScanner.js';

const router = Router();

// POST /api/contract/scan
router.post('/scan', async (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ error: 'Contract address is required' });
  }
  
  try {
    const scanner = new ContractScanner(
      process.env.DEFAULT_ALCHEMY_API_KEY,
      process.env.LINEASCAN_API_KEY
    );
    
    const result = await scanner.scan(address);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Contract Scan Error]', error);
    res.status(500).json({
      error: error.message || 'Failed to scan contract',
      hint: error.message?.includes('not a contract') 
        ? 'Please enter a valid smart contract address'
        : undefined
    });
  }
});

export default router;
