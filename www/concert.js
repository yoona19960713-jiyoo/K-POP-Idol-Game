"use strict";
/* =====================================================================
   演唱會(2026-10-25 起)
   第一期:出道一週年的「首場演唱會」大事件(一個月前宣布,當天全螢幕演出、後台、結算)。
   第二期(之後):企劃室的「演唱會」分頁可以自己辦(場館、日期、歌單、造型)。第三期:海外巡迴。
   演出畫面:場館舞台背景(從觀眾席看,台上是逆光的小人影)+ 手燈海(canvas)+ 舞台光束 + 大螢幕特寫(成員臉部)。
   美術還沒到時用現有的事件背景代替(CONCERT_ART 裡的 fallback)。
   ===================================================================== */
(()=>{
const DEBUT=()=>window.DEBUT_DAY;
const VENUES={
  hall:{n:"星環 Live Hall",cap:3000,art:"assets/bg/concert_hall.webp",fb:"assets/bg/ev_stage.webp"},
  arena:{n:"漢江體育館",cap:12000,art:"assets/bg/concert_arena.webp",fb:"assets/bg/ev_festival.webp"},
  dome:{n:"首爾巨蛋",cap:25000,art:"assets/bg/concert_dome.webp",fb:"assets/bg/ev_festival.webp"}};
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
  const titles=[...new Set((S.promoHist||[]).map(p=>p.title).filter(Boolean))].reverse(); if(!titles.length) titles.push("出道曲");
  const r=rng(seedOf(c.day,"setlist")), solos=[...M].sort(()=>r()-.5).slice(0,2);
  const L=[{k:"vcr"},{k:"song",t:titles[0]}];
  titles.slice(1,4).forEach(t=>L.push({k:"song",t}));
  L.push({k:"mc",who:["ys","he","hr"]});
  solos.forEach(m=>L.push({k:"solo",id:m.id,t:SOLO[m.id]}));
  if(titles.length>1) L.push({k:"song",t:titles[1]});
  L.push({k:"mc",who:["tr","hy"]},{k:"encore"},{k:"song",t:FAN_SONG,fan:true},{k:"end"});
  return L }
const MC={ys:"今天來到這裡的每一位,謝謝你們。一年前的我們,連做夢都不敢想有這麼多的手燈。",he:"我剛剛偷看了一下……真的是一整片的紅色海洋!大家今天吃飽了嗎?",
  hr:"下一首,是我們第一次在大家面前唱的歌,要一起大聲唱喔!",tr:"……說實話,剛剛上台前有點緊張。但現在,只想再多唱一首。",hy:"みなさん、ありがとう!一年間、本当にありがとうございました!"};

/* ---- 演出畫面 ---- */
async function runConcert(c){
  const V0=VENUES[c.venue], bg=await pick([V0.art,V0.fb]), L=setlist(c);
  const el=document.createElement("div"); el.id="cnView"; el.className="cnview";
  el.innerHTML=`<div class="cnbg" style="background-image:url(${bg})"></div><div class="cnbeams"></div><canvas class="cnsticks"></canvas>
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
  const step=()=>{ clearTimeout(timer); if(i>=L.length) return finish(); const s=L[i++]; LN.classList.remove("on"); T.classList.remove("on"); el.classList.remove("dark","encore");
    if(s.k==="vcr"){ el.classList.add("dark"); T.querySelector("small").textContent=`PERFECT GIRL GROUP ${c.first?"1ST ":""}CONCERT`; T.querySelector("b").textContent=`〈${c.title}〉`; T.classList.add("on","big"); wave=.3; timer=setTimeout(step,3200); return }
    T.classList.remove("big");
    if(s.k==="song"||s.k==="solo"){ col=s.fan?"#FF2E63":LIGHT[songs.length%LIGHT.length]; songs.push(s); wave=s.fan?.6:1.2;
      el.style.setProperty("--beam",col); T.querySelector("small").textContent=s.k==="solo"?`SOLO STAGE ・ ${byId(s.id).n}`:s.fan?"ENCORE ・ 粉絲之歌":`SONG ${songs.length}`;
      T.querySelector("b").textContent=`〈${s.t}〉`; T.classList.add("on");
      const focus=s.k==="solo"?s.id:M[(songs.length*2)%M.length].id; setTimeout(()=>screen(focus),900);
      if(s.fan) setTimeout(()=>say("ys","這首歌,要送給一路陪著我們的你們。","smile"),1200);
      timer=setTimeout(()=>{screen(null);step()},s.fan?6000:4400); return }
    if(s.k==="mc"){ screen(null); wave=.4; let j=0; const nx=()=>{ if(j>=s.who.length){ step(); return } const id=s.who[j++]; say(id,MC[id],"smile"); timer=setTimeout(nx,3600) }; LN.onclick=e=>{e.stopPropagation(); clearTimeout(timer); nx()}; nx(); return }
    if(s.k==="encore"){ el.classList.add("dark","encore"); wave=2; col="#FF2E63"; T.querySelector("small").textContent="燈暗了,台下的手燈卻沒有一支熄滅"; T.querySelector("b").textContent="安可!安可!"; T.classList.add("on"); timer=setTimeout(step,3600); return }
    if(s.k==="end"){ el.classList.add("finale"); wave=.8; T.querySelector("small").textContent="THANK YOU"; T.querySelector("b").textContent="完美女團,謝謝大家!"; T.classList.add("on"); timer=setTimeout(step,3800) } };
  el.onclick=e=>{ if(e.target.closest(".cnskip")) return; step() };
  $c(".cnskip").onclick=e=>{ e.stopPropagation(); skip=true; i=L.length; step() };
  step();
  async function finish(){ cancelAnimationFrame(raf);
    const att=Math.min(V0.cap,Math.round(fansMan()*40)), sold=att>=V0.cap, gain=Math.max(2,Math.round(att/500*(sold?1.3:1)));
    const res={day:c.day,venue:c.venue,title:c.title,att,sold,gain,songs:songs.length,first:!!c.first};
    st().push(res); S.concertNext=null; S.stats=S.stats||{fans:0,wins:0,winsByYear:{},firstWin:false,awards:[]}; S.stats.fans+=gain;
    for(const m of M){ const s=S.m[m.id]; s.mood=Math.min(100,s.mood+20); s.xp=(s.xp||0)+150 } window.addBond?.(M.map(x=>x.id),4); save(true);
    const cg=c.first?await pick(ART.firstCG):null;
    const close=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("concert",false); backstage(c,()=>result(res)) };
    if(cg){ el.innerHTML=`<div class="cnbg" style="background-image:url(${cg});animation:none"></div><div class="cncap"><small>MEMORY ・ 首場演唱會</small><h2>「謝幕,和一整片的手燈海」</h2><p>五個人牽著手,對著看不到盡頭的光海,深深地鞠了一躬。</p></div><button class="cnskip" style="opacity:1">繼續 ›</button>`;
      S.cgExtra=[...new Set([...(S.cgExtra||[]),"concert_first"])]; save(true); el.onclick=close }
    else close() } }

/* ---- 後台:一段固定劇情(全員在場),用對話畫面演出 ---- */
async function backstage(c,done){
  const bg=await pick(ART.backstage);
  const sn={code:"concert-backstage-"+c.day,type:"event",who:M.map(m=>m.id),member:"ys",
    sc:"演出結束後的後台,花束堆滿了整張桌子,外面還聽得到粉絲在喊她們的名字。",nodes:{start:{L:[
      ["hr","代表!你有看到嗎?最後那首,台下全部的人都在唱!","laugh"],["he","我哭到妝都花了……不准拍照喔。","shy"],
      ["hy","手燈の海、本当にきれいだった……代表,謝謝你讓我們站上那裡。","smile"],["tr","……我第一次覺得,舞台結束的時候會捨不得。","shy"],
      ["ys","代表,一年前你說會讓我們站上最好的舞台。","smile"],["ys","今天,我們真的站上去了。","laugh"]],
    C:[{t:"「這只是開始。下一次,我們去更大的場館。」",s:"約定",to:"ys",g:2,r:[["ys","……嗯。我們說好了。","shy"],["hr","耶——巨蛋!我們要去巨蛋!","laugh"]]},
       {t:"「妳們今天,是我見過最耀眼的舞台。」",s:"稱讚",to:"he",g:2,r:[["he","代表……你這樣說,我又要哭了啦。","shy"],["tr","……謝謝。我會記住這句話。","smile"]]}]}}};
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
    <h2>〈${esc(r.title)}〉圓滿落幕</h2><p class="lead">${V0.n}・${r.att.toLocaleString()} 名觀眾${r.sold?"・<b>全場售罄</b>":""}・共 ${r.songs} 首歌。演唱會的影片在網路上被轉傳,粉絲增加了 <b>${r.gain} 萬</b>。五個人的心情和默契都大大提升了。</p>
    <button class="fbtn pri" id="cnDone">收進回憶</button></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  $("#cnDone").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false); renderAll() } }

/* ---- 接上每天開始的檢查 ---- */
const prev=window.timelineOnDayStart;
window.timelineOnDayStart=()=>{ prev?.(); try{ scheduleFirst(); concertDay() }catch(e){ console.error(e) } };
})();
