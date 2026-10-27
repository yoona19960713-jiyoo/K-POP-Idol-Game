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
let SONG={name:"Crimson Lullaby",score:82,killer:"hy",center:"he",target:{sweet:2,pure:0,lively:1,fancy:-2,retro:0},highLines:{hr:2,ys:1}};
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
const SHOWS=[
  {d:"週二",n:"SHOW PULSE",w:{digital:.35,sales:.1,views:.2,social:.15,stage:.2}},
  {d:"週三",n:"CHAMPION LIVE",w:{digital:.35,sales:.15,views:.15,social:.1,stage:.25}},
  {d:"週四",n:"COUNTDOWN M",w:{digital:.45,sales:.15,views:.15,social:.15,stage:.1}},
  {d:"週五",n:"MUSIC VAULT",w:{digital:.6,sales:.1,views:.1,social:.1,stage:.1}},
  {d:"週六",n:"CORE STAGE",w:{digital:.5,sales:.1,views:.1,social:.1,stage:.2}},
  {d:"週日",n:"STAR GAYO",w:{digital:.55,sales:.1,views:.15,social:.1,stage:.1}},
];
const RIVAL={n:"NOXVEIL",note:"三代頂流女團,同週回歸"};
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
const TOTAL=24;
const weekOf=i=>Math.floor(i/6)+1, showOf=i=>SHOWS[i%6];
let seed=0; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};

function defaultPlan(){return {looks:Object.fromEntries(M.map(m=>[m.id,(LOOKS.find(l=>l.g)||LOOKS[0])?.id||""])),ver:"orig",mic:"half",cam:SONG.killer,end:SONG.center,rest:{}}}
function ensurePlan(){ if(!S.plan) S.plan=S.prev?JSON.parse(JSON.stringify(S.prev)):defaultPlan();
  for(const m of M){const ok=LOOKS.filter(l=>l.g||l.own===m.id); if(!ok.some(l=>l.id===S.plan.looks[m.id])) S.plan.looks[m.id]=ok[0]?.id||""}
  if(S.plan.ver==="goodbye"&&weekOf(S.idx)<4) S.plan.ver="orig"; if(+S.year<2017) S.plan.end="";
  if(!byId(S.plan.cam)) S.plan.cam=(byId(SONG.killer)?SONG.killer:M[0].id); if(S.plan.end&&!byId(S.plan.end)) S.plan.end=""; }

