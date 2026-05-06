import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Auth callback — deep-link bridge for mobile clients.
 *
 * Supabase can only redirect to an HTTPS URL, so password-reset and magic-link
 * emails point here. This page immediately redirects the browser to the
 * clario:// deep-link, opening the app. If the custom scheme isn't handled
 * (e.g. on desktop) the user sees a plain fallback link — no web UI involved.
 *
 * URL shapes this page receives:
 *   PKCE flow:  /auth/callback?source=mobile&code=<code>
 *   Token flow: /auth/callback?source=mobile#access_token=...&type=recovery
 *   Error:      /auth/callback?source=mobile#error=otp_expired&...
 */
export default function AuthCallbackPage() {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Открываем Clario Astrology…</title>
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
              a.btn{display:inline-block;margin-top:4px;padding:10px 24px;border-radius:8px;
                    background:#D4A017;color:#1A1000;font-weight:600;font-size:15px;
                    text-decoration:none}
              .spinner{width:28px;height:28px;border:2.5px solid rgba(212,160,23,.2);
                       border-top-color:#D4A017;border-radius:50%;
                       animation:spin .8s linear infinite}
              @keyframes spin{to{transform:rotate(360deg)}}
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var search = new URLSearchParams(window.location.search);
                var hash   = window.location.hash;
                var hashStr = hash.startsWith('#') ? hash.slice(1) : hash;
                var hashParams = new URLSearchParams(hashStr);

                var deepLink;
                var error = hashParams.get('error');
                if (error) {
                  deepLink = 'clario://auth/callback?error=' + encodeURIComponent(error);
                } else if (hashStr) {
                  deepLink = 'clario://auth/callback?' + hashStr;
                } else {
                  var code = search.get('code');
                  deepLink = code
                    ? 'clario://auth/callback?code=' + encodeURIComponent(code)
                    : 'clario://auth/callback';
                }

                window.__deepLink = deepLink;
                window.location.replace(deepLink);

                document.addEventListener('DOMContentLoaded', function () {
                  var btn = document.getElementById('open-btn');
                  if (btn) btn.href = deepLink;
                });
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="card">
          <span className="logo">Clario Astrology</span>
          <div className="spinner" />
          <p>Открываем приложение…</p>
          <a id="open-btn" href="clario://auth/callback" className="btn">
            Открыть приложение
          </a>
        </div>
      </body>
    </html>
  );
}
