# Telegram Mini App Configuration Guide

This document explains how to configure and run the Microlearning application as a Telegram Mini App (TMA).

## 1. Create a Telegram Bot

1.  Open Telegram and search for **@BotFather**.
2.  Send `/newbot` and follow the instructions to get your **Bot Token**.
3.  Copy the token and add it to your `.env` file:
    ```env
    TELEGRAM_BOT_TOKEN=your_token_here
    ```

## 2. Configure the Backend (Webhook)

Telegram needs to know where to send messages (like `/start`).

1.  Deploy your application (or use a tool like `ngrok` for local development).
2.  Set the webhook URL by opening this link in your browser:
    `https://api.telegram.org/bot8661617727:AAEHCzkVZNaMWDB2zxIb6YQ4PtkFD3y3HSU/setWebhook?url=https://microlearning-nu.vercel.app/api/telegram/webhook`
3.  You should see a JSON response: `{"ok":true,"result":true,"description":"Webhook was set"}`.

## 3. Configure the Mini App (BotFather Settings)

1.  In **@BotFather**, send `/mybots`.
2.  Select your bot and click **Bot Settings** -> **Menu Button**.
3.  Set the URL to your production domain: `https://your-domain.com/tg`.
4.  Set the button title (e.g., "Launch App").

Alternatively, you can create a direct Web App link:

1.  Send `/newapp` to **@BotFather**.
2.  Follow the instructions to set the URL and Short Name.

## 4. Environment Variables

Ensure your production environment has the following variables set:

- `TELEGRAM_BOT_TOKEN`: The token from @BotFather.
- `NEXT_PUBLIC_APP_URL`: Your full domain (e.g., `https://micro-learning-app.vercel.app`).
- `NEXTAUTH_URL`: Same as above (required for NextAuth).
- `NEXTAUTH_SECRET`: A random string for session encryption.

## 5. Local Development

To test the Mini App locally:

1.  Run `npm run dev`.
2.  Use `ngrok http 3000` to create a public tunnel.
3.  Update the webhook and BotFather URLs to use the `ngrok` URL instead of `localhost`.
4.  Open your bot in Telegram and click the Menu Button or send `/start`.

## How it Works

1.  **Bot Webhook**: When a user sends `/start`, the server at `/api/telegram/webhook` responds with an inline button.
2.  **App Launch**: Clicking the button opens the webview.
3.  **Authentication**: The app loads the `/tg` page, which uses the Telegram `initData` to verify the user's identity and log them in via NextAuth and Supabase automatically.
4.  **Native Experience**: The UI automatically hides the web header when detected inside Telegram for a native feel.
