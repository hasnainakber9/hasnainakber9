# Climate digest

The weekly Friday shortlist of new papers, datasets, methods and opportunities in climate data science.

| Path | What |
|---|---|
| `BRIEF.md` | Standing spec: focus areas, pipeline, format. **Edit this to change the digest.** |
| `20YY-MM-DD.md` | Weekly issues |
| `opportunities.md` | Deadlines tracker for programmes, conferences, schools and challenges |
| `applications/` | Drafts Claude prepares for you to review and submit |
| `profile/` | Put your CV here (e.g. `cv.md` or `cv.pdf`) so drafts use your real background |
| `harvest/` | Raw weekly candidate lists from the harvester |
| `archive/prior-coverage.md` | Items covered by the earlier digest (25 Sep – 6 Nov 2026) |
| `tools/harvest.py` | Keyless collector: Crossref, arXiv (DataCite), Zenodo, PyPI, NASA CMR, ECMWF forum, NOAA CPC/PSL |
| `tools/check_access.py` | Verifies CDS / Earthdata / Earth Engine credentials from environment variables |
| `tools/mark_seen.py` | Records items already published so they aren't repeated |
| `state/` | Last-seen versions and seen items |

Run locally:

```bash
pip install requests
python3 climate-digest/tools/harvest.py --date 2026-11-12
python3 climate-digest/tools/check_access.py
```
