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
import { useIsMobile } from '../../../hooks/useIsMobile';

type SettingsTab = 'account' | 'api-keys' | 'watchtower' | 'address-book' | 'scan-history' | 'scheduled-reports' | 'preferences';

export function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const notify = useNotify();
  const [tab, setTab] = useState<SettingsTab>('account');
  const isMobile = useIsMobile();

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

  const settingsTabs = [
    { id: 'account' as const, label: 'Account', icon: AccountIcon },
    { id: 'api-keys' as const, label: 'API Keys', icon: KeyIcon },
    { id: 'watchtower' as const, label: 'Watchtower', icon: EyeIcon },
    { id: 'address-book' as const, label: 'Address Book', icon: BookIcon },
    { id: 'scan-history' as const, label: 'History', icon: ClockIcon },
    { id: 'scheduled-reports' as const, label: 'Reports', icon: CalendarIcon },
    { id: 'preferences' as const, label: 'Preferences', icon: GearIcon },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>
      {/* Mobile: horizontal icon tab bar */}
      {isMobile && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 8px',
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--bg-secondary)',
          overflowX: 'auto',
          flexShrink: 0,
          minHeight: 52,
        }}>
          {settingsTabs.map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              title={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '6px 9px',
                border: 'none',
                borderRadius: 12,
                background: tab === item.id ? 'var(--card)' : 'transparent',
                color: tab === item.id ? 'var(--accent)' : 'var(--fg-tertiary)',
                cursor: 'pointer',
                minWidth: 58,
                minHeight: 40,
                flexShrink: 0,
              }}
            >
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: tab === item.id ? 650 : 500, whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Desktop: settings sidebar */}
      {!isMobile && (
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
          {settingsTabs.map(item => (
            <button
              type="button"
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
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: isMobile ? '14px 14px 0' : 24, overflow: 'auto' }}>
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
                        background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 600,
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
                  background: profile?.tier === 'pro' ? 'var(--accent-soft)' : profile?.tier === 'max' ? 'rgba(139,92,246,0.1)' : 'var(--hover-overlay)',
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
                        background: theme === t ? 'var(--accent-soft)' : 'transparent',
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

const s = { width: 16, height: 16, viewBox: '0 0 24 24' as const, fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const AccountIcon = <svg {...s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const KeyIcon = <svg {...s}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const EyeIcon = <svg {...s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const BookIcon = <svg {...s}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
const ClockIcon = <svg {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const CalendarIcon = <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const GearIcon = <svg {...s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
