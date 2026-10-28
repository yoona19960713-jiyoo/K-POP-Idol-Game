"use strict";
/* =====================================================================
   開場與離開遊戲的動畫(2026-10-27,使用者選:開場=五人輪流「結尾妖精」+ 舞台點燈,離開=成員道晚安,各約 6~7 秒)
   開場(冷啟動才播):黑幕拉出金線 → 五人依序登場(日和→河嵐→夏恩→泰梨→藝瑟,由外往內、C 位最後;各自的聚光燈、名牌、星光)
         → 白光一閃、舞台全亮、主視覺上五道成員色光束由中間往兩邊亮起、標題金字一道光掃過 → 「點擊畫面開始」。
         按開始:白光一閃,地圖從稍微放大定位,上方時間卡與右上按鈕、地圖名牌依序進場。
   離開(選單「離開遊戲」、返回鍵連按兩次):今天最後跟你說話的成員(沒有就依親密度抽)穿著當下的衣服走進來道別,
         台詞依關係階段 × 時段(五人各自的口氣)。同時把存檔、雲端同步做完(最多等約 4.5 秒),最後「晚安」字卡。
         APK:結束後關閉 App(Capacitor App 外掛);網頁版不能自己關分頁,停在字卡,可以「繼續玩」。
   點一下就跳過;系統開「減少動態效果」時只用淡入淡出。
   流暢度(A55):只動 transform/translate/scale 與 opacity,整條時間軸一次交給 Web Animations(合成器執行,
         主執行緒在讀存檔時也不會卡);不做模糊、不動態改濾鏡;所有圖先解碼好才開始。
   結尾妖精的圖:assets/intro/fairy_<成員>.webp(1920×1080,2026-10-27 換成正式圖;成員在畫面左 1/3、右 1/3 或中間,見 FAIRY 的 side、fx、fy)。
   ===================================================================== */
(()=>{
const RMQ=matchMedia("(prefers-reduced-motion:reduce)");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e };
const decodeImg=src=>{ const i=new Image(); i.decoding="async"; i.src=src; const p=i.decode?i.decode():new Promise((ok,no)=>{i.onload=ok;i.onerror=no}); return p.then(()=>i,()=>null) };
const logE=e=>{ try{ window.logErr?.("intro",e) }catch(_){} };

/* ============================== 開場 ============================== */
/* side:成員在畫面的哪一邊(名牌放另一邊);l=左 1/3、r=右 1/3、c=中間(名牌在下方);fx、fy=正式圖裡臉的位置(%)
   順序(2026-10-27 使用者改):站位由左到右 日和、夏恩、藝瑟、泰梨、河嵐 → 由外往內輪流登場,藝瑟(C 位)最後,接到全體主視覺 */
const FAIRY=[
  {id:"hy",f:"hiyori",en:"HIYORI",cn:"早瀨日和",role:"MAIN DANCER · SUB VOCAL",c:"#C9A35E",side:"l",fx:32,fy:31},
  {id:"hr",f:"haram", en:"HARAM", cn:"姜河嵐",role:"MAIN VOCAL · MAKNAE",c:"#7FAF2C",side:"r",fx:63,fy:16},
  {id:"he",f:"haeun", en:"HAEUN", cn:"韓夏恩",role:"VISUAL · CENTER · SUB RAPPER",c:"#E9746A",side:"l",fx:30,fy:31},
  {id:"tr",f:"taeri", en:"TAERI", cn:"尹泰梨",role:"MAIN RAPPER · LEAD DANCER",c:"#C8102E",side:"r",fx:67,fy:34},
  {id:"ys",f:"yeseul",en:"YESEUL",cn:"徐藝瑟",role:"LEADER · LEAD VOCAL · LEAD DANCER",c:"#7B4FBF",side:"c",fx:49,fy:22}];
/* 主視覺上五人站的位置(%)與亮燈順序(由中間往兩邊)。跟 assets/bg/title.webp 綁在一起:換新主視覺(藝瑟在中間的新站位)時要照新圖量過再改 */
const BEAMS=[{x:50.5,c:"#7B4FBF",o:0},{x:36.5,c:"#E9746A",o:1},{x:65,c:"#C8102E",o:1},{x:24.5,c:"#C9A35E",o:2},{x:76,c:"#7FAF2C",o:2}];   // 新主視覺(2026-10-27):日和、夏恩、藝瑟、泰梨、河嵐
/* 時間軸(秒) */
const SEAM=.05, S0=.55, STEP=1.0, LASTD=1.3;
const START=FAIRY.map((_,i)=>S0+STEP*i);            // .55 1.55 2.55 3.55 4.55
const REVEAL=START[4]+LASTD;                          // 5.85:舞台全亮
const READY=REVEAL+.85;                               // 6.7:可以按開始

let IN=null;                 // 開場進行中的狀態
const stableFrames=cap=>new Promise(res=>{ const t0=performance.now(); let last=t0, ok=0;
  const f=t=>{ const d=t-last; last=t; ok=d<28?ok+1:0; if((ok>=5&&t-t0>160)||t-t0>cap) res(); else requestAnimationFrame(f) };
  requestAnimationFrame(f) });
const glints=side=>{ const base=side==="l"?33:side==="r"?67:50, out=[];
  const P=[[-15,22,2.6],[14,16,1.8],[-9,48,1.6],[17,40,2.2],[-20,64,1.3],[6,9,1.2]];
  for(const [dx,y,s] of P) out.push({x:base+dx,y,s}); return out };

function buildIntro(title){
  const ti=el("div","ti"); ti.id="ti"; ti.setAttribute("aria-hidden","true");
  ti.appendChild(el("div","ti-wait","<i></i>"));
  ti.appendChild(el("div","ti-seam"));
  for(const m of FAIRY){
    const s=el("div","ti-shot "+m.side); s.style.setProperty("--c",m.c); if(m.fx!=null){ s.style.setProperty("--ox",m.fx+"%"); s.style.setProperty("--oy",m.fy+"%") }   // 臉的位置:鏡頭往這裡推、聚光燈打在這裡
    s.innerHTML=`<img class="ti-img" alt="" decoding="async" data-src="assets/intro/fairy_${m.f}.webp"><i class="ti-shade"></i><i class="ti-sweep"></i><i class="ti-beam"></i><i class="ti-src"></i>`+
      glints(m.side).map(g=>`<i class="ti-gl" style="--x:${g.x}%;--y:${g.y}%;--s:${g.s}"></i>`).join("")+
      `<div class="ti-name mtheme" data-m="${m.id}"><i class="ti-rule"></i><i class="ti-emb"></i><b><u>${m.en}</u></b><span>${m.cn}</span><em>${m.role}</em></div>`;
    ti.appendChild(s) }
  const conf=el("div","ti-conf"); const KS=["#E9CF8F","#C8102E","#F3D9A4","#8E1430","#FFF3E0","#B8323F"];
  for(let i=0;i<14;i++){ const c=el("i"); c.style.cssText=`--x:${(i*7.3+3)%98}%;--w:${(.7+((i*37)%5)*.16).toFixed(2)};--k:${KS[i%KS.length]}`; conf.appendChild(c) }
  ti.appendChild(conf);
  ti.appendChild(el("div","ti-flash"));
  ti.appendChild(el("div","ti-skip","點一下跳過"));
  title.appendChild(ti);
  // 主視覺上的燈與暗幕、標題的掃光
  const bg=title.querySelector(".tt-shade");
  const dim=el("div","tt-dim"), beams=el("div","tt-beams");
  beams.innerHTML=BEAMS.map(b=>`<i style="--x:${b.x}%;--c:${b.c}"></i>`).join("");
  bg?.after(beams); beams.after(dim);
  const h1=title.querySelector(".tt-logo h1"); if(h1){ const sh=el("span","tt-sheen","完美女團"); sh.setAttribute("aria-hidden","true"); h1.appendChild(sh) }
  return ti }

/* 一個動畫:時間單位秒;回傳 Animation(全部收集起來,跳過時一起結束) */
function A(list,node,kf,dur,delay,easing,fill){ if(!node) return null;
  try{ const a=node.animate(kf,{duration:dur*1000,delay:delay*1000,easing:easing||"linear",fill:fill||"both"}); list.push(a); return a }catch(e){ logE(e); return null } }

function playIntro(title,ti,withShots){
  const L=IN.anims, q=s=>ti.querySelector(s), OUT="cubic-bezier(.16,.84,.3,1)", SOFT="cubic-bezier(.4,0,.2,1)";
  ti.classList.add("go");
  if(withShots){
    // 金線:從中間往兩邊拉開,第一位登場時淡掉
    A(L,q(".ti-seam"),[{scale:"0 1",opacity:0},{scale:".35 1",opacity:1,offset:.25},{scale:"1 1",opacity:1,offset:.75},{scale:"1.05 1",opacity:0}],.8,SEAM,SOFT);
    const shots=[...ti.querySelectorAll(".ti-shot")];
    shots.forEach((s,i)=>{ const t=START[i], d=(i<4?START[i+1]-t:REVEAL-t)+.3, m=FAIRY[i], dir=m.side==="l"?-1:m.side==="r"?1:0;
      // 畫面:淡入,下一位完全出現後才淡出(中間不會露黑)
      const fin=.16/d, hold=(d-.1)/d;
      A(L,s,[{opacity:0},{opacity:1,offset:fin},{opacity:1,offset:hold},{opacity:0}],d,t,"linear");
      // 結尾妖精的鏡頭:快速推近再停住,最後還在很慢地推
      A(L,s.querySelector(".ti-img"),[{scale:1.0,translate:`${dir*-.8}% 0`},{scale:1.075,translate:"0 0",offset:.62},{scale:1.095,translate:"0 0"}],d,t,OUT);
      // 聚光燈:打下來一亮,再穩定
      A(L,s.querySelector(".ti-beam"),[{opacity:0,scale:".7 .9"},{opacity:.95,scale:"1 1",offset:.14},{opacity:.42,scale:"1 1",offset:.5},{opacity:.36,scale:"1.04 1"}],d,t,"ease-out");
      A(L,s.querySelector(".ti-src"),[{opacity:0,scale:.6},{opacity:1,scale:1.08,offset:.12},{opacity:.7,scale:1}],d,t,"ease-out");
      // 舞台光掃過
      const sw=s.querySelector(".ti-sweep"), from=dir>=0?"-40cqw 0":"120cqw 0", to=dir>=0?"120cqw 0":"-40cqw 0";
      A(L,sw,[{translate:from,opacity:0},{opacity:1,offset:.2},{opacity:1,offset:.8},{translate:to,opacity:0}],.95,t+.12,SOFT);
      // 星光
      s.querySelectorAll(".ti-gl").forEach((g,k)=>A(L,g,[{scale:0,rotate:"0deg",opacity:0},{scale:1,rotate:"45deg",opacity:1,offset:.45},{scale:0,rotate:"90deg",opacity:0}],.62,t+.18+k*.11,"ease-in-out"));
      // 名牌
      const nm=s.querySelector(".ti-name"), sx=dir===0?"0 1.2cqw":`${dir*-2.2}cqw 0`;
      A(L,nm.querySelector(".ti-rule"),[{scale:"0 1"},{scale:"1 1"}],.5,t+.1,OUT);
      A(L,nm.querySelector(".ti-emb"),[{opacity:0,scale:.5,rotate:"-30deg"},{opacity:1,scale:1,rotate:"0deg"}],.45,t+.14,OUT);
      A(L,nm.querySelector("b"),[{opacity:0,translate:sx},{opacity:1,translate:"0 0"}],.5,t+.16,OUT);
      A(L,nm.querySelector("span"),[{opacity:0,translate:sx},{opacity:1,translate:"0 0"}],.5,t+.26,OUT);
      A(L,nm.querySelector("em"),[{opacity:0},{opacity:1}],.45,t+.36,"ease-out");
    });
    // 每次換人時的閃光(像舞台頻閃),最後一下大閃轉場到主視覺
    const fl=q(".ti-flash"), T=REVEAL+.9, kf=[{opacity:0,offset:0}];
    const pulse=(at,peak,len)=>{ kf.push({opacity:0,offset:Math.max(0,(at-.03)/T)},{opacity:peak,offset:(at+.04)/T},{opacity:0,offset:Math.min(1,(at+len)/T)}) };
    pulse(START[0],.22,.35); for(let i=1;i<5;i++) pulse(START[i],.42,.3); pulse(REVEAL,.85,.75);
    kf.sort((a,b)=>a.offset-b.offset); kf.push({opacity:0,offset:1});
    A(L,fl,kf,T,0,"linear");
    // 紙花:第二位登場後開始飄
    ti.querySelectorAll(".ti-conf i").forEach((c,i)=>{ const d=2.6+(i%4)*.45, dl=1.4+(i*0.29)%2.6, dx=(i%2?1:-1)*(2+i%3);
      A(L,c,[{opacity:0,translate:"0 0",rotate:"0deg"},{opacity:.95,offset:.08},{opacity:.9,offset:.85},{opacity:0,translate:`${dx}cqw 62cqw`,rotate:`${(i%2?1:-1)*(260+i*40)}deg`}],d,dl,"linear") });
    A(L,q(".ti-skip"),[{opacity:0},{opacity:1}],.6,1.0,"ease-out");
    A(L,q(".ti-skip"),[{opacity:1},{opacity:0}],.3,REVEAL-.2,"ease-out","forwards");
    // 開場層整個在白光最亮時退場
    A(L,ti,[{opacity:1},{opacity:1,offset:.5},{opacity:0}],.24,REVEAL-.02,"linear","forwards");
  }
  revealTitle(title,withShots?REVEAL:0,L,!withShots);
}

/* 舞台全亮:暗幕退去、五道光束由中間往兩邊亮起、標題金字、掃光、開始鍵 */
function revealTitle(title,at,L,fromBlack){
  const q=s=>title.querySelector(s), OUT="cubic-bezier(.16,.84,.3,1)";
  const ti=q(".ti");
  if(fromBlack&&ti) A(L,ti,[{opacity:1},{opacity:0}],.7,at,"ease-out","forwards");
  A(L,q(".tt-dim"),[{opacity:1},{opacity:1,offset:.08},{opacity:0}],1.1,at,"ease-out");
  A(L,q(".tt-bg"),[{scale:1.06},{scale:1}],1.6,at,OUT);
  q(".tt-beams")?.querySelectorAll("i").forEach((b,i)=>{ const o=BEAMS[i].o, t=at+.1+o*.13;
    A(L,b,[{opacity:0,scale:".6 .85"},{opacity:.9,scale:"1 1",offset:.18},{opacity:.26,scale:"1 1"}],1.5,t,"ease-out") });
  A(L,q(".tt-logo"),[{opacity:0,translate:"0 -1cqw"},{opacity:1,translate:"0 0"}],1.0,at+.3,OUT);
  A(L,q(".tt-logo small"),[{opacity:0},{opacity:1}],.8,at+.5,"ease-out");
  A(L,q(".tt-logo p"),[{opacity:0,translate:"0 .6cqw"},{opacity:1,translate:"0 0"}],.8,at+.62,OUT);
  const sh=q(".tt-sheen"); if(sh){ A(L,sh,[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.85},{opacity:0}],1.1,at+.85,"linear");
    A(L,sh,[{backgroundPosition:"160% 0"},{backgroundPosition:"-60% 0"}],1.1,at+.85,"cubic-bezier(.45,.05,.55,.95)") }
  A(L,q(".tt-start"),[{opacity:0,translate:"0 .8cqw"},{opacity:1,translate:"0 0"}],.6,at+.75,OUT);
  A(L,q(".tt-sync"),[{opacity:0},{opacity:1}],.6,at+.9,"ease-out");
}

