"""Verify the nightly penalty job against an open disposable example order."""

import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
env = dict(line.split("=", 1) for line in (ROOT / ".local" / "e2e.env").read_text(encoding="utf-8").splitlines() if "=" in line)
if not urlparse(env["DATABASE_URL"]).path.endswith("_e2e"):
    raise RuntimeError("Nightly check requires a disposable _e2e database")
PSQL = ROOT / ".local" / "postgresql16" / "bin" / "psql.exe"
NODE = Path(r"C:\Users\goswa\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")

def sql(query: str):
    result = subprocess.run([str(PSQL), "-d", env["DATABASE_URL"], "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                            capture_output=True, text=True, check=True)
    return result.stdout.strip()

sql("""insert into work_orders(order_id,mi_number,issued_at)
       select id,'M-2026-0148',now() from orders where pi_number='P-2026-0148'
       on conflict(order_id) do nothing""")
sql("""insert into progress_reviews(work_order_id,sequence,due_date,filled_at,
       reported_stage,expected_completion,cumulative_slip_days)
       select id,1,current_date,now(),'assembly',current_date + 14,14
       from work_orders where mi_number='M-2026-0148'
       on conflict(work_order_id,sequence) do update
       set filled_at=excluded.filled_at,cumulative_slip_days=excluded.cumulative_slip_days""")
result = subprocess.run([str(NODE), "--env-file=.local/e2e.env", "node_modules/tsx/dist/cli.mjs",
                         "src/jobs/nightly.ts"], cwd=ROOT, capture_output=True, text=True,
                        env={**os.environ, "PATH": str(NODE.parent) + os.pathsep + os.environ["PATH"]}, check=True)
assert "Recalculated 1 open-order penalty exposures" in result.stdout
value = sql("""select weeks_late || '|' || accrued_exposure || '|' || cap_amount
               from penalty_exposures p join orders o on o.id=p.order_id
               where o.pi_number='P-2026-0148'""")
assert value == "2|8278.50|41392.50", value
print("Nightly penalty exposure: 14 days -> 2 weeks -> USD 8,278.50, cap USD 41,392.50: passed")
