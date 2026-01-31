import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Edit2, Ban, CheckCircle, XCircle } from 'lucide-react';

interface User {
    id: string;
    email: string;
    displayName?: string;
    walletAddress?: string;
    tier: 'free' | 'pro' | 'max';
    pohVerified: boolean;
    blacklisted: boolean;
    analysisCount: number;
    createdAt: number;
    lastActive?: number;
}

interface Props {
    onUserUpdated: () => void;
}

export default function MobileUserManagement({ onUserUpdated }: Props) {
    const { token } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            if (!token) return;

            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch users');

            const data = await response.json();

            const usersData = data.users.map((u: any) => ({
                id: u.id,
                email: u.email || '',
                displayName: u.displayName,
                walletAddress: u.walletAddress || u.address || u.id,
                tier: u.tier || 'free',
                pohVerified: u.pohVerified || false,
                blacklisted: u.blacklisted || false,
                analysisCount: u.analysisCount || 0,
                createdAt: u.createdAt || Date.now(),
                lastActive: u.lastActive,
            })) as User[];

            usersData.sort((a, b) => b.createdAt - a.createdAt);
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeTier = async (userId: string, newTier: 'free' | 'pro' | 'max') => {
        try {
            if (!token) return;
            
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tier: newTier })
            });

            if (!response.ok) throw new Error('Failed to update tier');

            await loadUsers();
            onUserUpdated();
            setEditingUserId(null);
            alert(`User tier updated to ${newTier}`);
        } catch (error) {
            console.error('Error updating tier:', error);
            alert('Failed to update tier');
        }
    };

    const handleToggleBlacklist = async (userId: string, currentStatus: boolean) => {
        const confirmed = window.confirm(
            currentStatus
                ? 'Are you sure you want to remove this user from the blacklist?'
                : 'Are you sure you want to blacklist this user? They will lose access to the platform.'
        );

        if (!confirmed) return;

        try {
            if (!token) return;
            
            const endpoint = currentStatus ? 'unban' : 'ban';
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users/${userId}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to update blacklist status');

            await loadUsers();
            onUserUpdated();
            alert(currentStatus ? 'User removed from blacklist' : 'User blacklisted');
        } catch (error) {
            console.error('Error toggling blacklist:', error);
            alert('Failed to update blacklist status');
        }
    };

    const handleTogglePoH = async (userId: string, currentStatus: boolean) => {
        try {
            if (!token) return;
            
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pohVerified: !currentStatus })
            });

            if (!response.ok) throw new Error('Failed to update PoH status');

            await loadUsers();
            onUserUpdated();
            alert(currentStatus ? 'PoH verification removed' : 'PoH verified');
        } catch (error) {
            console.error('Error toggling PoH:', error);
            alert('Failed to update PoH status');
        }
    };

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.walletAddress?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }}></div>
            </div>
        );
    }

    return (
        <div className="card" style={{ boxShadow: 'none', border: 'none', background: 'transparent', padding: 0 }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>User Management</h3>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {filteredUsers.map(user => (
                    <div key={user.id} style={{
                        background: 'var(--color-bg-secondary)',
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{user.displayName || 'Anonymous'}</div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>
                                    {user.email || 'No email'}
                                </div>
                            </div>
                            {user.blacklisted ? (
                                <span className="badge badge-blacklisted">Banned</span>
                            ) : (
                                <span className="badge badge-success">Active</span>
                            )}
                        </div>

                        <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Wallet:</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>
                                    {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : '-'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Analyses:</span>
                                <span>{user.analysisCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Tier:</span>
                                {editingUserId === user.id ? (
                                    <select
                                        value={user.tier}
                                        onChange={(e) => handleChangeTier(user.id, e.target.value as any)}
                                        style={{ fontSize: 'var(--text-xs)', padding: '2px' }}
                                    >
                                        <option value="free">Free</option>
                                        <option value="pro">Pro</option>
                                        <option value="max">Max</option>
                                    </select>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <span className={`badge badge-${user.tier}`}>{user.tier.toUpperCase()}</span>
                                        <button
                                            onClick={() => setEditingUserId(user.id)}
                                            className="btn btn-sm"
                                            style={{ padding: '4px', background: 'var(--color-bg-tertiary)' }}
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>PoH Verified:</span>
                                <button
                                    onClick={() => handleTogglePoH(user.id, user.pohVerified)}
                                    style={{ background: 'transparent', border: 'none' }}
                                >
                                    {user.pohVerified ? (
                                        <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                                    ) : (
                                        <XCircle size={18} style={{ color: 'var(--color-text-muted)' }} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
                            <button
                                onClick={() => handleToggleBlacklist(user.id, user.blacklisted)}
                                className={`btn btn-sm ${user.blacklisted ? 'btn-success' : 'btn-danger'}`}
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}
                            >
                                {user.blacklisted ? (
                                    <>
                                        <CheckCircle size={14} /> Unban User
                                    </>
                                ) : (
                                    <>
                                        <Ban size={14} /> Ban User
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
