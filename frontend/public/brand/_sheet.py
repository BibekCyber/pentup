#!/usr/bin/env python3
# Builds a single self-contained brand-sheet SVG (fonts embedded) presenting the
# AI Pentest logo system: all six marks in both themes on their grounds, wordmark
# lockups, in-context mockups, and the colour/type foundations. Then rasterizes it.
import os, base64, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "fonts")

def datauri(fname):
    with open(os.path.join(FONTS, fname), "rb") as f:
        return "data:font/woff2;base64," + base64.b64encode(f.read()).decode()

FONT_FACE = f"""
@font-face{{font-family:'Inter';font-weight:700;src:url({datauri('inter-700.woff2')}) format('woff2');}}
@font-face{{font-family:'Inter';font-weight:600;src:url({datauri('inter-600.woff2')}) format('woff2');}}
@font-face{{font-family:'Inter';font-weight:500;src:url({datauri('inter-500.woff2')}) format('woff2');}}
@font-face{{font-family:'JBMono';font-weight:500;src:url({datauri('jetbrains-mono-500.woff2')}) format('woff2');}}
text{{font-family:'Inter',sans-serif;}} .mono{{font-family:'JBMono',monospace;}}
"""

E="#F57214"   # ember
FG="#E9EBED"; MUTED="#9BA1AB"; INK3="#6E747E"
BG="#0E0F11"; CARD="#16181B"
LBG="#FAF9F7"; LCARD="#FFFFFF"; LINK="#141210"; LMUTED="#5F5A54"

# --- mark symbols (neutral = currentColor, ember fixed) ---
SYM = {
 "shield":'<path d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M14.5 16 L19.5 20.5 L14.5 25" fill="none" stroke="%(E)s" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 25 H27" stroke="%(E)s" stroke-width="2.5" stroke-linecap="round"/>',
 "hex":'<path d="M20 3.5 L33.5 11.25 V26.75 L20 34.5 L6.5 26.75 V11.25 Z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><circle cx="20" cy="19" r="8" fill="none" stroke="%(E)s" stroke-width="1.6" opacity=".45"/><circle cx="20" cy="19" r="4" fill="%(E)s"/>',
 "target":'<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="20" cy="20" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2" opacity=".55"/><path d="M20 2 V8 M20 32 V38 M2 20 H8 M32 20 H38" stroke="%(E)s" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="20" r="3.2" fill="%(E)s"/>',
 "prompt":'<path d="M15 10 L7 20 L15 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 10 L33 20 L25 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="17.75" y="15.5" width="4.5" height="9" rx="1" fill="%(E)s"/>',
 "caret":'<path d="M8 31 L20 8 L32 31" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.2 21 H25.8" stroke="%(E)s" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="31" r="1.9" fill="%(E)s"/>',
 "sentinel":'<path d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M20 18 L14 14 M20 18 L26 14 M20 18 L20 27" stroke="currentColor" stroke-width="1.7" opacity=".6" stroke-linecap="round"/><circle cx="20" cy="18" r="3.1" fill="%(E)s"/><circle cx="14" cy="14" r="1.9" fill="currentColor"/><circle cx="26" cy="14" r="1.9" fill="currentColor"/><circle cx="20" cy="27" r="1.9" fill="%(E)s"/>',
}
DIRS=[("shield","Terminal Shield",True),("hex","Hex Core",False),("target","Target Lock",False),
      ("prompt","Prompt",False),("caret","Caret A",False),("sentinel","Sentinel",False)]

W=1680; PAD=72; CW=W-2*PAD
p=[]  # svg body parts

def rect(x,y,w,h,fill,rx=0,stroke=None,sop=1.0,sw=1):
    s=f' stroke="{stroke}" stroke-opacity="{sop}" stroke-width="{sw}"' if stroke else ""
    p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{s}/>')
