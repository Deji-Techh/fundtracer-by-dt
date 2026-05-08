import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!resendClient && RESEND_API_KEY) {
    try {
      resendClient = new Resend(RESEND_API_KEY);
      console.log('[EmailService] Resend client initialized');
    } catch (error) {
      console.error('[EmailService] Resend client init error:', error);
    }
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  includeBcc?: boolean;
}

const DEFAULT_FROM = 'Fundtracer <welcome@fundtracer.xyz>';
const RADAR_FROM = 'Fundtracer Radar <alert@fundtracer.xyz>';
const BCC_ADDRESS = 'fundtracer.xyz+9c127564b8@invite.trustpilot.com';

export async function sendEmail({ to, subject, html, from, includeBcc }: SendEmailOptions): Promise<void> {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('[EmailService] Resend not configured, skipping email');
    return;
  }

  try {
    await resend.emails.send({
      from: from || DEFAULT_FROM,
      to,
      bcc: includeBcc !== false ? BCC_ADDRESS : undefined,
      subject,
      html
    });
    console.log(`[EmailService] Email sent to: ${to}, subject: ${subject}`);
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
    throw error;
  }
}

export function getBccAddress(): string {
  return BCC_ADDRESS;
}

export function buildWelcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: `Welcome to Fundtracer - Your Blockchain Intelligence Journey Starts Here`,
    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="text-align: center; padding: 20px;">
    <img src="https://www.fundtracer.xyz/banner.png" alt="Fundtracer Banner" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 150px;" />
  </div>
  
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
      Welcome${name ? `, ${name}` : ''}!
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      Thank you for joining Fundtracer - the most powerful blockchain intelligence platform designed for researchers, investors, and compliance professionals.
    </p>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      Whether you're investigating crypto fraud, conducting due diligence on a project, tracking portfolio performance, or analyzing competitor wallets, Fundtracer gives you the tools you need to understand any wallet's complete on-chain history.
    </p>

    <h3 style="color: #1e293b; margin: 35px 0 15px; font-size: 18px; font-weight: 600;">What You Can Do with Fundtracer</h3>
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Investigate Any Wallet</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Enter any wallet address and get a complete breakdown of their transaction history, token holdings, and on-chain behavior across 8+ blockchain networks.</p>
      
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Trace Funding Sources</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Our funding tree visualization shows exactly where every token came from, helping you trace the origin of funds and identify potential risks.</p>
      
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Detect Sybil Attacks</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Identify coordinated wallet clusters that may indicate airdrop farming, wash trading, or other manipulation schemes.</p>
      
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Track Portfolios</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Monitor your own wallets or portfolios and get real-time alerts for large movements, new token acquisitions, and portfolio value changes.</p>
    </div>

    <div style="text-align: center; margin: 35px 0;">
      <a href="https://www.fundtracer.xyz" style="background: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Start Your First Analysis</a>
    </div>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
      If you have any questions or want a personalized demo, just reply to this email. We're here to help you get the most out of Fundtracer.
    </p>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
      Best regards,<br/>The Fundtracer Team
    </p>
  </div>
  
  <div style="background: #f1f5f9; padding: 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Fundtracer - Blockchain Intelligence for Everyone<br/>
      <a href="https://www.fundtracer.xyz" style="color: #3b82f6; text-decoration: none;">https://www.fundtracer.xyz</a>
    </p>
  </div>
</div>`
  };
}

export function buildFirstAnalysisEmail(name: string, walletAddress: string, chain: string): { subject: string; html: string } {
  return {
    subject: `Your First Analysis is Ready - ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="text-align: center; padding: 20px;">
    <img src="https://www.fundtracer.xyz/banner.png" alt="Fundtracer Banner" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 150px;" />
  </div>
  
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
      Great work${name ? `, ${name}` : ''}!
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      You just completed your first blockchain analysis on Fundtracer. That's a significant step toward understanding the on-chain world.
    </p>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">Analyzed Wallet</p>
      <p style="color: #1e293b; font-weight: 600; font-size: 15px; margin: 0 0 15px; word-break: break-all;">${walletAddress}</p>
      
      <p style="color: #64748b; font-size: 14px; margin: 0 0 8px;">Network</p>
      <p style="color: #1e293b; font-weight: 600; font-size: 15px; margin: 0; text-transform: capitalize;">${chain}</p>
    </div>

    <h3 style="color: #1e293b; margin: 30px 0 15px; font-size: 18px; font-weight: 600;">What You Discovered</h3>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 15px;">
      Your analysis revealed the funding sources, transaction patterns, and risk profile of that wallet. This is the same methodology used by professional investigators and compliance teams.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.fundtracer.xyz" style="background: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Analyze Another Wallet</a>
    </div>

    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
      Pro tip: Save wallets to your tracking list to monitor their activity and get notified when they make moves.
    </p>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
      Have questions about your analysis? Reply to this email - we'd love to help you interpret the results.
    </p>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
      Best regards,<br/>The Fundtracer Team
    </p>
  </div>
  
  <div style="background: #f1f5f9; padding: 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Fundtracer - Blockchain Intelligence for Everyone<br/>
      <a href="https://www.fundtracer.xyz" style="color: #3b82f6; text-decoration: none;">https://www.fundtracer.xyz</a>
    </p>
  </div>
