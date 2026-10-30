"use strict";
/* =====================================================================
   K-POP Idol Game ・ 遊戲本體
   主畫面(公司地圖、時段、行動)+ 拜訪對話。日常服從造型室的衣櫃換穿,劇情從內容庫(製作者模式)抽片段。
   ===================================================================== */
/* ===== 第二輪優化(2026-10-26)=====
   錯誤紀錄:遊戲出錯時記在這台裝置(kpopGame.errlog,最多 60 筆,同樣的錯誤只計次),選單「錯誤紀錄」看得到、可以複製給 Claude */
const ERRK="kpopGame.errlog";
window.logErr=(where,e)=>{ try{ const m=String(e?.message||e?.code||e?.reason||e||"").slice(0,240); if(!m||m==="undefined") return;
  const L=JSON.parse(localStorage.getItem(ERRK)||"[]"), w=String(where||"").slice(0,60), last=L[L.length-1];
  if(last&&last.w===w&&last.m===m){ last.n=(last.n||1)+1; last.t=Date.now() }
  else L.push({t:Date.now(),w,m,s:String(e?.stack||"").split("\n").slice(1,3).map(x=>x.trim()).join(" | ").slice(0,240),v:window.APP_VERSION||""});
  localStorage.setItem(ERRK,JSON.stringify(L.slice(-60))) }catch(_){ /* 記錄本身失敗就算了(避免無限遞迴) */ } };
window.addEventListener("error",ev=>logErr((ev.filename||"").split("/").pop()+":"+(ev.lineno||0),ev.error||ev.message));
window.addEventListener("unhandledrejection",ev=>logErr("promise",ev.reason));
/* 統一排程:全部定時工作共用 tick 的 250ms 計時器;App 在背景(document.hidden)時不跑(bg:true 例外) */
const TASKS=[]; window.every=(ms,fn,o)=>{ TASKS.push({ms,fn,at:0,bg:!!o?.bg}) };
function runTasks(){ const now=performance.now(), hid=document.hidden;
  for(const t of TASKS){ if(hid&&!t.bg) continue; if(now-t.at<t.ms-5) continue; t.at=now; try{ t.fn() }catch(e){ logErr("排程",e) } } }
/* 複製文字(APK 也能用):先試剪貼簿 API,不行再用隱藏的文字框 */
async function copyText(t){
  try{ await navigator.clipboard.writeText(t); return true }catch(e){window.logErr?.("game",e)}
  try{ const a=document.createElement("textarea"); a.value=t; a.setAttribute("readonly",""); a.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(a); a.select(); const ok=document.execCommand("copy"); a.remove(); return ok }catch(e){ return false } }
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=n=>String(n).padStart(2,"0");
function toast2(t){const e=$("#toast2");e.textContent=t;e.classList.add("on");clearTimeout(toast2.t);toast2.t=setTimeout(()=>e.classList.remove("on"),2200)}

/* ---------- 成員 ---------- */
const M=[
  {id:"ys",f:"yeseul",n:"藝瑟",c:"#7B4FBF",cm:168,re:/藝瑟|Yeseul/i},
  {id:"tr",f:"taeri", n:"泰梨",c:"#C8102E",cm:167,re:/泰梨|Taeri/i},
  {id:"hy",f:"hiyori",n:"日和",c:"#C9A35E",cm:165,re:/日和|Hiyori/i},
  {id:"he",f:"haeun", n:"夏恩",c:"#E9746A",cm:163,re:/夏恩|Haeun/i},
  {id:"hr",f:"haram", n:"河嵐",c:"#7FAF2C",cm:160,re:/河嵐|Haram/i}];
const byId=id=>M.find(m=>m.id===id);
const EXPR=["neutral","smile","laugh","sad","angry","shy","tired","surprise","pout","moved","serious","wink"];   // pout 嘟嘴撒嬌、moved 感動含淚、serious 認真堅定、wink 俏皮眨眼:2026-10-28 新增   // tired、surprise:2026-10-27 新增(真人化)
/* 回應方式對每位成員的倍率(日常層規格) */
const PREF={ys:{安慰:1,鼓勵:1.2,嚴厲:.3,開玩笑:1,轉移話題:.5,陪著:1.3,出手幫忙:.5},tr:{安慰:.2,鼓勵:.6,嚴厲:1.1,開玩笑:1.3,轉移話題:.6,陪著:1.1,出手幫忙:-.3},
  hy:{安慰:.9,鼓勵:1.1,嚴厲:-.4,開玩笑:1,轉移話題:.6,陪著:.9,出手幫忙:1.1},he:{安慰:.7,鼓勵:.9,嚴厲:.9,開玩笑:1.2,轉移話題:.4,陪著:.8,出手幫忙:.7},
  hr:{安慰:1.2,鼓勵:1.3,嚴厲:-.7,開玩笑:.6,轉移話題:.3,陪著:.9,出手幫忙:1}};
const WARM=["安慰","鼓勵","陪著"];

/* ---------- 時段 ---------- */
/* 改版 1.0(2026-10-29):一天 36 分鐘,時鐘連續走、不能快轉。五段只是光線、背景音樂與作息的分段:
   from/to 是遊戲時間(分鐘,過午夜往上加),sec 是那一段在現實裡走幾秒(清晨 6、上午 7、下午 9、晚上 9、深夜 5 分鐘) */
const SLOTS=[
  {n:"清晨",light:"dawn",   from:6*60, to:9*60, sec:360},
  {n:"上午",light:"day",    from:9*60, to:12*60,sec:420},
  {n:"下午",light:"day",    from:12*60,to:18*60,sec:540},
  {n:"晚上",light:"evening",from:18*60,to:23*60,sec:540},
  {n:"深夜",light:"night",  from:23*60,to:30*60,sec:300}];
const DAY0=360;                    // S.min:從前一天午夜算起的遊戲分鐘;一天從清晨 6:00(360)走到隔天 6:00(1800)
const slotOfMin=m=>{ for(let i=SLOTS.length-1;i>=0;i--) if(m>=SLOTS[i].from) return i; return 0 };
const START=new Date(2016,0,13);   // 2016.01.13 代表上任(改版 1.0;舊版從 2015.07.03 開始)
const START_V0=new Date(2015,6,3);
const WD=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
const dateOf=day=>{const d=new Date(START);d.setDate(d.getDate()+day);return d};
const seasonOf=d=>{const m=d.getMonth()+1;return m>=3&&m<=5?"春":m>=6&&m<=8?"夏":m>=9&&m<=11?"秋":"冬"};
/* 時期:出道前是練習生期,出道後依年份(跟製作者模式的時期描述一致)。片段的 period 要對得上才會被抽到 */
const periodNow=(day=S.day)=>{ if(day<(window.DEBUT_DAY??366)) return "練習生期"; const y=dateOf(day).getFullYear(); return y<2018?"出道與上升期":y<2020?"巔峰期":"轉型期" };

/* ---------- 地點:sp = 劇本工坊的地點代號 ---------- */
const PLACES=[
  {id:"practice",g:"公司大樓",n:"練習室",   sp:"practice",open:[0,1,2,3,4]},
  {id:"studio",  g:"公司大樓",n:"錄音室",   sp:"studio",  open:[1,2,3]},
  {id:"office",  g:"公司大樓",n:"代表辦公室",sp:"office",  open:[1,2,3]},
  {id:"styling", g:"公司大樓",n:"造型室",   sp:"styling", open:[1,2,3]},
  {id:"living",  g:"宿舍",   n:"客廳",     sp:"dorm",    open:[0,1,2,3,4]},
  {id:"kitchen", g:"宿舍",   n:"廚房",     sp:"dorm",    open:[0,1,2,3,4]},
  {id:"roof",    g:"宿舍",   n:"頂樓",     sp:"dorm",    open:[0,1,2,3,4]},   // 2026-10-29 改版 1.0 第 4 輪
  {id:"bed_ys",  g:"宿舍",   n:"藝瑟的房間", sp:"dorm",    open:[0,1,2,3,4],base:"bedroom",owner:"ys"},
  {id:"bed_tr",  g:"宿舍",   n:"泰梨的房間", sp:"dorm",    open:[0,1,2,3,4],base:"bedroom",owner:"tr"},
  {id:"bed_hy",  g:"宿舍",   n:"日和的房間", sp:"dorm",    open:[0,1,2,3,4],base:"bedroom",owner:"hy"},
  {id:"bed_he",  g:"宿舍",   n:"夏恩的房間", sp:"dorm",    open:[0,1,2,3,4],base:"bedroom",owner:"he"},
  {id:"bed_hr",  g:"宿舍",   n:"河嵐的房間", sp:"dorm",    open:[0,1,2,3,4],base:"bedroom",owner:"hr"},
  {id:"store",   g:"外面",   n:"便利商店",  sp:"out",     open:[0,1,2,3,4]},
  {id:"river",   g:"外面",   n:"漢江邊",   sp:"out",     open:[0,1,2,3,4]},
  /* 製作中心(2026-10-27):facOnly=只有設施、不拜訪;拜訪內容沒有專屬片段前借用相近地點(sp) */
  {id:"planning",g:"製作中心", n:"企劃室",   sp:"office",  open:[1,2,3],facOnly:1},
  {id:"meeting", g:"製作中心", n:"會議室",   sp:"office",  open:[1,2,3],facOnly:1},
  {id:"vocal",   g:"製作中心", n:"聲樂室",   sp:"studio",  open:[1,2,3]},
  {id:"design",  g:"製作中心", n:"設計工作室",sp:"styling", open:[1,2,3],facOnly:1},
  {id:"lobby",   g:"製作中心", n:"大廳",     sp:"practice",open:[0,1,2,3]},
  {id:"photo",   g:"製作中心", n:"攝影棚",   sp:"styling", open:[1,2,3]}];
const PL=Object.fromEntries(PLACES.map(p=>[p.id,p]));
const baseOf=pid=>PL[pid]?.base||pid;
const openText=p=>p.open.length===5?"全天開放":p.open.map(i=>SLOTS[i].n).join("、")+"開放";
const WHERE={
  ys:[{practice:3,kitchen:2,living:1},{practice:4,styling:1},{practice:3,studio:2},{practice:3,living:2,kitchen:1},{practice:3,living:1,river:1,bedroom:1}],
  tr:[{bedroom:3,practice:1},{practice:3,studio:2},{studio:3,practice:2},{practice:2,bedroom:2,studio:1},{bedroom:2,store:2,practice:1}],
  hy:[{practice:3,kitchen:1},{practice:2,"外出:韓語課":2},{practice:4,styling:1},{practice:2,living:2},{living:1,bedroom:2,practice:1}],
  he:[{kitchen:3,bedroom:1},{practice:3,styling:1,"外出:個人拍攝":1},{practice:2,studio:1,styling:1,"外出:個人拍攝":1},{kitchen:3,living:1,practice:1},{living:2,bedroom:2}],
  hr:[{bedroom:3,kitchen:1},{practice:3,"外出:聲樂課":1},{practice:3,studio:1},{living:3,practice:1,store:1},{practice:2,store:1,bedroom:1}]};

/* 製作中心的聲樂室、大廳、攝影棚也會有人(2026-10-27):主唱河嵐最常去聲樂室,門面夏恩比較常在攝影棚 */
for(const [id,arr] of Object.entries(WHERE)) arr.forEach((w,sl)=>{ if(sl<1||sl>3) return;
  w.vocal=(w.vocal||0)+({hr:1.5,ys:1,he:.8}[id]||.5)+(w.studio||0)*.3; w.lobby=(w.lobby||0)+.25; w.photo=(w.photo||0)+(id==="he"?.6:.3) });
/* ---------- 備用文字(內容庫沒有對應片段時才用) ---------- */
const SCN={roof:"頂樓的風有點涼,欄杆上的小燈泡一閃一閃,遠處的城市一片燈海。",vocal:"琴聲和發聲練習的聲音,從門縫裡一點一點漏出來。",lobby:"大廳的獎盃櫃擦得發亮,接待台旁堆著粉絲送來的花。",photo:"攝影棚的燈還亮著,白色背景布前散著幾件剛拍完的造型。",practice:"鏡子前的音樂還在放,地板上散著毛巾和水瓶。",studio:"隔音門關上的瞬間,外面的聲音全部消失了。",office:"你的辦公室。桌上的企劃書疊得比昨天更高。",styling:["","上午的陽光從落地窗斜斜照進來,衣架上新到的打歌服還套著防塵袋,空氣裡有淡淡的熨斗蒸氣味。","下午的造型室最熱鬧:化妝鏡的燈泡一盞盞亮著,桌上攤著色票和飾品盒,試衣間的布簾拉開又拉上。","入夜後只剩衣架間的投射燈還亮著,鏡子裡映著一排排亮片與緞面,地上散著幾根被拆下的吊牌。",""],
  living:"客廳的電視開著,沙發上堆著抱枕和還沒摺的衣服。",kitchen:"廚房飄著味道,水槽裡泡著幾個碗。",bedroom:"你敲了敲寢室半開的門,裡面的燈還亮著。",
  store:"便利商店的自動門叮咚一聲打開,冷氣撲面而來。",river:"江風吹過來,對岸的燈一盞一盞亮著。"};
const EMPTY={practice:"這裡現在沒有人。鏡子上貼著一張寫滿走位的便條。",studio:"這裡現在沒有人。控制台上放著一張寫了一半的歌詞。",office:"辦公室只有你一個人。祕書留了一疊待簽的文件。",styling:["","造型室裡只有造型師在核對新到的衣服清單,一件件掛上衣架。","造型師把明天要用的配件排在絨布托盤上,現在沒有成員在這裡。","造型室已經沒有人了,只剩全身鏡旁的小燈還亮著,衣架上的打歌服靜靜垂著。",""],
  living:"客廳現在沒有人。遙控器被塞在沙發縫裡。",kitchen:"廚房現在沒有人。冰箱上貼著一張「不准偷吃」的紙條。",bedroom:"寢室裡沒有人,床鋪整理得比你想的還整齊。",
  store:"店裡只有店員在補貨,沒有認識的人。",river:"江邊只有慢跑的人和腳踏車,沒有認識的人。"};
const LINES={
  ys:[["代表來了啊~要不要一起看剛剛的練習影片?","smile"],["我在想下週的練習表,日和最近好像太累了。","neutral"],["沒事沒事,我只是在發呆而已。","smile"]],
  tr:[["……有事?","neutral"],["我在忙。……你可以坐那邊。","neutral"],["剛剛那段你有聽到嗎?不要說客套話。","neutral"]],
  hy:[["代表!今天學了一個新的韓文單字,好難懂喔。","smile"],["大丈夫です,我不累。","smile"],["跳舞的時候,腦袋最安靜。","neutral"]],
  he:[["代表吃飯了沒?我多做了一份喔~","smile"],["哎呀,被看到素顏了。","smile"],["今天被誇了……可是我想被誇的不是臉。","neutral"]],
  hr:[["代表!你聽你聽,我今天高音過了!","smile"],["濟州現在應該在下雨吧……","neutral"],["我沒有偷吃零食喔!這是、這是大家的!","smile"]]};
const ABSENT={practice:["{a}一個人留下來加練,鏡子上留著擦不掉的手印。","{a}和{b}為了走位吵了兩句,後來又一起去買飲料。"],studio:["{a}在錄音室待了很久,錄了一段沒給任何人聽的 demo。"],
  living:["{a}和{b}窩在沙發看綜藝,笑聲傳到走廊。","{a}在客廳睡著了,有人幫她蓋了毯子。"],kitchen:["{a}煮了一鍋湯,留了一碗在冰箱。","{a}和{b}搶最後一個布丁,最後一人一半。"],
  bedroom:["{a}一直待在房間裡,門關著,裡面傳出小小的歌聲。"],store:["{a}去便利商店買了大家份的冰。"],river:["{a}在漢江邊坐了很久,回來時鞋子上都是沙。"]};
const MSG={ys:[["代表今天也辛苦了~明天的行程我會再確認一次!",[3,4]],["練習室的冷氣好像怪怪的,可以請人來看一下嗎?",[0,1,2]]],tr:[["(一段 30 秒的錄音)",[3,4]],["明天的編舞,我有想法。",[2,3,4]]],
  hy:[["代表,不好意思這麼晚。韓文的「心很累」要怎麼說比較自然呢?",[4]],["今天的韓語課被老師稱讚了!",[2,3]]],he:[["代表吃飯了嗎~宿舍還有我煮的湯喔",[2,3]],["明天早上要拍照,我會早點睡的!",[3,4]]],
  hr:[["代表早安!!今天天氣超好 我要第一個到練習室!!",[0,1]],["濟州的橘子季要到了……",[2,3,4]]]};

/* ---------- 存檔 ---------- */
const KEY="kpopGame.save";
function fresh(){return {v:3,gen:10,day:0,slot:0,min:DAY0,entered:[],
  /* 改版 1.0:五個人從「快要信任」開始(好感 1000 是信任;2026-10-29 使用者決定):河嵐、夏恩最快,泰梨最慢 */
  m:{ys:{xp:920,heart:0,mood:60,stress:40},tr:{xp:860,heart:0,mood:55,stress:35},hy:{xp:900,heart:0,mood:50,stress:45},he:{xp:940,heart:0,mood:70,stress:30},hr:{xp:960,heart:0,mood:65,stress:35}},
  where:{},flags:{},seen:{},absent:[],unread:0,wear:null,lastWear:{},updatedAt:0}}
let S; try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.m) S=fresh();
/* 存檔版本(參考 save-systems 技能):之後改資料結構時,把 SAVE_VER 加 1,在 MIGRATE 寫一步把舊存檔轉成新格式;讀檔、讀雲端存檔、回復備份都會跑 */
/* v3(2026-10-29 改版 1.0):遊戲只留新版本。舊存檔(gen 不是 10、v 小於 3)不轉換:先封存(kpopGame.saveV0、IndexedDB、存檔備份),
   開新遊戲,只把已解鎖的回憶照片帶過來(S.cgKeep,相簿照樣看得到;新遊戲裡升階時那張 CG 還是會再「發生」一次)。
   gen:10 是新版存檔的記號:還沒更新的舊版 App 讀到新版存檔會把 v 改回 2,有這個記號就不會被當成舊存檔重開 */
const SAVE_VER=3, MIGRATE={2:s=>{ /* v1 → v2:只加版本號,欄位不變 */ }};
let V0_PENDING=null;
function archiveV0(old){ const js=JSON.stringify(old); V0_PENDING=js;
  try{ const cur=JSON.parse(localStorage.getItem("kpopGame.saveV0")||"null"); if(!cur||(old.updatedAt||0)>=(cur.updatedAt||0)) localStorage.setItem("kpopGame.saveV0",js) }catch(e){ window.logErr?.("舊存檔封存",e) } }
function newFromV0(old){ archiveV0(old); const n=fresh(), k=old.cgKeep||{}, mg=(a,b)=>({...(a||{}),...(b||{})});
  const cg={}; for(const [id,o] of Object.entries(k.cg||{})) cg[id]={...o}; for(const [id,o] of Object.entries(old.cg||{})) cg[id]={...(cg[id]||{}),...o};
  n.cgKeep={cg,cgDuo:mg(k.cgDuo,old.cgDuo),cgEx:mg(k.cgEx,old.cgEx)}; n.fromV0={day:old.day||0,at:Date.now()}; return n }
const START_XP={ys:920,tr:860,hy:900,he:940,hr:960};
function fixV3(s){ s.gen=10;
  if(s.m&&!s.flags?.startXp2){ for(const [id,x] of Object.entries(START_XP)) if(s.m[id]&&(s.m[id].xp==null||s.m[id].xp<x)) s.m[id].xp=x; (s.flags=s.flags||{}).startXp2=1 }   // 第 2 輪開的新遊戲:起點補到「快要信任」(只升不降) if(!(s.slot>=0&&s.slot<=4)) s.slot=0; if(!isFinite(+s.min)||s.min<SLOTS[s.slot].from) s.min=SLOTS[s.slot].from;
  if(!Array.isArray(s.entered)) s.entered=[]; delete s.t; delete s.acts; delete s.visited }
const isV0=s=>!!s&&s.gen!==10&&(+s.v||1)<3;
function migrate(s){ if(isV0(s)&&s.m){ const n=newFromV0(s); for(const k of Object.keys(s)) delete s[k]; Object.assign(s,n); return s }
  let v=+s.v||1; while(v<SAVE_VER){ v++; try{ MIGRATE[v]?.(s) }catch(e){ console.error("migrate",v,e) } } s.v=SAVE_VER; fixV3(s); return s }
migrate(S);
try{ const o=JSON.parse(localStorage.getItem("kpopGame.t")||"null"); if(o&&o.d===S.day&&o.m>S.min&&o.m<1800) S.min=o.m }catch(e){window.logErr?.("game",e)}   // 最後幾秒的時間(每 3 秒記一次)
/* updatedAt 只在有進度時更新(換時段、拜訪、做選擇),用來判斷雲端與本機哪份較新;時間流動只存本機 */
/* 存檔:寫入失敗(多半是手機的網頁儲存空間滿了)會提示,並改存到 IndexedDB 的備份區,下次啟動會自動接回 */
let saveFail=false;
function save(progress){ if(progress){ S.updatedAt=Date.now(); try{ localStorage.setItem("kpopGame.sySeq",String((+localStorage.getItem("kpopGame.sySeq")||0)+1)) }catch(e){} } const js=JSON.stringify(S);
  try{ localStorage.setItem(KEY,js); if(saveFail){ saveFail=false; window.toast2?.("存檔恢復正常了") } }
  catch(e){ if(!saveFail){ saveFail=true; setTimeout(()=>window.toast2?.("存檔失敗:手機的網頁儲存空間可能滿了。進度先存到備份區,建議登入雲端同步"),0) } }
  backupTick(js) }
/* 自動備份:每 30 分鐘一份,保留最近 6 份 + 最近 3 天每天一份(選單「存檔備份」可以回到其中一份) */
let bakAt=+localStorage.getItem("kpopGame.bakAt")||0, bakBusy=false;
async function backupTick(js,force,why){ if(saveFail&&IDB.db) IDB.set("saveFallback",js);
  if(bakBusy||!IDB.db||(!force&&Date.now()-bakAt<30*60e3)) return; bakBusy=true;
  try{ const L=(await IDB.get("saveBackups"))||[]; L.unshift({t:Date.now(),day:why?(()=>{try{return JSON.parse(js).day}catch(e){return S.day}})():S.day,json:js,why:why||""});
    const keep=L.slice(0,6), days=new Set(keep.map(b=>new Date(b.t).toDateString()));
    for(const b of L.slice(6)){ const d=new Date(b.t).toDateString(); if(!days.has(d)&&days.size<9){ keep.push(b); days.add(d) } if(keep.length>=9) break }
    await IDB.set("saveBackups",keep); bakAt=Date.now(); localStorage.setItem("kpopGame.bakAt",String(bakAt)) }catch(e){window.logErr?.("game",e)} bakBusy=false }

