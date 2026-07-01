import { HttpsError } from 'firebase-functions/v2/https';
import nodemailer from 'nodemailer';

export interface CampaignEmailInput {
  to: string;
  contactName: string;
  companyName: string;
  campaign: string;
  subject?: string;
  body?: string;
  signature?: string;
}

interface RenderedEmailTemplate {
  subject: string;
  body: string;
  signature: string;
  text: string;
  html: string;
}

const templateSubjects: Record<string, string> = {
  A: 'Draft Sent Only',
  B: 'Agreement / Closing Documents',
  C: 'Invoice Stage',
};

export async function sendSmtpCampaignEmail(input: CampaignEmailInput): Promise<void> {
  const template = getTemplate(input);
  const fromName = getRequiredEnv('SMTP_FROM_NAME');
  const fromEmail = getRequiredEnv('SMTP_FROM_EMAIL');
  const replyTo = getRequiredEnv('SMTP_REPLY_TO');
  const testMode = isEmailTestMode();
  const recipient = testMode ? 'martin@tfciglobal.com' : input.to;
  const outboundTemplate = testMode ? withTestModeHeader(template, input) : template;

  console.log(`EMAIL_TEST_MODE is ${testMode ? 'ON' : 'OFF'}. Sending campaign email to ${recipient}.`);

  const transporter = nodemailer.createTransport({
    host: getRequiredEnv('SMTP_HOST'),
    port: getSmtpPort(),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: getRequiredEnv('SMTP_USER'),
      pass: getRequiredEnv('SMTP_PASS'),
    },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    replyTo,
    to: recipient,
    subject: template.subject,
    text: outboundTemplate.text,
    html: outboundTemplate.html,
  });
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

function isEmailTestMode(): boolean {
  return process.env.EMAIL_TEST_MODE === 'true';
}

function getTemplate(input: CampaignEmailInput): RenderedEmailTemplate {
  const subject = input.subject?.trim() || templateSubjects[input.campaign];
  const recipient = input.contactName || input.companyName;
  const body =
    input.body?.trim() ||
    [
      `Dear ${recipient},`,
      '',
      getTemplateBody(input.campaign, input.companyName),
    ].join('\n');
  const signature = input.signature?.trim() || getRequiredEnv('SMTP_FROM_NAME');

  return renderEmailTemplate(subject, body, signature);
}

function withTestModeHeader(
  template: RenderedEmailTemplate,
  input: CampaignEmailInput,
): RenderedEmailTemplate {
  const header = [
    'TEST MODE',
    `Original To: ${input.to}`,
    `Original Contact: ${input.contactName || ''}`,
    `Original Company: ${input.companyName}`,
    `Campaign: ${input.campaign}`,
    '',
  ].join('\n');

  return renderEmailTemplate(template.subject, template.body, template.signature, header);
}

function getTemplateBody(campaign: string, companyName: string): string {
  if (campaign === 'A') {
    return `We are contacting ${companyName} regarding the draft sent only stage.`;
  }

  if (campaign === 'B') {
    return `We are contacting ${companyName} regarding agreement and closing documents.`;
  }

  return `We are contacting ${companyName} regarding the invoice stage.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEmailTemplate(
  subject: string,
  body: string,
  signature: string,
  testModeHeader = '',
): RenderedEmailTemplate {
  return {
    subject,
    body,
    signature,
    text: [testModeHeader, body, '', signature].filter(Boolean).join('\n'),
    html: renderHtmlEmail(subject, body, signature, testModeHeader),
  };
}

function renderHtmlEmail(
  subject: string,
  body: string,
  signature: string,
  testModeHeader: string,
): string {
  const testModeBlock = testModeHeader
    ? `
      <div style="margin:0 0 24px 0;padding:16px 18px;border:1px solid #f0c36d;background:#fff8e6;border-radius:8px;color:#5f3b00;font-size:14px;line-height:22px;">
        ${renderPlainText(testModeHeader)}
      </div>
    `
    : '';

  return `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;">
    <div style="background:#f4f6fb;padding:28px 14px;font-family:Arial, Helvetica, sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="background:#1c3169;border-radius:14px 14px 0 0;padding:38px 42px;color:#ffffff;">
            <h1 style="margin:0;font-size:30px;line-height:38px;font-weight:700;letter-spacing:0;">Trade Finance Company International</h1>
            <p style="margin:14px 0 0 0;font-size:18px;line-height:26px;font-weight:600;color:#dbe5f6;">${escapeHtml(subject)}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #dbe3ef;border-top:0;border-radius:0 0 14px 14px;padding:42px;">
            ${testModeBlock}
            <div style="font-size:17px;line-height:30px;color:#111827;">
              ${renderPlainText(body)}
            </div>
            <div style="margin-top:34px;padding-top:22px;border-top:1px solid #dbe3ef;font-size:14px;line-height:23px;color:#4b5f75;">
              ${renderPlainText(signature)}
            </div>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

function renderPlainText(value: string): string {
  return value
    .split('\n')
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 16px 0;">${escapeHtml(line)}</p>`
        : '<div style="height:10px;line-height:10px;">&nbsp;</div>',
    )
    .join('');
}
