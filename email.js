const nodemailer = require('nodemailer');
const pug = require('pug');
const path = require('path');
const { convert } = require('html-to-text');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify connection
transporter.verify((error) => {
    if (error) {
        console.error('Error with email configuration:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

exports.sendEmail = async (options) => {
    try {
        // Render HTML email template
        const html = pug.renderFile(
            path.join(__dirname, '../views/emails/template.pug'),
            {
                subject: options.subject,
                content: options.html,
                footer: `© ${new Date().getFullYear()} Alpha Freshman Tutorials`
            }
        );

        // Send email
        await transporter.sendMail({
            from: `"Alpha Freshman Tutorials" <${process.env.EMAIL_FROM}>`,
            to: options.email,
            subject: options.subject,
            html,
            text: convert(html)
        });
    } catch (err) {
        console.error('Error sending email:', err);
        throw err;
    }
};

// Email template (views/emails/template.pug)
/*
doctype html
html
    head
        meta(charset="UTF-8")
        title= subject
        style.
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d6efd; color: white; padding: 10px 20px; border-radius: 5px 5px 0 0; }
            .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 5px 5px; }
            .footer { margin-top: 20px; text-align: center; font-size: 0.8em; color: #666; }
    body
        .container
            .header
                h2 Alpha Freshman Tutorials
            .content
                block content
                    | !{content}
            .footer
                p= footer
*/