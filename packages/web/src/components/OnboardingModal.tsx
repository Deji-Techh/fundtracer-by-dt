import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wallet, Shield, GitBranch, Zap, BarChart3, Users, Check, X } from 'lucide-react';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setDirection(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleComplete = () => {
        localStorage.setItem('fundtracer_onboarding_complete', 'true');
        onClose();
    };

    const goToStep = (newStep: number) => {
        setDirection(newStep > step ? 1 : -1);
        setStep(newStep);
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.95
        })
    };

    const staggerChildren = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { x: -20, opacity: 0 },
        show: { x: 0, opacity: 1 }
    };

    const features = [
        {
            icon: <Search size={22} />,
            title: 'Analyze Wallets',
            desc: 'Trace funding sources and transaction history'
        },
        {
            icon: <GitBranch size={22} />,
            title: 'Funding Trees',
            desc: 'Visualize where funds originate from'
        },
        {
            icon: <Users size={22} />,
            title: 'Sybil Detection',
            desc: 'Identify coordinated attack patterns'
        },
        {
            icon: <BarChart3 size={22} />,
            title: 'Compare Wallets',
            desc: 'Side-by-side wallet analysis'
        }
    ];

    const steps = [
        // Step 1: Welcome
        {
            content: (
                <motion.div
                    className="onboarding-slide"
                    initial="hidden"
                    animate="show"
                    variants={staggerChildren}
                >
                    <motion.div className="onboarding-hero-icon" variants={itemVariants}>
                        <div className="hero-icon-glow" />
                        <Search size={48} strokeWidth={1.5} />
                    </motion.div>
                    
                    <motion.h1 variants={itemVariants} className="onboarding-title">
                        Welcome to <span className="accent-text">FundTracer</span>
                    </motion.h1>
                    
                    <motion.p variants={itemVariants} className="onboarding-desc">
                        The next-generation blockchain intelligence platform. 
                        Trace, analyze, and uncover wallet relationships with precision.
                    </motion.p>

                    <motion.div variants={itemVariants} className="onboarding-features-grid">
                        {features.map((feature, i) => (
                            <motion.div 
                                key={i}
                                className="feature-card"
                                variants={itemVariants}
                                whileHover={{ scale: 1.02, y: -2 }}
                            >
                                <div className="feature-card-icon">{feature.icon}</div>
                                <div className="feature-card-content">
                                    <h4>{feature.title}</h4>
                                    <p>{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            )
        },
        // Step 2: How It Works
        {
            content: (
                <motion.div
                    className="onboarding-slide"
                    initial="hidden"
                    animate="show"
                    variants={staggerChildren}
                >
                    <motion.div className="onboarding-section-icon" variants={itemVariants}>
                        <Zap size={32} strokeWidth={1.5} />
                    </motion.div>
                    
                    <motion.h1 variants={itemVariants} className="onboarding-title">
                        How It Works
                    </motion.h1>
                    
                    <motion.p variants={itemVariants} className="onboarding-desc">
                        Get started in seconds. Three simple steps to blockchain intelligence.
                    </motion.p>

                    <motion.div variants={itemVariants} className="steps-timeline">
                        {[
                            { num: '01', title: 'Sign In', desc: 'Connect with Google or X' },
                            { num: '02', title: 'Analyze', desc: 'Enter any wallet address' },
                            { num: '03', title: 'Discover', desc: 'Trace funds & find patterns' }
                        ].map((s, i) => (
                            <motion.div 
                                key={i}
                                className="timeline-item"
                                variants={itemVariants}
                                custom={i}
                            >
                                <div className="timeline-connector">
                                    <span className="timeline-num">{s.num}</span>
                                    {i < 2 && <div className="timeline-line" />}
                                </div>
                                <div className="timeline-content">
                                    <h4>{s.title}</h4>
                                    <p>{s.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            )
        },
        // Step 3: Privacy
        {
            content: (
                <motion.div
                    className="onboarding-slide"
                    initial="hidden"
                    animate="show"
                    variants={staggerChildren}
                >
                    <motion.div className="onboarding-section-icon privacy-icon" variants={itemVariants}>
                        <Shield size={32} strokeWidth={1.5} />
                    </motion.div>
                    
                    <motion.h1 variants={itemVariants} className="onboarding-title">
                        Your Privacy <span className="accent-text">Protected</span>
                    </motion.h1>
                    
                    <motion.p variants={itemVariants} className="onboarding-desc">
                        We believe in privacy-first blockchain analysis.
                    </motion.p>

                    <motion.div variants={itemVariants} className="privacy-cards">
                        {[
                            'Public blockchain data only',
                            'Never access your private keys',
                            'No tracking or data selling',
                            'Wallet connection optional'
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                className="privacy-card"
                                variants={itemVariants}
                                whileHover={{ scale: 1.01 }}
                            >
                                <div className="privacy-card-check">
                                    <Check size={16} />
                                </div>
                                <span>{item}</span>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.p variants={itemVariants} className="onboarding-cta">
                        Ready to explore the blockchain?
                    </motion.p>
                </motion.div>
            )
        }
    ];

    return (
        <div className="onboarding-overlay" onClick={handleComplete}>
            <motion.div 
                className="onboarding-container"
                onClick={e => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Progress Bar */}
                <div className="onboarding-progress">
                    {steps.map((_, i) => (
                        <motion.div 
                            key={i}
                            className={`progress-segment ${i <= step ? 'active' : ''}`}
                            onClick={() => goToStep(i)}
                            animate={{ 
                                backgroundColor: i <= step ? 'var(--intel-cyan)' : 'rgba(255,255,255,0.1)' 
                            }}
                        />
                    ))}
                </div>

                {/* Close Button */}
                <button className="onboarding-close" onClick={handleComplete}>
                    <X size={20} />
                </button>

                {/* Slides */}
                <div className="onboarding-slides">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ 
                                x: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="slides-wrapper"
                        >
                            {steps[step].content}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="onboarding-nav">
                    <button 
                        className={`nav-btn nav-btn--back ${step === 0 ? 'hidden' : ''}`}
                        onClick={() => goToStep(step - 1)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back
                    </button>
                    
                    <div className="nav-dots">
                        {steps.map((_, i) => (
                            <button
                                key={i}
                                className={`nav-dot ${i === step ? 'active' : ''}`}
                                onClick={() => goToStep(i)}
                            />
                        ))}
                    </div>

                    {step < steps.length - 1 ? (
                        <button 
                            className="nav-btn nav-btn--next"
                            onClick={() => goToStep(step + 1)}
                        >
                            Next
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
                    ) : (
                        <motion.button 
                            className="nav-btn nav-btn--finish"
                            onClick={handleComplete}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Zap size={18} />
                            Get Started
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default OnboardingModal;
