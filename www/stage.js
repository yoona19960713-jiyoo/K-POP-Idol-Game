"use strict";
/* =====================================================================
   待機室(由打歌準備室搬進遊戲)
   打歌計算原封不動取自打歌準備室;遊戲裡衣服不分稀有度,所以拿掉稀有度加分
   主打歌讀企劃室、造型讀造型室;資料是雲端的 users/{uid}/stage/state(與打歌準備室共用)
   ===================================================================== */
(()=>{
const M=[
  {id:"ys",n:"藝瑟",c:"#7B4FBF",vocal:64,dance:62,expr:72},
  {id:"tr",n:"泰梨",c:"#C8102E",vocal:45,dance:74,expr:70},
  {id:"hy",n:"日和",c:"#C9A35E",vocal:48,dance:80,expr:68},
  {id:"he",n:"夏恩",c:"#E9746A",vocal:52,dance:62,expr:76},
  {id:"hr",n:"河嵐",c:"#7FAF2C",vocal:74,dance:55,expr:55},
];
const byId=id=>M.find(m=>m.id===id);
let SONG={name:"出道曲",score:82,killer:"hy",center:"he",target:{sweet:2,pure:0,lively:1,fancy:-2,retro:0},highLines:{hr:2,ys:1}};
const AX=["sweet","pure","lively","fancy","retro"];
let LOOKS=[
  {id:"L1",n:"緋紅童話",g:1,occ:"打歌舞台",r:"SR",a:{sweet:2,pure:0,lively:1,fancy:-2,retro:-1}},
  {id:"L2",n:"黑曜騎士",g:1,occ:"打歌舞台",r:"SSR",a:{sweet:3,pure:1,lively:1,fancy:-3,retro:1}},
  {id:"L3",n:"粉紅泡泡",g:1,occ:"打歌舞台",r:"R",a:{sweet:-3,pure:-2,lively:-2,fancy:-1,retro:0}},
  {id:"L4",n:"白玫瑰告別",g:1,occ:"打歌舞台",r:"SSR",a:{sweet:1,pure:-1,lively:2,fancy:-3,retro:-1}},
  {id:"L5",n:"街頭機能",g:1,occ:"日常",r:"N",a:{sweet:1,pure:0,lively:-1,fancy:2,retro:1}},
  {id:"L6",n:"紫夜禮服",own:"ys",occ:"頒獎典禮",r:"SSR",a:{sweet:2,pure:1,lively:3,fancy:-3,retro:0}},
  {id:"L7",n:"芭蕾紗裙",own:"hy",occ:"打歌舞台",r:"SR",a:{sweet:0,pure:-2,lively:3,fancy:-2,retro:-2}},
  {id:"L8",n:"運動短版",own:"hr",occ:"演唱會",r:"R",a:{sweet:0,pure:1,lively:-3,fancy:1,retro:1}},
];
const SHOWS=[   // c1、c2、en:1.2 第 1 包打歌轉播的節目標誌
  {d:"週二",n:"SHOW PULSE",en:"TUE",c1:"#FF4FA3",c2:"#7B4FBF",w:{digital:.35,sales:.1,views:.2,social:.15,stage:.2}},
  {d:"週三",n:"CHAMPION LIVE",en:"WED",c1:"#F2B33D",c2:"#D9572B",w:{digital:.35,sales:.15,views:.15,social:.1,stage:.25}},
  {d:"週四",n:"COUNTDOWN M",en:"THU",c1:"#3FC9F0",c2:"#3552D9",w:{digital:.45,sales:.15,views:.15,social:.15,stage:.1}},
  {d:"週五",n:"MUSIC VAULT",en:"FRI",c1:"#2FD4A6",c2:"#127A70",w:{digital:.6,sales:.1,views:.1,social:.1,stage:.1}},
  {d:"週六",n:"CORE STAGE",en:"SAT",c1:"#FF5A5A",c2:"#9C1238",w:{digital:.5,sales:.1,views:.1,social:.1,stage:.2}},
  {d:"週日",n:"STAR GAYO",en:"SUN",c1:"#E8C470",c2:"#24306E",w:{digital:.55,sales:.1,views:.15,social:.1,stage:.1}},
];
/* 1.2 第 1 包(2026-11-03):同週對手照世界設定(daily.js WORLD_2016)每週輪換。以前寫死「CARAT NOIR 三代頂流女團」,但它 2016/08 才出道。
   pw 乘在對手的分數上(平均約 1,整體一位數不變);from/to 是活動期間;song 是那年的歌(虛構) */
const RIVALS=[
  {n:"TWINKLE",note:"現在最紅的女團",pw:1.08,song:["Starlight Candy","Twinkle Twinkle Heart","Sugar Rush Day"]},
  {n:"RADIANT 9",note:"九人大團,音源很強",pw:1.03,song:["Prism Code","Nine Lights","Radiant Road"]},
  {n:"PRISM 9",note:"選秀出身的期間限定團",pw:1.02,from:"2016-05-01",to:"2017-01-31",song:["Pick Me Up","Nine Wishes"]},
  {n:"HARMONY",note:"出道多年的實力派",pw:1.0,song:["Snow Waltz","Harmony Lane","Paper Garden"]},
  {n:"VELVET ROSE",note:"成熟系概念女團",pw:.98,song:["Thorn","Rose Noir","Velvet Night"]},
  {n:"CARAT NOIR",note:"2016 年出道的新人,藝瑟以前的同伴在裡面",pw:.96,from:"2016-08-01",song:["Obsidian","Black Carat","Shine Noir"]},
  {n:"GLOW",note:"清新系的人氣團",pw:.95,song:["Neon Jelly","Glow Up","Lemon Light"]},
  {n:"PEACH",note:"可愛系的人氣團",pw:.94,song:["Peach Soda","Pink Parade","Hello Peach"]}];
const rivalOf=(i,base)=>{ const day=(base??S.promoStart??S.day??0)+Math.floor(i/6)*7, d=window.dateOf?dateOf(day):new Date(2017,0,13), iso=d.toISOString?.().slice(0,10)||"",
    L=RIVALS.filter(r=>(!r.from||iso>=r.from)&&(!r.to||iso<=r.to)), w=Math.floor(i/6), h=Math.abs(((base??0)*31+w*17+(+S.year||0))%L.length), R=L[h]||RIVALS[0];
  return {...R,songName:R.song[(w+(+S.year||0))%R.song.length]} };
let RIVAL=RIVALS[0];
const VERS={orig:{n:"原版",s:"最穩定",st:0,fresh:0},special:{n:"特別編舞版",s:"新鮮感高,體力消耗大",st:6,fresh:8},long:{n:"加長舞蹈段",s:"日和發揮空間,體力消耗大",st:5,fresh:5},goodbye:{n:"告別舞台",s:"只限最後一週,情緒拉滿",st:3,fresh:12}};
const MICS={live:{n:"全開麥",s:"評價最高,最怕失誤"},half:{n:"部分墊音",s:"穩定與評價折衷"},lip:{n:"整首對嘴",s:"最穩,但被抓到就是輿論"}};
const OCC={"打歌舞台":1,"演唱會":.85,"頒獎典禮":.85,"寫真":.7,"綜藝":.65,"機場":.55,"日常":.55,"日常・外出":.55,"日常・居家":.5,"日常・睡衣":.45,"練習":.5};

/* ---------- 狀態 ---------- */
const KEY="kpopGame.stage";
function fresh(){return {year:2016,idx:0,wins:0,log:[],uses:{},camCount:{},prev:null,
  m:Object.fromEntries(M.map(m=>[m.id,{stamina:90,throat:90,mood:70,pop:20,cond:""}])),plan:null,last:null}}
let S; try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.m) S=fresh();
const save=(bump=true)=>{if(bump){S.updatedAt=Date.now();schedulePush()} try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){window.logErr?.("stage",e)}};
let TOTAL=24;   /* 1.2 第 2 包:宣傳期 28 天裡實際有幾場(週二~週日)——發行日不是週二時,第 5 週的週二~週四也要打歌(以前固定 24,最後幾天手機寫打歌卻沒有場次) */
const setTotal=()=>{ const P=window.promoInfo?.(); if(!P?.active){ TOTAL=24; return } const back=(dateOf(P.start).getDay()+5)%7;
  for(let o=back+27;o>=0;o--){ const k=o%7; if(k<=5){ TOTAL=Math.floor(o/7)*6+k+1; return } } };
const weekOf=i=>Math.floor(i/6)+1, showOf=i=>SHOWS[i%6];
let seed=0; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};

function defaultPlan(){return {looks:Object.fromEntries(M.map(m=>[m.id,(LOOKS.find(l=>l.g)||LOOKS[0])?.id||""])),ver:"orig",mic:"half",cam:SONG.killer,end:SONG.center,rest:{}}}
/* 演出服裝(2026-10-29 使用者:可以自己排;忘了排就自動挑):這張專輯的打歌服(團體服優先)→ 她在這張專輯的造型 → 最近一張專輯的打歌服 → 其他。
   同一個宣傳期裡盡量每場換一套;你自己在這張專輯排過的(lookAlb)就照你排的 */