/* ---------- 本機快取(IndexedDB):片段庫與衣櫃 ---------- */
const IDB={db:null,
  open(){return new Promise(ok=>{try{const r=indexedDB.open("kpopGame",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>{this.db=r.result;ok()};r.onerror=()=>ok()}catch(e){ok()}})},
  get(k){return new Promise(ok=>{if(!this.db) return ok(null);const q=this.db.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>ok(q.result??null);q.onerror=()=>ok(null)})},
  set(k,v){return new Promise(ok=>{if(!this.db) return ok();const t=this.db.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ok()})},
  del(k){return new Promise(ok=>{if(!this.db) return ok();const t=this.db.transaction("kv","readwrite");t.objectStore("kv").delete(k);t.oncomplete=()=>ok();t.onerror=()=>ok()})}};
let SCRIPTS={};   // code → 片段(只留已收錄的)
let ITEMS={};     // code → 衣帽間造型(精簡)
let WMEM={};      // 衣帽間成員欄位 m1..m5 → ys..hr
let WMETA=[];     // 衣帽間成員資料(含生圖底模 gen 的 blob 參照)

/* ---------- 雲端(Firestore REST,跟其他工具同一套) ---------- */
const SY_CFG="kpopSync.cfg",SY_AUTH="kpopSync.auth";
const syCfg=()=>{try{return JSON.parse(localStorage.getItem(SY_CFG)||"null")}catch(e){return null}};
const syAuth=()=>{try{return JSON.parse(localStorage.getItem(SY_AUTH)||"null")}catch(e){return null}};
let syTok=null,syBusy=false,syLastPush=0,pushT=0;
const SY_ERR={INVALID_LOGIN_CREDENTIALS:"Email 或密碼錯誤。",INVALID_PASSWORD:"Email 或密碼錯誤。",EMAIL_NOT_FOUND:"Email 或密碼錯誤。",INVALID_EMAIL:"Email 格式不對。",
  API_KEY_INVALID:"Firebase 設定的 apiKey 不正確。",PERMISSION_DENIED:"Firestore 安全規則擋住了,請確認規則已發布。",NOT_FOUND:"找不到 Firestore 資料庫。",TOKEN_EXPIRED:"登入已過期,請重新登入。",network:"連不上雲端,請確認網路。"};
const syMsg=e=>{const c=String(e?.code||e||"");for(const k in SY_ERR) if(c.includes(k)) return SY_ERR[k];return "同步失敗:"+c.slice(0,80)};
/* 雲端讀寫次數(2026-10-29 雲端用量):這台裝置今天(Firestore 的額度依美西時間每天重置)讀、寫、刪了幾次 */
const OPK="kpopGame.syOps", opDay=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Los_Angeles"});
let OPS=null, opsDirty=false;
function opsGet(){ if(!OPS){ try{ OPS=JSON.parse(localStorage.getItem(OPK)||"null") }catch(e){} } if(!OPS||OPS.d!==opDay()) OPS={d:opDay(),r:0,w:0,x:0}; return OPS }
function opCount(url,opt,j){ if(!String(url).includes("firestore.googleapis.com")) return; const o=opsGet(), m=(opt?.method||"GET").toUpperCase();
  if(String(url).includes(":runQuery")) o.r+=Math.max(1,Array.isArray(j)?j.filter(x=>x.document).length:1); else if(m==="GET") o.r++; else if(m==="DELETE") o.x++; else o.w++; opsDirty=true }
every(5000,()=>{ if(!opsDirty) return; opsDirty=false; try{ localStorage.setItem(OPK,JSON.stringify(OPS)) }catch(e){} },{bg:true});
window.syOps=()=>({...opsGet()});
async function syJSON(url,opt){let r;try{r=await fetch(url,opt)}catch(e){throw {code:"network"}}
  const j=await r.json().catch(()=>({})); opCount(url,opt,j); if(!r.ok) throw {code:String(j?.error?.message||j?.error?.status||"HTTP "+r.status),status:r.status,st:String(j?.error?.status||"")}; return j}
async function syToken(){const a=syAuth(),c=syCfg(); if(!a||!c) throw {code:"未登入"}; if(syTok&&syTok.exp>Date.now()) return syTok.id;
  const j=await syJSON(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(c.apiKey)}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(a.refreshToken)});
  a.refreshToken=j.refresh_token; localStorage.setItem(SY_AUTH,JSON.stringify(a)); syTok={id:j.id_token,exp:Date.now()+(+j.expires_in-60)*1000}; return syTok.id}
const syBase=()=>{const c=syCfg(),a=syAuth();return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(c.projectId)}/databases/(default)/documents/users/${a.uid}`};
async function syGet(path){const t=await syToken();try{return await syJSON(syBase()+"/"+path,{headers:{Authorization:"Bearer "+t}})}catch(e){if(e.status===404) return null;throw e}}
async function syPatch(path,fields){const t=await syToken();return syJSON(syBase()+"/"+path,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({fields})})}
/* 增量下載(第二輪優化):多抓 10 分鐘的重疊(各裝置時鐘有誤差也不會漏);一次 300 筆分頁(內容庫上萬段時不會一次下載整包)。
   分頁查詢失敗(例如雲端要求索引)就退回原本一次查完的寫法 */
async function syQuery(col,since){ since=Math.max(0,(+since||0)-600000);
  const t=await syToken(), url=syBase()+":runQuery", H={"Content-Type":"application/json",Authorization:"Bearer "+t};
  const base={from:[{collectionId:col}],where:{fieldFilter:{field:{fieldPath:"updatedAt"},op:"GREATER_THAN",value:{integerValue:String(since)}}}};
  const out=[]; let cur=null;
  try{ for(let pg=0;pg<400;pg++){ const sq={...base,orderBy:[{field:{fieldPath:"updatedAt"},direction:"ASCENDING"},{field:{fieldPath:"__name__"},direction:"ASCENDING"}],limit:300};
      if(cur) sq.startAt={values:[{integerValue:cur.u},{referenceValue:cur.n}],before:false};
      const rows=await syJSON(url,{method:"POST",headers:H,body:JSON.stringify({structuredQuery:sq})}), docs=rows.filter(r=>r.document); out.push(...docs);
      if(docs.length<300) return out; const L=docs[docs.length-1].document; cur={u:L.fields.updatedAt.integerValue,n:L.name} } return out }
  catch(e){ if(out.length||!/index|order|cursor|INVALID_ARGUMENT|FAILED_PRECONDITION/i.test(String(e.code||"")+String(e.st||""))) throw e;
    logErr("同步分頁",e); return (await syJSON(url,{method:"POST",headers:H,body:JSON.stringify({structuredQuery:base})})).filter(r=>r.document) } }
function syStatus(t,err){const e=$("#syStatus");if(e){e.textContent=t;e.classList.toggle("err",!!err)} $("#syncDot").textContent=err?"同步失敗":t.startsWith("同步中")?"同步中…":""}

/* 從衣帽間與劇本工坊拉新資料(只拉上次之後有變動的) */
async function pullCollection(col,store,keep,slim){
  const k="kpopGame.pull."+col, since=+(localStorage.getItem(k)||0); let max=since, n=0;
  const rows=await syQuery(col,since);
  for(const r of rows){const d=r.document; if(!d) continue; const code=decodeURIComponent(d.name.split("/").pop()), up=+d.fields.updatedAt?.integerValue||0; max=Math.max(max,up);
    if(d.fields.deleted?.booleanValue){ if(store[code]){delete store[code];n++} continue }
    let it; try{it=JSON.parse(d.fields.json.stringValue)}catch(e){continue}
    if(keep(it)){ const v=slim(it,code); if(JSON.stringify(store[code])!==JSON.stringify(v)){store[code]=v;n++} } else if(store[code]){delete store[code];n++} }
  localStorage.setItem(k,String(max)); return n}
async function pullContent(){
  // 衣帽間成員欄位對應
  try{const meta=await syGet("meta/state"); const raw=meta?JSON.parse(meta.fields.json.stringValue):null; const mm=raw?.members||[];
    if(raw) await IDB.set("wmetaRaw",raw);
    const map={}; for(const m of mm){const hit=M.find(x=>x.re.test((m.name||"")+" "+(m.en||""))); if(hit) map[m.id]=hit.id} if(Object.keys(map).length){WMEM=map;await IDB.set("wmem",WMEM)}
    if(mm.length){WMETA=mm; await IDB.set("wmeta",WMETA)}}catch(e){window.logErr?.("game",e)}
  // 舊版只存了精簡資料(沒有服裝描述),第一次換新版時整批重新下載
  if(localStorage.getItem("kpopGame.itemsFmt")!=="2"){ITEMS={}; localStorage.removeItem("kpopGame.pull.items")}
  const a=await pullCollection("items",ITEMS,it=>it.kind==="look",(it,code)=>({...it,code,seasons:Array.isArray(it.seasons)?it.seasons:[]}));
  await IDB.set("items",ITEMS); localStorage.setItem("kpopGame.itemsFmt","2");
  /* 劇情(2026-10-29 改版 1.0):打包同步在 scripts.js(scriptsPull),遊戲用的 SCRIPTS 也在那裡一起更新,不再另外讀一遍 */
  const b=window.scriptsPull?await window.scriptsPull().catch(e=>{ logErr("劇情同步",e); return 0 }):0;
  localStorage.setItem("kpopGame.pulledOnce","1");
  return a+b}
/* 遊戲存檔與兩台裝置的覆蓋保護(第二輪優化)
   記住這台最後一次看到的雲端版本(Firestore 的 updateTime,kpopGame.syUT);這台有沒有還沒上傳的進度用本機計數判斷
   (kpopGame.sySeq 每次有進度 +1,kpopGame.syPushed 是上次上傳或讀雲端時的值),不比較各裝置的時鐘。
   上傳時要求雲端還是那一版(currentDocument.updateTime 前提);不是就代表別台存過:
   這台沒有新進度 → 直接讀雲端(先備份本機);兩邊都有新進度 → 跳出選擇。啟動、App 回到前景時也檢查。 */
const SY_UT="kpopGame.syUT", SY_PS="kpopGame.syPushed";
const syUT=()=>localStorage.getItem(SY_UT)||"", seqNow=()=>+localStorage.getItem("kpopGame.sySeq")||0, seqPushed=()=>+localStorage.getItem(SY_PS)||0;
function syMark(ut,seq){ if(ut) localStorage.setItem(SY_UT,ut); localStorage.setItem(SY_PS,String(seq||0)) }
let syConflict=false;
const cloudSave=d=>{ try{ const o=JSON.parse(d.fields.json.stringValue); return o&&o.m?o:null }catch(e){ return null } };
async function adoptCloud(d,o,why){ await backupTick(JSON.stringify(S),true,why||"讀取雲端進度前的本機進度");
  S=migrate(o); try{ localStorage.setItem(KEY,JSON.stringify(S)) }catch(e){window.logErr?.("game",e)} syMark(d.updateTime,seqNow()) }
/* 雲端那份跟這台不同時怎麼辦。回傳 "adopt"=已改用雲端、"ask"=跳出選擇、false=沒事(呼叫端照常上傳) */
async function cloudChanged(d){ const o=cloudSave(d); if(!o) return false;
  const cAt=+d.fields.updatedAt?.integerValue||0, mine=S.updatedAt||0, known=syUT();
  if(!known){ if(cAt>mine){ await adoptCloud(d,o); return "adopt" } syMark(d.updateTime,seqPushed()); return false }   // 第一次:照舊規則,較新的那份為準
  if(d.updateTime===known) return false;                                   // 雲端沒被別台改過
  if(seqNow()<=seqPushed()){ await adoptCloud(d,o); return "adopt" }        // 這台沒有新進度:直接讀雲端
  showConflict(d,o,cAt); return "ask" }
async function pullSave(){ const d=await syGet("game/state"); if(!d) return false; const r=await cloudChanged(d); return r==="adopt"?true:r }
async function pushSave(force){ if(!syAuth()||!syCfg()||!S.updatedAt) return; if(syConflict&&!force) return;
  try{ syLastPush=Date.now(); save(); let ut=syUT();
    if(!ut){ const d=await syGet("game/state"); if(d){ const r=await cloudChanged(d); if(r){ if(r==="adopt"){ ensureWear(true); renderAll(); toast2("已讀取雲端較新的進度") } return } ut=syUT() } }
    const at=S.updatedAt, seq=seqNow(), r=await syPatch("game/state"+(ut?"?currentDocument.updateTime="+encodeURIComponent(ut):""),{json:{stringValue:JSON.stringify(S)},updatedAt:{integerValue:String(at)}});
    syMark(r?.updateTime,seq); syStatus("已同步 "+new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})) }
  catch(e){ if(e.st==="FAILED_PRECONDITION"||(e.st==="NOT_FOUND"&&syUT())){   // 雲端被別台改過(或刪掉了):重新看一次
      let d=null; try{ d=await syGet("game/state") }catch(_){window.logErr?.("game",_)}
      if(!d){ localStorage.removeItem(SY_UT); if(!force) return pushSave(true); return }
      const r=await cloudChanged(d); if(r==="adopt"){ ensureWear(true); renderAll(); toast2("另一台裝置有較新的進度,已讀取(這台原本的進度在選單的存檔備份)") } return }
    syStatus(syMsg(e),true); logErr("上傳存檔",e) } }
function showConflict(d,o,cAt){ if(syConflict) return; syConflict=true; setPause("sync",true);
  const ft=t=>t?new Date(t).toLocaleString("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
  const gd=x=>{ const y=dateOf(x.day||0); return `${y.getFullYear()}.${y.getMonth()+1}.${y.getDate()}・${SLOTS[x.slot]?.n||""}` };
  const el=document.createElement("div"); el.className="syconf"; el.id="syConf";
  el.innerHTML=`<div class="sybox"><h3>兩台裝置的進度不一樣</h3><p>雲端有另一台裝置存的進度,這台也有還沒上傳的進度。選一份繼續,另一份會先放進選單的「存檔備份」,之後還能回去。</p>
    <div class="sych"><button data-k="cloud"><b>用雲端的進度</b><span>遊戲 ${gd(o)}</span><small>存於 ${ft(cAt)}</small></button>
    <button data-k="here"><b>用這台的進度</b><span>遊戲 ${gd(S)}</span><small>存於 ${ft(S.updatedAt)}</small></button></div></div>`;
  $("#stage").appendChild(el);
  el.querySelectorAll("[data-k]").forEach(b=>b.onclick=async()=>{ el.querySelectorAll("button").forEach(x=>x.disabled=true); const k=b.dataset.k;
    if(k==="cloud"){ await adoptCloud(d,o,"改用雲端進度前的本機進度"); ensureWear(true); renderAll(); toast2("已改用雲端的進度(這台原本的進度在存檔備份)") }
    else { await backupTick(d.fields.json.stringValue,true,"被這台覆蓋前的雲端進度"); syMark(d.updateTime,seqPushed()) }
    el.remove(); syConflict=false; setPause("sync",false); if(k==="here") pushSave(true) }) }
function schedulePush(){if(!syAuth()) return; clearTimeout(pushT); pushT=setTimeout(pushSave,Math.max(3000,20000-(Date.now()-syLastPush)))}
async function syncAll(manual,atStart){
  if(!syAuth()||!syCfg()){ if(manual) toast2("請先登入雲端同步"); renderSources(); return }
  if(syBusy) return; syBusy=true; syStatus("同步中…");
  try{ if(window.pushOutbox) await pushOutbox(); const n=await pullContent(); let adopted=false;
    for(const h of window.SYNC_HOOKS||[]){ try{ await h() }catch(e){window.logErr?.("game",e)} }
    if(atStart||manual){ adopted=await pullSave() }
    if(!adopted) await pushSave();
    syStatus("已同步 "+new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"}));
    if(adopted===true){ensureWear(); renderAll(); toast2("已讀取雲端存檔")} else if(n){ensureWear(true); renderAll()}
    if(manual) toast2(n?`同步完成,更新了 ${n} 筆資料`:"同步完成"); }
  catch(e){syStatus(syMsg(e),true); if(manual) toast2(syMsg(e))}
  finally{syBusy=false; renderSources()}
}

/* ---------- 劇本片段 ---------- */
const cloudSnips=()=>Object.values(SCRIPTS);
const snips=()=>[...cloudSnips(),...WX_SNIPS];
const ENTRY=["encounter","practice","request","friction","surprise","worry","between","pairlong","long","chat","situ","arc"];
const TALK=["topic","chat","worry","request","encounter","situ","arc"];
const OFFICE=["chat","request","surprise","long","worry","situ","arc"];
const PAIR_TYPES=["between","group","pairlong","away"];
/* ---------- 劇本工坊 v3:事件紀錄、情境變數、出場條件、事件劇本 ----------
   片段可以帶 req(出場條件,例如演唱會後一週內)與 {變數}(遊戲執行時換成真正的名稱);變數缺資料的片段不會出場。
   大事件(演唱會後台、第一個一位、出道、回歸)先從內容庫挑 type:"event"、ev 相同的片段,沒有才用程式內建的那段。 */
window.logEvent=(k,d={})=>{ S.evLog=[...(S.evLog||[]),{k,day:S.day,d}].slice(-60) };
const lastEv=k=>{ const L=S.evLog||[]; for(let i=L.length-1;i>=0;i--) if(L[i].k===k) return L[i]; return null };
const VENUE_N={hall:"星環 Live Hall",arena:"漢江體育館",dome:"首爾巨蛋"};
const lastConcert=()=>{ const e=lastEv("concert"); if(e) return {day:e.day,title:e.d.title,venue:e.d.venue}; const c=(S.concerts||[]).slice(-1)[0]; return c?{day:c.day,title:c.title,venue:VENUE_N[c.venue]||c.venue}:null };
const STORY_VARS={團名:()=>window.mileVar?.團名(),出道曲:()=>window.mileVar?.出道曲(),最新主打:()=>S.promo?.title||(S.promoHist||[]).slice(-1)[0]?.title||null, 演唱會:()=>lastConcert()?.title||null, 場館:()=>lastConcert()?.venue||null,
  一位節目:()=>lastEv("win")?.d.show||null, 一位歌曲:()=>lastEv("win")?.d.song||null};
const sinceDays=e=>e?S.day-e.day:Infinity, mdNow=()=>{ const d=dateOf(S.day); return (d.getMonth()+1)*100+d.getDate() };
const STORY_REQ={after_concert:()=>sinceDays(lastConcert())<=7, after_win:()=>sinceDays(lastEv("win"))<=5, promo:()=>!!window.promoInfo?.()?.active,
  pre_comeback:()=>S.comeback!=null&&S.comeback-S.day>=0&&S.comeback-S.day<=14, xmas:()=>{ const x=mdNow(); return x>=1218&&x<=1226 }, newyear:()=>{ const x=mdNow(); return x>=1229||x<=103 }};
window.STORY_VARS=Object.keys(STORY_VARS); window.STORY_REQ=Object.keys(STORY_REQ);
const VAR_RE=/\{([^{}\s"]{1,8})\}/g, varCache=new WeakMap();
function varsOf(sn){ let v=varCache.get(sn); if(!v){ v=[...new Set([...JSON.stringify([sn.sc||"",sn.nodes||{}]).matchAll(VAR_RE)].map(m=>m[1]))]; varCache.set(sn,v) } return v }
/* 連續劇情:第 N 段要等第 N-1 段看過、隔一天以上才會出現 */
function arcOk(sn){ if(!sn.arc||!(+sn.part>1)) return true; const prev=snips().find(x=>x.arc===sn.arc&&+x.part===+sn.part-1), d=prev&&S.seen[prev.code]; return d!=null&&S.day-d>=1 }
/* 舞台指示(劇本裡的 ["@","bg:kitchen"] 這類):換背景、成員進場離場;sfx 先記著給之後的聲音系統 */
const DIR_BG=["practice","studio","office","styling","living","kitchen","river","store","van","backstage","vocal","lobby","photo","roof","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"];   // 2026-10-29 加製作中心、五人的房間
/* 2026-10-28 演出指令:cam:close 特寫(下一位說話的人,鏡頭慢慢推近她的臉)、cam:wide 拉回;
   fx:shake 輕震、fx:flash 白光一閃、fx:pause 沉默停頓(約 1.2 秒)、fx:slow 下一句慢慢打字;
   mood:memory 回憶(暖黃、柔光、暗角)、mood:dim 燈光變暗(難過、低潮)、mood:off 恢復。片段結束或離開時自動恢復。
   回傳毫秒數 = 要等多久才往下 */
const RMQD=matchMedia("(prefers-reduced-motion:reduce)");
let CAM=null, slowNext=false;
const camEls=()=>[$("#vbg"),$("#vppl")].filter(Boolean);
function camReset(fast){ for(const e of camEls()){ e.getAnimations().filter(a=>a.id==="cam").forEach(a=>{ if(fast) a.cancel(); else { a.reverse() } }) } CAM=null }
function camClose(id){ if(RMQD.matches) return; const ppl=$("#vppl"), img=id&&ppl?.querySelector(`[data-id="${id}"]`); camReset(true);
  let ox=50, oy=34; if(img){ const r=img.getBoundingClientRect(), R=$("#visit").getBoundingClientRect(); ox=((r.left+r.width/2-R.left)/R.width*100); oy=Math.max(12,Math.min(45,((r.top-R.top)/R.height*100)+16)) }
  for(const e of camEls()){ const a=e.animate([{scale:1,transformOrigin:`${ox}% ${oy}%`},{scale:e.id==="vbg"?1.08:1.16,transformOrigin:`${ox}% ${oy}%`}],{duration:1400,easing:"cubic-bezier(.3,.1,.25,1)",fill:"forwards"}); a.id="cam" } CAM=id||true }
function moodSet(k){ const v=$("#visit"); let el=v.querySelector(".vmood"); if(!el){ el=document.createElement("div"); el.className="vmood"; v.querySelector(".vtint")?.after(el) }
  el.dataset.k=k==="off"?"":k }
function stageReset(){ camReset(true); moodSet("off"); slowNext=false }
function stageDir(t){ const [k,v]=String(t||"").split(":");
  if(k==="bg"&&DIR_BG.includes(v)) $("#vbg").style.backgroundImage=`url(${seasonArt("bg",v,SLOTS[S.slot].light)})`;
  else if((k==="enter"||k==="exit")&&V&&byId(v)){ V.present=k==="enter"?[...new Set([...V.present,v])]:V.present.filter(x=>x!==v); drawPeople() }
  else if(k==="cam"){ if(v==="close"){ const nx=D?.q.find(x=>x.k==="line"&&x.id&&x.id!=="@"&&byId(x.id)); camClose(nx?.id||D?.main) } else camReset(false) }
  else if(k==="mood") moodSet(["memory","dim"].includes(v)?v:"off");
  else if(k==="fx"){
    if(v==="pause"){ $("#vbox")?.classList.remove("wait"); return skip?0:1200 }
    if(v==="slow"){ slowNext=true; return 0 }
    if(RMQD.matches) return 0;
    if(v==="shake") for(const e of camEls()) e.animate([{translate:"0 0"},{translate:"-.6% .2%"},{translate:".5% -.3%"},{translate:"-.3% .2%"},{translate:".2% 0"},{translate:"0 0"}],{duration:380,easing:"ease-out",composite:"add"});
    if(v==="flash"){ const f=document.createElement("div"); f.className="vflash"; $("#visit").appendChild(f); f.animate([{opacity:0},{opacity:.85,offset:.18},{opacity:0}],{duration:650,easing:"ease-out"}).finished.then(()=>f.remove(),()=>f.remove()) } }
  return 0 }
/* 日期條件(2026-10-29):date:["2016-08-20",""] = 那天以後才出現(第二格是到哪天為止) */
const ymdNow=()=>{ const d=dateOf(S.day); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` };
function dateOk(sn){ const d=sn.date; if(!Array.isArray(d)) return true; const n=ymdNow(); return (!d[0]||n>=d[0])&&(!d[1]||n<=d[1]) }
function reqOk(sn){ if(!dateOk(sn)) return false; if(sn.req&&[].concat(sn.req).some(k=>!STORY_REQ[k]?.())) return false; return varsOf(sn).every(k=>STORY_VARS[k]?.()!=null) }
function fillVars(sn){ if(!varsOf(sn).length) return sn;
  const rep=t=>typeof t==="string"?t.replace(VAR_RE,(m,k)=>STORY_VARS[k]?.()??m):t, L=a=>(a||[]).map(l=>[l[0],rep(l[1]),...l.slice(2)]);
  const nodes={}; for(const [k,n] of Object.entries(sn.nodes||{})) nodes[k]={...n,L:L(n.L),C:(n.C||[]).map(c=>({...c,t:rep(c.t),...(c.r?{r:L(c.r)}:{})}))};
  return {...sn,sc:rep(sn.sc),nodes} }
