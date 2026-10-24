import sys; from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell", headless=True)
    pg = b.new_page(viewport={"width":640,"height":360})
    pg.on("console", lambda m: print("CONSOLE", m.type, m.text[:400]) if m.type in ("error","warning") else None)
    pg.on("pageerror", lambda e: print("PAGEERROR", str(e)[:600]))
    pg.goto("http://127.0.0.1:8765/proj/film/scenes/%s.html" % sys.argv[1]); pg.wait_for_timeout(int(sys.argv[2]) if len(sys.argv) > 2 else 2500); print("done", sys.argv[1]); b.close()