const curAlb=()=>{ const P=window.promoInfo?.(); return P?.active?"a"+P.n:(window.albumList?.().find(a=>a.upcoming)?.key||"a1") };
const albN=k=>+(String(k||"").match(/^a(\d+)$/)?.[1]||0);
function autoLook(mid,avoid){ const A=curAlb(), ok=LOOKS.filter(l=>l.g||l.own===mid), st=ok.filter(l=>l.occ==="打歌舞台");
  const tiers=[st.filter(l=>l.alb===A&&l.g),st.filter(l=>l.alb===A),st.slice().sort((a,b)=>albN(b.alb)-albN(a.alb)||b.t-a.t),ok];
  for(const c of tiers){ if(!c.length) continue; const f=c.filter(l=>l.id!==avoid); return (f[0]||c[0]).id } return "" }
/* ---------- 1.2 第 1 包(2026-11-03):每首歌自己的打歌服,打歌時照順序輪流 ----------
   存在企劃室的 R.stageLooks[歌曲代號]={list:[造型代號…],mode:"show"(每場換)|"week"(每週換),out:[移出過的]},跟著企劃室一起上雲端;演唱會唱這首時也照這份(第 3 包)。
   第一次打開時自動排:〈LETTER〉→ 寄往明天;主打 → 這張專輯其他的團體打歌服(赤夜追光、百葉窗光影在前;緋紅搖籃曲・改 照使用者的決定不放進去,可以自己加)。
   之後新收下的團體打歌服:專輯一樣、還沒有任何一首在用、也沒被移出過 → 自動排到主打的最後。
   第幾場穿哪套:每場換 = 這次宣傳期已打歌的場數;每週換 = 第幾週。第一場一定是第 1 套。輪到的那套她還沒做好立繪 → 先穿上一套(順序往前找)。
   準備單裡單場換穿(manual)只影響那一場。 */
const SEED_SONG={letter:["寄往明天"]}, SEED_OUT=/緋紅搖籃曲/, SEED_FIRST=["赤夜追光","百葉窗光影"];
const slotOf=mid=>Object.keys(typeof WMEM!=="undefined"?WMEM:{}).find(k=>WMEM[k]===mid);
const hasSpr=(code,mid)=>{ const it=typeof ITEMS!=="undefined"?ITEMS[String(code||"").split("@")[0]]:null, sl=slotOf(mid); return !!(it&&sl&&it.members?.[sl]?.sprites) };
const isStageGrp=it=>!!it&&!it.deleted&&(!it.kind||it.kind==="look")&&(it.occasion||"打歌舞台")==="打歌舞台"&&it.type==="group";
const RKS=()=>{ const R=window.SONGS_API?.R; if(!R) return null; return R.stageLooks=R.stageLooks||{} };
function albOfT(T){ const A=window.SONGS_API?.albums?.()||[]; return A.find(a=>(a.tracks||[]).some(t=>t.id===T?.id))||null }
/* 這次打歌的主打(宣傳期中是那張專輯的,不然是企劃室現在的) */
function songT(){ const A=window.SONGS_API?.albums?.()||[]; if(!A.length) return null; const P=window.promoInfo?.();
  let a=P?.active?A.find(x=>x.n===P.n):null; a=a||A.find(x=>x.current)||A.at(-1);
  let T=a?.tracks?.find(t=>t.id===a.title&&!t.inst)||null;
  if(!T||T.name!==SONG.name) T=A.flatMap(x=>x.tracks||[]).find(t=>!t.inst&&t.name===SONG.name)||T; return T }
function rotInit(T,alb,K,pool){ const e={list:[],mode:"show",out:[]}, nm=String(T.name||"").trim().toLowerCase(), want=SEED_SONG[nm];
  if(want) e.list=pool.filter(it=>want.includes(it.name)).map(it=>it.code);
  else if(alb?.title===T.id){ const claimed=new Set(Object.values(K).flatMap(v=>v.list||[]));
    const others=(alb.tracks||[]).filter(t=>t.id!==T.id).flatMap(t=>SEED_SONG[String(t.name||"").trim().toLowerCase()]||[]);
    const c=pool.filter(it=>!claimed.has(it.code)&&!others.includes(it.name)), rk=n=>{ const i=SEED_FIRST.indexOf(n); return i<0?99:i };
    e.out=c.filter(it=>SEED_OUT.test(it.name||"")).map(it=>it.code);
    e.list=c.filter(it=>!SEED_OUT.test(it.name||"")).sort((a,b)=>rk(a.name)-rk(b.name)).map(it=>it.code) }
  return e }
function rotOf(T){ const K=RKS(); if(!K||!T) return {list:[],mode:"show",out:[]};
  const alb=albOfT(T), ak=alb?"a"+alb.n:"", items=typeof ITEMS!=="undefined"?Object.values(ITEMS||{}):[];
  const pool=items.filter(it=>isStageGrp(it)&&(!ak||it.album===ak)).sort((a,b)=>(a.createdAt||a.updatedAt||0)-(b.createdAt||b.updatedAt||0)||String(a.code).localeCompare(String(b.code)));
  let ch=false;
  for(const t of [...(alb?.tracks||[]).filter(x=>!x.inst&&x.id!==alb.title),...(alb?.tracks||[]).filter(x=>x.id===alb.title),T]) if(t&&!K[t.id]){ K[t.id]=rotInit(t,alb,K,pool); ch=true }
  const e=K[T.id];
  if(alb?.title===T.id){ const used=new Set(Object.values(K).flatMap(v=>[...(v.list||[]),...(v.out||[])])); for(const it of pool) if(!used.has(it.code)){ e.list.push(it.code); ch=true } }
  const n0=e.list.length; e.list=e.list.filter(c=>{ const it=typeof ITEMS!=="undefined"?ITEMS[c]:null; return it&&!it.deleted }); if(e.list.length!==n0) ch=true;
  if(ch) window.SONGS_API?.save?.(); return e }
const rotN=e=>e.mode==="week"?Math.max(0,weekOf(S.idx)-1):(S.log||[]).filter(x=>!x.cancel).length;
function rotPick(T){ const e=T?rotOf(T):null; if(!e?.list.length) return null; const N=e.list.length, i=rotN(e)%N; return {code:e.list[i],i,N,e} }
function rotLook(mid,T){ const p=rotPick(T); if(!p) return ""; const ok=c=>LOOKS.some(l=>l.id===c&&(l.g||l.own===mid));
  if(!ok(p.code)) return ""; if(hasSpr(p.code,mid)) return p.code;
  for(let k=1;k<p.N;k++){ const c=p.e.list[(p.i-k+p.N)%p.N]; if(ok(c)&&hasSpr(c,mid)) return c }   // 她還沒做好立繪:先穿上一套
  return p.code }
/* ---------- 1.2 第 3 包(2026-11-04):回歸週、告別週加演收錄曲(主打+收錄曲連演,一位只算主打) ---------- */
function bsideTracks(){ const T=songT(), alb=T?albOfT(T):null; return alb?(alb.tracks||[]).filter(t=>!t.inst&&t.id!==alb.title&&t.id!==T.id):[] }
function bsideWeek(){ if(TODAY.state==="test") return "test"; const P=window.promoInfo?.(), d=(window.gameState?.().day??0)-(P?.start??0); if(!P?.active) return ""; return d<7?"cb":d>=21?"gb":"" }
const BWK={cb:"回歸週",gb:"告別週",test:"練習模式"};
function bsideLook(TB,mid){ const e=rotOf(TB); if(!e.list.length) return ""; const n=(S.log||[]).filter(x=>x.bs===TB.id).length, N=e.list.length;
  for(let k=0;k<N;k++){ const c=e.list[(n-k+N*9)%N]; if(LOOKS.some(l=>l.id===c&&(l.g||l.own===mid))&&(k===N-1||hasSpr(c,mid))) return c } return e.list[n%N] }
window.stageSongLooks=T=>{ try{ return rotOf(T).list.slice() }catch(e){ return [] } };
function ensurePlan(){ if(!S.plan){ S.plan=S.prev?JSON.parse(JSON.stringify(S.prev)):defaultPlan(); S.plan.manual={} }
  const A=curAlb(), T=songT(); S.plan.lookAlb=S.plan.lookAlb||{}; S.plan.manual=S.plan.manual||{};
  for(const m of M){const ok=LOOKS.filter(l=>l.g||l.own===m.id); if(S.plan.manual[m.id]&&ok.some(l=>l.id===S.plan.looks[m.id])) continue;
    const r=T?rotLook(m.id,T):""; if(r){ S.plan.looks[m.id]=r; continue }
    if(!ok.some(l=>l.id===S.plan.looks[m.id])||S.plan.lookAlb[m.id]!==A) S.plan.looks[m.id]=autoLook(m.id,S.prev?.looks?.[m.id])||ok[0]?.id||""}
  if(S.plan.ver==="goodbye"&&weekOf(S.idx)<4) S.plan.ver="orig"; if(+S.year<2017) S.plan.end="";
  { const bw=bsideWeek(), bt=bsideTracks(); if(S.plan.bsideWk!==bw){ S.plan.bsideWk=bw; S.plan.bside=bw&&bw!=="test"&&bt[0]?bt[0].id:"" } if(S.plan.bside&&!bt.some(t=>t.id===S.plan.bside)) S.plan.bside="" }   // 1.2 第 3 包:加演收錄曲(進入回歸週或告別週時預設加演第一首收錄曲)
  if(!byId(S.plan.cam)) S.plan.cam=(byId(SONG.killer)?SONG.killer:M[0].id); if(S.plan.end&&!byId(S.plan.end)) S.plan.end=""; }

