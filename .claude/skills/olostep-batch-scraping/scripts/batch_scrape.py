#!/usr/bin/env python3
"""Batch-scrape URLs to Markdown with the Olostep SDK: submit, track, download, verify.

Resumable: rerun the same command to continue an interrupted batch/download.
Requires OLOSTEP_API_KEY. Submitting a new batch spends Olostep credits.
"""
import argparse
import asyncio
import csv
import gzip
import hashlib
import json
import os
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

import requests
from olostep import AsyncOlostep
from olostep.errors import OlostepClientError_ResponseValidationFailed
from olostep.models.response import BatchInfoResponse
from tqdm import tqdm

MAX_BATCH = 10_000


def write_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")


def valid_file(path: Path) -> bool:
    try:
        return path.is_file() and bool(path.read_text(encoding="utf-8").strip())
    except (OSError, UnicodeError):
        return False


def urls_from_sitemap(url: str, prefix: str | None) -> list[str]:
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    xml = gzip.decompress(resp.content) if resp.content.startswith(b"\x1f\x8b") else resp.content
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = {n.findtext("s:loc", namespaces=ns) for n in ET.fromstring(xml).findall("s:url", ns)}
    return sorted(u for u in locs if u and (not prefix or u.startswith(prefix)))


def urls_from_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    first = text.splitlines()[0].strip().lower() if text.strip() else ""
    if first == "url" or first.startswith("url,"):
        with path.open(encoding="utf-8", newline="") as f:
            rows = [r["url"].strip() for r in csv.DictReader(f)]
    else:
        rows = [line.strip() for line in text.splitlines()]
    return list(dict.fromkeys(u for u in rows if u))  # dedupe, keep order


def prepare_urls(args, data: Path) -> list[str]:
    urls_csv = data / "urls.csv"
    if not urls_csv.exists():
        urls = urls_from_sitemap(args.sitemap, args.prefix) if args.sitemap else urls_from_file(Path(args.urls_file))
        if args.sitemap:
            random.Random(args.seed).shuffle(urls)
        urls = urls[: args.n] if args.n else urls
        if not urls:
            sys.exit("No URLs found.")
        if len(urls) > MAX_BATCH:
            sys.exit(f"{len(urls)} URLs exceeds the {MAX_BATCH} per-batch limit; pass -n.")
        with urls_csv.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["url"])
            w.writerows([u] for u in urls)
        write_json(data / "dataset.json", {"source": args.sitemap or args.urls_file,
                                           "created_utc": datetime.now(timezone.utc).isoformat(),
                                           "selected_urls": len(urls), "seed": args.seed})
    with urls_csv.open(encoding="utf-8", newline="") as f:
        return [r["url"] for r in csv.DictReader(f)]


async def batch_info(client, batch_id):
    try:
        return await client.batches.info(batch_id)
    except OlostepClientError_ResponseValidationFailed as e:  # SDK 1.2.2 quirk
        return BatchInfoResponse.model_validate({"parser": "none", **json.loads(e.response.body)})


