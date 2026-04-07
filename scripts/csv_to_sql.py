"""
Generate SQL INSERT statements from lighthouse_v7 CSV files.
Usage: python csv_to_sql.py <table_name>
Outputs SQL to stdout.
"""
import csv
import sys
import os
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'MLPipelines', 'Data', 'lighthouse_v7')

def quote_val(v):
    """Convert a CSV string value to a SQL literal."""
    if v == '' or v is None:
        return 'NULL'
    # Boolean
    if v.strip().lower() == 'true':
        return 'TRUE'
    if v.strip().lower() == 'false':
        return 'FALSE'
    # Number (int or float) - no quotes
    try:
        int(v)
        return v
    except ValueError:
        pass
    try:
        float(v)
        return v
    except ValueError:
        pass
    # Escape single quotes
    escaped = v.replace("'", "''")
    return f"'{escaped}'"

def csv_to_insert(table_name):
    path = os.path.join(DATA_DIR, f'{table_name}.csv')
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        return ''

    cols = list(rows[0].keys())
    col_list = ', '.join(cols)

    value_rows = []
    for row in rows:
        vals = ', '.join(quote_val(row[c]) for c in cols)
        value_rows.append(f'  ({vals})')

    # Split into batches of 200 rows
    batch_size = 200
    sqls = []
    for i in range(0, len(value_rows), batch_size):
        batch = value_rows[i:i+batch_size]
        sql = f'INSERT INTO {table_name} ({col_list}) VALUES\n' + ',\n'.join(batch) + '\nON CONFLICT DO NOTHING;'
        sqls.append(sql)

    return '\n\n'.join(sqls)

if __name__ == '__main__':
    table = sys.argv[1]
    print(csv_to_insert(table))