/* ---------- 計算 ---------- */
function lookScore(L,mid){
  const dist=Math.sqrt(AX.reduce((x,k)=>x+(L.a[k]-SONG.target[k])**2,0));
  let s=100-dist*9; s=s*(OCC[L.occ]??.6);
  const used=(S.uses[mid+":"+L.id]||0); s-=Math.min(12,Math.max(0,used-4)*2);   // 2.0 第六個大腦:一套打歌服在宣傳期穿 5 次以上才慢慢扣(以前第 3 次起每次 −5,四套輪流到後半也一直掉)
  return {s:Math.max(0,Math.min(100,s)),used,dist};
}
function outfitScore(p){
  const on=M.filter(m=>!p.rest[m.id]&&LOOKS.find(l=>l.id===p.looks[m.id])); const parts=on.map(m=>({m,L:LOOKS.find(l=>l.id===p.looks[m.id]),...lookScore(LOOKS.find(l=>l.id===p.looks[m.id]),m.id)}));
  if(!parts.length) return {s:0,parts};
  let s=parts.reduce((x,o)=>x+o.s,0)/Math.max(1,parts.length);
  const ids=new Set(parts.map(o=>o.L.id)); if(ids.size===1&&parts[0].L.g) s+=5; else if(ids.size>2) s-=4;
  return {s:Math.max(0,Math.min(100,s)),parts};
}
function perform(){ syncSkill();
  const p=S.plan, i=S.idx, wk=weekOf(i), sh=showOf(i); seed=(i+1)*7919+(+S.year);
  const on=M.filter(m=>!p.rest[m.id]); const log=[]; const V=VERS[p.ver];
  const O=outfitScore(p);
  // 舞台品質
  let stage=SONG.score*.55+O.s*.25+V.fresh;
  // 成員的實力與團隊默契:實力怪物加分,默契越高現場越穩
  const avgSk=on.reduce((a,m)=>a+(m.vocal+m.dance+m.expr)/3,0)/Math.max(1,on.length), bond=window.teamBond?teamBond():50;
  stage+=(avgSk-65)*.3+(bond-50)*.12;
  /* 編舞(練習室):編舞分、熟練度、難度 → 舞台分與跳錯;還沒編舞就跟以前一樣 */
  const DN=SONG.dance, dmiss=[]; let avgPr=0;
  if(DN?.has){ avgPr=on.reduce((a,m)=>a+(DN.prof?.[m.id]||0),0)/Math.max(1,on.length); stage+=(DN.score-60)*.15+(avgPr-60)*.06+(DN.impact-50)*.06*(avgPr/100);
    for(const m of on){ const pr=DN.prof?.[m.id]||0, gap=35+DN.diff*11-(m.dance*.65+pr*.35); if(rnd()<Math.max(0,gap)/110+(pr<40?.12:pr<60?.05:0)){ dmiss.push(m); stage-=5 } } }
  let mistakes=[], caught=false;
  for(const m of on){const st=S.m[m.id]; const tired=(100-st.stamina)/100;
    stage-=tired*6; if(st.cond==="sick") stage-=3; if(st.cond==="hurt") stage-=4;
    if(p.mic==="live"){const hl=SONG.highLines[m.id]||0; const pf=hl*(.06+(100-st.throat)/250)*(1.5-m.vocal/100)+(st.cond==="sick"?.2:0)+(p.mic==="live"&&m.vocal<50?.04:0);
      if(rnd()<pf){mistakes.push(m);stage-=7}}
    if(p.mic==="half"&&st.cond==="sick"&&rnd()<.15){mistakes.push(m);stage-=4}}
  if(p.mic==="live") stage+=10-mistakes.length*2; if(p.mic==="half") stage+=4;
  if(p.mic==="lip"&&rnd()<.12) caught=true;
  if(on.length<5) stage-=8;
  stage=Math.max(20,Math.min(100,stage));
  const grade=stage>=90?"S":stage>=80?"A":stage>=68?"B":stage>=55?"C":"D";
  // 直拍與熱度
  const camM=byId(p.cam); const camOn=!p.rest[p.cam];
  let views=Math.round((40+S.m[p.cam].pop*1.5+(p.cam===SONG.killer?30:0)+stage*.6)*(.8+rnd()*.5)*(camOn?1:.2));
  if(+S.year>=2016) views=Math.round(views*1.6);
  let social=stage*.5+views*.2+(caught?-25:0)+(V===VERS.goodbye?10:0);
  const endViral=p.end&&!p.rest[p.end]&&rnd()<.18+(S.m[p.end].mood/500);
  if(endViral) social+=12;
  if(+S.year>=2020) social+=5;
  let viral=false, kpRes=0; if(DN?.has){ social+=(DN.hook-50)*.12; if(DN.hook>=70&&rnd()<.12+DN.hook/400+((DN.kpm||0)-40)/600){ viral=true; social+=10 }
    /* 2.0 第 3 包:KEY POINT 那幾秒的特寫,看 KEY POINT 熟練、整體熟練、領舞有沒有跳錯 */
    if(DN.kp?.name){ const ld=DN.kp.lead, q=(DN.kpm||0)*.6+avgPr*.4-(dmiss.some(m=>m.id===ld)?25:0)+(rnd()*20-10)-(ld&&ld!=="all"&&p.rest[ld]?15:0);
      if(q>=65){ kpRes=1; social+=6 } else if(q<35){ kpRes=-1; social-=3 } } }
  // 一位計分
  const decay=[0,.92,1,.9,.78,.72][Math.min(5,wk)];
  const us={digital:SONG.score*decay,sales:70,views:Math.min(100,views/3.4),social:Math.min(100,social*.95),stage};
  const RV=rivalOf(i,S.promoStart), pw=RV.pw||1;
  const rv={digital:Math.min(100,(79+rnd()*12)*([0,1,.96,.88,.78,.74][Math.min(5,wk)])*pw),sales:Math.min(100,82*pw),views:Math.min(100,(58+rnd()*24)*pw),social:Math.min(100,(52+rnd()*28)*pw),stage:Math.min(100,(70+rnd()*14)*pw)};
  const pts=o=>Math.round(Object.entries(sh.w).reduce((x,[k,w])=>x+o[k]*w,0)*100);
  const up=pts(us), rp=pts(rv), win=up>rp;
  // 劇情片段(內容庫的樣子)
  const say=(id,t)=>log.push(["say",`<b style="color:${byId(id).c}">${byId(id).n}</b>:「${t}」`]);
  if(p.ver==="special") say("tr","新編舞的第二段我想再對一次,一次就好。");
  if(p.ver==="goodbye") say("ys","最後一週了……大家,今天把它當成最後一次跳。");
  if(p.mic==="live") say("he","全開麥嗎?好,我會守住副歌。");
  if(p.mic==="lip"&&!caught) say("hr","今天放錄音……其實有點不甘心。");
  if(p.bside){ const tb=bsideTracks().find(t=>t.id===p.bside); if(tb) log.push(["",`先加演收錄曲〈${esc(tb.name)}〉,再接主打。`]) }
  for(const m of M) if(p.rest[m.id]) log.push(["",`${m.n}今天在休息室休息,四人上台。`]);
  for(const m of on) if(S.m[m.id].cond==="hurt") say(m.id,"腳踝我會自己注意,不要因為我改隊形。");
  mistakes.forEach(m=>log.push(["bad",`${m.n}在高音段破音了,網路上開始出現剪輯。`]));
  dmiss.forEach(m=>log.push(["bad",`${m.n}有一段動作慢了半拍,被眼尖的粉絲剪成影片。`]));
  if(DN?.has&&!dmiss.length&&avgPr>=85&&DN.score>=75) log.push(["good","整齊度被稱讚是「刀群舞」,練習室的努力看得出來。"]);
  if(kpRes){ const k=DN.kp, ln=k.lead&&k.lead!=="all"?byId(k.lead)?.n:"全員";
    log.push(kpRes>0?["good",`KEY POINT「${k.name}」的特寫:${ln}領的那一下被剪成短影音,留言都在學。`]:["bad",`KEY POINT「${k.name}」有人慢了半拍,特寫鏡頭沒抓到最整齊的那一下。`]) }
  if(viral) log.push(["good",`「${DN.hookName||"副歌舞步"}」挑戰在短影音上流行起來。`]);
  if(caught) log.push(["bad","有粉絲比對出今天是整首對嘴,熱搜出現「假唱」字眼。"]);
  if(endViral) log.push(["good",`Ending 鏡頭停在${byId(p.end).n}身上的那一秒被瘋傳。`]);
  if(views>260) log.push(["good",`${camM.n}的直拍衝上影音熱門。`]);
  if(win) say("ys","我們……拿到一位了?大家,謝謝你們。");
  return {i,wk,sh,O,stage,grade,views,social,us,rv,up,rp,win,mistakes,dmiss,viral,caught,endViral,log,kpRes,kp:DN?.kp||null,
    rival:{n:RV.n,song:RV.songName},looks:{...p.looks},bside:p.bside||"",end:p.end||(byId(SONG.center)?SONG.center:"he"),cam:p.cam,ver:p.ver,rest:{...p.rest}};
}
function applyResult(r){
  const p=S.plan, V=VERS[p.ver];
  if(window.growthOnShow) growthOnShow(M.filter(m=>!p.rest[m.id]).map(m=>m.id));
  window.choreoAfterShow?.(M.filter(m=>!p.rest[m.id]).map(m=>m.id));   // 上台也是練習
  /* KEY POINT:挑戰熱度累積;流行起來時領舞的人發 STARLOG */
  if(r.kp?.name){ window.choreoKPHeat?.(r.viral?3:r.kpRes>0?1:0);
    if(r.viral&&window.phonePost&&!(S.kpPost&&(S.idx||0)-S.kpPost.idx<4)){ const n=(S.kpPost?.n||0), ids=["ys","tr","hy","he","hr"], lead=r.kp.lead&&r.kp.lead!=="all"?r.kp.lead:"ys",
        ld=n===0?lead:ids[(ids.indexOf(lead)+n)%5], tag=`#${r.kp.name}挑戰`;   /* 隔 4 場打歌以上才再發一篇(這裡的 S 是待機室自己的存檔);第一篇是領舞的人,之後輪流 */
      const T={ys:[`${tag} 隊長先來!大家一起跳~`,`${tag} 宿舍版!夏恩做飯做到一半也被我抓來跳了。`],tr:[`${tag} ……我做了。Your turn.`,`${tag} 練習室,凌晨兩點。……不准笑。`],
        hy:[`${tag} やってみて!手指也要跳舞喔~`,`${tag} 芭蕾版。腳尖也差一公分。`],he:[`${tag} 大家都在跳耶!我也再來一次~`,`${tag} 吃飯前先跳一次!……好,可以吃了。`],hr:[`${tag} 交給我!咻——換你們了!`,`${tag} 濟州的橘子也來挑戰了!(橘子沒有手)`]};
      window.phonePost({id:ld,lines:[[ld,T[ld][n<5?0:1],"laugh"]],sc:"練習室的鏡子前",big:n===0,code:`kp-show${S.idx||0}`}); S.kpPost={idx:S.idx||0,n:n+1} } }
  r.first=window.onShowResult?.(r)||null;
  for(const m of M){const st=S.m[m.id];
    if(p.rest[m.id]){st.stamina=Math.min(100,st.stamina+18);st.throat=Math.min(100,st.throat+12);if(st.cond&&rnd()<.6) st.cond="";continue}
    st.stamina=Math.max(5,st.stamina-8-V.st+(r.i%6===5?0:0)); st.throat=Math.max(5,st.throat-(p.mic==="live"?9:p.mic==="half"?5:2));
    if(st.cond==="hurt"&&rnd()<.25) st.cond="hurt";
    S.uses[m.id+":"+p.looks[m.id]]=(S.uses[m.id+":"+p.looks[m.id]]||0)+1;}
  S.m[p.cam].pop+=Math.round(r.views/40); S.camCount[p.cam]=(S.camCount[p.cam]||0)+1;
  const top=Object.entries(S.camCount).sort((a,b)=>b[1]-a[1])[0];
  for(const m of M){ if(m.id!==p.cam&&top&&top[0]!==m.id&&top[1]>=4) S.m[m.id].mood=Math.max(0,S.m[m.id].mood-3) }
  if(r.endViral) S.m[p.end].pop+=6;
  r.mistakes.forEach(m=>{S.m[m.id].mood-=8}); (r.dmiss||[]).forEach(m=>{S.m[m.id].mood-=5}); if(r.caught) M.forEach(m=>S.m[m.id].mood-=4);
  if(r.win){S.wins++; M.forEach(m=>S.m[m.id].mood=Math.min(100,S.m[m.id].mood+8))}
  // 隔天恢復一點,偶爾生病或受傷
  /* 2.0 第六個大腦:週日那場之後是週一休息,體力、喉嚨多回一些(以前沒有,整個宣傳期每場 −2,沒去的後半段掉到 B、C) */
  const monRest=r.i%6===5;
  seed=(r.i+3)*104729; for(const m of M){const st=S.m[m.id]; st.stamina=Math.min(100,st.stamina+6+(monRest?14:0)); st.throat=Math.min(100,st.throat+5+(monRest?8:0)); if(monRest&&st.cond==="sick"&&rnd()<.5) st.cond="";
    if(!st.cond&&st.stamina<45&&rnd()<.25) st.cond="sick"; if(!st.cond&&r.i%6>=3&&p.ver!=="orig"&&rnd()<.08) st.cond="hurt";}
  S.log.push({i:r.i,win:r.win,grade:r.grade,...(r.bside?{bs:r.bside}:{})}); S.prev=JSON.parse(JSON.stringify(p)); S.prev.rest={}; S.plan=null; S.idx++; S.last=r; save();
  /* 1.2 第 2 包:失誤的人(破音優先,其次跳錯;一場只算一個)→ 可以去安慰她(promo.js) */
  if(window.promoInfo?.()?.active&&S.promoStart!=null){ const cm=r.mistakes?.[0], dm=r.dmiss?.[0]; if(cm||dm) window.promoSetDown?.((cm||dm).id,cm?"crack":"slip",{show:r.sh?.n,auto:!!r.auto,day:dayOfIdx(r.i)}) }
}


