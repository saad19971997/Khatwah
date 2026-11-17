/** Minimal, email-client-safe RTL HTML shell matching the site's look. */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#0F5F5C;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:12px">${escapeHtml(label)}</a>`;
}

export function detailsTable(rows: [string, string, boolean?][]): string {
  const trs = rows
    .map(
      ([k, v, ltr]) =>
        `<tr><td style="padding:10px 16px;color:#4F615E;border-bottom:1px solid #E7EEEC;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:10px 16px;font-weight:600;border-bottom:1px solid #E7EEEC"${ltr ? ' dir="ltr"' : ""}>${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #DCE5E3;border-radius:12px;border-collapse:separate;font-size:15px">${trs}</table>`;
}

export function layout(opts: { title: string; preheader?: string; body: string }): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#F6F8F7;font-family:'IBM Plex Sans Arabic',Tahoma,Arial,sans-serif;color:#172726;direction:rtl;text-align:right">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8F7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #DCE5E3;border-radius:16px">
<tr><td style="padding:24px 28px;border-bottom:1px solid #DCE5E3;font-size:22px;font-weight:700;color:#0F5F5C">خطوة</td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.8">${opts.body}</td></tr>
</table>
<p style="font-size:13px;color:#4F615E;margin:16px 0 0">خطوة · جلسات إرشادية لروّاد الأعمال</p>
</td></tr></table>
</body></html>`;
}
