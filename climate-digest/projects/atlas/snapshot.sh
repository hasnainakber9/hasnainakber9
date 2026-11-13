#!/bin/sh
# Compress the district statistics (kept in git as .gz; the raw files are not) and rebuild the page data.
cd "$(dirname "$0")"
gzip -c data/adm2_raw.csv > data/adm2_raw.csv.gz
[ -f data/adm2_s2.csv ] && gzip -c data/adm2_s2.csv > data/adm2_s2.csv.gz
python3 build.py | tail -1
