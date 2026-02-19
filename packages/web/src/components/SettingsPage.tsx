import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserIcon,
  Shield01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Camera01Icon,
  Sun02Icon,
  Moon02Icon,
  Wallet01Icon,
  MessageNotification01Icon,
  File02Icon,
  Logout03Icon,
  ArrowRight01Icon,
  Clock01Icon,
  CrownIcon,
  ZapIcon,
  SparklesIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateProfile } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotify } from '../contexts/ToastContext';
import { ContactModal } from './ContactModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface SettingsPageProps {
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
  onUpgrade?: () => void;
}

export default function SettingsPage({ onConnectWallet, isWalletConnected, walletAddress, onUpgrade }: SettingsPageProps) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const isMobile = useIsMobile();
  const notify = useNotify();

  const [name, setName] = useState(profile?.username || '');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfilePicture(compressedDataUrl);
      };
      
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result as string;
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

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'max': return '#8b5cf6';
      case 'pro': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'max': return CrownIcon;
      case 'pro': return ZapIcon;
      default: return SparklesIcon;
    }
  };

  if (!user || !profile) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="page-container"
      >
        <div className="page-header-flat">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="section-flat"
          onClick={toggleTheme}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px' : '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <motion.div 
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HugeiconsIcon icon={isDark ? Sun02Icon : Moon02Icon} size={22} strokeWidth={1.5} color={isDark ? '#fbbf24' : '#3b82f6'} />
              </motion.div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Theme
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {isDark ? 'Dark mode' : 'Light mode'}
                </div>
              </div>
            </div>
            <motion.div
              animate={{ x: isDark ? 26 : 2 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: '#ffffff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            />
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            marginTop: 40,
            fontSize: '0.875rem',
            padding: '0 32px',
          }}
        >
          Sign in to access all settings
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="page-header-flat">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="section-flat"
      >
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: 24 }}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleProfilePictureClick}
            style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: isMobile ? 100 : 120,
              height: isMobile ? 100 : 120,
              borderRadius: '50%',
              background: profilePicture 
                ? `url(${profilePicture}) center/cover`
                : 'linear-gradient(135deg, var(--color-accent) 0%, #8b5cf6 100%)',
              border: '4px solid var(--color-bg)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {!profilePicture && (
                <HugeiconsIcon icon={UserIcon} size={isMobile ? 40 : 48} strokeWidth={1.5} color="white" />
              )}
            </div>
            <motion.div 
              whileHover={{ scale: 1.1 }}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid var(--color-bg)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              <HugeiconsIcon icon={Camera01Icon} size={18} strokeWidth={2} color="white" />
            </motion.div>
          </motion.div>

          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', width: '100%' }}>
            <h2 style={{
              fontSize: isMobile ? '1.5rem' : '1.875rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
            }}>
              {name || 'Anonymous User'}
            </h2>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 20,
                background: `${getTierColor(profile?.tier)}15`,
                border: `1px solid ${getTierColor(profile?.tier)}30`,
                marginBottom: 12,
              }}
            >
              <HugeiconsIcon icon={getTierIcon(profile?.tier)} size={20} strokeWidth={1.5} color={getTierColor(profile?.tier)} />
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: getTierColor(profile?.tier),
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {profile?.tier || 'Free'} Tier
              </span>
            </motion.div>

            {walletAddress && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: isMobile ? 'center' : 'flex-start',
                marginTop: 12,
              }}>
                <HugeiconsIcon icon={Wallet01Icon} size={16} strokeWidth={1.5} color="var(--color-text-muted)" />
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg-elevated)',
                  padding: '6px 12px',
                  borderRadius: 8,
                }}>
                  {formatAddress(walletAddress)}
                </span>
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </motion.div>

      {/* Usage Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="section-flat"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(139, 92, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HugeiconsIcon icon={Clock01Icon} size={22} strokeWidth={1.5} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Usage (per 4 hours)
            </div>
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 700, 
              color: 'var(--color-text-primary)',
              fontFamily: 'monospace',
            }}>
              {profile?.tier === 'max' ? 'Unlimited' : `${profile?.usage?.today || 0} / ${profile?.tier === 'pro' ? 25 : 7}`}
            </div>
          </div>
        </div>

        {profile?.tier !== 'max' && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              height: 8,
              background: 'var(--color-bg-elevated)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((profile?.usage?.today || 0) / (profile?.tier === 'pro' ? 25 : 7)) * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)',
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--color-text-muted)', 
              marginTop: 8,
              textAlign: 'right',
            }}>
              Resets every 4 hours
            </div>
          </div>
        )}
      </motion.div>

      {/* Theme Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="section-flat"
        onClick={toggleTheme}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '8px 0' : '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <motion.div 
              animate={{ rotate: isDark ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HugeiconsIcon icon={isDark ? Sun02Icon : Moon02Icon} size={22} strokeWidth={1.5} color={isDark ? '#fbbf24' : '#3b82f6'} />
            </motion.div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Appearance
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {isDark ? 'Dark mode' : 'Light mode'}
              </div>
            </div>
          </div>
          <div style={{
            width: 52,
            height: 28,
            borderRadius: 14,
            background: isDark ? '#6366f1' : '#e5e7eb',
            position: 'relative',
            padding: 2,
          }}>
            <motion.div 
              animate={{ x: isDark ? 26 : 2 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: '#ffffff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                position: 'absolute',
                top: 2,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="section-flat"
        onClick={signOut}
        style={{ cursor: 'pointer' }}
      >
        <motion.div 
          whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
          whileTap={{ scale: 0.99 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: isMobile ? '8px 0' : '12px 0',
          }}
        >
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HugeiconsIcon icon={Logout03Icon} size={22} strokeWidth={1.5} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>
              Sign Out
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Disconnect your wallet
            </div>
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} color="var(--color-text-muted)" />
        </motion.div>
      </motion.div>

      {/* Contact & Privacy */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ marginTop: 32, padding: isMobile ? '0 16px' : '0 32px' }}
      >
        <div style={{ display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center' }}>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowContact(true)}
            className="btn-flat btn-flat-secondary"
          >
            <HugeiconsIcon icon={MessageNotification01Icon} size={16} strokeWidth={2} />
            Contact Support
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPrivacy(true)}
            className="btn-flat btn-flat-secondary"
          >
            <HugeiconsIcon icon={File02Icon} size={16} strokeWidth={2} />
            Privacy Policy
          </motion.button>
        </div>
      </motion.div>

      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              borderRadius: 12,
              background: message.type === 'success' ? '#10b981' : '#ef4444',
              color: 'white',
              fontWeight: 500,
              zIndex: 9999,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            }}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}