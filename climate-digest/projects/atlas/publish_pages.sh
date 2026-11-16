#!/bin/sh
# Publish site/ to GitHub Pages (branch gh-pages, served at https://hasnainakber9.github.io/hasnainakber9/).
# Run after build.py. The gh-pages branch holds only the built site, as a single commit replaced on each publish.
set -e
cd "$(dirname "$0")"
OUT=$(mktemp -d)
python3 - "$OUT" <<'PY'
import os, shutil, sys
out = sys.argv[1]
src = open("site/index.html", encoding="utf-8").read()
cut = src.index('<div')                 # title, links and style come first; the page body starts at the first div
head = src[:cut].replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
desc = ("Where women and girls aged 10 to 49 live with cold, heat, floods, failed rains, fighting, darkness and long "
        "journeys to care, and where nobody has asked or studied. Every province on Earth, with districts for 196 countries.")
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f'<meta name="description" content="{desc}">\n<meta property="og:title" content="Atlas of the Uncounted">\n'
        f'<meta property="og:description" content="{desc}">\n'
        + head + '<style>body { margin: 0; }</style>\n</head>\n<body>\n' + src[cut:] + '\n</body>\n</html>\n')
open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(page)
for f in ("atlas.json", "adm1.json"):
    shutil.copy(os.path.join("site", f), out)
shutil.copytree(os.path.join("site", "d"), os.path.join(out, "d"))
open(os.path.join(out, ".nojekyll"), "w").close()
PY
cd "$OUT"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" \
    commit -q -m "Atlas of the Uncounted: site build $(date -u +%Y-%m-%d)"
git push -q -f "$(git -C "$OLDPWD" remote get-url origin)" gh-pages:gh-pages
echo "pushed $(du -sh . | cut -f1) to gh-pages"
rm -rf "$OUT"
