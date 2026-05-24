import { DashboardStats } from '../pages/Dashboard';
import { Users, Eye, Shield, DollarSign, Activity, UserCheck, Ban, Play } from 'lucide-react';

interface Props {
    stats: DashboardStats;
}

export default function StatsOverview({ stats }: Props) {
    const statCards = [
        {
            label: 'Total Visitors',
            value: stats.totalVisitors.toLocaleString(),
            icon: Eye,
            color: 'var(--color-info)',
            change: null,
        },
        {
            label: 'Active Users',
            value: stats.activeUsers.toLocaleString(),
            icon: Users,
            color: 'var(--color-success)',
            change: null,
        },
        {
            label: 'PoH Verified',
            value: stats.pohVerifiedUsers.toLocaleString(),
            icon: Shield,
            color: 'var(--chart-1)',
            change: null,
        },
        {
            label: 'Total Revenue',
            value: `${stats.totalRevenue.toFixed(4)} ETH`,
            icon: DollarSign,
            color: 'var(--color-warning)',
            change: null,
        },
        {
            label: 'Total Analyses',
            value: stats.totalAnalyses.toLocaleString(),
            icon: Activity,
            color: 'var(--chart-2)',
            change: null,
        },
        {
            label: 'Try Now Previews',
            value: (stats.totalPreviews || 0).toLocaleString(),
            icon: Play,
            color: 'var(--color-accent)',
            change: null,
        },
        {
            label: 'Pro Users',
            value: stats.proUsers.toLocaleString(),
            icon: UserCheck,
            color: 'var(--color-info)',
            change: null,
        },
        {
            label: 'Max Tier Users',
            value: stats.maxUsers.toLocaleString(),
            icon: Shield,
            color: 'var(--chart-1)',
            change: null,
        },
        {
            label: 'Blacklisted',
            value: stats.blacklistedUsers.toLocaleString(),
            icon: Ban,
            color: 'var(--color-danger)',
            change: null,
        },
    ];

    return (
        <div style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                Overview
            </h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--space-4)',
            }}>
                {statCards.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div className="stat-label">{stat.label}</div>
                                <div className="stat-value">{stat.value}</div>
                            </div>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: 'var(--radius-md)',
                                background: `${stat.color}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <stat.icon size={20} style={{ color: stat.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
