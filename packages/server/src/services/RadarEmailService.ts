/**
 * Radar Alert Email Templates
 */
export function buildRadarAlertEmail(
    walletAddress: string,
    alertLabel: string,
    activityType: string,
    amount: string,
    amountUSD: string,
    txHash: string,
    customMessage?: string
): { subject: string; html: string } {
    const typeLabels: Record<string, string> = {
        received: 'Received',
        sent: 'Sent',
        swap: 'Swapped',
        nft: 'NFT Activity',
        stake: 'Staked',
        other: 'Transaction'
    };

    const typeLabel = typeLabels[activityType] || activityType;

    return {
        subject: `Radar Alert: ${typeLabel} - ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
        html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);">
    <span style="font-size: 32px;">🚨</span>
    <h2 style="color: #ffffff; margin: 10px 0 0; font-size: 20px; font-weight: 600;">Wallet Alert Triggered</h2>
  </div>
  
  <div style="padding: 30px; background: #ffffff;">
    ${customMessage ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
      <p style="color: #92400e; margin: 0; font-size: 14px; font-style: italic;">"${customMessage}"</p>
    </div>
    ` : ''}
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Alert Label</td>
          <td style="color: #1e293b; font-weight: 600; font-size: 14px; padding-bottom: 8px; text-align: right;">${alertLabel || 'N/A'}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Wallet</td>
          <td style="color: #1e293b; font-weight: 600; font-size: 14px; padding-bottom: 8px; text-align: right; font-family: monospace;">${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Activity</td>
          <td style="color: #1e293b; font-weight: 600; font-size: 14px; padding-bottom: 8px; text-align: right;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Amount</td>
          <td style="color: #1e293b; font-weight: 600; font-size: 14px; padding-bottom: 8px; text-align: right;">${amount}</td>
        </tr>
        ${amountUSD ? `
        <tr>
          <td style="color: #64748b; font-size: 14px; padding-bottom: 8px;">Value</td>
          <td style="color: #10b981; font-weight: 600; font-size: 14px; padding-bottom: 8px; text-align: right;">$${amountUSD}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="https://www.fundtracer.xyz/investigate?address=${walletAddress}" style="background: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">View on Fundtracer</a>
    </div>
    
    <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 20px 0 0;">
      Transaction: <span style="font-family: monospace; word-break: break-all;">${txHash}</span>
    </p>
    
    <p style="color: #94a3b8; font-size: 11px; margin: 20px 0 0;">
      You're receiving this because you enabled alerts for this wallet on Fundtracer Radar.
      <a href="https://www.fundtracer.xyz/settings" style="color: #3b82f6;">Manage alerts</a>
    </p>
  </div>
  
  <div style="background: #f1f5f9; padding: 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Fundtracer - Blockchain Intelligence<br/>
      <a href="https://www.fundtracer.xyz" style="color: #3b82f6; text-decoration: none;">https://www.fundtracer.xyz</a>
    </p>
  </div>
</div>`
    };
}