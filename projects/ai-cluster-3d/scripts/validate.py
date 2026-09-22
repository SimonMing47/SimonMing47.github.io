#!/usr/bin/env python3
"""Check data references, static asset paths and public-release boundaries."""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent

def data(name: str):
    text = (ROOT / "data" / f"{name}.js").read_text(encoding="utf-8")
    return json.loads(text.split(" = ", 1)[1].strip().removesuffix(";"))

def main() -> None:
    resources, faults, sources = data("resources"), data("faults"), data("sources")
    ids = {r["id"] for r in resources}
    assert len(ids) == len(resources) == 47
    assert len({f["id"] for f in faults}) == len(faults) == 95
    private_fields = {"generation", "recovery", "method", "updated", "generationRule", "recoveryRule"}
    for resource in resources:
        assert not resource.get("parent") or resource["parent"] in ids, resource["id"]
        assert set(resource.get("sources", [])) <= set(sources), resource["id"]
    for fault in faults:
        assert set(fault["resources"]) <= ids, fault["id"]
        assert set(fault["sources"]) <= set(sources), fault["id"]
        assert not private_fields.intersection(fault), fault["id"]
        assert not re.search(r"(?:原清单|清单恢复策略).*(?:开启|关闭)", fault.get("caution", "")), fault["id"]
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for relative in re.findall(r'(?:src|href)="([^"#]+)"', html):
        if "://" not in relative:
            assert (ROOT / relative).is_file(), relative
    assert not re.search(r'20\d{2}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}',
                         (ROOT / "data" / "faults.js").read_text(encoding="utf-8"))
    print(json.dumps({"resources": len(resources), "faults": len(faults),
                      "sources": len(sources), "data_and_assets": "passed", "private_configuration": "excluded"},
                     ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
