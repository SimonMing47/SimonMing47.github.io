#!/usr/bin/env python3
"""Build the modular static site into one standalone HTML file (Python 3.9+)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

def read_asset(relative: str) -> str:
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError(f"Asset escapes project directory: {relative}")
    return path.read_text(encoding="utf-8")

def main() -> None:
    html = read_asset("index.html")
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
                  lambda m: "<style>" + read_asset(m[1]) + "</style>", html)
    html = re.sub(r'<script src="([^"]+)"></script>',
                  lambda m: "<script>" + read_asset(m[1]).replace("</script", "<\\/script") + "</script>", html)
    output = ROOT / "dist" / "index.html"
    output.parent.mkdir(exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"Built {output.name}: {output.stat().st_size:,} bytes")

if __name__ == "__main__":
    main()