async def main(args) -> None:
    key = os.getenv("OLOSTEP_API_KEY")
    if not key:
        sys.exit("Set OLOSTEP_API_KEY first.")
    data = Path(args.out)
    data.mkdir(parents=True, exist_ok=True)
    urls = prepare_urls(args, data)
    n = len(urls)
    fingerprint = hashlib.sha256("\n".join(urls).encode()).hexdigest()
    width = max(5, len(str(n)))
    expected = {f"{i:0{width}d}": u for i, u in enumerate(urls)}

    client = AsyncOlostep(api_key=key)
    checkpoint = data / "batch.json"
    resumed = checkpoint.exists()
    try:
        if resumed:
            run = json.loads(checkpoint.read_text(encoding="utf-8"))
            if run["urls_sha256"] != fingerprint:
                sys.exit("urls.csv changed since batch.json was written; move the old run aside first.")
        else:
            if args.dry_run:
                print(f"Dry run: would submit {n:,} URLs (spends credits). Re-run without --dry-run.")
                return
            started = time.time()
            batch = await client.batches.create(urls=[{"url": u, "custom_id": k} for k, u in expected.items()])
            run = {"batch_id": batch.id, "requested": n, "urls_sha256": fingerprint, "started_wall": started}
            write_json(checkpoint, run)
        out = data / "output" / run["batch_id"]
        out.mkdir(parents=True, exist_ok=True)
        print(("Resuming " if resumed else "Submitted ") + run["batch_id"])

        # Track
        wait_started = time.monotonic()
        with tqdm(total=n, desc="Scraping", unit="page") as bar:
            while True:
                info = await batch_info(client, run["batch_id"])
                bar.update(max(0, info.completed_urls - bar.n))
                if info.status in ("completed", "failed"):
                    break
                if time.monotonic() - wait_started > args.max_wait:
                    sys.exit("Batch still running; rerun the same command to keep waiting.")
                await asyncio.sleep(10)
        run.setdefault("scrape_seconds", time.time() - run["started_wall"])
        write_json(checkpoint, run)

        # Download
        dl_started = time.perf_counter()
        limit = asyncio.Semaphore(args.concurrency)
        errors, scheduled, tasks, saved = {}, set(), [], set()
        bar = tqdm(total=n, desc="Markdown saved", unit="file")

        async def save(item):
            k = item.custom_id
            if k not in expected:
                return
            async with limit:
                path = out / f"{k}.md"
                if valid_file(path):
                    saved.add(k); bar.update(1)
                    return
                for attempt in range(2):
                    try:
                        async with asyncio.timeout(40):
                            content = (await item.retrieve(["markdown"])).markdown_content
                        if not content or not content.strip():
                            errors[k] = "No Markdown content returned"
                            return
                        path.write_text(content, encoding="utf-8")
                        saved.add(k); bar.update(1)
                        return
                    except Exception as e:  # noqa: BLE001 - record and retry once
                        errors[k] = str(e)
                        if attempt == 0:
                            await asyncio.sleep(1)

        async for item in client.batches.items(run["batch_id"], status="completed",
                                               batch_size=50, wait_for_completion=False):
            if item.retrieve_id and item.custom_id not in scheduled:
                scheduled.add(item.custom_id)
                tasks.append(asyncio.create_task(save(item)))
        await asyncio.gather(*tasks)
        bar.close()
        dl_seconds = time.perf_counter() - dl_started

        # Verify
        missing = {k for k in expected if not valid_file(out / f"{k}.md")}
        with (out / "manifest.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["file", "url", "saved"])
            w.writerows((f"{k}.md", u, k not in missing) for k, u in expected.items())
        with (out / "failures.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["url", "error"])
            w.writerows((expected[k], errors.get(k, "Missing result or failed scrape")) for k in sorted(missing))
        summary = {"batch_id": run["batch_id"], "requested": n, "batch_status": info.status,
                   "api_completed_urls": info.completed_urls, "saved_markdown": n - len(missing),
                   "missing_markdown": len(missing), "coverage_pct": round(100 * (n - len(missing)) / n, 2),
                   "resumed": resumed, "scrape_seconds": round(run["scrape_seconds"], 2),
                   "download_seconds": round(dl_seconds, 2),
                   "total_seconds": round(time.time() - run["started_wall"], 2)}
        write_json(out / "summary.json", summary)
        print(json.dumps(summary, indent=2))
        print("Files:", out.resolve())
    finally:
        await client.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--sitemap", help="Sitemap URL (.xml or .xml.gz)")
    src.add_argument("--urls-file", help="CSV with a 'url' column, or one URL per line")
    p.add_argument("--prefix", help="Keep only sitemap URLs starting with this")
    p.add_argument("-n", type=int, default=0, help="Max URLs (<=10000)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default="data/olostep")
    p.add_argument("--concurrency", type=int, default=96)
    p.add_argument("--max-wait", type=int, default=2400, help="Seconds to wait for scraping")
    p.add_argument("--dry-run", action="store_true", help="Prepare URLs only; don't submit")
    asyncio.run(main(p.parse_args()))