window.eventSnip=(ev,fallback)=>{ const list=snips().filter(sn=>sn.type==="event"&&sn.ev===ev&&sn.nodes?.start&&(!sn.period||sn.period===periodNow())&&reqOk(sn));
  if(!list.length) return fallback; const fresh=list.filter(sn=>S.seen[sn.code]==null), sn=pickW(fresh.length?fresh:list);
  return {...sn,who:sn.who?.length?sn.who:M.map(m=>m.id),member:sn.member||"ys"} };
window.eventLines=(ev,fallback)=>{ const sn=window.eventSnip(ev,null); if(!sn) return fallback; S.seen[sn.code]=S.day;
  const L=(fillVars(sn).nodes.start.L||[]).filter(l=>l[0]&&byId(l[0])).slice(0,5); return L.length?L:fallback };
function stageOk(sn){if(PAIR_TYPES.includes(sn.type)) return true; if(!sn.stage||sn.stage==="*") return true; const id=sn.member||sn.who[0], cur=stageOf(id);
  const R=window.STAGE_RANK||[], deep=R.indexOf("戀人");
  if(sn.stage==="多人親密") return cur==="多人親密"&&(sn.who||[]).filter(x=>x!==id).every(x=>(window.multiPartners?.(id)||[]).includes(x));
  if(R.indexOf(sn.stage)>=deep&&R.indexOf(cur)>=R.indexOf(sn.stage)) return true;
  return sn.stage===cur}
function pool({sp,room,slot,present,types,member}){
  return snips().filter(sn=>sn.at===sp&&(!sn.room||sn.room===room)&&types.includes(sn.type)&&(!sn.sl?.length||sn.sl.includes(slot))&&sn.who?.length
    &&sn.who.every(id=>present.includes(id))&&(!member||(sn.member||sn.who[0])===member)&&stageOk(sn)&&reqOk(sn)&&arcOk(sn)&&(!sn.period||sn.period===periodNow())&&(!sn.wx||sn.wx===wxNow())
    &&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||4))&&sn.nodes?.start)}
/* 近況片段(有出場條件)只在情境成立時出現,出現時權重 ×3;連續劇情的下一段 ×4,讓故事接得上 */
function pickW(list,r=Math.random){if(!list.length) return null; const w=list.map(sn=>(sn.w||3)*(S.seen[sn.code]==null?2:1)*(sn.req?3:1)*(+sn.part>1&&S.seen[sn.code]==null?4:1)); let x=r()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<list.length;i++){x-=w[i];if(x<=0) return list[i]} return list[list.length-1]}

/* ---------- 衣櫃 ---------- */
const CAT={練習:"練習",居家:"日常・居家",外出:"日常・外出",睡衣:"日常・睡衣"};
/* 這位成員可以換穿的日常服:造型室裡已經做好換臉立繪(sprites)的造型。舊分類「日常」當成外出服 */
function wardrobe(mid){
  const slot=Object.keys(WMEM).find(k=>WMEM[k]===mid);
  return Object.values(ITEMS).filter(l=>l&&!l.deleted&&slot&&l.members?.[slot]?.sprites)
    .map(l=>({m:mid,id:l.code,look:l.code,name:l.name,occ:l.occasion==="日常"?"日常・外出":l.occasion,seasons:l.seasons||[]}))}
function ensureWear(force){
  if(S.wear&&S.wear.day===S.day&&!force) return;
  const season=seasonOf(dateOf(S.day)), r=rng(seedOf(S.day,"wear")), w={day:S.day,m:{}};
  for(const m of M){w.m[m.id]={}; const ward=wardrobe(m.id);
    for(const [k,occ] of Object.entries(CAT)){let c=ward.filter(o=>o.occ===occ&&(!o.seasons.length||o.seasons.includes(season)));
      const last=S.lastWear?.[m.id]?.[k]; if(c.length>1) c=c.filter(o=>o.id!==last);
      w.m[m.id][k]=c.length?c[Math.floor(r()*c.length)].id:null}}
  if(S.wear&&S.wear.day!==S.day) S.lastWear=S.wear.m;
  S.wear=w}
function outfitAt(mid,room,slot){ensureWear(); const g=PL[room]?.g, wm=S.wear.m[mid]||{};
  if(g==="公司大樓"||g==="製作中心") return wm.練習||null; if(g==="宿舍") return (slot===4&&wm.睡衣)||wm.居家||null; return wm.外出||null}
const outfitName=(mid,id)=>id?(ITEMS[id]?.name||id):"白 T(基本服裝)";
/* 以前處理的換衣立繪沒有「累」「驚訝」:用最接近的表情代替(不用重新處理) */
const EXPR_FB={tired:["sad","neutral"],surprise:["shy","smile","neutral"],pout:["shy","smile","neutral"],moved:["sad","smile","neutral"],serious:["neutral"],wink:["laugh","smile","neutral"]};
function spr(mid,outfit,e){const f=byId(mid).f, ex=EXPR.includes(e)?e:"neutral";
  if(outfit){ // 造型室處理好的換衣立繪(DYN);還沒載入好時先穿白 T
    const d=window.DYN?.[outfit+"@"+mid]; if(d) return d[ex]||(EXPR_FB[ex]||[]).map(k=>d[k]).find(Boolean)||d.neutral; window.needDyn&&needDyn(outfit,mid) }
  return `assets/chara/${f}_${ex}.webp`}
function preload(mid,outfit){for(const e of EXPR){const i=new Image();i.src=spr(mid,outfit,e)}}

/* 劇本沒有標表情時,從台詞推測 */
function guessExpr(t){t=String(t||"");
  if(/眨眼|眨了眨|是秘密喔|保密喔|偷偷告訴你/.test(t)) return "wink";
  if(/眼眶|紅了眼|哽咽|含淚|淚光|感動|謝謝你一直|謝謝你們一直/.test(t)) return "moved";
  if(/嘟嘴|鼓起臉|撒嬌|陪我嘛|好不好嘛|拜託嘛/.test(t)) return "pout";
  if(/我決定了|我會做到|說好了|我是認真/.test(t)) return "serious";
  if(/哈哈|噗|笑到|笑出聲|笑翻|嘻嘻|呵呵|大笑|笑得停不/.test(t)) return "laugh";
  if(/咦|欸[??!!]{2}|真的嗎[??]|什麼[??!!]|嚇我|嚇死|天啊|不會吧|怎麼可能/.test(t)) return "surprise";
  if(/(臉|耳朵|耳根|臉頰).{0,3}紅|害羞|捂住臉|擋住臉|結巴|欸[??][!!]|([^\s、,,。])、\2/.test(t)) return "shy";
  if(/閉嘴|煩死|生氣|可惡|吵死|不要管我|你才|哼/.test(t)) return "angry";
  if(/好累|累死|睏|好想睡|打哈欠|哈欠|撐不住|沒力氣|眼皮/.test(t)) return "tired";
  if(/對不起|抱歉|嗚|難過|想哭|哭了|眼眶|算了……|……我知道|沒事的……/.test(t)) return "sad";
  if(/笑|~|!$|!$|謝謝|太好了|好耶|開心/.test(t)) return "smile";
  return "neutral"}

/* ---------- 亂數 ---------- */
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const seedOf=(...xs)=>xs.reduce((h,x)=>Math.imul(h^(typeof x==="string"?[...x].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7):x),2654435761)>>>0,2166136261);
function pickKey(w,r){const ks=Object.keys(w);let x=r()*ks.reduce((s,k)=>s+w[k],0);for(const k of ks){x-=w[k];if(x<=0)return k}return ks[ks.length-1]}
/* 作息表(改版 1.0 第 3 輪):成員依時間在不同地方(DAILY.SCHED),同一段裡位置固定;每到下一段才換位置。
   邀約的時間點由 life.js 的 lifeWhere 蓋上去(她會在約好的地方等你) */
function blockAt(min=S.min,day=S.day){ const B=dateOf(day).getDay()===0||window.mileHoliday?.(day)?DAILY.SCHED.sun:DAILY.SCHED.wk;   /* 中秋連假照週日 */ let b=B[0], nx=null;
  for(let i=0;i<B.length;i++) if(min>=B[i].at){ b=B[i]; nx=B[i+1]||null } return {b,nx} }
function doingOf(b,id,place,wd){ if(place?.startsWith("外出:")) return place.slice(3); const base=b.wdn?.[wd]||b.n;
  if(b.n==="自主練習"&&/^(living|kitchen|bed_)/.test(place||"")) return b.doing?.[id]==="寫詞"?"寫詞":"休息"; return b.doing?.[id]||base }
function assign(){S.where={}; S.doing={}; const wk=typeof wxNow==="function"?wxNow():"clear", {b}=blockAt(), wd=dateOf(S.day).getDay();
  for(const m of M){ const src=(wk!=="clear"&&b.wet)||b.wd?.[wd]||b.w; let w={...(src[m.id]||src.all||b.w[m.id]||b.w.all||{practice:1})}; const r=rng(seedOf(S.day,b.at,m.id));
    for(const k of Object.keys(w)) if(b.only?.[k]&&!b.only[k].includes(wd)) delete w[k];
    if(wk!=="clear") delete w.river;
    const ok=Object.fromEntries(Object.entries(w).filter(([k])=>k.startsWith("外出")||PL[k==="bedroom"?"bed_"+m.id:k]?.open.includes(S.slot)));
    let w2=pickKey(Object.keys(ok).length?ok:{practice:1},r); if(w2==="bedroom") w2="bed_"+m.id; S.where[m.id]=w2; S.doing[m.id]=doingOf(b,m.id,w2,wd) }
  window.lifeWhere?.(); window.nightWhere?.(); window.mileWhere?.(); window.ovhWhere?.(); S.whereKey=whereKey() }   // 成員之間(ovh.js)
const whereKey=()=>blockAt().b.at+"|"+(window.lifeInvOn?.()?1:0)+"|"+(window.nightKey?.()||"");   // 深夜事件(night.js)開始、結束也換位置
let FIG_FADE=false;

const stageOf=id=>window.stageOfXp?stageOfXp(id):"戒備";
const STAGE_C={戒備:"#8C7E92",信任:"#C99A2E",夥伴:"#3E9B6B",心動:"#D4537E",戀人:"#C2185B",親密:"#9C1B4A",多人親密:"#6A1B9A"};
const who=pid=>M.filter(m=>S.where[m.id]===pid);

/* ---------- 主畫面:主地圖與建築剖面 ---------- */
const pausers=new Set(); const paused=()=>pausers.size>0||document.hidden;
function setPause(k,on){on?pausers.add(k):pausers.delete(k);$("#stage").classList.toggle("paused",paused())}
function hm(m=S.min){const x=Math.floor(m)%1440,h=Math.floor(x/60),mm=Math.floor(x%60/10)*10;return `${pad(h)}:${pad(mm)}`}
/* 頂部的日期過了午夜就換成隔天(遊戲的「一天」仍然到清晨 6 點才結束) */
const calDay=()=>S.day+(S.min>=1440?1:0);
const fmtMin=n=>n<60?`${n} 分`:`${Math.floor(n/60)} 小時${n%60?` ${n%60} 分`:""}`;
/* 座標都是畫面百分比(插畫 1600×900) */
const SPOTS=[
  {id:"company",n:"公司大樓",kind:"building",rect:[11.8,10.3,35.4,50.2],pin:[29.5,40],rooms:["practice","studio","office","styling"]},
  {id:"tv",n:"電視台",kind:"locked",rect:[53,10.5,17.5,10.5],pin:[62.5,14],note:"出道後的打歌期開放"},
  {id:"dorm",n:"宿舍",kind:"building",rect:[67.3,27,21.4,33.5],pin:[77.8,28],rooms:["living","kitchen","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"]},
  {id:"store",n:"便利商店",kind:"place",rect:[47.4,52,17.6,19],pin:[56.2,51.5]},
  {id:"river",n:"漢江公園",kind:"place",rect:[44,74,56,26],pin:[76,79]},
  {id:"center",n:"製作中心",kind:"building",rect:[1.8,62.3,20.5,25.2],pin:[12,66],rooms:["planning","meeting","vocal","design","lobby","photo"]}];
