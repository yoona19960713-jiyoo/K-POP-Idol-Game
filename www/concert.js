"use strict";
/* =====================================================================
   演唱會(2026-10-25 起)
   第一期:出道一週年的「首場演唱會」大事件(一個月前宣布,當天全螢幕演出、後台、結算)。
   第二期(2026-10-26 第一部分):首場辦完後,企劃室多一個「演唱會」分頁自己辦:標題、場館(預估人數與售罄)、日期(4~12 週後的週末,
   不撞打歌期,兩場至少隔 90 天)、歌單(發行過的歌 6~10 首排順序、兩段個人舞台、安可固定粉絲之歌);前三週每週一次彩排
   (去探班看彩排劇情 +25%、交給她們 +18%,起始 25%);演出照玩家的歌單;結算依完成度、心情、歌單給 S/A/B 評價。
   第二部分(2026-10-26):演唱會造型(造型室「演唱會」類、處理成遊戲立繪的;沒有那套的成員改用她自己的其他演唱會造型)
   與台上身影(唱歌時五人站在舞台上,個人舞台只留那一位)、演出後 STARLOG 自動發文、相簿「回憶」每場一張紀念卡(cg.js)。第三期:海外巡迴。
   演出畫面:場館舞台背景(從觀眾席看,台上是逆光的小人影)+ 手燈海(canvas)+ 舞台光束 + 大螢幕特寫(成員臉部)。
   美術還沒到時用現有的事件背景代替(CONCERT_ART 裡的 fallback)。
   ===================================================================== */
(()=>{
const DEBUT=()=>window.DEBUT_DAY;
const VENUES={
  hall:{n:"星環 Live Hall",cap:3000,art:"assets/bg/concert_hall.webp",fb:"assets/bg/ev_stage.webp",sb:47,sh:15},
  arena:{n:"漢江體育館",cap:12000,art:"assets/bg/concert_arena.webp",fb:"assets/bg/ev_festival.webp",sb:39,sh:13},
  dome:{n:"首爾巨蛋",cap:25000,art:"assets/bg/concert_dome.webp",fb:"assets/bg/ev_festival.webp",sb:50,sh:11}};   // sb/sh:台上身影的腳底高度與身高(對齊各場館圖的舞台)
const ART={backstage:["assets/bg/concert_backstage.webp","assets/bg/backstage_night.webp"],gate:["assets/bg/concert_gate.webp","assets/bg/ev_showcase.webp"],
  firstCG:["assets/cg/concert_first.webp",null]};
const SOLO={ys:"月光之下",tr:"NO MERCY",hy:"Swan",he:"初戀日記",hr:"濟州的風"};
const FAN_SONG="寫給星星的信";
const LIGHT=["#FF2E63","#B565FF","#FFC75F","#4FC3F7","#FF8FB3","#7CF29C"];   // 每首歌換一種手燈色;應援色是緋紅
const ok=src=>new Promise(r=>{ if(!src) return r(false); const i=new Image(); i.onload=()=>r(true); i.onerror=()=>r(false); i.src=src });
const pick=async([a,b])=>(await ok(a))?a:b;
const st=()=>{ S.concerts=S.concerts||[]; return S.concerts };
const fansMan=()=>S.stats?.fans||0;   // 粉絲數,單位「萬」
const nextSat=day=>{ let d=day; while(dateOf(d).getDay()!==6) d++; return d };
const fmt=day=>{const d=dateOf(day); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`};
const venueFor=f=>f*40>=VENUES.dome.cap*.9?"dome":f*40>=VENUES.arena.cap*.7?"arena":"hall";

/* ---- 排程:出道一週年前約一個月宣布首場演唱會(定在週年當天或之後的第一個週六,避開打歌期) ---- */
function scheduleFirst(){
  if(S.concertNext||st().length||!S.debuted) return;
  const ann=DEBUT()+365; if(S.day<ann-30) return;
  let day=nextSat(Math.max(ann,S.day+14));
  const P=S.promo; if(P&&day>=P.start&&day<P.start+28) day=nextSat(P.start+28);
  const v=venueFor(fansMan());
  S.concertNext={day,venue:v,title:"PERFECT DAY",first:true,announced:S.day}; save(true);
  setTimeout(()=>announce(S.concertNext),700) }
async function announce(c){
  if(!c.first) return announce2(c);
  const V0=VENUES[c.venue], gate=await pick(ART.gate), el=document.createElement("div"); el.className="bigev";
  el.innerHTML=`<div class="bg-shot" style="background-image:url(${gate})"></div><div class="bg-veil"></div><div class="bigcard"><small>1ST CONCERT ・ ${fmt(c.day)}</small>
    <h2>首場演唱會〈${esc(c.title)}〉決定了</h2><p class="lead">出道一週年,完美女團的第一場單獨演唱會定在 ${fmt(c.day)},場地是 ${V0.n}(${V0.cap.toLocaleString()} 席)。消息一公布,粉絲的應援已經開始了。</p>
    <div class="evlines">${[["ys","第一場演唱會……我想讓每一位粉絲都記得這一天。","smile"],["hr","我要準備一首只有吉他的歌!代表要來聽喔!","laugh"],["tr","……一定會是最好的舞台。","smile"]].map(([id,t,e])=>{const m=byId(id);return `<div class="evl"><span class="pface" style="--c:${m.c};background-image:url(${spr(id,null,e)})"></span><p><b style="color:${m.c}">${m.n}</b>${esc(t)}</p></div>`}).join("")}</div>
    <button class="fbtn pri" id="cnOk">開始準備</button></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  $("#cnOk").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false); renderAll() } }

