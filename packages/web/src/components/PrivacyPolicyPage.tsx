import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
            padding: '40px 20px',
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ marginBottom: '40px' }}>
                    <a href="/" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        marginBottom: '20px'
                    }}>
                        <ArrowLeft size={16} /> Back to App
                    </a>
                    <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '10px' }}>Privacy Policy</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Last updated: January 18, 2026</p>
                </div>

                <div className="prose" style={{ lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>1. Introduction</h2>
                        <p>
                            Welcome to FundTracer ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our blockchain analysis tools.
                        </p>
                    </section>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>2. Data We Collect</h2>
                        <p style={{ marginBottom: '10px' }}>We collect information that you strictly provide to us or that is publicly available on the blockchain:</p>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '10px' }}>
                            <li><strong>Public Blockchain Data:</strong> When you analyze a wallet, we fetch and process publicly available data from the blockchain. We do not own or control this data.</li>
                            <li><strong>Wallet Connection:</strong> If you connect your wallet, we collect your public address to authenticate you and check your subscription tier.</li>
                            <li><strong>Usage Data:</strong> We may collect anonymous analytics data (such as page views and feature usage) to improve our service.</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>3. How We Use Your Data</h2>
                        <p>We use the data we collect to:</p>
                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                            <li>Provide, operate, and maintain our services.</li>
                            <li>Authenticate your access to premium features.</li>
                            <li>Improve, personalize, and expand our platform.</li>
                            <li>Analyze and understand how you use our website.</li>
                        </ul>
                    </section>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>4. Third-Party Services</h2>
                        <p>
                            We rely on third-party APIs (such as Etherscan, Moralis, and alchemy) to fetch blockchain data.
                            Your interaction with these services is governed by their respective privacy policies. We are not responsible for the data practices of these third parties.
                        </p>
                    </section>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>5. Data Security</h2>
                        <p>
                            We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process.
                            However, please remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
                        </p>
                    </section>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>6. No Financial Advice</h2>
                        <p>
                            The information provided by FundTracer is for informational and analytical purposes only. It does not constitute financial, investment, or legal advice.
                            You are solely responsible for your decisions based on the data provided.
                        </p>
                    </section>

                    <section style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '15px' }}>7. Contact Us</h2>
                        <p>
                            If you have questions or comments about this policy, you may email us at [fundtracerbydt@gmail.com].
                        </p>
                    </section>
                </div>

                <div style={{ marginTop: '60px', borderTop: '1px solid var(--color-surface-border)', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    &copy; {new Date().getFullYear()} FundTracer. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
