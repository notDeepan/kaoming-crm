# Public GitHub and online preview

The repository can be public so collaborators can browse and review the code on
GitHub. GitHub Pages serves static files and cannot run this server-side CRM or
its PostgreSQL database. The `render.yaml` Blueprint deploys the application as
a free Render web service, with a separate Neon PostgreSQL database.

This setup is for evaluation and entering test records. Keep confidential
customer, contract, warranty, and price data on the local installation until a
durable hosting and backup arrangement is approved. The public repository includes
the build specifications and worked examples; `.env*` secrets, local databases,
and backups must stay outside Git. The cloud database starts empty except for an
administrator and fixed document categories. It is separate from the local CRM.

## Create the online preview

1. Create a **private** Neon project/database in the Singapore region if available.
   Copy its pooled PostgreSQL connection string with TLS (`sslmode=require`).
   Never paste it into GitHub or `render.yaml`.
2. In Render, connect the public GitHub repository and create a Blueprint from
   `render.yaml`. Choose the Free web plan if it is offered. The Blueprint asks
   for `DATABASE_URL`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` as secret
   values. Use the Neon connection string and a new strong password that has
   never been used for the local CRM. Render generates `AUTH_SECRET`.
3. Deploy. The container applies the versioned schema migrations, creates the
   first administrator and the fixed document categories, then starts the web
   server and jobs process. Repeated starts do not reset the administrator
   password or load examples. The first deploy can take several minutes because
   the Docker image installs Chromium and Chinese fonts.
4. Wait for `/api/health` to return `{"status":"ok"}`. Open the Render URL's
   `/login` page and sign in using the cloud administrator email and password.
   Create a test agent, model, item, published price book, deal, and quotation.
   Download a quotation PDF to check the complete workflow. See
   [`first-use.md`](first-use.md) for the detailed data-entry sequence.

The app stores uploaded PDFs and photos in PostgreSQL, so they survive web
service restarts. Render's free web service sleeps when idle. It can take about
a minute to wake, and the in-process daily jobs only run while it is awake or
when it starts again. Free web service memory may also limit large PDF jobs.
Neon free usage and storage limits apply. Maintain independent encrypted database
backups and rehearse a restore before entering records that must be retained.
For staff use, move to a paid always-on host with monitored jobs, backups, and
the release checks in [`deployment-readiness.md`](deployment-readiness.md).

## Source and credentials

- Push source changes to GitHub to trigger Render deployments. GitHub Actions
  runs tests, type checking, lint, and build on pushes and pull requests.
- Keep the cloud administrator password and Neon connection string in a password
  manager. They cannot be recovered from this repository.
- Do not run `npm run db:seed` against the cloud database. It is only for
  disposable example databases.
- If a deployment fails, inspect Render's build/start logs. An invalid database
  URL or missing administrator secret stops startup before the app is exposed.
