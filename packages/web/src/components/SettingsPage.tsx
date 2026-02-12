import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateProfile } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import { useNotify } from '../contexts/ToastContext';
import { ContactModal } from './ContactModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import {
  User, Shield, CheckCircle, AlertTriangle, Save, Camera,
  Sun, Moon, Wallet, MessageSquare, FileText, LogOut,
  ChevronRight, Bell, Globe, Lock, HelpCircle, ExternalLink,
  ArrowUpCircle, Sparkles, Crown, Zap, Clock
} from 'lucide-react';

interface SettingsPageProps {
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress: string;
  onUpgrade?: () => void;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

const pulseAnimation = {
  scale: [1, 1.02, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export default function SettingsPage({ onConnectWallet, isWalletConnected, walletAddress, onUpgrade }: SettingsPageProps) {
  const { user, profile, refreshProfile, signOut } = useAuth();
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
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

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
      
      // Compress image before saving
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Resize to max 200x200 to keep file size small
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
        
        // Convert to JPEG with 80% quality for smaller size
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
      case 'max': return <Crown size={20} color="#8b5cf6" />;
      case 'pro': return <Zap size={20} color="#3b82f6" />;
      default: return <Sparkles size={20} color="#6b7280" />;
    }
  };

  // Not logged in state
  if (!user || !profile) {
    return (
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{
          maxWidth: isMobile ? 'none' : 680,
          margin: '0 auto',
          padding: isMobile ? '20px 16px' : '40px 24px',
          minHeight: '100vh',
          background: 'var(--color-bg)'
        }}
      >
        <motion.h1 
          variants={sectionVariants}
          style={{
            fontSize: isMobile ? '1.75rem' : '2rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginBottom: 32,
            background: 'linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Settings
        </motion.h1>

        <motion.div 
          variants={sectionVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div 
            onClick={toggleTheme}
            style={{
              padding: isMobile ? '18px 20px' : '22px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
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
                {isDark ? <Sun size={22} color="#fbbf24" /> : <Moon size={22} color="#3b82f6" />}
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
            <div
              style={{
                width: 52,
                height: 28,
                borderRadius: 14,
                background: isDark ? '#6366f1' : '#e5e7eb',
                position: 'relative',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <motion.div 
                animate={{ x: isDark ? 26 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  position: 'absolute',
                  top: 2,
                  left: 0,
                }}
              />
            </div>
          </div>
        </motion.div>

        <motion.p 
          variants={sectionVariants}
          style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            marginTop: 40,
            fontSize: '0.875rem',
          }}
        >
          Sign in to access all settings
        </motion.p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{
        maxWidth: isMobile ? 'none' : 800,
        margin: '0 auto',
        padding: isMobile ? '16px' : '32px 24px',
        minHeight: '100vh',
        background: 'var(--color-bg)'
      }}
    >
      {/* Header */}
      <motion.div variants={sectionVariants} style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: isMobile ? '1.75rem' : '2.25rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          marginBottom: 8,
          background: 'linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-accent) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Settings
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Profile Card */}
      <motion.div 
        variants={sectionVariants}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-elevated) 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 24,
          padding: isMobile ? '24px 20px' : '32px',
          marginBottom: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          background: `radial-gradient(circle, ${getTierColor(profile?.tier)}20 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />

        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: 24,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Avatar */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleProfilePictureClick}
            style={{
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: isMobile ? 100 : 120,
              height: isMobile ? 100 : 120,
              borderRadius: '50%',
              background: profilePicture 
                ? `url(${profilePicture}) center/cover`
                : 'linear-gradient(135deg, var(--color-accent) 0%, #8b5cf6 100%)',
              border: '4px solid var(--color-surface)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {!profilePicture && (
                <User size={isMobile ? 40 : 48} color="white" />
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
                border: '3px solid var(--color-surface)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              <Camera size={18} color="white" />
            </motion.div>
          </motion.div>

          {/* User Info */}
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', width: '100%' }}>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '1.875rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                marginBottom: 8,
              }}>
                {name || 'Anonymous User'}
              </h2>
              
              {/* Tier Badge */}
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
                {getTierIcon(profile?.tier)}
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

              {/* Wallet Address */}
              {walletAddress && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    justifyContent: isMobile ? 'center' : 'flex-start',
                    marginTop: 12,
                  }}
                >
                  <Wallet size={16} color="var(--color-text-muted)" />
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
                </motion.div>
              )}
            </motion.div>
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
        variants={sectionVariants}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: isMobile ? '20px' : '24px',
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(139, 92, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock size={20} color="#8b5cf6" />
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

        {/* Progress Bar */}
        {profile?.tier !== 'max' && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              height: 8,
              background: 'var(--color-bg-elevated)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((profile?.usage?.today || 0) / (profile?.tier === 'pro' ? 25 : 7)) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
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
        variants={sectionVariants}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={toggleTheme}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: isMobile ? '16px 20px' : '20px 24px',
          marginBottom: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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
            {isDark ? <Sun size={22} color="#fbbf24" /> : <Moon size={22} color="#3b82f6" />}
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
        <div
          style={{
            width: 52,
            height: 28,
            borderRadius: 14,
            background: isDark ? '#6366f1' : '#e5e7eb',
            position: 'relative',
            padding: 2,
          }}
        >
          <motion.div 
            animate={{ x: isDark ? 26 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: '#ffffff',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              position: 'absolute',
              top: 2,
              left: 0,
            }}
          />
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.div 
        variants={sectionVariants}
        whileHover={{ scale: 1.01, backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
        whileTap={{ scale: 0.99 }}
        onClick={signOut}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          padding: isMobile ? '16px 20px' : '20px 24px',
          marginBottom: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          transition: 'background 0.2s ease',
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
          <LogOut size={22} color="#ef4444" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444' }}>
            Sign Out
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            Disconnect your wallet
          </div>
        </div>
        <ChevronRight size={20} color="var(--color-text-muted)" />
      </motion.div>

      {/* Contact & Privacy */}
      <motion.div variants={sectionVariants} style={{ marginTop: 32 }}>
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'center',
        }}>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowContact(true)}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MessageSquare size={16} />
            Contact Support
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPrivacy(true)}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FileText size={16} />
            Privacy Policy
          </motion.button>
        </div>
      </motion.div>

      {/* Modals */}
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* Toast Message */}
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
