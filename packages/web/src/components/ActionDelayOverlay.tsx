import React, { useEffect, useState } from 'react';
import './ActionDelayOverlay.css';

interface ActionDelayOverlayProps {
    isVisible: boolean;
    delaySeconds: number;
    onComplete: () => void;
    tier: 'free' | 'pro' | 'max';
}

const ActionDelayOverlay: React.FC<ActionDelayOverlayProps> = ({
    isVisible,
    delaySeconds,
    onComplete,
    tier
}) => {
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(delaySeconds);

    useEffect(() => {
        if (!isVisible || delaySeconds === 0) {
            if (isVisible) onComplete();
            return;
        }

        setProgress(0);
        setTimeLeft(delaySeconds);

        const totalMs = delaySeconds * 1000;
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const currentProgress = Math.min((elapsed / totalMs) * 100, 100);
            const remaining = Math.max(Math.ceil((totalMs - elapsed) / 1000), 0);

            setProgress(currentProgress);
            setTimeLeft(remaining);

            if (elapsed >= totalMs) {
                clearInterval(interval);
                onComplete();
            }
        }, 50);

        return () => clearInterval(interval);
    }, [isVisible, delaySeconds, onComplete]);

    if (!isVisible || delaySeconds === 0) return null;

    const tierColors = {
        free: { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)' },
        pro: { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139, 92, 246, 0.4)' },
        max: { primary: '#98989d', secondary: '#f5f5f7', glow: 'rgba(152, 152, 157, 0.34)' }
    };

    const colors = tierColors[tier];

    return (
        <div className="action-delay-overlay">
            <div className="delay-content">
                <div className="delay-ring-container">
                    {/* Outer glow ring */}
                    <div
                        className="delay-glow-ring"
                        style={{
                            boxShadow: `0 0 60px ${colors.glow}, 0 0 120px ${colors.glow}`,
                            borderColor: colors.primary
                        }}
                    />

                    {/* Animated particles */}
                    <div className="delay-particles">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="particle"
                                style={{
                                    '--rotation': `${i * 30}deg`,
                                    '--delay': `${i * 0.1}s`,
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                } as React.CSSProperties}
                            />
                        ))}
                    </div>

                    {/* Progress ring */}
                    <svg className="delay-progress-ring" viewBox="0 0 120 120">
                        <defs>
                            <linearGradient id={`progress-gradient-${tier}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={colors.primary} />
                                <stop offset="100%" stopColor={colors.secondary} />
                            </linearGradient>
                        </defs>
                        <circle
                            className="progress-bg"
                            cx="60"
                            cy="60"
                            r="52"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="6"
                            fill="none"
                        />
                        <circle
                            className="progress-bar"
                            cx="60"
                            cy="60"
                            r="52"
                            stroke={`url(#progress-gradient-${tier})`}
                            strokeWidth="6"
                            fill="none"
                            strokeLinecap="round"
                            style={{
                                strokeDasharray: `${2 * Math.PI * 52}`,
                                strokeDashoffset: `${2 * Math.PI * 52 * (1 - progress / 100)}`
                            }}
                        />
                    </svg>

                    {/* Center content */}
                    <div className="delay-center">
                        <span
                            className="delay-timer"
                            style={{ color: colors.primary }}
                        >
                            {timeLeft}s
                        </span>
                    </div>
                </div>

                <div className="delay-text">
                    <h3>Processing Request</h3>
                    <p className="delay-tier-info">
                        {tier === 'free' && (
                            <>
                                <span style={{ color: colors.primary }}>Free tier</span> - 6s cooldown
                            </>
                        )}
                        {tier === 'pro' && (
                            <>
                                <span style={{ color: colors.primary }}>Pro tier</span> - 2s cooldown
                            </>
                        )}
                        {tier === 'max' && (
                            <>
                                <span style={{ color: colors.primary }}>Max tier</span> - No delay!
                            </>
                        )}
                    </p>
                    {tier === 'free' && (
                        <p className="delay-upgrade-hint">
                            Upgrade to <strong>Pro</strong> for faster access →
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionDelayOverlay;