def txt(x,y,s,size,fill,weight=500,anchor="start",mono=False,ls=0,op=1.0):
    cls=' class="mono"' if mono else ""
    a=f' text-anchor="{anchor}"' if anchor!="start" else ""
    l=f' letter-spacing="{ls}"' if ls else ""
    p.append(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" fill-opacity="{op}"{a}{l}{cls}>{s}</text>')
def mark(cx,cy,size,color):  # centered
    p.append(f'<use href="#m-{color[0]}" x="{cx-size/2}" y="{cy-size/2}" width="{size}" height="{size}" style="color:{color[1]}"/>')
def M(sym): return f'm-{sym}'

# reference marks by (sym, color) — encode via distinct symbol ids per color-need using style color
def usemark(x,y,size,sym,color):
    p.append(f'<use href="#{M(sym)}" x="{x}" y="{y}" width="{size}" height="{size}" style="color:{color}"/>')
def eyebrow(x,y,s): txt(x,y,s,13,INK3,600,mono=True,ls=2.6)
def sechead(x,y,s,sub,ink=FG,mut=MUTED):
    eyebrow(x,y-22,"— SECTION"); txt(x,y,s,26,ink,700); txt(x,y+26,sub,14.5,mut,500)

y=0
# ================= HEADER =================
rect(0,0,W,286,BG)
p.append(f'<rect x="0" y="0" width="{W}" height="286" fill="url(#bloom)"/>')
p.append(f'<rect x="0" y="0" width="{W}" height="286" fill="url(#scan)"/>')
eyebrow(PAD,84,"AI PENTEST · BRAND SYSTEM · V1")
usemark(PAD,104,96,"shield",FG)
txt(PAD+124,182,'<tspan fill="%s">AI</tspan> Pentest'%E,66,FG,700,ls=-1.5)
txt(PAD+126,220,"AUTONOMOUS · PENETRATION · TESTING",15,MUTED,500,mono=True,ls=1.5)
# recommended chip (right)
rect(W-PAD-232,120,232,40,"rgba(245,114,20,0.12)",20,E,0.35,1.2)
txt(W-PAD-116,145,"★ TERMINAL SHIELD · RECOMMENDED",11.5,E,600,anchor="middle",mono=True,ls=1.4)
txt(PAD,262,"The mark is a shield (assurance) housing a terminal prompt — security tooling, said plainly. One accent: ember #F57214.",14,MUTED,500)
y=286+56

# ================= FAMILY: six directions, both themes =================
sechead(PAD,y+18,"The mark family","Six directions, each on its dark and light ground. The recommended mark is boxed.")
y+=64
colw=(CW-5*22)/6
th=132  # tile height per theme
gy=y+40
for i,(sym,name,rec) in enumerate(DIRS):
    x=PAD+i*(colw+22)
    br=E if rec else "#ffffff"; bop=1 if rec else 0.10; bw=1.6 if rec else 1
    # dark tile
    rect(x,gy,colw,th,CARD,12,br,bop,bw)
    usemark(x+colw/2-26,gy+th/2-26,52,sym,FG)
    # light tile
    rect(x,gy+th+14,colw,th,LCARD,12,br,bop if rec else 0.0,bw)
    if not rec: rect(x,gy+th+14,colw,th,"none",12,LINK,0.10,1)
    usemark(x+colw/2-26,gy+th+14+th/2-26,52,sym,LINK)
    # name
    txt(x+colw/2,gy+2*th+14+30,name,13,FG,600,anchor="middle")
    txt(x+colw/2,gy+2*th+14+48,"0%d"%(i+1),10.5,E if rec else INK3,600,anchor="middle",mono=True,ls=1.5)
y=gy+2*th+14+70

# little dark/light legend under family
txt(PAD,y,"↑ on dark surface",11,INK3,500,mono=True); txt(PAD+150,y,"↑ on light surface",11,INK3,500,mono=True)
y+=48

# ================= WORDMARK & LOCKUPS =================
sechead(PAD,y+18,"Wordmark &amp; lockups",'“AI” carries the ember; “Pentest” takes the ink. Horizontal, stacked, and in-console.')
y+=64
cw=(CW-2*22)/3; ch=150
def lockcard(x,bg,ink,mut,mode):
    rect(x,y,cw,ch,bg,12,"#ffffff" if bg!=LCARD else LINK,0.10,1)
    txt(x+22,y+34,("HORIZONTAL" if mode==0 else "STACKED" if mode==1 else "MONO · IN-CONSOLE"),10,mut,600,mono=True,ls=1.6)
    if mode==2:
        usemark(x+22,y+64,34,"shield",ink)
        txt(x+66,y+92,'<tspan fill="%s">ai</tspan>_pentest<tspan fill="%s"> ▊</tspan>'%(E,INK3 if bg!=LCARD else LMUTED),22,ink,600,mono=True)
    elif mode==1:
        usemark(x+cw/2-24,y+56,48,"shield",ink)
        txt(x+cw/2,y+128,'<tspan fill="%s">AI</tspan> Pentest'%E,22,ink,700,anchor="middle")
    else:
        usemark(x+22,y+ch/2-24,48,"shield",ink)
        txt(x+80,y+ch/2+9,'<tspan fill="%s">AI</tspan> Pentest'%E,30,ink,700)
lockcard(PAD, CARD, FG, MUTED, 0)
lockcard(PAD+cw+22, LCARD, LINK, LMUTED, 1)
lockcard(PAD+2*(cw+22), CARD, FG, MUTED, 2)
y+=ch+52

# ================= IN CONTEXT =================
sechead(PAD,y+18,"In context","Where it lives: the app rail, the favicon at real sizes, and a report masthead.")
y+=64
# (a) rail mock
railw=380; railh=230
rect(PAD,y,railw,railh,"#0A0C0E",12,"#ffffff",0.10,1)
txt(PAD+20,y+30,"APP SIDEBAR",10,INK3,600,mono=True,ls=1.6)
usemark(PAD+20,y+48,30,"shield",FG)
txt(PAD+60,y+70,'<tspan fill="%s">AI</tspan> Pentest'%E,17,FG,700)
txt(PAD+60,y+86,"OPERATOR CONSOLE",8.5,INK3,500,mono=True,ls=2)
navs=[("Dashboard",False),("Scans",True),("Flows",False),("Templates",False)]
ny=y+112
for lbl,act in navs:
    if act: rect(PAD+14,ny-16,railw-28,30,"rgba(245,114,20,0.12)",6); rect(PAD+14,ny-16,3,30,E,2)
    txt(PAD+30,ny+4,lbl,13.5,E if act else MUTED,600 if act else 500)
    ny+=38
# (b) favicon sizes
fx=PAD+railw+50
txt(fx,y+30,"FAVICON / APP ICON",10,INK3,600,mono=True,ls=1.6)
for i,(sz,cap) in enumerate([(64,"64"),(44,"44"),(28,"28"),(18,"16")]):
    cxp=fx+i*92
    rrx=sz*0.23
    rect(cxp,y+56,sz,sz,E,rrx)
    # dark mark inside tile
    p.append(f'<g transform="translate({cxp+sz*0.13},{y+56+sz*0.13}) scale({sz*0.74/40})"><path d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z" fill="none" stroke="#0E0F11" stroke-width="2.6" stroke-linejoin="round"/><path d="M14.5 16 L19.5 20.5 L14.5 25" fill="none" stroke="#0E0F11" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 25 H27" stroke="#0E0F11" stroke-width="2.8" stroke-linecap="round"/></g>')
    txt(cxp+sz/2,y+56+72+16,cap,10,INK3,500,anchor="middle",mono=True)
# report masthead (light card)
rmy=y+150
rect(fx,rmy,CW-railw-50,84,LCARD,10,LINK,0.10,1)
txt(fx+22,rmy+30,"CONFIDENTIAL",10,"#D0102E",700,mono=True,ls=2)
usemark(fx+20,rmy+40,26,"shield",LINK)
txt(fx+56,rmy+62,'<tspan fill="%s">AI</tspan> Pentest'%E,18,LINK,700)
txt(fx+CW-railw-72,rmy+52,"Penetration Test Report",13,LMUTED,500,anchor="end")
y+=railh+56

# ================= FOUNDATIONS =================
sechead(PAD,y+18,"Foundations","One accent, warm-graphite neutrals, Inter + JetBrains Mono.")
y+=64
swatches=[("Ember",E,"#0E0F11"),("Ember hover","#FF8636","#0E0F11"),("Graphite","#0E0F11",FG),("Card","#16181B",FG),("Ink","#E9EBED","#141210"),("Muted","#9BA1AB","#141210")]
sw=(CW-5*16)/6
for i,(nm,hx,tc) in enumerate(swatches):
    x=PAD+i*(sw+16)
    rect(x,y,sw,72,hx,10,"#ffffff",0.10,1)
    txt(x+14,y+30,nm,12.5,tc,600)
    txt(x+14,y+50,hx.upper(),11,tc,500,mono=True,op=0.75)
y+=98
# type
rect(PAD,y,CW/2-11,86,CARD,10,"#ffffff",0.10,1)
txt(PAD+22,y+30,"DISPLAY / TEXT",10,INK3,600,mono=True,ls=1.6)
txt(PAD+22,y+66,"Inter · Ship findings",26,FG,700)
rect(PAD+CW/2+11,y,CW/2-11,86,CARD,10,"#ffffff",0.10,1)
txt(PAD+CW/2+33,y+30,"DATA / TERMINAL",10,INK3,600,mono=True,ls=1.6)
txt(PAD+CW/2+33,y+64,"JetBrains Mono · &gt;_ 0123456789",22,FG,500,mono=True)
y+=86+56

# footer
rect(0,y,W,1,"#ffffff",0,None); p[-1]=p[-1].replace('fill="#ffffff"','fill="#ffffff" fill-opacity="0.09"')
txt(PAD,y+40,"AI Pentest · Terminal Shield — recommended. Six directions supplied light + dark as editable SVG/PNG.",13,MUTED,500)
txt(W-PAD,y+40,"BRAND SHEET · V1",11,INK3,500,anchor="end",mono=True,ls=1.5)
y+=88
H=int(y)

defs=f'''<defs>
<style>{FONT_FACE}</style>
<radialGradient id="bloom" cx="12%" cy="0%" r="70%"><stop offset="0%" stop-color="{E}" stop-opacity="0.16"/><stop offset="60%" stop-color="{E}" stop-opacity="0"/></radialGradient>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="3" fill="none"/><rect y="3" width="4" height="1" fill="#ffffff" fill-opacity="0.015"/></pattern>
{"".join(f'<symbol id="m-{k}" viewBox="0 0 40 40" fill="none">{v%{"E":E}}</symbol>' for k,v in SYM.items())}
</defs>'''

svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Inter,sans-serif"><rect width="{W}" height="{H}" fill="{BG}"/>{defs}{"".join(p)}</svg>\n'
open(os.path.join(HERE,"brand-sheet.svg"),"w").write(svg)
print("brand-sheet.svg", len(svg)//1024, "KB", "canvas", W, "x", H)
