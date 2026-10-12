# Product Feedback Portal

A standalone, mobile-ready feedback form. It is deployed independently and does not depend on the product application.

## Features

- Captures a person's name, email, category, and detailed feedback.
- Categories: UI/UX, Questionnaire, Workflow, Results, and Other.
- Accepts up to three PNG, JPG, WEBP, or PDF attachments (10 MB each).
- Stores submissions in Supabase Postgres and files in a private Supabase Storage bucket.
- Allows public inserts only. Visitors cannot read or download submitted feedback or attachments.
- Includes a separate admin sign-in page at `/admin.html` with an Excel workbook export.
- Admin access is allowlisted in a locked database table and checked by a server-side Supabase Edge Function.
- No application runtime dependencies for the public feedback form.

## Supabase connection

This portal uses a separate Supabase project named **Product Feedback Portal** in `ap-south-1`. The schema migration is applied, and `config.js` contains the browser-safe project URL and publishable key. The key is designed to be public; never put a secret or `service_role` key in browser code.

The `product_feedback` table is indexed by name, email, category, and date for internal review. Row-level security lets visitors submit feedback but does not let them read submissions. Attachments are stored in a private bucket. Visitors can upload, but cannot list or download files.

## Enable an admin account

Admin accounts must be created by a project owner. Public sign-ups are not needed.

1. In the Supabase dashboard, open **Authentication → Users** and add the admin user with their email and a strong password.
2. In **SQL Editor**, grant that user's account export access by replacing the example email with the exact email used for the Auth user:

   ```sql
   insert into public.feedback_admins (user_id)
   select id
   from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (user_id) do nothing;
   ```

3. Open `https://feedback-form-jg.vercel.app/admin.html`, sign in with that account, and choose **Download Excel workbook**. The workbook includes submission time, name, email, category, full feedback, attachment paths, source page, and submission ID.
4. To remove access, delete that account's row from `public.feedback_admins`.

The Edge Function checks the authenticated Supabase user against the allowlist before reading submissions. The server-side Supabase secret key never appears in the site or repository. The workbook is downloaded to the admin's device, so keep it in a private location.

The project includes `supabase/migrations/20261013000000_feedback_admin_allowlist.sql` and the deployed function source at `supabase/functions/admin-feedback-export/index.ts`.

## Deploy

The site is deployed on Vercel from this repository. The Vercel deployment serves both the public form and the `/admin.html` export page. The Supabase Edge Function accepts Vercel `.vercel.app` origins and still requires an authenticated allowlisted admin.

## Run locally

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
