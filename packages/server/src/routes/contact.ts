import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const router = Router();

const SALES_EMAIL = process.env.SALES_EMAIL || 'sales@fundtracer.xyz';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendSalesEmail(data: {
    name: string;
    company: string;
    email: string;
    message: string;
}): Promise<void> {
    const subject = `Enterprise Sales Inquiry from ${data.name}${data.company ? ` (${data.company})` : ''}`;

    const htmlContent = `
        <h2>New Enterprise Sales Inquiry</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 120px;">Name</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${data.name}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${data.company || 'Not provided'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${data.email}">${data.email}</a></td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Message</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${data.message.replace(/\n/g, '<br>')}</td>
            </tr>
        </table>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">
            Sent from FundTracer website - Contact Sales form
        </p>
    `;

    const textContent = `
New Enterprise Sales Inquiry

Name: ${data.name}
Company: ${data.company || 'Not provided'}
Email: ${data.email}

Message:
${data.message}

---
Sent from FundTracer website - Contact Sales form
    `;

    // Try Resend first
    if (RESEND_API_KEY) {
        try {
            const resend = new Resend(RESEND_API_KEY);
            await resend.emails.send({
                from: 'FundTracer <onboarding@resend.dev>',
                to: SALES_EMAIL,
                replyTo: data.email,
                subject,
                html: htmlContent,
                text: textContent,
            });
            console.log('[Contact] Sales email sent via Resend');
            return;
        } catch (error) {
            console.error('[Contact] Resend failed:', error);
        }
    }

    // Fall back to nodemailer/Gmail
    if (EMAIL_USER && EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS.replace(/\s/g, ''),
            },
        });

        await transporter.sendMail({
            from: EMAIL_USER,
            to: SALES_EMAIL,
            replyTo: data.email,
            subject,
            html: htmlContent,
            text: textContent,
        });
        console.log('[Contact] Sales email sent via Gmail');
        return;
    }

    console.warn('[Contact] No email provider configured');
}

router.post('/sales', async (req: Request, res: Response) => {
    try {
        const { name, company, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (message.length < 10) {
            return res.status(400).json({ error: 'Message must be at least 10 characters' });
        }

        await sendSalesEmail({ name, company: company || '', email, message });

        res.json({ success: true, message: 'Your message has been sent. We will be in touch soon.' });
    } catch (error) {
        console.error('[Contact] Sales email error:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again or email us directly.' });
    }
});

export default router;
