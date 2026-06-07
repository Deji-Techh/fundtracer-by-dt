import React, { useState } from 'react';
import { ArrowLeft, Check, Loader, Mail, X } from 'lucide-react';
import { API_BASE, getAuthToken } from '../api';
import { useNotify } from '../contexts/ToastContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tier = 'pro' | 'max';
type Step = 'select' | 'details';

const tiers: Record<Tier, {
    name: string;
    price: string;
    badge?: string;
    features: string[];
}> = {
    pro: {
        name: 'PRO TIER',
        price: '$15 / month',
        features: [
            'All chains (7+)',
            '300 analyses/day',
            '2s action delay',
            'Fast API access',
            'Priority support'
        ]
    },
    max: {
        name: 'MAX TIER',
        price: '$25 / month',
        badge: 'BEST VALUE',
        features: [
            'Access to all chains',
            'Unlimited analyses',
            'Sybil detection',
            'API access',
            'No action delay',
            'Priority support',
            'Advanced analytics',
            'Export reports'
        ]
    }
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
    const [step, setStep] = useState<Step>('select');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const notify = useNotify();

    const handleClose = () => {
        setStep('select');
        setSelectedTier(null);
        setCheckoutLoading(false);
        onClose();
    };

    const handleSelectTier = (tier: Tier) => {
        setSelectedTier(tier);
        setStep('details');
    };

    const handleCheckout = async () => {
        if (!selectedTier) return;

        setCheckoutLoading(true);
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/payment/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: 'include',
                body: JSON.stringify({ tier: selectedTier }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success || !data.checkoutUrl) {
                throw new Error(data.error || 'Checkout is temporarily unavailable.');
            }

            window.location.href = data.checkoutUrl;
        } catch (error: any) {
            notify.error(error.message || 'Failed to start checkout. Please try again or contact support.');
            setCheckoutLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
                <button type="button" className="modal-close" onClick={handleClose}>
                    <X size={20} />
                </button>

                {step === 'select' && (
                    <>
                        <div className="payment-modal-header">
                            <h2>Upgrade to Premium</h2>
                            <p className="payment-subtitle">Choose a plan and complete secure checkout.</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '8px', padding: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Mail size={16} />
                                <span><strong>Access is tied to your account.</strong> Your tier activates after checkout confirmation.</span>
                            </p>
                        </div>

                        <div className="payment-tiers">
                            {(Object.keys(tiers) as Tier[]).map((tier) => (
                                <button
                                    key={tier}
                                    type="button"
                                    className={`payment-tier ${tier === 'max' ? 'payment-tier-featured animate-card-2' : 'animate-card-1'}`}
                                    onClick={() => handleSelectTier(tier)}
                                    style={{ cursor: 'pointer', textAlign: 'left' }}
                                >
                                    {tiers[tier].badge && <div className="tier-badge">{tiers[tier].badge}</div>}
                                    <div className="tier-header">
                                        <span className="tier-label">{tiers[tier].name}</span>
                                        <span className="tier-price">{tiers[tier].price}</span>
                                    </div>
                                    <div className="tier-features">
                                        {tiers[tier].features.slice(0, tier === 'max' ? 5 : 4).map((feature) => (
                                            <span key={feature}><Check size={14} style={{ marginRight: '6px' }} />{feature}</span>
                                        ))}
                                    </div>
                                    <span className={`btn ${tier === 'max' ? 'btn-primary' : 'btn-secondary'}`} style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}>
                                        Select {tier === 'max' ? 'Max' : 'Pro'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {step === 'details' && selectedTier && (
                    <>
                        <div className="payment-modal-header">
                            <h2>{tiers[selectedTier].name}</h2>
                            <p className="payment-subtitle" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                {tiers[selectedTier].price}
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
                                Included:
                            </h3>
                            <div className="tier-features" style={{ display: 'grid', gap: '8px' }}>
                                {tiers[selectedTier].features.map((feature) => (
                                    <span key={feature} style={{ fontSize: '14px' }}><Check size={14} style={{ marginRight: '6px' }} />{feature}</span>
                                ))}
                            </div>
                        </div>

                        <p className="payment-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Checkout is processed securely. Premium access activates automatically after the payment webhook confirms your subscription.
                        </p>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setStep('select'); setSelectedTier(null); }}
                                disabled={checkoutLoading}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <ArrowLeft size={18} />
                                Go Back
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleCheckout}
                                disabled={checkoutLoading}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {checkoutLoading ? <Loader size={18} className="loading-spinner" /> : null}
                                Continue to Checkout
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
