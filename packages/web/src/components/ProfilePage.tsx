import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../api';
import { User, Shield, CheckCircle, AlertTriangle, Save, Camera, Mail, ArrowLeft } from 'lucide-react';

interface ProfilePageProps {
    onBack?: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
    const { user, profile, refreshProfile } = useAuth();
    const [name, setName] = useState(profile?.username || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (profile) {
            setName(profile.username || '');
            setEmail(profile.email || '');
            setProfilePicture(profile.profilePicture || null);
        }
    }, [profile]);

    const handleProfilePictureClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Please select an image file' });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Image must be less than 5MB' });
                return;
            }

            // Read and preview the image
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
            await updateProfile({ displayName: name, email, profilePicture: profilePicture || undefined });
            await refreshProfile();
            setMessage({ type: 'success', text: 'Profile updated successfully' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (!user || !profile) {
        return <div className="loading-spinner"></div>;
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {onBack && (
                    <button
                        onClick={onBack}
                        className="btn btn-secondary btn-icon" // Assuming btn-icon exists or just use styling
                        style={{ padding: '8px', borderRadius: '50%', minWidth: 'auto', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1 className="gradient-text" style={{ fontSize: 'var(--text-3xl)', margin: 0 }}>
                    Your Profile
                </h1>
            </div>

            <div className="card" style={{ padding: 'var(--space-8)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: profilePicture ? 'transparent' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: 'var(--space-4)',
                        position: 'relative',
                        overflow: 'hidden',
                        border: '3px solid var(--color-border)'
                    }}>
                        {profilePicture ? (
                            <img
                                src={profilePicture}
                                alt="Profile"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            name ? name[0].toUpperCase() : <User size={48} />
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleProfilePictureClick}
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                borderRadius: '50%',
                                padding: '8px',
                                minWidth: 'auto',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Change Profile Picture"
                        >
                            <Camera size={16} />
                        </button>
                    </div>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>{name || 'Anonymous User'}</h2>
                            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                @{user.username}
                            </div>
                        </div>
                </div>

                <div className="grid grid-2" style={{ gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                    {/* Status Card */}
                    <div style={{
                        background: 'var(--color-bg-tertiary)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', textTransform: 'uppercase' }}>Account Status</h3>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>Current Tier</div>
                            <div className={`badge badge-${profile.tier}`} style={{ display: 'inline-flex', fontSize: 'var(--text-md)' }}>
                                {profile.tier?.toUpperCase()}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>Verification</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                {profile.isVerified ? (
                                    <>
                                        <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
                                        <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>PoH Verified</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
                                        <span style={{ color: 'var(--color-text-muted)' }}>Not Verified</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Usage Card */}
                    <div style={{
                        background: 'var(--color-bg-tertiary)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', textTransform: 'uppercase' }}>Daily Usage</h3>

                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                                <span style={{ fontSize: 'var(--text-sm)' }}>Analyses</span>
                                <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                                    {profile.usage.today} / {profile.usage.limit}
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '6px',
                                background: 'var(--color-bg-elevated)',
                                borderRadius: '3px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: profile.usage.limit === 'unlimited' ? '0%' : `${Math.min(100, (profile.usage.today / (profile.usage.limit as number)) * 100)}%`,
                                    height: '100%',
                                    background: 'var(--color-primary)',
                                    borderRadius: '3px'
                                }} />
                            </div>
                        </div>
                        {profile.usage.limit !== 'unlimited' && (
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                Resets daily at midnight UTC
                            </p>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="How should we call you?"
                            className="input"
                            maxLength={50}
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                            Email (Optional)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="For notifications"
                                className="input"
                                style={{ paddingLeft: '36px' }}
                            // disabled={true} // Enabled now
                            />
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                            Used for strictly important updates only.
                        </p>
                    </div>

                    {message && (
                        <div className={`alert ${message.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: 'var(--space-4)' }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSaving}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                            {isSaving ? (
                                <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                            ) : (
                                <Save size={18} />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
