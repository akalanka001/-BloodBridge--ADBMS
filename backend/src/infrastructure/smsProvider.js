/**
 * BloodBridge Academic Prototype — Mock SMS Gateway Provider
 * Simulates telecom SMS gateway dispatch and records sandbox delivery log.
 */

const sentSms = [];
let shouldSimulateSmsFailure = false;

export function setSimulateSmsFailure(val) {
  shouldSimulateSmsFailure = Boolean(val);
}

export function getSentSms() {
  return [...sentSms];
}

export function clearSentSms() {
  sentSms.length = 0;
}

export function normalizeSriLankanPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `+94${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+94${digits}`;
  }
  return phone;
}

export async function sendSms({ to, message, metadata = {} }) {
  if (!to || to.trim().length < 9) {
    throw new Error(`Invalid SMS recipient phone number: ${to}`);
  }
  if (!message || message.trim().length === 0) {
    throw new Error('SMS message body is required');
  }

  const normalizedPhone = normalizeSriLankanPhone(to);

  if (shouldSimulateSmsFailure) {
    throw new Error('Simulated SMS gateway error / network rejection');
  }

  const messageId = `sms-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const record = {
    messageId,
    to: normalizedPhone,
    originalTo: to,
    message: message.trim(),
    metadata,
    dispatchedAt: new Date().toISOString(),
    status: 'DELIVERED',
  };

  sentSms.push(record);
  return {
    success: true,
    messageId,
    status: 'DELIVERED',
  };
}
