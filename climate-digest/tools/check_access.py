#!/usr/bin/env python3
"""Check that data-portal credentials are present and still valid.

Credentials are never stored in this repo. They come from environment
variables set in the cloud environment's settings (Network secrets /
environment variables), so every new session picks them up automatically.

  CDS (ERA5, ERA5-Land, C3S):   CDSAPI_URL=https://cds.climate.copernicus.eu/api
                                CDSAPI_KEY=<personal access token from your CDS profile page>
  NASA Earthdata (IMERG, MODIS,  EARTHDATA_USERNAME=<username>
  SMAP, GLDAS):                  EARTHDATA_PASSWORD=<password>   (earthaccess reads these)
  Google Earth Engine:           EE_PROJECT=<cloud project id registered for noncommercial EE use>
                                 EE_SERVICE_ACCOUNT_KEY=<full JSON key of a service account
                                                         registered with Earth Engine>

Prints one line per service and never prints secret values.
Exit code 0 = everything configured is valid; 1 = something is missing or failing.
"""
import json
import os
import sys

import requests

UA = {"User-Agent": "climate-digest-access-check/1.0"}
ok = True


def line(service, status, detail=""):
    global ok
    if status != "OK":
        ok = False
    print(f"{service:<22} {status:<9} {detail}")


# --- CDS --------------------------------------------------------------------
key, url = os.environ.get("CDSAPI_KEY"), os.environ.get("CDSAPI_URL", "https://cds.climate.copernicus.eu/api")
if not key:
    line("CDS (ERA5)", "MISSING", "set CDSAPI_KEY (and CDSAPI_URL). Without it, use public ARCO-ERA5 on GCS instead.")
else:
    try:
        r = requests.get(f"{url.rstrip('/')}/retrieve/v1/jobs", params={"limit": 1},
                         headers={**UA, "PRIVATE-TOKEN": key.split(":")[-1]}, timeout=30)
        if r.status_code == 200:
            line("CDS (ERA5)", "OK", "token accepted. Accept each dataset's licence once on its CDS page.")
        else:
            line("CDS (ERA5)", "INVALID", f"HTTP {r.status_code}; regenerate the token on your CDS profile page")
    except Exception as e:  # noqa: BLE001
        line("CDS (ERA5)", "ERROR", type(e).__name__)

# --- NASA Earthdata ---------------------------------------------------------
u, p = os.environ.get("EARTHDATA_USERNAME"), os.environ.get("EARTHDATA_PASSWORD")
if not (u and p):
    line("NASA Earthdata", "MISSING", "set EARTHDATA_USERNAME and EARTHDATA_PASSWORD")
else:
    try:
        r = requests.get("https://urs.earthdata.nasa.gov/api/users/tokens", auth=(u, p), headers=UA, timeout=30)
        if r.status_code == 200:
            line("NASA Earthdata", "OK", "login works. Approve 'NASA GESDISC DATA ARCHIVE' under Applications once.")
        else:
            line("NASA Earthdata", "INVALID", f"HTTP {r.status_code}; check username/password")
    except Exception as e:  # noqa: BLE001
        line("NASA Earthdata", "ERROR", type(e).__name__)

# --- Google Earth Engine ----------------------------------------------------
sa, proj = os.environ.get("EE_SERVICE_ACCOUNT_KEY"), os.environ.get("EE_PROJECT")
if not (sa and proj):
    line("Google Earth Engine", "MISSING", "set EE_PROJECT and EE_SERVICE_ACCOUNT_KEY (optional service)")
else:
    try:
        info = json.loads(sa)
        try:
            import ee  # type: ignore
        except ImportError:
            line("Google Earth Engine", "PARTIAL", f"key parses ({info.get('client_email')}); "
                                                   "pip install earthengine-api to test login")
        else:
            creds = ee.ServiceAccountCredentials(info["client_email"], key_data=sa)
            ee.Initialize(creds, project=proj)
            ee.Number(1).getInfo()
            line("Google Earth Engine", "OK", f"initialized as {info['client_email']}")
    except Exception as e:  # noqa: BLE001
        line("Google Earth Engine", "INVALID", f"{type(e).__name__}: {str(e)[:120]}")

# --- Keyless sources (sanity) ----------------------------------------------
try:
    r = requests.get("https://storage.googleapis.com/gcp-public-data-arco-era5/ar/"
                     "full_37-1h-0p25deg-chunk-1.zarr-v3/.zmetadata", headers=UA, timeout=30)
    line("ARCO-ERA5 (public)", "OK" if r.ok else "ERROR", "no login needed" if r.ok else f"HTTP {r.status_code}")
except Exception as e:  # noqa: BLE001
    line("ARCO-ERA5 (public)", "ERROR", type(e).__name__)

sys.exit(0 if ok else 1)
