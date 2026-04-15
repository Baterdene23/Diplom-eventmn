import nodemailer from 'nodemailer';

// Email transporter (Development: Ethereal, Production: SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"EventMN" <noreply@eventmn.mn>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}

// Email templates
export const emailTemplates = {
  bookingConfirmation: (data: {
    userName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
    seats: string;
    totalAmount: number;
    qrCode: string;
  }) => ({
    subject: `Захиалга баталгаажлаа - ${data.eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">EventMN</h1>
        <h2>Захиалга амжилттай баталгаажлаа!</h2>
        
        <p>Сайн байна уу, ${data.userName}!</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${data.eventTitle}</h3>
          <p><strong>Огноо:</strong> ${data.eventDate}</p>
          <p><strong>Байршил:</strong> ${data.venueName}</p>
          <p><strong>Суудал:</strong> ${data.seats}</p>
          <p><strong>Нийт үнэ:</strong> ${data.totalAmount.toLocaleString()}₮</p>
        </div>
        
        <p>QR код: <strong>${data.qrCode}</strong></p>
        <p>Энэ QR кодыг арга хэмжээнд ирэхдээ үзүүлнэ үү.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Энэ и-мэйл автоматаар илгээгдсэн болно.
        </p>
      </div>
    `,
  }),

  bookingCancelled: (data: {
    userName: string;
    eventTitle: string;
  }) => ({
    subject: `Захиалга цуцлагдлаа - ${data.eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">EventMN</h1>
        <h2>Захиалга цуцлагдлаа</h2>
        
        <p>Сайн байна уу, ${data.userName}!</p>
        <p>"${data.eventTitle}" арга хэмжээний захиалга цуцлагдлаа.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          Асуух зүйл байвал бидэнтэй холбогдоно уу.
        </p>
      </div>
    `,
  }),

  eventReminder: (data: {
    userName: string;
    eventTitle: string;
    eventDate: string;
    venueName: string;
  }) => ({
    subject: `Сануулга: ${data.eventTitle} маргааш болно!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">EventMN</h1>
        <h2>Арга хэмжээний сануулга</h2>
        
        <p>Сайн байна уу, ${data.userName}!</p>
        <p>"${data.eventTitle}" арга хэмжээ маргааш болохыг сануулж байна.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Огноо:</strong> ${data.eventDate}</p>
          <p><strong>Байршил:</strong> ${data.venueName}</p>
        </div>
        
        <p>Цагтаа ирээрэй!</p>
      </div>
    `,
  }),
};
