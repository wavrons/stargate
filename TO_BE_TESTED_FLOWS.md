# To-Be-Tested Flows (Stargate)

This checklist captures end-to-end flows that should be manually tested.

## Invitation-only registration

### Admin setup
- Confirm you can log in with your admin account
- Confirm **Admin** button is visible in the top navigation
- Navigate to `/admin` via the button

### Generate invite code
- In `/admin`, generate a new invite code
- Confirm code appears in the Invite Codes list
- Click copy icon
- Confirm clipboard contains a link like:
  - `http://localhost:5173/?code=ABC123`

### Sign up with invite link (new user)
- Open an incognito/private window
- Visit the copied invite link
- Confirm the app switches to **Sign Up** automatically
- Confirm invite code auto-fills
- Enter email + password and submit
- Expected:
  - Account is created
  - Invite code becomes **used** (no longer deletable)

### One-time-use enforcement
- Attempt to sign up again using the same invite code
- Expected:
  - Sign up is blocked with an error message indicating the code is invalid/used

### Waitlist submission
- In an incognito/private window, navigate to `/waitlist`
- Submit waitlist form
- Expected:
  - Success screen is shown

### Waitlist review (admin)
- In `/admin`, confirm the waitlist entry appears
- Approve and reject actions:
  - Approve a pending entry
  - Reject a pending entry
- Expected:
  - Status updates correctly

## Auth / account management

### Sign out
- While logged in, click **Sign out**
- Expected:
  - You return to the Auth page
  - Protected pages require login again

### Forgot password
- On login screen, click **Forgot?**
- Submit email
- Expected:
  - Reset email is sent
- Follow reset link and set a new password
- Expected:
  - Password updates successfully

## Trips (v2 schema)

### Dashboard
- Create a trip
- Verify trip appears in list

### Trip detail
- Add an item to a trip
- Verify item appears

### Itinerary
- Verify itinerary view loads and lists items

## Notes
- If a screen is blank, check browser console errors first.
- If Admin button does not appear, verify your admin row exists:
  - `select * from public.admin_users;`
