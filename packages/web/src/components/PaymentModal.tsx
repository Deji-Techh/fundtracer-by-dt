import React, { useState } from 'react';
import { X, Copy, CheckCircle, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tier = 'pro' | 'max' | null;
type Step = 'select' | 'details' | 'payment' | 'verifying';

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [selectedTier, setSelectedTier] = useState<Tier>(null);
    const [step, setStep] = useState<Step>('select');
    const [copied, setCopied] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const paymentAddress = '0xFF1A1D11CB6bad91C6d9250082D1DF44d84e4b87';

    const tiers = {
        pro: {
            name: 'PRO TIER',
            price: '5 USDT',
            priceValue: 5,
            features: [
                '30 days access',
                'Access to Linea, Arb, Base',
                'No gas fees',
                '25 daily analyses',
                '2s action delay',
                'Fast API access',
                'Priority support'
            ]
        },
        max: {
            name: 'MAX TIER',
            price: '10 USDT',
            priceValue: 10,
            badge: 'BEST VALUE',
            features: [
                '30 days access',
                'Access to All Chains',
                'Unlimited analyses',
                'Sybil detection',
                'API access',
                'No action delay',
                'Premium support',
                'Advanced analytics',
                'Export reports'
            ]
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(paymentAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSelectTier = (tier: Tier) => {
        setSelectedTier(tier);
        setStep('details');
    };

    const handleGoBack = () => {
        if (step === 'details') {
            setStep('select');
            setSelectedTier(null);
        } else if (step === 'payment') {
            setStep('details');
        } else if (step === 'verifying') {
            setStep('payment');
            setIsVerifying(false);
        }
    };

    const handlePayNow = () => {
        setStep('payment');
    };

    const handleVerifyPayment = async () => {
        if (!user?.address || !selectedTier) return;

        setIsVerifying(true);
        setStep('verifying');

        try {
            // Get auth token from localStorage
            const token = localStorage.getItem('authToken');

            // Call backend to verify payment
            const response = await fetch('/api/payment/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({
                    userAddress: user.address,
                    tier: selectedTier,
                    paymentAddress
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                alert('✅ ' + (data.message || 'Payment verified! Your account has been upgraded to ' + selectedTier.toUpperCase() + ' tier.') + 
                      '\n\n📧 Your tier is tied to your account email, not your wallet. You can connect different wallets freely!');
                onClose();
                window.location.reload(); // Refresh to update tier
            } else {
                alert('⚠️ ' + (data.error || 'Payment not found. Please wait 2 minutes after sending, then try again.'));
                setStep('payment');
            }
        } catch (error: any) {
            console.error('Verification error:', error);
            alert('❌ Verification failed: ' + (error.message || 'Please try again or contact support.'));
            setStep('payment');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClose = () => {
        setStep('select');
        setSelectedTier(null);
        setIsVerifying(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={handleClose}>
                    <X size={20} />
                </button>

                {/* Step 1: Select Tier */}
                {step === 'select' && (
                    <>
                        <div className="payment-modal-header">
                            <h2>Upgrade to Premium</h2>
                            <p className="payment-subtitle">Choose your tier to unlock advanced features</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '8px', padding: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                                📧 <strong>Tiers are tied to your account</strong> - You can change wallets anytime, your premium access stays with your email.
                            </p>
                        </div>

                        <div className="payment-tiers">
                            <div
                                className="payment-tier animate-card-1"
                                onClick={() => handleSelectTier('pro')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="tier-header">
                                    <span className="tier-label">{tiers.pro.name}</span>
                                    <span className="tier-price">{tiers.pro.price}</span>
                                </div>
                                <div className="tier-features">
                                    {tiers.pro.features.slice(0, 4).map((feature, i) => (
                                        <span key={i}>✓ {feature}</span>
                                    ))}
                                </div>
                                <button className="btn btn-secondary" style={{ marginTop: '16px', width: '100%' }}>
                                    Select Pro
                                </button>
                            </div>

                            <div
                                className="payment-tier payment-tier-featured animate-card-2"
                                onClick={() => handleSelectTier('max')}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="tier-badge">{tiers.max.badge}</div>
                                <div className="tier-header">
                                    <span className="tier-label">{tiers.max.name}</span>
                                    <span className="tier-price">{tiers.max.price}</span>
                                </div>
                                <div className="tier-features">
                                    {tiers.max.features.slice(0, 5).map((feature, i) => (
                                        <span key={i}>✓ {feature}</span>
                                    ))}
                                </div>
                                <button className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }}>
                                    Select Max
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 2: Tier Details */}
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
                                Full Features:
                            </h3>
                            <div className="tier-features" style={{ display: 'grid', gap: '8px' }}>
                                {tiers[selectedTier].features.map((feature, i) => (
                                    <span key={i} style={{ fontSize: '14px' }}>✓ {feature}</span>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleGoBack}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <ArrowLeft size={18} />
                                Go Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handlePayNow}
                                style={{ flex: 1 }}
                            >
                                Pay Now
                            </button>
                        </div>
                    </>
                )}

                {/* Step 3: Payment */}
                {step === 'payment' && selectedTier && (
                    <>
                        <div className="payment-modal-header">
                            <h2>Complete Payment</h2>
                            <p className="payment-subtitle">
                                Send <strong>{tiers[selectedTier].price}</strong> to activate {tiers[selectedTier].name}
                            </p>
                        </div>

                        <div className="payment-address-section">
                            <label className="payment-label">Payment Address (Linea USDT)</label>
                            <div className="payment-address-box">
                                <code className="payment-address">{paymentAddress}</code>
                                <button
                                    className="copy-btn"
                                    onClick={handleCopy}
                                    title="Copy address"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            <p className="payment-instructions">
                                Send <strong>{tiers[selectedTier].price}</strong> on <strong>Linea Mainnet</strong> to this address.
                                Your tier upgrades automatically after verification and is tied to your account email (not this wallet).
                            </p>
                        </div>

                        <div className="payment-warning">
                            <strong>⚠️ Important:</strong> Only send USDT on Linea Mainnet. Sending on other networks will result in loss of funds.
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleGoBack}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <ArrowLeft size={18} />
                                Go Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleVerifyPayment}
                                style={{ flex: 1 }}
                            >
                                I've Paid
                            </button>
                        </div>
                    </>
                )}

                {/* Step 4: Verifying */}
                {step === 'verifying' && (
                    <>
                        <div className="payment-modal-header">
                            <h2>Verifying Payment</h2>
                            <p className="payment-subtitle">Please wait while we confirm your transaction...</p>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '48px 24px',
                            gap: '24px'
                        }}>
                            <Loader size={48} className="loading-spinner" style={{ animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                Checking blockchain for your payment...
                                <br />
                                This may take up to 2 minutes.
                            </p>
                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={handleGoBack}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <ArrowLeft size={18} />
                            Cancel Verification
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