/* 剖面圖的房間:r=[左,上,寬,高],feet=腳底高度,h=168 公分的人在畫面上的高度(%) */
const INSIDE={
  company:{n:"公司大樓",sub:"選擇要去的樓層",rooms:[
    {pid:"practice",fl:"4F",n:"練習室",r:[6.4,7.8,88.8,24.4],feet:30.8,h:15.5,fac:"choreo"},
    {pid:"studio",fl:"3F",n:"錄音室",r:[6.4,35.6,86.8,20.4],feet:55.4,h:15.5,xr:[22,60],fac:"recording"},
    {pid:"office",fl:"2F",n:"代表辦公室",r:[6.4,59.4,88.8,17.2],feet:75.6,h:15.5,xr:[40,80]},
    {pid:"styling",fl:"1F",n:"造型室",r:[6.4,78.4,88.8,17.8],feet:93.6,h:15.5,lp:"r",xr:[42,78],fac:"wardrobe"}]},
  /* 製作中心剖面(三層、每層兩間;位置照 center_*.webp 量的) */
  center:{n:"製作中心",sub:"選擇要去的房間",rooms:[
    {pid:"planning",fl:"3F",n:"企劃室",r:[6,7.5,44,23],feet:29.5,h:14,xr:[25,75],fac:"planning"},
    {pid:"meeting",fl:"3F",n:"會議室",r:[50.5,7.5,43.5,23],feet:29.5,h:14,xr:[25,70],fac:"concert"},
    {pid:"vocal",fl:"2F",n:"聲樂室",r:[6,35,44,23],feet:57,h:14,xr:[30,80]},
    {pid:"design",fl:"2F",n:"設計工作室",r:[50.5,35,43.5,23],feet:57,h:14,xr:[20,60],fac:"design"},
    {pid:"lobby",fl:"1F",n:"大廳",r:[6,62.5,44,25],feet:86,h:14,xr:[35,85],fac:"records"},
    {pid:"photo",fl:"1F",n:"攝影棚",r:[50.5,62.5,43.5,25],feet:86,h:14,xr:[30,70],fac:"mv"}]},
  dorm:{n:"宿舍",sub:"選擇要去的房間",rooms:[
    {pid:"bed_ys",fl:"2F",n:"藝瑟",r:[5.25,11.1,17.5,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_tr",fl:"2F",n:"泰梨",r:[24.1,11.1,16.5,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_hy",fl:"2F",n:"日和",r:[41.9,11.1,17.6,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_he",fl:"2F",n:"夏恩",r:[61,11.1,16.2,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_hr",fl:"2F",n:"河嵐",r:[78.6,11.1,16.2,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"living",fl:"1F",n:"客廳",r:[5,49.4,48.8,39.6],feet:85,h:22,xr:[30,85]},
    {pid:"kitchen",fl:"1F",n:"廚房",r:[54.4,49.4,40.6,39.6],feet:85,h:22,xr:[15,60]},
    {pid:"roof",fl:"RF",n:"頂樓",r:[50,0.3,30,10.6],feet:8,h:0,noFig:1}]}};   // 名牌放在時間卡右邊(左上被時間卡擋住)   // 頂樓在剖面最上面的屋頂板上,不畫人物,名牌上寫誰在
let view="map";                 // map | company | dorm
const spotOf=pid=>SPOTS.find(s=>s.rooms?.includes(pid))?.id||pid;
const inSpot=sp=>M.filter(m=>{const w=S.where[m.id];return !w.startsWith("外出")&&(spotOf(w)===sp)});
const facesHTML=ms=>!ms.length?"":`<div class="avs">${ms.map(m=>`<span class="face" title="${m.n}" style="--c:${m.c};background-image:url(${spr(m.id,null,"neutral")})"></span>`).join("")}</div>`;
const L=()=>SLOTS[S.slot].light;
/* 季節版場景:春 3–5 月、秋 9–11 月、冬 12–2 月有專屬圖,夏季與還沒有圖的時段用原圖 */
const SEASON_ART={map:["dawn","day","evening","night"],river:["dawn","day","evening","night"],roof:["dawn","day","evening","night"]};
function seasonKey(){const m=dateOf(S.day).getMonth()+1;return m>=3&&m<=5?"spring":m>=9&&m<=11?"autumn":(m===12||m<=2)?"winter":""}
function seasonArt(dir,name,light){const s=seasonKey();return `assets/${dir}/${name}_${light}${s&&(SEASON_ART[name]||[]).includes(light)?"_"+s:""}.webp`}
window.seasonKey=seasonKey;
/* 換圖:同一棟換時段時交叉淡入;換建築(instant)直接換,不會從上一棟的圖淡過去。淡入中再換圖會取消前一次 */
const ART_T={};
function setArt(id,url,instant){const a=$("#"+id),b=$("#"+id+"2"),cur=a.dataset.u; if(cur===url&&!ART_T[id]) return; clearTimeout(ART_T[id]); ART_T[id]=0;
  if(!cur||instant){a.style.backgroundImage=`url(${url})`;a.dataset.u=url;b.style.backgroundImage=`url(${url})`;b.classList.add("next");return}
  b.style.backgroundImage=`url(${url})`;b.classList.remove("next");ART_T[id]=setTimeout(()=>{ART_T[id]=0;a.style.backgroundImage=`url(${url})`;a.dataset.u=url;b.classList.add("next")},1250)}

/* 場景圖預先解碼:進建築、進房間時不會先黑一下(手機上解碼大圖較慢)。閒置時逐張處理,這個時段和下一個時段都先備好 */
const WARMED=new Set(); let warmQ=[], warming=false, warmKey="";
/* 2026-10-27 速度優化:標題畫面(含開場動畫)時先不做,讓開場的圖先解;只備好這個時段的建築與房間、下個時段的建築(以前兩個時段全部 40 張,解碼快取放不下,前面解的又被擠掉) */
function warmArt(){ if(document.getElementById("title")) return; const key=S.day+"|"+S.slot; if(key===warmKey) return; warmKey=key;
  const l0=SLOTS[S.slot].light, l1=SLOTS[Math.min(S.slot+1,SLOTS.length-1)].light;
  const rooms=["practice","studio","office","styling","living","kitchen","store","river","bed_ys","bed_tr","bed_hy","bed_he","bed_hr","vocal","lobby","photo"];
  warmQ=[]; for(const k of ["company","dorm","center","map"]) warmQ.push(seasonArt("scene",k,l0));
  for(const r of rooms) warmQ.push(seasonArt("bg",r,l0));
  if(l1!==l0) for(const k of ["map","company","dorm","center"]) warmQ.push(seasonArt("scene",k,l1));
  warmQ=warmQ.filter(u=>!WARMED.has(u)); if(!warming) warmNext() }
function warmNext(){ const u=warmQ.shift(); if(!u){warming=false;return} warming=true; WARMED.add(u);
  const go=()=>{ const i=new Image(); i.src=u; (i.decode?i.decode():Promise.resolve()).catch(()=>{}).finally(()=>setTimeout(warmNext,120)) };
  window.requestIdleCallback?requestIdleCallback(go,{timeout:2000}):setTimeout(go,200) }
/* 頂部列每一格畫面都會呼叫:只在數值真的改變時才寫進畫面(每格都重寫會讓玻璃面板一直重畫,手機很耗電、很卡) */
const HUDC={};
function hudSet(id,v,prop="textContent"){ const k=id+prop; if(HUDC[k]===v) return; HUDC[k]=v; const e=document.getElementById(id); if(e) e[prop]=v }
function renderHud(){const d=dateOf(calDay()); warmArt();
  hudSet("date",`${pad(d.getMonth()+1)}.${pad(d.getDate())}`); hudSet("wday",`${d.getFullYear()}・${WD[d.getDay()]}`); hudSet("dayN",window.debutText?debutText():`第 ${S.day+1} 天`);
  hudSet("slotName",SLOTS[S.slot].n); if(!TFX_RUN) hudSet("hm",hm());
  const sl=SLOTS[S.slot], pct=Math.round(200*clamp((S.min-sl.from)/(sl.to-sl.from),0,1))/2, segKey=S.slot+"|"+pct;
  if(HUDC.seg!==segKey){ HUDC.seg=segKey; [...$("#segs").children].forEach((e,i)=>{const c=i<S.slot?"done":i===S.slot?"on":""; if(e.className!==c) e.className=c; e.firstChild.style.transform=`scaleX(${i===S.slot?pct/100:0})`}) }
  hudSet("badge",String(S.unread||""))}

function renderWorld(){
  setArt("worldArt",seasonArt("scene","map",L()));
  $("#worldHot").innerHTML=SPOTS.map(sp=>{
    const [x,y,w,h]=sp.rect, ppl=sp.kind==="locked"?[]:sp.kind==="place"?who(sp.id):inSpot(sp.id);
    const open=sp.kind==="building"?sp.rooms.some(r=>PL[r].open.includes(S.slot)):sp.kind==="place"?PL[sp.id].open.includes(S.slot):false;
    const done=false;
    const sub=sp.kind==="locked"?(sp.id==="tv"&&window.promoActive?.()?`<span class="sub">打歌期進行中</span>`:`<span class="lock">🔒 ${sp.id==="tv"&&S.day>=(window.DEBUT_DAY||1e9)?"宣傳期外":sp.note}</span>`):sp.kind==="place"?(!open?openText(PL[sp.id]):ppl.length?`${ppl.length} 人在這裡`:"沒有認識的人")
      :(!open?"現在沒有開放的房間":ppl.length?`${ppl.length} 人在裡面`:"沒有人");
    const dis=sp.kind==="place"&&!open;
    const label=`${sp.n},${sub.replace(/<[^>]+>/g,"")}`;
    const why=dis?openText(PL[sp.id]):"";
    return `<button class="hot${dis?" dis":""}" data-spot="${sp.id}" data-why="${why}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" ${dis?'aria-disabled="true"':""} aria-label="${label}"></button>
      <button class="pin${sp.kind==="locked"?" locked":""}${done?" done":""}${dis?" dis":""}" data-spot="${sp.id}" data-why="${why}" style="left:${sp.pin[0]}%;top:${sp.pin[1]}%" tabindex="-1" aria-hidden="true">
        <span class="plate"><b>${sp.n}</b><small>${sub}</small>${sp.kind==="locked"?"":facesHTML(ppl)}</span></button>`}).join("");
  $("#worldHot").querySelectorAll("[data-spot]").forEach(b=>{const id=b.dataset.spot,pair=$("#worldHot").querySelectorAll(`[data-spot="${id}"]`);
    b.onmouseenter=()=>pair.forEach(x=>x.classList.add("lit")); b.onmouseleave=()=>pair.forEach(x=>x.classList.remove("lit"));
    b.onclick=()=>{ if(b.dataset.why){toast2(`${SPOTS.find(x=>x.id===id).n}:${b.dataset.why}`);return} openSpot(id)}})}
function openSpot(id){const sp=SPOTS.find(s=>s.id===id); if(!sp) return;
  if(sp.kind==="locked"){ if(sp.id==="tv"){ if(window.promoActive?.()) openStageRoom(); else tvChooser(); return} toast2(`${sp.n}:${sp.note}`);return}
  if(sp.kind==="place"){visit(sp.id);return}
  enter(sp.id)}
let exitT=0, lastInside=null;
function enter(b){clearTimeout(exitT); const sp=SPOTS.find(s=>s.id===b);
  const w=$("#world"); w.style.transformOrigin=`${sp.rect[0]+sp.rect[2]/2}% ${sp.rect[1]+sp.rect[3]/2}%`; w.classList.add("zoom");
  view=b; renderInside(); renderNews(); const i=$("#inside"); i.classList.add("enter"); i.classList.remove("hide"); requestAnimationFrame(()=>requestAnimationFrame(()=>i.classList.remove("enter")));
  renderWhere()}
function exitToMap(){const i=$("#inside"); i.classList.add("enter"); clearTimeout(exitT); exitT=setTimeout(()=>{i.classList.add("hide");i.classList.remove("enter")},350);
  view="map"; renderWorld(); $("#world").classList.remove("zoom"); renderWhere(); renderNews()}
function renderInside(){if(view==="map") return; const B=INSIDE[view];
  setArt("insideArt",`assets/scene/${view}_${L()}.webp`,lastInside!==view); lastInside=view;
  $("#rooms").innerHTML=B.rooms.map((rm,ri)=>{
    const p=PL[rm.pid], open=p.open.includes(S.slot), vis=false;
    const ppl=open?who(rm.pid):[];
    const dis=!open, [x,y,w,h]=rm.r;
    const own=p.owner, st0=p.facOnly?FACN[rm.fac]?.[1]||"":!open?openText(p):own?(ppl.some(m=>m.id===own)?(ppl.length>1?ppl.map(m=>m.n).join("、"):"在房間"):ppl.length?ppl.map(m=>m.n).join("、")+"在這裡":"不在"):ppl.length?ppl.map(m=>m.n).join("、"):"沒有人";
    const oc0=open&&!p.facOnly?window.ovhAt?.(rm.pid):null, st=oc0?`${byId(oc0.a).n}、${byId(oc0.b).n}・在聊天`:st0;
    const xr=rm.xr||[18,82], n=ppl.length, r=rng(seedOf(S.day,S.slot,view,ri)); let hits="";
    const oc=open&&!p.facOnly?window.ovhAt?.(rm.pid):null, fpos={};   // 成員之間:兩人在聊天(ovh.js)
    const figs=rm.noFig?"":ppl.map((m,i)=>{const fx=n===1?(xr[0]+xr[1])/2+(r()-.5)*(xr[1]-xr[0])*.5:xr[0]+(xr[1]-xr[0])*i/(n-1);
      const X=x+w*fx/100, H=rm.h*m.cm/168, of=outfitAt(m.id,rm.pid,S.slot); fpos[m.id]=[X,rm.feet-H];
      if(open&&!p.facOnly) hits+=`<button class="fighit" data-meet="${m.id}" data-pid="${rm.pid}" style="left:${X}%;top:${rm.feet-H}%;height:${H}%;width:${(H*.2).toFixed(2)}%" aria-label="${m.n}"></button>`;   // 點成員 → 互動面板(meet.js)
      return `<span class="shadowfoot" style="left:${X}%;top:${rm.feet}%;width:${H*.32}cqw"></span><img class="fig${FIG_FADE?" fadein":""}" alt="${m.n}" src="${spr(m.id,of,"neutral")}" style="left:${X}%;top:${rm.feet-H}%;height:${H}%">`}).join("");
    const ob=oc?((A,B)=>A&&B?`<span class="ovbub" style="left:${((A[0]+B[0])/2).toFixed(2)}%;top:${(Math.min(A[1],B[1])-1.2).toFixed(2)}%;--a:${byId(oc.a).c};--b:${byId(oc.b).c}" aria-hidden="true"><i></i><i></i><i></i></span>`:"")(fpos[oc.a],fpos[oc.b]):"";
    return `${figs}${ob}<button class="room${!open?" closed":""}${vis?" visited":""}${dis&&!rm.fac?" dis":""}${rm.fac?" hasfac":""}" data-pid="${rm.pid}" ${rm.fac?`data-both="${rm.fac}"`:""} style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" ${dis&&!rm.fac?`aria-disabled="true" data-why="${st}"`:""} aria-label="${rm.fl} ${rm.n},${st}${rm.fac?",也可以使用設施":""}">
      <span class="hl"></span><span class="rp${rm.lp==="r"?" r":""}${rm.r[1]<15?" b":""}"><span class="fl">${rm.fl}</span><span><span class="rn">${rm.n}</span><br><span class="rs">${st}</span></span>${rm.noFig&&ppl.length?facesHTML(ppl):""}${rm.noFig&&oc?`<span class="ovbub inplate" style="--a:${byId(oc.a).c};--b:${byId(oc.b).c}" aria-hidden="true"><i></i><i></i><i></i></span>`:""}</span>
      ${!open?`<span class="lockc">${openText(p)}</span>`:""}</button>${hits}`}).join("");
  $("#rooms").querySelectorAll(".room").forEach(b=>b.onclick=()=>{ if(b.dataset.both){ if(PL[b.dataset.pid]?.facOnly){ openFac(b.dataset.both); return } chooser(b.dataset.pid,b.dataset.both);return} const pid=b.dataset.pid;
    if(b.dataset.why){toast2(`${PL[pid]?.n||""}:${b.dataset.why}`);return} if(PL[pid]) visit(pid)});
  $("#rooms").querySelectorAll(".fighit").forEach(b=>b.onclick=e=>{ e.stopPropagation(); window.meetOpen?.(b.dataset.meet,b.dataset.pid) }) }
/* 電視台:宣傳期直接進待機室,其他時間是練習模式 */
function tvChooser(){
  let el=$("#chooser"); if(!el){el=document.createElement("div");el.id="chooser";el.className="chooser";$("#stage").appendChild(el)}
  const after=S.day>=(window.DEBUT_DAY||1e9);
  el.innerHTML=`<div class="chbox"><h3>電視台</h3><p class="chnote">${after?"現在不是宣傳期。到 2F 企劃室決定下一次的回歸日。":`出道後的打歌期才會正式開放(${window.debutText?debutText():""})。`}</p>
    <button class="chbtn pri" data-ch="tv"><b>練習模式:進入待機室</b><small>模擬打歌,不影響正式宣傳期・不花時間,打開時時間暫停</small></button>
    <button class="chx" data-ch="x">取消</button></div>`;
  el.classList.add("on"); el.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{el.classList.remove("on"); if(b.dataset.ch==="tv") window.openStageRoom&&openStageRoom()});
  el.onclick=e=>{if(e.target===el) el.classList.remove("on")};
}
/* 有設施又能拜訪的房間:先問要做什麼 */
const FACN={concert:["演唱會企劃板","演唱會的日期、場館、歌單與造型"],design:["設計桌","委託設計、生圖、成員底模"],records:["獎盃牆","一位、得獎、粉絲、演唱會的紀錄"],mv:["MV 試映","每首歌的 MV(AI 影片或動態 MV)"],choreo:["編舞板","每首歌的隊形、動作、焦點與練習"],planning:["企劃桌","歌曲企劃、發行計畫"],recording:["錄音台","逐句分配、錄音評分"],wardrobe:["衣櫃","每套造型與每日穿搭"]};
/* 設施淡入(2026-10-28 速度優化):先把內容排好、背景大圖解好(最多等 0.3 秒),下一格才開始淡入。
   以前是先開始淡入,背景與內容在淡入途中才出來,手機上會頓一下 */
window.facShow=(el,bgUrl)=>{ if(!el) return; const go=()=>requestAnimationFrame(()=>{ void el.offsetWidth; el.classList.remove("hide") });
  if(!bgUrl||!el.classList.contains("hide")) return go();
  const im=new Image(); im.src=bgUrl;
  Promise.race([(im.decode?im.decode():Promise.resolve()).catch(()=>{}),new Promise(r=>setTimeout(r,300))]).then(go) };
/* 各房間的設施(2026-10-27 公司重新規畫:每間房只開自己的功能) */
function openFac(fac){ if(fac==="wardrobe"||fac==="design") window.openFacility?.("wardrobe",fac==="design"?"design":"styling");
  else if(fac==="records") window.openRecords?.(); else if(fac==="mv") window.openMVRoom?.(); else window.openSongFacility?.(fac) }
function chooser(pid,fac){
  let el=$("#chooser"); if(!el){el=document.createElement("div");el.id="chooser";el.className="chooser";$("#stage").appendChild(el)}
  const p=PL[pid], open=p.open.includes(S.slot), ppl=who(pid), canVisit=open;
  el.innerHTML=`<div class="chbox"><h3>${p.n}</h3>
    <button class="chbtn pri" data-ch="fac"><b>使用${FACN[fac][0]}</b><small>${FACN[fac][1]}・打開時時間暫停</small></button>
    <button class="chbtn" data-ch="visit" ${canVisit?"":"disabled"}><b>${pid==="office"?"在辦公室找成員":"跟在場的成員聊天"}</b><small>${!open?openText(p):pid==="office"?"可以請在公司的成員過來・聊天約 15~30 分鐘":ppl.length?`${ppl.map(m=>m.n).join("、")}在這裡・聊天約 15~30 分鐘`:"現在沒有人"}</small></button>
    <button class="chx" data-ch="x">取消</button></div>`;
  el.classList.add("on");
  el.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{el.classList.remove("on"); const c=b.dataset.ch;
    if(c==="fac") openFac(fac); else if(c==="visit") visit(pid)});
  el.onclick=e=>{if(e.target===el) el.classList.remove("on")};
}
function renderWhere(){
  $("#where").innerHTML=view==="map"?"":`<button class="back" id="backBtn"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>地圖</button><div class="btitle"><b>${INSIDE[view].n}</b><span>${INSIDE[view].sub}</span></div>`;
  $("#backBtn")&&($("#backBtn").onclick=exitToMap)}
function renderNews(){const n=$("#news");
  if(view!=="map"||!S.absent.length||S.newsSeen===S.day*5+S.slot){n.classList.add("hide");return}
  n.innerHTML=`<h3>你不在場時<button id="newsX">知道了</button></h3>${S.absent.map(a=>`<p>${a}</p>`).join("")}`; n.classList.remove("hide");
  $("#newsX").onclick=()=>{S.newsSeen=S.day*5+S.slot;save();n.classList.add("hide")}}
function locText(m){const w=S.where[m.id];return w.startsWith("外出")?`外出中<b>(${w.slice(3)})</b>`:`在<b>${spotOf(w)==="company"?"公司・":spotOf(w)==="dorm"?"宿舍・":""}${PL[w].n}</b>`}
function renderDrawer(){
  $("#drawerBody").innerHTML=M.map(m=>{const s=S.m[m.id],st=stageOf(m.id),w=S.where[m.id],of=w.startsWith("外出")?outfitAt(m.id,"store",S.slot):outfitAt(m.id,w,S.slot);
    return `<div class="mcard" data-m="${m.id}" style="--c:${m.c}"><span class="face" style="background-image:url(${spr(m.id,null,"neutral")})"></span>
      <div><div class="top"><span class="n">${m.n}</span><span class="st" style="--sc:${STAGE_C[st]}">${st}</span></div>
      <div class="loc">${locText(m)}</div><div class="wear">穿著:${esc(outfitName(m.id,of))}</div>
      <div class="bars"><span>心情</span><div class="bar"><i style="--v:${s.mood}%;--bc:#E8A13C"></i></div><span>壓力</span><div class="bar"><i style="--v:${s.stress}%;--bc:#8C6FD0"></i></div></div>
      ${(()=>{const nx=window.nextStageInfo?.(m.id); return nx?`<div class="rel"><span>距離「${nx.name}」</span><div class="bar"><i style="--v:${Math.round(nx.p*100)}%;--bc:${STAGE_C[nx.name]||m.c}"></i></div>${nx.extra?`<small>${nx.extra}</small>`:""}</div>`:`<div class="rel"><span>關係已經到最深了</span></div>`})()}
      ${S.skill?`<div class="skl">${Object.entries(SKILL_NAMES).filter(([k])=>!(k==="kor"&&S.skill[m.id].kor>=100)).map(([k,n])=>`<span>${n}<b>${Math.round(S.skill[m.id][k])}</b></span>`).join("")}</div>`:""}
      ${S.bond?`<div class="bond">${M.filter(o=>o.id!==m.id).map(o=>({o,v:bondOf(m.id,o.id)})).sort((a,b)=>b.v-a.v).slice(0,2).map(({o,v})=>`<span style="--c:${o.c}">和${o.n}默契 ${Math.round(v)}</span>`).join("")}</div>`:""}</div></div>`}).join("")
    +`<h4>你不在場時</h4>${S.absent.length?S.absent.map(a=>`<p class="ab">${a}</p>`).join(""):`<p class="ab" style="opacity:.7">上個時段沒有特別的事。</p>`}`}
$("#memBtn").onclick=()=>{renderDrawer();$("#drawer").classList.add("on");setPause("drawer",true)};
$("#drawerX").onclick=()=>{$("#drawer").classList.remove("on");setPause("drawer",false)};
function renderAll(){$("#stage").dataset.time=L(); ensureWear(); renderHud(); renderWorld(); renderInside(); FIG_FADE=false; renderWhere(); renderNews(); wxUpdate();
  if($("#drawer").classList.contains("on")) renderDrawer(); save()}
function toast(t,s){const e=$("#toast");$("#toastT").textContent=t;$("#toastS").textContent=s;e.classList.remove("show");void e.offsetWidth;e.classList.add("show")}

/* ---------- 時間 ---------- */
/* 遊戲時鐘:每 0.25 秒走一次(頂部列的數字最快約 0.7 秒才變一次)。以前每一格畫面都跑,A55 的 120Hz 螢幕上一秒 120 次,開著很耗電 */
let last=performance.now();
function tick(){const now=performance.now(), dt=Math.min(1,(now-last)/1000); last=now;
  if(paused()) return; const sl=SLOTS[S.slot];
  S.min+=dt*(sl.to-sl.from)/sl.sec;
  window.nightTick?.(); window.mileTick?.();   // 深夜訊息、里程碑(mile.js)
  if(S.min>=sl.to) passSlots(); else { if(S.whereKey!==whereKey()){ assign(); FIG_FADE=true; renderAll() } renderHud(); if(TFX&&!TFX_RUN) playTimeFx() } }
/* 互動完成時扣遊戲時間(改版 1.0):時鐘往前跳。對話、設施開著時先記著,畫面都關了、時鐘再走的時候才處理跨過的時段,
   頂部的時間「往前轉」到新的時間,旁邊冒出「+20 分」 */
let TFX=null, TFX_RUN=false;
window.spendTime=(min,why)=>{ min=Math.round(+min||0); if(min<=0||V?.test) return 0;
  TFX={from:TFX?TFX.from:S.min,add:(TFX?.add||0)+min,why:why||""}; S.min+=min; S.spent=(S.spent||0)+min;
  if(V){ V.spent=(V.spent||0)+min; vsubSet(min) } save(true); return min };
function playTimeFx(){ const f=TFX; TFX=null; if(!f) return;
  const el=$("#tplus"), hmEl=$("#hm"); if(el&&hmEl){ el.textContent="+"+fmtMin(f.add);   // 放在時間的正下方(時間卡外面,卡片本身會裁切)
    const r=hmEl.getBoundingClientRect(), R=el.parentElement.getBoundingClientRect(); el.style.left=Math.round(r.left-R.left)+"px"; el.style.top=Math.round(($(".tcard")?.getBoundingClientRect().bottom??r.bottom)-R.top+5)+"px";
    if(!RM.matches) el.animate([{opacity:0,translate:"0 35%"},{opacity:1,translate:"0 0",offset:.18},{opacity:1,offset:.78},{opacity:0,translate:"0 -30%"}],{duration:1800,easing:"ease-out"}) }
  if(RM.matches){ renderHud(); return } TFX_RUN=true; const to=S.min, t0=performance.now(), DUR=700;
  const step=()=>{ const k=Math.min(1,(performance.now()-t0)/DUR), m=f.from+(to-f.from)*(1-(1-k)**3); hudSet("hm",hm(Math.min(m,S.min)));
    if(k<1) requestAnimationFrame(step); else { TFX_RUN=false; renderHud() } }; requestAnimationFrame(step) }
/* 跨過時段:一次可能跨好幾段(例如做完一件很久的事),中間的段安靜處理,最後才重畫、存檔、提示 */
function passSlots(){ let n=0; while(S.min>=SLOTS[S.slot].to&&n<10){ slotEnd(); n++ }
  renderAll(); save(true); pushSave(); if(TFX&&!TFX_RUN) playTimeFx();
  toast(SLOTS[S.slot].n,n>1?`時間來到${SLOTS[S.slot].n}`:"進入下一個時段") }
/* 存檔排程(第二輪優化):每 3 秒只記時間(小鍵 kpopGame.t);整份存檔改成閒置時每 30 秒一次(內容庫一萬段時整份 JSON 化+寫入約 20 ms,
   以前每 3 秒一次會讓動畫掉格)。有進度的動作(換時段、拜訪、選擇…)照舊立刻整份存;切到背景、關掉頁面時也整份存 */
function saveT(){ try{ localStorage.setItem("kpopGame.t",JSON.stringify({d:S.day,m:Math.round(S.min*10)/10})) }catch(e){} }
every(3000,()=>{ if(!paused()) saveT() });
every(30000,()=>{ if(!paused()) (window.requestIdleCallback?requestIdleCallback(()=>save(),{timeout:3000}):save()) });
window.addEventListener("pagehide",()=>save());
let hiddenAt=0;
document.addEventListener("visibilitychange",()=>{ $("#stage").classList.toggle("paused",paused()); save();
  if(document.hidden){ hiddenAt=Date.now(); pushSave(); return }
  /* 離開超過 20 秒再回來:看一下雲端有沒有別台裝置的新進度 */
  if(hiddenAt&&Date.now()-hiddenAt>20000&&syAuth()&&syCfg()&&!syBusy&&!syConflict) syGet("game/state").then(async d=>{ if(!d) return;
    const r=await cloudChanged(d); if(r==="adopt"){ ensureWear(true); renderAll(); toast2("已讀取另一台裝置的最新進度(這台原本的進度在存檔備份)") } }).catch(e=>logErr("回到前景",e)) });

function absentReports(r){const out=[];
  for(const p of PLACES){if(S.entered.includes(p.id)) continue; const ppl=who(p.id); if(!ppl.length||r()>.45) continue;
    const ids=ppl.map(m=>m.id), cs=snips().filter(sn=>sn.type==="away"&&sn.at===p.sp&&(!sn.sl?.length||sn.sl.includes(S.slot))&&sn.who?.length&&sn.who.every(id=>ids.includes(id))&&reqOk(sn)&&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||4)));
    const sn=pickW(cs,r);
    if(sn){S.seen[sn.code]=S.day; const f=fillVars(sn), txt=[f.sc,...(f.nodes?.start?.L||[]).filter(l=>l[0]!=="@").map(l=>l[0]?`${byId(l[0])?.n||""}:「${l[1]}」`:l[1])].filter(Boolean).join(" ");
      out.push(`<b>${p.n}</b>:${esc(txt)}`); continue}
    const pool=(ABSENT[baseOf(p.id)]||[]).filter(t=>!t.includes("{b}")||ppl.length>=2); if(!pool.length) continue;
    const t=pool[Math.floor(r()*pool.length)],a=ppl[0],b=ppl[1];
    out.push(`<b>${p.n}</b>:`+esc(t).replace("{a}",`<b style="color:${a.c}">${a.n}</b>`).replace("{b}",b?`<b style="color:${b.c}">${b.n}</b>`:""))}
  return out.slice(0,3)}