/* 中文字型的其他切片(fonts.css 的 r1~r4、misc):開場與標題畫面時主執行緒是空的,趁空檔一片一片先載好,
   進遊戲後對話裡的字就不用再臨時載入(臨時載入會先用系統字、再閃一下換字型)。罕用字字型 PGG Kai X 不預載 */
function preloadFontSlices(){
  if(!document.fonts||window.__fontPre) return; window.__fontPre=1;
  const groups=new Map();
  for(const f of document.fonts){ const fam=String(f.family).replace(/["']/g,""); if(fam!=="PGG Serif"&&fam!=="PGG Sans") continue;
    const k=fam+"|"+f.weight; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(f) }
  const lists=[...groups.values()], order=[];
  for(let i=0;i<8;i++) for(const l of lists) if(l[i]&&l[i].status==="unloaded"&&!/2[0-4][0-9A-F]{2}/.test(l[i].unicodeRange.slice(0,12))) order.push(l[i]);   // 各字型的 r1(其餘的字);misc 罕用符號用到才載
  const idle=window.requestIdleCallback||(cb=>setTimeout(()=>cb({timeRemaining:()=>16}),250));
  const next=()=>{ const f=order.shift(); if(!f) return; if(f.status!=="unloaded") return next();
    idle(()=>{ f.load().catch(()=>{}).finally(()=>setTimeout(next,80)) },{timeout:1500}) };
  next() }
window.preloadFontSlices=preloadFontSlices;

/* 結束(自然播完或跳過):標題回到一般狀態,收掉開場用的圖層 */
function endIntro(title){ if(!IN||IN.done) return; IN.done=true; setTimeout(preloadFontSlices,400);   // 其餘的字在開場結束後、標題畫面靜止時載(載入會讓文字重新排版,開場中載會頓)
  document.getElementById("stage")?.classList.remove("intro-solo");
  title.classList.remove("intro"); title.classList.add("played");
  for(const a of IN.anims){ try{ a.cancel() }catch(e){} }
  title.querySelector(".ti")?.remove(); title.querySelector(".tt-dim")?.remove();
  const bm=title.querySelector(".tt-beams"); if(bm) bm.querySelectorAll("i").forEach(b=>b.style.opacity=".26");
  title.querySelector(".tt-sheen")?.remove();
  IN.imgs=null; clearTimeout(IN.timer); (IN.watch||[]).forEach(clearTimeout) }

function skipIntro(){ const title=document.getElementById("title"); if(!IN||IN.done||!title) return;
  if(IN.skipping) return; IN.skipping=true;
  // 很快地淡到完成的標題畫面(不做光束與掃光)
  const ti=title.querySelector(".ti"), L=[];
  for(const a of IN.anims){ try{ a.pause() }catch(e){} }
  const done=()=>endIntro(title);
  if(!IN.started){ done(); return }   // 還在讀圖、時間軸還沒開始:直接到標題
  if(ti){ const a=ti.animate([{opacity:getComputedStyle(ti).opacity},{opacity:0}],{duration:RMQ.matches?1:260,fill:"forwards"}); a.finished.then(done,done) } else done();
  for(const s of [".tt-logo",".tt-start",".tt-sync"]){ const e=title.querySelector(s); if(e){ e.style.opacity="1" } }
  const dim=title.querySelector(".tt-dim"); if(dim) dim.style.opacity="0" }

window.introBusy=()=>!!(IN&&!IN.done&&!IN.skipping);   // 跳過的淡出期間(約 0.3 秒)再點一下就直接開始,不會被吃掉
window.introSkip=skipIntro;

function startIntro(){
  const title=document.getElementById("title"); if(!title) return;
  title.classList.add("intro"); if(!RMQ.matches) document.getElementById("stage")?.classList.add("intro-solo");
  const ti=buildIntro(title);
  IN={anims:[],done:false,imgs:[]};
  // 開場期間點一下 = 跳過(不會被當成「開始」)
  title.addEventListener("click",e=>{ if(window.introBusy()){ e.stopImmediatePropagation(); e.preventDefault(); skipIntro() } },true);
  if(RMQ.matches){ // 減少動態:主視覺直接淡入
    const L=IN.anims; ti.classList.add("go"); revealTitle(title,0,L,true);
    IN.timer=setTimeout(()=>endIntro(title),1500); return }
  // 圖依登場順序一張一張解碼(直接解 DOM 裡的 <img>):第一位好了就開播,後面幾張在前面的人登場時接著解,主視覺最後(5.85 秒才用到)。
  // 以前要等六張大圖全部解完才開播,黑幕要等比較久
  const imgs=[...ti.querySelectorAll(".ti-img")], flags=[];
  const decEl=im=>{ if(!im.getAttribute("src")) im.src=im.dataset.src; return (im.decode?im.decode():Promise.resolve()).then(()=>true,()=>false) };
  let chain=Promise.resolve(true); IN.ready=[];
  imgs.forEach((im,i)=>{ chain=chain.then(()=>decEl(im)); IN.ready[i]=chain; chain.then(v=>flags[i]=v!==undefined) });
  const titleP=chain.then(()=>decodeImg("assets/bg/title.webp")).then(r=>{ IN.titleImg=r; flags.title=true });
  // 名牌用的字型也先載好(不然會先用系統字、播到一半才換字型,還會讓那一格重畫很久)
  const fonts=document.fonts?.load?["800 40px 'PGG Num'","600 12px 'PGG Num'","700 20px 'PGG Serif'"].map(f=>document.fonts.load(f,"YESEUL徐藝瑟尹泰梨早瀨日和姜河嵐韓夏恩完美女團").catch(()=>null)):[];
  const mk=n=>{ try{ performance.mark(n) }catch(e){} };
  IN.ready[0].then(()=>mk('intro-shot0')); Promise.all(fonts).then(()=>mk('intro-fonts'));
  Promise.race([Promise.all([IN.ready[0],...fonts]),wait(3500).then(()=>null)]).then(r=>{ mk('intro-gate');
    if(!IN||IN.done||IN.skipping) return;
    const ok=!!r&&r[0]===true;
    // 等畫面穩定(連續幾格都準時)才開始:第一位的圖已經畫好,登場不會卡;最多等 0.7 秒
    stableFrames(700).then(()=>{ if(!IN||IN.done||IN.skipping) return; IN.started=true; mk('intro-play');
      try{ playIntro(title,ti,ok) }catch(e){ logE(e); endIntro(title); return }
      const total=((ok?READY:1.4)+.9)*1000;
      IN.timer=setTimeout(()=>endIntro(title),total);
      if(ok) watchShots(title,total,flags,titleP) }) }).catch(e=>{ logE(e); endIntro(title) });
}
/* 保險:輪到某一位(或主視覺)時圖還沒解好 → 整條時間軸先暫停,等解好、畫面穩定再繼續(手機很忙時才會發生) */
function watchShots(title,total,flags,titleP){
  const at=[...START.slice(1).map((t,k)=>[t,k+1]),[REVEAL,"title"]];
  for(const [t,k] of at){ const tm=setTimeout(async()=>{
      if(!IN||IN.done||IN.skipping||flags[k]) return;
      const clock=IN.anims.reduce((x,y)=>y.effect.getComputedTiming().endTime>x.effect.getComputedTiming().endTime?y:x); IN.anims.forEach(a=>{ try{a.pause()}catch(e){} }); clearTimeout(IN.timer);
      await Promise.race([k==="title"?titleP:IN.ready[k],wait(2000)]); await stableFrames(400);
      if(!IN||IN.done||IN.skipping) return;
      IN.anims.forEach(a=>{ try{a.play()}catch(e){} });
      IN.timer=setTimeout(()=>endIntro(title),Math.max(300,total-(clock?.currentTime||0))) },(t-.3)*1000);
    (IN.watch||(IN.watch=[])).push(tm) } }

/* 按「開始」:白光一閃 → 標題淡出 → 地圖定位、HUD 依序進場 */
window.introGo=(title,unpause)=>{
  if(IN&&!IN.done) endIntro(title);
  title.classList.add("leaving"); title.style.pointerEvents="none";
  try{ window.sfx?.("start") }catch(e){}
  if(PREV_SEEN&&Date.now()-PREV_SEEN>=30*60e3) setTimeout(()=>window.welcomeBack?.(Date.now()-PREV_SEEN),1600);
  const fast=RMQ.matches;
  const fl=el("i","tt-goflash"); title.appendChild(fl);
  if(!fast){ fl.animate([{opacity:0},{opacity:.9,offset:.22},{opacity:0}],{duration:700,easing:"ease-out",fill:"forwards"});
    title.querySelector(".tt-bg")?.animate([{scale:1},{scale:1.07}],{duration:750,easing:"cubic-bezier(.3,.6,.4,1)",fill:"forwards"}) }
  const a=title.animate([{opacity:1},{opacity:1,offset:fast?0:.2},{opacity:0}],{duration:fast?300:720,easing:"ease-in-out",fill:"forwards"});
  const rm=()=>{ title.classList.add("out"); title.remove() }; a.finished.then(rm,rm);
  try{ unpause?.() }catch(e){ logE(e) }
  if(!fast) setTimeout(stageEnter,90);
};
function stageEnter(){ try{
  const st=document.getElementById("stage"); if(!st) return; const OUT="cubic-bezier(.2,.75,.25,1)";
  const sc=[...st.querySelectorAll(":scope > .scene")].find(e=>!e.classList.contains("hide"));
  sc?.animate([{scale:1.075},{scale:1}],{duration:1300,easing:OUT});
  const card=st.querySelector(".topbar .tcard"); card?.animate([{translate:"0 -160%",opacity:0},{translate:"0 0",opacity:1}],{duration:620,delay:330,easing:OUT,fill:"backwards"});
  st.querySelectorAll(".topbar .ibtn").forEach((b,i)=>b.animate([{translate:"180% 0",opacity:0},{translate:"0 0",opacity:1}],{duration:560,delay:400+i*70,easing:OUT,fill:"backwards"}));
  [...st.querySelectorAll("#worldHot .pin, #rooms .rp, #where > *")].slice(0,14).forEach((p,i)=>p.animate([{opacity:0,translate:"0 -1.6cqw"},{opacity:1,translate:"0 0"}],{duration:520,delay:560+i*55,easing:OUT,fill:"backwards"}));
}catch(e){ logE(e) } }

/* ============================== 離開遊戲 ============================== */
/* 台詞:成員 → 關係(0 戒備、1 信任、2 夥伴、3 心動、4 戀人以上)→ 時段(am 清晨與上午、pm 下午、eve 晚上、night 深夜、any 任何時段)
   一句可以分兩段(用「／」分開),「@表情」標在每段後面;第二段換表情,像她說完一句又補一句 */
const EXL={
 ys:[
  {am:"代表要出門了?……今天的練習,我會帶好大家的。@neutral",pm:"辛苦了,代表。下午的行程交給我們吧。@neutral",eve:"代表也早點回去休息吧。明天見。@smile",night:"這麼晚了……路上請小心。@neutral",any:"謝謝代表今天來看我們。@smile"},
  {am:"一大早就要忙了嗎?記得吃早餐喔,代表。@smile",pm:"下午的練習我會盯著大家,代表放心去吧。@smile",eve:"今天也辛苦了。……下次,再聽我多說一點話好嗎?@smile",night:"這麼晚了,代表也要好好睡喔。晚安。@smile",any:"有代表在,大家都安心多了。明天見。@smile"},
  {am:"今天也要加油喔,代表。@smile／……我會等你回來的。@smile",pm:"代表的臉色有點累……別勉強自己,好嗎?@neutral",eve:"謝謝你。有你在的日子,總是過得特別快。@smile",night:"晚安,代表。@smile／……今天也謝謝你一直都在。@shy",any:"我們之間不用多說什麼。……明天見。@smile"},
  {am:"要走了嗎?@surprise／……沒事,只是想再多看你一下。@shy",pm:"下次……可以只為了我來嗎?開玩笑的。……一半是。@shy",eve:"今晚的夜景好漂亮。@smile／……下次想跟代表一起看。@shy",night:"晚安,代表。@smile／……夢裡見,好嗎?@shy",any:"你一走,這裡就好安靜。……快點回來喔。@shy"},
  {am:"路上小心。@smile／……到了要傳訊息給我喔。@shy",pm:"去吧,我會乖乖練習的。……回來要獎勵我。@laugh",eve:"今天也辛苦了。@smile／……抱一下再走,好不好?@shy",night:"晚安。@smile／……我好喜歡你。明天也是。@shy",any:"不管多晚,我都等你。……晚安,我的代表。@shy"}],
 tr:[
  {am:"……要走了?OK。@neutral",pm:"辛苦了。練習我會自己看著辦。@neutral",eve:"……明天見。@neutral",night:"很晚了。快回去吧。@neutral",any:"嗯。路上小心。@neutral"},
  {am:"一早就要跑行程?……咖啡記得喝。@smile",pm:"去忙吧。這邊有我。@smile",eve:"今天……還不錯。See you。@smile",night:"這麼晚還在操心我們?……快去睡。@smile",any:"下次來,我放新的 demo 給你聽。@smile"},
  {am:"要出門了?@neutral／……領帶歪了。好了,去吧。@smile",pm:"別把自己弄得那麼累。@neutral／……我是說,大家會擔心。@shy",eve:"今天謝了。……真的。@shy",night:"晚安。@smile／做個好夢。別夢到工作。@laugh",any:"你在的時候,練習比較不無聊。……就這樣,bye。@shy"},
  {am:"……要走了?@neutral／再五分鐘。不行嗎?@shy",pm:"你一走,我就開始想你了。……忘掉我剛剛說的。@shy",eve:"下次的晚餐,換你陪我吃。@smile／……不是約會。大概不是。@shy",night:"晚安。@shy／……傳訊息給我。不回也沒關係,我等。@shy",any:"你一走,我就不知道手要放哪裡。……很奇怪吧。@shy"},
  {am:"Good morning……然後馬上就要 bye 了?@neutral／……快去快回。@shy",pm:"去吧。晚上記得來找我,這是命令。@laugh",eve:"今天也辛苦了。@smile／……過來,讓我抱一下再走。@shy",night:"晚安。@smile／……I love you。不准笑。@shy",any:"我會想你。……很想。@shy"}],
 hy:[
  {am:"代表,您要出發了嗎?路上請小心。@neutral",pm:"辛苦您了。我會繼續練習的。@neutral",eve:"今天謝謝您。明天見。@smile",night:"這麼晚了……請您早點休息。@neutral",any:"謝謝您今天來看我們。@smile"},
  {am:"代表,早安……@smile／啊,不對,應該是路上小心才對。@laugh",pm:"下午的練習,我會把那個轉身練到最好。@smile",eve:"今天和您說了好多話……很開心。@shy",night:"おやすみなさい……@smile／啊,是晚安。代表,晚安。@laugh",any:"下次見面的時候,請再看看我的舞。@smile"},
  {am:"代表今天行程很滿吧……我捏了飯糰,請帶在路上吃。@smile",pm:"您一忙起來就會忘記喝水……請記得喔。@smile",eve:"這裡的夜晚,有時候會讓我想起大阪。@smile／……謝謝您,讓我覺得這裡也是家。@shy",night:"晚安,代表。今天也謝謝您。@smile",any:"有您在,我就不想家了。明天見。@smile"},
  {am:"代表……@shy／不、沒什麼。只是想叫您一聲。@shy",pm:"您走了以後……我大概會一直看著門口吧。@shy",eve:"下次……可以只有我們兩個人嗎?@shy／啊、我是說,散步的話!@surprise",night:"晚安……@shy／……請您夢到我。這樣說會太任性嗎?@shy",any:"我的心跳得好快……請您先不要回頭。@shy"},
  {am:"いってらっしゃい。@smile／……我會等你回來。@shy",pm:"去吧……晚上回來,我泡茶給你。@smile",eve:"今天也辛苦了。@smile／……再牽一下手就好。@shy",night:"おやすみ。@smile／……大好き。這句,不翻譯。@shy",any:"不管你去哪裡,我都在這裡。晚安。@smile"}],
 he:[
  {am:"代表要走了?今天也要加油喔!@smile",pm:"辛苦了~我們會好好練習的!@smile",eve:"代表,明天見~@smile",night:"這麼晚還在工作……代表也要早點睡喔!@smile",any:"謝謝代表!下次見~@smile"},
  {am:"代表!出門前笑一個,這樣一整天都會很順喔~@laugh",pm:"下午也加油!今天最漂亮的笑容,我留給你。@laugh",eve:"今天好開心~代表明天也要來看我們喔!@laugh",night:"晚安,代表~要夢到我們練習的樣子喔!@laugh",any:"代表一來,大家的士氣都變好了耶!下次見~@smile"},
  {am:"代表!@laugh／……今天也很帥喔。好了,可以出門了!@smile",pm:"累了要說喔?我可以分你一點我的元氣~@laugh",eve:"今天謝謝你陪我。……我真的很開心。@shy",night:"晚安~@smile／蓋好被子,不准熬夜!@laugh",any:"我們是最強的搭檔,對吧?明天見!@laugh"},
  {am:"要走了嗎?@smile／……那出門前,再看我一眼。@shy",pm:"你不在的時候,我拍照都笑不出來了啦。……騙你的。一半。@shy",eve:"今天的我,有比昨天漂亮一點嗎?@shy／……你剛剛猶豫了!@laugh",night:"晚安……@shy／明天醒來第一個想到的,要是我喔。@shy",any:"你知道嗎?只要是你在看,我就會變得更好看。@shy"},
  {am:"出門前……@shy／親一下再走嘛~@laugh",pm:"快去快回~晚上我要獨占你喔。@laugh",eve:"今天也辛苦了,親愛的~@smile／……明明你還在,我就已經開始想你了。@shy",night:"晚安,親愛的。@smile／……夢裡也要牽著我喔。@shy",any:"全世界我最喜歡你了。……不准說你知道!@laugh"}],
 hr:[
  {am:"代表要出門了嗎?路上小心!@smile",pm:"辛苦了!我會繼續練高音的!@smile",eve:"代表,明天見~@smile",night:"代表也要早點睡喔!晚安!@smile",any:"謝謝代表!下次見!@smile"},
  {am:"代表!早上要元氣滿滿喔!我的元氣借你一半!@laugh",pm:"下午我要挑戰那個高音,代表回來要聽喔!@laugh",eve:"今天超開心的!代表明天也要來喔,約好了!@laugh",night:"晚安~送代表一首搖籃曲!……啦啦啦~好了,晚安!@laugh",any:"代表走了我會很無聊耶……快點回來!@smile"},
  {am:"代表!@laugh／出門前擊掌!……耶!今天一定很順!@laugh",pm:"代表不要太累喔,不然我要偷偷去辦公室監視你!@laugh",eve:"今天謝謝代表陪我玩……不對,陪我練習!@laugh",night:"晚安~@smile／……其實我有點捨不得說晚安。@shy",any:"代表是我們家最重要的人!下次見!@laugh"},
  {am:"代表要走了?@surprise／……那、那我送你到門口!只到門口喔!@shy",pm:"我剛剛是不是一直盯著代表看?……沒有!絕對沒有!@shy",eve:"今天……@shy／可以再待五分鐘嗎?不行的話,三分鐘也好!@laugh",night:"晚安……@shy／我睡前會想代表三分鐘。……好啦,三十分鐘。@shy",any:"代表一走,我的心臟就安靜不下來……這是什麼病啊?@shy"},
  {am:"出門前要充電!@laugh／……抱抱!好了,滿格了!@laugh",pm:"快去快回~我會一直傳訊息煩你的!@laugh",eve:"今天也辛苦了~@smile／……我好喜歡你。突然就想說。@shy",night:"晚安,我的代表。@smile／……明天醒來,也要最喜歡我喔。@shy",any:"我會唱歌給你聽,唱一輩子。晚安!@laugh"}],
};
const EX_BD={ys:"今天謝謝你。……這是我最喜歡的一個生日。@shy",tr:"今年的生日……還不錯。謝謝。@shy",hy:"今天的生日,我會一直記得的。謝謝您。@shy",he:"今天是我最幸福的生日!代表,謝謝你~@laugh",hr:"今天是我人生最棒的生日!代表是最棒的禮物!@laugh"};
const BD={ys:[8,14],tr:[12,21],hy:[2,9],he:[10,3],hr:[5,27]};
const parseLine=s=>String(s).split("／").map(p=>{ const k=p.lastIndexOf("@"); return k>0?[p.slice(0,k),p.slice(k+1)]:[p,"smile"] });

function rankOf(id){ try{ return Math.max(0,(window.STAGE_RANK||[]).indexOf(window.stageOfXp?.(id)||"戒備")) }catch(e){ return 0 } }
function pickMember(){
  const lt=S.lastTalk; if(lt&&lt.day===S.day&&byId(lt.id)) return lt.id;
  const ws=M.map(m=>({id:m.id,w:Math.pow(rankOf(m.id)+1,1.6)*(.6+(S.m?.[m.id]?.mood??60)/150)}));
  let r=Math.random()*ws.reduce((a,b)=>a+b.w,0); for(const x of ws){ r-=x.w; if(r<=0) return x.id } return ws[0].id }
function pickLine(id){
  const d=dateOf(S.day), bd=BD[id];
  if(bd&&d.getMonth()+1===bd[0]&&d.getDate()===bd[1]) return {k:"bd",beats:parseLine(EX_BD[id])};
  const rk=rankOf(id), band=Math.min(4,rk), tb=S.slot<=1?"am":S.slot===2?"pm":S.slot===3?"eve":"night";
  const set=EXL[id]?.[band]||EXL[id]?.[0]; let last=""; try{ last=localStorage.getItem("kpopGame.exitLast")||"" }catch(e){}
  let k=Math.random()<.68?tb:"any"; if(`${id}.${band}.${k}`===last) k=k==="any"?tb:"any";
  try{ localStorage.setItem("kpopGame.exitLast",`${id}.${band}.${k}`) }catch(e){}
  return {k,beats:parseLine(set[k]||set.any)} }

/* 她現在穿的衣服(依所在地點與時段;造型室處理好的立繪還沒讀進來時等一下,最多 0.8 秒) */
async function spriteOf(id,ex){
  let of=null; try{ of=outfitAt(id,S.where?.[id]||"living",S.slot) }catch(e){}
  if(of&&!window.DYN?.[of+"@"+id]){ try{ window.needDyn?.(of,id) }catch(e){}
    for(let i=0;i<8&&!window.DYN?.[of+"@"+id];i++) await wait(100) }
  return {of,src:spr(id,of,ex)} }

let EX=null;
window.exitBusy=()=>!!EX;
window.exitStage=()=>EX?EX.stage:-1;
const BLINK_OK=new Set(["neutral","smile"]);
const BLIP_ON=()=>{ try{ return localStorage.getItem("kpopGame.blip")!=="0" }catch(e){ return true } };
let ACX=null;
function exBlip(id){ if(!BLIP_ON()) return; const f=(typeof BLIP_HZ!=="undefined"&&BLIP_HZ[id])||520;
  try{ const A=window.audioCtx?.(), ac=A?.ctx||(ACX=ACX||new (window.AudioContext||window.webkitAudioContext)()); if(ac.state==="suspended") ac.resume();
    const t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain(); o.type="triangle"; o.frequency.value=f*(.96+Math.random()*.08);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.045,t+.008); g.gain.exponentialRampToValueAtTime(.0001,t+.075);
    o.connect(g); g.connect(A?.sfx||ac.destination); o.start(t); o.stop(t+.09) }catch(e){} }

/* 存檔與雲端:本機立刻存;有登入就推一次雲端,最多等 4.5 秒 */
async function exitSave(st){
  const set=(k,cls,text)=>{ const s=st.querySelector(`[data-k="${k}"]`); if(!s) return; s.className=cls; s.innerHTML=(cls==="ok"?CHECK:cls==="bad"?WARN:SPIN)+`<i>${text}</i>` };
  try{ saveT?.() }catch(e){} try{ save() }catch(e){ logE(e) }
  set("loc","ok","進度已保存");
  let cloud="off"; try{ cloud=(syAuth()&&syCfg())?"on":"off" }catch(e){}
  if(cloud==="off"){ set("cl","ok","離線遊玩・存在這台裝置"); return true }
  if(typeof syConflict!=="undefined"&&syConflict){ set("cl","bad","雲端有另一份進度・下次開啟再選"); return false }
  try{ await Promise.race([pushSave(),wait(4500)]) }catch(e){ logE(e) }
  let ok=false; try{ ok=seqPushed()>=seqNow() }catch(e){}
  set("cl",ok?"ok":"bad",ok?"雲端已同步":"雲端稍後再同步・下次開啟會補上");
  return ok }

const CHECK='<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>';
const SPIN='<svg viewBox="0 0 16 16"><path d="M8 2.2a5.8 5.8 0 1 1-5.6 4.3"/></svg>';
const WARN='<svg viewBox="0 0 16 16"><path d="M8 3.2v6.2M8 12.6v.2"/></svg>';

window.exitGame=async(why)=>{
  if(EX) return window.exitSkip();
  if(typeof S==="undefined"||typeof M==="undefined") return;
  try{ document.querySelectorAll("dialog[open]").forEach(d=>{ try{ d.close() }catch(e){} }) }catch(e){}
  window.introBusy?.()&&skipIntro();
  try{ setPause("exit",true) }catch(e){}
  try{ document.getElementById("toast2")?.classList.remove("on") }catch(e){}
  const stage=document.getElementById("stage"); if(!stage) return;
  const fast=RMQ.matches, id=pickMember(), m=byId(id), ln=pickLine(id), beats=ln.beats;
  try{ localStorage.setItem("kpopGame.lastBye",JSON.stringify({id,at:Date.now()})) }catch(e){}
  const ex0=beats[0][1], exs=[...new Set(beats.map(b=>b[1]))], sps=Promise.all(exs.map(ex=>spriteOf(id,ex)));   // 這句會用到的表情一次準備好
  const ov=el("div","exitv"); ov.id="exitv"; ov.style.setProperty("--c",m.c); ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","離開遊戲");
  const d=dateOf(S.day), ds=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  const motes=Array.from({length:9},(_,i)=>`<i style="--x:${8+((i*37)%60)}%;--s:${(.5+(i%4)*.28).toFixed(2)};--k:${i%3?m.c:"#E9CF8F"}"></i>`).join("");
  ov.innerHTML=`<div class="ex-dim"></div><div class="ex-glow"></div><div class="ex-motes">${motes}</div>
    <div class="ex-fig"><div class="ex-body">${exs.map((ex,i)=>`<img alt="" class="ex-a" data-ex="${ex}" style="opacity:${i?.001:1}">`).join("")}<div class="ex-blink"></div></div></div>
    <div class="vbox locked" data-m="${id}"><div class="panel"></div><div class="vname">${m.n}<i class="en">${m.f.toUpperCase()}</i></div><div class="vtext"></div></div>
    <div class="ex-st"><b>${ds}</b><span>${SLOTS[S.slot]?.n||""}</span><span data-k="loc">${SPIN}<i>存檔中…</i></span><span data-k="cl">${SPIN}<i>雲端同步中…</i></span></div>
    <div class="ex-card"><small>PERFECT GIRL GROUP</small><h2></h2><i class="ex-rule"></i><p></p><p class="ex-note"></p></div><div class="ex-black"></div>`;
  ov.querySelector(".vname").style.setProperty("--nc",m.c);
  stage.appendChild(ov);
  EX={ov,id,anims:[],timers:[],stage:0,why,skip:null,closed:false};
  const L=EX.anims, q=s=>ov.querySelector(s), OUT="cubic-bezier(.22,.8,.3,1)";
  // 真實時間決定最後的字卡
  const h=new Date().getHours(), card=(h>=21||h<5)?["晚安","今天也辛苦了"]:h<11?["路上小心","今天也要加油"]:["下次見","等你回來"];
  q(".ex-card h2").textContent=card[0]; q(".ex-card p").textContent=card[1];
  // 存檔(同時進行)
  EX.saving=exitSave(q(".ex-st"));
  // 跳過:直接到字卡
  let resolveSkip; EX.skipP=new Promise(r=>resolveSkip=r); EX.skip=resolveSkip;
  ov.addEventListener("click",e=>{ if(e.target.closest("button")) return; window.exitSkip() });
  // 1) 暗下來、狀態列
  A(L,q(".ex-dim"),[{opacity:0},{opacity:1}],fast?.2:.6,0,"ease-out");
  A(L,q(".ex-st"),[{opacity:0,translate:"0 -.8cqw"},{opacity:1,translate:"0 0"}],.5,.15,OUT);
  // 2) 她走進來(立繪解碼好才開始,最多等 0.9 秒)
  const fig=q(".ex-fig"), body=q(".ex-body"), imgs=[...ov.querySelectorAll(".ex-a")], blink=q(".ex-blink");
  let cur=ex0;
  const W0=OVL?.[m.f]?.W||920, H0=OVL?.[m.f]?.H||2954, hh=(m.cm||165)/168;
  fig.style.cssText=`height:120cqw;aspect-ratio:${W0}/${H0};top:calc(-1cqw + ${(1-hh).toFixed(3)} * 120cqw)`;
  let ss=null; try{ ss=await Promise.race([sps,wait(900).then(()=>null)]) }catch(e){}
  if(!EX||EX.ov!==ov) return;
  // 其他表情的立繪以 0.001 的透明度疊在後面:跟著呼吸一起動,圖也先畫好,換表情時只是交叉淡化,不會卡
  imgs.forEach((im,i)=>{ im.src=ss?.[i]?.src||spr(id,null,exs[i]) }); EX.of=ss?.[0]?.of||null;
  try{ await Promise.race([Promise.all(imgs.map(im=>im.decode().catch(()=>{}))),wait(800)]) }catch(e){}
  if(!EX||EX.ov!==ov) return;
  await stableFrames(650);   // 立繪先在 0.001 透明度畫好(上傳到 GPU)再走進來,走進來時才不會卡
  if(!EX||EX.ov!==ov) return;
  // 眨眼小塊(跟對話畫面同一套 OVL)
  const bi=OVL_IMG?.[m.f+"|blink"], o0=OVL?.[m.f];
  if(bi&&o0?.blink){ const [x,y,w,hb]=bi.naturalWidth>=o0.W*.98?[0,0,o0.W,o0.H]:o0.blink;
    Object.assign(blink.style,{backgroundImage:`url("${bi.src}")`,backgroundSize:`${w/o0.W*100}% ${hb/o0.H*100}%`,backgroundPosition:`${w<o0.W?x/(o0.W-w)*100:0}% ${hb<o0.H?y/(o0.H-hb)*100:0}%`}) }
  const t0=performance.now()/1000;
  A(L,q(".ex-glow"),[{opacity:0,scale:.85},{opacity:.85,scale:1}],1.2,.05,"ease-out");
  q(".ex-motes").querySelectorAll("i").forEach((e,i)=>A(L,e,[{opacity:0,translate:"0 0"},{opacity:.9,offset:.2},{opacity:.7,offset:.7},{opacity:0,translate:`${(i%2?1:-1)*1.5}cqw -34cqw`}],4.2+(i%3)*.8,.2+i*.33,"linear"));
  A(L,fig,fast?[{opacity:0},{opacity:1}]:[{opacity:0,translate:"-46% 0"},{opacity:1,translate:"-50% 0",offset:.82},{opacity:1,translate:"-50% 0"}],fast?.3:1.0,0,OUT);
  // 3) 對話框、打字
  A(L,q(".vbox"),[{opacity:0,translate:"0 1.2cqw"},{opacity:1,translate:"0 0"}],.45,.75,OUT);
  const tx=q(".vtext");
  const sleep=s=>new Promise(r=>{ const t=setTimeout(r,s*1000); EX?.timers.push(t) });
  const skipped=()=>!EX||EX.ov!==ov||EX.stage>=2;
  const blinkAt=s=>{ const t=setTimeout(()=>{ if(!EX||EX.ov!==ov||fast||!BLINK_OK.has(cur)) return;
      blink.animate([{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.85},{opacity:0}],{duration:130}) },s*1000); EX.timers.push(t) };
  blinkAt(2.4); blinkAt(5.1);
  const swapExpr=ex=>{ if(ex===cur) return; const nw=imgs.find(i=>i.dataset.ex===ex), od=imgs.find(i=>i.dataset.ex===cur); if(!nw||!od||skipped()) return;
    // 新表情先在下面完全出現,舊的在上面淡掉(不會透出背景)
    nw.style.zIndex="1"; od.style.zIndex="2"; nw.style.opacity="1"; cur=ex;
    od.animate([{opacity:1},{opacity:.001}],{duration:260,easing:"ease-out",fill:"forwards"}).finished.then(()=>{ od.style.opacity=".001"; od.style.zIndex="" },()=>{});
    if(!fast) body.animate(ex==="shy"?[{translate:"0 0",rotate:"0deg"},{translate:"0 .5%",rotate:"-.6deg"},{translate:"0 .25%",rotate:"-.4deg"}]:ex==="laugh"?[{translate:"0 0"},{translate:"0 -.7%"},{translate:"0 0"}]:ex==="surprise"?[{translate:"0 0"},{translate:"0 -.5%"},{translate:"0 0"}]:[{translate:"0 0"},{translate:"0 .35%"},{translate:"0 0"}],
      {duration:ex==="shy"?700:420,easing:"cubic-bezier(.3,.7,.3,1)",fill:ex==="shy"?"forwards":"none",composite:"add"}) };
  const P=ch=>/[。!?!?]/.test(ch)?.28:/[,、;:,;:]/.test(ch)?.14:ch==="…"?.1:/[—~~]/.test(ch)?.12:0;
  const type=async(text)=>{ const base=tx.textContent, chars=[...text]; let i=0, tk=0;   // 接在前一段後面打字
    while(i<chars.length){ if(skipped()) return; i++; tx.textContent=base+chars.slice(0,i).join(""); const ch=chars[i-1], nx=chars[i]||"";
      if(/[\p{L}\p{N}]/u.test(ch)&&++tk%3===0) exBlip(id);
      await sleep(.042+(P(ch)&&!P(nx)?P(ch):ch==="…"?.05:0)) } };
  (async()=>{ await sleep(1.0);
    for(let b=0;b<beats.length;b++){ if(skipped()) return; const [t,ex]=beats[b];
      if(b>0){ await sleep(.55); if(skipped()) return; swapExpr(ex) }
      await type(t) }
    if(!skipped()) EX.typed=performance.now()/1000-t0 })();
  // 4) 等她說完、停一下讓人看完,輕輕點頭,然後字卡
  const minEnd=4.6;
  const toCard=(async()=>{ while(EX&&EX.ov===ov&&EX.typed==null&&EX.stage<2) await sleep(.05);
    if(!EX||EX.ov!==ov) return;
    if(EX.stage<2){ const hold=Math.max(1.35,minEnd-(performance.now()/1000-t0)); await Promise.race([sleep(hold-.45),EX.skipP]);
      if(EX.stage<2&&!fast) body.animate([{translate:"0 0"},{translate:"0 .9%"},{translate:"0 0"}],{duration:520,easing:"cubic-bezier(.35,.1,.3,1)",composite:"add"});
      await Promise.race([sleep(.45),EX.skipP]) } })();
  await Promise.race([toCard,EX.skipP]);
  if(!EX||EX.ov!==ov) return;
  EX.stage=2;
  // 5) 字卡
  const cd=q(".ex-card"), skippedEarly=performance.now()/1000-t0<3.5;
  try{ window.sfx?.("bye") }catch(e){}
  for(const s of [".ex-fig",".vbox",".ex-glow",".ex-motes"]) A(L,q(s),[{opacity:1},{opacity:0}],skippedEarly?.25:.65,0,"ease-in","forwards");
  A(L,cd,[{opacity:0},{opacity:1}],skippedEarly?.3:.75,skippedEarly?0:.25,"ease-out","forwards");
  A(L,cd.querySelector("h2"),[{opacity:0,translate:"0 .8cqw",scale:.97},{opacity:1,translate:"0 0",scale:1}],.9,skippedEarly?.05:.35,OUT);
  A(L,cd.querySelector(".ex-rule"),[{scale:"0 1"},{scale:"1 1"}],.8,skippedEarly?.15:.55,OUT);
  const cardAt=performance.now();
  const saved=await EX.saving;
  const native=!!window.Capacitor?.isNativePlatform?.(), App=window.Capacitor?.Plugins?.App;
  await wait(Math.max(0,(skippedEarly?650:1150)-(performance.now()-cardAt)));
  if(!EX||EX.ov!==ov) return;
  EX.stage=3;
  try{ window.bgm?.("exit") }catch(e){}
  if(native&&App?.exitApp){
    const blk=q(".ex-black"); const a=blk.animate([{opacity:0},{opacity:1}],{duration:fast?150:500,fill:"forwards"});
    await a.finished.catch(()=>{});
    try{ await App.exitApp() }catch(e){ logE(e); webEnd(ov,saved,true) }
    return }
  webEnd(ov,saved,native);
};
/* 網頁版(或沒有 App 外掛的舊 APK):停在字卡,可以繼續玩 */
function webEnd(ov,saved,native){ const note=ov.querySelector(".ex-note");
  note.textContent=native?"按返回鍵就會離開遊戲":saved?"進度都存好了,可以關閉這個分頁":"進度已存在這台裝置,可以關閉這個分頁";
  const b=el("button","","繼續玩"); ov.querySelector(".ex-card").appendChild(b);
  b.animate([{opacity:0},{opacity:1}],{duration:400,fill:"backwards"});
  b.onclick=e=>{ e.stopPropagation(); const a=ov.animate([{opacity:1},{opacity:0}],{duration:350,fill:"forwards"});
    a.finished.then(()=>{ ov.remove(); EX=null; try{ setPause("exit",false) }catch(e){} try{ window.backRepush?.() }catch(e){} }) };
  try{ window.close() }catch(e){} }
window.exitSkip=()=>{ if(!EX) return; if(EX.stage<2){ EX.stage=2; EX.skip?.() } else if(EX.stage===2){ /* 字卡已出現:存檔一好就離開 */ } };

/* ============================== 回來時的迎接(2026-10-27,真人化第四批) ==============================
   依「現實中離開多久」:30 分鐘以內不打擾;30 分~6 小時 s、6~36 小時 d、1.5~5 天 f、5 天以上 l。
   誰來迎接:上次送你離開的那位(kpopGame.lastBye,30 天內),沒有就依親密度抽。第一句是依現實時間的招呼,第二句依關係 × 離開多久。
   冷啟動:按開始、地圖出來後;從背景切回來:離開 30 分鐘以上。有事件卡、對話、設施開著就等,8 秒內沒關就不打擾。點一下跳過。 */
const SEEN_K="kpopGame.lastSeen", BYE_K="kpopGame.lastBye";
const PREV_SEEN=(()=>{ try{ return +(localStorage.getItem(SEEN_K)||0) }catch(e){ return 0 } })();
const markSeen=()=>{ try{ localStorage.setItem(SEEN_K,String(Date.now())) }catch(e){} };
markSeen(); setInterval(()=>{ if(!document.hidden) markSeen() },30000); addEventListener("pagehide",markSeen);
let hiddenAt=0;
document.addEventListener("visibilitychange",()=>{ if(document.hidden){ hiddenAt=Date.now(); markSeen(); return }
  const gap=hiddenAt?Date.now()-hiddenAt:0; hiddenAt=0; markSeen(); if(gap>=30*60e3&&!document.getElementById("title")) setTimeout(()=>window.welcomeBack(gap),900) });
const WG={ys:{am:"早安,代表。",pm:"午安,代表。",eve:"晚上好,代表。",night:"這麼晚了……代表還沒睡嗎?"},
  tr:{am:"……早。",pm:"嗯,午安。",eve:"晚上好。",night:"這個時間?……你也睡不著?"},
  hy:{am:"おはようございます……啊,代表早安。",pm:"代表,午安。",eve:"代表,晚上好。",night:"這麼晚了……代表辛苦了。"},
  he:{am:"代表早安~!",pm:"午安~代表!",eve:"晚上好呀,代表~",night:"咦?這麼晚還來看我們?"},
  hr:{am:"代表早安!!",pm:"午安!代表來了!",eve:"晚上好~代表!",night:"哇,代表這麼晚還沒睡!"}};
/* 第二句:成員 → 關係 0~4 → 離開多久(s 幾小時、d 隔天、f 兩三天、l 五天以上);「／」分段、「@表情」 */
const WL={
 ys:[{s:"代表回來了。有什麼需要我做的嗎?@neutral",d:"今天也請多指教。@neutral",f:"好幾天沒見到代表了……大家都有好好練習。@neutral",l:"代表……好久不見。我們一直在等你回來。@sad"},
  {s:"回來得正好,剛泡好茶,要喝一點嗎?@smile",d:"今天的行程我已經跟大家確認過了。@smile",f:"代表這幾天很忙吧?……有空的話,聽我說說話。@smile",l:"好久不見。……大家都很想代表。我也是。@smile"},
  {s:"歡迎回來。@smile／……你不在的時候,總覺得少了什麼。@smile",d:"看到代表,今天就有精神了。@smile",f:"這幾天沒見到你……我一直有點擔心。@neutral／不過,看到你就安心了。@smile",l:"你終於回來了。@sad／……下次要離開這麼久,先跟我說一聲,好嗎?@smile"},
  {s:"你回來了……@shy／我剛剛還在想你。@shy",d:"昨晚……夢到代表了。@shy／啊、沒什麼,我們走吧。@smile",f:"這幾天,我每天都在看門口。@shy",l:"……真的是你。@surprise／好想你。好想好想你。@shy"},
  {s:"歡迎回來,我的代表。@smile／……抱一下再去工作。@shy",d:"早上第一個想到的,就是你。@shy",f:"三天沒見,我快撐不住了。@sad／……現在要補回來。@shy",l:"你再不回來,我就要去找你了。@sad／……不准再這樣了。@shy"}],
 tr:[{s:"……回來了?@neutral",d:"嗯。今天也練習。@neutral",f:"幾天沒來。……忙?@neutral",l:"……好久。@neutral／大家有點擔心。@neutral"},
  {s:"回來了?剛好,demo 聽一下。@smile",d:"今天狀態還不錯。你呢?@smile",f:"最近都沒看到你。……沒事就好。@smile",l:"這麼久沒來……還以為你忘了我們。@neutral／……開玩笑的。@smile"},
  {s:"Welcome back。@smile",d:"你來了,今天就不無聊了。@smile",f:"你不在這幾天,練習室好安靜。@neutral／……我才沒有想你。@shy",l:"你跑去哪了?@neutral／……算了,回來就好。@smile"},
  {s:"你回來了。@shy／……我剛剛沒在等你。真的。@shy",d:"……看到你,心情就變好了。很奇怪吧。@shy",f:"三天。@neutral／我數了。……別問為什麼。@shy",l:"……過來。@shy／讓我確認一下你是真的。@shy"},
  {s:"Welcome home。@smile／……想你了。@shy",d:"Good morning。……今天也最喜歡你。@shy",f:"下次離開這麼久,要先跟我報備。@neutral／……我會想你啊。@shy",l:"你不在的時候,我每天都在等。@sad／……抱我。現在。@shy"}],
 hy:[{s:"代表,您回來了。@neutral",d:"今天也請多多指教。@neutral",f:"好幾天沒見到您了……請您保重身體。@neutral",l:"代表,好久不見了。……大家都在等您。@neutral"},
  {s:"您回來了!我剛好練完一段舞。@smile",d:"今天的天氣很適合練習呢。@smile",f:"這幾天都沒見到您……您還好嗎?@neutral",l:"好久不見……我還以為您不會再來了。@sad／……能再見到您,真好。@smile"},
  {s:"歡迎回來,代表。@smile",d:"見到您,今天就會是好日子。@smile",f:"您不在的時候,我寫了好幾張卡片……@shy／等一下拿給您。@smile",l:"您回來了……@surprise／我好開心。真的、真的好開心。@smile"},
  {s:"代表……@shy／不,沒什麼。歡迎回來。@shy",d:"昨晚,我一直在想您……@shy",f:"這幾天好漫長……@sad／見到您的瞬間,心跳就停不下來了。@shy",l:"……おかえりなさい。@shy／我一直、一直在等您。@sad"},
  {s:"おかえり。@smile／……我好想你。@shy",d:"早安……今天也想一直待在你身邊。@shy",f:"你不在,我連舞都跳不好了。@sad／……所以,今天要好好陪我。@shy",l:"你回來了……@surprise／不要再走那麼久了,好不好?@shy"}],
 he:[{s:"代表回來啦~@smile",d:"今天也要加油喔!@smile",f:"代表好幾天沒來耶,大家都在問~@smile",l:"代表!好久不見!我們都以為你不要我們了~@smile"},
  {s:"回來啦~剛好陪我挑一下今天的造型!@laugh",d:"今天的我,狀態超好喔~@laugh",f:"這幾天去哪了~?不在都沒人誇我了啦。@smile",l:"好久不見!@laugh／……真的好久,以後不准這樣了喔。@smile"},
  {s:"歡迎回來~@laugh",d:"見到你,今天就是完美的一天!@laugh",f:"你不在的這幾天,我拍了好多照片要給你看!@laugh",l:"你終於回來了!@surprise／……我差點就要哭了。@sad"},
  {s:"你回來了!@laugh／……剛剛一直在等你。@shy",d:"今天的妝是為你化的喔。……開玩笑的。一半。@shy",f:"三天沒看到你,我的心空了一半啦。@sad",l:"……@surprise／真的是你!我好想你、好想你!@shy"},
  {s:"歡迎回家,親愛的~@laugh／……先親一下。@shy",d:"早安親愛的~今天也最喜歡你!@laugh",f:"你再不回來,我就要去公司堵你了!@smile／……想你啦。@shy",l:"笨蛋……@sad／讓我抱很久很久,當作補償。@shy"}],
 hr:[{s:"代表回來了!@smile",d:"今天也要元氣滿滿喔!@smile",f:"代表好幾天沒來耶!我們都很努力喔!@smile",l:"代表!好久不見!!我們好想你!@laugh"},
  {s:"代表回來了!我剛練完高音,要聽嗎?@laugh",d:"今天我要挑戰新的歌!代表要看喔!@laugh",f:"代表不在,大家都好無聊~@smile",l:"代表!!@surprise／你跑去哪裡了啦,我們等好久!@laugh"},
  {s:"歡迎回來~!擊掌!@laugh",d:"看到代表,我今天一定會唱得超好!@laugh",f:"代表不在的時候,我每天都對著門口練習說『歡迎回來』!@laugh",l:"代表……@sad／還以為你不要我們了……@sad"},
  {s:"代表回來了!@laugh／……我、我才沒有一直在門口等!@shy",d:"我昨天夢到代表了!內容……是秘密!@shy",f:"三天沒見,我寫了一首歌給代表……要聽嗎?@shy",l:"代表!!@surprise／我好想你……真的好想你!@shy"},
  {s:"歡迎回來!@laugh／……抱抱充電!@shy",d:"早安!今天也最最最喜歡代表!@laugh",f:"代表不在,我的電量只剩一格了啦……@sad／快幫我充電!@shy",l:"你回來了……@sad／不准再丟下我這麼久了!@shy"}],
};
const gapText=ms=>{ const h=ms/36e5; return h<1?`${Math.round(ms/6e4)} 分鐘`:h<24?`${Math.round(h)} 小時`:`${Math.floor(h/24)} 天${Math.round(h%24)?` ${Math.round(h%24)} 小時`:""}` };
const busyUI=()=>!!document.querySelector("#title,#exitv,#welc,dialog[open],#visit.on,#facility:not(.hide),.bigev,.evbox,#cgView,#phone.on,#drawer.on,#songFac:not(.hide)");
let WBX=null;
window.welcBusy=()=>!!WBX;
window.welcSkip=()=>WBX?.skip?.();
window.welcomeBack=async(gap)=>{
  if(WBX||typeof S==="undefined"||typeof M==="undefined"||!(gap>=30*60e3)) return;
  for(let i=0;i<16&&busyUI();i++) await wait(500);
  if(busyUI()||WBX) return;
  const stage=document.getElementById("stage"); if(!stage) return;
  let id=null; try{ const b=JSON.parse(localStorage.getItem(BYE_K)||"null"); if(b&&byId(b.id)&&Date.now()-b.at<30*864e5) id=b.id }catch(e){}
  if(!id) id=pickMember();
  const m=byId(id), band=Math.min(4,rankOf(id)), h=gap/36e5, bk=h<6?"s":h<36?"d":h<120?"f":"l";
  const hr=new Date().getHours(), tk=hr>=5&&hr<11?"am":hr<17&&hr>=11?"pm":hr>=17&&hr<22?"eve":"night";
  const beats=[[WG[id][tk],"smile"],...parseLine((WL[id][band]||WL[id][0])[bk])];
  const fast=RMQ.matches, exs=[...new Set(beats.map(b=>b[1]))];
  try{ setPause("welc",true) }catch(e){}
  const ov=el("div","exitv welc"); ov.id="welc"; ov.style.setProperty("--c",m.c); ov.setAttribute("role","dialog"); ov.setAttribute("aria-label","成員迎接");
  const motes=Array.from({length:7},(_,i)=>`<i style="--x:${10+((i*37)%60)}%;--s:${(.5+(i%4)*.28).toFixed(2)};--k:${i%3?m.c:"#E9CF8F"}"></i>`).join("");
  ov.innerHTML=`<div class="ex-dim"></div><div class="ex-glow"></div><div class="ex-motes">${motes}</div>
    <div class="ex-fig"><div class="ex-body">${exs.map((ex,i)=>`<img alt="" class="ex-a" data-ex="${ex}" style="opacity:${i?.001:1}">`).join("")}<div class="ex-blink"></div></div></div>
    <div class="vbox locked" data-m="${id}"><div class="panel"></div><div class="vname">${m.n}<i class="en">${m.f.toUpperCase()}</i></div><div class="vtext"></div></div>
    <div class="ex-st"><span class="ok">上次見面:${gapText(gap)}前</span></div>`;
  ov.querySelector(".vname").style.setProperty("--nc",m.c); stage.appendChild(ov);
  const L=[], q=s=>ov.querySelector(s), OUT="cubic-bezier(.22,.8,.3,1)";
  let done=false, typedAll=false, fin;
  const finished=new Promise(r=>fin=r);
  WBX={ov,skip:()=>{ if(!typedAll){ typedAll="skip"; return } fin() }};
  ov.addEventListener("click",()=>WBX?.skip());
  A(L,q(".ex-dim"),[{opacity:0},{opacity:1}],fast?.2:.45,0,"ease-out");
  A(L,q(".ex-st"),[{opacity:0,translate:"0 -.8cqw"},{opacity:1,translate:"0 0"}],.5,.2,OUT);
  const fig=q(".ex-fig"), body=q(".ex-body"), imgs=[...ov.querySelectorAll(".ex-a")], blink=q(".ex-blink");
  const W0=OVL?.[m.f]?.W||920, H0=OVL?.[m.f]?.H||2954, hh=(m.cm||165)/168;
  fig.style.cssText=`height:120cqw;aspect-ratio:${W0}/${H0};top:calc(-1cqw + ${(1-hh).toFixed(3)} * 120cqw)`;
  let ss=null; try{ ss=await Promise.race([Promise.all(exs.map(ex=>spriteOf(id,ex))),wait(900).then(()=>null)]) }catch(e){}
  imgs.forEach((im,i)=>{ im.src=ss?.[i]?.src||spr(id,null,exs[i]) });
  try{ await Promise.race([Promise.all(imgs.map(im=>im.decode().catch(()=>{}))),wait(800)]) }catch(e){}
  await stableFrames(500);
  const bi=OVL_IMG?.[m.f+"|blink"], o0=OVL?.[m.f];
  if(bi&&o0?.blink){ const [x,y,w,hb]=bi.naturalWidth>=o0.W*.98?[0,0,o0.W,o0.H]:o0.blink;
    Object.assign(blink.style,{backgroundImage:`url("${bi.src}")`,backgroundSize:`${w/o0.W*100}% ${hb/o0.H*100}%`,backgroundPosition:`${w<o0.W?x/(o0.W-w)*100:0}% ${hb<o0.H?y/(o0.H-hb)*100:0}%`}) }
  try{ window.sfx?.("welcome") }catch(e){}
  A(L,q(".ex-glow"),[{opacity:0,scale:.85},{opacity:.7,scale:1}],1.0,0,"ease-out");
  q(".ex-motes").querySelectorAll("i").forEach((e,i)=>A(L,e,[{opacity:0,translate:"0 0"},{opacity:.85,offset:.2},{opacity:.6,offset:.7},{opacity:0,translate:`${(i%2?1:-1)*1.5}cqw -30cqw`}],3.6+(i%3)*.7,.1+i*.3,"linear"));
  A(L,fig,fast?[{opacity:0},{opacity:1}]:[{opacity:0,translate:"-54% 0"},{opacity:1,translate:"-50% 0",offset:.82},{opacity:1,translate:"-50% 0"}],fast?.3:.9,0,OUT);
  A(L,q(".vbox"),[{opacity:0,translate:"0 1.2cqw"},{opacity:1,translate:"0 0"}],.45,.6,OUT);
  let cur=exs[0]; const tx=q(".vtext");
  const swap=ex=>{ if(ex===cur) return; const nw=imgs.find(i=>i.dataset.ex===ex), od=imgs.find(i=>i.dataset.ex===cur); if(!nw||!od) return;
    nw.style.zIndex="1"; od.style.zIndex="2"; nw.style.opacity="1"; cur=ex;
    od.animate([{opacity:1},{opacity:.001}],{duration:260,easing:"ease-out",fill:"forwards"}).finished.then(()=>{ od.style.opacity=".001"; od.style.zIndex="" },()=>{});
    if(!fast) body.animate(ex==="shy"?[{translate:"0 0",rotate:"0deg"},{translate:"0 .5%",rotate:"-.6deg"},{translate:"0 .25%",rotate:"-.4deg"}]:[{translate:"0 0"},{translate:"0 -.6%"},{translate:"0 0"}],{duration:ex==="shy"?700:420,easing:"cubic-bezier(.3,.7,.3,1)",fill:ex==="shy"?"forwards":"none",composite:"add"}) };
  const blinkT=setTimeout(()=>{ if(!fast&&BLINK_OK.has(cur)&&!done) blink.animate([{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.85},{opacity:0}],{duration:130}) },2600);
  const P=ch=>/[。!?!?]/.test(ch)?.28:/[,、;:,;:]/.test(ch)?.14:ch==="…"?.1:/[—~~]/.test(ch)?.12:0;
  const full=beats.map(b=>b[0]).join("");
  (async()=>{ await wait(900);
    for(let b=0;b<beats.length&&typedAll!=="skip";b++){ const [t,ex]=beats[b];
      if(b>0){ await wait(450); if(typedAll==="skip") break; swap(ex) }
      const base=tx.textContent, chars=[...t]; let tk=0;
      for(let i=1;i<=chars.length;i++){ if(typedAll==="skip") break; tx.textContent=base+chars.slice(0,i).join(""); const ch=chars[i-1], nx=chars[i]||"";
        if(/[\p{L}\p{N}]/u.test(ch)&&++tk%3===0) exBlip(id); await wait((.042+(P(ch)&&!P(nx)?P(ch):ch==="…"?.05:0))*1000) } }
    tx.textContent=full; swap(beats[beats.length-1][1]); typedAll=true;
    await Promise.race([wait(1700),finished]); fin() })();
  await finished; done=true; clearTimeout(blinkT);
  for(const s2 of [".ex-fig",".vbox",".ex-glow",".ex-motes",".ex-st"]) A(L,q(s2),[{opacity:1},{opacity:0}],.45,0,"ease-in","forwards");
  const a=ov.animate([{opacity:1},{opacity:0}],{duration:fast?200:650,delay:fast?0:150,fill:"forwards"});
  await a.finished.catch(()=>{});
  ov.remove(); WBX=null; try{ setPause("welc",false) }catch(e){}
};

/* ============================== 介面音效(audio.js 的 window.sfx) ============================== */
document.addEventListener("click",e=>{ const t=e.target; if(!(t instanceof Element)||!window.sfx) return;
  if(t.closest("#title,#ti,.exitv")) return;
  if(t.closest(".fac-close,#setClose,#pHome,[data-close]")) return window.sfx("close");
  if(t.closest("#menuBtn,#phoneBtn,#memBtn")) return window.sfx("open");
  if(t.closest(".dia button,.dia .opt,[data-choice]")) return window.sfx("select");
  if(t.closest("[data-ft],.fac-tabs button,.ptab,[role=tab]")) return window.sfx("tab");
  if(t.closest("label.chk")) return;   // 開關另外處理(change)
  if(t.closest("button,.fbtn,.b,.ibtn,.fchip,.pbtn,.tbtn,.cbtn,.mbtn,.papp,.room,.pin,.rp")) window.sfxTap?.(e.timeStamp) },true);
document.addEventListener("change",e=>{ const t=e.target; if(t?.matches?.("label.chk>input")) window.sfx?.(t.checked?"on":"off") });
addEventListener("DOMContentLoaded",()=>{
  // 打開設施:打開聲
  for(const k of ["openFacility","openSongFacility","openRecords","openMVRoom","openMaker","openStageRoom","openPhoto"]){ const f=window[k]; if(typeof f!=="function"||f.__sfx) continue;
    const w=function(...a){ try{ window.sfx?.(k==="openPhoto"?"shutter":"open") }catch(e){} return f.apply(this,a) }; w.__sfx=1; window[k]=w }
  // 大小好事:跟震動同一個時機(關係升階 → chime;解鎖回憶、出道、拿一位、演唱會 → sparkle)
  const fb=window.feedback; if(typeof fb==="function"&&!fb.__sfx){ const w=lv=>{ try{ if(lv==="m") window.sfx?.("chime"); else if(lv==="l") window.sfx?.("sparkle") }catch(e){} return fb(lv) }; w.__sfx=1; window.feedback=w }
  // 手機新訊息:未讀數增加、手機沒開著 → 提示音
  let lastU=null; setInterval(()=>{ if(typeof S==="undefined") return; const u=+S.unread||0; if(lastU!=null&&u>lastU&&!document.querySelector("#phone.on,#title")) window.sfx?.("notify"); lastU=u },1000);
});

/* 選單「離開遊戲」 */
document.getElementById("quitBtn")?.addEventListener("click",()=>window.exitGame("menu"));

/* 開場:越早開始越好(讀存檔、畫地圖在背景進行) */
try{ startIntro() }catch(e){ logE(e); const t=document.getElementById("title"); t?.classList.remove("intro"); t?.querySelector(".ti")?.remove() }
})();
