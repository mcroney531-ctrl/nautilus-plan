"""Regression tests for composite.py's acceptance rules, on real returned images. Works on temporary copies of the packages.
Usage: python3 spikes/cutaway/test-composite.py
Legitimate edits (accepted and promoted at the time) must still be accepted; the return whose walls had moved must be refused
on fit quality, although its scale and offset are inside the limits. Fixtures: docs/spikes/cutaway-fixtures (JPEG copies)."""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
root = Path(__file__).resolve().parents[2]; fx = root / "docs/spikes/cutaway-fixtures"; L1 = root / "docs/spikes/cutaway-l1-correction"; L2 = root / "docs/spikes/cutaway-l2"
cases = [  # package, region, returned image, master it was made against, expected
    (L1, "01", fx / "return-ls01.jpg", "master-L1-v1.png", "accept"), (L1, "06", fx / "return-recv06.jpg", "master-L1-v6.png", "accept"),
    (L1, "10", fx / "return-corr10.jpg", "master-L1-v7.png", "accept"), (L1, "09", fx / "return-corr10.jpg", "master-L1-v8.png", "accept"), (L1, "12", fx / "return-wg12b.jpg", "master-L1-v10.png", "accept"),
    (L2, "02", L2 / "source-west-return-1.png", "master-L2-v2.png", "refuse"), (L2, "07", L2 / "source-west-return-1.png", "master-L2-v2.png", "refuse")]
ok = True
for pkg, nn, img, master, want in cases:
    tmp = Path(tempfile.mkdtemp()); man = json.loads((pkg / "manifest.json").read_text())
    if not any(k.startswith(nn + "-") for k in man["regions"]): man = json.loads(subprocess.check_output(["git", "show", "0a926bd:" + str((pkg / "manifest.json").relative_to(root))], cwd=root))   # the regions as they stood when the return arrived
    (tmp / "manifest.json").write_text(json.dumps(man)); reg = next(v for k, v in man["regions"].items() if k.startswith(nn + "-"))
    for f in (reg["mask"], master): shutil.copy(pkg / f, tmp)
    r = subprocess.run([sys.executable, str(root / "spikes/cutaway/composite.py"), nn, str(img), "--master", str(tmp / master)], env={**os.environ, "CUTAWAY_PKG": str(tmp)}, capture_output=True, text=True)
    txt = r.stdout + r.stderr; wrote = len(list(tmp.glob("master-*.png"))) == 2; q = [l for l in txt.splitlines() if "ring_wall_cap_agreement" in l]
    got = "accept" if r.returncode == 0 and wrote else "refuse (fit quality)" if "REFUSED: fit quality" in txt and not wrote else "refuse (other)" if not wrote else "?"
    good = got.startswith(want) and (want == "accept" or got == "refuse (fit quality)"); ok &= good
    print(("PASS" if good else "FAIL"), "|", pkg.name, nn, img.name, "|", got, "|", q[0].strip() if q else txt.strip()[-160:]); shutil.rmtree(tmp)
print("ALL PASS" if ok else "FAILED"); sys.exit(0 if ok else 1)
