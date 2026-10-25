/**
 * BloodBridge Academic Prototype — Mock Email Provider
 * Simulates SMTP dispatch and logs sandbox messages for testing and evaluation.
 */

const sentEmails = [];
let shouldSimulateFailure = false;

export function setSimulateEmailFailure(val) {
  shouldSimulateFailure = Boolean(val);
}

export function getSentEmails() {
  return [...sentEmails];
}

export function clearSentEmails() {
  sentEmails.length = 0;
}

export async function sendEmail({ to, subject, body, metadata = {} }) {
  if (!to || !to.includes('@') || to.trim().length < 5) {
    throw new Error(`Invalid email recipient: ${to}`);
  }
  if (!subject || subject.trim().length === 0) {
    throw new Error('Email subject is required');
  }
  if (!body || body.trim().length === 0) {
    throw new Error('Email body is required');
  }

  if (shouldSimulateFailure) {
    throw new Error('Simulated SMTP connection timeout or temporary relay failure');
  }

  const messageId = `eml-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const record = {
    messageId,
    to: to.trim().toLowerCase(),
    subject: subject.trim(),
    body: body.trim(),
    metadata,
    dispatchedAt: new Date().toISOString(),
    status: 'DELIVERED',
  };

  sentEmails.push(record);
  return {
    success: true,
    messageId,
    status: 'DELIVERED',
  };
}
