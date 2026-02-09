import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateProfile } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotify } from '../contexts/ToastContext';
import { ContactModal } from './ContactModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import {
  User, Shield, CheckCircle, AlertTriangle, Save, Camera,
  Sun, Moon, Wallet, Unlink, MessageSquare, FileText, LogOut,
  ChevronRight, Bell, Globe, Lock, HelpCircle, ExternalLink,
  ArrowUpCircle
} from 'lucide-react';

interface SettingsPageProps {
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
  onUpgrade?: () => void;
}

export default function SettingsPage({ onConnectWallet, isWalletConnected, walletAddress, onUpgrade }: SettingsPageProps) {
  const { user, profile, refreshProfile, signOut, unlinkWallet } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const isMobile = useIsMobile();
  const notify = useNotify();

  // Profile state
  const [name, setName] = useState(profile?.username || '');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state
  const [showContact, setShowContact] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.username || '');
      setProfilePicture(profile.profilePicture || null);
    }
  }, [profile]);

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select an image file' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image must be less than 5MB' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await updateProfile({ displayName: name, profilePicture: profilePicture || undefined });
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await unlinkWallet();
    } catch (error: any) {
      notify.error(error.message || 'Failed to disconnect wallet');
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Styles
  const sectionStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-surface-border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    marginBottom: isMobile ? 16 : 20,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: isMobile ? '14px 16px' : '16px 20px',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--color-surface-border)',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '14px 16px' : '16px 20px',
    borderBottom: '1px solid var(--color-surface-border)',
    minHeight: 52,
    gap: 12,
    cursor: 'default',
  };

  const rowClickableStyle: React.CSSProperties = {
    ...rowStyle,
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  };

  const rowLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  };

  const iconWrapStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-base)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  };

  const sublabelStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
    marginTop: 2,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    flexShrink: 0,
  };

  // Not logged in state
  if (!user || !profile) {
    return (
      <div className="animate-fade-in" style={{
        maxWidth: isMobile ? 'none' : 640,
        margin: '0 auto',
        padding: isMobile ? '20px 16px' : '40px 24px',
      }}>
        <h1 style={{
          fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: 24,
        }}>Settings</h1>

        {/* Appearance */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>Appearance</div>
          <div
            style={rowClickableStyle}
            onClick={toggleTheme}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={rowLeftStyle}>
              <div style={{ ...iconWrapStyle, background: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
                {isDark ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#3b82f6" />}
              </div>
              <div>
                <div style={labelStyle}>Theme</div>
                <div style={sublabelStyle}>{isDark ? 'Dark mode' : 'Light mode'}</div>
              </div>
            </div>
            <div style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              background: isDark ? 'var(--color-accent-primary)' : 'var(--color-accent)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              flexShrink: 0,
            }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 3,
                left: isDark ? 3 : 23,
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        </div>

        {/* Support */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>Support</div>
          <div
            style={{ ...rowClickableStyle, borderBottom: '1px solid var(--color-surface-border)' }}
            onClick={() => setShowContact(true)}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={rowLeftStyle}>
              <div style={{ ...iconWrapStyle, background: 'rgba(59, 130, 246, 0.1)' }}>
                <MessageSquare size={18} color="#3b82f6" />
              </div>
              <div style={labelStyle}>Contact Us</div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </div>
          <div
            style={{ ...rowClickableStyle, borderBottom: 'none' }}
            onClick={() => setShowPrivacy(true)}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={rowLeftStyle}>
              <div style={{ ...iconWrapStyle, background: 'rgba(107, 114, 128, 0.1)' }}>
                <FileText size={18} color="#6b7280" />
              </div>
              <div style={labelStyle}>Privacy Policy</div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Sign in to access all settings
          </p>
        </div>

        <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
        <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{
      maxWidth: isMobile ? 'none' : 640,
      margin: '0 auto',
      padding: isMobile ? '20px 16px' : '40px 24px',
    }}>
      <h1 style={{
        fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: isMobile ? 20 : 24,
      }}>Settings</h1>

      {/* ===== PROFILE SECTION ===== */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Profile</div>

        {/* Avatar & Name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: isMobile ? '16px' : '20px',
          borderBottom: '1px solid var(--color-surface-border)',
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={handleProfilePictureClick}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 'bold',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              border: '2px solid var(--color-surface-border)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {profilePicture ? (
              <img src={profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              name ? name[0].toUpperCase() : <User size={28} />
            )}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 22,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Camera size={12} color="white" />
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {name || 'Anonymous User'}
            </div>
            <div style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {formatAddress(user.walletAddress)}
            </div>
          </div>
        </div>

        {/* Edit Name */}
        <form onSubmit={handleSave}>
          <div style={{
            padding: isMobile ? '14px 16px' : '16px 20px',
            borderBottom: '1px solid var(--color-surface-border)',
          }}>
            <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How should we call you?"
              maxLength={50}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-surface-border)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Save Button */}
          <div style={{
            padding: isMobile ? '14px 16px' : '16px 20px',
          }}>
            {message && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 12,
                fontSize: 'var(--text-sm)',
                background: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                color: message.type === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
                border: `1px solid ${message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
              }}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#ffffff',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: isSaving ? 0.6 : 1,
                transition: 'opacity 0.2s, background 0.2s',
                minHeight: 44,
              }}
            >
              {isSaving ? (
                <div className="loading-spinner" style={{ width: 16, height: 16 }} />
              ) : (
                <Save size={16} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* ===== ACCOUNT STATUS ===== */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Account</div>

        {/* Tier */}
        <div style={rowStyle}>
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: 'rgba(59, 130, 246, 0.1)' }}>
              <Shield size={18} color="#3b82f6" />
            </div>
            <div>
              <div style={labelStyle}>Current Tier</div>
              <div style={sublabelStyle}>Your subscription plan</div>
            </div>
          </div>
          <span style={{
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            textTransform: 'uppercase',
            background: profile.tier === 'free' ? 'var(--color-accent-primary)' : 'rgba(59, 130, 246, 0.15)',
            color: profile.tier === 'free' ? 'var(--color-text-secondary)' : '#3b82f6',
          }}>
            {profile.tier?.toUpperCase() || 'FREE'}
          </span>
        </div>

        {/* Upgrade Plan */}
        {onUpgrade && (
          <div
            style={rowClickableStyle}
            onClick={onUpgrade}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={rowLeftStyle}>
              <div style={{ ...iconWrapStyle, background: 'rgba(139, 92, 246, 0.1)' }}>
                <ArrowUpCircle size={18} color="#8b5cf6" />
              </div>
              <div>
                <div style={labelStyle}>Upgrade Plan</div>
                <div style={sublabelStyle}>Get more analyses and features</div>
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
          </div>
        )}

        {/* Verification */}
        <div style={rowStyle}>
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: profile.isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
              {profile.isVerified ? (
                <CheckCircle size={18} color="#10b981" />
              ) : (
                <AlertTriangle size={18} color="#f59e0b" />
              )}
            </div>
            <div>
              <div style={labelStyle}>Verification</div>
              <div style={sublabelStyle}>{profile.isVerified ? 'Proof-of-Humanity verified' : 'Not yet verified'}</div>
            </div>
          </div>
          <span style={{
            ...valueStyle,
            color: profile.isVerified ? '#10b981' : 'var(--color-text-muted)',
          }}>
            {profile.isVerified ? 'Verified' : 'Unverified'}
          </span>
        </div>

        {/* Daily Usage */}
        <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', borderBottom: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ ...iconWrapStyle, background: 'rgba(139, 92, 246, 0.1)' }}>
                <Globe size={18} color="#8b5cf6" />
              </div>
              <div style={labelStyle}>Daily Usage</div>
            </div>
            <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              {profile.usage?.today || 0} / {profile.usage?.limit || 'unlimited'}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: 6,
            background: 'var(--color-bg-elevated)',
            borderRadius: 3,
            overflow: 'hidden',
            marginLeft: isMobile ? 0 : 48,
            maxWidth: isMobile ? '100%' : 'calc(100% - 48px)',
          }}>
            <div style={{
              width: (profile.usage?.limit === 'unlimited' || !profile.usage?.limit)
                ? '0%'
                : `${Math.min(100, ((profile.usage?.today || 0) / (profile.usage?.limit as number)) * 100)}%`,
              height: '100%',
              background: 'var(--color-accent)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
          {profile.usage?.limit !== 'unlimited' && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4, marginLeft: isMobile ? 0 : 48 }}>
              Resets daily at midnight UTC
            </p>
          )}
        </div>
      </div>

      {/* ===== APPEARANCE ===== */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Appearance</div>
        <div
          style={{ ...rowClickableStyle, borderBottom: 'none' }}
          onClick={toggleTheme}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)' }}>
              {isDark ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#3b82f6" />}
            </div>
            <div>
              <div style={labelStyle}>Theme</div>
              <div style={sublabelStyle}>{isDark ? 'Dark mode is active' : 'Light mode is active'}</div>
            </div>
          </div>
          {/* Toggle switch */}
          <div style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            background: isDark ? 'var(--color-accent-primary)' : 'var(--color-accent)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            flexShrink: 0,
          }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 3,
              left: isDark ? 3 : 23,
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      </div>

      {/* ===== WALLET ===== */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Wallet</div>
        {isWalletConnected && walletAddress ? (
          <>
            <div style={rowStyle}>
              <div style={rowLeftStyle}>
                <div style={{ ...iconWrapStyle, background: 'rgba(16, 185, 129, 0.1)' }}>
                  <Wallet size={18} color="#10b981" />
                </div>
                <div>
                  <div style={labelStyle}>Connected Wallet</div>
                  <div style={{ ...sublabelStyle, fontFamily: 'var(--font-mono)' }}>
                    {isMobile ? formatAddress(walletAddress) : walletAddress}
                  </div>
                </div>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
              }}>
                Connected
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <button
                onClick={handleDisconnectWallet}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-danger)',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 44,
                  transition: 'opacity 0.2s',
                }}
              >
                <Unlink size={16} />
                Disconnect Wallet
              </button>
            </div>
          </>
        ) : (
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <button
              onClick={onConnectWallet}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#ffffff',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 44,
                transition: 'background 0.2s',
              }}
            >
              <Wallet size={16} />
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* ===== SUPPORT & LEGAL ===== */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>Support & Legal</div>

        <div
          style={rowClickableStyle}
          onClick={() => setShowContact(true)}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: 'rgba(59, 130, 246, 0.1)' }}>
              <MessageSquare size={18} color="#3b82f6" />
            </div>
            <div style={labelStyle}>Contact Us</div>
          </div>
          <ChevronRight size={18} color="var(--color-text-muted)" />
        </div>

        <div
          style={rowClickableStyle}
          onClick={() => setShowPrivacy(true)}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: 'rgba(107, 114, 128, 0.1)' }}>
              <FileText size={18} color="#6b7280" />
            </div>
            <div style={labelStyle}>Privacy Policy</div>
          </div>
          <ChevronRight size={18} color="var(--color-text-muted)" />
        </div>

        <div
          style={rowClickableStyle}
          onClick={() => window.open('/terms', '_blank')}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: 'rgba(107, 114, 128, 0.1)' }}>
              <Lock size={18} color="#6b7280" />
            </div>
            <div style={labelStyle}>Terms of Service</div>
          </div>
          <ExternalLink size={16} color="var(--color-text-muted)" />
        </div>

        <div
          style={{ ...rowClickableStyle, borderBottom: 'none' }}
          onClick={() => window.open('/faq', '_blank')}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: 'rgba(107, 114, 128, 0.1)' }}>
              <HelpCircle size={18} color="#6b7280" />
            </div>
            <div style={labelStyle}>Help & FAQ</div>
          </div>
          <ExternalLink size={16} color="var(--color-text-muted)" />
        </div>
      </div>

      {/* ===== SIGN OUT ===== */}
      <div style={sectionStyle}>
        <div
          style={{ ...rowClickableStyle, borderBottom: 'none' }}
          onClick={signOut}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={rowLeftStyle}>
            <div style={{ ...iconWrapStyle, background: 'rgba(239, 68, 68, 0.1)' }}>
              <LogOut size={18} color="#ef4444" />
            </div>
            <div style={{ ...labelStyle, color: '#ef4444' }}>Sign Out</div>
          </div>
        </div>
      </div>

      {/* Version info */}
      <div style={{
        textAlign: 'center',
        padding: '16px 0 32px',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--text-xs)',
      }}>
        FundTracer by DT v1.0.0
      </div>

      {/* Modals */}
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