function newMessage(r){ window.phoneIncoming?.(r) }   // 訊息、群組、STARLOG 由 phone.js 處理
function slotEnd(){
  const r=rng(seedOf(S.day,S.slot,"end"));
  S.absent=absentReports(r);
  /* 壓力(改版 1.0 第 5 輪):平日上午個人課 +3、下午團體練習 +4(評估日再 +4)、清晨與晚上 +1、睡覺 −6;週日與中秋連假整天往下 */
  const hol=dateOf(S.day).getDay()===0||window.mileHoliday?.(S.day), evalD=window.isEvalDay?.(dateOf(S.day));
  const dS=hol?[-2,-4,-4,-3,-5][S.slot]:[1,3,4+(evalD?4:0),1,-6][S.slot];   /* 一週約打平(平日 +3、週日 −18),評估日多 +4 */
  for(const m of M){const s=S.m[m.id];s.stress=clamp(s.stress+dS,0,100);s.mood=clamp(s.mood+Math.sign((window.moodBase?.(m.id)??60)-s.mood)-(s.stress>=75&&S.slot===2?1:0),0,100)}   // 被冷落時基準點變低(miss.js)
  if(window.growthOnSlotEnd) growthOnSlotEnd();
  window.choreoOnSlotEnd?.(who("practice").map(m=>m.id));   // 待在練習室的成員自己練主打的編舞
  S.slot++; if(S.slot>4){S.slot=0;S.day++;S.min-=1440; wxDaily(); window.missOnDay?.(S.day-1)}
  S.entered=[]; assign(); window.lifeOnSlot?.(); ensureWear(); newMessage(r) }

/* =====================================================================
   拜訪與對話
   ===================================================================== */
let V=null, D=null, typing=null, auto=false, autoT=0, logLines=[];
/* 聊天扣多少遊戲時間:依這段對話裡實際做了幾次選擇(長對話 40~60 分;進房間時撞見的小片段 5~10 分) */
function costMin(sn,cp,kind){ if(sn?.demoLine) return 5; if(sn?.type==="long"||sn?.type==="pairlong") return Math.min(60,40+2*cp);
  if(kind==="entry"&&cp<=2) return cp?10:5; return cp===0?5:cp<=2?15:cp<=5?20:30 }
function vsubSet(add){ const el=$("#vsub"); if(!el) return; el.innerHTML=`${SLOTS[S.slot].n}・${hm()}${add?`<span class="vplus">+${fmtMin(add)}</span>`:""}`;
  const v=el.querySelector(".vplus"); if(v&&!RM.matches) v.animate([{opacity:0,translate:"0 30%"},{opacity:1,translate:"0 0"}],{duration:420,easing:"ease-out"}) }
/* 互動面板的「聊天」:進她在的房間,直接跟她聊(不演進場的小片段) */
window.visitTalk=(pid,id)=>visit(pid,{talk:id});
window.visitAct=(pid,id,k)=>visit(pid,{act:{id,k}});
window.visitMile=(pid,k,who)=>visit(pid,{mile:{k,who}});   // 里程碑(mile.js):在那個地點演   // 日常活動(act.js):兩個人一起到活動的地點
function visit(pid,o={}){
  const p=PL[pid]||(o.mile?{n:{backstage:"Showcase 場地"}[pid]||pid,open:[0,1,2,3,4],g:"外面"}:null); if(!p||(!o.mile&&!p.open.includes(S.slot))||V) return;
  const snap=JSON.stringify(S), first=!S.entered.includes(pid);
  if(first) S.entered.push(pid); save(true); setPause("visit",true);
  const ppl=o.mile?o.mile.who:o.act?[o.act.id]:pid==="office"?[]:who(pid).map(m=>m.id);
  V={pid,room:pid,present:ppl,talked:new Set(o.mile?o.mile.who:o.act?[o.act.id]:[]),summoned:null,snap,spent:0,act:o.act||null,mile:o.mile||null}; logLines=[]; setBack();
  $("#vbg").style.backgroundImage=`url(${seasonArt("bg",pid,SLOTS[S.slot].light)})`;
  $("#vtitle").textContent=p.n; vsubSet(0);
  drawPeople(); $("#visit").classList.add("on"); $("#vopts").innerHTML=""; wxUpdate();
  if(o.mile){ window.milePlay?.(o.mile.k,pid); return }
  if(o.act){ window.actPlay?.(o.act.k,o.act.id,pid); return }
  const ns=window.nightScene?.(pid,o.talk);   // 深夜:她睡不著、偷吃宵夜、在頂樓(night.js)
  if(ns){ V.talked.add(ns.id); setBack(); play(ns.sn,()=>{ ns.done(); menu() }); return }
  if(!o.talk){ const oh=window.ovhScene?.(pid); if(oh){ oh.play(); return } }   // 成員之間:她們在聊天,先旁聽(ovh.js)
  if(o.talk&&ppl.includes(o.talk)){ narr(`你走到${byId(o.talk).n}身邊。`); talk(o.talk); return }
  if(pid==="office"){narr(wxLine(pid)+SCN.office); menu(); return}
  const byTime=v=>Array.isArray(v)?(v[S.slot]||v.find(Boolean)):v;
  const wl=wxLine(pid), fsn=firstSnowSnip(ppl);
  if(fsn){ play(fsn,menu,"entry"); return }
  if(!ppl.length){narr(wl+(PL[pid].owner?`${byId(PL[pid].owner).n}不在房間裡。${EMPTY.bedroom.replace("寢室裡沒有人,","")}`:byTime(EMPTY[pid]))); menu(); return}
  const all=first?pool({sp:p.sp,room:pid,slot:S.slot,present:ppl,types:ENTRY}):[], wxs=all.filter(x=>x.wx);   // 進場的小片段:這個時段第一次進來才演
  const sn=pickW(wxs.length&&Math.random()<.75?wxs:all);   // 對應天氣的片段優先
  if(sn) play(wl&&!sn.sc&&!sn.wx?{...sn,sc:wl}:sn,menu,"entry"); else {narr(wl+(PL[pid].owner?`你敲了敲${byId(PL[pid].owner).n}房間的門。`:byTime(SCN[baseOf(pid)]))+(ppl.length===1?`${byId(ppl[0]).n}在這裡。`:`${ppl.map(id=>byId(id).n).join("、")}都在這裡。`)); menu()}
}
/* 在場的人怎麼站(2026-10-29 使用者:多人時不要疊在一起、身體不要被切掉):
   一兩個人站左半邊(右邊留給選項);三個人以上用整個寬度平均分配,人越多立繪越小,相鄰的只重疊到立繪兩側的透明邊;
   這時選項往下移到臉的下面(#visit.crowd),不會蓋到右邊成員的臉 */
function drawPeople(){
  const ids=[...V.present,...(V.summoned?[V.summoned]:[])], n=ids.length, crowd=n>=3, L=crowd?6:8, R=crowd?94:62, BASE=n<=1?120:n===2?104:92;
  const w=Math.min(BASE*.305,(R-L)/Math.max(1,n)*1.25), ch=n<=1?120:Math.round(w/.305);
  const xs=n<=1?[$("#stage").clientWidth<900?36:30]:n===2?[18,46]:ids.map((_,i)=>+(L+(R-L)*(i+.5)/n).toFixed(2));
  $("#visit").classList.toggle("crowd",crowd);
  $("#vppl").innerHTML=ids.map((id,i)=>{const m=byId(id),of=outfitAt(id,V.room,S.slot); preload(id,of);
    return `<img alt="${m.n}" data-id="${id}" data-of="${of||""}" src="${spr(id,of,"neutral")}" style="--ch:${ch}cqw;--ty:-1cqw;--h:${(m.cm/168).toFixed(3)};--x:${xs[i]}%">`}).join("")}
let lastSpk=null;
function setExpr(id,e){ if(id&&id!==lastSpk&&!RM.matches){ const im=imgOf(id); if(im) animPortrait(im,[{translate:"0 .8%"},{translate:"0 0"}],{duration:300,easing:"cubic-bezier(.2,.7,.3,1)"}) } lastSpk=id||lastSpk;
  $("#vppl").querySelectorAll("img").forEach(img=>{const me=img.dataset.id===id; img.classList.toggle("dim",!!id&&!me); img.classList.toggle("on",me);
  if(me){ img.dataset.ex=e; img.dataset.idle=""; swapExpr(img,spr(id,img.dataset.of||null,e)) }})}
/* ---- 立繪的「跟隨層」:換表情時的殘影(ghost)、眨眼疊加層都要跟立繪一起動。
   呼吸動畫對齊同一個相位;往前一步、反應的彈跳、待機換重心這些程式動作也複製過去、之後新加的動作一起套用。
   以前跟隨層停在原地(殘影還會拿錯動畫對齊),立繪一動就錯開 5~6px,看起來是一片殘影 ---- */
function syncFollower(img,el){ const a=img.getAnimations().find(x=>x.animationName==="breathe"), b=el.getAnimations().find(x=>x.animationName==="breathe");
  if(a&&b&&a.currentTime!=null) b.currentTime=a.currentTime;
  for(const y of el.getAnimations()) if(y._src&&y._src.currentTime!=null&&y.playState!=="finished") y.currentTime=y._src.currentTime }
/* 新加的跟隨層要等圖準備好,它的動畫才真正開始(殘影是複製出來的整張立繪,手機上可能晚好幾格);
   在那之前每一格都把時間對齊立繪,開始後再對一次,之後就跟立繪同步前進 */
function followPortrait(img,el){ el.dataset.fid=img.dataset.id||"";
  for(const x of img.getAnimations()){ if(!x.effect||x.playState==="finished"||x instanceof CSSAnimation) continue;
    if(x instanceof CSSTransition&&!(el.tagName==="IMG"&&x.transitionProperty==="filter")) continue;   // 亮度轉場只複製給殘影(疊加層等轉場結束才出現)
    const t=x.effect.getTiming(), y=el.animate(x.effect.getKeyframes(),{duration:t.duration,easing:t.easing,delay:t.delay,fill:t.fill,iterations:t.iterations}); y._src=x }
  syncFollower(img,el); let n=0, after=0;
  const tick=()=>{ if(!el.isConnected||!img.isConnected) return; syncFollower(img,el);
    if(el.getAnimations().some(x=>x.pending)) after=0; else after++;
    if(++n<60&&after<2) requestAnimationFrame(tick) };
  requestAnimationFrame(tick) }
function animPortrait(img,kf,opt){ const x=img.animate(kf,opt), id=img.dataset.id;
  if(id) $("#vppl").querySelectorAll(`[data-fid="${id}"]`).forEach(el=>{ el.animate(kf,opt)._src=x; requestAnimationFrame(()=>{ if(el.isConnected) syncFollower(img,el) }) }) }
function swapExpr(img,src){ // 舊表情留一層殘影淡出,新表情解碼好才換,不會閃一下
  if(img.getAttribute("src")===src) return;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){img.src=src;return}
  const g=img.cloneNode(); g.classList.add("ghost"); g.removeAttribute("data-id"); g.alt=""; const cs=getComputedStyle(img); g.style.animationDuration=cs.animationDuration; g.style.animationDelay=cs.animationDelay; img.parentNode.appendChild(g);
  followPortrait(img,g);
  const pre=new Image(); pre.src=src;
  (pre.decode?pre.decode():Promise.resolve()).catch(()=>{}).then(()=>{img.src=src;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{g.style.opacity=0; setTimeout(()=>g.remove(),280)}))})}
function narr(t){showText("",t,true)}
function menu(){
  D=null; $("#vbox").classList.add("locked"); $("#vbox").classList.remove("wait");
  const opts=[];
  for(const id of V.present) if(!V.talked.has(id)) opts.push(`<button class="vopt" data-talk="${id}">跟${byId(id).n}聊聊<small>約 15~30 分鐘</small></button>`);
  if(V.pid==="office"&&!V.summoned){const inCo=M.filter(m=>["practice","studio"].includes(S.where[m.id]));
    for(const m of inCo) opts.push(`<button class="vopt" data-sum="${m.id}">請${m.n}到辦公室<small>她在${PL[S.where[m.id]].n}</small></button>`)}
  opts.push(`<button class="vopt" id="leave">離開<small>${V.spent?`這次花了 ${fmtMin(V.spent)}`:"回到主畫面"}</small></button>`);
  $("#vopts").innerHTML=opts.join("");
  $("#vopts").querySelectorAll("[data-talk]").forEach(b=>b.onclick=()=>talk(b.dataset.talk));
  $("#vopts").querySelectorAll("[data-sum]").forEach(b=>b.onclick=()=>summon(b.dataset.sum));
  $("#leave").onclick=leave; $("#vopts button")?.focus({preventScroll:true})}
function demoSnip(id){const pool=LINES[id],[t,e]=pool[Math.floor(Math.random()*pool.length)];
  return {code:"demo-line-"+id,type:"topic",who:[id],member:id,nodes:{start:{L:[[id,t,e]],C:[]}},demoLine:true}}
function talk(id){V.talked.add(id); setBack(); const p=PL[V.pid]; S.lastTalk={id,day:S.day};
  const inv=window.lifeInviteScene?.(id,V.pid);   // 真人化:她約你來的,就演約會的片段
  const sn=inv||pickW(pool({sp:p.sp,room:V.pid,slot:S.slot,present:[...V.present,...(V.summoned?[V.summoned]:[])],types:TALK,member:id}))||demoSnip(id);
  if(sn.demoLine){const s=S.m[id];s.trust=clamp(s.trust+1,0,100);s.mood=clamp(s.mood+2,0,100);fx(id,"信任 +1")}
  if(!inv) window.__opener=window.lifeOpener?.(id,sn)||null;   // 真人化:近況、回憶、身體狀態、紀念日的第一句
  window.missSeen?.(id);   // 冷落的心情:有來找她了
  play(sn,()=>{ window.lifeAfterTalk?.(id); menu() },"talk")}
function summon(id){V.summoned=id; V.talked.add(id); setBack(); drawPeople(); S.lastTalk={id,day:S.day};
  const sn=pickW(pool({sp:"office",room:"office",slot:S.slot,present:[id],types:OFFICE,member:id}))||demoSnip(id);
  if(sn.demoLine){const s=S.m[id];s.trust=clamp(s.trust+1,0,100);fx(id,"信任 +1")}
  play(sn,menu,"talk")}
function leave(){if(D) return; stageReset(); $("#visit").classList.remove("on","hear"); $("#visit .vhear")?.remove(); setTimeout(()=>window.missFlush?.(),500); $("#vlog").classList.remove("on"); setPause("visit",false); V=null; stopAuto(); stopSkip();
  renderAll(); schedulePush()}   // 扣掉的時間跨過時段的話,時鐘下一次走的時候處理

/* ---- 眨眼疊加層(2026-10-24 做,2026-10-25 改成只存小塊;說話時嘴巴開合在 2026-10-25 依使用者決定拿掉)----
   每人一張閉眼的眼睛小塊(assets/chara/blink/成員.webp)。之後的新疊加層(例如視線)照同樣方式加部位。
   OVL 記錄小塊在整張表情組(2 倍框 W×H)裡的位置 [x,y,寬,高]。疊加層是一個跟立繪同一個框的 div(同樣的 class、位置與呼吸動畫),
   小塊用背景圖貼回原位。以前是整張立繪大小的透明圖,一張解碼後約 11MB;現在 0.02~0.4MB。讀到舊的整張圖(快取)時照整張貼。
   換衣立繪的臉來自表情組、框也一樣,同一層也適用。眨眼只在平常、微笑、害羞時(大笑本來就閉眼,生氣、難過的眼型差太多) ---- */
const OVL={yeseul:{"W":960,"H":2944,"blink":[364,148,328,176]},taeri:{"W":900,"H":2956,"blink":[192,120,368,248]},hiyori:{"W":866,"H":2922,"blink":[280,160,288,160]},haeun:{"W":932,"H":2972,"blink":[316,172,372,188]},haram:{"W":920,"H":2954,"blink":[280,196,280,200]}};
const OVL_IMG={};
function ovlLoad(key,src){ const im=new Image(); im.src=src; (im.decode?im.decode():Promise.resolve()).then(()=>{OVL_IMG[key]=im}).catch(()=>{}) }
M.forEach(m=>{ ovlLoad(m.f+"|blink",`assets/chara/blink/${m.f}.webp`); });
function ovlMake(img,f,part,cls){ const im=OVL_IMG[f+"|"+part], o0=OVL[f]; if(!im||!o0||!o0[part]) return null;
  const {W,H}=o0, [x,y,w,h]=im.naturalWidth>=W*.98?[0,0,W,H]:o0[part];
  const o=document.createElement("div"), cs=getComputedStyle(img);
  o.className=img.className+" ovl "+cls; o.style.cssText=img.style.cssText; o.setAttribute("aria-hidden","true");
  Object.assign(o.style,{aspectRatio:`${W}/${H}`,backgroundImage:`url("${im.src}")`,backgroundSize:`${w/W*100}% ${h/H*100}%`,
    backgroundPosition:`${w<W?x/(W-w)*100:0}% ${h<H?y/(H-h)*100:0}%`,animationDuration:cs.animationDuration,animationDelay:cs.animationDelay,zIndex:cs.zIndex});
  $("#vppl").appendChild(o);
  followPortrait(img,o);
  return o }
const BLINK_EX=new Set(["neutral","smile"]);   // 閉眼小塊是從平常的臉做的,害羞的臉有紅暈,眨眼會蓋出一塊不同的膚色
const fading=img=>img.getAnimations().some(x=>x instanceof CSSTransition&&x.transitionProperty==="filter"&&x.playState==="running");
function blinkOnce(img){ if(!BLINK_EX.has(img.dataset.ex||"neutral")||$("#vppl .ghost")||fading(img)) return;
  const o=ovlMake(img,byId(img.dataset.id)?.f,"blink","blink"); if(o) setTimeout(()=>o.remove(),120) }
every(200,()=>{ if(!V||document.hidden) return; const now=performance.now();
  $("#vppl").querySelectorAll("img[data-id]").forEach(img=>{
    const t=+img.dataset.nb||0; if(!t){img.dataset.nb=now+1200+Math.random()*3000; return}
    if(now<t) return; blinkOnce(img); if(Math.random()<.18) setTimeout(()=>blinkOnce(img),230);
    img.dataset.nb=now+2600+Math.random()*3800 }) });

/* ---- 返回鍵(右上角):誤點進場景時可以退出。還沒跟成員聊過 → 存檔還原到進來之前,不花時間;聊過之後 → 直接離開 ---- */
function setBack(){ let b=$("#vback"); if(!b){ b=document.createElement("button"); b.id="vback"; b.className="vback"; $("#visit").appendChild(b); b.onclick=backOut }
  const free=V&&!V.test&&V.talked.size===0; b.hidden=!V||!!V.test||!!V.event; b.innerHTML=free?`<span>‹ 返回</span><small>不花時間</small>`:`<span>‹ 離開</span>` }
function backOut(){ if(!V||V.test||V.event) return; const free=V.talked.size===0;
  if(free){ const o=JSON.parse(V.snap); for(const k of Object.keys(S)) if(!(k in o)) delete S[k]; Object.assign(S,o) }
  D=null; clearInterval(typing); typing=null; stopAuto(); stopSkip(); $("#vopts").innerHTML="";
  stageReset(); $("#visit").classList.remove("on"); $("#vlog").classList.remove("on"); setPause("visit",false); V=null; save(true);
  if(free){ toast2("已返回,這次沒有花時間"); TFX=null }
  renderAll(); schedulePush() }

/* ---- 試玩(製作者模式用):不花時間、不改存檔 ---- */
window.testPlay=function(sn,onDone){
  if(V) return; const backup=JSON.stringify({m:S.m,flags:S.flags,seen:S.seen});
  const roomOf={practice:"practice",dorm:"living",studio:"studio",office:"office",styling:"styling",out:"store",phone:"bed_"+((sn.who||[])[0]||"ys")};
  const room=PL[sn.room]?sn.room:sn.at==="phone"?"bed_"+((sn.who||[])[0]||"ys"):(roomOf[sn.at]||"practice");
  if(sn.hear?.length) sn=window.ovhMerge?.(sn)||{...sn,nodes:{start:{L:sn.hear,C:[]}}};   // 1.1 的成員之間(旁聽):旁聽+加入接成一段
  V={pid:room,room,present:(sn.who||[]).filter(id=>byId(id)),talked:new Set(),summoned:null,test:true}; logLines=[]; setBack();
  $("#vbg").style.backgroundImage=`url(${seasonArt("bg",room,SLOTS[S.slot].light)})`; $("#vtitle").textContent="試玩"; $("#vsub").textContent="不花時間,也不會影響存檔";
  drawPeople(); $("#visit").classList.add("on"); setPause("visit",true); $("#vopts").innerHTML="";
  play({...sn,code:"test"},()=>{ const o=JSON.parse(backup); S.m=o.m; S.flags=o.flags; S.seen=o.seen; save();
    $("#vopts").innerHTML=`<button class="vopt" id="testEnd">試玩結束<small>回到製作者模式</small></button>`;
    $("#testEnd").onclick=()=>{ stageReset(); $("#visit").classList.remove("on"); $("#vlog").classList.remove("on"); setPause("visit",false); V=null; stopAuto(); onDone&&onDone() } });
};
/* ---- 對話引擎:劇本工坊的節點格式 {start:{L:[[說話者,台詞,表情?]],C:[{t,s,to,g,next,r,set,mood,stress,heart}]}} ---- */
function play(sn,onEnd,cost){
  sn=fillVars(sn);   // {變數} 換成真正的名稱
  if(window.addBond&&!V?.test&&(sn.who||[]).length>1) addBond(sn.who,sn.type==="friction"?2.5:1.5);
  if(!sn.demoLine&&!String(sn.code).startsWith("demo-line")) S.seen[sn.code]=S.day;
  stageReset();
  D={sn,onEnd,q:[],main:sn.member||sn.who?.[0],opener:window.__opener||null,cost:cost||"",cp:0}; window.__opener=null;
  $("#vopts").innerHTML=""; $("#vbox").classList.remove("locked");
  if(sn.sc) D.q.push({k:"line",id:"",text:sn.sc});
  D.q.push({k:"node",key:"start"}); step()}
