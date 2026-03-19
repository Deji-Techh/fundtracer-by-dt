import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ChevronDown, ChevronUp, Send, Bug, CheckCircle } from 'lucide-react';
import { useNotify } from '../contexts/ToastContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Capture console errors for debug log
const errorLog: string[] = [];
if (typeof window !== 'undefined') {
    const originalError = console.error;
    console.error = (...args: any[]) => {
        errorLog.push(`[${new Date().toISOString()}] ${args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ')}`);
        if (errorLog.length > 50) errorLog.shift(); // Keep last 50
        originalError.apply(console, args);
    };
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [issue, setIssue] = useState('');
    const [showDebugLog, setShowDebugLog] = useState(false);
    const [debugLog, setDebugLog] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const notify = useNotify();

    useEffect(() => {
        if (isOpen) {
            // Capture current error log
            setDebugLog(errorLog.length > 0
                ? errorLog.join('\n')
                : 'No errors captured in this session.'
            );
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSend = () => {
        if (!name.trim() || !issue.trim()) {
            notify.warning('Please fill in your name and describe the issue.');
            return;
        }

        setSending(true);

        // Create mailto link with structured content
        const subject = encodeURIComponent(`[FundTracer Feedback] Issue Report from ${name}`);
        const body = encodeURIComponent(
            `FEEDBACK REPORT
===============

Name: ${name}

Issue Description:
${issue}

Debug Log:
${debugLog}

---
Submitted: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
`);

        // Open email client
        window.location.href = `mailto:fundtracerbydt@gmail.com?subject=${subject}&body=${body}`;

        setSending(false);
        setSent(true);

        // Close after delay
        setTimeout(() => {
            setSent(false);
            setName('');
            setIssue('');
            onClose();
        }, 2000);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div
                className="modal-content animate-scale-in"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '550px', width: '95vw' }}
            >
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div style={{ padding: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            background: 'linear-gradient(135deg, #2a2a2f 0%, #1a1a1f 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)' }}>
                                Send Feedback
                            </h2>
                            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                Report issues or share suggestions
                            </p>
                        </div>
                    </div>

                    {sent ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-6)',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <p style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <CheckCircle size={20} /> Email client opened!
                            </p>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                Please send the email from your mail app.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Name */}
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: 'var(--space-2)'
                                }}>
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="input"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Issue */}
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: 'var(--space-2)'
                                }}>
                                    Issue or Feedback
                                </label>
                                <textarea
                                    value={issue}
                                    onChange={e => setIssue(e.target.value)}
                                    placeholder="Describe what went wrong or what you'd like to see..."
                                    className="input"
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            {/* Debug Log Toggle */}
                            <div style={{ marginBottom: 'var(--space-5)' }}>
                                <button
                                    onClick={() => setShowDebugLog(!showDebugLog)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        fontSize: 'var(--text-sm)',
                                        padding: 0
                                    }}
                                >
                                    <Bug size={14} />
                                    Debug Log
                                    {showDebugLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {showDebugLog && (
                                    <div style={{
                                        marginTop: 'var(--space-2)',
                                        background: '#0a0a0f',
                                        border: '1px solid var(--color-surface-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-3)',
                                        maxHeight: '150px',
                                        overflowY: 'auto',
                                        fontSize: 'var(--text-xs)',
                                        fontFamily: 'monospace',
                                        color: 'var(--color-text-muted)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all'
                                    }}>
                                        {debugLog}
                                    </div>
                                )}
                                <p style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-muted)',
                                    marginTop: 'var(--space-1)'
                                }}>
                                    This will be included in your report to help us debug issues.
                                </p>
                            </div>

                            {/* Send Button */}
                            <button
                                className="btn btn-primary"
                                onClick={handleSend}
                                disabled={sending}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
                            >
                                <Send size={16} />
                                {sending ? 'Opening Email...' : 'Send Feedback'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeedbackModal;
