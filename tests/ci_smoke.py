#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""《完美女團》自動檢查(2026-11-15,2.0 第八個大腦,全面審視第 1 包)

GitHub Actions 每次上傳後、打包 APK 之前跑(.github/workflows/build.yml 的「自動檢查」步驟)。
沒過就不出 APK、不更新網頁版;報告在 Actions 那次執行的頁面(Summary 與「自動檢查報告」附件)。

用法:python tests/ci_smoke.py [www 資料夾]          (不寫就是 www)
環境變數:REPORT_DIR(報告資料夾,預設 test-report)、ONLY(只跑名字裡有這幾個字的項目,逗號分開)、SIZES(例如 832x384)、JOBS(同時跑幾個,預設 3)

檢查什麼(Samsung A55 的兩個畫面尺寸 832×384、784×354 各跑一輪):
  開機      標題畫面出現、可以按開始
  新遊戲    按開始 → 上任第一天的過場 → 略過 → 第一段對話出現、可以往下點
  地圖      地圖、公司大樓、宿舍、製作中心的剖面圖
  設施      編舞板、錄音台、衣櫃、設計桌、企劃桌、演唱會企劃板、獎盃牆、MV 試映、待機室、製作者模式(每個分頁)
  拜訪      每一個可以去的地點走進去、對話往下點、離開
  手機      8 個 App
  選單      選單、成員抽屜、日記、相簿
  時間      連續過 3 天(每個時段),途中跳出的視窗都關得掉
  宣傳期    試玩存檔跳到「宣傳期第 2 週」→ 待機室打一場歌 → 看結果 → 結束試玩回到正式存檔
合格條件:程式錯誤 0、遊戲自己的錯誤紀錄 0、遊戲檔案讀不到 0、文字或按鈕跑出畫面 0、每個畫面都關得掉。

