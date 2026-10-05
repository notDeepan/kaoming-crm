#!/bin/sh
set -eu

if [ -z "${AUTH_URL:-}" ]; then
  if [ -z "${RENDER_EXTERNAL_URL:-}" ]; then
    echo 'AUTH_URL or RENDER_EXTERNAL_URL is required' >&2
    exit 1
  fi
  export AUTH_URL="$RENDER_EXTERNAL_URL"
fi

npm run db:migrate:runtime
npm run db:bootstrap-admin

node --import tsx src/jobs/worker.ts &
worker_pid=$!
node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${PORT:-3000}" &
web_pid=$!

stop() {
  kill "$web_pid" "$worker_pid" 2>/dev/null || true
}
trap stop INT TERM

status=0
wait "$web_pid" || status=$?
stop
wait "$worker_pid" 2>/dev/null || true
exit "$status"
