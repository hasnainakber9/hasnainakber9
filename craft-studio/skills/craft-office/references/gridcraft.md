# GridCraft: `gridcraft-cli`
> Clean-room Rust reimplementation of Microsoft Excel, v0.13.0 (workspace `Cargo.toml`). Alpha: it covers ~89% of the ribbon catalog and 513 worksheet functions, but the project rates itself only ~50% ready for real work. Nobody has confirmed that Excel opens its XLSX output without a repair prompt. Workbooks of ~100 MB don't open. Charts are simplified and lose options on a round trip. Slicers, timelines and the data model are dropped on save. PDF export can't draw non-Latin text. `.xls`, `.xlsb` and `.ods` can be read but not written.

## Route here when
- Reading a sheet or range as a table or CSV, or summarising a workbook (sheets, used ranges, tables, charts, names).
- Writing values and formulas, building a model or report workbook, and recalculating. The engine has dynamic arrays, LET/LAMBDA and XLOOKUP.
- Evaluating a formula against a workbook without changing it, or checking a workbook's formulas against Excel's cached results (`check`).
- Formatting: number formats, fonts, fills, borders, conditional formats, tables, freeze panes, column widths.
- Charts, pivot tables, sparklines, sorting, AutoFilter, remove duplicates, text to columns, subtotals, goal seek.
- CSV/TSV/JSON/HTML to and from XLSX, and a PDF of one sheet or all sheets with page setup.

## Not a fit / known gaps
- No PNG render in the CLI. A visual check goes through PDF (see Check your work). Window screenshots need the desktop app.
- A PDF of non-Latin data. The PDF writer uses only the 14 standard fonts, so cells in Japanese, Cyrillic or Arabic come out blank while `Café` survives. For such data, deliver XLSX, or build the PDF through WordCraft.
- Big data (around 100 MB XLSX, recalculation of 100k dependents) and Power Query, Power Pivot, connections and refresh. VBA is kept in `.xlsm` but never run.
- Saving a password-protected workbook: it opens with its password but is saved without one.
- MCP folder confinement: GridCraft has no root flags (see MCP server).

## Files
- **Opens:** xlsx, xlsm, xltx, xltm, csv, tsv/tab/txt, json, html (tables). Import only:
  - `.xls`/`.xlt`: values, formulas, number formats, merges and sizes. No fonts, fills, borders or charts.
  - `.xlsb` and `.ods`: values and cached formula results, no formulas or formatting.
  - Encrypted xlsx (Agile or Standard): pass `password` to `file.open`.