const DEMO_SONG=SONG, DEMO_LOOKS=LOOKS;
const MOOD_T={"甜蜜":{sweet:-2,pure:-1,lively:-1,fancy:-1,retro:0},"清涼":{sweet:-1,pure:-1,lively:-2,fancy:1,retro:0},"狂野":{sweet:2,pure:1,lively:-2,fancy:-2,retro:1},
  "神祕":{sweet:2,pure:0,lively:1,fancy:-1,retro:0},"悲傷":{sweet:1,pure:-1,lively:2,fancy:0,retro:-1},"自信":{sweet:2,pure:1,lively:0,fancy:-1,retro:1},"療癒":{sweet:-1,pure:-2,lively:1,fancy:1,retro:-1}};
const RETRO_G=["disco","citypop","njs"], HIP_G=["girlcrush","trap","drill","boombap"];
function targetOf(sum){const t={...(MOOD_T[sum.mood]||MOOD_T["自信"])}; const g=sum.genre||"";
  if(HIP_G.includes(g)){t.sweet+=1;t.retro+=1} if(RETRO_G.includes(g)) t.retro-=2; if(["ballad","orchestral","rnbballad"].includes(g)) t.lively+=1;
  for(const k of AX) t[k]=Math.max(-3,Math.min(3,t[k])); return t}

/* ---------- 資料來源:企劃室的主打歌、造型室的衣服(都在遊戲裡) ---------- */
let srcText="";
function loadLinked(){
  const parts=[];
  const sum=window.songSummary?songSummary():null;
  if(sum?.title){const t=sum.title; SONG={name:t.name||"未命名",score:Math.round(t.score),killer:t.killer||"",center:t.center||"",highLines:t.highLines||{},target:targetOf(t),genre:t.genre,mood:t.mood,dance:t.dance||{has:false}};   /* 2026-11-01:以前漏了 dance,練習室的編舞一直沒影響到打歌 */
    parts.push(`主打歌:企劃室《${sum.release||""}》的〈${SONG.name}〉,預估 ${SONG.score} 分`)}
  else {SONG=DEMO_SONG; parts.push("主打歌:企劃室還沒有主打,先用示範歌曲")}
  const looks=[];
  for(const it of Object.values(ITEMS||{})){ if(!it||it.deleted||(it.kind&&it.kind!=="look")) continue;
    const owners=Object.keys(it.members||{}).map(k=>WMEM[k]).filter(Boolean);
    looks.push({id:it.code,n:it.name,g:it.type==="group"?1:0,own:it.type==="group"?"":owners[0],owners,occ:it.occasion||"打歌舞台",alb:it.album||"",t:it.updatedAt||0,r:"R",a:{...{sweet:0,pure:0,lively:0,fancy:0,retro:0},...(it.attrs||{})}}) }
  if(looks.length){ LOOKS=looks.flatMap(l=>l.g?[l]:l.owners.map(o=>({...l,id:l.id+"@"+o,own:o}))); parts.push(`造型:造型室 ${looks.length} 套`) }
  else {LOOKS=DEMO_LOOKS; parts.push("造型:造型室還沒有造型,先用示範造型")}
  srcText=parts.join("。")+"。";
}

