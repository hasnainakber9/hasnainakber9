#!/bin/sh
# Rebuild the page data from whatever the district run has finished, and keep a compressed copy of the raw rows.
cd "$(dirname "$0")" && gzip -c data/adm2_raw.csv > data/adm2_raw.csv.gz && python3 build.py | tail -1
