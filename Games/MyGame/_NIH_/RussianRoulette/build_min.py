# src/ → JS 압축해서 한 파일로 합치기
# 준비 필요 없음: rjsmin(CSS 압축 시 rcssmin)이 없으면 자동으로 pip 설치 후 이어서 진행
# 사용: python build_min.py  →  {이 폴더 이름}.min.html
#
# rjsmin은 공백·주석만 지우고 이름은 안 바꾼다 (안전 · 문자열/템플릿 리터럴 보존).
# 어느 프로젝트 폴더에 넣어도 그대로 동작.
MIN_CSS = False

import re, os, sys, subprocess, importlib

def need(mod):  # 모듈이 없으면 pip로 설치하고 이어서 진행
    try:
        return importlib.import_module(mod)
    except ImportError:
        print(f"{mod} 없음 → 설치 중...")
        cmd = [sys.executable, "-m", "pip", "install", mod]
        if subprocess.call(cmd) != 0 and subprocess.call(cmd + ["--user"]) != 0:
            sys.exit(f"{mod} 설치 실패 → 직접 실행: pip install {mod}")
        import site
        if site.getusersitepackages() not in sys.path:
            sys.path.append(site.getusersitepackages())  # --user로 깔린 경우 대비
        importlib.invalidate_caches()
        return importlib.import_module(mod)

rjsmin = need("rjsmin")

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
NAME = os.path.basename(ROOT) + ".min.html"
LOCAL = r'(?!https?:|//)[^"]+'
CSS_TAG = rf'<link rel="stylesheet" href="{LOCAL}">'
JS_TAG = rf'<script src="{LOCAL}"></script>'

def read(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8", newline="") as f:
        s = f.read()
    return s if s.endswith("\n") else s + "\n"

def css_block(m):
    css = "".join(read(h) for h in re.findall(r'href="([^"]+)"', m.group(0)))
    if MIN_CSS:
        css = need("rcssmin").cssmin(css) + "\n"
    return "<style>\n" + css + "</style>"

def js_block(m):
    js = rjsmin.jsmin("".join(read(s) for s in re.findall(r'src="([^"]+)"', m.group(0))))
    return "<script>\n" + re.sub(r"</(script)", r"<\\/\1", js, flags=re.I) + "\n</script>"  # 문자열 안 </script 방지

with open(os.path.join(SRC, "index.html"), encoding="utf-8", newline="") as f:
    html = f.read()
html = re.sub(rf'{CSS_TAG}(?:\n[ \t]*{CSS_TAG})*', css_block, html)
html = re.sub(rf'{JS_TAG}(?:\n[ \t]*{JS_TAG})*', js_block, html)

with open(os.path.join(ROOT, NAME), "w", encoding="utf-8", newline="") as f:
    f.write(html)
print(f"완료: {NAME} ({os.path.getsize(os.path.join(ROOT, NAME)):,} bytes)")