/* ---------- 雲端(users/{uid}/stage/state,與打歌準備室共用) ---------- */
let pT=0;
function schedulePush(){clearTimeout(pT); pT=setTimeout(push,4000)}
async function push(){ if(!syAuth()||!syCfg()) return; try{ const t=await syToken();
  await syJSON(syBase()+"/stage/state",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({fields:{json:{stringValue:JSON.stringify(S)},updatedAt:{integerValue:String(S.updatedAt||Date.now())}}})}) }catch(e){window.logErr?.("stage",e)} }
async function sync(){ if(!syAuth()||!syCfg()) return;
  const d=await syGet("stage/state"); const remoteAt=d?+d.fields.updatedAt.integerValue:0, localAt=+(S.updatedAt||0);
  if(remoteAt>localAt){ try{S=JSON.parse(d.fields.json.stringValue);S.updatedAt=remoteAt;save(false);if(OPEN) render()}catch(e){window.logErr?.("stage",e)} }
  else if(localAt>remoteAt||!d){ if(!S.updatedAt){S.updatedAt=Date.now();save(false)} await push() } }
(window.SYNC_HOOKS=window.SYNC_HOOKS||[]).push(sync);

/* =====================================================================
   畫面:電視台待機室(後台霓虹、提詞卡、倒數燈)
   ===================================================================== */
let OPEN=false, RES=null;
const face=id=>`<span class="sface" style="--c:${byId(id).c};background-image:url(${spr(id,null,"neutral")})"></span>`;
function shell(){
  if($("#stageFac")) return;
  const el=document.createElement("section"); el.id="stageFac"; el.className="fac-wrap th-stage hide";
  el.innerHTML=`<div class="fac-bg"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small>BROADCAST ・ BACKSTAGE</small><b>待機室</b></div>
      <div class="onair" id="tvOnair"></div><button class="fac-close" id="tvClose">離開</button></header>
    <div class="fac-body" id="tvBody"></div><div class="tv-res hide" id="tvRes"></div>`;
  $("#stage").appendChild(el); $("#tvClose").onclick=close;
}
function open(){ shell(); loadLinked(); checkToday(); OPEN=true; setPause("tv",true); const L=$("#stage").dataset.time||"day";
  $("#stageFac").querySelector(".fac-bg").style.backgroundImage=`url(assets/bg/backstage_${L==="day2"?"day":L}.webp)`;
  void $("#stageFac").offsetWidth; $("#stageFac").classList.remove("hide"); render() }
function close(){ $("#stageFac").classList.add("hide"); $("#tvRes").classList.add("hide"); setPause("tv",false); OPEN=false }
window.openStageRoom=open;
window.STAGE_SHOWS=SHOWS.map(s=>s.n);
/* ---- 宣傳期 ---- */
let TODAY={state:"test"};
window.stageNewPromo=P=>{ const y=dateOf(P.start).getFullYear(); S=fresh(); S.year=Math.min(2022,Math.max(2016,y)); S.promoStart=P.start; S.updatedAt=Date.now(); save() };
/* 沒去電視台的打歌:用上一場的準備單自動上台,不扣分 */
/* 1.2 第 2 包:第 i 場是哪一天;那天是連假(春節)就停播(節日特輯),跳過不算場次 */
const dayOfIdx=i=>{ const P=window.promoInfo?.(); if(!P) return null; const back=(dateOf(P.start).getDay()+5)%7; return P.start-back+Math.floor(i/6)*7+(i%6) };
const holIdx=i=>{ const d=dayOfIdx(i); return d!=null&&!!window.mileHoliday?.(d) };
const played=()=>(S.log||[]).filter(x=>!x.cancel).length;
const planned=()=>{ const P=window.promoInfo?.(); if(!P||TODAY.state==="test") return TOTAL; const f=promoFirstIdx(P); let n=0; for(let i=f;i<TOTAL;i++) if(!holIdx(i)) n++; return n };
window.stageCatchUp=(n,first)=>{ loadLinked(); setTotal(); if(S.idx<first) S.idx=first; let k=0, c=0;
  while(S.idx<n&&S.idx<TOTAL){ if(holIdx(S.idx)){ S.log.push({i:S.idx,cancel:1}); S.idx++; c++; for(const m of M){ const st=S.m[m.id]; st.stamina=Math.min(100,st.stamina+10); st.throat=Math.min(100,st.throat+8) } continue }   // 停播那天也是休息
    ensurePlan();
    /* 沒去的那場由經紀組照上一場的準備單上台;有人體力低於 50 時,特別編舞版、加長舞蹈段改回原版(告別舞台照舊) */
    if((S.plan.ver==="special"||S.plan.ver==="long")&&M.some(m=>!S.plan.rest?.[m.id]&&S.m[m.id].stamina<50)) S.plan.ver="orig";
    const r=perform(); r.auto=true; applyResult(r); k++ }
  if(k||c) save(); return k };
function checkToday(){ const T=window.promoToday?.(); setTotal();
  if(!T){ TODAY={state:"test"}; return }
  if(S.promoStart!==T.P.start) stageNewPromo(T.P);
  if(T.idx==null){ TODAY={state:"none",T}; return }
  stageCatchUp(T.idx,promoFirstIdx(T.P));
  const gd=window.gameState?.().day; if(gd!=null&&window.mileHoliday?.(gd)){ TODAY={state:"holiday",T,hol:window.mileHolidayOf?.(gd)}; return }   // 待機室自己的 S 沒有日期,用遊戲的   // 1.2 第 2 包:春節停播
  TODAY={state:S.idx>T.idx?"done":"ready",T} }
