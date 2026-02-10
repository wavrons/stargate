# Apple Sign-In Setup Guide

To make the "Sign in with Apple" button work, you need to configure both Apple Developer Portal and Supabase Dashboard.

## 1. Apple Developer Portal

1.  **Create an App ID**:
    *   Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list).
    *   Create a new **App ID** (e.g., `com.yourname.stargate`).
    *   Enable **Sign In with Apple** capability.

2.  **Create a Service ID**:
    *   Go to **Identifiers** and create a new **Service ID** (e.g., `com.yourname.stargate.service`).
    *   Enable **Sign In with Apple**.
    *   Click "Configure" next to it.
    *   **Domains**: Enter your deployed domain (or nothing if testing, but Apple requires https for callbacks usually, localhost works with specific config but easiest with a real domain or ngrok).
    *   **Return URLs**: You need the callback URL from Supabase (see section 2).

3.  **Create a Key**:
    *   Go to **Keys**.
    *   Create a new Key, enable **Sign In with Apple**.
    *   Associate it with your App ID.
    *   Download the `.p8` file (Save this! You can't download it again).
    *   Note the **Key ID** and your **Team ID**.

## 2. Supabase Dashboard

1.  Go to your Project -> **Authentication** -> **Providers**.
2.  Enable **Apple**.
3.  Fill in the details:
    *   **Client ID**: Your **Service ID** (e.g., `com.yourname.stargate.service`).
    *   **Secret Key**: The text content of the `.p8` file you downloaded.
    *   **Key ID**: From Apple Keys page.
    *   **Team ID**: From your Apple Account (top right corner usually).
4.  Copy the **Redirect URL** (e.g., `https://your-ref.supabase.co/auth/v1/callback`).
5.  Go back to Apple Developer Portal -> Service ID -> Configure -> paste this into **Return URLs**.

## 3. Redirect URLs (Important)

1.  In Supabase Dashboard -> **Authentication** -> **URL Configuration**.
2.  Add your production URL (e.g., `https://stargate.vercel.app`).
3.  Add your local development URL (e.g., `http://localhost:5173`, `http://localhost:5174`, etc.).
    *   **Note**: Apple Sign-In is strict about return URLs. For local testing, you might need to use a tool like `ngrok` to get an https URL if Apple rejects localhost, or configure your `/etc/hosts` to map a domain to localhost.
    *   However, usually Supabase handles the callback via their domain, so `window.location.origin` works as long as it's in the Supabase "Redirect URLs" list.

## 4. Local Development

Apple Sign-In requires HTTPS or `localhost` to be explicitly allowed in the Service ID configuration.
If you get "Invalid_client" errors, double check the Service ID matches exactly what is in Supabase.

Once configured, the button in `Auth.tsx` will redirect users to Apple for authentication.
