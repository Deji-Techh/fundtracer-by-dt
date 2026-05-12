import { ShieldOff, Ban } from 'lucide-react';

interface BanOverlayProps {
  banReason?: string | null;
  bannedAt?: number | null;
}

export default function BanOverlay({ banReason, bannedAt }: BanOverlayProps) {
  const reason = banReason || 'Your account has been suspended by an administrator.';
  const date = bannedAt ? new Date(bannedAt).toLocaleDateString() : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: '#0f0f0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px 32px',
        maxWidth: 420,
        width: '100%',
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Ban size={36} color="#ef4444" strokeWidth={1.5} />
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          Account Suspended
        </h1>
        <p style={{
          fontSize: 15,
          color: '#9ca3af',
          lineHeight: 1.6,
          margin: '0 0 24px',
        }}>
          {reason}
        </p>
        {date && (
          <p style={{
            fontSize: 13,
            color: '#6b7280',
            margin: '0 0 32px',
          }}>
            Suspended on {date}
          </p>
        )}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          borderRadius: 12,
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          <p style={{
            fontSize: 13,
            color: '#d1d5db',
            lineHeight: 1.5,
            margin: 0,
          }}>
            If you believe this is an error, please contact support at{' '}
            <a href="mailto:support@fundtracer.xyz" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
              support@fundtracer.xyz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
