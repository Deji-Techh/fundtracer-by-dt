// ============================================================
// Payment Verification Service
// Checks blockchain for subscription payments
// ============================================================

import { ethers } from 'ethers';

const PAYMENT_ADDRESS = '0xFF1A1D11CB6bad91C6d9250082D1DF44d84e4b87';
const GAS_PAYMENT_ADDRESS = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';

// RPC endpoint for Linea
const LINEA_RPC = 'https://rpc.linea.build';

// Check for subscription payment transaction
export async function verifySubscriptionPayment(
  walletAddress,
  tier
) {
  try {
    const provider = new ethers.JsonRpcProvider(LINEA_RPC);

    const blockNumber = await provider.getBlockNumber();
    const fromBlock = Math.max(0, blockNumber - 10000);

    const filter = {
      address: PAYMENT_ADDRESS,
      fromBlock: fromBlock,
      toBlock: 'latest',
    };

    const logs = await provider.getLogs(filter);

    for (const log of logs) {
      const tx = await provider.getTransaction(log.transactionHash);
      if (!tx) continue;

      const fromLower = tx.from?.toLowerCase();
      const walletLower = walletAddress.toLowerCase();

      if (fromLower === walletLower) {
        const value = BigInt(tx.value || 0n);
        const proPrice = ethers.parseEther('5');
        const maxPrice = ethers.parseEther('10');
        const expectedPrice = tier === 'pro' ? proPrice : maxPrice;

        if (value >= expectedPrice) {
          return {
            verified: true,
            txHash: log.transactionHash,
          };
        }
      }
    }

    return { verified: false };
  } catch (error) {
    console.error('[PaymentVerification] Error:', error);
    return { verified: false };
  }
}

// Check for gas payment transaction (free tier)
export async function verifyGasPayment(
  walletAddress
) {
  try {
    const provider = new ethers.JsonRpcProvider(LINEA_RPC);

    const blockNumber = await provider.getBlockNumber();
    const fromBlock = Math.max(0, blockNumber - 1000);

    const filter = {
      address: GAS_PAYMENT_ADDRESS,
      fromBlock: fromBlock,
      toBlock: 'latest',
    };

    const logs = await provider.getLogs(filter);

    for (const log of logs) {
      const tx = await provider.getTransaction(log.transactionHash);
      if (!tx) continue;

      const fromLower = tx.from?.toLowerCase();
      const walletLower = walletAddress.toLowerCase();

      if (fromLower === walletLower) {
        const value = BigInt(tx.value || 0n);
        if (value > 0n) {
          return {
            verified: true,
            txHash: log.transactionHash,
          };
        }
      }
    }

    return { verified: false };
  } catch (error) {
    console.error('[GasPaymentVerification] Error:', error);
    return { verified: false };
  }
}

// Send gas payment transaction
export async function sendGasPayment(
  walletAddress,
  getSigner
) {
  try {
    const signer = await getSigner();
    if (!signer) {
      return { success: false, error: 'Please connect your wallet' };
    }

    const network = await signer.provider.getNetwork();
    const LINEA_CHAIN_ID = 59144;
    if (Number(network.chainId) !== LINEA_CHAIN_ID) {
      return { success: false, error: 'Please switch to Linea network' };
    }

    const gasAmount = ethers.parseEther('0.0001');

    const tx = await signer.sendTransaction({
      to: GAS_PAYMENT_ADDRESS,
      value: gasAmount,
    });

    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (error) {
    console.error('[GasPayment] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send gas payment',
    };
  }
}
