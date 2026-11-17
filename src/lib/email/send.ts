import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export type EmailAttachment = { filename: string; content: string; contentType: string };
export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  /** Free-form tag, handy for finding messages in the dev outbox. */
  tag?: string;
};

const OUTBOX_DIR = path.join(process.cwd(), ".outbox");

function from(): string {
  return process.env.EMAIL_FROM || "خطوة <no-reply@example.com>";
}

async function sendConsole(msg: EmailMessage) {
  await fs.mkdir(OUTBOX_DIR, { recursive: true });
  const file = path.join(OUTBOX_DIR, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  await fs.writeFile(file, JSON.stringify({ from: from(), ...msg, sentAt: new Date().toISOString() }, null, 2));
  console.info(`[email:console] → ${msg.to} · ${msg.subject} (${path.relative(process.cwd(), file)})`);
}

async function sendResend(msg: EmailMessage) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from(),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        content_type: a.contentType,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

async function sendSmtp(msg: EmailMessage) {
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({
    from: from(),
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    attachments: msg.attachments,
  });
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const transport = process.env.EMAIL_TRANSPORT || "console";
  if (transport === "resend") return sendResend(msg);
  if (transport === "smtp") return sendSmtp(msg);
  return sendConsole(msg);
}
