import type { Locale } from '@/i18n/config';

const content: Record<
  Locale,
  {
    title: string;
    heading: string;
    body: string;
    button: string;
    fallbackLabel: string;
    expiry: string;
    copyright: string;
  }
> = {
  ru: {
    title: 'Подтвердите ваш email — Clario',
    heading: 'Подтвердите ваш email',
    body: 'Спасибо за регистрацию в Clario! Нажмите на кнопку ниже, чтобы подтвердить ваш адрес электронной почты и активировать аккаунт.',
    button: 'Подтвердить email',
    fallbackLabel: 'Если кнопка не работает, скопируйте и вставьте ссылку в браузер:',
    expiry:
      'Ссылка действительна в течение 24 часов. Если вы не регистрировались в Clario — просто проигнорируйте это письмо.',
    copyright: `© ${new Date().getFullYear()} Clario. Все права защищены.`,
  },
  en: {
    title: 'Confirm your email — Clario',
    heading: 'Confirm your email',
    body: 'Thank you for signing up for Clario! Click the button below to confirm your email address and activate your account.',
    button: 'Confirm email',
    fallbackLabel: "If the button doesn't work, copy and paste the link below into your browser:",
    expiry:
      "This link is valid for 24 hours. If you didn't sign up for Clario, you can safely ignore this email.",
    copyright: `© ${new Date().getFullYear()} Clario. All rights reserved.`,
  },
};

export const VERIFY_EMAIL_SUBJECTS: Record<Locale, string> = {
  ru: 'Подтвердите ваш email — Clario',
  en: 'Confirm your email — Clario',
};

export function renderVerifyEmailHtml({
  confirmUrl,
  locale = 'ru',
}: {
  confirmUrl: string;
  locale?: Locale;
}): string {
  const escapedUrl = confirmUrl.replace(/"/g, '&quot;');
  const c = content[locale];

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${c.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="background:#1e293b;border-radius:8px 8px 0 0;padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Clario</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border:1px solid #e2e8f0;border-top:none;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">${c.heading}</h2>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">
                ${c.body}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${escapedUrl}"
                       style="display:inline-block;background:#1e293b;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.1px;">
                      ${c.button}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">
                ${c.fallbackLabel}
              </p>
              <p style="margin:0 0 32px;font-size:13px;word-break:break-all;">
                <a href="${escapedUrl}" style="color:#3b82f6;text-decoration:none;">${escapedUrl}</a>
              </p>
              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                ${c.expiry}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">${c.copyright}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
