import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, DollarSign, User, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: string;
    type: 'payment' | 'analysis' | 'tier_change' | 'blacklist' | 'unblacklist' | 'poh_verify' | 'poh_unverify';
    userId: string;
    userEmail?: string;
    details: any;
    timestamp: number;
}

export default function RecentActivity() {
    const { token } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRecentActivity();
    }, [token]);

    const loadRecentActivity = async () => {
        try {
            setError(null);

            if (!token) {
                console.error('No auth token available');
                setError('Authentication required');
                return;
            }

            // Fetch activity from server API
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/activity`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch activity: ${response.statusText}`);
            }

            const data = await response.json();
            setActivities(data.activities || []);
        } catch (error: any) {
            console.error('Error loading recent activity:', error);
            setError(error.message || 'Failed to load activity');
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'payment': return DollarSign;
            case 'tier_change': return User;
            case 'blacklist':
            case 'unblacklist': return AlertTriangle;
            case 'poh_verify':
            case 'poh_unverify': return Activity;
            default: return Activity;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'payment': return 'var(--color-success)';
            case 'tier_change': return 'var(--color-info)';
            case 'blacklist': return 'var(--color-danger)';
            case 'unblacklist': return 'var(--color-success)';
            case 'poh_verify': return 'var(--color-success)';
            case 'poh_unverify': return 'var(--color-warning)';
            default: return 'var(--color-text-muted)';
        }
    };

    const formatActivityMessage = (activity: ActivityItem) => {
        switch (activity.type) {
            case 'payment':
                return `Payment received: ${activity.details.amount} ETH for ${activity.details.tierUnlocked} tier`;
            case 'tier_change':
                return `User tier changed to ${activity.details.newTier}`;
            case 'blacklist':
                return 'User blacklisted';
            case 'unblacklist':
                return 'User removed from blacklist';
            case 'poh_verify':
                return 'PoH verification granted';
            case 'poh_unverify':
                return 'PoH verification removed';
            default:
                return activity.type;
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }}></div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title">Recent Activity</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {error ? (
                    <p style={{ color: 'var(--color-danger)', textAlign: 'center', padding: 'var(--space-6)' }}>
                        {error}
                    </p>
                ) : activities.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>
                        No recent activity
                    </p>
                ) : (
                    activities.map(activity => {
                        const Icon = getActivityIcon(activity.type);
                        const color = getActivityColor(activity.type);

                        return (
                            <div
                                key={activity.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-3)',
                                    background: 'var(--color-bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: `3px solid ${color}`,
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'var(--radius-md)',
                                    background: `${color}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Icon size={16} style={{ color }} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                                        {formatActivityMessage(activity)}
                                    </div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                        {activity.userEmail || activity.userId} • {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
