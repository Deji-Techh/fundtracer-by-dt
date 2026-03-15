import React from 'react';
import { X } from 'lucide-react';

interface PrivacyPolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2>Privacy Policy</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body" style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                    <p style={{ marginBottom: '1rem' }}><strong>Last Updated: January 2026</strong></p>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>1. Introduction</h3>
                    <p>FundTracer by DT ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our blockchain analysis tool.</p>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>2. Data We Collect</h3>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                        <li><strong>Public Blockchain Data:</strong> We analyze publicly available data from blockchain networks (e.g., wallet addresses, transaction history).</li>
                        <li><strong>Wallet Connection:</strong> When you connect your wallet, we see your public address to verify ownership and provide personalized analysis. We do NOT have access to your private keys or funds.</li>
                        <li><strong>Usage Data:</strong> We may collect anonymous metrics to improve performance and user experience.</li>
                    </ul>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>3. How We Use Data</h3>
                    <p>We use the data solely to:</p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
                        <li>Provide wallet analysis and visualization services.</li>
                        <li>Verify user tiers (Free vs Premium) via on-chain payments or logic.</li>
                        <li>Prevent abuse and ensure system stability.</li>
                    </ul>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>4. Third-Party Services</h3>
                    <p>We utilize third-party APIs (e.g., Alchemy, Moralis, Dune, Etherscan) to fetch blockchain data. Your requests may be processed through these services subject to their respective privacy policies.</p>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>5. Security</h3>
                    <p>We implement industry-standard security measures. However, no method of transmission over the internet or electronic storage is 100% secure.</p>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>6. No Financial Advice</h3>
                    <p>The data provided by FundTracer is for informational purposes only and does not constitute financial advice. Always do your own research.</p>

                    <h3 style={{ color: 'var(--color-text-primary)', marginTop: '1.5rem', marginBottom: '0.5rem' }}>7. Contact</h3>
                    <p>If you have questions about this policy, please contact us at <a href="mailto:fundtracerbydt@gmail.com" style={{ color: 'var(--color-primary)' }}>fundtracerbydt@gmail.com</a>.</p>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyModal;
