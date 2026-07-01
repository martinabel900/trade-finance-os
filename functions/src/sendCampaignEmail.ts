import { HttpsError, onCall } from 'firebase-functions/v2/https';
import './firebaseAdmin.js';
import { sendSmtpCampaignEmail } from './campaignEmail.js';

interface SendCampaignEmailInput {
  contactId: string;
  to: string;
  contactName: string;
  companyName: string;
  campaign: string;
  subject?: string;
  body?: string;
  signature?: string;
}

export const sendCampaignEmail = onCall<SendCampaignEmailInput>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to send campaign email.');
  }

  const input = validateInput(request.data);

  try {
    await sendSmtpCampaignEmail(input);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send campaign email.';
    throw new HttpsError('internal', message);
  }
});

function validateInput(data: SendCampaignEmailInput): SendCampaignEmailInput {
  const input = {
    contactId: String(data.contactId || '').trim(),
    to: String(data.to || '').trim(),
    contactName: String(data.contactName || '').trim(),
    companyName: String(data.companyName || '').trim(),
    campaign: String(data.campaign || '').trim().toUpperCase(),
    subject: String(data.subject || '').trim(),
    body: String(data.body || '').trim(),
    signature: String(data.signature || '').trim(),
  };

  if (!input.contactId || !input.to || !input.companyName || !input.campaign) {
    throw new HttpsError('invalid-argument', 'Missing required email fields.');
  }

  if (!['A', 'B', 'C'].includes(input.campaign)) {
    throw new HttpsError('invalid-argument', 'Campaign must be A, B, or C.');
  }

  return input;
}