function step(){
  if(!D) return; const it=D.q.shift();
  if(!it){const f=D.onEnd, c=D.cost, cp=D.cp, s0=D.sn; D=null; setExpr(null); if(CAM) camReset(false); moodSet("off"); if(c&&V&&!V.test) window.spendTime(costMin(s0,cp,c)); f&&f(); return}
  if(it.k==="node"){const n=D.sn.nodes[it.key]; if(!n){step();return}
    let LL=n.L||[]; if(it.key==="start"&&D.opener){ const o=D.opener; D.opener=null; let k=LL.findIndex(l=>l[0]===D.main); if(k<0) k=LL.length; LL=[...LL.slice(0,k),[D.main,o.t,o.e],...LL.slice(k)] }   // 開場句放在她第一句之前
    for(const l of LL) D.q.push({k:"line",id:l[0]||"",text:l[1],e:l[2]});
    if((n.C||[]).length) D.q.push({k:"choices",C:n.C}); step(); return}
  if(it.k==="line"){ if(it.id==="@"){ const w=stageDir(it.text); if(w) setTimeout(()=>{ if(D) step() },w); else step(); return } showText(it.id,it.text,false,it.e);return}
  if(it.k==="choices"){showChoices(it.C);return}}
/* 閱讀設定(參考 visual-novel 技能):文字速度、Auto 速度;Skip 只快轉看過的台詞(看過的記在這台裝置) */
const RD=(()=>{ try{ return {speed:"normal",auto:"normal",...JSON.parse(localStorage.getItem("kpopGame.read")||"{}")} }catch(e){ return {speed:"normal",auto:"normal"} } })();
const RD_TW={slow:1.6,normal:1,fast:.5}, RD_AU={slow:1.6,normal:1,fast:.55};
let skip=false, readSet=null, readDirty=false;
function readKey(id,t){ let h=2166136261; for(const ch of (D?.sn?.code||"")+"|"+id+"|"+t) h=Math.imul(h^ch.charCodeAt(0),16777619); return (h>>>0).toString(36) }
function readL(){ if(!readSet){ try{ readSet=new Set(JSON.parse(localStorage.getItem("kpopGame.readL")||"[]")) }catch(e){ readSet=new Set() } } return readSet }
function markRead(k){ const R=readL(); if(R.has(k)) return; R.add(k); if(!readDirty){ readDirty=true; setTimeout(()=>{ readDirty=false; try{ localStorage.setItem("kpopGame.readL",JSON.stringify([...readL()].slice(-20000))) }catch(e){window.logErr?.("game",e)} },2000) } }
function stopSkip(){ skip=false; $("#skipBtn")?.setAttribute("aria-pressed","false") }
function showText(id,text,still,e){
  const m=byId(id), me=id==="me";
  $("#vname").innerHTML=me?"代表":m?`${m.n}<i class="en">${m.f.toUpperCase()}</i>`:"旁白"; $("#vname").style.setProperty("--nc",me?"var(--acc)":m?m.c:"#9b8aa0");
  if(m&&$("#vppl").querySelector(`[data-id="${id}"]`)){ const ex=EXPR.includes(e)?e:guessExpr(text); setExpr(id,ex); window.lifeLineMotion?.(id,ex) } else if(!m) setExpr(null);
  $("#vbox").dataset.m=me?"me":m?m.id:"narr";
  logLines.push([me?"代表":m?m.n:"",text]);
  const el=$("#vtext"); el.className="vtext"+(me?" me":""); clearInterval(typing); $("#vbox").classList.remove("wait");
  fitText(el,text);
  if(still){el.textContent=text; typing=null; return}
  const rk=readKey(id,text), seen=readL().has(rk); markRead(rk); if(skip&&!seen) stopSkip();
  if(RD.speed==="instant"||(skip&&seen)){ el.textContent=text; typing=null; $("#vbox").classList.add("wait");
    if(skip) setTimeout(()=>{ if(skip&&D&&!typing&&!$("#vopts .choice")) step() },90); else queueAuto(); return }
  let i=0; const chars=[...String(text)]; el.textContent=""; const slowMul=slowNext?2.6:1; slowNext=false;
  let tk=0;
  const PAUSE=ch=>/[。!?!?]/.test(ch)?300:/[,、;:,;:]/.test(ch)?150:ch==="…"?110:/[—~~]/.test(ch)?120:0;
  const tick=()=>{ i++; el.textContent=chars.slice(0,i).join(""); const ch=chars[i-1]||"";
    const isL=/[\p{L}\p{N}]/u.test(ch); if(isL&&++tk%3===0) blip(id);
    if(i>=chars.length){typing=null;$("#vbox").classList.add("wait");queueAuto();return}
    const nx=chars[i]||"", p=PAUSE(ch)&&!PAUSE(nx)?PAUSE(ch):(ch==="…"?60:0);   // 連續標點只在最後一個停
    typing=setTimeout(tick,Math.round((20+p)*(RD_TW[RD.speed]||1)*(slowMul||1))) };
  typing=setTimeout(tick,20)}
function fitText(el,text){ // 長台詞:先放完整文字量,放不下就逐步縮小字(最小 76%),打字效果不會中途換行跳動
  el.style.fontSize=""; el.textContent=text; const base=parseFloat(getComputedStyle(el).fontSize);
  for(let k=.96;k>=.76&&el.scrollHeight>el.clientHeight+1;k-=.04) el.style.fontSize=(base*k).toFixed(2)+"px";
  el.textContent=""}
function advance(){if(!D||$("#vopts .choice")) return;
  if(typing){clearTimeout(typing);typing=null;const it=logLines[logLines.length-1];$("#vtext").textContent=it?it[1]:"";$("#vbox").classList.add("wait");queueAuto();return}
  clearTimeout(autoT); step()}
$("#vbox").onclick=e=>{if(e.target.closest(".dia")) return; advance()};
document.addEventListener("keydown",e=>{if(!V) return; if(e.key===" "||e.key==="Enter"){if(document.activeElement?.closest?.("#vopts")) return; e.preventDefault(); advance()}
  if(e.key==="Escape"){if($("#vlog").classList.contains("on")) $("#vlog").classList.remove("on"); else if(!D) leave()}});
function showChoices(C){$("#vbox").classList.remove("wait"); stopAutoTimer(); stopSkip();
  $("#vopts").innerHTML=C.map((c,i)=>`<button class="vopt choice" data-c="${i}">${esc(c.t)}${c.s?`<small>${esc(c.s)}</small>`:""}</button>`).join("");
  $("#vopts").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>choose(C[+b.dataset.c])); $("#vopts button")?.focus({preventScroll:true})}
function choose(c){
  $("#vopts").innerHTML=""; if(D) D.cp++; applyChoice(c); reactTo(c);
  D.q=[{k:"line",id:"me",text:c.t}];
  for(const l of c.r||[]) D.q.push({k:"line",id:l[0]||"",text:l[1],e:l[2]});
  if(c.next) D.q.push({k:"node",key:c.next});
  step()}
function applyChoice(c){
  const id=c.to||D?.main; if(!S.m[id]) return;
  const xp=applyGain(id,c,(i,t)=>fx(i,t)); window.lifeRemember?.(id,c,D?.sn,xp);
  if(c.bw&&c.bv&&window.addBond&&byId(c.bw)) addBond([id,c.bw],c.bv);   // 這個選擇讓兩位成員之間的默契改變
  if(xp>0&&V&&(V.room==="practice"||V.room==="studio")) coachGrowth(id,V.room);
  save(!V?.test)}
function fx(id,t){const m=byId(id),e=document.createElement("span");e.style.setProperty("--c",m?.c||"#E85C8A");e.textContent=`${m?.n||""} ${t}`;$("#fx").appendChild(e);setTimeout(()=>e.remove(),2700)}
/* Auto 與 Log */
function queueAuto(){if(!auto||!D) return; clearTimeout(autoT); const n=($("#vtext").textContent||"").length; autoT=setTimeout(()=>{if(auto&&D&&!$("#vopts .choice")) step()},(1100+n*45)*(RD_AU[RD.auto]||1))}
function stopAutoTimer(){clearTimeout(autoT)}
function stopAuto(){auto=false;$("#autoBtn").setAttribute("aria-pressed","false");clearTimeout(autoT)}
$("#autoBtn").onclick=()=>{auto=!auto;$("#autoBtn").setAttribute("aria-pressed",String(auto)); if(auto&&!typing&&D) queueAuto()};
$("#skipBtn").onclick=e=>{ e.stopPropagation(); skip=!skip; $("#skipBtn").setAttribute("aria-pressed",String(skip)); if(skip&&D&&!typing&&!$("#vopts .choice")) step() };
$("#logBtn").onclick=()=>{const L=$("#vlog");L.innerHTML=`<button class="x" id="logX">關閉</button>`+logLines.map(([n,t])=>`<p>${n?`<b>${esc(n)}</b>`:""}${esc(t)}</p>`).join("");L.classList.add("on");L.scrollTop=L.scrollHeight;$("#logX").onclick=()=>L.classList.remove("on")};

/* ---------- 手機 ---------- */
/* 不可捲動的區塊(舞台、面板)不允許被捲走:焦點移到畫面外的按鈕時,瀏覽器會把它捲動,整片畫面就偏掉 */
document.addEventListener("scroll",e=>{ const t=e.target; if(!t||t.nodeType!==1) return; const cs=getComputedStyle(t);
  if(t.scrollLeft&&(cs.overflowX==="hidden"||cs.overflowX==="clip")) t.scrollLeft=0;
  if(t.scrollTop&&(cs.overflowY==="hidden"||cs.overflowY==="clip")) t.scrollTop=0 },true);
$("#phoneBtn").onclick=()=>{ if(window.openPhone) openPhone() };

/* ---------- 選單 ---------- */
const setDlg=$("#setDlg");
$("#menuBtn").onclick=()=>{renderSet(); setPause("menu",true); setDlg.showModal()};
$("#setClose").onclick=()=>setDlg.close();
setDlg.addEventListener("close",()=>setPause("menu",false));
function renderSet(){const c=syCfg(),a=syAuth();
  $("#cfgInfo").textContent=c?`已設定專案:${c.projectId}`:""; $("#cfgBox").classList.toggle("hidden",!!a);
  $("#inBox").classList.toggle("hidden",!!a); $("#outBox").classList.toggle("hidden",!a); $("#who").textContent=a?`已登入:${a.email}`:"";
  $("#verNote").textContent="版本 "+(window.APP_VERSION||"開發版"); renderSources(); renderBak(); renderErr(); renderReproc()}
function renderSources(){if(!$("#srcList")) return;
  const sc=cloudSnips(), lib=sc.length, byType={}; sc.forEach(s=>byType[s.type]=(byType[s.type]||0)+1);
  const items=Object.values(ITEMS), daily=items.filter(l=>l.occasion==="練習"||String(l.occasion).startsWith("日常"));
  $("#srcList").innerHTML=(syAuth()?"":`<li>還沒登入雲端:目前只用這台裝置上的資料。</li>`)
    +`<li>內容庫(劇情片段):${lib?`已收錄 ${lib} 個(${Object.entries(byType).map(([k,v])=>k+" "+v).join("、")})`:"還沒有片段,場景會先用簡短的旁白與台詞"}</li>`
    +`<li>造型室:${items.length?`${items.length} 套造型,其中練習與日常類 ${daily.length} 套`:"還沒有造型"}</li>`;
  const season=seasonOf(dateOf(S.day));
  $("#wardList").innerHTML=M.map(m=>{const w=wardrobe(m.id);return `<li><b style="color:${m.c}">${m.n}</b>:${Object.entries(CAT).map(([k,occ])=>{const n=w.filter(o=>o.occ===occ).length,ns=w.filter(o=>o.occ===occ&&(!o.seasons.length||o.seasons.includes(season))).length;return `${k} ${n}${n?`(${season}天可穿 ${ns})`:""}`}).join("・")}</li>`}).join("")}
$("#cfgSave").onclick=()=>{const t=$("#cfgIn").value; const k=t.match(/apiKey["'\s:]+["']([^"']+)["']/),p=t.match(/projectId["'\s:]+["']([^"']+)["']/);
  if(!k||!p){toast2("找不到 apiKey 或 projectId,請貼上整段 firebaseConfig");return}
  localStorage.setItem(SY_CFG,JSON.stringify({apiKey:k[1],projectId:p[1]})); $("#cfgIn").value=""; renderSet(); toast2("Firebase 設定已儲存")};
$("#signIn").onclick=async()=>{const c=syCfg(); if(!c){toast2("先貼上 Firebase 設定");return} syStatus("登入中…");
  try{const j=await syJSON(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(c.apiKey)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#syEmail").value.trim(),password:$("#syPw").value,returnSecureToken:true})});
    localStorage.setItem(SY_AUTH,JSON.stringify({uid:j.localId,email:j.email,refreshToken:j.refreshToken})); syTok={id:j.idToken,exp:Date.now()+(+j.expiresIn-60)*1000};
    $("#syPw").value=""; renderSet(); syncAll(true,true)}catch(e){syStatus(syMsg(e),true)}};
/* ---------- 雲端用量(2026-10-29 改版 1.0):圖片、劇情、存檔各佔多少(估算,Firestore 免費 1 GiB),以及這台裝置今天的讀寫次數 ---------- */
const GiB=1073741824, fmtB=b=>!b?"0":b>=1048576?(b/1048576).toFixed(b>=104857600?0:1)+" MB":Math.max(1,Math.round(b/1024))+" KB";
let USE_BUSY=false;
/* 圖片分成:生圖原圖、日常立繪、上一版備份、底模與成員設定(2026-10-30,看空間花在哪) */
function blobGroups(){ const R=o=>window.refsOf?refsOf(o):new Set(), g={img:new Set(),spr:new Set(),prev:new Set(),meta:R(WMETA),other:new Set()};
  for(const lk of Object.values(ITEMS)){ if(!lk) continue; for(const m of Object.values(lk.members||{})){ if(!m) continue;
      for(const h of R(m.img)) g.img.add(h); for(const h of R([m.sprites,m.faces])) g.spr.add(h); for(const h of R(m.prev)) g.prev.add(h) }
    const rest={...lk,members:undefined}; for(const h of R(rest)) g.other.add(h) }
  return g }
async function blobUsage(prog){ const refs=new Set((JSON.stringify([Object.values(ITEMS),WMETA]).match(/blob:[0-9a-f]{8,}/g)||[]).map(x=>x.slice(5)));
  const cache=await IDB.get("blobSizes")||{}; let known=0, sum=0, miss=0, i=0, dirty=false;
  for(const h of refs){ i++; let n=cache[h];
    if(n==null){ const s=await IDB.get("blob:"+h); if(typeof s==="string"){ n=s.length; cache[h]=n; dirty=true } }   // 圖片以 base64 文字存在雲端,長度就是位元組數
    if(n!=null){ sum+=n; known++ } else miss++;
    if(i%20===0){ prog?.(i,refs.size); await new Promise(r=>setTimeout(r,0)) } }
  if(dirty) await IDB.set("blobSizes",cache);
  const avg=known?sum/known:350000, G=blobGroups(), sz=s=>{ let b=0; for(const h of s) b+=(cache[h]??avg)+300; return Math.round(b) };
  return {n:refs.size,miss,bytes:Math.round(sum+miss*avg+refs.size*300),avg,cache,groups:{img:[G.img.size,sz(G.img)],spr:[G.spr.size,sz(G.spr)],prev:[G.prev.size,sz(G.prev)],meta:[G.meta.size+G.other.size,sz(new Set([...G.meta,...G.other]))]}} }
async function renderUse(){ const el=$("#usePanel"); if(!el||USE_BUSY) return; USE_BUSY=true; el.classList.remove("hidden"); el.innerHTML=`<p class="hint">計算中…</p>`;
  try{ const sc=window.scriptsUsage?await scriptsUsage():null;
    const img=await blobUsage((i,n)=>{ el.innerHTML=`<p class="hint">計算中…圖片 ${i}/${n}</p>` });
    const ls=k=>(localStorage.getItem(k)||"").length, meta=JSON.stringify(await IDB.get("wmetaRaw")||{}).length;
    const save=new TextEncoder().encode(JSON.stringify(S)).length, other=ls("kpopGame.songs")+ls("kpopGame.stage")+meta;
    const story=sc?(sc.mode==="packs"?sc.packBytes+sc.looseBytes:sc.legacyBytes):0, legacy=sc&&sc.mode==="packs"?sc.legacyBytes:0;
    const total=img.bytes+story+legacy+save+other, pct=total/GiB*100, o=window.syOps?.()||{r:0,w:0,x:0}, N=x=>Number(x||0).toLocaleString("zh-TW");
    el.innerHTML=`<div class="usebar${pct>=85?" hi":""}"><i style="--v:${Math.min(100,pct).toFixed(2)}%"></i></div>
      <p class="usetot"><b>${fmtB(total)}</b> / 1 GiB(${pct<10?pct.toFixed(1):Math.round(pct)}%,估算)</p>
      <ul class="usel"><li><span>圖片(造型、日常立繪、底模)</span><b>${fmtB(img.bytes)}</b><small>${img.n} 張${img.miss?`;其中 ${img.miss} 張不在這台裝置,用平均大小估`:""}</small></li>
      ${[["spr","・日常立繪(表情)"],["img","・生圖原圖"],["prev","・上一版備份"],["meta","・底模與其他"]].map(([k,n])=>`<li class="sub"><span>${n}</span><b>${fmtB(img.groups[k][1])}</b><small>${img.groups[k][0]} 張</small></li>`).join("")}
      <li><span>劇情</span><b>${fmtB(story)}</b><small>${sc?(sc.mode==="packs"?`${N(sc.items)} 段:打包 ${sc.packs} 包、散件 ${sc.loose} 個`:`${N(sc.items)} 段,還沒打包(用電腦版登入、同步一次就會打包)`):"—"}</small></li>
      ${legacy?`<li><span>舊的逐段劇情</span><b>${fmtB(legacy)}</b><small>舊版封存還會用到,先保留</small></li>`:""}
      <li><span>存檔與其他</span><b>${fmtB(save+other)}</b><small>遊戲存檔、歌曲、打歌、成員設定</small></li></ul>
      <p class="hint">這台裝置今天:讀取 ${N(o.r)} 次、寫入 ${N(o.w)} 次、刪除 ${N(o.x)} 次。免費額度每天讀取 5 萬、寫入與刪除各 2 萬(兩台裝置合計,台灣時間下午三、四點重置)。</p>
      <p class="hint">${pct>=85?"快到 1 GiB 了:先用下面的「立繪瘦身」「刪除上一版備份」把空間省下來。":"離 1 GiB 還遠。"}</p>
      ${slimHTML(img)}` ; bindSlim(img) }
  catch(e){ el.innerHTML=`<p class="hint">算不出來:${esc(String(e?.message||e))}</p>`; logErr("雲端用量",e) }
  finally{ USE_BUSY=false } }
/* 省空間(2026-10-30):立繪瘦身(12 張全身 → 1 張全身+11 張臉部小圖)、刪除上一版備份。都要登入,做完自動同步、刪掉雲端的舊圖 */
function slimHTML(img){ const sl=window.slimList?.()||[], pv=window.prevList?.()||[];
  const per=img.groups.spr[0]?img.groups.spr[1]/img.groups.spr[0]:250000, slimSave=Math.round(sl.length*11*per*.9);   /* 實測:臉部小圖約是全身的一成 */
  let pvB=0; for(const [c,s] of pv) for(const h of refsOf(ITEMS[c].members[s].prev)) pvB+=(img.cache[h]??img.avg)+300;
  return `<div class="useact">${sl.length?`<p class="hint">立繪瘦身:${sl.length} 組立繪還是 12 張全身的舊格式。改成 1 張全身+11 張臉部小圖之後,看起來一樣,大約可以省 ${fmtB(slimSave)}。直接用現有的立繪裁,不用重新生圖、不花錢;每組約幾秒,處理時可以繼續玩。</p><div class="row"><button class="b pri" id="slimGo">立繪瘦身(${sl.length} 組)</button></div>`:""}
    ${pv.length?`<p class="hint">上一版備份:${pv.length} 位成員的造型留著重新生圖前的舊圖(可以「回到上一版」),約 ${fmtB(pvB)}。確定不會回去的話可以刪掉。</p><div class="row"><button class="b" id="prevGo">刪除上一版備份(${pv.length} 個)</button></div>`:""}
    <p class="hint" id="slimMsg"></p></div>` }
function bindSlim(img){ const msg=$("#slimMsg");
  const run=async(btn,list,fn,label)=>{ if(!syAuth()||!syCfg()){ toast2("要先登入雲端同步"); return } btn.disabled=true; let ok=0,fail=0;
    for(const [i,[c,s]] of list.entries()){ msg.textContent=`${label}中 ${i+1}/${list.length}…`; try{ await fn(c,s); ok++ }catch(e){ fail++; logErr(label,e) } }
    msg.textContent=`${label}完成:${ok} 個${fail?`,${fail} 個沒成功(之後可以再按一次)`:""}。`; btn.disabled=false; setTimeout(()=>renderUse(),800) };
  const s=$("#slimGo"); if(s) s.onclick=()=>{ const L=slimList(); if(confirm(`把 ${L.length} 組立繪改成瘦身格式?畫面看起來不變,舊的全身表情圖會從雲端刪掉。`)) run(s,L,slimOne,"立繪瘦身") };
  const p=$("#prevGo"); if(p) p.onclick=()=>{ const L=prevList(); if(confirm(`刪除 ${L.length} 個上一版備份?刪掉之後這些造型就不能「回到上一版」。`)) run(p,L,prevDrop,"刪除備份") } }
$("#useBtn")&&($("#useBtn").onclick=()=>{ const el=$("#usePanel"); if(!el.classList.contains("hidden")&&!USE_BUSY){ el.classList.add("hidden"); return } renderUse() });
/* 日常立繪更新(2026-10-27):只有還是舊版處理方式的立繪才提醒;更新完就不再出現 */
async function outdatedSprites(){ const jobs=[]; if(!window.spriteOutdated) return jobs;
  for(const l of Object.values(ITEMS)){ if(!l||l.deleted||!(l.occasion==="練習"||l.occasion==="節日"||String(l.occasion).startsWith("日常"))) continue;
    for(const [slot,o] of Object.entries(l.members||{})) if(o?.img&&WMEM[slot]&&await spriteOutdated(o,l)) jobs.push([l.code,slot]) }
  return jobs }
let REPROC_BUSY=false;
async function renderReproc(){ const row=$("#reprocRow"), note=$("#reprocNote"); if(!row||REPROC_BUSY) return;
  const jobs=await outdatedSprites(); row.hidden=note.hidden=!jobs.length;
  if(jobs.length){ $("#reprocAll").textContent=`更新 ${jobs.length} 張舊版日常立繪`; note.textContent=`立繪處理改版過(手伸出去的姿勢會完整保留、去背與清晰度更好);這 ${jobs.length} 張還是舊的處理方式,按一次就會換成新版(更新過的不會再出現)。` } }
$("#hqcutSel")&&(()=>{ const s=$("#hqcutSel"); try{ s.value=localStorage.getItem("kpopGame.hqcut")||"auto" }catch(e){} s.onchange=()=>{ try{ localStorage.setItem("kpopGame.hqcut",s.value) }catch(e){} toast2(s.value==="off"?"高品質去背已關閉":window.hqCutOn?.()?"之後處理立繪會用高品質去背":"這台裝置目前不會用(自動只在電腦上用)") } })();   // 高品質去背(sprites.js)
$("#reprocAll")&&($("#reprocAll").onclick=async()=>{ const b=$("#reprocAll"); if(!window.processSprites||REPROC_BUSY) return;
  const jobs=await outdatedSprites(); if(!jobs.length){ toast2("日常立繪都是新版了"); renderReproc(); return }
  if(!confirm(`更新 ${jobs.length} 張舊版日常立繪?手機上每張約 5~10 秒,處理時可以繼續玩。`)) return;
  REPROC_BUSY=true; b.disabled=true; let ok=0;
  for(const [i,[code,slot]] of jobs.entries()){ b.textContent=`處理中 ${i+1}/${jobs.length}…`; try{ await processSprites(code,slot); ok++ }catch(e){window.logErr?.("game",e)} }
  REPROC_BUSY=false; b.disabled=false; toast2(`完成:${ok}/${jobs.length} 張已更新`); renderReproc() });
$("#makerBtn").onclick=()=>{setDlg.close(); window.openMaker&&openMaker()};
$("#signOut").onclick=()=>{localStorage.removeItem(SY_AUTH);syTok=null;renderSet();syStatus("");toast2("已登出,本機進度保留")};
$("#syncBtn").onclick=()=>syncAll(true,false);
$("#resetBtn").onclick=()=>{if(!confirm("確定從第一天重新開始?目前的進度會清掉(雲端存檔也會被覆蓋)。"))return;S=fresh();assign();ensureWear();setDlg.close();renderAll();save(true);pushSave();toast("清晨","第 1 天開始")};

/* ---------- 版本更新(跟其他工具相同) ---------- */
const isNative=!!window.Capacitor?.isNativePlatform?.();
let updLatest=null,updLastCheck=0,updDismissed=0;
async function checkUpdate(manual){updLastCheck=Date.now();
  if(!window.PAGES_URL||typeof window.APP_BUILD!=="number"){ if(manual) toast2("開發版不檢查更新"); return }
  try{const r=await fetch(window.PAGES_URL+"version.json?t="+Date.now(),{cache:"no-store"}); if(!r.ok) throw 0; const v=await r.json();
    if(+v.build>window.APP_BUILD){updLatest=v; if(manual||updDismissed!==+v.build) showUpdate(v)} else if(manual) toast2("已經是最新版本")}catch(e){ if(manual) toast2("檢查更新失敗,請確認網路") }}
function showUpdate(v){$("#updInfo").textContent=`目前 ${window.APP_VERSION},最新 ${v.version}。`;$("#updNotes").textContent=v.notes?("更新內容:"+String(v.notes).trim().slice(0,400)):"";
  $("#updHow").textContent=isNative?"按下後會用瀏覽器下載新的安裝檔,下載完點開安裝,進度會保留。":"按下後會重新載入成新版,進度會保留。";$("#updGo").textContent=isNative?"下載新版":"立即更新";
  setPause("upd",true); const d=$("#updDlg");if(!d.open) d.showModal()}
$("#updDlg").addEventListener("close",()=>setPause("upd",false));
$("#updLater").onclick=()=>{updDismissed=+(updLatest?.build||0);$("#updDlg").close()};
$("#updGo").onclick=async()=>{save(); await pushSave();
  if(isNative){const url=window.PAGES_URL+"KPOP-Game.apk?v="+(updLatest?.build||Date.now());const w=window.open(url,"_blank");if(!w) location.href=url;return}
  $("#updGo").disabled=true;$("#updGo").textContent="更新中…";try{const files=["index.html","manifest.webmanifest",...[...document.scripts].map(s=>s.getAttribute("src")).filter(Boolean)];   // 頁面上所有的程式檔,新增檔案也不會漏
    await Promise.all(files.map(u=>fetch(u,{cache:"reload"}).catch(()=>{})))}catch(e){window.logErr?.("game",e)}location.reload()};
$("#updCheck").onclick=()=>checkUpdate(true);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Date.now()-updLastCheck>30*60*1000) checkUpdate(false)});