window.stageDoneToday=()=>{ try{ loadLinked(); checkToday(); return TODAY.state==="done" }catch(e){ return false } };
window.stageMoodAdd=(id,n)=>{ if(S.m?.[id]){ S.m[id].mood=Math.max(0,Math.min(100,S.m[id].mood+n)); save() } };   // 1.2 第 2 包:安慰之後(promo.js)
const optB=(group,key,o,on,dis)=>`<button class="topt${on?" on":""}" data-g="${group}" data-k="${key}" ${dis?"disabled":""}>${o.n}${o.s?`<small>${o.s}</small>`:""}</button>`;
const syncSkill=()=>{ const k=window.gameSkill?.(); if(!k) return; for(const m of M){ const s=k[m.id]; if(!s) continue; for(const f of ["vocal","dance","rap","expr","kor"]) if(m[f]!=null&&s[f]!=null) m[f]=Math.round(s[f]) } };
function render(){ if(!OPEN) return; syncSkill();
  const done=S.idx>=TOTAL, wk=weekOf(Math.min(S.idx,TOTAL-1)), sh=showOf(Math.min(S.idx,TOTAL-1)), base=(wk-1)*6;
  $("#tvOnair").innerHTML=done?`<b>宣傳期結束</b><span>四週共拿下 ${S.wins} 個一位</span>`:`<i class="lamp"></i><b>${sh.n}</b><span>〈${esc(SONG.name)}〉第 ${wk} 週・${sh.d}・第 ${played()+1}/${planned()} 場${+S.year===2020||+S.year===2021?"・無觀眾錄影":""}</span>`;
  let prep="";
  if(!done){ ensurePlan(); const p=S.plan;
    prep=`<div class="cue"><div class="cuehead"><h3>打歌準備單</h3><button class="tbtn" id="tvReuse" ${S.prev?"":"disabled"}>沿用上一場</button></div>
      <h4>造型 <select id="tvGroup"><option value="">一鍵全員套用團體服…</option>${LOOKS.filter(l=>l.g).map(l=>`<option value="${l.id}">${esc(l.n)}</option>`).join("")}</select></h4>
      ${(()=>{ const T=songT(), rp=T?rotPick(T):null, nm=esc(T?.name||SONG.name);
        return `<div class="tvx-rot">${rp?`<span>今天輪到</span><b>${esc(ITEMS?.[rp.code]?.name||"")}</b><small>〈${nm}〉第 ${rp.i+1} 套・共 ${rp.N} 套${rp.e.mode==="week"?"・每週換":"・每場換"}</small>`:`<span>〈${nm}〉還沒有排打歌服</span><small>造型室的團體打歌服可以排進來輪流穿</small>`}${T?`<button class="tbtn sm" id="tvRot">〈${nm}〉的打歌服…</button>`:""}</div>` })()}
      ${M.map(m=>{const st=S.m[m.id], L=LOOKS.find(l=>l.id===p.looks[m.id]), ls=L?lookScore(L,m.id):{s:0,used:0}, tags=[];
        if(st.cond==="sick") tags.push(`<i class="tg w">感冒</i>`); if(st.cond==="hurt") tags.push(`<i class="tg n">腳踝舊傷</i>`); if(st.stamina<40) tags.push(`<i class="tg w">體力低</i>`); if(ls.used>=2) tags.push(`<i class="tg w">這套已穿 ${ls.used} 場</i>`);
        return `<div class="trow${p.rest[m.id]?" rest":""}">${face(m.id)}<div class="tn"><b style="color:${m.c}">${m.n}</b>${tags.join("")}<small>概念契合 <em>${Math.round(ls.s)}</em></small></div>
          <select data-look="${m.id}" ${p.rest[m.id]?"disabled":""}>${LOOKS.filter(l=>l.g||l.own===m.id).map(l=>`<option value="${l.id}" ${l.id===p.looks[m.id]?"selected":""}>${esc(l.n)}${l.own?"(個人)":""}・${esc(l.occ)}</option>`).join("")||`<option value="">造型室裡還沒有她的造型</option>`}</select>
          ${st.cond?`<label class="trest"><input type="checkbox" data-rest="${m.id}" ${p.rest[m.id]?"checked":""}>讓她休息</label>`:""}</div>`}).join("")}
      <h4>舞台版本</h4><div class="topts">${Object.entries(VERS).map(([k,o])=>optB("ver",k,o,p.ver===k,k==="goodbye"&&wk<4)).join("")}</div>
      ${(()=>{ const bw=bsideWeek(), bt=bsideTracks(); if(!bw||!bt.length) return ""; return `<h4>加演收錄曲 <small>${bw==="cb"&&window.promoInfo?.()?.kind==="debut"?"出道週":BWK[bw]}・主打和收錄曲連演,一位只算主打</small></h4><div class="topts">${bt.map(t=>optB("bside",t.id,{n:`〈${esc(t.name)}〉`,s:rotOf(t).list.length?esc(lookName(rotOf(t).list[0])):""},p.bside===t.id)).join("")}${optB("bside","",{n:"不加演"},!p.bside)}</div>` })()}
      <h4>收音方式</h4><div class="topts">${Object.entries(MICS).map(([k,o])=>optB("mic",k,o,p.mic===k)).join("")}</div>
      <h4>主推直拍</h4><div class="topts">${M.map(m=>optB("cam",m.id,{n:m.n,s:`已主推 ${S.camCount[m.id]||0} 次${m.id===SONG.killer?"・killing part":""}`},p.cam===m.id,!!p.rest[m.id])).join("")}</div>
      ${+S.year>=2017?`<h4>Ending 鏡頭</h4><div class="topts">${M.map(m=>optB("end",m.id,{n:m.n,s:m.id===SONG.center?"副歌 C 位":""},p.end===m.id,!!p.rest[m.id])).join("")}</div>`:""}
      <div class="golive">${TODAY.state==="holiday"?`<span class="tvwait">今天${esc(TODAY.hol?.n||"連假")},各台播節日特輯,打歌停播</span>`:TODAY.state==="none"?`<span class="tvwait">今天(週一)沒有打歌,好好休息</span>`:TODAY.state==="done"?`<span class="tvwait">今天的打歌已經結束了,明天見</span>`
        :`<button class="tbtn go" id="tvGo" ${!p.end&&+S.year>=2017?"disabled":""}>${!p.end&&+S.year>=2017?"先選 Ending 鏡頭":"確認上台"}</button>`}</div></div>`; }
  const last=[...S.log].reverse().find(x=>!x.cancel);
  const ban=TODAY.state==="test"?`<div class="tvban">練習模式:${window.promoInfo?.()?"目前不在宣傳期,到企劃室決定回歸日":"出道前的模擬打歌"},結果不會影響正式宣傳期</div>`
    :`<div class="tvban live">宣傳期第 ${TODAY.T.week} 週・第 ${TODAY.T.dayN} 天${TODAY.T.show?`・今天是《${TODAY.T.show}》`:""}</div>`;
  $("#tvBody").innerHTML=ban+`<div class="tweek">${SHOWS.map((s,k)=>{const i=base+k, L=S.log.find(x=>x.i===i);return `<div class="tday${i===S.idx?" now":""}${L?(L.win?" win":" lose"):""}"><b>${s.d}</b><span>${L?(L.win?"一位":L.grade):s.n.split(" ")[0]}</span></div>`}).join("")}</div>
    <div class="tgrid"><div class="tmain">${done?`<div class="cue"><h3>這次宣傳期結束了</h3><p class="tnote">四週 ${played()} 場,拿下 ${S.wins} 個一位。${TODAY.state==="test"?"可以在右邊重新開始一輪模擬。":"下一次回歸日可以到 2F 企劃室決定。"}</p></div>`:prep}</div>
    <div class="tside"><div class="tvcard"><h4>這次回歸</h4><div class="kv"><span>一位次數</span><b>${S.wins}</b><span>完成場次</span><b>${played()}/${planned()}</b><span>上一場評價</span><b>${last?last.grade:"–"}</b><span>同週對手</span><b>${rivalOf(Math.min(S.idx,TOTAL-1),S.promoStart).n}</b></div>
      ${TODAY.state==="test"?`<div class="trow2"><label>年份<select id="tvYear">${[2016,2017,2018,2019,2020,2021,2022].map(y=>`<option ${+S.year===y?"selected":""}>${y}</option>`).join("")}</select></label><button class="tbtn sm" id="tvRestart">重新開始模擬</button></div>`:""}</div>
      <div class="tvcard"><h4>成員狀態</h4>${M.map(m=>{const st=S.m[m.id],b=(n,v,c)=>`<span>${n}</span><span class="tbar"><i style="width:${Math.max(0,Math.min(100,v))}%;background:${c}"></i></span>`;
        return `<div class="tstat">${face(m.id)}<div><b style="color:${m.c}">${m.n}</b>${st.cond==="sick"?`<i class="tg w">感冒</i>`:st.cond==="hurt"?`<i class="tg n">舊傷</i>`:""}<div class="tbars">${b("體力",st.stamina,"#4FE0A0")}${b("喉嚨",st.throat,"#5CC8FF")}${b("心情",st.mood,"#FFC857")}${b("人氣",Math.min(100,st.pop),m.c)}</div></div></div>`}).join("")}</div>
      <p class="tnote">${esc(srcText)}</p></div></div>`;
  bind();
}
function bind(){ const B=$("#tvBody"), p=S.plan;
  B.querySelectorAll("[data-look]").forEach(e=>e.onchange=()=>{p.looks[e.dataset.look]=e.value;(p.manual=p.manual||{})[e.dataset.look]=true;save();render()});   // 1.2:單場換穿只影響這一場,輪流順序不變
  B.querySelectorAll("[data-rest]").forEach(e=>e.onchange=()=>{p.rest[e.dataset.rest]=e.checked;save();render()});
  B.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{p[b.dataset.g]=b.dataset.k;save();render()});
  const g=$("#tvGroup"); if(g) g.onchange=e=>{if(e.target.value){M.forEach(m=>{p.looks[m.id]=e.target.value;(p.manual=p.manual||{})[m.id]=true});save();render()}};
  const r=$("#tvReuse"); if(r) r.onclick=()=>{S.plan=JSON.parse(JSON.stringify(S.prev));S.plan.manual=Object.fromEntries(M.map(m=>[m.id,true]));ensurePlan();save();render()};
  const ro=$("#tvRot"); if(ro) ro.onclick=()=>rotSheet();
  const go=$("#tvGo"); if(go) go.onclick=()=>confirmSheet();
  // 年份與重新開始只在練習模式出現(正式宣傳期的年份跟著時間軸,重新開始會讓一位與粉絲重複計算)
  const yr=$("#tvYear"); if(yr) yr.onchange=e=>{S.year=+e.target.value;save();render()};
  const rs=$("#tvRestart"); if(rs) rs.onclick=()=>{if(!confirm("確定重新開始模擬?練習模式的場次紀錄會清掉。"))return; const y=S.year;S=fresh();S.year=y;save();render()};
}
/* ---------- 1.2 第 1 包:上台前確認(看舞台的方式)、這首歌的打歌服、打歌轉播、一位發表 ---------- */
const VKEY="kpopGame.tvView", VIEWS={hl:["精華版","開場曲名、第一次副歌、最後副歌、Ending 鏡頭"],full:["整首","從前奏到尾奏,跟著定案音檔"],result:["直接看結果","不看舞台,直接到一位發表"]};
const getView=()=>{ const v=localStorage.getItem(VKEY); return VIEWS[v]?v:"hl" };
const lookName=c=>{ const it=ITEMS?.[String(c||"").split("@")[0]]; return it?.name||LOOKS.find(l=>l.id===c)?.n||"" };
function sheetEl(cls,html){ $("#tvSheet")?.remove(); const el=document.createElement("div"); el.id="tvSheet"; el.className="tvx-sheet "+cls; el.innerHTML=`<div class="tvx-card">${html}</div>`; $("#stageFac").appendChild(el); return el }
function confirmSheet(){ ensurePlan(); const p=S.plan, T=songT(), rp=T?rotPick(T):null, wk=weekOf(S.idx), sh=showOf(S.idx), v0=getView();
  const TB=p.bside?bsideTracks().find(t=>t.id===p.bside):null, hb=TB?window.stageHighlight?.(TB):null;
  const hl0=T?window.stageHighlight?.(T):null, hl=hl0?{...hl0,dur:hl0.dur+(hb?hb.segs.at(-1)[1]-hb.segs.at(-1)[0]:0)}:null, full=(hl0?.total||0)+(hb?.total||0), on=M.filter(m=>!p.rest[m.id]);
  const names=[...new Set(on.map(m=>lookName(p.looks[m.id])).filter(Boolean))], main=rp?lookName(rp.code):names[0]||"";
  const rot=rp?rp.e.list.map((c,k)=>`<span class="${k===rp.i?"on":k<rp.i&&rp.e.mode!=="week"&&(S.log||[]).length<rp.N?"done":""}"><i>${k===rp.i?"●":k<rp.i&&(S.log||[]).length<rp.N?"✓":"○"}</i>${esc(lookName(c))}</span>`).join(""):"";
  const mem=M.map(m=>`<div class="${p.rest[m.id]?"rest":""}"><i style="--c:${m.c};background-image:url(${spr(m.id,null,"smile")})"></i><small>${m.n}</small><em>${p.rest[m.id]?"休息":esc(lookName(p.looks[m.id])!==main?lookName(p.looks[m.id]):"")}</em></div>`).join("");
  const sub={hl:hl?`約 ${Math.round(hl.dur/60)>=1?Math.floor(hl.dur/60)+" 分 "+Math.round(hl.dur%60)+" 秒":Math.round(hl.dur)+" 秒"}`:"",full:full?fmtT(full):"",result:""};
  const el=sheetEl("cf",`<div class="tvx-top"><div class="tt"><small>BROADCAST ・ BACKSTAGE</small><b>上台前確認</b></div><span class="sp"></span><span class="lmp"><i></i>${esc(sh.n)}・${sh.d}・第 ${played()+1}/${planned()} 場</span><button class="tvx-bk" id="cfBack">‹ 回準備單</button></div>
    <div class="tvx-body"><div><h4>今天的打歌服${rp?`<small>〈${esc(T.name)}〉輪流穿</small>`:""}</h4>
      <div class="tvx-look"><div class="nm"><b>${esc(main||"(還沒選)")}</b>${rp?`<em>第 ${rp.i+1} 套・共 ${rp.N} 套</em>`:""}</div>
        ${rp&&rp.N>1?`<p>${S.prev?.looks?`上一場穿${esc(lookName(Object.values(S.prev.looks)[0])||"")}。`:""}下一場輪到${esc(lookName(rp.e.list[(rp.i+1)%rp.N]))}。</p>`:""}
        ${rot?`<div class="rot">${rot}</div>`:""}<div class="mem">${mem}</div></div>
      <dl class="chips"><dt>主推直拍</dt><dd><b>${byId(p.cam)?.n||""}</b>${p.cam===SONG.killer?"・killing part":p.cam===SONG.center?"・副歌 C 位":""}</dd>${p.end?`<dt>Ending 鏡頭</dt><dd><b>${byId(p.end)?.n||""}</b></dd>`:""}<dt>收音</dt><dd>${MICS[p.mic]?.n||""}・${VERS[p.ver]?.n||""}</dd>${TB?`<dt>加演</dt><dd><b>〈${esc(TB.name)}〉</b>・先唱,再接主打</dd>`:""}</dl></div>
     <div><h4>看舞台<small>選了會記住</small></h4><div class="opts">${Object.entries(VIEWS).map(([k,[n,d]])=>`<button class="opt${k===v0?" on":""}" data-vw="${k}" ${k!=="result"&&!T?"disabled":""}><span class="rd"></span><span><b>${n}${sub[k]?`・${sub[k]}`:""}</b><small>${d}</small></span></button>`).join("")}</div></div></div>
    <div class="tvx-foot"><p>${TODAY.state==="test"?"練習模式:結果不會影響正式宣傳期。":"看舞台時時間暫停。跟去電視台照舊扣 3 小時。"}</p><button class="tvx-go" id="cfGo">上台</button></div>`);
  let v=v0; el.querySelectorAll("[data-vw]").forEach(b=>b.onclick=()=>{ v=b.dataset.vw; el.querySelectorAll("[data-vw]").forEach(x=>x.classList.toggle("on",x===b)) });
  el.querySelector("#cfBack").onclick=()=>el.remove();
  el.querySelector("#cfGo").onclick=()=>{ try{ localStorage.setItem(VKEY,v) }catch(e){} el.remove(); goLive(v) } }
