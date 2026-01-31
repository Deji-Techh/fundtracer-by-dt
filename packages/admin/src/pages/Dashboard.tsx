import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

import StatsOverview from '../components/StatsOverview';
import UsageCharts from '../components/UsageCharts';
import UserManagement from '../components/UserManagement';
import RecentActivity from '../components/RecentActivity';
import { LogOut, Users, Activity, TrendingUp } from 'lucide-react';

export interface DashboardStats {
    totalVisitors: number;
    activeUsers: number;
    pohVerifiedUsers: number;
    totalRevenue: number;
    totalAnalyses: number;
    freeUsers: number;
    proUsers: number;
    maxUsers: number;
    blacklistedUsers: number;
}

export interface ChainUsage {
    ethereum: number;
    arbitrum: number;
    base: number;
    linea: number;
}

export interface FeatureUsage {
    wallet: number;
    compare: number;
    sybil: number;
    contract: number;
}

export default function Dashboard() {
    const { user, logout, token } = useAuth();
    const [stats, setStats] = useState<DashboardStats>({
        totalVisitors: 0,
        activeUsers: 0,
        pohVerifiedUsers: 0,
        totalRevenue: 0,
        totalAnalyses: 0,
        freeUsers: 0,
        proUsers: 0,
        maxUsers: 0,
        blacklistedUsers: 0,
    });
    const [chainUsage, setChainUsage] = useState<ChainUsage>({
        ethereum: 0,
        arbitrum: 0,
        base: 0,
        linea: 0,
    });
    const [featureUsage, setFeatureUsage] = useState<FeatureUsage>({
        wallet: 0,
        compare: 0,
        sybil: 0,
        contract: 0,
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity'>('overview');

    useEffect(() => {
        loadDashboardData();
    }, [token]);

    const loadDashboardData = async () => {
        try {
            console.log('[Dashboard] Starting data load via API...');
            setLoading(true);

            if (!token) {
                console.error('No auth token available');
                return;
            }

            // Fetch stats from server (bypass client-side rules)
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch stats: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[Dashboard] API Response:', data);

            // Update state
            setStats(data.stats);
            setChainUsage(data.chainUsage);
            setFeatureUsage(data.featureUsage);

        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };



    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
            {/* Header */}
            <header style={{
                background: 'var(--color-bg-secondary)',
                borderBottom: '1px solid var(--color-border)',
                padding: 'var(--space-4) var(--space-6)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>FundTracer Admin</h1>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                            Welcome back, {user?.username || user?.email}
                        </p>
                    </div>

                    <button onClick={logout} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: TrendingUp },
                        { id: 'users', label: 'Users', icon: Users },
                        { id: 'activity', label: 'Activity', icon: Activity },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                padding: 'var(--space-2) var(--space-4)',
                                background: activeTab === tab.id ? 'var(--color-bg-tertiary)' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '2px solid var(--color-info)' : '2px solid transparent',
                                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: 'var(--text-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                transition: 'all 0.2s',
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content */}
            <main style={{ padding: 'var(--space-6)' }}>
                {activeTab === 'overview' && (
                    <>
                        <StatsOverview stats={stats} />
                        <UsageCharts chainUsage={chainUsage} featureUsage={featureUsage} stats={stats} />
                    </>
                )}

                {activeTab === 'users' && (
                    <UserManagement onUserUpdated={loadDashboardData} />
                )}

                {activeTab === 'activity' && (
                    <RecentActivity />
                )}
            </main>
        </div>
    );
}
