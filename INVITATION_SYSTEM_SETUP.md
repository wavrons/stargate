# Invitation System Setup Guide

The app now requires an **invite code** to register. This guide explains how to set it up.

## 1. Run the Database Schema

1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Open `supabase_schema_v3_invites.sql` in your IDE.
3. Copy the entire content and run it in the SQL Editor.

This creates:
- `invite_codes` table (stores 6-digit codes)
- `waitlist` table (stores sign-up requests)
- `admin_users` table (list of admin user IDs)
- Helper functions and RLS policies

## 2. Make Yourself an Admin

After running the schema, you need to add yourself as an admin:

1. **Sign up** for an account in the app (you'll need a temporary invite code for this first time).
2. Get your user ID from Supabase Dashboard -> **Authentication** -> **Users** (copy the UUID).
3. Go to **SQL Editor** and run:
   ```sql
   insert into public.admin_users (user_id)
   values ('YOUR-USER-ID-HERE');
   ```

**Alternative (Easier First-Time Setup):**
If you haven't created an account yet, temporarily comment out the invite code validation in `Auth.tsx` (lines 31-42), sign up, make yourself admin, then uncomment it.

## 3. How It Works

### For You (Admin):
1. Go to `/admin` in the app.
2. **Generate Invite Codes**: Create 6-digit codes with optional name/email metadata.
3. **Copy Invite Link**: Click the copy button to get a shareable link like `https://yourapp.com/?code=ABC123`.
4. **Manage Waitlist**: Approve/reject people who submitted requests.

### For Friends/Family:
**Option 1: With Invite Code**
- You send them a link: `https://yourapp.com/?code=ABC123`
- They click it, the code auto-fills, they sign up.

**Option 2: Waitlist**
- They go to the app and click "Join the waitlist".
- They fill in name, email, and a message.
- You review it in `/admin` and approve/reject.
- If approved, you generate a code and send it to them manually (via email/text).

### Registration Flow:
1. User visits the app.
2. Clicks "Sign Up".
3. Enters **Invite Code** (required, 6 digits).
4. Enters email and password.
5. Code is validated and marked as "used" upon successful registration.
6. Code cannot be reused.

## 4. Features

- **6-Digit Codes**: Random alphanumeric (e.g., `A3F9K2`).
- **One-Time Use**: Each code can only be used once.
- **Metadata**: Track who each code was created for.
- **Waitlist**: Public form for people to request access.
- **Admin Panel**: Manage codes and waitlist in one place.

## 5. Security Notes

- Only admins can create/delete codes.
- Only admins can view the waitlist.
- RLS policies prevent non-admins from bypassing the system.
- Codes are case-insensitive (auto-converted to uppercase).

## 6. Troubleshooting

**"Invalid or already used invite code"**
- The code doesn't exist in the database, or it's already been used.
- Generate a new code in `/admin`.

**"I can't access /admin"**
- You're not in the `admin_users` table.
- Run the SQL command from Step 2 with your user ID.

**"No one can sign up"**
- This is by design! You must generate invite codes first.
- Go to `/admin` and create codes for your friends/family.