const fmtT=s=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,"0")}`;
function rotSheet(){ const T=songT(); if(!T) return; const e=rotOf(T), alb=albOfT(T), ak=alb?"a"+alb.n:"";
  const pool=Object.values(ITEMS||{}).filter(it=>isStageGrp(it)&&(!ak||it.album===ak)&&!e.list.includes(it.code)), K=RKS()||{};
  const owner=c=>{ const t=(alb?.tracks||[]).find(x=>x.id!==T.id&&(K[x.id]?.list||[]).includes(c)); return t?`・〈${esc(t.name)}〉`:"" };
  const thumb=c=>{ const it=ITEMS?.[c], m=Object.values(it?.members||{}).find(x=>x?.img||x?.thumb), u=it?.thumb||m?.thumb||""; return u?`style="background-image:url(${esc(u)})"`:"" };
  const el=sheetEl("rs",`<div class="tvx-top"><div class="tt"><small>STAGE OUTFITS</small><b>〈${esc(T.name)}〉的打歌服</b></div><span class="sp"></span><button class="tvx-bk" id="rsOk">完成</button></div>
    <div class="tvx-b5"><div class="lst"><h4>輪流的順序<small>打歌和演唱會唱這首時都照這份</small></h4>
      ${e.list.length?e.list.map((c,k)=>`<div class="it"><span class="no">${k+1}</span><span class="th" ${thumb(c)}></span><span class="tx"><b>${esc(lookName(c))}</b><small>${k===0?`<span class="first">第一場</span>宣傳期的第一場穿這套`:esc(ITEMS?.[c]?.concept||"").slice(0,26)}</small></span><span class="ops"><button data-up="${k}" ${k?"":"disabled"} aria-label="上移">▲</button><button data-dn="${k}" ${k<e.list.length-1?"":"disabled"} aria-label="下移">▼</button><button data-rm="${k}">移出</button></span></div>`).join(""):`<p class="note">還沒有排打歌服。從右邊這張專輯的團體打歌服加進來。</p>`}</div>
     <div class="side"><div><h4>怎麼輪</h4><div class="seg"><button data-md="show" class="${e.mode!=="week"?"on":""}">每場換一套</button><button data-md="week" class="${e.mode==="week"?"on":""}">每週換一套</button></div></div>
      <div><h4>這張專輯的其他打歌服</h4><div class="pool">${pool.length?pool.map(it=>`<button class="add" data-add="${esc(it.code)}">＋ ${esc(it.name||"未命名")}<em>${owner(it.code)}</em></button>`).join(""):`<span class="note">沒有其他團體打歌服了</span>`}</div></div>
      <p class="note">準備單裡單場換穿的不會改這份順序。輪到的那套有人還沒做好立繪時,她先穿上一套。</p></div></div>
    <div class="tvx-foot"><p>新收下的團體打歌服:專輯一樣、還沒有歌在用的,會自動排到主打的最後。</p></div>`);
  const redo=()=>{ window.SONGS_API?.save?.(); render(); rotSheet() };
  el.querySelector("#rsOk").onclick=()=>{ el.remove(); render() };
  el.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{ const k=+b.dataset.up; [e.list[k-1],e.list[k]]=[e.list[k],e.list[k-1]]; redo() });
  el.querySelectorAll("[data-dn]").forEach(b=>b.onclick=()=>{ const k=+b.dataset.dn; [e.list[k+1],e.list[k]]=[e.list[k],e.list[k+1]]; redo() });
  el.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ const c=e.list.splice(+b.dataset.rm,1)[0]; if(c&&!e.out.includes(c)) e.out.push(c); redo() });
  el.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{ const c=b.dataset.add; e.list.push(c); e.out=e.out.filter(x=>x!==c); redo() });
  el.querySelectorAll("[data-md]").forEach(b=>b.onclick=()=>{ e.mode=b.dataset.md; redo() }) }
/* 上台:先算結果(跟以前一樣),再看舞台(電視台轉播),最後一位發表 → 詳細結果 */
let LIVE=false;
async function goLive(v){ if(LIVE) return; LIVE=true; try{
  const T=songT(), res=perform(); applyResult(res); render();
  if(v!=="result"&&T&&window.openStagePlay){ const hl=v==="hl"?window.stageHighlight?.(T):null, P=window.promoInfo?.();
    const bw=bsideWeek(), tag=bw==="cb"?(P.kind==="debut"?"DEBUT STAGE":"COMEBACK STAGE"):bw==="gb"||res.ver==="goodbye"?"GOODBYE STAGE":res.ver==="special"?"SPECIAL STAGE":"";
    const TB=res.bside?bsideTracks().find(t=>t.id===res.bside):null;
    let all=false;   // 收錄曲轉播按「看結果 ››」:主打也不播,直接一位發表
    if(TB){ const hb=v==="hl"?window.stageHighlight?.(TB):null, bl=Object.fromEntries(M.map(m=>[m.id,res.rest[m.id]?"":(bsideLook(TB,m.id)||res.looks[m.id])]));
      await new Promise(ok=>{ window.openStagePlay(TB,{looks:bl,fan:res.cam,bc:{show:res.sh,group:window.groupName?.()||"",title:TB.name,album:window.songSummary?.()?.release||"",tag,end:null,noEnd:true,mode:v,segs:hb?[hb.segs.at(-1)]:null,onDone:r=>{ all=r==="all"; ok() }}})?.catch?.(e=>{ window.logErr?.("加演收錄曲",e); ok() }) }) }
    if(!all){ const looks=Object.fromEntries(M.map(m=>[m.id,res.rest[m.id]?"":res.looks[m.id]]));
    await new Promise(ok=>{ window.openStagePlay(T,{looks,fan:res.cam,bc:{show:res.sh,group:window.groupName?.()||"",title:T.name||SONG.name,album:window.songSummary?.()?.release||"",tag,end:res.rest[res.end]?(M.find(m=>!res.rest[m.id])?.id):res.end,mode:v,segs:hl?.segs||null,onDone:ok}})?.catch?.(e=>{ window.logErr?.("打歌轉播",e); ok() }) }) } }
  showRank(res) }finally{ LIVE=false } }
const RK_LINES={win:[["ys","大家……我們拿到一位了。謝謝,真的謝謝。","moved"],["he","一位!代表,今天晚上吃烤肉!","laugh"],["hr","代表!!我們是一位!!","laugh"],["tr","……嗯。今天的舞台,我很滿意。","smile"],["hy","やった!啊,是太好了!一位!","laugh"]],
  lose:[["ys","沒關係,下一場我們再拿回來。","smile"],["tr","……分數差一點。下一場不會輸。","serious"],["he","第二名也很棒啦!先吃飯再說~","smile"],["hr","哎咕,好可惜!下一場我要唱得更大聲!","pout"],["hy","大丈夫です!下一場、がんばる!","smile"]]};
function showRank(r){ $("#tvRank")?.remove(); const el=document.createElement("div"); el.id="tvRank"; el.className="tvx-rank";
  const rows=[["digital","音源"],["sales","實體銷量"],["views","播放"],["social","社群熱度"],["stage","舞台評價"]], sh=r.sh;
  const line=r.first?.[0]||RK_LINES[r.win?"win":"lose"][(r.i+(+S.year||0))%5], lm=byId(line[0]), gn=window.groupName?.()||"";
  el.innerHTML=`<div class="bg"></div><div class="veil"></div><div class="in" style="--b1:${sh.c1||"#FF4FA3"};--b2:${sh.c2||"#7B4FBF"}">
    <div class="hd"><span class="bcx-logo"><b>${esc(sh.n.split(" ")[0])}<em>${esc(sh.n.split(" ").slice(1).join(" "))}</em></b><small>MUSIC SHOW ・ ${sh.en||""}</small></span><span>${(d=>`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`)(dateOf(window.gameState?.().day??0))} ・ 本週一位候補</span></div>
    <div class="cands"><div class="cand us${r.win?" won":""}">${r.win?`<span class="crown">♛ 1位</span>`:""}${gn?`<small>${esc(gn)}</small>`:"<small>&nbsp;</small>"}<b>〈${esc(SONG.name)}〉</b><em>${esc(window.songSummary?.()?.release?`《${window.songSummary().release}》`:"")}</em><div class="faces">${M.map(m=>`<i style="--c:${m.c};background-image:url(${spr(m.id,null,"smile")})"></i>`).join("")}</div></div>
      <span class="vs">VS</span><div class="cand them${r.win?"":" won"}">${r.win?"":`<span class="crown">♛ 1位</span>`}<small>${esc(r.rival?.n||"")}</small><b>〈${esc(r.rival?.song||"")}〉</b><em>同週對手</em></div></div>
    <div class="rows">${rows.map(([k,n],j)=>{ const a=Math.round(r.us[k]), b=Math.round(r.rv[k]); return `<div class="row${a>b?" win":""}" style="--d:${(.25+j*.32).toFixed(2)}s"><span class="n l">${a}</span><div class="bar l"><i style="--w:${Math.max(0,Math.min(100,a))/100}"></i></div><div class="lab">${n}<small>比重 ${Math.round(sh.w[k]*100)}%</small></div><div class="bar r"><i style="--w:${Math.max(0,Math.min(100,b))/100}"></i></div><span class="n r">${b}</span></div>` }).join("")}</div>
    <div class="ft"><div class="tot l"><small>總分</small>${r.up.toLocaleString()}</div><div class="mid"><span class="one${r.win?"":" lose"}">${r.win?"1 位":"2 位"}</span><button id="rkOk">繼續</button></div><div class="tot r"><small>總分</small>${r.rp.toLocaleString()}</div></div></div>
    <div class="say" style="--c:${lm?.c||"#fff"}"><i style="--c:${lm?.c||"#fff"};background-image:url(${spr(line[0],null,line[2]||"smile")})"></i><p><b>${lm?.n||""}</b>${esc(line[1])}</p></div>`;
  $("#stageFac").appendChild(el); requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("go"))); setTimeout(()=>{ el.classList.add("done"); if(r.win) window.feedback?.("l") },2300);
  el.querySelector("#rkOk").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),260); showResult(r) } }
