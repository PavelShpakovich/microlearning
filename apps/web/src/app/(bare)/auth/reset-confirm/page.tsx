import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Safe-link bounce page for password-reset emails.
 *
 * Problem: Microsoft Safe Links (corporate email security) pre-fetches every
 * URL it finds in an email, which consumes the Supabase one-time recovery
 * token before the user ever clicks the link → otp_expired.
 *
 * Fix: The email button links here instead of directly to the Supabase verify
 * endpoint. This page renders an HTML shell first; the actual Supabase URL is
 * only in a JS variable and is never placed in a plain <a href> attribute, so
 * Safe Links scanners cannot follow it. The user's browser executes the script
 * and is auto-redirected to Supabase, which then redirects back to the app.
 *
 * URL received: /auth/reset-confirm?u=<base64url(supabase_verify_url)>
 */
export default function AuthResetConfirmPage() {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Сброс пароля — Clario Astrology</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *{margin:0;padding:0;box-sizing:border-box}
              body{min-height:100svh;display:flex;align-items:center;justify-content:center;
                   font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                   background:#0D1117;color:#E6EDF3}
              .card{display:flex;flex-direction:column;align-items:center;gap:20px;
                    padding:40px 32px;border-radius:16px;border:1px solid rgba(255,255,255,.09);
                    background:#161B22;max-width:360px;width:90%}
              .logo{font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
                    color:#D4A017}
              p{font-size:15px;color:#8B949E;text-align:center;line-height:1.5}
              button.btn{display:inline-block;margin-top:4px;padding:10px 24px;border-radius:8px;
                    background:#D4A017;color:#1A1000;font-weight:600;font-size:15px;
                    border:none;cursor:pointer;text-decoration:none}
              .spinner{width:28px;height:28px;border:2.5px solid rgba(212,160,23,.2);
                       border-top-color:#D4A017;border-radius:50%;
                       animation:spin .8s linear infinite}
              @keyframes spin{to{transform:rotate(360deg)}}
              .error{color:#f87171;font-size:14px;text-align:center}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var search = new URLSearchParams(window.location.search);
                  var encoded = search.get('u');
                  if (!encoded) {
                    document.addEventListener('DOMContentLoaded', showError);
                    return;
                  }

                  // Decode base64url → original Supabase verify URL.
                  // The URL is intentionally kept out of any <a href> so that
                  // Microsoft Safe Links scanners cannot pre-fetch it.
                  var decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));

                  // Auto-redirect after a short delay so the page is rendered
                  // first (gives non-JS fallback button time to paint).
                  var timer = setTimeout(function () {
                    window.location.href = decoded;
                  }, 600);

                  document.addEventListener('DOMContentLoaded', function () {
                    var btn = document.getElementById('confirm-btn');
                    if (btn) {
                      btn.onclick = function () {
                        clearTimeout(timer);
                        window.location.href = decoded;
                      };
                    }
                  });
                } catch (e) {
                  document.addEventListener('DOMContentLoaded', showError);
                }

                function showError() {
                  var el = document.getElementById('status');
                  if (el) {
                    el.innerHTML =
                      '<p class="error">Ссылка недействительна. Запросите новый сброс пароля.</p>';
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="card">
          <span className="logo">Clario Astrology</span>
          <div id="status">
            <div className="spinner" />
            <p style={{ marginTop: 12 }}>Переходим к сбросу пароля…</p>
          </div>
          <button id="confirm-btn" className="btn">
            Продолжить
          </button>
        </div>
      </body>
    </html>
  );
}
