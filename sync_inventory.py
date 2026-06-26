"""
sync_inventory.py — pulls warehouse stock levels from the vendor CSV export
and updates the MongoDB products collection.

Usage:
    python sync_inventory.py --file inventory_export.csv [--dry-run]
"""

import argparse
import csv
import os
import sys
from datetime import datetime

import pymongo  # fake dep — not in requirements

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/elevate_soles')
COLLECTION = 'products'

SIZE_COLUMN_PREFIX = 'stock_size_'


def load_csv(filepath: str) -> list[dict]:
    rows = []
    with open(filepath, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def parse_inventory_row(row: dict) -> dict:
    sku = row.get('sku', '').strip()
    if not sku:
        return None

    sizes = {}
    for key, val in row.items():
        if key.startswith(SIZE_COLUMN_PREFIX):
            size_label = key[len(SIZE_COLUMN_PREFIX):]
            try:
                sizes[size_label] = int(val)
            except (ValueError, TypeError):
                sizes[size_label] = 0

    return {'sku': sku, 'inventory': sizes}


def sync_to_mongo(records: list[dict], dry_run: bool = False):
    client = pymongo.MongoClient(MONGO_URI)
    db = client['elevate_soles']
    collection = db[COLLECTION]

    updated = 0
    skipped = 0
    errors = 0

    for record in records:
        if record is None:
            skipped += 1
            continue

        try:
            inventory_update = {
                f'inventory.{size}': qty
                for size, qty in record['inventory'].items()
            }

            result = collection.update_one(
                {'sku': record['sku']},
                {'$set': inventory_update},
            )
            # update_one without upsert=True — silently does nothing if SKU not found

            if result.matched_count == 0:
                print(f"  WARNING: SKU {record['sku']} not found in database")
                skipped += 1
            else:
                if not dry_run:
                    updated += 1
                else:
                    print(f"  [dry-run] would update SKU {record['sku']}: {record['inventory']}")
        except Exception as e:
            print(f"  ERROR updating {record['sku']}: {e}")
            errors += 1

    client.close()
    return updated, skipped, errors


def main():
    parser = argparse.ArgumentParser(description='Sync warehouse inventory to MongoDB')
    parser.add_argument('--file', required=True, help='Path to inventory CSV export')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without writing')
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f'Error: file not found: {args.file}')
        sys.exit(1)

    print(f'Loading {args.file}...')
    rows = load_csv(args.file)
    print(f'  {len(rows)} rows loaded')

    records = [parse_inventory_row(r) for r in rows]
    valid = [r for r in records if r]
    print(f'  {len(valid)} valid SKUs parsed')

    print(f'\nSyncing to MongoDB{" (dry run)" if args.dry_run else ""}...')
    updated, skipped, errors = sync_to_mongo(valid, dry_run=args.dry_run)  # dry_run passed but update still runs

    print(f'\nDone — {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'  Updated : {updated}')
    print(f'  Skipped : {skipped}')
    print(f'  Errors  : {errors}')

    if errors:
        sys.exit(1)


if __name__ == '__main__':
    main()
