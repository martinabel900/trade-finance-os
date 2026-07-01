export interface SendCampaignEmailInput {
  contactId: string;
  to: string;
  contactName: string;
  companyName: string;
  campaign: string;
}

export interface EmailPreview {
  subject: string;
  body: string;
}

const templateSubjects: Record<string, string> = {
  A: 'Draft Sent Only',
  B: 'Agreement / Closing Documents',
  C: 'Invoice Stage',
};

export function getCampaignEmailPreview(input: SendCampaignEmailInput): EmailPreview {
  const recipient = input.contactName || input.companyName;

  return {
    subject: templateSubjects[input.campaign] || 'Campaign Email',
    body: [
      `Dear ${recipient},`,
      '',
      getTemplateBody(input.campaign, input.companyName),
    ].join('\n'),
  };
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
