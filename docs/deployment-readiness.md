# Deployment readiness — 2026-10-05

The user has no office Docker host yet, so the CRM remains on the local
PostgreSQL instance and loopback-bound app preview. The current preview uses a
clean `kaoming_live` database for manually entered records. The separate `kaoming`
database holds worked examples and is not mixed with live entries. Office rollout steps below
are retained for when a host and backup destination are available.
The local scheduled worker is started separately with `npm run jobs:worker:local`
while the app runs on `127.0.0.1:3000`.

## Local evidence

The application, all 18 report routes, the document flows, and the nightly and
quarterly calculations have been exercised against worked examples. A separate
empty-database browser check created an agent, model, bilingual item, published
price book, deal, issued quotation and downloadable PDF without example records.
The worker
is part of `docker-compose.yml` and runs after the app health check. The app
waits for the separate one-time migration container. The clean install passed
`npm run lint`, all 40 unit tests, `npm run build` on Next 16.3.8, and
`npm audit --omit=dev` with zero advisories. A simulated production-only install
served authenticated report routes, ran the worker, and generated a Chinese PDF.
The upgraded migration CLI applied the existing migrations to the disposable
database. Compose itself has **not** been started on this Windows workstation because
the Docker CLI is not installed here. Run `docker compose config` and a full stack
smoke test on the deployment host before opening the system to staff.

The build also passed with `.env.local` temporarily absent, matching the Docker
build context; the local file was restored afterwards. The production runtime
stage contains no worked-example seed files or development dependencies.

A local `pg_dump` produced a readable custom-format archive with a matching
SHA-256 checksum. The archive was restored into a separate loopback-bound
PostgreSQL 16 cluster. `db:smoke` passed against that restored copy, including
the administrator password hash, Chinese item name, price book and example
quotation PDF. The restored copy held two agents, one deal, one stored proposal
PDF, two audit entries and two Q3 scorecard snapshots. The temporary cluster was
stopped and removed after the check. The Compose backup script passed a syntax
parse, but still needs a Docker-host run. The full development/build dependency audit reports 11
advisories (4 moderate, 7 high). These packages are absent from the app runtime
image; the short-lived migration image contains them. Keep it unexposed and
upgrade those tools in a later hardening pass.

## Before office rollout

1. Supply an office host, DNS name, TLS access, and a restricted backup destination.
   Set real `DB_PASSWORD`, `AUTH_SECRET`, `AUTH_URL`, and `CRM_DOMAIN` in `.env`.
   Keep `.env` out of source control. Use a URL-safe database password because the
   Compose `DATABASE_URL` embeds it in a connection URL.
2. Run `docker compose config`, then `docker compose up --build -d`. Check
   `docker compose ps -a` for a completed `migrate`, healthy `postgres` and `app`,
   and a running `jobs` service. Inspect `docker compose logs migrate app jobs`
   for migration and first-cycle success.
3. Provide `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` temporarily in the
   operator shell, then run `docker compose run --rm -e SEED_ADMIN_EMAIL -e
   SEED_ADMIN_PASSWORD app npm run db:bootstrap-admin` once. Clear those shell
   variables afterwards. This command creates only an administrator. Never run
   `db:seed` on an office database; it loads worked examples.
4. Sign in, verify permissions, create a test draft quotation, and exercise a
   document download and a photo upload. Confirm that Caddy serves the configured
   HTTPS domain and that staff can reach it from the intended network.
5. Run `scripts/backup-compose.ps1` from PowerShell on the Compose host. Check the
   `.dump` file and its SHA-256 sidecar, copy them to encrypted off-host storage,
   and schedule this operation outside staff hours. A same-host `backup/` directory
   alone is not a disaster-recovery copy. PostgreSQL contains uploaded files as
   well as business records, so this one dump covers both.
6. Rehearse restore on an isolated fresh Compose project before go-live. Start
   only `postgres`, restore the custom-format dump with `pg_restore -U kaoming -d
   kaoming --no-owner --no-privileges` into its empty database, then start `app`
   and `jobs`. Verify row counts, a downloaded PDF/photo, an issued document, and
   an audit entry. Never use the live database as the restore rehearsal target.
7. Assign an operator to watch failed job logs, database health, disk space,
   backups, and restore checks. Store the restore procedure and credentials with
   the office's approved operations material.

## Release gates still open

- Historical ERP exports, agent and item masters, prices, open orders, warranty
  machines, and actual contract terms have not been supplied. Current quotations
  can be entered manually as the catalog grows; reporting and warranty figures
  remain incomplete until the relevant real records exist. The clean local
  preview starts empty. Validate entered and imported data before relying on
  report figures.
- 生管 must physically accept printed PI and MI samples. The supervisor and
  warehouse must physically accept 出貨單. The original German claim register must
  be reproduced and checked.
- B2 scorecard publishing stays disabled until four observed quarters, market-size
  bands, scoring thresholds, and dated FX inputs are agreed. The translation
  provider and privacy review for cases also remain open.
- The report query layer needs pagination and a performance check with realistic
  historical volumes before a large reporting history is loaded. The backup script and Compose
  startup need a deployment-host test; neither was executable on this machine.

## Rollback and recovery

Keep the previous application image and an off-host verified backup before each
upgrade. If a new release fails its smoke test, stop `app` and `jobs`, restore the
last known working code/image, and start them again. Database migrations in this
project are forward-only; do not assume an old image can run against a newer
schema. For a schema or data failure, restore a verified database backup into an
isolated environment, inspect it, and only then plan a production restore during
an announced outage. Record the backup timestamp so staff know the possible
data-loss window.
