import type { ActionCodeSettings } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/v2/https';
import nodemailer from 'nodemailer';

interface PasswordSetupEmailInput {
  email: string;
  role: string;
  passwordSetupLink: string;
}

interface RenderedPasswordSetupEmail {
  subject: string;
  text: string;
  html: string;
}

export const passwordSetupActionCodeSettings: ActionCodeSettings = {
  url: 'https://trade-finance-os.web.app/login',
  handleCodeInApp: false,
};

const appUrl = 'https://trade-finance-os.web.app';
const fromName = 'Trade Finance Company International';
const fromEmail = 'martin@tradefinancecompanyinternational.com';
const replyTo = 'martin@tradefinancecompanyinternational.com';
const subject = 'Set up your Trade Finance OS password';

export async function sendPasswordSetupEmail(input: PasswordSetupEmailInput): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: getRequiredEnv('SMTP_HOST'),
    port: getSmtpPort(),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: getRequiredEnv('SMTP_USER'),
      pass: getRequiredEnv('SMTP_PASS'),
    },
  });
  const template = renderPasswordSetupEmail(input);

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    replyTo,
    to: input.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

function renderPasswordSetupEmail(input: PasswordSetupEmailInput): RenderedPasswordSetupEmail {
  return {
    subject,
    text: [
      'Trade Finance OS',
      '',
      'An administrator has created a Trade Finance OS account for you.',
      '',
      `User email: ${input.email}`,
      `Role: ${input.role}`,
      '',
      `Set Your Password: ${input.passwordSetupLink}`,
      '',
      'After setting your password, return to Trade Finance OS and log in.',
      '',
      `App URL: ${appUrl}`,
      '',
      'Trade Finance Company International',
    ].join('\n'),
    html: renderHtml(input),
  };
}

function renderHtml(input: PasswordSetupEmailInput): string {
  const safeEmail = escapeHtml(input.email);
  const safeRole = escapeHtml(input.role);
  const safeLink = escapeHtml(input.passwordSetupLink);

  return `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial, Helvetica, sans-serif;color:#111827;">
    <div style="padding:32px 16px;background:#f3f6fb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="background:#17315f;padding:34px 38px;border-radius:12px 12px 0 0;color:#ffffff;">
            <p style="margin:0 0 10px 0;font-size:13px;line-height:18px;letter-spacing:0.08em;text-transform:uppercase;color:#c8d7ef;">Trade Finance Company International</p>
            <h1 style="margin:0;font-size:30px;line-height:38px;font-weight:700;letter-spacing:0;">Trade Finance OS</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #dce5f2;border-top:0;border-radius:0 0 12px 12px;padding:38px;">
            <p style="margin:0 0 22px 0;font-size:16px;line-height:26px;color:#243244;">
              An administrator has created a Trade Finance OS account for you.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px 0;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
              <tr>
                <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;font-size:13px;line-height:20px;color:#64748b;width:110px;">User email</td>
                <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;font-size:15px;line-height:20px;color:#111827;font-weight:600;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding:16px 18px;font-size:13px;line-height:20px;color:#64748b;width:110px;">Role</td>
                <td style="padding:16px 18px;font-size:15px;line-height:20px;color:#111827;font-weight:600;">${safeRole}</td>
              </tr>
            </table>

            <p style="margin:0 0 28px 0;">
              <a href="${safeLink}" style="display:inline-block;background:#17315f;color:#ffffff;text-decoration:none;border-radius:7px;padding:14px 22px;font-size:15px;line-height:20px;font-weight:700;">Set Your Password</a>
            </p>

            <p style="margin:0 0 10px 0;font-size:14px;line-height:22px;color:#475569;">If the button does not work, copy and paste this secure link into your browser:</p>
            <p style="margin:0 0 26px 0;font-size:13px;line-height:20px;word-break:break-all;color:#17315f;">
              <a href="${safeLink}" style="color:#17315f;text-decoration:underline;">${safeLink}</a>
            </p>

            <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#243244;">
              After setting your password, return to Trade Finance OS and log in.
            </p>
            <p style="margin:0 0 30px 0;font-size:15px;line-height:24px;color:#243244;">
              App URL: <a href="${appUrl}" style="color:#17315f;text-decoration:underline;">${appUrl}</a>
            </p>

            <div style="border-top:1px solid #e2e8f0;padding-top:20px;font-size:13px;line-height:20px;color:#64748b;">
              Trade Finance Company International
            </div>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new HttpsError('failed-precondition', `${name} is not configured.`);
  }

  return value;
}

function getSmtpPort(): number {
  const port = Number(getRequiredEnv('SMTP_PORT'));

  if (!Number.isInteger(port)) {
    throw new HttpsError('failed-precondition', 'SMTP_PORT is not valid.');
  }

  return port;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