/* ---------- 啟動 ----------
   等所有程式檔都載入完(DOMContentLoaded)才開始。以前一開始就跑,手機上 IndexedDB 開得快時,growth.js 等還沒載入,
   養成的初始化(growthInit)和雲端同步的掛勾(歌曲、打歌、劇本)會被跳過 */
async function boot(){
  await IDB.open();
  try{ const fb=await IDB.get("saveFallback"); if(fb){ const o=JSON.parse(fb); if(o?.m&&(o.updatedAt||0)>(S.updatedAt||0)){ S=migrate(o); save(); toast2("已接回上次沒存成功的進度") } await IDB.set("saveFallback",null) } }catch(e){window.logErr?.("game",e)}
  SCRIPTS=await IDB.get("scripts")||{}; ITEMS=await IDB.get("items")||{}; WMEM=await IDB.get("wmem")||{}; WMETA=await IDB.get("wmeta")||[];
  await keepV0();
  if(window.growthInit) growthInit();
  if(!Object.keys(S.where).length||Object.values(S.where).includes("bedroom")) assign();
  ensureWear(true); renderAll();
  $("#boot").classList.add("done");
  last=performance.now(); setInterval(()=>{ tick(); runTasks() },250);
  setTimeout(()=>checkUpdate(false),3000);
  titleReady();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
/* 改版 1.0:換成新遊戲時,改版前的存檔另外存一份(IndexedDB 的 saveV0 與「存檔備份」),新遊戲第一次開始時有一張「上任第一天」的卡 */
async function keepV0(){ if(!V0_PENDING) return; const js=V0_PENDING; V0_PENDING=null;
  try{ const cur=await IDB.get("saveV0"); let ok=true; try{ ok=!cur||(JSON.parse(js).updatedAt||0)>=(JSON.parse(cur).updatedAt||0) }catch(e){}
    if(ok) await IDB.set("saveV0",js); await backupTick(js,true,"改版前的舊存檔(2015 年 7 月開始的版本)") }catch(e){ logErr("舊存檔封存",e) }
  if(S.updatedAt===0){ try{ localStorage.setItem(KEY,JSON.stringify(S)) }catch(e){} } }   // 新遊戲先存起來(不算進度,不會蓋掉雲端)
function dayOneCard(){ if(S.flags.day1Card||S.day>0||!window.showCard) return;
  if(paused()||document.querySelector("#welc,.bigev:not(.out),#cgView")){ setTimeout(dayOneCard,800); return }
  S.flags.day1Card=1; save();
  window.showCard({tag:"2016.01.13 ・ DAY 1",bg:"assets/bg/practice_dawn.webp",title:"上任第一天",
    lead:`今天起,你是這家娛樂公司的新任代表。四樓練習室裡,五個練習生在等你——離出道還有整整一年。${S.fromV0?`<span class="cardNote">改版前的存檔已封存(選單 → 存檔備份);衣櫃、內容庫、歌曲企劃和回憶照片都留著。</span>`:""}`,cols:true,
    lines:[["ys","代表好!我是隊長徐藝瑟。我們一直在等您。","smile"],["tr","……尹泰梨。","neutral"],["hy","早瀨日和です!啊、不對,我是早瀨日和!請多指教!","laugh"],["he","韓夏恩!代表吃過早餐了嗎?","smile"],["hr","姜河嵐!我、我才來兩個月,可是我唱歌很大聲!","serious"]],ok:"請多指教"}) }
/* ---- 標題畫面(兼讀取畫面):讀完本機資料就能開始,雲端同步在背景進行 ---- */
function titleReady(){
  const el=$("#title"); if(!el) {syncAll(false,true); return}
  setPause("title",true);
  const btn=$("#ttStart"), msg=$("#ttMsg"), sy=$("#ttSync");
  btn.disabled=false; msg.textContent="點擊畫面開始";
  if(syAuth()&&syCfg()){ sy.textContent="正在同步雲端…"; syncAll(false,true).then(()=>{sy.textContent="雲端同步完成"}).catch(()=>{sy.textContent="雲端同步失敗,可稍後在選單重試"}) }
  else sy.textContent="離線遊玩・可在選單登入雲端同步";
  const go=()=>{ if(el.classList.contains("leaving")||el.classList.contains("out")) return;
    setTimeout(dayOneCard,2400);   // 新遊戲:上任第一天的卡(迎接、回憶照片之後)
    if(window.introGo){ try{ window.introGo(el,()=>setPause("title",false)); return }catch(e){window.logErr?.("game",e)} }   // 開場動畫(intro.js):白光一閃、地圖與 HUD 進場
    el.classList.add("out"); setPause("title",false); setTimeout(()=>el.remove(),900) };
  el.onclick=go; btn.onclick=e=>{e.stopPropagation();go()};
}

/* ===== Android 返回鍵 =====
   依序關掉最上層的畫面;都沒有開時,按一下提示、2 秒內再按一次 → 離開遊戲的動畫(intro.js 的 exitGame,存檔與同步做完才關)。
   APK:裝了 Capacitor 的 App 外掛,返回鍵由外掛交給這裡(WebView 不再自己退出,最後用 App.exitApp 關閉)。
   網頁版(與沒有外掛的舊 APK):用瀏覽歷史接返回鍵;晚安字卡出現後不再補上一頁,再按一次就真的離開頁面 */
(function(){
  const vis=e=>e&&e.offsetParent!==null&&!e.closest(".hide");
  const steps=[
    ()=>window.closePhoto?.(),
    ()=>{const d=[...document.querySelectorAll("dialog[open]")].pop(); if(d){d.close(); return true}},
    ()=>window.meetBack?.(),   // 互動面板
    ()=>{const e=document.querySelector("#cgView"); if(e){e.click(); return true}},
    ()=>{const d=document.querySelector("#facDetail"); if(d&&!d.classList.contains("hide")){(d.querySelector("#dClose")||d).click(); d.classList.add("hide"); return true}},
    ()=>{const p=document.querySelector("#phone"); if(p&&p.classList.contains("on")){document.querySelector("#pHome")?.click(); return true}},
    ()=>{const l=document.querySelector("#vlog"); if(l&&l.classList.contains("on")){l.classList.remove("on"); return true}},
    ()=>{ if(V&&!V.test){ backOut(); return true } },
    ()=>{const b=[...document.querySelectorAll(".fac-close")].find(vis); if(b){b.click(); return true}},
    ()=>{const d=document.querySelector("#drawer"); if(d&&d.classList.contains("on")){d.classList.remove("on"); setPause("drawer",false); return true}},
  ];
  const closeTop=()=>{ for(const f of steps){ try{ if(f()) return true }catch(e){window.logErr?.("game",e)} } return false };
  let lastBack=0;
  /* 回傳 true = 已處理(網頁版要補回上一頁) */
  const handle=()=>{
    if(window.exitBusy?.()){ window.exitSkip?.(); return false }
    if(window.welcBusy?.()){ window.welcSkip?.(); return true }
    if(window.introBusy?.()){ window.introSkip?.(); return true }
    if(closeTop()){ lastBack=0; return true }
    if(Date.now()-lastBack<2000&&window.exitGame){ lastBack=0; window.exitGame("back"); return false }
    lastBack=Date.now(); toast2("再按一次返回鍵離開遊戲"); return true };
  const App=window.Capacitor?.isNativePlatform?.()?window.Capacitor?.Plugins?.App:null;
  if(App?.addListener){ try{ App.addListener("backButton",()=>{ try{ handle() }catch(e){window.logErr?.("game",e)} }); window.backRepush=()=>{}; return }catch(e){window.logErr?.("game",e)} }
  const push=()=>history.pushState({pgg:1},"");
  push(); window.backRepush=push;
  addEventListener("popstate",()=>{ let again=true; try{ again=handle() }catch(e){window.logErr?.("game",e)} if(again) push() });
})();

/* ===== 天氣(2026-10-24):每天一種,依日期固定(重讀存檔也一樣)=====
   冬天(12~2 月)會下雪或下雨、夏天(6~8 月)梅雨與颱風季雨多、春秋偶爾下雨。
   主地圖與漢江邊畫雨絲或雪花,畫面略帶陰天色調;時間卡顯示天氣小圖示。之後劇情與行程可以讀 weatherOf(S.day) */
function weatherOf(day){ const mo=dateOf(day).getMonth()+1, r=rng(seedOf(day,"wx"))();
  if(mo===12||mo<=2) return r<.26?"snow":r<.36?"rain":"clear";
  if(mo>=6&&mo<=8) return r<.32?"rain":"clear";
  if(mo>=3&&mo<=5) return r<.18?"rain":"clear";
  return r<.14?"rain":"clear" }
window.weatherOf=weatherOf;
const WX_IC={rain:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v7.5a2 2 0 0 1-4 0"/></svg>雨',
  snow:'<svg viewBox="0 0 24 24"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/></svg>雪'};
let WXK="clear", wxRaf=0, wxLast=0;
function wxUpdate(){ WXK=window.WX_FORCE||weatherOf(S.day); $("#stage").dataset.wx=WXK;
  const ic=$("#wxIc"); if(ic){ ic.hidden=WXK==="clear"; ic.innerHTML=WX_IC[WXK]||"" }
  const outdoorVisit=!!(V&&!V.test&&V.pid==="river");
  $("#wxWorld")?.classList.toggle("on",WXK!=="clear");
  $("#wxVisit")?.classList.toggle("on",WXK!=="clear"&&outdoorVisit);
  if(WXK!=="clear"&&!wxRaf){ wxLast=0; wxRaf=requestAnimationFrame(wxFrame) } }
/* 畫面上看得到雨雪嗎:地圖被拜訪畫面、設施、標題或事件卡蓋住時不用畫 */
const WX_COVER=["visit","fac","tv","song","maker","title","concert","bigev","card","eval","cg","photo"];
const wxShown=c=>!!c.offsetParent&&(c.id!=="wxWorld"||(view==="map"&&!WX_COVER.some(k=>pausers.has(k))));
function wxFrame(t){ wxRaf=0; if(WXK==="clear") return;
  const cs=document.hidden?[]:[...document.querySelectorAll("canvas.wx.on")].filter(wxShown);
  if(!cs.length){ wxLast=0; wxRaf=setTimeout(()=>{wxRaf=requestAnimationFrame(wxFrame)},500); return }   // 看不到時每 0.5 秒看一下就好
  const dt=wxLast?Math.min(.05,(t-wxLast)/1000):0; wxLast=t;
  for(const c of cs){
    const dpr=1, w=c.clientWidth, h=c.clientHeight; if(!w||!h) continue;
    if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){ c.width=Math.round(w*dpr); c.height=Math.round(h*dpr); c._p=null }
    const x=c.getContext("2d"), W=c.width, H=c.height, k=w/700;          // k:依舞台大小縮放雨絲長度與速度
    if(!c._p||c._k!==WXK){ c._k=WXK; const n=WXK==="rain"?Math.round(w*h/2400):Math.round(w*h/5200);
      c._p=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,v:.75+Math.random()*.5,s:.6+Math.random()*.8,ph:Math.random()*6.28})) }
    x.clearRect(0,0,W,H);
    if(WXK==="rain"){ /* 陰天色改成 canvas 的 CSS 底色(feel.css),不用每格重塗 */
      x.strokeStyle="rgba(222,232,255,.42)"; x.lineWidth=1.1*dpr; x.beginPath();
      for(const p of c._p){ const sp=1050*k*dpr*p.v, L=22*k*dpr*p.s; p.y+=sp*dt; p.x+=sp*.18*dt;
        if(p.y>H+L){p.y=-L; p.x=Math.random()*W*1.2-W*.1} x.moveTo(p.x,p.y); x.lineTo(p.x-L*.18,p.y-L) } x.stroke() }
    else { x.fillStyle="rgba(255,255,255,.9)";
      for(const p of c._p){ const sp=42*k*dpr*p.v; p.y+=sp*dt; p.ph+=dt*1.4; p.x+=Math.sin(p.ph)*18*k*dpr*dt;
        if(p.y>H+6){p.y=-6; p.x=Math.random()*W} x.globalAlpha=.55+.4*p.s/1.4; x.beginPath(); x.arc(p.x,p.y,(1+p.s*1.6)*k*dpr,0,6.283); x.fill() }
      x.globalAlpha=1 } }
  wxRaf=setTimeout(()=>{wxRaf=requestAnimationFrame(wxFrame)},33) }   // 約每秒 30 格,雨絲已經夠順

/* ===== 天氣劇情(2026-10-24):只在對應天氣出現的內建片段、初雪事件、入場的天氣描寫、成員心情與去處 ===== */
const WX_SNIPS=[
 {code:"wx-rain-he-pajeon",type:"surprise",member:"he",stage:"*",at:"dorm",room:"kitchen",sl:[3,4],who:["he"],wx:"rain",w:14,cd:5,
  sc:"窗外的雨下得正大,廚房裡卻傳來滋滋的煎油聲,空氣裡都是蔥和海鮮的香味。",nodes:{
  start:{L:[["he","代表來得剛好!下雨天就是要吃海鮮煎餅,這是韓國人的規矩喔。","smile"],["he","第一片剛翻面,你要不要幫我試吃?","smile"]],
   C:[{t:"「好啊,我來試吃。」",s:"捧場",to:"he",g:1,r:[["he","怎麼樣怎麼樣?……邊邊要再酥一點對不對,我就知道。","laugh"],["he","下次下雨你也要來喔,我會記住的。","smile"]]},
      {t:"「我來幫妳翻下一片。」",s:"幫忙",to:"he",g:2,next:"b"},
      {t:"「這麼晚吃這個,明天量體重不怕嗎?」",s:"潑冷水",to:"he",g:0,r:[["he","……代表你這個人真的是。","angry"],["he","算了,不給你吃了,哼。","angry"]]}]},
  b:{L:[["","(你接過鍋鏟,手一抖,煎餅在空中轉了半圈,勉強落回鍋裡。)"],["he","哇——好險!剛剛那一下好帥喔,雖然差點掉到地上。","laugh"],["he","……有人一起在廚房的感覺,真好。","shy"]]}}},
 {code:"wx-rain-ys-lyrics",type:"encounter",member:"ys",stage:"*",at:"practice",room:"practice",sl:[1,2,3],who:["ys"],wx:"rain",w:14,cd:5,
  sc:"雨打在練習室的大片玻璃上,藝瑟抱著筆記本坐在窗邊,一邊看雨一邊輕輕哼著什麼。",nodes:{
  start:{L:[["ys","啊,代表。……被你聽到了?","shy"],["ys","下雨天的聲音很適合寫歌詞。我在想,雨停之前能不能寫完一段。","smile"]],
   C:[{t:"「唱給我聽聽看。」",s:"期待",to:"ys",g:2,r:[["","(她清了清喉嚨,用很輕的聲音唱了兩句。窗外的雨好像也跟著慢了下來。)"],["ys","……還沒寫完啦,不准跟別人說。","shy"]]},
      {t:"「那我不吵妳,在旁邊陪妳。」",s:"陪著",to:"ys",g:1,r:[["ys","嗯。……有人在旁邊,好像比較寫得出來。","smile"]]},
      {t:"「練習時間在寫歌詞?」",s:"提醒",to:"ys",g:0,r:[["ys","……我知道啦,隊長也想偷懶一下嘛。","sad"]]}]}}},
 {code:"wx-rain-tr-umbrella",type:"encounter",member:"tr",stage:"*",at:"out",room:"store",sl:[3,4],who:["tr"],wx:"rain",w:14,cd:5,
  sc:"便利商店門口,泰梨抱著手臂站在屋簷下,看著外面越下越大的雨。",nodes:{
  start:{L:[["tr","……看什麼。沒帶傘又不是什麼稀奇的事。","angry"],["tr","等雨小一點就走。","neutral"]],
   C:[{t:"把傘遞給她。「妳先撐回去。」",s:"體貼",to:"tr",g:1,r:[["tr","那你呢?……笨蛋。","angry"],["","(她把傘往你這邊推回來一半。)"],["tr","一起走吧。傘夠大。","shy"]]},
      {t:"撐開傘,往她那邊偏了一點。「走吧,順路。」",s:"共撐",to:"tr",g:2,next:"b"},
      {t:"「那妳慢慢等。」",s:"走人",to:"tr",g:0,r:[["tr","……嗯。","sad"]]}]},
  b:{L:[["","(回宿舍的路上,傘下只剩雨聲。你的肩膀濕了一半。)"],["tr","……你肩膀都濕了。","shy"],["tr","下次……我會記得帶傘的。大概。","smile"]]}}},
 {code:"wx-rain-hr-guitar",type:"chat",member:"hr",stage:"*",at:"dorm",room:"living",sl:[0,3,4],who:["hr"],wx:"rain",w:12,cd:5,
  sc:"客廳裡,河嵐抱著吉他窩在沙發上,跟著窗外的雨聲隨手撥弦。",nodes:{
  start:{L:[["hr","代表!你聽,雨聲跟這個和弦是不是超配?","laugh"],["hr","濟州島下雨的時候,我都會這樣彈一整個下午。","smile"]],
   C:[{t:"「再彈一次給我聽。」",s:"捧場",to:"hr",g:2,r:[["hr","好耶!這次我加唱的喔,認真聽~","laugh"],["","(她的歌聲很乾淨,混在雨聲裡,像是只唱給你一個人聽。)"]]},
      {t:"「想家了嗎?」",s:"關心",to:"hr",g:1,r:[["hr","……有一點點啦。","sad"],["hr","不過現在宿舍也是家了!代表也在啊。","smile"]]},
      {t:"「小聲一點,大家在休息。」",s:"提醒",to:"hr",g:0,r:[["hr","喔……好啦。","sad"]]}]}}},
 {code:"wx-snow-hr-hy",type:"between",member:"hr",stage:"*",at:"dorm",room:"living",sl:[0,1,2,3],who:["hr","hy"],wx:"snow",w:14,cd:5,
  sc:"落地窗外一片白,河嵐整個人貼在玻璃上,日和在旁邊笑著幫她擦掉哈出來的霧氣。",nodes:{
  start:{L:[["hr","下雪了下雪了!代表!我們等一下去打雪仗好不好!","laugh"],["hy","河嵐醬,先把外套穿好喔。……在日本的時候,下雪的早上大家都會一起堆雪人呢。","smile"]],
   C:[{t:"「好,大家一起去。」",s:"一起玩",to:"hr",g:1,r:[["hr","耶——代表最好了!日和歐尼也要來喔!","laugh"],["hy","はい、一緒に!","smile"]]},
      {t:"「日和,教大家堆日本的雪人?」",s:"拜託",to:"hy",g:2,r:[["hy","えっ、我嗎?……好,那我教大家做兩顆球的那種。","shy"],["hr","兩顆球?!那要做五個,一人一個!","laugh"]]},
      {t:"「外面很冷,別感冒了。」",s:"擔心",to:"hr",g:0,r:[["hr","代表好像大人喔……好啦,我會戴圍巾。","sad"]]}]}}},
 {code:"wx-snow-hy-river",type:"encounter",member:"hy",stage:"*",at:"out",room:"river",sl:[3,4],who:["hy"],wx:"snow",w:14,cd:5,
  sc:"漢江邊的路燈下,雪靜靜地落著。日和一個人站在步道上,踮起腳尖輕輕轉了一圈。",nodes:{
  start:{L:[["hy","あ……被看到了。","shy"],["hy","雪落在身上的感覺,好像舞台上灑下來的紙花。忍不住就想跳一下。","smile"]],
   C:[{t:"「再轉一次,我想看。」",s:"欣賞",to:"hy",g:2,r:[["","(她笑了笑,在雪裡轉了一個完整的圈,圍巾跟著揚起來。)"],["hy","……只給代表看的喔。","shy"]]},
      {t:"把自己的圍巾圍到她脖子上。",s:"體貼",to:"hy",g:2,r:[["hy","……暖暖的。ありがとう。","shy"]]},
      {t:"「小心滑倒。」",s:"提醒",to:"hy",g:1,r:[["hy","嗯,我會小心。……代表也是。","smile"]]}]}}}];
