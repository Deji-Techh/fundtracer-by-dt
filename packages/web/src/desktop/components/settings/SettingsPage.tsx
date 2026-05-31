import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotify } from '../../contexts/ToastContext';
import { updateProfile } from '../../api/auth';
import { ApiKeysSection } from './ApiKeysSection';
import { AddressBookSection } from './AddressBookSection';
import { HistorySection } from './HistorySection';
import { ScheduledReportsSection } from './ScheduledReportsSection';
import { WatchtowerSection } from './WatchtowerSection';

type SettingsTab = 'account' | 'api-keys' | 'watchtower' | 'address-book' | 'scan-history' | 'scheduled-reports' | 'preferences';

export function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const notify = useNotify();
  const [tab, setTab] = useState<SettingsTab>('account');

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { notify.error('Display name cannot be empty'); return; }
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      notify.success('Profile updated');
      setEditing(false);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Settings sidebar */}
      <div style={{
        width: 180,
        borderRight: '1px solid var(--hairline)',
        background: 'var(--bg-secondary)',
        padding: '12px 0',
        flexShrink: 0,
        overflow: 'auto',
      }}>
        <div style={{ padding: '0 12px 12px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
            Settings
          </h3>
        </div>
        {([
          { id: 'account' as const, label: 'Account' },
          { id: 'api-keys' as const, label: 'API Keys' },
          { id: 'watchtower' as const, label: 'Watchtower' },
          { id: 'address-book' as const, label: 'Address Book' },
          { id: 'scan-history' as const, label: 'Scan History' },
          { id: 'scheduled-reports' as const, label: 'Scheduled Reports' },
          { id: 'preferences' as const, label: 'Preferences' },
        ]).map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              width: '100%',
              padding: '8px 12px',
              textAlign: 'left',
              background: tab === item.id ? 'var(--hover-overlay)' : 'transparent',
              border: 'none',
              borderLeft: tab === item.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === item.id ? 'var(--fg)' : 'var(--fg-secondary)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {tab === 'account' && (
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
              Account
            </h2>
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--hairline)',
              padding: 20,
            }}>
              {/* Display Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 4 }}>Display Name</label>
                {editing ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--card-border)', background: 'var(--bg)',
                        color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--font-sans)', outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                      autoFocus
                    />
                    <button onClick={handleSaveProfile} disabled={saving}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                        background: '#00cc6a', color: '#000', fontSize: 12, fontWeight: 600,
                        fontFamily: 'var(--font-sans)', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditing(false); setDisplayName(profile?.displayName || ''); }}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                        background: 'transparent', color: 'var(--fg-secondary)', fontSize: 12,
                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                      }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                      {profile?.displayName || 'Not set'}
                    </div>
                    <button onClick={() => { setEditing(true); setDisplayName(profile?.displayName || ''); }}
                      style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                        background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 11,
                        fontFamily: 'var(--font-sans)', cursor: 'pointer',
                      }}>
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 4 }}>Email</label>
                <div style={{ fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--font-sans)' }}>
                  {profile?.email || 'Not set'}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 4 }}>Plan</label>
                <div style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: profile?.tier === 'pro' ? 'rgba(0,230,122,0.1)' : profile?.tier === 'max' ? 'rgba(139,92,246,0.1)' : 'var(--hover-overlay)',
                  color: profile?.tier === 'pro' ? 'var(--accent)' : profile?.tier === 'max' ? '#8b5cf6' : 'var(--fg-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                }}>
                  {profile?.tier || 'free'}
                </div>
              </div>

              {/* Usage stats */}
              {profile?.usage && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 8 }}>Usage Today</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 3, background: 'var(--hover-overlay)', overflow: 'hidden',
                    }}>
                      {typeof profile.usage.limit === 'number' && (
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (profile.usage.today / profile.usage.limit) * 100)}%`,
                          borderRadius: 3,
                          background: profile.tier === 'pro' ? '#3b82f6' : profile.tier === 'max' ? '#8b5cf6' : 'var(--accent)',
                          transition: 'width 0.5s ease',
                        }} />
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)', whiteSpace: 'nowrap' }}>
                      {profile.usage.today.toLocaleString()} / {typeof profile.usage.limit === 'number' ? profile.usage.limit.toLocaleString() : '∞'}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={signOut}
                style={{
                  marginTop: 8,
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--card-border)',
                  background: 'transparent',
                  color: 'var(--destructive)',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {tab === 'api-keys' && <ApiKeysSection />}
        {tab === 'watchtower' && <WatchtowerSection />}
        {tab === 'address-book' && <AddressBookSection />}
        {tab === 'scan-history' && <HistorySection />}
        {tab === 'scheduled-reports' && <ScheduledReportsSection />}

        {tab === 'preferences' && (
          <div style={{ maxWidth: 500 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', marginBottom: 16, fontFamily: 'var(--font-sans)' }}>
              Preferences
            </h2>
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--hairline)',
              padding: 20,
            }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 4 }}>
                  Theme
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['dark', 'dim', 'light'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: theme === t ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                        background: theme === t ? 'rgba(0,230,122,0.1)' : 'transparent',
                        color: theme === t ? 'var(--accent)' : 'var(--fg-secondary)',
                        fontSize: 13,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
