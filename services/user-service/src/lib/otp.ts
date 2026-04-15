import { prisma } from './prisma';
import { OtpType } from '@prisma/client';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

type EmailProvider = 'resend' | 'smtp' | 'none';

// 6 оронтой OTP код үүсгэх
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// OTP үүсгэж хадгалах
export async function createOtp(
  userId: string,
  type: OtpType,
  target: string // email or phone
): Promise<{ code: string; expiresAt: Date }> {
  // Хуучин OTP-г идэвхгүй болгох
  await prisma.userOtp.updateMany({
    where: {
      userId,
      type,
      isUsed: false,
    },
    data: {
      isUsed: true,
    },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.userOtp.create({
    data: {
      userId,
      code,
      type,
      target,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

// OTP шалгах
export async function verifyOtp(
  userId: string,
  code: string,
  type: OtpType
): Promise<{ success: boolean; error?: string }> {
  const otp = await prisma.userOtp.findFirst({
    where: {
      userId,
      type,
      isUsed: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!otp) {
    return { success: false, error: 'OTP олдсонгүй' };
  }

  // Хугацаа шалгах
  if (new Date() > otp.expiresAt) {
    await prisma.userOtp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });
    return { success: false, error: 'OTP хугацаа дууссан' };
  }

  // Оролдлогын тоо шалгах
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.userOtp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });
    return { success: false, error: 'Хэт олон буруу оролдлого. Шинэ OTP авна уу' };
  }

  // Код шалгах
  if (otp.code !== code) {
    await prisma.userOtp.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 },
    });
    return { 
      success: false, 
      error: `Буруу код. ${MAX_OTP_ATTEMPTS - otp.attempts - 1} оролдлого үлдсэн` 
    };
  }

  // Амжилттай - OTP-г ашигласан гэж тэмдэглэх
  await prisma.userOtp.update({
    where: { id: otp.id },
    data: { isUsed: true },
  });

  return { success: true };
}

// И-мэйл илгээх (placeholder - үнэн хэрэгт nodemailer эсвэл SendGrid ашиглана)
export async function sendOtpEmail(
  email: string,
  code: string,
  type: OtpType
): Promise<boolean> {
  const subject = getEmailSubject(type);
  const html = getEmailMessage(type, code);

  // In dev, if provider credentials are missing, log OTP to console so the flow
  // can be tested without external email setup.
  if (shouldUseDevLogFallback() && !hasWorkingEmailProviderConfig()) {
    logDevOtp('EMAIL', email, code, subject);
    return true;
  }

  const provider = getEmailProvider();

  if (provider === 'resend') {
    return sendEmailWithResend(email, subject, html);
  }
  if (provider === 'smtp') {
    return sendEmailWithSmtp(email, subject, html);
  }

  console.error('OTP email provider is not configured. Set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS');
  return false;
}

// SMS илгээх (Twilio REST API)
export async function sendOtpSms(
  phone: string,
  code: string,
  type: OtpType
): Promise<boolean> {
  if (shouldUseDevLogFallback() && !isSmsProviderConfigured()) {
    logDevOtp('SMS', phone, code, getSmsMessage(type, code));
    return true;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio config missing. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER');
    return false;
  }

  const body = new URLSearchParams({
    From: fromNumber,
    To: phone,
    Body: getSmsMessage(type, code),
  });

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Twilio send failed (${response.status}): ${errorBody}`);
      return false;
    }

    console.log(`OTP SMS sent via Twilio to ${phone}`);
    return true;
  } catch (error) {
    console.error('Twilio send error:', error);
    return false;
  }
}

function shouldUseDevLogFallback(): boolean {
  // NOTE: Next.js may inline NODE_ENV at build time, which can make local Docker
  // images behave like production even when running with NODE_ENV=development.
  // Use an explicit env toggle instead.
  return process.env.OTP_DEV_LOG_FALLBACK !== 'false';
}

function isEmailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

function hasWorkingEmailProviderConfig(): boolean {
  const provider = getEmailProvider();

  if (provider === 'resend') {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }

  if (provider === 'smtp') {
    // Match sendEmailWithSmtp() requirements
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  // If provider is not explicitly chosen, accept either fully configured option.
  return Boolean(
    (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  );
}

function isSmsProviderConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

function getEmailProvider(): EmailProvider {
  const configuredProvider = (process.env.OTP_EMAIL_PROVIDER || '').toLowerCase();
  if (configuredProvider === 'resend' || configuredProvider === 'smtp') {
    return configuredProvider;
  }

  if (process.env.RESEND_API_KEY) {
    return 'resend';
  }
  if (process.env.SMTP_HOST) {
    return 'smtp';
  }

  return 'none';
}

async function sendEmailWithResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.error('Resend config missing. Required: RESEND_API_KEY, EMAIL_FROM');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend send failed (${response.status}): ${errorBody}`);
      return false;
    }

    console.log(`OTP email sent via Resend to ${to}`);
    return true;
  } catch (error) {
    console.error('Resend send error:', error);
    return false;
  }
}

async function sendEmailWithSmtp(to: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    console.error('SMTP config missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`OTP email sent via SMTP to ${to}`);
    return true;
  } catch (error) {
    console.error('SMTP send error:', error);
    return false;
  }
}

function getSmsMessage(type: OtpType, code: string): string {
  if (type === 'BECOME_ORGANIZER') {
    return `EventMN: Organizer verification code is ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
  }

  if (type === 'PASSWORD_RESET') {
    return `EventMN: Password reset code is ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
  }

  return `EventMN: Your verification code is ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
}

function logDevOtp(channel: 'EMAIL' | 'SMS', target: string, code: string, extra: string): void {
  console.log('='.repeat(50));
  console.log(`OTP ${channel} to: ${target}`);
  console.log(`Code: ${code}`);
  console.log(`Info: ${extra}`);
  console.log('='.repeat(50));
}

function getEmailSubject(type: OtpType): string {
  switch (type) {
    case 'EMAIL_VERIFY':
      return 'EventMN - И-мэйл баталгаажуулах код';
    case 'PHONE_VERIFY':
      return 'EventMN - Утас баталгаажуулах код';
    case 'PASSWORD_RESET':
      return 'EventMN - Нууц үг сэргээх код';
    case 'BECOME_ORGANIZER':
      return 'EventMN - Зохион байгуулагч болох баталгаажуулах код';
    default:
      return 'EventMN - Баталгаажуулах код';
  }
}

function getEmailMessage(type: OtpType, code: string): string {
  const baseMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">EventMN</h2>
      <p>Таны баталгаажуулах код:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px;">
        <h1 style="color: #4F46E5; letter-spacing: 8px; margin: 0;">${code}</h1>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Энэ код 10 минутын дотор хүчинтэй.
      </p>
      <p style="color: #999; font-size: 12px;">
        Хэрэв та энэ хүсэлтийг илгээгээгүй бол энэ и-мэйлийг үл тоомсорлоно уу.
      </p>
    </div>
  `;
  return baseMessage;
}