/* ---- 當天:清晨宣布「今晚是演唱會」,按下去開始演出 ---- */
function concertDay(){ const c=S.concertNext; if(!c||S.day<c.day) return; setTimeout(()=>dayCard(c),700) }
async function dayCard(c){
  if($("#cnView")||$(".bigev")){ setTimeout(()=>dayCard(c),1500); return }
  const V0=VENUES[c.venue], gate=await pick(ART.gate), el=document.createElement("div"); el.className="bigev";
  el.innerHTML=`<div class="bg-shot" style="background-image:url(${gate})"></div><div class="bg-veil"></div><div class="bigcard"><small>${c.first?"1ST CONCERT":"CONCERT"} ・ ${V0.n}</small>
    <h2>今晚,〈${esc(c.title)}〉</h2><p class="lead">場館外從中午就排起了長長的人龍,${V0.cap.toLocaleString()} 個座位的手燈都已經準備好。後台,五個人正在做最後的確認。</p>
    <button class="fbtn pri" id="cnGo">前往會場</button></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  $("#cnGo").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false); runConcert(c) } }

/* ---- 歌單:發行過的主打歌(新到舊)+ 兩段個人舞台 + MC + 安可(粉絲之歌) ---- */
function setlist(c){
  if(c.list?.length){ const half=Math.ceil(c.list.length/2), L=[{k:"vcr"}];
    c.list.slice(0,half).forEach(t=>L.push({k:"song",t})); L.push({k:"mc",who:["ys","he","hr"]});
    (c.solos||[]).forEach(id=>L.push({k:"solo",id,t:SOLO[id]})); c.list.slice(half).forEach(t=>L.push({k:"song",t}));
    L.push({k:"mc",who:["tr","hy"]},{k:"encore"},{k:"song",t:FAN_SONG,fan:true},{k:"end"}); return L }
  const titles=[...new Set((S.promoHist||[]).map(p=>p.title).filter(Boolean))].reverse(); if(!titles.length) titles.push("出道曲");
  const r=rng(seedOf(c.day,"setlist")), solos=[...M].sort(()=>r()-.5).slice(0,2);
  const L=[{k:"vcr"},{k:"song",t:titles[0]}];
  titles.slice(1,4).forEach(t=>L.push({k:"song",t}));
  L.push({k:"mc",who:["ys","he","hr"]});
  solos.forEach(m=>L.push({k:"solo",id:m.id,t:SOLO[m.id]}));
  if(titles.length>1) L.push({k:"song",t:titles[1]});
  L.push({k:"mc",who:["tr","hy"]},{k:"encore"},{k:"song",t:FAN_SONG,fan:true},{k:"end"});
  return L }
const MC2={ys:"今天來到這裡的每一位,謝謝你們。每一次看到這片手燈,都覺得我們好幸運。",he:"大家今天吃飽了嗎?等一下要喊大聲一點喔,我們會聽得到的!",
  hr:"下一首,要大家一起唱!不會唱的就跟著揮手燈!",tr:"……今天的舞台,是我們練了好幾個禮拜的。希望你們喜歡。",hy:"みなさん、今日も本当にありがとう!下次也一定要再來喔!"};
const MC={ys:"今天來到這裡的每一位,謝謝你們。一年前的我們,連做夢都不敢想有這麼多的手燈。",he:"我剛剛偷看了一下……真的是一整片的紅色海洋!大家今天吃飽了嗎?",
  hr:"下一首,是我們第一次在大家面前唱的歌,要一起大聲唱喔!",tr:"……說實話,剛剛上台前有點緊張。但現在,只想再多唱一首。",hy:"みなさん、ありがとう!一年間、本当にありがとうございました!"};

/* ---- 演出畫面 ---- */
async function runConcert(c){
  const V0=VENUES[c.venue], bg=await pick([V0.art,V0.fb]), L=setlist(c);
  const el=document.createElement("div"); el.id="cnView"; el.className="cnview";
  const figIds=M.map(m=>m.id).filter(id=>lookFor(c,id)), real=bg===V0.art;
  el.innerHTML=`<div class="cnbg" style="background-image:url(${bg})"></div>${figIds.length?`<div class="cnstage" style="--sb:${real?V0.sb:44}%;--sh:${real?V0.sh:22}%">${figIds.map(id=>`<img class="cnfig" data-id="${id}" src="${spr(id,lookFor(c,id),"smile")}" alt="">`).join("")}</div>`:""}<div class="cnbeams"></div><canvas class="cnsticks"></canvas>
    <div class="cnscreen"><span></span></div><div class="cntitle"><small></small><b></b></div><div class="cnline"><span class="pface"></span><p></p></div>
    <div class="cnconf"></div><button class="cnskip">略過 ›</button><p class="cntap">點一下畫面繼續</p>`;
  $("#stage").appendChild(el); setPause("concert",true);
  const cv=el.querySelector(".cnsticks"), ctx=cv.getContext("2d"); let col=LIGHT[0], wave=1, raf=0, t0=performance.now();
  const sticks=[]; const draw=t=>{ const dpr=Math.min(2,devicePixelRatio||1), w=cv.clientWidth, h=cv.clientHeight;
    if(cv.width!==Math.round(w*dpr)){ cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); sticks.length=0;
      const n=Math.round(w*h/260); for(let i=0;i<n;i++){ const y=Math.pow(Math.random(),.7); sticks.push({x:Math.random(),y,ph:Math.random()*6.28,s:.4+y*1.1}) } }
    const W=cv.width,H=cv.height; ctx.clearRect(0,0,W,H); ctx.globalCompositeOperation="lighter"; ctx.fillStyle=col;
    const tt=(t-t0)/1000;
    for(const p of sticks){ const yy=H*(.42+p.y*.58)+Math.sin(tt*2.4*wave+p.ph+p.x*6)*4*dpr*p.s, xx=p.x*W+Math.cos(tt*1.2+p.ph)*2*dpr;
      ctx.globalAlpha=.35+.45*p.y; ctx.beginPath(); ctx.arc(xx,yy,(1+p.s*1.6)*dpr,0,6.283); ctx.fill() }
    ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over"; raf=requestAnimationFrame(draw) };
  raf=requestAnimationFrame(draw);
  const $c=s=>el.querySelector(s), T=$c(".cntitle"), LN=$c(".cnline"), SCR=$c(".cnscreen");
  let i=0, timer=0, skip=false; const songs=[];
  const say=(id,text,ex="smile")=>{ const m=byId(id); LN.querySelector(".pface").style.cssText=`--c:${m.c};background-image:url(${spr(id,null,ex)})`; LN.querySelector("p").innerHTML=`<b style="color:${m.c}">${m.n}</b>${esc(text)}`; LN.classList.add("on") };
  const screen=id=>{ if(!id){ SCR.classList.remove("on"); return } const m=byId(id); SCR.querySelector("span").style.backgroundImage=`url(${spr(id,null,"smile")})`; SCR.style.setProperty("--c",m.c); SCR.classList.add("on") };
  const STG=$c(".cnstage"), figs=[...el.querySelectorAll(".cnfig")];
  const stage=(on,solo)=>{ if(!STG) return; figs.forEach(f=>{ f.src=spr(f.dataset.id,lookFor(c,f.dataset.id),"smile"); f.hidden=!!solo&&f.dataset.id!==solo }); STG.classList.toggle("solo",!!solo&&figs.some(f=>f.dataset.id===solo)); STG.classList.toggle("on",on&&(!solo||figs.some(f=>f.dataset.id===solo))) };
  const step=()=>{ clearTimeout(timer); if(i>=L.length) return finish(); const s=L[i++]; LN.classList.remove("on"); T.classList.remove("on"); el.classList.remove("dark","encore");
    stage(s.k==="song"||s.k==="solo"||s.k==="mc"||s.k==="end",s.k==="solo"?s.id:null);
    if(s.k==="vcr"){ el.classList.add("dark"); T.querySelector("small").textContent=`PERFECT GIRL GROUP ${c.first?"1ST ":""}CONCERT`; T.querySelector("b").textContent=`〈${c.title}〉`; T.classList.add("on","big"); wave=.3; timer=setTimeout(step,3200); return }
    T.classList.remove("big");
    if(s.k==="song"||s.k==="solo"){ col=s.fan?"#FF2E63":LIGHT[songs.length%LIGHT.length]; songs.push(s); wave=s.fan?.6:1.2;
      el.style.setProperty("--beam",col); T.querySelector("small").textContent=s.k==="solo"?`SOLO STAGE ・ ${byId(s.id).n}`:s.fan?"ENCORE ・ 粉絲之歌":`SONG ${songs.length}`;
      T.querySelector("b").textContent=`〈${s.t}〉`; T.classList.add("on");
      const focus=s.k==="solo"?s.id:M[(songs.length*2)%M.length].id; setTimeout(()=>screen(focus),900);
      if(s.fan) setTimeout(()=>say("ys","這首歌,要送給一路陪著我們的你們。","smile"),1200);
      timer=setTimeout(()=>{screen(null);step()},s.fan?6000:4400); return }
    if(s.k==="mc"){ screen(null); wave=.4; let j=0; const nx=()=>{ if(j>=s.who.length){ step(); return } const id=s.who[j++]; say(id,(c.first?MC:MC2)[id],"smile"); timer=setTimeout(nx,3600) }; LN.onclick=e=>{e.stopPropagation(); clearTimeout(timer); nx()}; nx(); return }
    if(s.k==="encore"){ el.classList.add("dark","encore"); wave=2; col="#FF2E63"; T.querySelector("small").textContent="燈暗了,台下的手燈卻沒有一支熄滅"; T.querySelector("b").textContent="安可!安可!"; T.classList.add("on"); timer=setTimeout(step,3600); return }
    if(s.k==="end"){ el.classList.add("finale"); wave=.8; T.querySelector("small").textContent="THANK YOU"; T.querySelector("b").textContent="完美女團,謝謝大家!"; T.classList.add("on"); timer=setTimeout(step,3800) } };
  el.onclick=e=>{ if(e.target.closest(".cnskip")) return; step() };
  $c(".cnskip").onclick=e=>{ e.stopPropagation(); skip=true; i=L.length; step() };
  step();
  async function finish(){ cancelAnimationFrame(raf);
    const G=c.first?null:grade(c), att=Math.min(V0.cap,Math.round(fansMan()*40)), sold=att>=V0.cap, gain=Math.max(2,Math.round(att/500*(sold?1.3:1)*(G?G.mult:1)));
    const res={day:c.day,venue:c.venue,title:c.title,att,sold,gain,songs:songs.length,first:!!c.first,...(G?{grade:G.g,score:G.score}:{})};
    st().push(res); window.logEvent?.("concert",{title:c.title,venue:V0.n}); post(c,res,V0); S.concertNext=null; S.stats=S.stats||{fans:0,wins:0,winsByYear:{},firstWin:false,awards:[]}; S.stats.fans+=gain;
    for(const m of M){ const s=S.m[m.id]; s.mood=Math.min(100,s.mood+20); s.xp=(s.xp||0)+150 } window.addBond?.(M.map(x=>x.id),4); save(true);
    const cg=c.first?await pick(ART.firstCG):null;
    const close=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("concert",false); backstage(c,()=>result(res)) };
    if(cg){ el.innerHTML=`<div class="cnbg" style="background-image:url(${cg});animation:none"></div><div class="cncap"><small>MEMORY ・ 首場演唱會</small><h2>「謝幕,和一整片的手燈海」</h2><p>五個人牽著手,對著看不到盡頭的光海,深深地鞠了一躬。</p></div><button class="cnskip" style="opacity:1">繼續 ›</button>`;
      S.cgExtra=[...new Set([...(S.cgExtra||[]),"concert_first"])]; save(true); el.onclick=close }
    else close() } }

/* ---- 後台:一段固定劇情(全員在場),用對話畫面演出 ---- */
async function backstage(c,done){
  const bg=await pick(ART.backstage);
  const sn0={code:"concert-backstage-"+c.day,type:"event",who:M.map(m=>m.id),member:"ys",
    sc:"演出結束後的後台,花束堆滿了整張桌子,外面還聽得到粉絲在喊她們的名字。",nodes:{start:{L:[
      ["hr","代表!你有看到嗎?最後那首,台下全部的人都在唱!","laugh"],["he","我哭到妝都花了……不准拍照喔。","shy"],
      ["hy","手燈の海、本当にきれいだった……代表,謝謝你讓我們站上那裡。","smile"],["tr","……我第一次覺得,舞台結束的時候會捨不得。","shy"],
      ["ys","代表,一年前你說會讓我們站上最好的舞台。","smile"],["ys","今天,我們真的站上去了。","laugh"]],
    C:[{t:"「這只是開始。下一次,我們去更大的場館。」",s:"約定",to:"ys",g:2,r:[["ys","……嗯。我們說好了。","shy"],["hr","耶——巨蛋!我們要去巨蛋!","laugh"]]},
       {t:"「妳們今天,是我見過最耀眼的舞台。」",s:"稱讚",to:"he",g:2,r:[["he","代表……你這樣說,我又要哭了啦。","shy"],["tr","……謝謝。我會記住這句話。","smile"]]}]}}};
  const sn=window.eventSnip?.("concert_backstage",sn0)||sn0;   // 內容庫有事件劇本就用,沒有才用這段內建的
  scenePlay(sn,bg,c.first?"首場演唱會・後台":"演唱會・後台",VENUES[c.venue].n,done) }
function scenePlay(sn,bg,title,sub,done){
  if(V){ done?.(); return }
  V={pid:"concert",room:"concert",present:sn.who.filter(id=>byId(id)),talked:new Set(sn.who),summoned:null,event:true}; logLines=[]; setBack();
  $("#vbg").style.backgroundImage=`url(${bg})`; $("#vtitle").textContent=title; $("#vsub").textContent=sub;
  drawPeople(); $("#visit").classList.add("on"); setPause("visit",true); $("#vopts").innerHTML="";
  play(sn,()=>{ $("#visit").classList.remove("on"); $("#vlog").classList.remove("on"); setPause("visit",false); V=null; save(true); renderAll(); done?.() }) }
function result(r){
  const V0=VENUES[r.venue], el=document.createElement("div"); el.className="bigev";
  el.innerHTML=`<div class="bg-shot" style="background-image:url(${V0.art}),url(${V0.fb})"></div><div class="bg-veil"></div><div class="bigcard"><small>CONCERT REPORT ・ ${fmt(r.day)}</small>
    <h2>〈${esc(r.title)}〉<span class="nw">圓滿落幕</span></h2>${r.grade?`<div class="cgrow"><span class="cgrade g${r.grade}">${r.grade}</span><b>演出評價 ${r.score} 分</b><small>彩排完成度、成員心情、歌單安排</small></div>`:""}<p class="lead">${V0.n}・${r.att.toLocaleString()} 名觀眾${r.sold?"・<b>全場售罄</b>":""}・共 ${r.songs} 首歌。演唱會的影片在網路上被轉傳,粉絲增加了 <b>${r.gain} 萬</b>。五個人的心情和默契都大大提升了。</p>
    <button class="fbtn pri" id="cnDone">收進回憶</button></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  $("#cnDone").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false); renderAll() } }

