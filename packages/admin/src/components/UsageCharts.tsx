import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChainUsage, FeatureUsage, DashboardStats } from '../pages/Dashboard';

interface Props {
    chainUsage: ChainUsage;
    featureUsage: FeatureUsage;
    previewChainUsage: Record<string, number>;
    stats: DashboardStats;
}

const CHAIN_COLORS: Record<string, string> = {
    ethereum: '#627EEA',
    arbitrum: '#28A0F0',
    base: '#0052FF',
    linea: '#61DFFF',
    polygon: '#8247E5',
    bsc: '#F0B90B',
};

export default function UsageCharts({ chainUsage, featureUsage, previewChainUsage, stats }: Props) {
    const chainData = [
        { name: 'Ethereum', value: chainUsage.ethereum, color: CHAIN_COLORS.ethereum },
        { name: 'Arbitrum', value: chainUsage.arbitrum, color: CHAIN_COLORS.arbitrum },
        { name: 'Base', value: chainUsage.base, color: CHAIN_COLORS.base },
        { name: 'Linea', value: chainUsage.linea, color: CHAIN_COLORS.linea },
    ].filter(item => item.value > 0);

    const featureData = [
        { name: 'Wallet Analysis', value: featureUsage.wallet },
        { name: 'Compare Wallets', value: featureUsage.compare },
        { name: 'Sybil Detection', value: featureUsage.sybil },
        { name: 'Contract Analysis', value: featureUsage.contract },
    ];

    const tierData = [
        { name: 'Free', value: stats.freeUsers, color: '#6b6b6b' },
        { name: 'Pro', value: stats.proUsers, color: '#3b82f6' },
        { name: 'Max', value: stats.maxUsers, color: '#8b5cf6' },
    ].filter(item => item.value > 0);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
            {/* Chain Distribution */}
            <div className="card">
                <h3 className="card-title">Chain Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chainData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                            {chainData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Feature Usage */}
            <div className="card">
                <h3 className="card-title">Feature Usage</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={featureData}>
                        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                        <RechartsTooltip
                            contentStyle={{
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '8px',
                            }}
                        />
                        <Bar dataKey="value" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* User Tiers */}
            <div className="card">
                <h3 className="card-title">User Tier Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={tierData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            label
                        >
                            {tierData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Try Now Preview Chain Usage */}
            {Object.keys(previewChainUsage).length > 0 && (
                <div className="card">
                    <h3 className="card-title">Try Now Previews by Chain</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={Object.entries(previewChainUsage).map(([chain, count]) => ({
                                    name: chain.charAt(0).toUpperCase() + chain.slice(1),
                                    value: count,
                                    color: CHAIN_COLORS[chain] || '#888',
                                }))}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                                {Object.entries(previewChainUsage).map(([chain], index) => (
                                    <Cell key={index} fill={CHAIN_COLORS[chain] || '#888'} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
