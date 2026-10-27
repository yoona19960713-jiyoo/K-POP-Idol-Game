"use strict";
/* =====================================================================
   MV(2026-10-27)
   ・AI 影片 MV:主打與部分收錄曲由「MV 製作專用對話」剪好,檔名是歌曲代號(製作單的 code),放在 www/assets/mv/<code>.mp4;
     遊戲找得到就播影片。
   ・動態 MV:其他歌直接在遊戲裡用造型圖、舞台背景做——依時間軸,單人句是那位成員的特寫(上半身、緩慢推近,主歌加電影黑邊),
     多人句與副歌是分割畫面,前奏是片名卡,舞蹈段快速切換五人,尾奏是結尾卡;字幕顯示中文與韓文歌詞。
     造型的挑法:主打用待機室打歌準備單選的造型 → 她有圖的舞台/演唱會/活動造型(依歌曲固定挑一套)→ 其他有圖的造型 → 目前穿著的立繪。
   入口:錄音室「MV」(window.openMV)。還沒有音檔時用無聲的時間軸,之後 T.audio 有值就跟著音樂。
   ===================================================================== */
(()=>{
const API=()=>window.SONGS_API, IDS=["ys","tr","hy","he","hr"];
const hasMV={};   // 只記「有」:沒有的每次再看一下(本機檔案,很快)
async function mvFile(T){ const u=`assets/mv/${encodeURIComponent(T.id)}.mp4`; if(hasMV[T.id]) return u;
  try{ const r=await fetch(u,{method:"HEAD",cache:"no-store"}); if(r.ok&&(r.headers.get("content-type")||"").includes("video")) hasMV[T.id]=1 }catch(e){} return hasMV[T.id]?u:null }
function lookRef(mid,T){ try{ const slot=slotOf(mid), R=API().R, plan=(R.title===T.id&&window.stagePlanLooks?.())||{}, has=c=>ITEMS[c]?.members?.[slot]?.img;
    if(plan[mid]&&has(plan[mid])) return has(plan[mid]);
    const L=wLooks().filter(l=>l.members?.[slot]?.img), st=L.filter(l=>/舞台|演唱會|活動/.test(l.occasion||"")), pool=st.length?st:L; if(!pool.length) return null;
    const h=[...(T.id+mid)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7); return pool[h%pool.length].members[slot].img }catch(e){ return null } }
const BG={bright:["assets/bg/ev_showcase.webp","assets/bg/ev_festival.webp","assets/bg/concert_hall.webp"],dark:["assets/bg/ev_stage.webp","assets/bg/concert_dome.webp","assets/bg/concert_arena.webp"]};
const DARK=new Set(["神祕","狂野","悲傷"]);
function timeline(T){ const A=API(), ev=[], secs=[]; let t=0;
  T.secs.forEach((s,si)=>{ const t0=t; s.lines.forEach((l,li)=>{ const d=Math.max(.5,+l.s||0); ev.push({si,t0:t,t1:t+d,who:l.who||[],zh:l.zh||"",ko:l.ko||"",k:!!l.k}); t+=d });
    t+=A.instOf(s); secs.push({si,t0,t1:t,n:s.n,chorus:!!s.chorus,lines:s.lines.length}) });
  return {ev,secs,total:Math.max(1,t)} }
function shotsOf(T,L){ const out=[], bgs=BG[DARK.has(T.mood)?"dark":"bright"]; let bi=0;
  const add=o=>{ const p=out[out.length-1]; if(p&&p.type===o.type&&String(p.who)===String(o.who)&&p.sec===o.sec) p.t1=o.t1; else out.push(o) };
  L.secs.forEach((s,i)=>{ const brk=/舞蹈段|後副歌/.test(s.n), lines=L.ev.filter(e=>e.si===s.si);
    if(i===0&&!lines.length){ add({type:"title",t0:s.t0,t1:s.t1,bg:bgs[0],sec:i}); return }
    if(brk||!lines.length){ if(brk){ let t=s.t0,k=0; while(t<s.t1-.3){ const t1=Math.min(s.t1,t+1.4); add({type:k%4===3?"group":"solo",who:k%4===3?IDS:[IDS[k%5]],t0:t,t1,sec:i,fast:1}); t=t1; k++ } }
      else add({type:i===L.secs.length-1?"end":"bg",t0:s.t0,t1:s.t1,bg:bgs[(bi++)%bgs.length],sec:i}); return }
    lines.forEach(e=>{ const w=e.who.length?e.who:IDS; add({type:w.length===1?"solo":"group",who:w,t0:e.t0,t1:e.t1,sec:i,ch:s.chorus,k:e.k}) });
    const last=lines[lines.length-1]; if(s.t1-last.t1>.6) add({type:"bg",t0:last.t1,t1:s.t1,bg:bgs[(bi++)%bgs.length],sec:i}) });
  for(let i=out.length-1;i>0;i--) if(out[i].t1-out[i].t0<1.1&&!out[i].fast){ out[i-1].t1=out[i].t1; out.splice(i,1) }   // 太短的鏡頭併到前一個
  return out }
let CUR=null;
function close(){ if(!CUR) return; cancelAnimationFrame(CUR.raf); CUR.au?.pause(); CUR.el.remove(); CUR=null; setPause("mv",false) }
async function playVideo(T,url){ close(); const el=document.createElement("div"); el.className="mvv"; el.innerHTML=`<video src="${url}" controls playsinline autoplay></video><button class="spv-x" id="mvX">關閉</button>`;
  $("#stage").appendChild(el); setPause("mv",true); CUR={el,raf:0}; $("#mvX").onclick=close }
window.openMV=async(T,opts={})=>{ if(!T) return; const u=opts.motion?null:await mvFile(T); if(u) return playVideo(T,u); return openMotionMV(T) };
async function openMotionMV(T){ close(); const A=API(), L=timeline(T), SH=shotsOf(T,L);
  const el=document.createElement("div"); el.className="mvp"; el.innerHTML=`<div class="mvp-a" id="mvA"></div><div class="mvp-a" id="mvB"></div><div class="mvp-v"></div><div class="mvp-lb"></div><div class="mvt mvt-ov" id="mvTitle"><small>OFFICIAL MUSIC VIDEO</small><h2>${esc(T.name||"")}</h2></div>
    <div class="spv-top"><div><small>MUSIC VIDEO</small><h3>${esc(T.name||"未命名")}</h3></div><button class="spv-x" id="mvX">關閉</button></div>
    <div class="spv-sub"><span class="spv-who" id="mvWho"></span><p id="mvZh"></p><small id="mvKo"></small></div>
    <div class="spv-bar"><div class="spv-secs">${L.secs.map(s=>`<button data-t="${s.t0}" class="${s.chorus?"ch":""}" style="flex-grow:${Math.max(1,Math.round(s.t1-s.t0))}" aria-label="${esc(s.n)}"></button>`).join("")}</div><i id="mvP"></i></div>
    <div class="spv-ctl"><button id="mvPlay">準備中…</button><span id="mvTime">0:00 / ${A.fmt(L.total)}</span><small>${T.audio?"":"動態 MV・還沒有音檔,先用無聲的時間軸"}</small></div>`;
  $("#stage").appendChild(el); setPause("mv",true); CUR={el,raf:0};
  $("#mvX").onclick=close;
  // 先把要用的圖準備好(造型圖在雲端,第一次要下載)
  const imgs={}; await Promise.all(IDS.map(async id=>{ const ref=lookRef(id,T); let u=ref?await getBlob(ref).catch(()=>""):""; if(!u) u=spr(id,null,"smile"); imgs[id]=u;
    try{ const im=new Image(); im.src=u; await im.decode() }catch(e){} }));
  if(!CUR||CUR.el!==el) return;
  let au=null; try{ if(T.audio){ const u=await getBlob(T.audio); if(u){ au=new Audio(u); au.play().catch(()=>{}) } } }catch(e){}
  const layers=[$("#mvA"),$("#mvB")]; let front=0, curShot=-1, lastEv=-2, lastS=-1, playing=true, base=performance.now(), off=0;
  const now=()=>au?au.currentTime:off+(playing?(performance.now()-base)/1000:0);
  const kb=["kb1","kb2","kb3","kb4"];
  const render=sh=>{ const d=Math.max(1,sh.t1-sh.t0), anim=`${kb[(sh.t0*7|0)%4]} ${(d+.8).toFixed(2)}s linear both`;
    if(sh.type==="title"||sh.type==="bg"||sh.type==="end") return `<div class="mvs bg" style="background-image:url(${sh.bg});animation:${anim}"></div>${sh.type==="title"?`<div class="mvt"><small>OFFICIAL MUSIC VIDEO</small><h2>${esc(T.name||"")}</h2></div>`:sh.type==="end"?`<div class="mvt end"><h2>${esc(T.name||"")}</h2><small>完美女團</small></div>`:""}`;
    if(sh.type==="solo"){ const u=imgs[sh.who[0]], full=!sh.k&&((sh.t0*3|0)%3===2);   // 大多是上半身特寫,偶爾全身(後面墊模糊的同一張)
      return full?`<div class="mvs full" style="--c:${A.byId(sh.who[0]).c}"><b style="background-image:url(${u})"></b><i style="background-image:url(${u});animation:${anim}"></i></div>`
        :`<div class="mvs solo" style="--c:${A.byId(sh.who[0]).c}"><i style="background-image:url(${u});animation:${anim}"></i></div>` }
    return `<div class="mvs grp">${sh.who.map(id=>`<i style="--c:${A.byId(id).c};background-image:url(${imgs[id]});animation:${anim}"></i>`).join("")}</div>` };
  const show=i=>{ const sh=SH[i]; if(!sh) return; front=1-front; const a=layers[front], b=layers[1-front];
    a.innerHTML=render(sh); a.classList.add("on"); b.classList.remove("on");
    el.classList.toggle("lb",sh.type==="solo"&&!sh.ch&&!sh.fast); el.classList.toggle("chorus",!!sh.ch) };
  const SB=el.querySelector(".spv-sub");
  const sub=ei=>{ const e=L.ev[ei]; SB.classList.toggle("off",!e||(!e.zh&&!e.ko)); if(!e){ $("#mvWho").textContent=""; $("#mvZh").textContent=""; $("#mvKo").textContent=""; return }
    $("#mvWho").textContent=e.who.length>=5?"全員":e.who.map(id=>A.byId(id).n).join("、"); $("#mvZh").textContent=e.zh||""; $("#mvKo").textContent=e.ko||"" };
  const P=$("#mvP"), TM=$("#mvTime");
  const frame=()=>{ if(!CUR||CUR.el!==el) return; let t=now(); if(t>=L.total){ t=L.total; playing=false; au?.pause(); $("#mvPlay").textContent="▶ 再看一次" }
    P.style.transform=`scaleX(${(t/L.total).toFixed(4)})`;
    const ttl=$("#mvTitle"), endT=t>L.total-4; ttl.classList.toggle("show",t<3.8||endT); ttl.classList.toggle("end",endT);   // 開頭片名、最後結尾卡
    const si=SH.findIndex(s=>t>=s.t0&&t<s.t1); if(si>=0&&si!==curShot){ curShot=si; show(si) }
    const ei=L.ev.findIndex(e=>t>=e.t0&&t<e.t1); if(ei!==lastEv){ lastEv=ei; sub(ei) }
    const s1=Math.floor(t); if(s1!==lastS){ lastS=s1; TM.textContent=`${A.fmt(t)} / ${A.fmt(L.total)}` }
    if(playing) CUR.raf=requestAnimationFrame(frame) };
  const seek=t=>{ t=Math.max(0,Math.min(L.total-.05,t)); if(au) au.currentTime=t; else { off=t; base=performance.now() } curShot=lastEv=-2 };
  $("#mvPlay").textContent="❚❚ 暫停";
  $("#mvPlay").onclick=()=>{ if(!playing){ if(now()>=L.total-.05) seek(0); playing=true; base=performance.now(); au?.play().catch(()=>{}); $("#mvPlay").textContent="❚❚ 暫停"; CUR.raf=requestAnimationFrame(frame) }
    else { off=now(); playing=false; au?.pause(); $("#mvPlay").textContent="▶ 繼續" } };
  el.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{ seek(+b.dataset.t); if(!playing) frame() });
  CUR.au=au; base=performance.now(); CUR.raf=requestAnimationFrame(frame) }
window.openMotionMV=openMotionMV; window.closeMV=close;
})();