/* =====================================================================
   第二期:企劃室「演唱會」分頁(玩家自己辦)
   ===================================================================== */
const GAP=90, AHEAD_MIN=28, AHEAD_MAX=84, REH=[21,14,7];
window.concertVenue=k=>VENUES[k]?{n:VENUES[k].n,cap:VENUES[k].cap,art:VENUES[k].art}:null;
/* 演唱會造型:造型室「演唱會」類、已經處理成遊戲立繪(sprites)的造型 */
const slotOf=mid=>Object.keys(WMEM||{}).find(k=>WMEM[k]===mid);
const hasLook=(code,mid)=>{ const l=ITEMS?.[code], s=slotOf(mid); return !!(l&&!l.deleted&&s&&l.members?.[s]?.sprites) };
const concertLooks=()=>Object.values(ITEMS||{}).filter(l=>l&&!l.deleted&&l.occasion==="演唱會"&&M.some(m=>hasLook(l.code,m.id))).sort((a,b)=>M.filter(m=>hasLook(b.code,m.id)).length-M.filter(m=>hasLook(a.code,m.id)).length);
const lookFor=(c,mid)=>{ if(c.look&&hasLook(c.look,mid)) return c.look; return c.look?concertLooks().find(l=>hasLook(l.code,mid))?.code||null:null };
const unlocked=()=>st().length>0;
const SUGGEST=["STARLIGHT","OUR TIME","FOREVER YOUNG","SCARLET NIGHT","HELLO, AGAIN"];
const songPool=()=>{ const out=[]; for(const p of [...(S.promoHist||[])].reverse()) for(const t of [p.title,...(p.tracks||[])]) if(t&&!out.includes(t)) out.push(t); return out.length?out:["出道曲"] };
const busy=day=>{ const P=window.promoInfo?.(); if(P&&day>=P.start&&day<=P.end) return true; return S.comeback!=null&&day>=S.comeback&&day<S.comeback+28 };
const earliest=()=>Math.max(S.day+AHEAD_MIN,(st().slice(-1)[0]?.day??-1e9)+GAP);
const planDays=()=>{ const out=[]; for(let d=earliest();d<=S.day+AHEAD_MAX;d++){ const w=dateOf(d).getDay(); if((w===6||w===0)&&!busy(d)) out.push(d) } return out };
const wk=d=>"日一二三四五六"[dateOf(d).getDay()];
const fmtS=d=>{const x=dateOf(d); return `${x.getMonth()+1}/${x.getDate()}`};
const minSongs=()=>Math.min(6,songPool().length);
let DR=null;   // 企劃中的草稿
function draft(days){ if(!DR){ const pool=songPool(), r=rng(seedOf(S.day,"concertDraft"));
    DR={title:"",venue:venueFor(fansMan()),day:days[0],list:pool.slice(0,Math.min(8,pool.length)),solos:[...M].sort(()=>r()-.5).slice(0,2).map(m=>m.id),look:concertLooks()[0]?.code||""} }
  if(!days.includes(DR.day)) DR.day=days[0]; return DR }