/* 初雪:每年冬天第一個下雪天,第一次遇到成員時,跟在場關係最深的那位(到「心動」以上)發生 */
const FIRST_SNOW={
 ys:[[["ys","代表,是初雪耶。","smile"],["ys","韓國有個說法——初雪那天跟誰在一起,那個人的願望就會實現。","shy"],["ys","……所以,我現在要許願了,不准偷聽。","shy"]],
     [{t:"「妳許了什麼願?」",s:"好奇",g:2,r:[["ys","說出來就不靈了啦。……不過,跟你有關。","shy"]]},{t:"「那我也許一個。」",s:"一起",g:2,r:[["ys","嗯。我們的願望,一起實現吧。","smile"]]}]],
 tr:[[["tr","……下雪了。今年的第一場。","neutral"],["tr","聽說初雪那天待在一起的人,會在一起很久。……我隨便說說的。","shy"]],
     [{t:"「那就很久吧。」",s:"認真",g:2,r:[["tr","……你這個人,真的很犯規。","shy"]]},{t:"「妳也會相信這種事?」",s:"逗她",g:1,r:[["tr","吵死了。……不信的話,幹嘛還站在這裡。","angry"]]}]],
 hy:[[["hy","わぁ……初雪!","laugh"],["hy","代表知道韓國的說法嗎?初雪那天在一起的人……","shy"],["hy","……沒、沒什麼!我們去外面看雪吧!","shy"]],
     [{t:"「在一起的人,怎麼樣?」",s:"追問",g:2,r:[["hy","……會一直在一起。說出來好害羞。","shy"]]},{t:"「好,一起去看雪。」",s:"一起",g:1,r:[["hy","うん!代表,手給我,路很滑。","smile"]]}]],
 he:[[["he","代表!初雪!今年的初雪耶!","laugh"],["he","我從小就想,初雪那天要跟特別的人一起看……今年願望實現了。","shy"]],
     [{t:"「特別的人是我嗎?」",s:"確認",g:2,r:[["he","……不然還有誰。笨蛋。","shy"]]},{t:"「那明年也一起看。」",s:"約定",g:2,r:[["he","說好了喔!打勾勾,不能反悔。","smile"]]}]],
 hr:[[["hr","雪!是雪!濟州島很少下這麼大的雪耶!","laugh"],["hr","代表代表,聽說初雪那天跟誰在一起,就會一直……一直……","shy"],["hr","哎唷我不說了啦!","shy"]],
     [{t:"「一直怎麼樣?說完嘛。」",s:"逗她",g:2,r:[["hr","……一直在一起啦!代表好壞!","shy"]]},{t:"摸摸她的頭。「看雪吧。」",s:"溫柔",g:2,r:[["hr","……嗯。今年的初雪,我會記一輩子。","smile"]]}]]};
const wxNow=(day=S.day)=>window.WX_FORCE||weatherOf(day);
const winterKey=day=>{const d=dateOf(day); return d.getMonth()===11?d.getFullYear():d.getFullYear()-1};
function firstSnowSnip(ppl){ if(wxNow()!=="snow"||!ppl.length) return null; const fk="初雪"+winterKey(S.day); if(S.flags[fk]) return null;
  const R=window.STAGE_RANK||[], rk=id=>R.indexOf(stageOf(id));
  const id=[...ppl].sort((a,b)=>rk(b)-rk(a)||((S.m[b].heart||0)-(S.m[a].heart||0)))[0];
  if(!FIRST_SNOW[id]||rk(id)<R.indexOf("心動")) return null;
  S.flags[fk]=1; const [L,C]=FIRST_SNOW[id];
  return {code:"wx-firstsnow-"+id,type:"surprise",member:id,who:[id],sc:"窗外飄起了今年的第一場雪。",nodes:{start:{L,C:C.map(c=>({...c,to:id}))}}} }
/* 入場的天氣描寫 */
const WX_LINES={rain:{in:["窗外下著雨,玻璃上的雨痕一道一道往下滑。","外面的雨聲淅淅瀝瀝,屋裡顯得特別安靜。"],out:["細雨打在傘面上,地面映著路燈的光。","雨絲斜斜地落下來,空氣裡都是潮濕的味道。"]},
  snow:{in:["窗外飄著雪,暖氣讓玻璃起了一層薄霧。","外面在下雪,整個世界安靜得只剩下呼吸聲。"],out:["雪花一片一片落在肩上,呼出的氣都變成白霧。","路燈下的雪閃著光,腳下踩出細細的聲響。"]}};
function wxLine(pid){ const k=wxNow(); if(k==="clear") return ""; const a=WX_LINES[k][PL[pid]?.g==="外面"||pid==="roof"?"out":"in"];   /* 頂樓雖然屬於宿舍,天氣算外面 */ return a[Math.floor(Math.random()*a.length)] }
/* 天氣對心情與去處的影響:藝瑟喜歡雨天寫歌、夏恩雨天想煎餅、泰梨討厭淋濕;日和與河嵐最愛下雪 */
const WX_MOOD={rain:{ys:3,he:2,tr:-2,hr:-1},snow:{hy:4,hr:4,he:2,ys:2,tr:1}};
const WX_WHERE={rain:{tr:{store:1},hr:{living:1}},snow:{hy:{river:2},hr:{living:1}}};
function wxDaily(){ const k=wxNow(); for(const [id,v] of Object.entries(WX_MOOD[k]||{})) if(S.m[id]) S.m[id].mood=clamp(S.m[id].mood+v,0,100) }

/* ===== 存圖與純圖檢視(2026-10-24)=====
   saveImage:APK 裡用原生外掛 ImageSaver 存進手機相簿「完美女團」資料夾(可直接設成桌布);網頁版用一般下載。
   openPhoto:全螢幕只顯示圖片,點一下畫面切換按鈕顯示/隱藏 */
window.saveImage=async(src,name,jpeg,crop)=>{   // crop(寬,高) 回傳 {x,y,w,h,ow,oh}:只存一部分並縮放(例如半身照)
  try{ toast2("正在存圖…");
    const blob=await (await fetch(src)).blob(), bmp=await createImageBitmap(blob), c=document.createElement("canvas");
    const r=crop?crop(bmp.width,bmp.height):{x:0,y:0,w:bmp.width,h:bmp.height,ow:bmp.width,oh:bmp.height};
    c.width=r.ow; c.height=r.oh; const g=c.getContext("2d"); g.imageSmoothingQuality="high"; g.drawImage(bmp,r.x,r.y,r.w,r.h,0,0,r.ow,r.oh); const mime=jpeg?"image/jpeg":"image/png", ext=jpeg?"jpg":"png";
    const out=await new Promise(r=>c.toBlob(r,mime,.95)), file=`${String(name).replace(/[\\/:*?"<>|]/g,"_")}.${ext}`;
    const P=window.Capacitor?.Plugins?.ImageSaver;
    if(P){ const b64=await new Promise(r=>{const f=new FileReader(); f.onload=()=>r(String(f.result).split(",")[1]); f.readAsDataURL(out)});
      await P.save({data:b64,name:file,mime}); toast2("已存到手機相簿的「完美女團」資料夾,可以直接設成桌布"); return true }
    const u=URL.createObjectURL(out), a=document.createElement("a"); a.href=u; a.download=file; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
    toast2("已下載"); return true
  }catch(e){ toast2("存圖失敗:"+(e?.message||e)); return false } };
/* 純圖檢視。opt.mode:"full" 全身照(整張完整顯示,背後鋪同一張的模糊放大;按鈕列出現時圖往上讓位,腳不會被蓋住)
   /"half" 半身照(舞台寬度鋪滿,從頭頂往下取 16:9)。有 mode 時多一顆切換鍵;下載存的就是畫面上看到的那張(半身照輸出 1920×1080) */
const HALF_CROP=(w,h)=>{ const ch=Math.min(h,Math.round(w*9/16)), k=Math.max(1,1920/w); return {x:0,y:0,w,h:ch,ow:Math.round(w*k),oh:Math.round(ch*k)} };
window.openPhoto=(src,name,opt={})=>{
  $("#photoView")?.remove(); const mode=opt.mode==="half"?"half":"full", el=document.createElement("div");
  el.id="photoView"; el.className="photoview "+mode+(opt.dark?" dark":"")+(opt._sw?" noanim":"");
  const label=opt.mode?`<small>${mode==="half"?"半身照":"全身照"}</small>`:"", sw=opt.mode?`<button class="cgb" data-sw>${mode==="half"?"看全身照":"看半身照"}</button>`:"";
  el.innerHTML=`${mode==="full"?`<div class="pvbg" style="background-image:url(${src})"></div>`:""}<img alt="" src="${src}"><div class="pvbar">${opt.title?`<b>${esc(opt.title)}${label}</b>`:"<span></span>"}<div>${sw}<button class="cgb" data-dl>下載・設桌布</button><button class="cgb pri" data-x>關閉</button></div></div>${opt._sw?"":`<p class="pvhint">點一下畫面顯示/隱藏按鈕</p>`}`;
  $("#stage").appendChild(el); setPause("photo",true);
  el.onclick=e=>{ if(!e.target.closest("button")) el.classList.toggle("bare") };
  const file=opt.mode?`${name}_${mode==="half"?"半身":"全身"}`:name;
  el.querySelector("[data-dl]").onclick=()=>saveImage(src,file,opt.jpeg,mode==="half"?HALF_CROP:null);
  el.querySelector("[data-x]").onclick=()=>closePhoto();
  el.querySelector("[data-sw]")?.addEventListener("click",()=>openPhoto(src,name,{...opt,mode:mode==="half"?"full":"half",_sw:true}));
  setTimeout(()=>el.querySelector(".pvhint")?.classList.add("gone"),2200) };
window.closePhoto=()=>{ const el=$("#photoView"); if(!el) return false; el.remove(); setPause("photo",false); return true };

/* ===== 真人化(2026-10-24):即時表情反應、待機小動作、說話提示音 ===== */
var RM=matchMedia("(prefers-reduced-motion:reduce)");
var imgOf=id=>[...$("#vppl").querySelectorAll("img[data-id]")].find(i=>i.dataset.id===id);
/* 選完選項的瞬間:對象先露出反應(好感大=害羞或大笑、普通=微笑、冷淡=難過),身體輕輕一彈或一縮 */
function reactTo(c){ const id=c.to||D?.main; if(!id||!byId(id)||!V) return;
  const R=window.STAGE_RANK||[], deep=R.indexOf(stageOf(id))>=R.indexOf("心動"), g=+c.g||0;
  const e=g>=2?(deep?"shy":"laugh"):g===1?"smile":"sad"; setExpr(id,e);
  const img=imgOf(id); if(img&&!RM.matches) animPortrait(img,g>=1?[{translate:"0 0"},{translate:"0 -1.1%"},{translate:"0 0"}]:[{translate:"0 0"},{translate:"0 .7%"},{translate:"0 0"}],{duration:g>=1?420:520,easing:"ease-out"}) }
/* 待機小動作:沒在說話的成員每隔 7~14 秒偶爾看過來笑一下,或輕輕換個重心 */
every(300,()=>{ if(!V||document.hidden||RM.matches||$("#vppl .ghost")) return; const now=performance.now();
  $("#vppl").querySelectorAll("img[data-id]").forEach(img=>{
    const t=+img.dataset.it||0; if(!t){img.dataset.it=now+5000+Math.random()*6000; return} if(now<t) return;
    img.dataset.it=now+7000+Math.random()*7000;
    const speaking=img.classList.contains("on")&&!$("#vbox").classList.contains("wait");
    if(speaking) return;
    const ex=img.dataset.ex||"neutral";
    const mood=S.m[img.dataset.id]?.mood??60, look=mood<35?"sad":"smile", chance=mood<35?.45:mood>75?.65:.5;
    if(ex==="neutral"&&img.classList.contains("dim")&&Math.random()<chance){     // 心情好:偷看過來笑一下;心情差:嘆口氣
      img.dataset.idle="1"; img.dataset.ex=look; swapExpr(img,spr(img.dataset.id,img.dataset.of||null,look));
      setTimeout(()=>{ if(img.isConnected&&img.dataset.idle==="1"&&img.dataset.ex===look){ img.dataset.idle=""; img.dataset.ex="neutral"; swapExpr(img,spr(img.dataset.id,img.dataset.of||null,"neutral")) } },2200+Math.random()*1200) }
    else animPortrait(img,[{rotate:"0deg"},{rotate:(Math.random()<.5?"-":"")+".55deg"},{rotate:"0deg"}],{duration:1900,easing:"ease-in-out"})   // 換重心
  }) });
/* 回饋分級(參考 game-feel 技能):s 小(只有畫面上的數字跳動)、m 中(輕震+柔光)、l 大(震動節奏+全畫面閃光);設定裡可以關震動 */
window.feedback=lv=>{ if(localStorage.getItem("kpopGame.haptic")!=="0"&&lv!=="s") try{ navigator.vibrate?.(lv==="l"?[40,70,60]:25) }catch(e){window.logErr?.("game",e)}
  if(lv==="s"||RM.matches) return; const f=document.createElement("div"); f.className="fbk "+lv; $("#stage").appendChild(f); setTimeout(()=>f.remove(),lv==="l"?1400:1000) };
(()=>{ const s=$("#rdSpeed"), a=$("#rdAuto"), h=$("#hapOn"), keep=()=>localStorage.setItem("kpopGame.read",JSON.stringify(RD));
  if(s){ s.value=RD.speed; s.onchange=()=>{ RD.speed=s.value; keep() } } if(a){ a.value=RD.auto; a.onchange=()=>{ RD.auto=a.value; keep() } }
  if(h){ h.checked=localStorage.getItem("kpopGame.haptic")!=="0"; h.onchange=()=>{ localStorage.setItem("kpopGame.haptic",h.checked?"1":"0"); if(h.checked) feedback("m") } } })();
/* 選單「存檔備份」 */
/* 改版前(2015 年 7 月開始的版本)的備份不能在新版打開:顯示成「改版前」,按鈕改成下載(到舊版封存打開) */
const bakIsV0=b=>!String(b.json||"").includes('"gen":10');
function v0Date(day){ const d=new Date(START_V0); d.setDate(d.getDate()+(day||0)); return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}` }
function downloadJSON(name,js){ if(isNative){ toast2("手機 App 不能存檔案,請用電腦版下載"); return }
  const u=URL.createObjectURL(new Blob([js],{type:"application/json"})), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000) }
async function renderBak(){ const ul=$("#bakList"); if(!ul) return; const L=(await IDB.get("saveBackups"))||[];
  ul.innerHTML=L.length?L.map((b,i)=>{ const v0=bakIsV0(b); return `<li><span>${new Date(b.t).toLocaleString("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}・遊戲 ${v0?v0Date(b.day)+"(改版前)":(()=>{const d=dateOf(b.day);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`})()}${b.why?`<br><small>${esc(b.why)}</small>`:""}</span>${v0?`<button class="b" data-v0bak="${i}">下載</button>`:`<button class="b" data-bak="${i}">回到這份</button>`}</li>` }).join(""):"<li>還沒有備份(遊玩 30 分鐘後會自動備份)。</li>";
  ul.querySelectorAll("[data-v0bak]").forEach(b=>b.onclick=()=>{ const x=L[+b.dataset.v0bak]; if(x) downloadJSON(`完美女團_改版前存檔_${v0Date(x.day).replace(/\./g,"")}.json`,x.json) });
  const v0=localStorage.getItem("kpopGame.saveV0"), dl=$("#v0Dl"); if(dl){ dl.hidden=!v0; dl.onclick=()=>{ const s=localStorage.getItem("kpopGame.saveV0"); if(s) downloadJSON("完美女團_改版前存檔.json",s) } }
  ul.querySelectorAll("[data-bak]").forEach(b=>b.onclick=async()=>{ const x=L[+b.dataset.bak]; if(!x||!confirm("回到這份備份?目前的進度會被取代(目前的進度會先另外備份一份)。")) return;
    await backupTick(JSON.stringify(S),true); const o=migrate(JSON.parse(x.json)); o.updatedAt=Date.now(); S=o; save(); location.reload() }) }
$("#bakNow")&&($("#bakNow").onclick=async()=>{ await backupTick(JSON.stringify(S),true); toast2("已備份"); renderBak() });
/* 說話提示音:每人不同音高的輕柔短音(設定裡可以關) */
const BLIP_HZ={ys:520,tr:390,hy:690,he:575,hr:770}; let AC=null;
function blip(id){ if(localStorage.getItem("kpopGame.blip")==="0"||!V) return; const f=BLIP_HZ[id]; if(!f) return;
  try{ const A=window.audioCtx?.(); const ac=A?.ctx||(AC=AC||new (window.AudioContext||window.webkitAudioContext)()); if(ac.state==="suspended") ac.resume();   // 走聲音系統的「音效」音量
    const t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain(); o.type="triangle"; o.frequency.value=f*(.96+Math.random()*.08);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+.075);
    o.connect(g); g.connect(A?.sfx||ac.destination); o.start(t); o.stop(t+.09) }catch(e){window.logErr?.("game",e)} }
(()=>{ const b=$("#blipOn"); if(!b) return; b.checked=localStorage.getItem("kpopGame.blip")!=="0";
  b.onchange=()=>{ localStorage.setItem("kpopGame.blip",b.checked?"1":"0"); if(b.checked) blip("hr") } })();


/* ===== 選單「錯誤紀錄」(第二輪優化) ===== */
function renderErr(){ const ul=$("#errList"); if(!ul) return; let L=[]; try{ L=JSON.parse(localStorage.getItem(ERRK)||"[]") }catch(e){window.logErr?.("game",e)}
  ul.innerHTML=L.length?L.slice().reverse().slice(0,20).map(x=>`<li><span>${new Date(x.t).toLocaleString("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}・${esc(x.w)}${x.n>1?` ×${x.n}`:""}<br><small>${esc(x.m)}</small></span></li>`).join(""):"<li>沒有錯誤紀錄。</li>";
  const n=$("#errN"); if(n) n.textContent=L.length?`(${L.length} 筆)`:"" }
$("#errCopy")&&($("#errCopy").onclick=async()=>{ const t=localStorage.getItem(ERRK)||"[]"; toast2(await copyText(`完美女團 錯誤紀錄(版本 ${window.APP_VERSION||"開發版"})\n`+t)?"已複製錯誤紀錄,可以直接貼給 Claude":"複製失敗") });
$("#errClear")&&($("#errClear").onclick=()=>{ if(!confirm("清除錯誤紀錄?")) return; localStorage.removeItem(ERRK); renderErr() });

/* ===== 觸控範圍放大(第二輪優化):手指點在小按鈕旁邊的空白處時,改按 12px 內最近的小按鈕(短邊 <40px);外觀完全不變(只對觸控,滑鼠不變) ===== */
(()=>{ const ACT="button,a[href],input,select,textarea,label,summary,[role=button],[data-go],[data-app],[data-chat]";
  const act=el=>{ for(let e=el;e&&e.nodeType===1&&e!==document.body&&e!==document.documentElement;e=e.parentElement){ if(e.onclick||e.matches(ACT)) return e } return null };
  const OFF=[[0,-12],[0,12],[-12,0],[12,0],[-9,-9],[9,-9],[-9,9],[9,9],[0,-6],[0,6],[-6,0],[6,0]];
  let pend=null;
  document.addEventListener("pointerdown",ev=>{ pend=null; if(ev.pointerType==="mouse"||!ev.isPrimary||act(ev.target)) return;
    const x=ev.clientX,y=ev.clientY; let best=null,bd=1e9;
    for(const [dx,dy] of OFF){ const el=document.elementFromPoint(x+dx,y+dy), a=el&&act(el); if(!a||a.disabled||/^(INPUT|SELECT|TEXTAREA|LABEL)$/.test(a.tagName)) continue;
      const r=a.getBoundingClientRect(); if(Math.min(r.width,r.height)>=40) continue;   // 大的目標(地圖建築、房間、卡片)不需要放大
      const cx=Math.max(r.left,Math.min(x,r.right)), cy=Math.max(r.top,Math.min(y,r.bottom)), d=Math.hypot(cx-x,cy-y);
      if(d<bd){ bd=d; best=a } }
    if(best&&bd<=12) pend={el:best,x,y} },{capture:true,passive:true});
  document.addEventListener("click",ev=>{ const p=pend; pend=null; if(!p||!p.el.isConnected||act(ev.target)) return;
    if(Math.hypot(ev.clientX-p.x,ev.clientY-p.y)>10) return;
    ev.preventDefault(); ev.stopPropagation(); p.el.click() },{capture:true}) })();