- **Saves (format from the extension):** xlsx (the default), xlsm and xltm (VBA kept), xltx, csv and tsv (active sheet only), json (GridCraft's own JSON), html (one sheet), pdf.
- XLSX is the native format. Styles, themes, dynamic-array formulas, tables, conditional formats, validation, notes and threaded comments, hyperlinks, names, outline, print settings, pictures, sparklines and pivots all round-trip. Charts are simplified. Custom XML, external links, connections and OLE objects pass through unchanged.
- CSV and TSV are written with the displayed values: `"$1,200.00"` and `75.0%`, not 1200 and 0.75. Output is UTF-8 without a BOM, with CRLF line ends. A CSV that is read in gets a sheet named after the file (`sales.csv` becomes sheet `sales`), and numbers and dates in it are parsed, so `00123` becomes 123.
- Writing `.ods` or `.xls` fails with "supported for import only".

## Get the CLI
`G=$(python3 "$CRAFT" ensure gridcraft)`
- Release assets, taken from the packaging scripts and not checked against a published release:
  - Linux: `gridcraft-<ver>-linux-<arch>.tar.gz` has the CLI under `<dir>/bin/gridcraft-cli`. There is no Linux archive with only the CLI.
  - macOS: `gridcraft-cli-<ver>-macos-universal.zip`.
  - Windows: `gridcraft-<ver>-windows-<arch>-portable.zip` contains `gridcraft-cli.exe`.
  - FreeBSD: an x86_64 tarball.
  - Each release also has `SHA256SUMS.txt`.
- Building from source needs Rust 1.95 or newer: `cargo build --release --locked -p gridcraft-cli`. It took about 1.5 minutes here with dependencies already cached. The CLI depends only on the engine and MCP crates, plus zip and quick-xml for `check`. It needs no GUI crates or cargo features, and the binary links only libc, libm and libgcc_s. `CRAFT_FONTS_DIR` only affects the desktop UI.
- Environment variables:
  - `GRIDCRAFT_CONTROL_TOKEN`: authenticates `mcp --connect` and `send`.
  - `GRIDCRAFT_NO_PREFS`: no saved settings.
  - `RUST_LOG`: log level. Import warnings go to stderr.

## Subcommands
| Synopsis | Purpose |
|---|---|
| `info <file> [--json]` | Sheets (`*` marks the active one), used range, cell count, tables, charts, AutoFilter, names. `--json` returns the full `document.inspect`. |
| `cat <file> [--range A1:D20] [--sheet S] [--formulas] [--csv]` | Displayed values as an aligned table, or as CSV with `--csv`. `--formulas` shows formula text. The default range is the used range. |
| `eval <formula> [--in FILE] [--sheet S] [--cell A1] [--json]` | Evaluate without changing anything. The leading `=` is optional. Use English function names with `,` between arguments. `--json` gives typed values. |
| `convert <in> <out> [--sheet NAME]` | Output format from the extension: `.xlsx`, `.csv`, `.tsv`, `.json`, `.html` or `.pdf`. `--sheet` picks the sheet for csv, tsv, html and pdf. Writes `wrote <out> (N bytes[, P pages])` to stderr. |
| `run [--in FILE \| --sample budget\|sales\|grades] [--cmd 'id={json}']... [--script steps.jsonl]... [--out FILE] [--print RANGE\|used]... [--sheet S] [--csv] [--formulas] [--quiet]` | Opens a file, a sample or a blank workbook, then runs `--cmd` and `--script` steps in the order given. It then saves to `--out` and prints each `--print` range. Every non-null result is printed as a JSON line unless `--quiet`. |
| `check <file-or-dir>... [--json] [--tolerance 1e-9] [--max-report N]` | Recalculates and compares with Excel's cached values, then runs an XLSX round trip and package validation. Exits 0 when clean, 1 on any difference, 2 on a usage error. |
| `commands [--json] [--search X]` | Every command with its params doc. |
| `functions [--json] [--search X] [--category C]` | Worksheet functions with their signatures. |
| `mcp [--connect PORT\|HOST:PORT] [--in FILE \| --sample NAME]` | MCP server on stdio. |
| `send <port> <method> [json]` | Sends one control-channel request to a running app. |
| `version` / `--version`, `help` | |

Options also accept `--opt=value`. Unknown options are errors. For `--out`, the last occurrence wins.

## Recipes
```bash
G=$(python3 "$CRAFT" ensure gridcraft)

# 1. Read: overview, a range as a table, as CSV with formulas
"$G" info book.xlsx
"$G" cat book.xlsx --sheet Sales --range A1:F20
"$G" cat book.xlsx --sheet Sales --range A1:F20 --csv --formulas

# 2. Write values + formulas (strings starting with = are formulas), save, print the result
"$G" run --in book.xlsx --quiet \
  --cmd 'range.setValues={"range":"A1","values":[["Item","Cost","Share"],["Rent",1200,null],["Food",400,null],["Total","=SUM(B2:B3)",null]]}' \
  --cmd 'cell.set={"cell":"C2","input":"=B2/$B$4"}' \
  --cmd 'edit.fillDown={"range":"C2:C3"}' \
  --out book.xlsx --print A1:C4

# 3. Evaluate a formula, standalone or against a workbook (nothing is changed)
"$G" eval '=PMT(5%/12,360,-300000)'
"$G" eval '=AVERAGEIFS(D:D,B:B,"North")' --in book.xlsx --sheet Sales --json

# 4. Format a range
"$G" run --in book.xlsx --quiet \
  --cmd 'home.bold={"range":"A1:C1"}' \
  --cmd 'home.fillColor={"range":"A1:C1","color":"#DDEBF7"}' \
  --cmd 'home.numberFormat={"range":"B2:B4","format":"Currency"}' \
  --cmd 'home.numberFormat={"range":"C2:C3","code":"0.0%"}' \
  --cmd 'home.borders={"range":"A1:C4","preset":"all","style":"thin"}' \
  --cmd 'home.autofitColumnWidth={"cols":"A:C"}' --cmd 'view.freezeTopRow' \
  --out book.xlsx

# 5. Chart + conditional format (results print as JSON lines without --quiet, e.g. {"chart":1})
"$G" run --in book.xlsx \
  --cmd 'insert.chart={"range":"A1:B3","type":"column","title":"Monthly costs","at":"E2"}' \
  --cmd 'home.conditionalFormat={"range":"B2:B3","rule":{"type":"cellIs","operator":"greaterThan","value":"1000","preset":"lightRedFill"}}' \
  --out book.xlsx && "$G" info book.xlsx      # -> chart ColumnClustered "Monthly costs" at E2, 1 series
# Excel table: --cmd 'insert.table={"range":"A1:C4","style":"TableStyleMedium2","name":"Costs","header":true}'

# 6. Sort (keys by column letter) and AutoFilter (select inside the data first)
"$G" run --in sales.xlsx --quiet \
  --cmd 'sheet.rename={"sheet":0,"name":"Data"}' \
  --cmd 'data.sort={"range":"A1:D200","header":true,"keys":[{"column":"D","order":"desc"},{"column":"A","order":"asc"}]}' \
  --cmd 'selection.set={"range":"A1"}' \
  --cmd 'data.filterBy={"column":"C","custom":{"op":">","value":"1000"}}' \
  --out sales.xlsx

# 7. CSV <-> XLSX
"$G" convert data.csv data.xlsx
"$G" convert book.xlsx sales.csv --sheet Sales
"$G" run --cmd 'file.open={"path":"ids.csv","csvAsText":true}' --out ids.xlsx --quiet   # every field stays text: keeps 00123

# 8. PDF: page setup, then export the active sheet or all sheets
"$G" convert book.xlsx summary.pdf --sheet Summary
"$G" run --in book.xlsx --quiet \
  --cmd 'pageLayout.pageSetup={"orientation":"landscape","fitToPage":true,"fitWidth":1,"fitHeight":0,"titleRows":"1:1","footer":"&CPage &P of &N"}' \
  --cmd 'file.exportPdf={"path":"book.pdf","sheets":"all"}' --out book.xlsx

# 9. Pivot table on a new sheet (inserted before the source sheet, report at A3)
"$G" run --in sales.xlsx \
  --cmd 'insert.pivotTable={"source":"Data!$A$1:$E$500","rows":["Region"],"columns":["Quarter"],"values":[{"field":"Revenue","func":"sum"}]}' \
  --out sales.xlsx            # result JSON names the new sheet; then: "$G" cat sales.xlsx --sheet <it>

# 10. Formula correctness / fidelity audit of an Excel-saved workbook
"$G" check book.xlsx --max-report 10
```

## The command registry
- Every ribbon and menu action is a command id with JSON params. Most commands act on the current selection when `range` is left out, so always pass `range`. Programmatic calls never open dialogs.
- To find commands: `"$G" commands --search border` (each id with its params doc), `"$G" commands --json` (an array of 355 `{id, label, menu, shortcut, params}` entries), `"$G" functions --search lookup`. Over MCP use `list_commands {search}`, and the command `app.commands {search}` does the same.
- A `--cmd` value, or a line of a `--script` file, is one of `id`, `id={json}`, `id {json}` or `{"command": "id", "params": {...}}`. Blank lines and lines starting with `#` or `//` are skipped. A JSON object with any key other than `command`, `id` or `params` is an error. The first failing step stops the run with `step N (file:line, id): ...` and a non-zero exit.
```text
# build.jsonl  ->  "$G" run --script build.jsonl --out report.xlsx --quiet
range.setValues={"range":"A1","values":[["Month","Revenue"],["Jan",120],["Feb",135]]}
home.bold={"range":"A1:B1"}
{"command":"insert.chart","params":{"range":"A1:B3","type":"line","title":"Revenue"}}
```

| Command id | Example params | Notes |
|---|---|---|
| `cell.set` | `{"cell":"Sheet2!B2","input":"=SUM(A1:A9)"}` | Typed input: a number, text or `=formula`. Takes `array` for array formulas. |
| `range.setValues` | `{"range":"A1","values":[[1,"x"],[null,"=A1*2"]]}` | Takes `parse:false` to keep strings as text. |
| `range.fill` | `{"range":"D2:D50","input":"=B2*C2"}` | Same input everywhere, with relative references adjusted. |
| `sheet.read` / `cell.get` | `{"range":"A1:D10","sheet":"S","formulas":true,"formatted":true}` / `{"cell":"B7"}` | Read back. |
| `sheet.activate` / `home.insertSheet` / `sheet.rename` | `{"sheet":"Data"}` / `{"name":"Summary"}` / `{"sheet":"Sheet1","name":"Data"}` | Also `sheet.move {to}`, `sheet.tabColor {color}`, `home.deleteSheet`. |
| `edit.fillDown` / `edit.fillSeries` / `edit.autoFill` | `{"range":"C2:C20"}` / `{"range":"A2:A13","type":"date","dateUnit":"month"}` / `{"source":"A1:A2","target":"A1:A10"}` | |
| `home.bold` / `home.italic` / `home.fontName` / `home.fontSize` / `home.fontColor` | `{"range":"A1:C1"}` / `{"range":...,"name":"Arial"}` / `{"range":...,"size":12}` / `{"range":...,"color":"#C00000"}` | Takes `on` for toggles. |
| `home.fillColor` | `{"range":"A1:C1","color":"#FFFF00"}` | `"none"` clears the fill. |
| `home.numberFormat` | `{"range":"B:B","format":"Accounting"}` or `{"range":"B2:B9","code":"#,##0.00"}` | Formats: General, Number, Currency, Accounting, Short Date, Long Date, Time, Percentage, Fraction, Scientific, Text. |
| `home.borders` | `{"range":"A1:D9","preset":"outside","style":"medium","color":"#000000"}` | Presets: all, outside, thickOutside, bottom, doubleBottom, topBottom, inside, none... |
| `home.alignCenter` / `home.wrapText` / `home.mergeCenter` | `{"range":"A1:D1"}` | |
| `home.columnWidth` / `home.rowHeight` / `home.autofitColumnWidth` | `{"cols":"B:D","chars":14}` / `{"rows":"1:1","points":24}` / `{"cols":"A:F"}` | `width` and `height` are in pixels. |
| `home.insertRows` / `home.deleteRows` / `home.insertColumns` | `{"rows":"3:5"}` / `{"rows":"10:10"}` / `{"cols":"B:C"}` | |
| `home.conditionalFormat` | `{"range":"C2:C99","rule":{"type":"colorScale"}}` | Rule types: cellIs, expression, containsText, duplicate, top10, dataBar, iconSet... |
| `home.formatAsTable` / `insert.table` | `{"range":"A1:D20","style":"TableStyleMedium2","header":true}` | Always pass `header:true` (see Gotchas). Then `table.totalRow {"on":true}`, `table.style`, `table.rename`. |
| `insert.chart` | `{"range":"A1:C6","type":"line","subtype":"markers","title":"T","at":"H2"}` | Types: column, bar, line, pie, doughnut, area, scatter, bubble, radar, combo, histogram, waterfall, funnel, treemap, sunburst, boxWhisker, stock. |
| `chart.set` / `chart.addElement` | `{"chart":id,"legend":"bottom","xTitle":"Month"}` / `{"element":"trendline","type":"linear"}` | Chart ids come from `info --json`. |
| `insert.pivotTable` / `pivot.addField` / `pivot.refresh` | see recipe 9 / `{"field":"Units","area":"values","func":"sum"}` | `pivot.list` lists pivot tables. |
| `insert.sparkline` | `{"range":"B2:M2","location":"N2","type":"line"}` | |
| `data.sort` | `{"range":"A1:D99","header":true,"keys":[{"column":"B","order":"desc"}]}` | |
| `data.filterBy` / `data.clearFilter` | `{"column":"B","values":["North","West"]}` | Also `top {count}`, `custom {op,value}`, `clear`. |
| `data.removeDuplicates` / `data.textToColumns` | `{"range":"A1:C99","columns":["A"],"header":true}` / `{"range":"A2:A99","delimiters":[","]}` | |
| `data.validation` | `{"range":"C2:C99","type":"list","formula1":"Yes,No"}` | A list can be literal (quoted for you) or a range such as `=$H$1:$H$5`. Other types: whole, decimal, date, textLength, custom. |
| `data.goalSeek` | `{"set":"B5","to":0,"changing":"B2"}` | |
| `formulas.defineName` / `formulas.calculateNow` | `{"name":"Rate","refersTo":"=Sheet1!$B$1"}` / `{}` | |
| `view.freezePanes` / `view.freezeTopRow` | `{"cell":"B2"}` / `{}` | |
| `pageLayout.pageSetup` / `pageLayout.printArea` | see recipe 8 / `{"range":"A1:F50"}` | Also `pageLayout.orientation`, `.margins` (in inches), `.size {"paper":"A4"}`, `.printTitles`. |
| `file.exportPdf` / `file.save` | `{"path":"o.pdf","sheets":"all","range":"A1:F40","fitToPage":true}` / `{"path":"o.xlsx"}` | |
| `review.newComment` / `review.newNote` | `{"cell":"B2","text":"Check","author":"Claude"}` | |

## Check your work
- `"$G" cat out.xlsx --range A1:F20` shows displayed values, so a misapplied number format shows up. Add `--formulas` to see the formulas.
- `"$G" info out.xlsx --json` lists `sheets[].usedRange`, `tables`, `charts` (`id`, `kind`, `title`, `at`, `series`), `names`, `selection` and `calcMode`.
- In the same run, `--print used` or `--print A1:D10`. Use `--cmd 'cell.get={"cell":"B4"}'` (without `--quiet`) for a cell's value, formula, display text and style.
- Errors appear as `#DIV/0!` in `cat` and as `{"error":"#N/A"}` in JSON. Grep for `#` in `cat` output before delivering.
- For a visual check, export a PDF and rasterize it with PdfCraft: `P=$(python3 "$CRAFT" ensure pdfcraft); "$G" convert out.xlsx out.pdf; "$P" render out.pdf --page 1 --dpi 80 --out p1.png`, then Read the PNG. `convert` reports the page count. Charts, fills and page breaks show up here, for example a chart that spills onto a second page, or unreadable header text.
- For workbooks saved by Excel, `"$G" check out.xlsx` compares GridCraft's results with Excel's cached values and round-trips the package.

## MCP server
- To start it: `"$G" mcp` (a blank workbook), `"$G" mcp --in /abs/book.xlsx`, or `"$G" mcp --sample budget`. It speaks JSON-RPC over stdio (protocol 2025-06-18) and logs to stderr.
- **No folder sandbox.** `gridcraft-cli mcp` has no `--automation-read-root` or `--automation-write-root` flags. Passing them fails with `unknown option`. The server can read and write any path the process can reach, so confine it with OS means: a container, or a dedicated user.
- To attach to the running app: `"$G" mcp --connect 7979`, where a bare port means `127.0.0.1`, or HOST:PORT. The app is started with `gridcraft --control 7979`. The token comes from `GRIDCRAFT_CONTROL_TOKEN` or the app's token file. Unlike WordCraft, this fails at startup if the app isn't running.
- Register with Claude Code: `claude mcp add gridcraft -- "$G" mcp`
- Tools:
  - Commands: `execute_command {command, params}`, `list_commands {search?}`, `list_functions {search?, category?}`.
  - Workbooks: `list_windows`, `inspect_workbook`, `open_workbook {path}`, `save_workbook {path?}`, `new_workbook {sample?}`.
  - Cells: `read_range {range?, sheet?, formulas?, formatted?}`, `write_range {range, values}`, `set_cell` and `get_cell`, `evaluate_formula {formula, cell?}`, `select {range, active?}`.
  - Shortcuts:
    - `format_range {range, bold, italic, underline, fontName, fontSize, fontColor, fillColor, numberFormat, horizontalAlign, wrapText, borders}`
    - `insert_chart {range, type, subtype?, title?, at?}`
    - `create_table`
    - `sort_range {keys:["B desc"], range?, header?}`
    - `filter {column, range?, values?, custom?, top?, blanks?, clear?}`
  - History: `undo` and `redo {steps}`.
  - App only: `screenshot {path}`.
  - Tools that act on a workbook also take `window` or `doc`.
  - Resources: `gridcraft://workbook`, `gridcraft://commands`, `gridcraft://functions`.

## Live app (control channel)
Use the app only when the user wants changes in their open window, a screenshot, or real UI input. Start it with `gridcraft --control 7979`, or set `GRIDCRAFT_CONTROL_PORT`. The token is written to `$XDG_RUNTIME_DIR/gridcraft/control-7979.token`, or under `~/.cache/gridcraft/` if that isn't set. For one-off calls: `"$G" send 7979 engine.execute '{"command":"home.bold","params":{"range":"A1:C1"}}'`. Other methods include `document.inspect`, `sheet.read`, `ui.screenshot {"path":...}` and `window.list`.

## Gotchas
- Pass `range` (or `cell`, `cols`, `rows`) every time. Without it a command acts on the selection, which starts at A1 in a fresh session.
- `range.setValues` and `write_range` parse strings like typed input using en-US rules: `"05.04.2026"` becomes the date 5/4/2026 (May 4), `"2.500"` becomes 2.5 and `"00123"` becomes 123. Pass `"parse":false` to keep the strings as text.
- Formulas must use English function names and `,` as the argument separator in every API, whatever the UI language.
- `.csv`, `.tsv` and `.html` outputs, and `convert ... .pdf`, contain only the active sheet, meaning the one active when the file was saved. Choose it with `--sheet`, or with `sheet.activate` in `run`. CSV gets the displayed text, so set `home.numberFormat {"format":"General"}` first if you need raw numbers.
- `insert.table` and `home.formatAsTable` without `"header":true` guess whether the first row is a header, as Excel does. This happens even though the params doc says the default is true. If any header cell is blank, the row is treated as data: a `Column1, Column2...` row is inserted and the data shifts down one row. Pass `header:true`.
- A table style (`insert.table`, `home.formatAsTable`) gives the header row white text. If you also fill the header manually with a light colour, the header becomes unreadable. Use one or the other.
- A chart or range wider than the page spills onto more PDF pages. Use `pageLayout.pageSetup {"orientation":"landscape","fitToPage":true,"fitWidth":1,"fitHeight":0}`.
- `--help` works only at the top level. `run --help` fails with `unknown option --help`.
- `.xls`, `.xlsb` and `.ods` inputs lose formatting, and `.xlsb`/`.ods` also lose formulas. Save as `.xlsx` and tell the user.
- A JSONL script line with an unknown key such as `"args"` is a hard error. It used to be silently ignored.
- `run` with no `--in` starts from a blank workbook (`Sheet1`), and `--out` saves whichever workbook is active. If `--out` is given twice, only the last one is written.
- A sheet's name depends on where it came from: a blank workbook gives `Sheet1`, a CSV gives the file's name. Run `info` first, or address sheets by index (`{"sheet":0}`).
- The `execute_command` tool description mentions `sheet.insert`, but that id doesn't exist. Use `home.insertSheet`.