function grade(c){ const ready=Math.min(100,c.ready??25), mood=M.reduce((a,m)=>a+(S.m[m.id]?.mood??60),0)/M.length,
    n=(c.list||[]).length, sl=Math.min(100,56+Math.min(n,8)*5-(n>9?6:0)+((c.solos||[]).length===2?4:0));
  const score=Math.round(ready*.45+mood*.25+sl*.30), g=score>=85?"S":score>=70?"A":"B";
  return {g,score,mult:{S:1.3,A:1,B:.8}[g]} }
window.concertPlanRender=(B,rerender)=>{
  const c=S.concertNext, fans=fansMan(), demand=Math.round(fans*40);
  if(c){ const V0=VENUES[c.venue];
    B.innerHTML=`<div class="pdesk cplan"><div class="pcol paper"><h3>${c.first?"首場演唱會":"下一場演唱會"}</h3><p class="cpt">〈${esc(c.title)}〉</p>
      <p class="psub">${fmt(c.day)}(週${wk(c.day)})・${V0.n}(${V0.cap.toLocaleString()} 席)・還有 ${Math.max(0,c.day-S.day)} 天${c.look&&ITEMS?.[c.look]?`・造型〈${esc(ITEMS[c.look].name||"")}〉`:""}</p>
      ${c.first?`<p class="psub">首場演唱會的歌單由公司安排,當天直接演出。</p>`:`<h4>彩排完成度</h4><div class="cbar"><i style="width:${Math.min(100,c.ready??25)}%"></i></div><p class="psub">${Math.min(100,c.ready??25)}%・演出前三週每週一次彩排(已進行 ${(c.rehDone||[]).length}/3)</p>
      <button class="fbtn" id="cpCancel">取消這場</button>`}</div>
      <div class="pcol paper"><h4>歌單</h4><ol class="csl ro">${setlist(c).filter(s=>s.k==="song"||s.k==="solo").map(s=>`<li><b>${esc(s.t)}</b>${s.k==="solo"?`<small>個人舞台・${byId(s.id).n}</small>`:s.fan?"<small>安可</small>":""}</li>`).join("")}</ol></div></div>`;
    B.querySelector("#cpCancel")?.addEventListener("click",()=>{ if(!confirm("確定取消這場演唱會嗎?")) return; S.concertNext=null; save(true); toast2("演唱會取消了,可以重新企劃"); rerender() }); return }
  if(!unlocked()){ B.innerHTML=`<div class="pdesk cplan"><div class="pcol paper"><h3>演唱會</h3><p class="psub">首場演唱會〈PERFECT DAY〉會在出道一週年由公司安排。辦完之後,就可以在這裡自己企劃下一場:場館、日期、歌單都由你決定。</p></div></div>`; return }
  const days=planDays();
  if(!days.length){ const e=earliest(); B.innerHTML=`<div class="pdesk cplan"><div class="pcol paper"><h3>演唱會企劃</h3><p class="psub">兩場演唱會至少要隔三個月,而且要選 4~12 週後、不撞打歌期的週末。下一場最早可以辦在 ${fmt(e)},${fmt(e-AHEAD_MAX)} 起可以開始企劃。</p></div></div>`; return }
  const D=draft(days), pool=songPool(), mn=minSongs(), okN=D.list.length>=mn&&D.list.length<=10, title=D.title.trim()||SUGGEST[0];
  B.innerHTML=`<div class="pdesk cplan">
    <div class="pcol paper"><h3>演唱會企劃</h3>
      <input class="pin-in big" id="cpTitle" value="${esc(D.title)}" placeholder="演唱會標題(例如 ${esc(SUGGEST[0])})" maxlength="24">
      <div class="pchips">${SUGGEST.map(t=>`<button class="pchip" data-ct="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <h4>場館<small>粉絲 ${window.fansText?.()||""}・想來的人約 ${demand.toLocaleString()} 人</small></h4>
      <div class="cvens">${Object.entries(VENUES).map(([k,v])=>{ const fill=Math.min(100,Math.round(demand/v.cap*100));
        return `<button class="cven${D.venue===k?" on":""}" data-cv="${k}"><b>${v.n}</b><small>${v.cap.toLocaleString()} 席・預估 ${fill}%${fill>=100?"・可能售罄":""}</small></button>` }).join("")}</div>
      <h4>日期<small>4~12 週後的週末</small></h4>
      <div class="pchips cdays">${days.map(d=>`<button class="pchip${d===D.day?" on":""}" data-cd="${d}">${fmtS(d)}<small>週${wk(d)}</small></button>`).join("")}</div></div>
    <div class="pcol paper"><h4>歌單<small>${D.list.length} 首(${mn}~10 首)</small></h4>
      <ol class="csl">${D.list.map((t,i)=>`<li><b>${esc(t)}</b><button data-up="${i}" aria-label="往前">↑</button><button data-dn="${i}" aria-label="往後">↓</button><button data-rm="${i}" aria-label="拿掉">×</button></li>`).join("")}</ol>
      ${pool.some(t=>!D.list.includes(t))?`<div class="pchips">${pool.filter(t=>!D.list.includes(t)).map(t=>`<button class="pchip" data-add="${esc(t)}">+ ${esc(t)}</button>`).join("")}</div>`:""}
      <h4>個人舞台<small>選兩位</small></h4>
      <div class="pchips">${M.map(m=>`<button class="pchip${D.solos.includes(m.id)?" on":""}" data-so="${m.id}">${m.n}<small>〈${SOLO[m.id]}〉</small></button>`).join("")}</div>
      <h4>演唱會造型<small>造型室「演唱會」類</small></h4>
      ${concertLooks().length?`<div class="pchips">${[["","不指定"],...concertLooks().map(l=>[l.code,l.name||"未命名"])].map(([k,n])=>`<button class="pchip${(D.look||"")===k?" on":""}" data-lk="${esc(k)}">${esc(n)}${k?`<small>${M.filter(m=>hasLook(k,m.id)).length}/5 人</small>`:""}</button>`).join("")}</div>
        <p class="psub">演出時台上會換成這套造型;沒有這套的成員穿她自己的其他演唱會造型。</p>`:`<p class="psub">造型室還沒有處理成遊戲立繪的「演唱會」造型。有的話,演出時台上會換成那套造型。</p>`}
      <p class="psub">安可固定是粉絲之歌〈${FAN_SONG}〉。決定之後,演出前三週每週一次彩排。</p>
      <button class="fbtn pri" id="cpGo" ${okN&&D.solos.length===2?"":"disabled"}>決定舉辦〈${esc(title)}〉</button></div></div>`;
  const q=s=>B.querySelectorAll(s);
  B.querySelector("#cpTitle").oninput=e=>{ D.title=e.target.value; const b=B.querySelector("#cpGo"); if(b) b.textContent=`決定舉辦〈${D.title.trim()||SUGGEST[0]}〉` };
  q("[data-ct]").forEach(b=>b.onclick=()=>{ D.title=b.dataset.ct; rerender() });
  q("[data-cv]").forEach(b=>b.onclick=()=>{ D.venue=b.dataset.cv; rerender() });
  q("[data-cd]").forEach(b=>b.onclick=()=>{ D.day=+b.dataset.cd; rerender() });
  q("[data-up]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.up; if(i>0) [D.list[i-1],D.list[i]]=[D.list[i],D.list[i-1]]; rerender() });
  q("[data-dn]").forEach(b=>b.onclick=()=>{ const i=+b.dataset.dn; if(i<D.list.length-1) [D.list[i+1],D.list[i]]=[D.list[i],D.list[i+1]]; rerender() });
  q("[data-rm]").forEach(b=>b.onclick=()=>{ D.list.splice(+b.dataset.rm,1); rerender() });
  q("[data-add]").forEach(b=>b.onclick=()=>{ if(D.list.length<10) D.list.push(b.dataset.add); else toast2("歌單最多 10 首"); rerender() });
  q("[data-lk]").forEach(b=>b.onclick=()=>{ D.look=b.dataset.lk; rerender() });
  q("[data-so]").forEach(b=>b.onclick=()=>{ const id=b.dataset.so; D.solos=D.solos.includes(id)?D.solos.filter(x=>x!==id):[...D.solos.slice(-1),id]; rerender() });
  B.querySelector("#cpGo").onclick=()=>{ if(S.concertNext) return;
    S.concertNext={day:D.day,venue:D.venue,title:D.title.trim()||SUGGEST[0],list:[...D.list],solos:[...D.solos],look:D.look||"",first:false,announced:S.day,ready:25,rehDone:[]};
    DR=null; save(true); rerender(); setTimeout(()=>announce(S.concertNext),300) } };
/* 演出後 STARLOG 自動發文(配這場的場館照片),另一位成員在底下留言 */
const POST={ys:"〈{t}〉,謝謝今天來到{v}的每一位。那片手燈海,我會一直記得。",he:"〈{t}〉結束了!大家回家路上小心喔~今天真的好幸福💗",
  hr:"〈{t}〉辛苦了!!!下次還要一起大聲唱!!",tr:"〈{t}〉。……今天的舞台,謝謝你們。",hy:"〈{t}〉ありがとう!{v}、本当に最高でした!"};
const REPLY={ys:"大家今天都好棒。",he:"最後的安可我哭了啦……",hr:"我嗓子啞了但是好開心!!",tr:"……下一場,會更好。",hy:"みんな、おつかれさま!"};
function post(c,res,V0){ const ids=M.map(m=>m.id), a=ids[st().length%5], b=ids[(st().length+2)%5], fill=t=>t.replace("{t}",c.title).replace("{v}",V0.n);
  window.phonePost?.({id:a,lines:[[a,fill(POST[a])],[b,REPLY[b]]],img:V0.art,big:true,code:"concert-post-"+c.day}) }
async function announce2(c){
  const V0=VENUES[c.venue], gate=await pick(ART.gate), el=document.createElement("div"); el.className="bigev";
  const lines=[["he","又要辦演唱會了!這次要準備什麼驚喜好呢?","laugh"],["ys","〈"+c.title+"〉……我會讓它比上一場更好。","smile"],["hr","代表,彩排的時候要來看喔!","laugh"]];
  el.innerHTML=`<div class="bg-shot" style="background-image:url(${gate})"></div><div class="bg-veil"></div><div class="bigcard"><small>CONCERT ・ ${fmt(c.day)}</small>
    <h2>演唱會〈${esc(c.title)}〉決定了</h2><p class="lead">完美女團的演唱會定在 ${fmt(c.day)},場地是 ${V0.n}(${V0.cap.toLocaleString()} 席)。從現在起,演出前三週每週會有一次彩排。</p>
    <div class="evlines">${lines.map(([id,t,e])=>{const m=byId(id);return `<div class="evl"><span class="pface" style="--c:${m.c};background-image:url(${spr(id,null,e)})"></span><p><b style="color:${m.c}">${m.n}</b>${esc(t)}</p></div>`}).join("")}</div>
    <button class="fbtn pri" id="cnOk">開始準備</button></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  $("#cnOk").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false); renderAll() } }
