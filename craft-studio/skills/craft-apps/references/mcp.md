# MCP servers and the live desktop apps

Every app's CLI has an `mcp` subcommand: a Model Context Protocol server on stdin/stdout that
exposes the app's whole command registry plus helper tools (inspect, render a preview image,
open, save). It runs headless by default, or bridged to the desktop app the user has open.

Use the CLI from Bash for one-off and batch jobs. Register an MCP server when the user wants a
long interactive session on their own machine, or wants to watch Claude work in the open app.

## Register one

```bash
python3 "$CRAFT" mcp wordcraft --root ~/Documents/report             # print the commands
python3 "$CRAFT" mcp wordcraft --root ~/Documents/report --register  # run `claude mcp add` now
python3 "$CRAFT" mcp wordcraft --attach 7981 --name wordcraft-app    # bridge to the running app
```

`--register` installs the CLI if needed, then adds the server at user scope (`--scope project`
writes `.mcp.json` in the project instead). Run `/mcp` in Claude Code, or restart it, to connect.
The printed JSON block is the same server for Claude Desktop's `claude_desktop_config.json` or a
project `.mcp.json`.

## What each server supports

All flags below were checked against the 2026-10 builds (`<app>-cli mcp --help` is the ground truth).

| App | Confine to folders | Bridge to the running app | Notes |
|---|---|---|---|
| PhotoCraft | `--automation-read-root DIR --automation-write-root DIR` | `--bridge 127.0.0.1:PORT` | bridge needs the app's control token (`PHOTOCRAFT_CONTROL_TOKEN` or `--control-token-file`) |
| LightCraft | none | `--connect [127.0.0.1:7980]` | `mcp FOLDER` imports photos; `--library DIR` opens a persistent library; `--compact`; `--demo` |
| VectorCraft | automation roots (repeatable) | `--connect 127.0.0.1:PORT` | plain `mcp` tries port 7979 once, then runs headless |
| FigCraft | automation roots (repeatable) | `--attach PORT` | roots are refused together with `--attach` |
| DesignCraft | automation roots (repeatable) | `--connect PORT` | `--sample` opens the sample magazine |
| EffectCraft | automation roots (repeatable) | `--bridge PORT` | `--project F.ecproj`, `--demo`, `--autosave`; the control channel has no authentication |
| FilmCraft | none | `--bridge 127.0.0.1:PORT` | `--project F.fcproj`, `--demo`; export `FILMCRAFT_CONTROL_TOKEN` for both app and server |
| SoundCraft | automation roots (repeatable) | `--connect PORT` | `--demo`; the control channel has no authentication |
| CADCraft | none | `--connect 127.0.0.1:PORT` | `--lazy` waits for the app; `--launch` opens it (macOS) |
| WordCraft | automation roots | `--connect 127.0.0.1:PORT` | `--author NAME` for tracked changes; bridge key `WORDCRAFT_CONTROL_KEY` or the app's key file |
| GridCraft | none | `--connect PORT` | `--in FILE` or `--sample budget\|sales\|grades`; bridge token `GRIDCRAFT_CONTROL_TOKEN` or the app's token file |
| DeckCraft | automation roots | `--connect PORT` | `--sample` |
| PdfCraft | automation roots, or `--root DIR` | none | `--compact` lists 15 core tools plus `tool_search` and `tool_call`; the live app is driven with `pdfcraft-cli ui --control FILE` |

Automation roots are the security boundary: a root left out grants none of that access, links
are followed, and refused paths come back as ordinary tool errors. `craft.py mcp --root DIR`
passes the folder as both roots.

**No sandbox: GridCraft, CADCraft, FilmCraft, LightCraft.** Their MCP servers can read and write
anything the user can. Use their CLIs for one-off jobs, run the server inside a container or a
dedicated user, or tell the user plainly before registering one at user scope.

## The live desktop app (control channel)

Start the app with its control channel, then bridge the MCP server or send single commands:

```bash
wordcraft --control 7981 &                                   # the app listens on 127.0.0.1:7981
python3 "$CRAFT" mcp wordcraft --attach 7981 --register --name wordcraft-app
```

- One-shot commands without MCP: `deckcraft-cli app --port 7979 slide.new '{...}'`,
  `soundcraft-cli app --port 7801 transport.play`, `gridcraft-cli send 7979 engine.execute '{...}'`,
  `pdfcraft-cli ui --control ~/.pdfcraft-control.json screenshot --out win.png`.
- Bridged servers add UI tools (screenshots, clicks, keys, widget trees) so Claude can see the
  window. Root flags never apply to a bridge: the app itself is not confined.
- The channels listen on 127.0.0.1 only. EffectCraft and SoundCraft use no authentication, so
  enable them only while in use; the others use a token or key file that only the user can read.
- PdfCraft's control file must be private to the user (not in `/tmp`, not a symlink).
- There is no display in claude.ai chat or Claude Code cloud sessions: the live apps are for the
  user's own computer.
