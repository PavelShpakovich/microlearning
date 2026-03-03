/**
 * Intentionally empty layout for the /tg route.
 * The Telegram Web App SDK is loaded in the root layout (app/layout.tsx)
 * using strategy="beforeInteractive", which only works there.
 */
export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
