# Product Feedback Portal

A standalone, mobile-ready feedback form. It can be deployed independently and does not depend on the product application.

## Features

- Captures a person's name, email, category, and detailed feedback.
- Categories: UI/UX, Questionnaire, Workflow, Results, and Other.
- Accepts up to three PNG, JPG, WEBP, or PDF attachments (10 MB each).
- Stores submissions in Supabase Postgres and files in a private Supabase Storage bucket.
- Allows public inserts only. Visitors cannot read or download submitted feedback or attachments.
- Indexed fields support internal sorting and filtering by name, email, category, and submission date in the Supabase dashboard.
- No application runtime dependencies. Runs as a static website.

## Supabase connection

This portal is connected to a separate Supabase project named **Product Feedback Portal** in `ap-south-1`. The schema migration is applied, and `config.js` contains the browser-safe project URL and publishable key. The key is designed to be public; never put a secret or `service_role` key in browser code.

The `product_feedback` table is indexed by name, email, category, and date for internal review in the Supabase dashboard. Row-level security lets visitors submit feedback but does not let them read submissions. Attachments are stored in a private bucket and visitors can upload, but not list or download, files.

The repository includes a GitHub Actions workflow that publishes the site to GitHub Pages on pushes to `main`. After the first deployment succeeds, GitHub shows the shareable page URL under **Settings → Pages**.

Only use a publishable key in `config.js`. Never place a secret or `service_role` key in browser code. The migration deliberately grants no visitor read access to names, email addresses, feedback, or files.

## Run locally

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
