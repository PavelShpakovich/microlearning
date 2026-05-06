const content = {
  title: 'Код подтверждения — Clario Astrology',
  heading: 'Подтвердите ваш email',
  body: 'Спасибо за регистрацию в Clario Astrology! Используйте код ниже, чтобы подтвердить ваш адрес электронной почты и активировать аккаунт.',
  codeLabel: 'Ваш код подтверждения:',
  expiry:
    'Код действителен в течение 15 минут. Если вы не регистрировались в Clario Astrology — просто проигнорируйте это письмо.',
  copyright: `© ${new Date().getFullYear()} Clario Astrology. Все права защищены.`,
};

export const VERIFY_EMAIL_SUBJECT = 'Код подтверждения — Clario Astrology';

export function renderVerifyEmailHtml({ otp }: { otp: string }): string {
  const c = content;

  return `<!DOCTYPE html>
<html lang="ru">
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
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Clario Astrology</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border:1px solid #e2e8f0;border-top:none;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#1e293b;">${c.heading}</h2>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#475569;">
                ${c.body}
              </p>
              <p style="margin:0 0 12px;font-size:13px;color:#64748b;font-weight:500;">
                ${c.codeLabel}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:16px 0 32px;">
                    <div style="display:inline-block;background:#f1f5f9;border:2px solid #e2e8f0;padding:20px 32px;border-radius:8px;font-family:'Courier New',monospace;letter-spacing:4px;">
                      <span style="font-size:32px;font-weight:700;color:#1e293b;letter-spacing:6px;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>
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