function showResult(r){ const el=$("#tvRes"), rows=[["digital","音源"],["sales","實體銷量"],["views","播放"],["social","社群熱度"],["stage","舞台評價"]];
  el.innerHTML=`<div class="tvbox${r.win?" won":""}"><div class="verd"><div class="grade">${r.grade}</div><div><div class="crown">${r.win?"一位!":"這場第二名"}</div>
      <small>${r.sh.d}《${r.sh.n}》・直拍觀看 ${r.views.toLocaleString()} 萬・造型契合 ${Math.round(r.O.s)}</small></div></div>
    ${r.first?`<div class="firstwin"><b>出道後的第一個一位</b>${r.first.map(([id,t,e])=>{const mm=byId(id);return `<p><span class="sface" style="--c:${mm.c};background-image:url(${spr(id,null,e)})"></span><b style="color:${mm.c}">${mm.n}</b>${esc(t)}</p>`}).join("")}</div>`:""}
    <ul class="tlog">${r.log.map(([k,t])=>`<li class="${k}">${t}</li>`).join("")||`<li>平穩完成的一場舞台。</li>`}</ul>
    <table><thead><tr><th>計分項目</th><th>比重</th><th>我們</th><th>${esc(r.rival?.n||RIVAL.n)}</th></tr></thead><tbody>
      ${rows.map(([k,n])=>`<tr><td>${n}</td><td>${Math.round(r.sh.w[k]*100)}%</td><td class="us">${Math.round(r.us[k])}</td><td>${Math.round(r.rv[k])}</td></tr>`).join("")}
      <tr class="tot"><td>總分</td><td></td><td class="us">${r.up.toLocaleString()}</td><td>${r.rp.toLocaleString()}</td></tr></tbody></table>
    ${r.auto?"":window.promoDownCard?.()||""}
    <div class="golive"><button class="tbtn go" id="tvNext">${S.idx<TOTAL?"準備下一場":"看宣傳期總結"}</button></div></div>`;
  el.classList.remove("hide"); $("#tvNext").onclick=()=>{el.classList.add("hide");render()};
  const cf=$("#tvComfort"); if(cf) cf.onclick=()=>{ el.classList.add("hide"); close(); setTimeout(()=>window.promoComfortNow?.(),260) } }

/* 造型被改版取代、舊的刪掉時(wardrobe.js deleteLook),打歌準備單裡選的舊造型改成新版 */
window.stageRemapLook=(o,n)=>{ let ch=0; for(const p of [S.plan,S.prev]) if(p?.looks) for(const k in p.looks) if(p.looks[k]===o){ p.looks[k]=n; ch++ }
  if(ch) save();
  const K=RKS(); let c2=0; if(K) for(const e of Object.values(K)) for(const f of ["list","out"]) (e[f]||[]).forEach((c,i)=>{ if(c===o){ e[f][i]=n; c2++ } });   // 1.2:每首歌的打歌服順序也換成新版
  if(c2){ for(const e of Object.values(K)){ e.list=[...new Set(e.list)]; e.out=[...new Set(e.out)] } window.SONGS_API?.save?.() }
  return ch+c2 };
window.stagePlanLooks=()=>({...(S.plan?.looks||S.prev?.looks||{})});   // 1.2 第 2 包:打歌結束後(簽售會)穿剛剛那場的   // 動態 MV:主打用打歌準備單選的造型
})();