之後每做一包新功能,就在最下面的 GROUPS 加一項。在大腦的工作環境也是跑這一支(不用另外開伺服器)。
"""
import asyncio, functools, http.server, json, os, sys, threading, time, traceback
from playwright.async_api import async_playwright

WWW = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "www")
OUT = os.environ.get("REPORT_DIR", "test-report")
ONLY = [x for x in os.environ.get("ONLY", "").split(",") if x]
SIZES = [tuple(int(n) for n in s.split("x")) for s in os.environ.get("SIZES", "832x384,784x354").split(",")]
DPR = 2.8125
JOBS = int(os.environ.get("JOBS", "3"))   # 同時跑幾個項目

# 文字與按鈕有沒有跑出畫面(從大腦平常用的 測試腳本/audit.js 改的:改成量文字本身的位置,
# 按鈕上的光澤等裝飾不會誤判;可以捲動的區域裡不算超出畫面)
AUDIT_JS = r"""
window.__audit=function(scopeSel){
  const root=scopeSel?document.querySelector(scopeSel):document.body; if(!root) return [];
  const stage=document.querySelector('#stage').getBoundingClientRect();
  const out=[]; const seen=new Set();
  const visible=el=>{ if(el.closest('.drawer:not(.on)')) return false; for(let e=el;e&&e!==document.body;e=e.parentElement){const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0) return false} const r=el.getBoundingClientRect(); return r.width>1&&r.height>1 };
  const path=el=>{const p=[];for(let e=el;e&&e.id!=='stage'&&p.length<4;e=e.parentElement){p.unshift(e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList.length?'.'+[...e.classList].slice(0,2).join('.'):''))} return p.join('>')};
  // 這個元素自己的文字實際畫在哪裡(用文字的位置量,按鈕上的光澤、裝飾不會被算進去)
  const textRect=el=>{ const rg=document.createRange(); let R=null;
    for(const n of el.childNodes){ if(n.nodeType!==3||!n.textContent.trim()) continue; rg.selectNodeContents(n);
      for(const q of rg.getClientRects()){ if(q.width<1||q.height<1) continue; R=R?{left:Math.min(R.left,q.left),right:Math.max(R.right,q.right),top:Math.min(R.top,q.top),bottom:Math.max(R.bottom,q.bottom)}:{left:q.left,right:q.right,top:q.top,bottom:q.bottom} } }
    return R };
  const scrolls=c=>/(auto|scroll)/.test(c.overflowX+c.overflowY);
  for(const el of root.querySelectorAll('*')){
    const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
    if(!own) continue; if(!visible(el)) continue;
    const r=el.getBoundingClientRect(), cs=getComputedStyle(el), t=textRect(el); if(!t) continue; const txt=own.slice(0,30);
    // 直的方向留一點餘裕:行高很緊的時候,字的外框本來就會比格子高一點點(字沒有被切到);真的被切是整行不見
    const slack=Math.max(3,(parseFloat(cs.fontSize)||12)*.4);
    const dx=Math.round(Math.max(t.right-r.right,r.left-t.left)), dy=Math.round(Math.max(t.bottom-r.bottom,r.top-t.top));
    if((cs.overflowX==='hidden'||cs.overflowX==='clip')&&dx>2) out.push(['字被切掉(橫)',path(el),txt,dx]);
    if((cs.overflowY==='hidden'||cs.overflowY==='clip')&&dy>slack) out.push(['字被切掉(直)',path(el),txt,dy]);
    if(cs.whiteSpace.includes('nowrap')&&cs.overflowX==='visible'&&dx>2) out.push(['不換行的字太長',path(el),txt,dx]);
    let inScroll=false;
    for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){ if(scrolls(getComputedStyle(a))){ inScroll=true; break } }
    for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const acs=getComputedStyle(a);
      if(scrolls(acs)) break;
      if(acs.overflow!=='visible'){ const ar=a.getBoundingClientRect(); const d=Math.max(ar.left-t.left,t.right-ar.right), e=Math.max(ar.top-t.top,t.bottom-ar.bottom);
        if(d>3||e>slack) out.push(['超出外框',path(el),txt,Math.round(Math.max(d,e))]); break } }
    if(!inScroll&&(t.right>stage.right+2||t.left<stage.left-2||t.bottom>stage.bottom+slack||t.top<stage.top-slack)) out.push(['超出畫面',path(el),txt,Math.round(Math.max(t.right-stage.right,stage.left-t.left,t.bottom-stage.bottom,stage.top-t.top))]);
  }
  // 按鈕整顆要在畫面內(捲動區裡的不算),不然手機上會按不到、卡住
  for(const el of root.querySelectorAll('button,select,input,textarea,[role=button]')){
    if(!visible(el)) continue; let sc=false;
    for(let a=el.parentElement;a&&a.id!=='stage';a=a.parentElement){ if(scrolls(getComputedStyle(a))){sc=true;break} }
    if(sc) continue; const r=el.getBoundingClientRect();
    const d=Math.max(stage.left-r.left,r.right-stage.right,stage.top-r.top,r.bottom-stage.bottom);
    if(d>2) out.push(['按鈕超出畫面',path(el),(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,20),Math.round(d)]);
  }
  return out.filter(x=>{const k=x.join('|');if(seen.has(k))return false;seen.add(k);return true});
};
"""

# 已經看過、確認沒有問題的版面提醒(種類|路徑的一部分)。要加之前先看截圖確認真的沒問題。
AUDIT_ALLOW = []
# 讀不到也正常的檔案:MV 試映會先問有沒有這首歌的 AI MV(assets/mv/<代號>.mp4),沒有就播動態 MV
MISSING_OK = ["/assets/mv/"]

READY = "document.querySelector('#ttStart')&&!document.querySelector('#ttStart').disabled"
NO_DAY1 = "S.flags.day1Card=1; S.mile=Object.fromEntries(Object.keys(DAILY.MILESTONES).map(k=>[k,0]))"
ERRLOG = "JSON.parse(localStorage.getItem('kpopGame.errlog')||'[]').map(x=>(x.w||'')+'|'+(x.m||'')).slice(-5)"


class Fail(Exception):
    pass


class Run:
    """一個項目在一個尺寸的一次執行:開自己的分頁,記錄所有錯誤。"""

    def __init__(self, browser, base, vw, vh, name):
        self.b, self.base, self.vw, self.vh, self.name = browser, base, vw, vh, name
        self.problems, self.notes, self.pg, self.ctx = [], [], None, None
        self.jserr, self.bad = [], []

    async def open(self):
        self.ctx = await self.b.new_context(viewport={"width": self.vw, "height": self.vh}, device_scale_factor=DPR, is_mobile=True, has_touch=True)
        base = self.base
        await self.ctx.route(lambda u: not u.startswith(base), lambda r: r.abort())   # 不連外面(字型、雲端),和手機沒網路時一樣
        await self.ctx.add_init_script(AUDIT_JS)
        pg = self.pg = await self.ctx.new_page()
        pg.on("pageerror", lambda e: self.jserr.append(((getattr(e, "stack", None) or str(e)) or "")[:400]))
        pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))

        def on_resp(r):
            if r.url.startswith(base) and r.status >= 400 and not any(k in r.url for k in MISSING_OK):
                self.bad.append(f"{r.status} {r.url[len(base):]}")

        def on_fail(r):
            f = r.failure or ""
            if r.url.startswith(base) and "ERR_ABORTED" not in f:
                self.bad.append(f"{f} {r.url[len(base):]}")

        pg.on("response", on_resp)
        pg.on("requestfailed", on_fail)
        return pg

    async def boot(self):
        await self.pg.goto(self.base + "/index.html")
        await self.pg.wait_for_function(READY, timeout=90000)

    async def start(self, day1=False):
        """按開始。day1=False:跳過上任第一天的過場,直接到地圖。"""
        pg = self.pg
        await pg.evaluate("window.introSkip?.()")
        await pg.wait_for_timeout(600)
        if not day1:
            await pg.evaluate(NO_DAY1)
        await pg.evaluate("document.querySelector('#ttStart').click()")
        if not day1:
            await pg.wait_for_timeout(2500)
            await pg.evaluate("document.querySelector('#welc')?.click(); document.querySelector('#cgView')?.remove(); setPause('cg',false)")
            await pg.wait_for_timeout(500)

    def bad_if(self, cond, msg):
        if cond:
            self.problems.append(msg)

    async def audit(self, where, scope="#stage"):
        try:
            a = await self.pg.evaluate("s=>__audit(s)", scope)
        except Exception as e:
            self.problems.append(f"{where}:版面檢查跑不起來({str(e)[:120]})")
            return
        a = [x for x in a if not any(k in (x[0] + "|" + x[1]) for k in AUDIT_ALLOW)]
        if a:
            self.problems.append(f"{where}:文字或按鈕跑出畫面 {len(a)} 處,例如 " + ";".join(f"{x[0]}「{x[2]}」({x[1]},多 {x[3]}px)" for x in a[:3]))
            await self.shot(where)

    async def shot(self, where):
        try:
            os.makedirs(OUT, exist_ok=True)
            safe = "".join(c if c.isalnum() else "_" for c in f"{self.name}_{where}")[:60]
            await self.pg.screenshot(path=os.path.join(OUT, f"{self.vw}_{safe}.jpg"), type="jpeg", quality=70)
        except Exception:
            pass

    async def pausers(self):
        return await self.pg.evaluate("[...pausers]")

    async def finish(self):
        """收尾:程式錯誤、遊戲自己的錯誤紀錄、讀不到的檔案。"""
        try:
            el = await self.pg.evaluate(ERRLOG)
        except Exception:
            el = []
        for e in dict.fromkeys(self.jserr):
            self.problems.append("程式錯誤:" + e.replace("\n", " ")[:300])
        for e in el:
            self.problems.append("遊戲的錯誤紀錄:" + e[:300])
        for e in dict.fromkeys(self.bad):
            self.problems.append("檔案讀不到:" + e[:200])
        if self.problems:
            await self.shot("最後的畫面")
        await self.ctx.close()


# ───────────────────────── 各個項目 ─────────────────────────

async def g_boot(r):
    await r.boot()
    pg = r.pg
    await pg.evaluate("window.introSkip?.()")
    await pg.wait_for_timeout(1200)
    r.bad_if(not await pg.evaluate("!!document.querySelector('#ttStart')?.offsetParent"), "標題畫面的開始按鈕沒有出現")
    await r.audit("標題畫面")
    r.bad_if(not await pg.evaluate("typeof S==='object'&&!!S.m&&Object.keys(S.m).length===5"), "存檔資料沒有準備好(五位成員)")
    n = await pg.evaluate("document.querySelectorAll('script[src]').length")
    r.notes.append(f"程式檔 {n} 個")


async def g_newgame(r):
    await r.boot()
    pg = r.pg
    await r.start(day1=True)
    try:
        await pg.wait_for_selector(".cine", timeout=20000, state="attached")
    except Exception:
        raise Fail("按開始以後,上任第一天的過場沒有出現")
    await pg.wait_for_timeout(4000)
    await pg.evaluate("document.querySelector('.cine')?.click()")
    await pg.wait_for_timeout(400)
    await pg.evaluate("document.querySelector('.cine .cn-skip')?.click()")
    ok = False
    for _ in range(80):
        await pg.wait_for_timeout(500)
        st = await pg.evaluate("({cine:!!document.querySelector('.cine'),visit:!!document.querySelector('#visit.on'),text:document.querySelector('#vtext')?.textContent||''})")
        if not st["cine"] and st["visit"] and st["text"]:
            ok = True
            break
    if not ok:
        raise Fail("略過過場以後,第一段對話沒有出現")
    first = await pg.evaluate("document.querySelector('#vtext').textContent")
    await r.audit("第一段對話", "#visit")
    for _ in range(6):
        await pg.evaluate("document.querySelector('#vopts .vopt')?document.querySelector('#vopts .vopt').click():document.querySelector('#vbox').click()")
        await pg.wait_for_timeout(700)
    later = await pg.evaluate("document.querySelector('#vtext')?.textContent||''")
    r.bad_if(later == first and await pg.evaluate("!!document.querySelector('#visit.on')"), "第一段對話點了沒有往下走")
    r.notes.append("第一句:" + first[:24])


async def g_map(r):
    await r.boot()
    await r.start()
    pg = r.pg
    r.bad_if(await r.pausers(), f"進到地圖時時間是暫停的({await r.pausers()})")
    await r.audit("地圖")
    for b, n in [("company", "公司大樓"), ("dorm", "宿舍"), ("center", "製作中心")]:
        await pg.evaluate("b=>openSpot(b)", b)
        await pg.wait_for_timeout(900)
        r.bad_if(not await pg.evaluate("!document.querySelector('#inside').classList.contains('hide')&&document.querySelectorAll('#rooms .room').length>0"), f"{n}的剖面圖沒有出現")
        await r.audit(n + "剖面圖")
        await pg.evaluate("document.querySelector('#backBtn')?.click()")
        await pg.wait_for_timeout(700)
        r.bad_if(not await pg.evaluate("document.querySelector('#inside').classList.contains('hide')"), f"{n}按「地圖」回不去")
    for w in ["rain", "snow", "clear"]:   # 天氣(雨、雪的畫布與環境音)
        await pg.evaluate("w=>{ window.WX_FORCE=w; wxUpdate() }", w)
        await pg.wait_for_timeout(700)
    await pg.evaluate("window.WX_FORCE=null")


SCREENS = [
    # 名字, 怎麼打開, 畫面的外框, 關閉鈕, 裡面的分頁
    ("4F 練習室・編舞板", "openFac('choreo')", "#songFac", "#sfClose", None),
    ("3F 錄音室・錄音台", "openFac('recording')", "#songFac", "#sfClose", None),
    ("企劃室・企劃桌", "openFac('planning')", "#songFac", "#sfClose", None),
    ("會議室・演唱會企劃板", "openFac('concert')", "#songFac", "#sfClose", None),
    ("1F 造型室・衣櫃", "openFac('wardrobe')", "#facility", "#facClose", "[data-ft]"),
    ("設計工作室・設計桌", "openFac('design')", "#facility", "#facClose", "[data-ft]"),
    ("大廳・獎盃牆", "openFac('records')", "#recRoom", "#recRoom .fac-close", None),
    ("攝影棚・MV 試映", "openFac('mv')", "#mvRoom", "#mvRoom .fac-close", None),
    ("電視台・待機室(練習模式)", "openStageRoom()", "#stageFac", "#tvClose", None),
    ("製作者模式", "openMaker()", "#makerFac", "#mkClose", "[data-mt]"),
]
SHOWN = "s=>{ const e=document.querySelector(s); if(!e||e.classList.contains('hide')) return false; const c=getComputedStyle(e), q=e.getBoundingClientRect(); return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>.9&&q.width>100 }"


async def g_fac(r):
    await r.boot()
    await r.start()
    pg = r.pg
    for name, opener, root, closer, tabs in SCREENS:
        await pg.evaluate(opener)
        try:
            await pg.wait_for_function(SHOWN, arg=root, timeout=8000)
        except Exception:
            r.problems.append(f"{name}:打不開")
            await r.shot(name)
            await pg.evaluate("for(const k of [...pausers]) setPause(k,false)")
            continue
        await pg.wait_for_timeout(700)
        r.bad_if(not await r.pausers(), f"{name}:打開時時間沒有暫停")
        await r.audit(name, root)
        if tabs:
            n = await pg.evaluate("([s,t])=>[...document.querySelectorAll(s+' '+t)].filter(b=>b.offsetParent).length", [root, tabs])
            for i in range(n):
                lab = await pg.evaluate("([s,t,i])=>{ const b=[...document.querySelectorAll(s+' '+t)].filter(b=>b.offsetParent)[i]; if(!b) return null; b.click(); return (b.textContent||'').trim().slice(0,10) }", [root, tabs, i])
                if lab is None:
                    break
                await pg.wait_for_timeout(600)
                await r.audit(f"{name}的分頁「{lab}」", root)
        await pg.evaluate("s=>document.querySelector(s)?.click()", closer)
        await pg.wait_for_timeout(800)
        left = await r.pausers()
        if left:
            r.problems.append(f"{name}:按關閉以後時間還是暫停的({left})")
            await r.shot(name + "關不掉")
            await pg.evaluate("for(const k of [...pausers]) setPause(k,false)")


async def g_visit(r):
    await r.boot()
    await r.start()
    pg = r.pg
    places = await pg.evaluate("PLACES.filter(p=>!p.facOnly).map(p=>({id:p.id,n:p.n,open:p.open,owner:p.owner||null}))")
    r.bad_if(len(places) < 10, f"可以拜訪的地點只找到 {len(places)} 個")
    done = 0
    for p in places:
        # 讓那個地點現在是開的、而且有人在(房間就放房間的主人,其他地方放兩個人)
        await pg.evaluate("""p=>{ S.slot=p.open.includes(2)?2:p.open[0]; S.min=SLOTS[S.slot].from+20;
            const who=p.owner?[p.owner]:['ys','he']; M.forEach(m=>{ if(who.includes(m.id)){ S.where[m.id]=p.id; S.doing[m.id]='在這裡' } else if(S.where[m.id]===p.id) S.where[m.id]='practice' });
            window.renderAll?.() }""", p)
        await pg.evaluate("id=>visit(id)", p["id"])
        try:
            await pg.wait_for_selector("#visit.on", timeout=8000)
        except Exception:
            r.problems.append(f"拜訪「{p['n']}」:走不進去")
            await r.shot("拜訪_" + p["id"])
            await pg.evaluate("for(const k of [...pausers]) setPause(k,false)")
            continue
        await pg.wait_for_timeout(900)
        await r.audit(f"拜訪「{p['n']}」", "#visit")
        for _ in range(7):   # 對話往下點;有選項就選第一個
            st = await pg.evaluate("""()=>{ if(!document.querySelector('#visit.on')) return 'out';
                const o=[...document.querySelectorAll('#vopts .vopt, #vopts button')].find(b=>b.offsetParent&&!b.disabled); if(o){ o.click(); return 'opt' }
                document.querySelector('#vbox')?.click(); return 'next' }""")
            if st == "out":
                break
            await pg.wait_for_timeout(320)
        await r.audit(f"拜訪「{p['n']}」對話中", "#visit")
        # 離開:先按畫面上的返回,不行再用遊戲的 leave()
        for _ in range(4):
            if not await pg.evaluate("!!document.querySelector('#visit.on')"):
                break
            await pg.evaluate("document.querySelector('#vback')?.click()")
            await pg.wait_for_timeout(500)
        if await pg.evaluate("!!document.querySelector('#visit.on')"):
            await pg.evaluate("try{ D=null }catch(e){}; try{ leave() }catch(e){}")
            await pg.wait_for_timeout(500)
        await pg.evaluate("document.querySelectorAll('#evOk').forEach(b=>b.click()); document.querySelector('#cgView')?.remove(); document.querySelector('#chooser')?.classList.remove('on'); for(const k of [...pausers]) setPause(k,false)")
        await pg.wait_for_timeout(300)
        done += 1
    r.notes.append(f"走了 {done} 個地點")


async def g_phone(r):
    await r.boot()
    await r.start()
    pg = r.pg
    await pg.evaluate("openPhone()")
    try:
        await pg.wait_for_selector("#phone.on", timeout=6000)
    except Exception:
        raise Fail("手機打不開")
    await pg.wait_for_timeout(700)
    apps = await pg.evaluate("[...document.querySelectorAll('#phone .papp')].map(b=>[b.dataset.app,b.querySelector('small')?.textContent||b.dataset.app])")
    r.bad_if(len(apps) < 8, f"手機主畫面只有 {len(apps)} 個 App")
    await r.audit("手機主畫面", "#phone")
    for k, n in apps:
        await pg.evaluate("openPhone()")
        await pg.wait_for_timeout(250)
        hit = await pg.evaluate("k=>{ const b=document.querySelector(`#phone .papp[data-app=\"${k}\"]`); if(!b) return false; b.click(); return true }", k)
        if not hit:
            r.problems.append(f"手機「{n}」:主畫面上找不到")
            continue
        await pg.wait_for_timeout(700)
        r.bad_if(await pg.evaluate("!document.querySelector('#pBody')||!document.querySelector('#pBody').children.length"), f"手機「{n}」:打開是空的")
        await r.audit(f"手機「{n}」", "#phone")
        await pg.evaluate("closePhone()")
        await pg.wait_for_timeout(400)
        r.bad_if("phone" in await r.pausers(), f"手機「{n}」:關不掉")
        await pg.evaluate("document.querySelector('#cgView')?.remove(); for(const k of [...pausers]) setPause(k,false)")


async def g_menu(r):
    await r.boot()
    await r.start()
    pg = r.pg
    # 選單
    await pg.evaluate("document.querySelector('#menuBtn').click()")
    await pg.wait_for_timeout(800)
    r.bad_if(not await pg.evaluate("document.querySelector('#setDlg').open"), "選單打不開")
    n = await pg.evaluate("document.querySelectorAll('#setDlg select, #setDlg button, #setDlg input').length")
    r.bad_if(n < 10, f"選單裡的項目只有 {n} 個")
    await pg.evaluate("document.querySelector('#setClose')?.click(); const d=document.querySelector('#setDlg'); if(d.open) d.close()")
    await pg.wait_for_timeout(400)
    r.bad_if("menu" in await r.pausers(), "選單關不掉")
    # 成員抽屜、日記、相簿
    await pg.evaluate("document.querySelector('#memBtn').click()")
    await pg.wait_for_timeout(900)
    r.bad_if(not await pg.evaluate("document.querySelector('#drawer').classList.contains('on')"), "成員抽屜打不開")
    await r.audit("成員抽屜", "#drawer")
    links = await pg.evaluate("[...document.querySelectorAll('#drawer .mlink')].map(b=>(b.textContent||'').trim().slice(0,12))")
    r.bad_if(len(links) < 6, f"成員抽屜裡的日記與相簿按鈕只有 {len(links)} 個(應該是 5 本日記+相簿)")
    for i in [0, len(links) - 1]:
        if i < 0:
            continue
        await pg.evaluate("i=>[...document.querySelectorAll('#drawer .mlink')][i]?.click()", i)
        await pg.wait_for_timeout(900)
        await r.audit(f"「{links[i]}」")
        closed = await pg.evaluate("""()=>{ const c=[...document.querySelectorAll('#stage button, dialog[open] button')].filter(b=>b.offsetParent&&/^(關閉|離開|返回|闔上)/.test((b.textContent||'').trim())&&b.id!=='drawerX'); if(c.length){ c[c.length-1].click(); return true } return false }""")
        await pg.wait_for_timeout(600)
        r.bad_if(not closed, f"「{links[i]}」:找不到關閉的按鈕")
        if not await pg.evaluate("document.querySelector('#drawer').classList.contains('on')"):
            await pg.evaluate("document.querySelector('#memBtn').click()")
            await pg.wait_for_timeout(700)
    await pg.evaluate("document.querySelector('#drawerX').click()")
    await pg.wait_for_timeout(600)
    r.bad_if("drawer" in await r.pausers(), "成員抽屜關不掉")


PASS_SLOTS = """async(n)=>{ const seen={}; const close=()=>{ document.querySelector('#cgView')?.remove(); document.querySelectorAll('#evOk').forEach(b=>b.click());
    for(let q=0;q<4;q++){ const bs=[...document.querySelectorAll('#stage button, dialog[open] button')].filter(b=>b.offsetParent&&/^(繼續|關閉|知道了|好|確定|收下|離開|略過|下一步|返回|稍後|之後再說|看完了|OK|開始|進入)/.test((b.textContent||'').trim()));
      const ov=bs.filter(b=>b.closest('.evbox,.bigcard,.news,.chbox,.cgb,.tv-res,.card,.bigev,.eventcard,.ovl,.modal,.sheet,.debut,.notice,dialog')); if(!ov.length) break; ov[0].click() }
    document.querySelectorAll('dialog[open]').forEach(d=>d.close()); document.querySelectorAll('.cine').forEach(e=>e.remove()); for(const k of [...pausers]) seen[k]=(seen[k]||0)+1; pausers.clear() };
  for(let i=0;i<n;i++){ try{ S.min=SLOTS[S.slot].to; passSlots() }catch(e){ seen['出錯:'+e.message]=(seen['出錯:'+e.message]||0)+1 } await new Promise(q=>setTimeout(q,30)); close() }
  const d=dateOf(S.day); return {date:`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`,seen,dom:document.getElementsByTagName('*').length,saveKB:Math.round(JSON.stringify(S).length/1024)} }"""


async def g_time(r):
    await r.boot()
    await r.start()
    pg = r.pg
    await pg.evaluate("window.confirm=()=>true; window.alert=()=>{}")
    d0 = await pg.evaluate("S.day")
    res = await pg.evaluate(PASS_SLOTS, 16)
    await pg.wait_for_timeout(800)
    d1 = await pg.evaluate("S.day")
    r.bad_if(d1 - d0 < 3, f"過了 16 個時段,日期只前進 {d1 - d0} 天")
    for k, v in res["seen"].items():
        r.bad_if(k.startswith("出錯:"), f"換時段時{k}({v} 次)")
    await pg.evaluate("save(true)")
    r.bad_if(not await pg.evaluate("!!localStorage.getItem('kpopGame.save')"), "存檔沒有寫進去")
    r.notes.append(f"到 {res['date']},存檔 {res['saveKB']} KB")


async def g_promo(r):
    await r.boot()
    await r.start()
    pg = r.pg
    await pg.evaluate("S.day=40; S.min=700; save(true)")
    real = await pg.evaluate("localStorage['kpopGame.save']")
    await pg.evaluate("openMaker()")
    await pg.wait_for_timeout(700)
    await pg.evaluate("document.querySelector('[data-mt=try]')?.click()")
    await pg.wait_for_timeout(600)
    await r.audit("製作者模式的試玩存檔", "#makerFac")
    r.bad_if(not await pg.evaluate("!![...document.querySelectorAll('.sbxp')].find(b=>b.dataset.sbxn==='宣傳期第 2 週')"), "試玩存檔裡找不到「宣傳期第 2 週」")
    try:
        async with pg.expect_navigation(timeout=20000):
            await pg.evaluate("[...document.querySelectorAll('.sbxp')].find(b=>b.dataset.sbxn==='宣傳期第 2 週').click()")
    except Exception:
        raise Fail("試玩存檔跳不過去")
    await pg.wait_for_function(READY, timeout=90000)
    await pg.evaluate("window.introSkip?.()")
    await pg.wait_for_timeout(600)
    await pg.evaluate("document.querySelector('#ttStart').click()")
    await pg.wait_for_timeout(2500)
    await pg.evaluate("document.querySelector('#welc')?.click(); document.querySelector('#cgView')?.remove(); document.querySelectorAll('.cine,.bigev').forEach(e=>e.remove()); for(const k of [...pausers]) setPause(k,false)")
    st = await pg.evaluate("({sb:!!window.SANDBOX,promo:!!S.promo,debuted:!!S.debuted,bar:!!document.querySelector('#sbxBar')})")
    r.bad_if(not (st["sb"] and st["promo"] and st["debuted"] and st["bar"]), f"跳到宣傳期第 2 週以後狀態不對({st})")
    r.bad_if(await pg.evaluate("r=>localStorage['kpopGame.save']!==r", real), "試玩動到了正式存檔")
    await r.audit("宣傳期的地圖")
    # 手機的行程(宣傳期 28 天)
    await pg.evaluate("openPhone()")
    await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelector('#phone .papp[data-app=sched]')?.click()")
    await pg.wait_for_timeout(700)
    await r.audit("宣傳期的手機行程", "#phone")
    await pg.evaluate("closePhone()")
    await pg.wait_for_timeout(400)
    # 待機室 → 上台前確認 → 打歌轉播 → 看結果
    await pg.evaluate("openStageRoom()")
    try:
        await pg.wait_for_function(SHOWN, arg="#stageFac", timeout=8000)
    except Exception:
        raise Fail("宣傳期的待機室打不開")
    await pg.wait_for_timeout(900)
    await r.audit("宣傳期的待機室", "#stageFac")
    # 準備單:每一組都要有選(Ending 鏡頭預設是空的,沒選不能上台)
    await pg.evaluate("""()=>{ const g={}; for(const b of document.querySelectorAll('#stageFac .topt')){ if(!b.offsetParent||b.disabled) continue; (g[b.dataset.g]=g[b.dataset.g]||[]).push(b) }
        for(const k in g){ if(!g[k].some(b=>b.classList.contains('on'))) g[k][g[k].length-1].click() } }""")
    await pg.wait_for_timeout(500)
    r.bad_if(await pg.evaluate("(()=>{ const b=document.querySelector('#tvGo'); return !b||b.disabled })()"), "待機室的準備單都選了,還是不能上台")
    await r.audit("待機室選好以後", "#stageFac")
    await pg.evaluate("document.querySelector('#tvGo')?.click()")
    try:
        await pg.wait_for_selector("#cfGo", timeout=6000)
    except Exception:
        raise Fail("按「確認上台」以後沒有出現上台前確認")
    await pg.wait_for_timeout(500)
    await r.audit("上台前確認")
    await pg.evaluate("document.querySelector('[data-vw=hl]')?.click(); document.querySelector('#cfGo').click()")
    try:
        await pg.wait_for_selector("#spv.bc:not(.loading)", timeout=20000)
    except Exception:
        raise Fail("打歌轉播沒有開始")
    await pg.wait_for_timeout(3000)
    await r.audit("打歌轉播", "#spv")
    r.bad_if(await pg.evaluate("document.querySelectorAll('#spv img, #spv canvas').length") < 5, "打歌轉播的台上沒有五個人")
    for _ in range(5):   # 有收錄曲時先「下一首」,最後「看結果」
        if not await pg.evaluate("!!document.querySelector('#spv')"):
            break
        await pg.evaluate("(document.querySelector('#bcNext')||document.querySelector('#bcSkip'))?.click()")
        await pg.wait_for_timeout(1500)
    try:
        await pg.wait_for_selector("#tvRank", timeout=15000)
    except Exception:
        raise Fail("打完歌以後沒有出現一位發表")
    await pg.wait_for_timeout(2500)
    await r.audit("一位發表", "#tvRank")
    bars = await pg.evaluate("document.querySelector('#tvRank').innerText")
    for k in ["音源", "實體銷量", "播放", "社群熱度", "舞台評價"]:
        r.bad_if(k not in bars, f"一位發表少了「{k}」這一項")
    for _ in range(10):
        await pg.evaluate("(document.querySelector('#rkOk')||document.querySelector('#tvNext')||[...document.querySelectorAll('#stageFac button')].find(b=>b.offsetParent&&/^(繼續|知道了|好|收下)/.test(b.textContent.trim()))||document.querySelector('#tvClose'))?.click()")
        await pg.wait_for_timeout(700)
        if not await pg.evaluate(SHOWN, "#stageFac") and not await pg.evaluate("!!document.querySelector('#tvRank')"):
            break
    r.bad_if(await pg.evaluate("!!document.querySelector('#tvRank')"), "一位發表關不掉")
    r.notes.append("打了一場歌")
    await pg.evaluate("document.querySelectorAll('#evOk').forEach(b=>b.click()); document.querySelector('#cgView')?.remove()")
    await pg.wait_for_timeout(400)
    # 結束試玩,回到正式存檔
    try:
        async with pg.expect_navigation(timeout=20000):
            await pg.evaluate("window.sandboxExit(false)")
    except Exception:
        raise Fail("結束試玩回不去")
    await pg.wait_for_function(READY, timeout=90000)
    back = await pg.evaluate("({sb:!!window.SANDBOX,day:S.day,left:Object.keys(localStorage).filter(k=>k.startsWith('sbx:')).length})")
    r.bad_if(back["sb"] or back["day"] != 40 or back["left"], f"結束試玩以後正式存檔不對({back})")


GROUPS = [
    ("開機", g_boot),
    ("新遊戲", g_newgame),
    ("地圖", g_map),
    ("設施", g_fac),
    ("拜訪", g_visit),
    ("手機", g_phone),
    ("選單", g_menu),
    ("時間", g_time),
    ("宣傳期", g_promo),
]


# ───────────────────────── 執行與報告 ─────────────────────────

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class QuietServer(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        pass   # 瀏覽器換頁、關分頁時會中途放棄下載,這是正常的,不用印出一大段錯誤


def serve():
    srv = QuietServer(("127.0.0.1", 0), functools.partial(Quiet, directory=WWW))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


async def run_one(browser, base, vw, vh, name, fn):
    r = Run(browser, base, vw, vh, name)
    t0 = time.time()
    try:
        await r.open()
        await asyncio.wait_for(fn(r), timeout=300)
    except Fail as e:
        r.problems.append(str(e))
    except asyncio.TimeoutError:
        r.problems.append("超過 5 分鐘沒有跑完")
    except Exception as e:
        r.problems.append("檢查中斷:" + (str(e).split("\n")[0])[:240])
        traceback.print_exc()
    try:
        await r.finish()
    except Exception:
        pass
    return r.problems, r.notes, time.time() - t0


async def main():
    if not os.path.isfile(os.path.join(WWW, "index.html")):
        print(f"找不到 {WWW}/index.html")
        return 2
    os.makedirs(OUT, exist_ok=True)
    srv, base = serve()
    rows, failed = [], 0
    tasks = [(vw, vh, name, fn) for vw, vh in SIZES for name, fn in GROUPS if not ONLY or any(k in name for k in ONLY)]
    res = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        sem = asyncio.Semaphore(JOBS)

        async def job(i, t):
            async with sem:
                res[i] = await run_one(browser, base, *t)
                probs, notes, sec = res[i]
                print(("✅" if not probs else "…再試一次"), f"{t[0]}×{t[1]}", t[2], f"{sec:.0f} 秒", ";".join(notes) if not probs else probs[0][:120], flush=True)

        await asyncio.gather(*(job(i, t) for i, t in enumerate(tasks)))   # 同時跑 JOBS 個(各自獨立的分頁與存檔)
        for i, t in enumerate(tasks):
            probs, notes, sec = res[i]
            tries = 1
            if probs:   # 沒過的單獨再跑一次:兩次都沒過才算沒過(避免機器剛好很慢)
                first = probs
                probs, notes, sec2 = await run_one(browser, base, *t)
                sec += sec2
                tries = 2
                if not probs:
                    notes = notes + ["第 1 次沒過、第 2 次通過:" + first[0][:80]]
            ok = not probs
            failed += 0 if ok else 1
            rows.append({"size": f"{t[0]}×{t[1]}", "name": t[2], "ok": ok, "tries": tries, "sec": round(sec, 1), "problems": probs, "notes": notes})
            if tries == 2:
                print(("✅" if ok else "❌"), f"{t[0]}×{t[1]}", t[2], "(第 2 次)", flush=True)
            for x in probs:
                print("     ・" + x, flush=True)
        await browser.close()
    srv.shutdown()

    total = len(rows)
    head = f"## 《完美女團》自動檢查:{'全部通過' if not failed else f'{failed} 項沒過'}({total - failed}/{total})\n\n"
    if failed:
        head += "沒過的項目在下面。這次不會產生新的 APK,網頁版也維持上一版。把這一頁截圖給主體開發(大腦)就可以。\n\n"
    md = head + "| 尺寸 | 項目 | 結果 | 秒數 | 說明 |\n| --- | --- | --- | --- | --- |\n"
    for x in rows:
        what = "<br>".join(s.replace("|", "/") for s in (x["problems"] or x["notes"]))
        md += f"| {x['size']} | {x['name']} | {'通過' if x['ok'] else '**沒過**'}{'(第 2 次)' if x['ok'] and x['tries'] == 2 else ''} | {x['sec']} | {what} |\n"
    with open(os.path.join(OUT, "report.md"), "w", encoding="utf-8") as f:
        f.write(md)
    with open(os.path.join(OUT, "report.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    gs = os.environ.get("GITHUB_STEP_SUMMARY")
    if gs:
        with open(gs, "a", encoding="utf-8") as f:
            f.write(md + "\n")
    print(f"\n{'全部通過' if not failed else f'{failed} 項沒過'}({total - failed}/{total});報告在 {OUT}/report.md")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
