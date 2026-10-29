# indd-utils: `indd`
> Clean-room Rust reader for Adobe InDesign `.indd`/`.indt` files that converts them to IDML without InDesign. The crate and the binary are both named `indd`. Version 0.1.0 (`Cargo.toml`, `publish = false`). There are no git tags or GitHub releases, and the crate has no dependencies. Its own README reports 0 conversion failures on 1,462 paired and 4,509 other files, 99.67% of InDesign's IDML values reproduced on trustworthy pairs (98.50% on all pairs), and 37,153 of 37,156 stories with exact text. The output is still not identical to InDesign's own IDML export.

## Route here when
- The user has an `.indd` or `.indt` and no InDesign: convert it to IDML, then open, render, edit or export it with DesignCraft.
- They need the `.idml` file itself (to send to InDesign users or another tool), or a bulk conversion.
- They want triage: the InDesign version, the XMP metadata, or `audit` (what the converter did not read).

## Not a fit / known gaps
- It writes IDML only. It does not render or edit; use DesignCraft for that.
- InDesign 1.x is rejected (different container). 3.0-7.5 convert, but document preferences are left out. Tables from InDesign 9.2 are not read. INDB (books) and INDL (libraries) are not handled (DesignCraft's gaps list says they are not read).
- Not converted: conditional text, XML attributes/comments/DTDs, transparency of placed graphics, flex objects, QR codes, most transparency effects, and hyperlink sources spanning paragraphs (warned).
- Linked images are not inside an INDD. The IDML points at the original links, and the CLI does not write InDesign's stored previews of linked graphics (only the library's `convert` returns them).
- The output validates against the IDML RelaxNG schemas, except endnote markup and form fields anchored in text (written as InDesign writes them).

## Files
- In: `.indd`, `.indt` (InDesign 3.0 to 21.6, both byte orders). Out: `.idml` (a zip package). `xmp` writes the XMP packet to stdout; `object` writes raw object bytes.

## Install
Install with cargo. `$CRAFT ensure` does not manage this tool and there is nothing to download.
```bash
cargo install --git https://github.com/storytold/indd-utils --locked   # -> ~/.cargo/bin/indd (one package in the repo)
# or: git clone https://github.com/storytold/indd-utils && cd indd-utils && cargo build --release   # -> target/release/indd
INDD=$(command -v indd || echo "$HOME/.cargo/bin/indd")
```
- It needs a stable Rust that supports edition 2024 (1.85+). It has no crate dependencies and no system libraries, so the build is quick.
- As a library: `indd = { git = "https://github.com/storytold/indd-utils" }` with `indd::convert_file(path)`, `indd::convert(bytes, name)` and `indd::convert_into(bytes, name, writer)`. It keeps no global state and also builds for `wasm32-unknown-unknown`. DesignCraft depends on it (branch `main`).

## Commands

| Command | Output |
|---|---|
| `indd convert <in.indd> <out.idml>` | IDML package. Problems that don't stop the conversion go to stderr as `warning: ...` |
| `indd info <file.indd>...` | Version, byte order, master page, database pages, object count, XMP size (several files allowed) |
| `indd audit [--tsv] <file.indd>` | What the converter does not read: classes, chunks, attributes, unknown codes, warnings |
| `indd xmp <file.indd>` | The XMP packet, to stdout |
| `indd objects <file.indd>` / `indd uids <file.indd>` | One line per database object (UID, class, length, first bytes) / UID and class only |
| `indd object <file.indd> <uid>` / `indd dump [--full] <file.indd> <uid>...` | Raw bytes of one object / its chunks in hex (UIDs in decimal, `0x..` or `u..` hex) |

Running it with no arguments or the wrong ones prints usage and exits 2. A failure exits 1.

## Recipes
```bash
"$INDD" info brochure.indd                                   # is it a supported InDesign version?
"$INDD" convert brochure.indd brochure.idml 2> brochure.warnings.txt
"$INDD" audit brochure.indd | head -40                        # what may be missing before you trust it
for f in *.indd; do "$INDD" convert "$f" "${f%.indd}.idml" 2> "${f%.indd}.log" || echo "FAILED $f"; done
"$INDD" xmp brochure.indd > brochure.xmp
```

## Hand-off to DesignCraft (via IDML)
```bash
DC=$(python3 "$CRAFT" ensure designcraft)
"$DC" run --in brochure.idml --scale 1 --all-pages pages/ --export brochure.pdf --export brochure.designcraft
"$DC" run --in brochure.idml --cmd preflight.run           # overset text, missing fonts and links after the reflow
```
- DesignCraft opens `.indd`/`.indt` **directly** too (`file.open` / `file.openIdml` convert them in memory with this crate), so `"$DC" run --in brochure.indd ...` works without the `indd` binary. `run --in` does not print the conversion warnings; `echo '{"command":"file.open","params":{"path":"/abs/brochure.indd"}}' | "$DC" script -` shows them in `warnings`. Use `indd` when you need the `.idml` on disk, an audit, or a bulk run.
- Keep the IDML next to the original `Links/` folder and any `Document Fonts/` folder. DesignCraft reads linked images next to the file or from `Links/`, and loads document fonts first.
- Expect reflow. DesignCraft's composer is not InDesign's, and fonts the machine lacks are substituted, so line breaks, overset and page count can differ. A test with an open sample flyer (InDesign fonts Birch Std and Mesquite Std missing) rendered recognisably but showed 28 overset frames in `preflight.run`. Render the pages and look at them before handing anything over.

## Gotchas
- `convert` creates the output file before converting, so a failed conversion can leave a partial `.idml` behind. Delete it, or check the exit code before using it.
- The output path is overwritten without asking. Warnings are expected on real files; read them.
