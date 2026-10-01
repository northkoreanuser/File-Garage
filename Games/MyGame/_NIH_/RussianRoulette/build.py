# src/ → 한 파일로 합치기
# 사용: python build.py  →  {이 폴더 이름}.html
#
# src/index.html 의 로컬 <link rel="stylesheet"> 묶음은 <style> 하나로,
# 로컬 <script src> 묶음은 <script> 하나로 합친다. (http로 시작하는 CDN은 그대로)
# 파일 순서 = src/index.html 에 적힌 순서. 파일을 추가/삭제하면 거기만 고치면 된다.
# 설정 없음: 어느 프로젝트 폴더에 넣어도 그대로 동작.
import re, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
NAME = os.path.basename(ROOT) + ".html"
LOCAL = r'(?!https?:|//)[^"]+'
CSS_TAG = rf'<link rel="stylesheet" href="{LOCAL}">'
JS_TAG = rf'<script src="{LOCAL}"></script>'

def read(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8", newline="") as f:
        s = f.read()
    return s if s.endswith("\n") else s + "\n"

def css_block(m):
    return "<style>\n" + "".join(read(h) for h in re.findall(r'href="([^"]+)"', m.group(0))) + "</style>"

def js_block(m):
    js = "".join(read(s) for s in re.findall(r'src="([^"]+)"', m.group(0)))
    return "<script>\n" + re.sub(r"</(script)", r"<\\/\1", js, flags=re.I) + "</script>"  # 주석·문자열 안 </script 방지

with open(os.path.join(SRC, "index.html"), encoding="utf-8", newline="") as f:
    html = f.read()
html = re.sub(rf'{CSS_TAG}(?:\n[ \t]*{CSS_TAG})*', css_block, html)
html = re.sub(rf'{JS_TAG}(?:\n[ \t]*{JS_TAG})*', js_block, html)

with open(os.path.join(ROOT, NAME), "w", encoding="utf-8", newline="") as f:
    f.write(html)
print(f"완료: {NAME} ({os.path.getsize(os.path.join(ROOT, NAME)):,} bytes)")