</div>`
  };
}

export function buildPremiumFeatureEmail(name: string, featureName: string): { subject: string; html: string } {
  return {
    subject: `You Just Unlocked ${featureName} - Welcome to Premium`,
    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="text-align: center; padding: 20px;">
    <img src="https://www.fundtracer.xyz/banner.png" alt="Fundtracer Banner" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 150px;" />
  </div>
  
  <div style="padding: 40px 30px; background: #ffffff;">
    <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 600;">
      Congratulations${name ? `, ${name}` : ''}!
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      You've just used a premium feature on Fundtracer - ${featureName}. You've unlocked the full power of our platform.
    </p>

    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
      <p style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Premium Active</p>
      <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">${featureName}</p>
    </div>

    <h3 style="color: #1e293b; margin: 30px 0 15px; font-size: 18px; font-weight: 600;">Your Premium Benefits</h3>
    
    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Unlimited Analyses</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Run as many wallet analyses as you need - no restrictions.</p>
      
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Real-time Alerts</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Get instant notifications when tracked wallets make moves.</p>
      
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">API Access</p>
      <p style="color: #64748b; margin: 0 0 15px; font-size: 14px; line-height: 1.6;">Build your own tools using our powerful API.</p>
      
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">Priority Support</p>
      <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.6;">Skip the queue and get faster responses from our team.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.fundtracer.xyz" style="background: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">Explore Premium Features</a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
      Thank you for being a premium member. If you have any questions about your subscription or need help with any feature, don't hesitate to reach out.
    </p>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
      Best regards,<br/>The Fundtracer Team
    </p>
  </div>
  
  <div style="background: #f1f5f9; padding: 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Fundtracer - Blockchain Intelligence for Everyone<br/>
      <a href="https://www.fundtracer.xyz" style="color: #3b82f6; text-decoration: none;">https://www.fundtracer.xyz</a>
    </p>
  </div>
</div>`
  };
}

export function buildClaimConfirmationEmail(name: string, equityPercent: number, pointsClaimed: number): { subject: string; html: string } {
  return {
    subject: `You've Claimed ${equityPercent.toFixed(5)}% Equity in FundTracer!`,
    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="text-align: center; padding: 20px;">
    <img src="https://www.fundtracer.xyz/banner.png" alt="Fundtracer Banner" style="max-width: 100%; height: auto; border-radius: 8px; max-height: 150px;" />
  </div>
  
  <div style="padding: 40px 30px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
      <span style="font-size: 48px;">🎉</span>
    </div>
    
    <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 24px; font-weight: 600; text-align: center;">
      Congratulations${name ? `, ${name}` : ''}!
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px; text-align: center;">
      You've successfully claimed your equity in FundTracer. Your contribution to the blockchain intelligence community now has real value.
    </p>

    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
      <p style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Your Equity</p>
      <p style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0;">${equityPercent.toFixed(5)}%</p>
    </div>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">Points Used</p>
        <p style="color: #1e293b; font-weight: 600; font-size: 14px; margin: 0;">${pointsClaimed.toLocaleString()} pts</p>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">Equity Claimed</p>
        <p style="color: #1e293b; font-weight: 600; font-size: 14px; margin: 0;">${equityPercent.toFixed(5)}%</p>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">Account Link</p>
        <p style="color: #10b981; font-weight: 600; font-size: 14px; margin: 0;">Google Account</p>
      </div>
    </div>

    <h3 style="color: #1e293b; margin: 30px 0 15px; font-size: 18px; font-weight: 600;">Keep Earning More Equity</h3>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      Every wallet you analyze earns you more points - and more equity. The more you use FundTracer, the more you own.
    </p>

    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="color: #1e293b; font-weight: 600; margin: 0 0 10px; font-size: 15px;">How to Earn More</p>
      <p style="color: #64748b; margin: 0 0 10px; font-size: 14px; line-height: 1.6;">1 wallet = 10 points = 0.00001% equity</p>
      <p style="color: #64748b; margin: 0 0 10px; font-size: 14px; line-height: 1.6;">Analyze 100 wallets = 0.001% equity</p>
      <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.6;">Analyze 1,000 wallets = 0.01% equity</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.fundtracer.xyz/rewards" style="background: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">View Your Stats</a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
      Your equity is permanently linked to your Google account. No wallet required, no risk of losing access.
    </p>
    
    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 15px 0 0;">
      Thank you for being part of the Fundtracer community.<br/>The Fundtracer Team
    </p>
  </div>
  
  <div style="background: #f1f5f9; padding: 20px; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      Fundtracer - Blockchain Intelligence for Everyone<br/>
      <a href="https://www.fundtracer.xyz" style="color: #3b82f6; text-decoration: none;">https://www.fundtracer.xyz</a>
    </p>
  </div>
</div>`
  };
}