/* ---------- 計算 ---------- */
function lookScore(L,mid){
  const dist=Math.sqrt(AX.reduce((x,k)=>x+(L.a[k]-SONG.target[k])**2,0));
  let s=100-dist*9; s=s*(OCC[L.occ]??.6);
  const used=(S.uses[mid+":"+L.id]||0); s-=Math.max(0,used-2)*5;
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
  let viral=false; if(DN?.has){ social+=(DN.hook-50)*.12; if(DN.hook>=70&&rnd()<.12+DN.hook/400){ viral=true; social+=10 } }
  // 一位計分
  const decay=[0,.92,1,.9,.78][wk];
  const us={digital:SONG.score*decay,sales:70,views:Math.min(100,views/3.4),social:Math.min(100,social*.95),stage};
  const rv={digital:(79+rnd()*12)*([0,1,.96,.88,.78][wk]),sales:82,views:58+rnd()*24,social:52+rnd()*28,stage:70+rnd()*14};
  const pts=o=>Math.round(Object.entries(sh.w).reduce((x,[k,w])=>x+o[k]*w,0)*100);
  const up=pts(us), rp=pts(rv), win=up>rp;
  // 劇情片段(內容庫的樣子)
  const say=(id,t)=>log.push(["say",`<b style="color:${byId(id).c}">${byId(id).n}</b>:「${t}」`]);
  if(p.ver==="special") say("tr","新編舞的第二段我想再對一次,一次就好。");
  if(p.ver==="goodbye") say("ys","最後一週了……大家,今天把它當成最後一次跳。");
  if(p.mic==="live") say("he","全開麥嗎?好,我會守住副歌。");
  if(p.mic==="lip"&&!caught) say("hr","今天放錄音……其實有點不甘心。");
  for(const m of M) if(p.rest[m.id]) log.push(["",`${m.n}今天在休息室休息,四人上台。`]);
  for(const m of on) if(S.m[m.id].cond==="hurt") say(m.id,"腳踝我會自己注意,不要因為我改隊形。");
  mistakes.forEach(m=>log.push(["bad",`${m.n}在高音段破音了,網路上開始出現剪輯。`]));
  dmiss.forEach(m=>log.push(["bad",`${m.n}有一段動作慢了半拍,被眼尖的粉絲剪成影片。`]));
  if(DN?.has&&!dmiss.length&&avgPr>=85&&DN.score>=75) log.push(["good","整齊度被稱讚是「刀群舞」,練習室的努力看得出來。"]);
  if(viral) log.push(["good",`「${DN.hookName||"副歌舞步"}」挑戰在短影音上流行起來。`]);
  if(caught) log.push(["bad","有粉絲比對出今天是整首對嘴,熱搜出現「假唱」字眼。"]);
  if(endViral) log.push(["good",`Ending 鏡頭停在${byId(p.end).n}身上的那一秒被瘋傳。`]);
  if(views>260) log.push(["good",`${camM.n}的直拍衝上影音熱門。`]);
  if(win) say("ys","我們……拿到一位了?大家,謝謝你們。");
  return {i,wk,sh,O,stage,grade,views,social,us,rv,up,rp,win,mistakes,dmiss,viral,caught,endViral,log};
}
function applyResult(r){
  const p=S.plan, V=VERS[p.ver];
  if(window.growthOnShow) growthOnShow(M.filter(m=>!p.rest[m.id]).map(m=>m.id));
  window.choreoAfterShow?.(M.filter(m=>!p.rest[m.id]).map(m=>m.id));   // 上台也是練習
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
  seed=(r.i+3)*104729; for(const m of M){const st=S.m[m.id]; st.stamina=Math.min(100,st.stamina+6); st.throat=Math.min(100,st.throat+5);
    if(!st.cond&&st.stamina<45&&rnd()<.25) st.cond="sick"; if(!st.cond&&r.i%6>=3&&p.ver!=="orig"&&rnd()<.08) st.cond="hurt";}
  S.log.push({i:r.i,win:r.win,grade:r.grade}); S.prev=JSON.parse(JSON.stringify(p)); S.prev.rest={}; S.plan=null; S.idx++; S.last=r; save();
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
  if(sum?.title){const t=sum.title; SONG={name:t.name||"未命名",score:Math.round(t.score),killer:t.killer||"",center:t.center||"",highLines:t.highLines||{},target:targetOf(t),genre:t.genre,mood:t.mood};
    parts.push(`主打歌:企劃室《${sum.release||""}》的〈${SONG.name}〉,預估 ${SONG.score} 分`)}
  else {SONG=DEMO_SONG; parts.push("主打歌:企劃室還沒有主打,先用示範歌曲")}
  const looks=[];
  for(const it of Object.values(ITEMS||{})){ if(!it||it.deleted||(it.kind&&it.kind!=="look")) continue;
    const owners=Object.keys(it.members||{}).map(k=>WMEM[k]).filter(Boolean);
    looks.push({id:it.code,n:it.name,g:it.type==="group"?1:0,own:it.type==="group"?"":owners[0],owners,occ:it.occasion||"打歌舞台",r:"R",a:{...{sweet:0,pure:0,lively:0,fancy:0,retro:0},...(it.attrs||{})}}) }
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
window.stageNewPromo=P=>{ const y=dateOf(P.start).getFullYear(); S=fresh(); S.year=Math.min(2022,Math.max(2015,y)); S.promoStart=P.start; S.updatedAt=Date.now(); save() };
/* 沒去電視台的打歌:用上一場的準備單自動上台,不扣分 */
window.stageCatchUp=(n,first)=>{ loadLinked(); if(S.idx<first) S.idx=first; let k=0;
  while(S.idx<n&&S.idx<TOTAL){ ensurePlan(); const r=perform(); r.auto=true; applyResult(r); k++ }
  if(k) save(); return k };
function checkToday(){ const T=window.promoToday?.();
  if(!T){ TODAY={state:"test"}; return }
  if(S.promoStart!==T.P.start) stageNewPromo(T.P);
  if(T.idx==null){ TODAY={state:"none",T}; return }
  stageCatchUp(T.idx,promoFirstIdx(T.P));
  TODAY={state:S.idx>T.idx?"done":"ready",T} }
const optB=(group,key,o,on,dis)=>`<button class="topt${on?" on":""}" data-g="${group}" data-k="${key}" ${dis?"disabled":""}>${o.n}${o.s?`<small>${o.s}</small>`:""}</button>`;
const syncSkill=()=>{ const k=window.gameSkill?.(); if(!k) return; for(const m of M){ const s=k[m.id]; if(!s) continue; for(const f of ["vocal","dance","rap","expr","kor"]) if(m[f]!=null&&s[f]!=null) m[f]=Math.round(s[f]) } };
function render(){ if(!OPEN) return; syncSkill();
  const done=S.idx>=TOTAL, wk=weekOf(Math.min(S.idx,TOTAL-1)), sh=showOf(Math.min(S.idx,TOTAL-1)), base=(wk-1)*6;
  $("#tvOnair").innerHTML=done?`<b>宣傳期結束</b><span>四週共拿下 ${S.wins} 個一位</span>`:`<i class="lamp"></i><b>${sh.n}</b><span>〈${esc(SONG.name)}〉第 ${wk} 週・${sh.d}・第 ${S.idx+1}/${TOTAL} 場${+S.year===2020||+S.year===2021?"・無觀眾錄影":""}</span>`;
  let prep="";
  if(!done){ ensurePlan(); const p=S.plan;
    prep=`<div class="cue"><div class="cuehead"><h3>打歌準備單</h3><button class="tbtn" id="tvReuse" ${S.prev?"":"disabled"}>沿用上一場</button></div>
      <h4>造型 <select id="tvGroup"><option value="">一鍵全員套用團體服…</option>${LOOKS.filter(l=>l.g).map(l=>`<option value="${l.id}">${esc(l.n)}</option>`).join("")}</select></h4>
      ${M.map(m=>{const st=S.m[m.id], L=LOOKS.find(l=>l.id===p.looks[m.id]), ls=L?lookScore(L,m.id):{s:0,used:0}, tags=[];
        if(st.cond==="sick") tags.push(`<i class="tg w">感冒</i>`); if(st.cond==="hurt") tags.push(`<i class="tg n">腳踝舊傷</i>`); if(st.stamina<40) tags.push(`<i class="tg w">體力低</i>`); if(ls.used>=2) tags.push(`<i class="tg w">這套已穿 ${ls.used} 場</i>`);
        return `<div class="trow${p.rest[m.id]?" rest":""}">${face(m.id)}<div class="tn"><b style="color:${m.c}">${m.n}</b>${tags.join("")}<small>概念契合 <em>${Math.round(ls.s)}</em></small></div>
          <select data-look="${m.id}" ${p.rest[m.id]?"disabled":""}>${LOOKS.filter(l=>l.g||l.own===m.id).map(l=>`<option value="${l.id}" ${l.id===p.looks[m.id]?"selected":""}>${esc(l.n)}${l.own?"(個人)":""}・${esc(l.occ)}</option>`).join("")||`<option value="">造型室裡還沒有她的造型</option>`}</select>
          ${st.cond?`<label class="trest"><input type="checkbox" data-rest="${m.id}" ${p.rest[m.id]?"checked":""}>讓她休息</label>`:""}</div>`}).join("")}
      <h4>舞台版本</h4><div class="topts">${Object.entries(VERS).map(([k,o])=>optB("ver",k,o,p.ver===k,k==="goodbye"&&wk<4)).join("")}</div>
      <h4>收音方式</h4><div class="topts">${Object.entries(MICS).map(([k,o])=>optB("mic",k,o,p.mic===k)).join("")}</div>
      <h4>主推直拍</h4><div class="topts">${M.map(m=>optB("cam",m.id,{n:m.n,s:`已主推 ${S.camCount[m.id]||0} 次${m.id===SONG.killer?"・killing part":""}`},p.cam===m.id,!!p.rest[m.id])).join("")}</div>
      ${+S.year>=2017?`<h4>Ending 鏡頭</h4><div class="topts">${M.map(m=>optB("end",m.id,{n:m.n,s:m.id===SONG.center?"副歌 C 位":""},p.end===m.id,!!p.rest[m.id])).join("")}</div>`:""}
      <div class="golive">${TODAY.state==="none"?`<span class="tvwait">今天(週一)沒有打歌,好好休息</span>`:TODAY.state==="done"?`<span class="tvwait">今天的打歌已經結束了,明天見</span>`
        :`<button class="tbtn go" id="tvGo" ${!p.end&&+S.year>=2017?"disabled":""}>${!p.end&&+S.year>=2017?"先選 Ending 鏡頭":"確認上台"}</button>`}</div></div>`; }
  const last=S.log[S.log.length-1];
  const ban=TODAY.state==="test"?`<div class="tvban">練習模式:${window.promoInfo?.()?"目前不在宣傳期,到企劃室決定回歸日":"出道前的模擬打歌"},結果不會影響正式宣傳期</div>`
    :`<div class="tvban live">宣傳期第 ${TODAY.T.week} 週・第 ${TODAY.T.dayN} 天${TODAY.T.show?`・今天是《${TODAY.T.show}》`:""}</div>`;
  $("#tvBody").innerHTML=ban+`<div class="tweek">${SHOWS.map((s,k)=>{const i=base+k, L=S.log.find(x=>x.i===i);return `<div class="tday${i===S.idx?" now":""}${L?(L.win?" win":" lose"):""}"><b>${s.d}</b><span>${L?(L.win?"一位":L.grade):s.n.split(" ")[0]}</span></div>`}).join("")}</div>
    <div class="tgrid"><div class="tmain">${done?`<div class="cue"><h3>這次宣傳期結束了</h3><p class="tnote">四週 ${TOTAL} 場,拿下 ${S.wins} 個一位。${TODAY.state==="test"?"可以在右邊重新開始一輪模擬。":"下一次回歸日可以到 2F 企劃室決定。"}</p></div>`:prep}</div>
    <div class="tside"><div class="tvcard"><h4>這次回歸</h4><div class="kv"><span>一位次數</span><b>${S.wins}</b><span>完成場次</span><b>${S.log.length}/${TOTAL}</b><span>上一場評價</span><b>${last?last.grade:"–"}</b><span>同週對手</span><b>${RIVAL.n}</b></div>
      ${TODAY.state==="test"?`<div class="trow2"><label>年份<select id="tvYear">${[2015,2016,2017,2018,2019,2020,2021,2022].map(y=>`<option ${+S.year===y?"selected":""}>${y}</option>`).join("")}</select></label><button class="tbtn sm" id="tvRestart">重新開始模擬</button></div>`:""}</div>
      <div class="tvcard"><h4>成員狀態</h4>${M.map(m=>{const st=S.m[m.id],b=(n,v,c)=>`<span>${n}</span><span class="tbar"><i style="width:${Math.max(0,Math.min(100,v))}%;background:${c}"></i></span>`;
        return `<div class="tstat">${face(m.id)}<div><b style="color:${m.c}">${m.n}</b>${st.cond==="sick"?`<i class="tg w">感冒</i>`:st.cond==="hurt"?`<i class="tg n">舊傷</i>`:""}<div class="tbars">${b("體力",st.stamina,"#4FE0A0")}${b("喉嚨",st.throat,"#5CC8FF")}${b("心情",st.mood,"#FFC857")}${b("人氣",Math.min(100,st.pop),m.c)}</div></div></div>`}).join("")}</div>
      <p class="tnote">${esc(srcText)}</p></div></div>`;
  bind();
}
function bind(){ const B=$("#tvBody"), p=S.plan;
  B.querySelectorAll("[data-look]").forEach(e=>e.onchange=()=>{p.looks[e.dataset.look]=e.value;save();render()});
  B.querySelectorAll("[data-rest]").forEach(e=>e.onchange=()=>{p.rest[e.dataset.rest]=e.checked;save();render()});
  B.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{p[b.dataset.g]=b.dataset.k;save();render()});
  const g=$("#tvGroup"); if(g) g.onchange=e=>{if(e.target.value){M.forEach(m=>p.looks[m.id]=e.target.value);save();render()}};
  const r=$("#tvReuse"); if(r) r.onclick=()=>{S.plan=JSON.parse(JSON.stringify(S.prev));ensurePlan();save();render()};
  const go=$("#tvGo"); if(go) go.onclick=()=>{const res=perform(); applyResult(res); render(); showResult(res)};
  // 年份與重新開始只在練習模式出現(正式宣傳期的年份跟著時間軸,重新開始會讓一位與粉絲重複計算)
  const yr=$("#tvYear"); if(yr) yr.onchange=e=>{S.year=+e.target.value;save();render()};
  const rs=$("#tvRestart"); if(rs) rs.onclick=()=>{if(!confirm("確定重新開始模擬?練習模式的場次紀錄會清掉。"))return; const y=S.year;S=fresh();S.year=y;save();render()};
}
function showResult(r){ const el=$("#tvRes"), rows=[["digital","音源"],["sales","實體銷量"],["views","播放"],["social","社群熱度"],["stage","舞台評價"]];
  el.innerHTML=`<div class="tvbox${r.win?" won":""}"><div class="verd"><div class="grade">${r.grade}</div><div><div class="crown">${r.win?"一位!":"這場第二名"}</div>
      <small>${r.sh.d}《${r.sh.n}》・直拍觀看 ${r.views.toLocaleString()} 萬・造型契合 ${Math.round(r.O.s)}</small></div></div>
    ${r.first?`<div class="firstwin"><b>出道後的第一個一位</b>${r.first.map(([id,t,e])=>{const mm=byId(id);return `<p><span class="sface" style="--c:${mm.c};background-image:url(${spr(id,null,e)})"></span><b style="color:${mm.c}">${mm.n}</b>${esc(t)}</p>`}).join("")}</div>`:""}
    <ul class="tlog">${r.log.map(([k,t])=>`<li class="${k}">${t}</li>`).join("")||`<li>平穩完成的一場舞台。</li>`}</ul>
    <table><thead><tr><th>計分項目</th><th>比重</th><th>我們</th><th>${RIVAL.n}</th></tr></thead><tbody>
      ${rows.map(([k,n])=>`<tr><td>${n}</td><td>${Math.round(r.sh.w[k]*100)}%</td><td class="us">${Math.round(r.us[k])}</td><td>${Math.round(r.rv[k])}</td></tr>`).join("")}
      <tr class="tot"><td>總分</td><td></td><td class="us">${r.up.toLocaleString()}</td><td>${r.rp.toLocaleString()}</td></tr></tbody></table>
    <div class="golive"><button class="tbtn go" id="tvNext">${S.idx<TOTAL?"準備下一場":"看宣傳期總結"}</button></div></div>`;
  el.classList.remove("hide"); $("#tvNext").onclick=()=>{el.classList.add("hide");render()} }

/* 造型被改版取代、舊的刪掉時(wardrobe.js deleteLook),打歌準備單裡選的舊造型改成新版 */
window.stageRemapLook=(o,n)=>{ let ch=0; for(const p of [S.plan,S.prev]) if(p?.looks) for(const k in p.looks) if(p.looks[k]===o){ p.looks[k]=n; ch++ }
  if(ch) save(); return ch };
})();
