"use strict";
/* =====================================================================
   里程碑過場動畫(改版 1.0 第 5 輪;2026-10-29 使用者:不需要做選擇的專屬劇情,前面加 30~60 秒精緻的過場)
   一段過場 = 好幾個鏡頭(shot),每個鏡頭:背景(慢慢推近或平移)、成員(從旁邊滑進來、淡入)、字幕、日期、名牌、
   標題、天氣粒子;鏡頭之間淡入淡出、白光或黑幕。上下有電影黑邊。
   流暢度(A55):跟開場動畫同一套做法:只動 transform 與 opacity,用 Web Animations;所有圖先解碼好才開始;
   不做模糊、不改濾鏡。點一下畫面出現「略過」;系統開「減少動態效果」時只淡入淡出。打開時時間暫停。
   ===================================================================== */
(()=>{
const RM=matchMedia("(prefers-reduced-motion:reduce)");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const mk=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e };
const decode=src=>{ const i=new Image(); i.decoding="async"; i.src=src; return (i.decode?i.decode():new Promise((ok,no)=>{i.onload=ok;i.onerror=no})).then(()=>i,()=>null) };
const ROLE={ys:["YESEUL","LEADER · LEAD VOCAL"],tr:["TAERI","MAIN RAPPER · LEAD DANCER"],hy:["HIYORI","MAIN DANCER · SUB VOCAL"],he:["HAEUN","VISUAL · SUB RAPPER"],hr:["HARAM","MAIN VOCAL · MAKNAE"]};
let RUN=null;
/* 成員立繪:她現在穿的衣服(或指定的造型) */
const figSrc=(f)=>spr(f.id,f.outfit!==undefined?f.outfit:outfitAt(f.id,f.room||S.where[f.id],f.slot??S.slot),f.e||"neutral");
function shotEl(sh){ const L=mk("div","cn-shot");
  if(sh.bg){ const b=mk("div","cn-bg"); b.style.backgroundImage=`url("${sh.bg}")`; if(sh.pos) b.style.backgroundPosition=sh.pos; L.appendChild(b); L._bg=b;
    if(sh.video){ const v=mk("video","cn-vid"); Object.assign(v,{src:sh.video,muted:true,loop:true,playsInline:true,autoplay:true}); v.setAttribute("playsinline",""); v.addEventListener("playing",()=>v.classList.add("on"),{once:true}); b.appendChild(v); v.play?.().catch(()=>{}) } }   // 會動的 CG(載不到就看背景圖)
  if(sh.fx) L.appendChild(mk("div","cn-fx "+sh.fx,Array.from({length:sh.fx==="snow"?26:14},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100}%;--d:${(i*7)%10}"></i>`).join("")));
  L._figs=(sh.figs||[]).map(f=>{ const w=mk("div","cn-fig"); w.style.cssText=`left:${f.x}%;top:${f.top??10}%;height:${f.h??124}%;--c:${byId(f.id)?.c||"#fff"}`; const im=mk("img"); im.src=figSrc(f); im.alt=""; w.appendChild(im); L.appendChild(w); return [w,f] });
  if(sh.cap){ const c=mk("div","cn-cap "+(sh.cap.at||"b"),esc(sh.cap.t)); L.appendChild(c); L._cap=c }
  if(sh.plate){ const m=byId(sh.plate.id), r=ROLE[sh.plate.id]; const p=mk("div","cn-plate "+(sh.plate.side||"l"),`<b>${esc(m.n)}</b><em>${r[0]}</em><small>${r[1]}</small>`); p.style.setProperty("--c",m.c); L.appendChild(p); L._plate=p }
  if(sh.title){ const t=mk("div","cn-title",`<small>${esc(sh.title.small||"")}</small><b>${esc(sh.title.big)}</b>`); L.appendChild(t); L._title=t }
  L._photos=(sh.photos||[]).map(ph=>{ const w=mk("div","cn-photo"); w.style.cssText=`left:${ph.x}%;top:${ph.y}%;width:${ph.w}%;--r:${ph.r||0}deg`; w.innerHTML=`<img src="${ph.src}" alt="">`; L.appendChild(w); return [w,ph] });
  if(sh.poster){ const p=mk("div","cn-poster",`<small>${esc(sh.poster.small||"")}</small><b>${esc(sh.poster.big)}</b><span>${esc(sh.poster.sub||"")}</span>`); L.appendChild(p); L._poster=p }
  if(sh.flash) L.appendChild(mk("div","cn-flashes",Array.from({length:sh.flash},(_,i)=>`<i style="--i:${i}"></i>`).join("")));
  return L }
function animShot(L,sh){ const D=sh.dur, A=[], rm=RM.matches;
  if(L._bg&&!rm){ const k=sh.kb||[1.04,1.12,0,0,0,0]; A.push(L._bg.animate([{transform:`translate(${k[2]}%,${k[4]}%) scale(${k[0]})`},{transform:`translate(${k[3]}%,${k[5]}%) scale(${k[1]})`}],{duration:D+900,easing:"linear",fill:"both"})) }
  for(const [w,f] of L._figs){ const dl=f.delay||0, from=f.from||"fade", dx=from==="l"?-8:from==="r"?8:0, dy=from==="up"?4:0;
    w.style.opacity=0; A.push(w.animate(rm?[{opacity:0},{opacity:1}]:[{opacity:0,transform:`translate(-50%,0) translate(${dx}%,${dy}%)`},{opacity:1,transform:"translate(-50%,0) translate(0,0)"}],{duration:900,delay:dl,easing:"cubic-bezier(.2,.8,.25,1)",fill:"forwards"}));
    if(!rm&&f.drift) A.push(w.querySelector("img").animate([{transform:"translateY(0)"},{transform:"translateY(-1.2%)"}],{duration:D,delay:dl,easing:"ease-in-out",fill:"both"})) }
  if(L._cap){ const dl=sh.cap.delay??500; L._cap.style.opacity=0; A.push(L._cap.animate([{opacity:0,transform:"translateY(.4em)"},{opacity:1,transform:"none",offset:.12},{opacity:1,offset:.86},{opacity:0}],{duration:Math.max(1200,D-dl-150),delay:dl,fill:"both"})) }
  if(L._plate){ const dl=sh.plate.delay??700; L._plate.style.opacity=0; A.push(L._plate.animate([{opacity:0,transform:"translateX(-1.2em)"},{opacity:1,transform:"none",offset:.15},{opacity:1,offset:.85},{opacity:0}],{duration:Math.max(1200,D-dl-100),delay:dl,fill:"both"})) }
  for(const [w,ph] of L._photos||[]){ w.style.opacity=0; A.push(w.animate(rm?[{opacity:0},{opacity:1}]:[{opacity:0,transform:"translateY(12%) rotate(calc(var(--r) - 6deg)) scale(1.08)"},{opacity:1,transform:"rotate(var(--r))"}],{duration:700,delay:ph.delay||0,easing:"cubic-bezier(.2,.8,.25,1)",fill:"forwards"})) }
  if(L._poster){ L._poster.style.opacity=0; A.push(L._poster.animate([{opacity:0,transform:"scale(1.06)"},{opacity:1,transform:"none",offset:.3},{opacity:1}],{duration:D,delay:150,easing:"ease-out",fill:"both"})) }
  if(L._title){ L._title.style.opacity=0; A.push(L._title.animate([{opacity:0,letterSpacing:".6em"},{opacity:1,letterSpacing:".32em",offset:.25},{opacity:1,offset:.8},{opacity:0}],{duration:D,delay:200,easing:"ease-out",fill:"both"})) }
  return A }
/* 播放:script={shots:[...]};播完或略過都會呼叫 onEnd */
window.cinePlay=async(script,onEnd)=>{ if(RUN) return; const root=mk("div","cine"); root.innerHTML=`<div class="cn-stage"></div><div class="cn-bar t"></div><div class="cn-bar b"></div><div class="cn-date"></div><button class="cn-skip" hidden>略過 ›</button>`;
  $("#stage").appendChild(root); setPause("cine",true); const stage=root.querySelector(".cn-stage"); let alive=true, sk=null;
  RUN={root,end:()=>{ if(!alive) return; alive=false; RUN=null; root.animate([{opacity:1},{opacity:0}],{duration:450,fill:"forwards"}).finished.then(()=>{ root.remove(); setPause("cine",false); onEnd?.() }) }};
  root.onclick=e=>{ const b=root.querySelector(".cn-skip"); if(e.target===b){ RUN?.end(); return } b.hidden=false; clearTimeout(sk); sk=setTimeout(()=>b.hidden=true,2600) };
  // 先把所有圖解碼好
  const srcs=new Set(); for(const sh of script.shots){ if(sh.bg) srcs.add(sh.bg); for(const f of sh.figs||[]) srcs.add(figSrc(f)); for(const ph of sh.photos||[]) srcs.add(ph.src) }
  await Promise.race([Promise.all([...srcs].map(decode)),wait(2500)]);
  root.animate([{opacity:0},{opacity:1}],{duration:500,fill:"forwards"});
  if(!RM.matches){ root.querySelector(".cn-bar.t").animate([{transform:"translateY(-100%)"},{transform:"none"}],{duration:900,easing:"ease-out",fill:"both"}); root.querySelector(".cn-bar.b").animate([{transform:"translateY(100%)"},{transform:"none"}],{duration:900,easing:"ease-out",fill:"both"}) }
  let prev=null;
  for(const sh of script.shots){ if(!alive) return; const L=shotEl(sh); stage.appendChild(L);
    { const d=root.querySelector(".cn-date");   // 日期只在有寫的鏡頭出現,下一個鏡頭淡掉(不跟名牌疊在一起)
      if(sh.date){ d.innerHTML=`<b>${esc(sh.date[0])}</b><span>${esc(sh.date[1]||"")}</span>`; d.animate([{opacity:0,transform:"translateY(-.3em)"},{opacity:1,transform:"none"}],{duration:900,delay:300,fill:"both"}); d._on=1 }
      else if(d._on){ d._on=0; d.animate([{opacity:1},{opacity:0}],{duration:500,fill:"forwards"}) } }
    const tr=sh.trans||"fade", T=tr==="cut"?0:tr==="slow"?1400:700;
    if(tr==="white"||tr==="black"){ const f=mk("div","cn-flash "+tr); root.appendChild(f); f.animate([{opacity:0},{opacity:1,offset:.45},{opacity:1,offset:.55},{opacity:0}],{duration:900,fill:"forwards"}).finished.then(()=>f.remove()); await wait(400) }
    L.style.opacity=0; L.animate([{opacity:0},{opacity:1}],{duration:Math.max(1,T),fill:"forwards"}); animShot(L,sh);
    if(prev){ const p=prev; setTimeout(()=>p.remove(),T+60) } prev=L;
    await wait(sh.dur) }
  if(alive){ const d=root.querySelector(".cn-date"); d.animate([{opacity:1},{opacity:0}],{duration:500,fill:"forwards"}); await wait(400); RUN?.end() } };
window.cineBusy=()=>!!RUN;
/* ---------- 各里程碑的分鏡 ---------- */
const BG=(n,l="dawn")=>seasonArt("bg",n,l), SC=(n,l="dawn")=>seasonArt("scene",n,l);
window.CINE={
  /* 上任第一天(約 40 秒):清晨的首爾 → 公司 → 五個人各自的早晨 → 練習室集合 → 標題 */
  first_day:()=>({shots:[
    {dur:4600,bg:SC("map","dawn"),kb:[1.02,1.16,0,6,0,1.5],fx:"snow",date:["2016.01.13 WED","06:00"],cap:{t:"首爾,一月。",at:"c",delay:900},trans:"slow"},
    {dur:4200,bg:SC("company","dawn"),kb:[1.1,1.42,0,-2,6,20],cap:{t:"公司大樓四樓,練習室的燈已經亮了。"}},
    {dur:5000,bg:BG("practice"),kb:[1.06,1.1,1,-1,0,0],figs:[{id:"hy",x:36,top:10,h:124,from:"l",delay:250,e:"smile",drift:1,room:"practice",slot:0}],plate:{id:"hy",side:"r"},cap:{t:"日和每天六點,一個人做芭蕾伸展。",delay:1400}},
    {dur:4300,bg:BG("kitchen"),kb:[1.05,1.1,-1,1,0,0],figs:[{id:"he",x:62,top:10,h:124,from:"r",delay:200,e:"smile",drift:1,room:"kitchen",slot:0}],plate:{id:"he",side:"l"},cap:{t:"夏恩已經在煮五個人的早餐。",delay:1300}},
    {dur:4300,bg:BG("studio"),kb:[1.08,1.12,0,-1,0,0],figs:[{id:"tr",x:38,top:10,h:124,from:"l",delay:200,e:"neutral",drift:1,room:"studio",slot:0}],plate:{id:"tr",side:"r"},cap:{t:"泰梨一夜沒睡,耳機裡是還沒寫完的歌。",delay:1300}},
    {dur:4300,bg:BG("river"),kb:[1.04,1.12,2,-2,0,0],fx:"snow",figs:[{id:"hr",x:60,top:10,h:124,from:"r",delay:150,e:"laugh",drift:1,room:"river",slot:0}],plate:{id:"hr",side:"l"},cap:{t:"河嵐……今天又睡過頭了。",delay:1300}},
    {dur:4800,bg:BG("practice"),kb:[1.1,1.04,0,0,0,0],figs:[{id:"ys",x:50,top:10,h:124,from:"up",delay:200,e:"smile",drift:1,room:"practice",slot:0}],plate:{id:"ys",side:"l"},cap:{t:"隊長藝瑟,把今天的練習表又看了一遍。",delay:1400}},
    {dur:6400,bg:BG("practice"),kb:[1.12,1.02,0,0,0,0],trans:"white",figs:[
      {id:"hy",x:18,top:14,h:92,delay:200,e:"smile",room:"practice",slot:0},{id:"he",x:34,top:13,h:92,delay:450,e:"smile",room:"practice",slot:0},
      {id:"ys",x:50,top:12,h:93,delay:700,e:"smile",room:"practice",slot:0},{id:"tr",x:66,top:13,h:92,delay:950,e:"neutral",room:"practice",slot:0},
      {id:"hr",x:82,top:14,h:92,delay:1200,e:"laugh",room:"practice",slot:0}],cap:{t:"今天,新的代表要來了。",at:"c",delay:2400}},
    {dur:4400,trans:"black",title:{small:"DAY 1",big:"上任第一天"}}]}),
  /* 第一次月評(約 36 秒):練習室、五個人各自的緊張、排成一排、標題 */
  first_eval:()=>({shots:[
    {dur:4400,bg:BG("practice","day"),kb:[1.04,1.14,0,-2,0,0],date:["2016.01.30 SAT","15:00"],cap:{t:"一月的最後一個週六。",at:"c",delay:800},trans:"slow"},
    {dur:3700,bg:BG("practice","day"),kb:[1.12,1.16,-2,0,0,0],figs:[{id:"ys",x:40,h:124,from:"l",e:"serious",drift:1,room:"practice",slot:2}],cap:{t:"藝瑟第三次確認隊形。",delay:900}},
    {dur:3600,bg:BG("practice","day"),kb:[1.14,1.18,2,0,0,0],figs:[{id:"tr",x:60,h:124,from:"r",e:"neutral",drift:1,room:"practice",slot:2}],cap:{t:"泰梨把耳機線纏在手指上。",delay:900}},
    {dur:3600,bg:BG("practice","day"),kb:[1.1,1.16,-1,1,0,0],figs:[{id:"hy",x:38,h:124,from:"l",e:"serious",drift:1,room:"practice",slot:2}],cap:{t:"日和在角落,一遍一遍確認轉圈。",delay:900}},
    {dur:3600,bg:BG("practice","day"),kb:[1.12,1.18,1,-1,0,0],figs:[{id:"he",x:62,h:124,from:"r",e:"smile",drift:1,room:"practice",slot:2}],cap:{t:"夏恩幫每個人重新綁好鞋帶。",delay:900}},
    {dur:3600,bg:BG("practice","day"),kb:[1.14,1.2,0,0,0,0],figs:[{id:"hr",x:50,h:124,from:"up",e:"shy",drift:1,room:"practice",slot:2}],cap:{t:"河嵐小聲開嗓,聲音有一點抖。",delay:900}},
    {dur:5600,bg:BG("practice","day"),kb:[1.1,1.02,0,0,0,0],trans:"white",figs:G5("practice",2,["smile","serious","serious","neutral","shy"]),cap:{t:"第一次月評,開始。",at:"c",delay:2200}},
    {dur:4200,trans:"black",title:{small:"FIRST EVALUATION",big:"第一次月評"}}]}),
  /* 第一次公司內部展示(約 34 秒) */
  showcase_in:()=>({shots:[
    {dur:4600,bg:SC("company","day"),kb:[1.08,1.4,0,-2,6,20],date:["2016.04.22 FRI","14:00"],cap:{t:"公司上上下下,都來了四樓。",delay:900},trans:"slow"},
    {dur:4400,bg:BG("practice","day"),kb:[1.02,1.1,2,-2,0,0],fx:"dust",cap:{t:"第一次,在大人們面前表演。",delay:700}},
    {dur:5200,bg:BG("practice","day"),kb:[1.12,1.04,0,0,0,0],fx:"dust",figs:G5("practice",2,["serious","serious","smile","smile","serious"]),cap:{t:"一百天的練習,要在三分鐘裡給所有人看。",delay:1800}},
    {dur:3800,bg:BG("practice","day"),kb:[1.18,1.24,0,0,0,0],trans:"white",figs:[{id:"ys",x:36,h:118,from:"l",e:"serious",room:"practice",slot:2},{id:"tr",x:64,h:118,from:"r",e:"serious",room:"practice",slot:2}],cap:{t:"音樂,下。",at:"c",delay:600}},
    {dur:3600,bg:BG("practice","day"),kb:[1.2,1.26,0,0,0,0],trans:"cut",figs:[{id:"hy",x:30,h:118,from:"up",e:"smile",room:"practice",slot:2},{id:"he",x:52,h:118,from:"up",e:"laugh",room:"practice",slot:2},{id:"hr",x:74,h:118,from:"up",e:"laugh",room:"practice",slot:2}]},
    {dur:4400,trans:"black",title:{small:"IN-HOUSE SHOWCASE",big:"第一次內部展示"}}]}),
  /* 出道曲定案與錄音(約 33 秒) */
  debut_song:v=>({shots:[
    {dur:4400,bg:SC("map","day"),kb:[1.02,1.14,0,5,0,1],date:["2016.08.19 FRI","14:00"],cap:{t:"八月,蟬聲很吵的下午。",at:"c",delay:800},trans:"slow"},
    {dur:4600,bg:BG("studio","day"),kb:[1.04,1.12,1,-1,0,0],cap:{t:v.song?`出道曲,決定了。〈${v.song}〉`:"出道曲,決定了。",at:"c",delay:900}},
    {dur:4300,bg:BG("studio","day"),kb:[1.12,1.18,-1,0,0,0],figs:[{id:"hr",x:42,h:124,from:"l",e:"serious",drift:1,room:"studio",slot:2}],plate:{id:"hr",side:"r"},cap:{t:"河嵐戴上耳機,深呼吸。",delay:1300}},
    {dur:4300,bg:BG("studio","day"),kb:[1.14,1.18,1,-1,0,0],figs:[{id:"tr",x:58,h:124,from:"r",e:"serious",drift:1,room:"studio",slot:2}],plate:{id:"tr",side:"l"},cap:{t:"泰梨在歌詞本上,改了最後一個字。",delay:1300}},
    {dur:4800,bg:BG("studio","day"),kb:[1.08,1.02,0,0,0,0],figs:[{id:"hy",x:26,h:104,top:11,delay:200,e:"smile",room:"studio",slot:2},{id:"ys",x:50,h:104,top:10,delay:450,e:"smile",room:"studio",slot:2},{id:"he",x:74,h:104,top:11,delay:700,e:"laugh",room:"studio",slot:2}],cap:{t:"大家擠在控制室的玻璃後面。",delay:1600}},
    {dur:4600,trans:"black",title:{small:"DEBUT SONG",big:v.song?`〈${v.song}〉`:"出道曲"}}]}),
  /* 中秋夜(約 32 秒):空蕩的宿舍 → 留下來的日和 → 頂樓的滿月 */
  chuseok:v=>({shots:[
    {dur:4400,bg:SC("map","evening"),kb:[1.02,1.14,0,-4,0,1],date:["2016.09.15 THU","20:00"],cap:{t:"中秋連假,首爾空了一半。",at:"c",delay:800},trans:"slow"},
    {dur:4200,bg:BG("living","evening"),kb:[1.04,1.1,1,-1,0,0],cap:{t:"宿舍很安靜。大家都回家了。",delay:700}},
    {dur:4800,bg:BG("living","evening"),kb:[1.1,1.14,0,0,0,0],figs:[{id:"hy",x:44,h:124,from:"l",e:"smile",drift:1,outfit:v.hyLook,room:"living",slot:3}],plate:{id:"hy",side:"r"},cap:{t:"只有日和,沒有回大阪。",delay:1300}},
    {dur:4800,bg:BG("roof","night"),kb:[1.02,1.12,0,0,-2,1],fx:"dust",cap:{t:"頂樓,看得到今年最圓的月亮。",at:"c",delay:900},trans:"slow"},
    {dur:5200,bg:BG("roof","night"),kb:[1.12,1.18,0,0,0,0],figs:[{id:"hy",x:56,h:118,from:"up",e:"shy",drift:1,outfit:v.hyLook,room:"roof",slot:3}],cap:{t:"「……代表,要一起賞月嗎?」",delay:1500}},
    {dur:4200,trans:"black",title:{small:"CHUSEOK",big:"中秋夜"}}]}),
  /* 概念照與 MV 拍攝(約 36 秒):有出道概念照造型的圖就用照片、可穿的立繪就用立繪 */
  concept_shoot:v=>({shots:[
    {dur:4400,bg:BG("photo","day"),kb:[1.02,1.1,0,0,0,0],flash:3,date:["2016.10.21 FRI","10:00"],cap:{t:"出道概念照,拍攝日。",at:"c",delay:900},trans:"slow"},
    ...["ys","tr","hy","he","hr"].map((id,i)=>v.imgs?.[id]?{dur:3800,bg:BG("photo","day"),kb:[1.1,1.14,i%2?1:-1,0,0,0],flash:1,photos:[{src:v.imgs[id],x:i%2?54:28,y:16,w:22,r:i%2?3:-3,delay:250}],plate:{id,side:i%2?"l":"r"}}
      :{dur:3800,bg:BG("photo","day"),kb:[1.1,1.14,i%2?1:-1,0,0,0],flash:1,figs:[{id,x:i%2?60:40,h:124,from:i%2?"r":"l",e:["serious","neutral","smile","smile","laugh"][i],drift:1,outfit:v.look||undefined,room:"photo",slot:1}],plate:{id,side:i%2?"l":"r"}}),
    {dur:5600,bg:BG("photo","day"),kb:[1.1,1.02,0,0,0,0],trans:"white",flash:2,...(v.group?{photos:[{src:v.group,x:24,y:13,w:52,r:-1.5,delay:300}]}:{figs:G5("photo",1,["smile","neutral","smile","laugh","laugh"],v.look)}),cap:{t:"快門響起的時候,不知道誰先笑了出來。",delay:2200}},
    {dur:4200,trans:"black",title:{small:"CONCEPT PHOTO",big:"概念照"}}]}),
  /* 公布出道日(約 30 秒):中午十二點 → 預告海報 → 通知 → 五個人的反應 */
  debut_announce:v=>({shots:[
    {dur:4200,bg:BG("office","day"),kb:[1.04,1.12,1,-1,0,0],date:["2016.11.21 MON","12:00"],cap:{t:"十一月二十一日,中午十二點整。",at:"c",delay:800},trans:"slow"},
    {dur:5600,poster:{small:"COMING SOON",big:v.name||"",sub:"2017.01.13  DEBUT"},trans:"white"},
    {dur:4200,bg:BG("living","day"),kb:[1.06,1.12,0,0,0,0],cap:{t:"留言,一則一則跳出來。",delay:700}},
    {dur:5600,bg:BG("living","day"),kb:[1.12,1.04,0,0,0,0],figs:G5("living",2,["moved","laugh","smile","laugh","laugh"]),cap:{t:"她們的名字,第一次被這麼多人看到。",delay:2000}},
    {dur:4200,trans:"black",title:{small:"D-53",big:"出道日公開"}}]}),
  /* Showcase 彩排(約 37 秒):舞台 → 後台 → 出道前五分鐘的 CG → 兩個人 → 燈亮 */
  rehearsal:v=>({shots:[
    {dur:4600,bg:"assets/bg/ev_stage.webp",kb:[1.02,1.12,0,0,0,0],fx:"dust",date:["2017.01.11 WED","15:00"],cap:{t:"Showcase 的場地。",at:"c",delay:900},trans:"slow"},
    {dur:4200,bg:BG("backstage","day"),kb:[1.04,1.1,-1,1,0,0],cap:{t:"兩天後,這裡會坐滿人。",delay:700}},
    {dur:5200,bg:"assets/cg/g_debut.webp",video:window.CG_VIDEO?.g_debut,kb:[1.02,1.08,0,0,0,0],cap:{t:"最後一次彩排。",delay:1400},trans:"slow"},
    {dur:4300,bg:BG("backstage","day"),kb:[1.12,1.16,0,0,0,0],figs:[{id:"ys",x:44,h:124,from:"l",e:"serious",drift:1,outfit:v.look||undefined,room:"practice",slot:2}],cap:{t:"藝瑟沒有笑。她在記每一個走位。",delay:1300}},
    {dur:4300,bg:BG("backstage","day"),kb:[1.14,1.18,0,0,0,0],figs:[{id:"hr",x:56,h:124,from:"r",e:"shy",drift:1,outfit:v.look||undefined,room:"practice",slot:2}],cap:{t:"河嵐的手心,全是汗。",delay:1300}},
    {dur:5600,bg:"assets/bg/ev_stage.webp",kb:[1.12,1.02,0,0,0,0],trans:"white",fx:"dust",figs:G5("practice",2,["serious","serious","smile","smile","shy"],v.look),cap:{t:"燈,亮了。",at:"c",delay:2400}},
    {dur:4400,trans:"black",title:{small:"REHEARSAL",big:"Showcase 彩排"}}]})};
/* 五人並排(左到右:日和、夏恩、藝瑟、泰梨、河嵐;跟主視覺一樣) */
function G5(room,slot,ex,outfit){ return [["hy",12],["he",31],["ys",50],["tr",69],["hr",88]].map(([id,x],i)=>({id,x,top:14,h:92,delay:200+i*250,e:ex[[2,3,0,1,4][i]]||"smile",room,slot,outfit:outfit||undefined})) }
})();
