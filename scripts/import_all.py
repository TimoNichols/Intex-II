"""
Import all remaining CSV data into Supabase.
Tables already done: safehouses, partners, supporters, residents,
                     public_impact_snapshots, partner_assignments
"""
import csv, ast, json, os, sys
from supabase import create_client

SUPABASE_URL = "https://eiruanraqccrkghgotef.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpcnVhbnJhcWNjcmtnaGdvdGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTg5OTQsImV4cCI6MjA5MTA5NDk5NH0.kfvLJ2IzSRJoH5L0i8nCiAmS13UJJVa6PGMFRG57Ysg"
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'MLPipelines', 'Data', 'lighthouse_v7')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def read_csv(table):
    path = os.path.join(DATA_DIR, f'{table}.csv')
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def cast(v, col=''):
    """Convert CSV string to Python type."""
    if v == '' or v is None:
        return None
    if v.strip().lower() == 'true':
        return True
    if v.strip().lower() == 'false':
        return False
    try:
        return int(v)
    except ValueError:
        pass
    try:
        f = float(v)
        # If it's a whole number, return as int to avoid integer column type errors
        if f == int(f):
            return int(f)
        return f
    except ValueError:
        pass
    if col == 'metric_payload_json':
        try:
            return ast.literal_eval(v)
        except Exception:
            pass
    return v

def upsert_table(table, id_col, batch_size=100):
    rows = read_csv(table)
    print(f"{table}: {len(rows)} rows", flush=True)
    cols = list(rows[0].keys())
    dicts = [{c: cast(r[c], c) for c in cols} for r in rows]

    inserted = 0
    for i in range(0, len(dicts), batch_size):
        batch = dicts[i:i+batch_size]
        try:
            result = supabase.table(table).upsert(batch, on_conflict=id_col).execute()
            inserted += len(batch)
            print(f"  {table} batch {i//batch_size + 1}: {len(batch)} rows OK", flush=True)
        except Exception as e:
            print(f"  ERROR batch {i//batch_size + 1}: {e}", flush=True)
            # Try smaller batches
            for j in range(0, len(batch), 10):
                mini = batch[j:j+10]
                try:
                    supabase.table(table).upsert(mini, on_conflict=id_col).execute()
                    inserted += len(mini)
                except Exception as e2:
                    print(f"    FAILED mini batch: {e2}", flush=True)
    print(f"  {table} DONE: {inserted} inserted", flush=True)
    return inserted

# Order matters due to FK constraints
tables = [
    # (table, id_col)
    ('social_media_posts', 'post_id'),
]

for table, id_col in tables:
    upsert_table(table, id_col)

print("ALL DONE", flush=True)
