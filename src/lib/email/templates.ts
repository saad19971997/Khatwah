import { button, detailsTable, escapeHtml, layout } from "./layout";
import type { EmailMessage } from "./send";

export function magicLinkEmail(to: string, url: string): EmailMessage {
  const title = "رابط الدخول إلى خطوة";
  return {
    to,
    tag: "magic-link",
    subject: title,
    html: layout({
      title,
      preheader: "اضغط على الرابط لتسجيل الدخول. صالح لمدة ٢٤ ساعة.",
      body: `<h1 style="margin:0 0 12px;font-size:22px">تسجيل الدخول</h1>
<p style="margin:0 0 24px">اضغط على الزر أدناه لتسجيل الدخول إلى حسابك في خطوة. الرابط صالح لمدة ٢٤ ساعة ويُستخدم مرة واحدة.</p>
<p style="margin:0 0 24px">${button(url, "تسجيل الدخول")}</p>
<p style="margin:0;font-size:14px;color:#4F615E">إن لم تطلب هذا الرابط فتجاهل الرسالة.</p>`,
    }),
    text: `تسجيل الدخول إلى خطوة\n\nافتح الرابط التالي لتسجيل الدخول (صالح لمدة ٢٤ ساعة):\n${url}\n\nإن لم تطلب هذا الرابط فتجاهل الرسالة.`,
  };
}

export type BookingEmailData = {
  ref: string;
  clientName: string;
  clientEmail: string;
  consultantName: string;
  consultantRole: string;
  dateTime: string;
  duration: string;
  price: string;
  topic?: string | null;
  meetUrl?: string | null;
  bookingUrl: string;
  ics: string;
};

export function bookingConfirmedEmail(d: BookingEmailData): EmailMessage {
  const title = `تأكيد حجز جلستك مع ${d.consultantName}`;
  const meet = d.meetUrl
    ? `<p style="margin:0 0 24px">${button(d.meetUrl, "الانضمام إلى الجلسة عبر Google Meet")}</p>`
    : `<p style="margin:0 0 24px;color:#4F615E">سنرسل لك رابط الجلسة في رسالة منفصلة قريبًا.</p>`;
  return {
    to: d.clientEmail,
    tag: "booking-confirmed",
    subject: title,
    html: layout({
      title,
      preheader: `${d.dateTime} بتوقيت الرياض`,
      body: `<h1 style="margin:0 0 8px;font-size:22px">تم تأكيد حجزك</h1>
<p style="margin:0 0 20px">مرحبًا ${escapeHtml(d.clientName)}، استلمنا دفعتك وتأكد موعد جلستك.</p>
${meet}
${detailsTable([
  ["رقم الطلب", d.ref, true],
  ["المستشار", `${d.consultantName} · ${d.consultantRole}`],
  ["التاريخ والوقت", `${d.dateTime} بتوقيت الرياض`],
  ["المدة", d.duration],
  ["المبلغ المدفوع", d.price],
])}
<p style="margin:24px 0 0;font-size:14px;color:#4F615E">أرفقنا ملف تقويم لإضافة الموعد إلى تقويمك. يمكنك مراجعة الحجز في أي وقت: <a href="${escapeHtml(d.bookingUrl)}" style="color:#0F5F5C">${escapeHtml(d.bookingUrl)}</a></p>
<p style="margin:12px 0 0;font-size:14px;color:#4F615E">لتعديل الموعد أو إلغائه ردّ على هذه الرسالة.</p>`,
    }),
    text: `تم تأكيد حجزك\n\nمرحبًا ${d.clientName}، استلمنا دفعتك وتأكد موعد جلستك.\n\nرقم الطلب: ${d.ref}\nالمستشار: ${d.consultantName} · ${d.consultantRole}\nالتاريخ والوقت: ${d.dateTime} بتوقيت الرياض\nالمدة: ${d.duration}\nالمبلغ المدفوع: ${d.price}\n${d.meetUrl ? `رابط الجلسة: ${d.meetUrl}\n` : ""}\nتفاصيل الحجز: ${d.bookingUrl}`,
    attachments: [{ filename: `khatwah-${d.ref}.ics`, content: d.ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
  };
}

export function consultantNotificationEmail(d: BookingEmailData & { consultantEmail: string }): EmailMessage {
  const title = `حجز جديد: ${d.dateTime}`;
  return {
    to: d.consultantEmail,
    tag: "consultant-notification",
    subject: title,
    html: layout({
      title,
      body: `<h1 style="margin:0 0 8px;font-size:22px">لديك جلسة جديدة مؤكدة</h1>
<p style="margin:0 0 20px">حجز ${escapeHtml(d.clientName)} جلسة معك ودفع قيمتها.</p>
${d.meetUrl ? `<p style="margin:0 0 24px">${button(d.meetUrl, "رابط الجلسة عبر Google Meet")}</p>` : ""}
${detailsTable([
  ["رقم الطلب", d.ref, true],
  ["العميل", d.clientName],
  ["البريد الإلكتروني", d.clientEmail, true],
  ["التاريخ والوقت", `${d.dateTime} بتوقيت الرياض`],
  ["المدة", d.duration],
  ["الموضوع", d.topic?.trim() || "—"],
])}`,
    }),
    text: `لديك جلسة جديدة مؤكدة\n\nالعميل: ${d.clientName} (${d.clientEmail})\nالتاريخ والوقت: ${d.dateTime} بتوقيت الرياض\nالمدة: ${d.duration}\nالموضوع: ${d.topic?.trim() || "—"}\n${d.meetUrl ? `رابط الجلسة: ${d.meetUrl}\n` : ""}رقم الطلب: ${d.ref}`,
    attachments: [{ filename: `khatwah-${d.ref}.ics`, content: d.ics, contentType: "text/calendar; charset=utf-8; method=PUBLISH" }],
  };
}
