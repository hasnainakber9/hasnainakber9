---
name: olostep-batch-scraping
description: Scrape thousands of URLs (up to 10,000 per batch) to Markdown with the Olostep Python SDK — build a URL list (e.g. from a sitemap), submit one batch, track progress with a resumable checkpoint, download results concurrently, and verify coverage with a manifest and failures report. Also covers single-page scrapes, crawls and site maps. Use when the user wants large-scale or batch web scraping with Olostep, or mentions OLOSTEP_API_KEY.
---

# Olostep Batch Scraping

Based on KDnuggets, "Web Scraping 7,000 Pages in 3 Minutes with Python and
Olostep". Result there: 7,225 pages scraped in < 3 min, but the full job
(scrape → download → verify) took ~22.5 min and saved 9,938/10,000 pages.
**Lesson: measure the whole pipeline and always verify — a "completed" batch
does not mean every page was saved.**

## Setup

```bash
pip install olostep requests tqdm
```

- Needs `OLOSTEP_API_KEY` (env var). Never hard-code it or echo it. If it's
  missing, ask the user to set it — don't prompt for it in chat.
- **Every new batch spends API credits.** Confirm URL count with the user before
  submitting a large batch, and reuse the checkpoint instead of resubmitting.

## SDK surface (olostep ≥ 1.2)

```python
from olostep import Olostep, AsyncOlostep   # sync / async clients
c = AsyncOlostep(api_key=os.environ["OLOSTEP_API_KEY"])
await c.scrapes.create(url="https://…", formats=["markdown"])      # one page
await c.batches.create(urls=[{"url": u, "custom_id": k}, ...])      # ≤10k URLs
await c.batches.info(batch_id)        # .status ("in_progress"/"completed"/"failed"), .completed_urls
c.batches.items(batch_id, status="completed", batch_size=50, wait_for_completion=False)  # async iterator
await item.retrieve(["markdown"])     # → .markdown_content
c.crawls.create(...), c.maps.create(...), c.answers.create(...)    # crawl a site / list URLs / Q&A
await c.close()
```

## Workflow

A ready-to-run script implementing all steps is at
`scripts/batch_scrape.py` (next to this file):

```bash
python .claude/skills/olostep-batch-scraping/scripts/batch_scrape.py \
    --sitemap https://developer.mozilla.org/sitemaps/en-us/sitemap.xml.gz \
    --prefix https://developer.mozilla.org/en-US/docs/ -n 1000 --out data/olostep
# or: --urls-file my_urls.csv   (CSV with a "url" column, or one URL per line)
```

1. **Prepare URLs** — dedupe, fix order with a seed, write `urls.csv`, and
   fingerprint the list (sha256) so a resumed run can't silently mix lists.
2. **Submit** one batch with `custom_id` = zero-padded index; save
   `{batch_id, urls_sha256, started}` to `batch.json` immediately.
3. **Track** — poll `batches.info` every ~10 s with a tqdm bar until
   `completed`/`failed`, with a max-wait timeout; rerunning resumes from
   `batch.json`.
4. **Download** — iterate `batches.items(status="completed")`, retrieve
   Markdown with an `asyncio.Semaphore` (~96) and a per-item timeout + 1 retry;
   skip files already saved so downloads are resumable.
5. **Verify** — a file counts only if non-empty; write `manifest.csv`
   (file,url,saved), `failures.csv` (url,error) and `summary.json` with
   scrape/download/total seconds and coverage.

## Known quirk
In SDK 1.2.2 `batches.info` could raise
`OlostepClientError_ResponseValidationFailed`; the workaround (used in the
script) is to rebuild the model from the raw body:

```python
from olostep.errors import OlostepClientError_ResponseValidationFailed
from olostep.models.response import BatchInfoResponse
try:
    info = await c.batches.info(bid)
except OlostepClientError_ResponseValidationFailed as e:
    info = BatchInfoResponse.model_validate({"parser": "none", **json.loads(e.response.body)})
```

Respect target sites' terms of service and robots rules when choosing URLs.
