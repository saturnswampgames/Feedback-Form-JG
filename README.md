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

## Connect a new Supabase project

1. Create a new Supabase project for this portal.
2. Run `supabase/migrations/20261012233000_product_feedback.sql` in that project's SQL Editor.
3. Copy the project URL and publishable key from the Supabase dashboard.
4. Add the URL and publishable key to `config.js`.
5. Deploy this folder to any static host with `index.html` as the entry point.

Only use a publishable key in `config.js`. Never place a secret or `service_role` key in browser code. The migration deliberately grants no visitor read access to names, email addresses, feedback, or files.

## Run locally

Serve this directory with any static web server, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.
