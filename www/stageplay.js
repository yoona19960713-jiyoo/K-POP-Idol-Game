"use strict";
/* =====================================================================
   舞台預覽(2026-10-27):照歌曲的時間軸播放——段落、逐句歌詞字幕(中文+韓文)、誰在唱、編舞的隊形移動與動作名稱。
   還沒有音檔時用無聲的時鐘;之後歌曲有音檔(T.audio,跟造型圖一樣是雲端的 blob 參照)就跟著音樂的時間走。
   這是之後 MV 與動態舞台的骨架:成員現在是頭像,之後換成 Live2D/3D 或影片時,時間軸與編舞資料照用。
   入口:錄音室「舞台預覽」、練習室「舞台預覽」。
   ===================================================================== */
(()=>{
const API=()=>window.SONGS_API, IDS=["ys","tr","hy","he","hr"];
const DEF=[[.5,.3],[.3,.34],[.7,.34],[.12,.4],[.88,.4]];
function timeline(T){ const A=API(), ev=[], secs=[]; let t=0;
  T.secs.forEach((s,si)=>{ const t0=t; s.lines.forEach((l,li)=>{ const d=Math.max(.5,+l.s||0); ev.push({si,li,t0:t,t1:t+d,who:l.who||[],zh:l.zh||"",ko:l.ko||"",type:l.t,k:!!l.k}); t+=d });
    t+=A.instOf(s); secs.push({si,t0,t1:t,n:s.n,chorus:!!s.chorus}) });
  return {ev,secs,total:Math.max(1,t)} }
let CUR=null;
function closeSP(){ if(!CUR) return; cancelAnimationFrame(CUR.raf); CUR.au?.pause(); CUR.el.remove(); CUR=null; setPause("spv",false) }
window.closeStagePlay=closeSP;
window.openStagePlay=async(T,opts={})=>{ if(!T) return; closeSP(); const A=API(), L=timeline(T), CH=window.choreoSections?.(T)||null;
  const el=document.createElement("div"); el.className="spv"; el.id="spv";
  el.innerHTML=`<div class="spv-bg"></div><div class="spv-light"></div>
    <div class="spv-floor">${IDS.map(id=>{ const m=A.byId(id); return `<div class="spv-m" data-m="${id}" style="--c:${m.c}"><span class="spv-face" style="background-image:url(${spr(id,null,"smile")})"></span><b>${m.n}</b></div>` }).join("")}</div>
    <div class="spv-top"><div><small>STAGE PREVIEW</small><h3>${esc(T.name||"未命名")}</h3><span id="spvSec"></span></div><button class="spv-x" id="spvX">關閉</button></div>
    <div class="spv-sub"><span class="spv-who" id="spvWho"></span><p id="spvZh"></p><small id="spvKo"></small></div>
    <div class="spv-bar"><div class="spv-secs">${L.secs.map(s=>`<button data-t="${s.t0}" class="${s.chorus?"ch":""}" style="flex-grow:${Math.max(1,Math.round(s.t1-s.t0))}" title="${esc(s.n)}" aria-label="${esc(s.n)}"></button>`).join("")}</div><i id="spvP"></i></div>
    <div class="spv-ctl"><button id="spvPlay">❚❚ 暫停</button><span id="spvTime">0:00 / ${A.fmt(L.total)}</span><small>${opts.note||(T.audio?"":"還沒有音檔:先用無聲的時間軸預覽")}</small></div>`;
  $("#stage").appendChild(el); setPause("spv",true);
  let au=null; try{ if(T.audio&&window.getBlob){ const u=await getBlob(T.audio); if(u){ au=new Audio(u); au.play().catch(()=>{}) } } }catch(e){ window.logErr?.("舞台預覽音檔",e) }
  let playing=true, base=performance.now(), off=0, lastSec=-2, lastEv=-2, lastS=-1;
  const now=()=>au?au.currentTime:off+(playing?(performance.now()-base)/1000:0);
  const ms=[...el.querySelectorAll(".spv-m")], byM=Object.fromEntries(ms.map(x=>[x.dataset.m,x]));
  const place=si=>{ const s=L.secs[si], cs=CH?.[si]; let pos=cs?.pos;
    if(!pos){ const sec=T.secs[si], by={}; sec.lines.forEach(l=>l.who.forEach(id=>by[id]=(by[id]||0)+(+l.s||0))); const ord=IDS.slice().sort((a,b)=>(by[b]||0)-(by[a]||0)); pos={}; ord.forEach((id,k)=>pos[id]=DEF[k]) }
    for(const id of IDS){ const p=pos[id]||[.5,.5], m=byM[id]; m.style.left=(8+p[0]*84)+"%"; m.style.bottom=(4+p[1]*62)+"%"; m.style.setProperty("--s",(1.12-p[1]*.42).toFixed(3)); m.style.zIndex=String(Math.round((1-p[1])*10)); m.classList.toggle("foc",cs?.focus===id) }
    $("#spvSec").textContent=s.n+(cs?.move?`・${cs.move}`:"") };
  const sing=ei=>{ const e=L.ev[ei]; ms.forEach(m=>m.classList.toggle("sing",!!e&&e.who.includes(m.dataset.m)));
    if(!e){ $("#spvWho").textContent=""; $("#spvZh").textContent="♪"; $("#spvKo").textContent=""; return }
    $("#spvWho").textContent=e.who.length>=5?"全員":e.who.map(id=>A.byId(id).n).join("、")+(e.k?"・killing part":"");
    $("#spvZh").textContent=e.zh||(e.who.length?"(這句還沒寫歌詞)":"♪"); $("#spvKo").textContent=e.ko||"" };
  const P=$("#spvP"), TM=$("#spvTime");
  const frame=()=>{ if(!CUR||CUR.el!==el) return; let t=now(); if(t>=L.total){ t=L.total; playing=false; if(au) au.pause(); $("#spvPlay").textContent="▶ 再看一次" }
    P.style.transform=`scaleX(${(t/L.total).toFixed(4)})`;
    const si=L.secs.findIndex(s=>t>=s.t0&&t<s.t1); if(si!==lastSec&&si>=0){ lastSec=si; place(si) }
    const ei=L.ev.findIndex(e=>t>=e.t0&&t<e.t1); if(ei!==lastEv){ lastEv=ei; sing(ei) }
    const sNow=Math.floor(t); if(sNow!==lastS){ lastS=sNow; TM.textContent=`${A.fmt(t)} / ${A.fmt(L.total)}` }
    if(playing) CUR.raf=requestAnimationFrame(frame) };
  const seek=t=>{ t=Math.max(0,Math.min(L.total-.05,t)); if(au) au.currentTime=t; else { off=t; base=performance.now() } lastSec=lastEv=-2 };
  CUR={el,au,raf:0};
  $("#spvX").onclick=closeSP;
  $("#spvPlay").onclick=()=>{ if(!playing){ if(now()>=L.total-.05) seek(0); playing=true; base=performance.now(); au?.play().catch(()=>{}); $("#spvPlay").textContent="❚❚ 暫停"; CUR.raf=requestAnimationFrame(frame) }
    else { off=now(); playing=false; au?.pause(); $("#spvPlay").textContent="▶ 繼續" } };
  el.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{ seek(+b.dataset.t); if(!playing) frame() });
  place(0); sing(-1); CUR.raf=requestAnimationFrame(frame) };
})();
