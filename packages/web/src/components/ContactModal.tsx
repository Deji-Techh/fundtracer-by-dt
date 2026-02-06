import React, { useState } from 'react';
import './ContactModal.css';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    debugLog: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create Gmail compose URL
    const subject = `Contact from ${formData.name}`;
    const body = `Name: ${formData.name}\n\nEmail: ${formData.email}\n\nDescription:\n${formData.description}\n\nDebug Log:\n${formData.debugLog || 'None provided'}`;
    
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=fundtracerbydt@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Gmail
    window.open(gmailUrl, '_blank');
    
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="contact-modal-overlay" onClick={onClose}>
      <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
        <button className="contact-modal-close" onClick={onClose}>×</button>
        
        <div className="contact-modal-header">
          <h2 className="contact-modal-title">Contact Us</h2>
          <p className="contact-modal-subtitle">
            We'd love to hear from you. Send us a message!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="contact-modal-form">
          <div className="contact-form-group">
            <label htmlFor="name" className="contact-form-label">
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="contact-form-input"
              placeholder="Enter your name"
            />
          </div>

          <div className="contact-form-group">
            <label htmlFor="email" className="contact-form-label">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="contact-form-input"
              placeholder="Enter your email"
            />
          </div>

          <div className="contact-form-group">
            <label htmlFor="description" className="contact-form-label">
              Message *
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="contact-form-textarea"
              placeholder="How can we help you?"
            />
          </div>

          <div className="contact-form-group">
            <label htmlFor="debugLog" className="contact-form-label">
              Debug Log (Optional)
            </label>
            <textarea
              id="debugLog"
              rows={3}
              value={formData.debugLog}
              onChange={(e) => setFormData({ ...formData, debugLog: e.target.value })}
              className="contact-form-textarea contact-form-debug"
              placeholder="If you're reporting a bug, paste any relevant debug information here..."
            />
          </div>

          <button
            type="submit"
            className="contact-form-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Opening Gmail...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