/* 彩排:演出前 21、14、7 天的清晨。去探班(看彩排劇情)+25%,交給她們 +18% */
function rehearsal(){ const c=S.concertNext; if(!c||c.first) return; const left=c.day-S.day; if(!REH.includes(left)||(c.rehDone||[]).includes(left)) return;
  c.rehDone=[...(c.rehDone||[]),left]; save(true); setTimeout(()=>rehCard(c,left),900) }
async function rehCard(c,left){
  if($("#cnView")||$(".bigev:not(.out)")||document.querySelector("#visit.on")){ setTimeout(()=>rehCard(c,left),1500); return }
  const V0=VENUES[c.venue], bg=await pick(["assets/bg/practice_day.webp","assets/bg/ev_stage.webp"]), el=document.createElement("div"); el.className="bigev";
  el.innerHTML=`<div class="bg-shot" style="background-image:url(${bg})"></div><div class="bg-veil"></div><div class="bigcard"><small>REHEARSAL ・ 演唱會前 ${left/7} 週</small>
    <h2>〈${esc(c.title)}〉彩排</h2><p class="lead">今天是 ${V0.n} 演唱會的彩排,五個人從早上就在練習室裡跑整場流程。目前完成度 ${Math.min(100,c.ready??25)}%。</p>
    <div class="cbtns"><button class="fbtn" id="rhSkip">交給她們練</button><button class="fbtn pri" id="rhGo">去探班</button></div></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  const done=add=>{ c.ready=Math.min(100,(c.ready??25)+add); el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false); save(true) };
  $("#rhSkip").onclick=()=>{ done(18); toast2(`彩排完成度 ${c.ready}%`); renderAll() };
  $("#rhGo").onclick=()=>{ done(25);
    const sn0={code:"concert-rehearsal-"+S.day,type:"event",who:M.map(m=>m.id),member:"ys",sc:"練習室的鏡子前,五個人正在跑演唱會的流程,音響裡放著〈"+c.title+"〉的歌單。",nodes:{start:{L:[
      ["tr","第三首換位的地方,日和,妳慢了半拍。","neutral"],["hy","ごめん!再來一次!","shy"],["hr","代表來了!代表你看,我們新加的那段舞!","laugh"],["he","大家先喝水啦,休息五分鐘。","smile"],["ys","代表,你覺得哪一段最需要再加強?","smile"]],
      C:[{t:"「換位那段再對一次,其他都很好。」",s:"鼓勵",to:"tr",g:2,r:[["tr","……嗯,我也這麼覺得。","smile"]]},{t:"「先休息吧,大家都練很久了。」",s:"安慰",to:"he",g:2,r:[["he","對嘛!代表最懂了!","laugh"]]}]}}};
    const sn=window.eventSnip?.("concert_rehearsal",sn0)||sn0; scenePlay(sn,bg,"演唱會彩排",`${V0.n}・完成度 ${c.ready}%`,()=>{ toast2(`彩排完成度 ${c.ready}%`) }) } }

/* ---- 接上每天開始的檢查 ---- */
const prev=window.timelineOnDayStart;
window.timelineOnDayStart=()=>{ prev?.(); try{ scheduleFirst(); rehearsal(); concertDay() }catch(e){ console.error(e) } };
window.concertUnlocked=unlocked;
})();
