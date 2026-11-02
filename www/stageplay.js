"use strict";
/* =====================================================================
   舞台預覽 2.0(2026-11-01,編舞室 2.0 第 4 包,參考圖/樣張 4)
   照歌曲的時間軸播放:成員的全身立繪站在舞台上,依編舞每一拍的位置走位(換隊形時緩起緩停)、
   依當下的動作律動(上下彈、左右擺、人浪一個接一個、轉圈真的轉)、依朝向轉身(背對時是逆光的剪影);
   KEY POINT 那幾拍鏡頭推近領舞、頂部出現金色緞帶(第幾拍、這一拍做什麼、誰領舞);
   三種視角:舞台(觀眾席)、俯視(隊形圖)、直拍(鏡頭跟著一個人)。有打歌服立繪就穿打歌服。
   真正的舞蹈動作等之後 Live2D/3D;這裡只動位置、律動、轉身與鏡頭。
   效能(A55):立繪開場時先縮成畫面需要的大小畫進 canvas(推近時也清楚),背對用的剪影也先畫好;
   播放時每一幀只改 transform 與 opacity,文字只在換句、換拍時改。
   入口:錄音室、練習室「舞台預覽」、排舞模式、KEY POINT 卡片「在舞台預覽看」。
   ===================================================================== */
(()=>{
const API=()=>window.SONGS_API, IDS=["ys","tr","hy","he","hr"];
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)), sm=t=>t*t*(3-2*t);
const DEF=[[.5,.2],[.3,.34],[.7,.34],[.13,.5],[.87,.5]];   // 沒有編舞時:唱最多的人站中間
/* 舞台的透視:編舞的 y=0 是舞台最前、1 是最後。越後面越小、腳的位置越高(地平線在畫面 hz 的高度) */
const G={hz:.36,f0:.985,s1:.6,span:.8,h0:.8};
const sOf=y=>1/(1+(1/G.s1-1)*cl(y,-.15,1.15));
/* 律動:a 上下彈(身高的比例)、f 每拍幾下、sw 左右擺(度);hit 重拍往下壓、hop 跳起來、lag 人浪/接力一個接一個(拍)、mir 鏡面(左右兩邊反著擺)、dip 壓低、spin 轉圈 */
const MOT={groove:{a:.010,f:1,sw:1.2},bounce:{a:.022,f:1,sw:.4},sway:{a:.003,f:.5,sw:3.2},clap:{a:.012,f:1,sw:.6},walk:{a:.010,f:1,sw:.8},catwalk:{a:.008,f:1,sw:2.4},
  gesture:{a:.010,f:1,sw:1.4},heart:{a:.010,f:1,sw:1.8},point:{a:.012,f:1,sw:1,hit:.4},unison:{a:.018,f:1,sw:1,hit:.3},power:{a:.024,f:1,sw:1.4,hit:.7},
  wave:{a:.018,f:1,sw:.6,lag:.25},canon:{a:.016,f:1,sw:.6,lag:.5},mirror:{a:.014,f:1,sw:2.6,mir:1},lift:{a:.004,f:.5,sw:.3},popping:{a:.016,f:1,sw:0,hit:1},
  tutting:{a:.005,f:1,sw:.3},footwork:{a:.012,f:2,sw:.4},floor:{a:.010,f:.5,sw:.4,dip:.05},jump:{a:.045,f:.5,sw:0,hop:1},spin:{a:.008,f:1,sw:0,spin:1},
  hairflip:{a:.012,f:.5,sw:4},body:{a:.008,f:.5,sw:3.6},aegyo:{a:.012,f:1,sw:3},slow:{a:.007,f:.25,sw:1.6},acting:{a:.004,f:.5,sw:.8},freeze:{a:0,f:1,sw:0},solo:{a:.022,f:1,sw:2}};
const SEED={ys:.6,tr:-.45,hy:.9,he:-.8,hr:.35};   // 熟練度低的人慢(或快)半拍的方向:固定,看起來才像同一個人
const EXPR_OF={神祕:"serious",狂野:"serious",自信:"smile",甜蜜:"smile",清涼:"smile",療癒:"smile",悲傷:"neutral"};
/* 朝向 → 立繪轉幾度:側面只轉 40 度(轉到 90 度會變成一條線),背對 180 度看到剪影 */
const visDeg=d=>{ const a=Math.abs(d); return Math.sign(d)*(a<=90?a*40/90:180-(180-a)*40/90) };
const fmt=s=>API().fmt(s);
const memOf=id=>(typeof byId==="function"?byId(id):null)||API().byId(id);
const faceURL=id=>`assets/chara/${memOf(id)?.f||"yeseul"}_smile.webp`;
const faceHTML=(id,cls="sp2-face")=>`<span class="${cls}" style="--c:${memOf(id)?.c};background-image:url(${faceURL(id)})"></span>`;

/* 有打歌服立繪就穿打歌服:主打照打歌準備單選的;其他照這張專輯的打歌服(團體服優先、最新的優先) */
function stageLooks(T){ const out={}, missing=[]; try{ const A=API(), alb=A.albums?.().find(a=>a.tracks.some(t=>t.id===T.id)), ak=alb?"a"+alb.n:"";
    const plan=(A.R?.title===T.id&&window.stagePlanLooks?.())||{}, pool=(typeof wLooks==="function"?wLooks():[]).filter(l=>l.occasion==="打歌舞台");
    const mine=pool.filter(l=>ak&&l.album===ak).sort((a,b)=>(b.type==="group")-(a.type==="group")||(b.updatedAt||0)-(a.updatedAt||0));
    for(const id of IDS){ const slot=Object.keys(WMEM||{}).find(s=>WMEM[s]===id); if(!slot) continue; const pc=String(plan[id]||"").split("@")[0];
      const cands=[...(pc&&ITEMS[pc]?[ITEMS[pc]]:[]),...mine], hit=cands.find(l=>l.members?.[slot]?.sprites?.neutral);
      if(hit){ out[id]={code:hit.code,name:hit.name||""}; continue }
      const need=cands.find(l=>l.members?.[slot]?.img); if(need) missing.push({id,slot,code:need.code,name:need.name||""}) } }catch(e){ window.logErr?.("舞台預覽造型",e) }
  return {out,missing} }
/* 立繪網址:打歌服的立繪在背景合成,等一下(最多 3 秒),沒有那個表情就用平常臉 */
async function spriteURL(id,code,ex){ if(!code) return spr(id,null,ex);
  const k=code+"@"+id; window.needDyn?.(code,id);
  for(let i=0;i<30;i++){ const d=window.DYN?.[k]; if(d?.[ex]) return d[ex]; if(d?.neutral&&i>=12) return d.neutral; await new Promise(r=>setTimeout(r,100)) }
  return window.DYN?.[k]?.neutral||spr(id,null,ex) }
const loadImg=u=>new Promise((ok,no)=>{ const i=new Image(); i.decoding="async"; i.onload=()=>ok(i); i.onerror=no; i.src=u });
const mk=(w,h)=>{ const c=document.createElement("canvas"); c.width=w; c.height=h; return c };
/* 正面:縮成需要的大小;背面:左右翻過來的深色剪影,外面一圈成員色的逆光 */
async function paint(img,ch,col){ const ar=img.naturalWidth/img.naturalHeight, h=Math.min(img.naturalHeight,ch), w=Math.max(8,Math.round(h*ar));
  let src=img; try{ src=await createImageBitmap(img,{resizeWidth:w,resizeHeight:h,resizeQuality:"high"}) }catch(e){}
  const f=mk(w,h); f.getContext("2d").drawImage(src,0,0,w,h);
  const sil=fill=>{ const c=mk(w,h), x=c.getContext("2d"); x.translate(w,0); x.scale(-1,1); x.drawImage(src,0,0,w,h); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation="source-in"; x.fillStyle=fill(x); x.fillRect(0,0,w,h); return c };
  const rim=sil(()=>col), body=sil(x=>{ const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,"#3A3046"); g.addColorStop(.18,"#231B2D"); g.addColorStop(1,"#0D0912"); return g });
  const bx=body.getContext("2d"); bx.globalCompositeOperation="source-atop"; bx.globalAlpha=.16; bx.fillStyle=col; bx.fillRect(0,0,w,h);
  const b=mk(w,h), x=b.getContext("2d"), r=Math.max(1.5,w*.0065); x.globalAlpha=.85;
  for(let k=0;k<8;k++){ const a=k*Math.PI/4; x.drawImage(rim,Math.cos(a)*r,Math.sin(a)*r) } x.globalAlpha=1; x.drawImage(body,0,0);
  /* 唱歌時身後的光暈(成員色、模糊;三分之一大小就夠) */
  const gw=Math.round(w/3), gh=Math.round(h/3), g=mk(Math.round(gw*1.12),Math.round(gh*1.06)), gx=g.getContext("2d"), sm2=mk(gw,gh), sx=sm2.getContext("2d");
  sx.drawImage(src,0,0,gw,gh); sx.globalCompositeOperation="source-in"; sx.fillStyle=col; sx.fillRect(0,0,gw,gh);
  gx.filter=`blur(${Math.max(2,Math.round(gw*.035))}px)`; gx.drawImage(sm2,Math.round(gw*.06),Math.round(gh*.03)); gx.filter="none"; gx.globalAlpha=.6; gx.drawImage(sm2,Math.round(gw*.06),Math.round(gh*.03));
  rim.width=rim.height=0; body.width=body.height=0; sm2.width=sm2.height=0; if(src!==img) src.close?.();
  return {f,b,g,ar} }

let CUR=null;
function closeSP(){ if(!CUR) return; const c=CUR; CUR=null; cancelAnimationFrame(c.raf); c.au?.pause(); c.off?.(); c.el.querySelectorAll("canvas").forEach(x=>{ x.width=x.height=0 }); c.el.remove(); setPause("spv",false) }
window.closeStagePlay=closeSP;
window.stagePlayCtl=()=>CUR?.ctl||null;
/* 返回鍵:先關直拍的成員選單,再關舞台預覽 */
window.stagePlayBack=()=>{ if(!CUR) return false; const p=CUR.el.querySelector(".sp2-pick.on"); if(p){ p.classList.remove("on"); return true } closeSP(); return true };

window.openStagePlay=async(T,opts={})=>{ if(!T) return; closeSP(); const A=API();
  const CS=window.choreoStage?.(T)||{has:false,bs:.5,L:window.songTimeline?.(T)}, L=CS.L||window.songTimeline(T), bs=CS.bs||.5, total=L.total;
  const LK=stageLooks(T), ex=EXPR_OF[T.mood]||"smile", hasAu=!!window.songHasAudio?.(T);
  const lookNames=[...new Set(Object.values(LK.out).map(o=>o.name))].filter(Boolean);
  let fan=IDS.includes(opts.fan)?opts.fan:(CS.kp&&IDS.includes(CS.kp.lead)?CS.kp.lead:null)||L.ev.find(e=>e.k)?.who?.[0]||"ys";
  const el=document.createElement("div"); el.className="sp2 loading"; el.id="spv"; el.dataset.view="stage";
  const kpMarks=(CS.kpw||[]).map(w=>`<i class="sp2-kd" style="left:${(w.t0/total*100).toFixed(2)}%"></i>`).join("");
  el.innerHTML=`<div class="sp2-world" id="spW"><div class="sp2-bg"></div><div class="sp2-beams"></div><div class="sp2-spot" id="spSpot"></div><div class="sp2-floor" id="spFloor"></div></div>
    <div class="sp2-veil" id="spVeil"></div><div class="sp2-grad"></div>
    <div class="sp2-plan" id="spPlan" aria-hidden="true"><div class="sp2-ps" id="spPS"><span class="lab b">舞台後方</span><span class="lab f">觀眾 ▼</span><svg id="spPL" viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div id="spPG"></div>${IDS.map(id=>`<div class="sp2-pd" data-p="${id}" style="--c:${memOf(id).c}">${faceHTML(id,"sp2-pf")}<i class="sp2-pw"></i><small></small></div>`).join("")}</div></div>
    <div class="sp2-top"><div class="sp2-t"><small>STAGE PREVIEW</small><b>〈${esc(T.name||"未命名")}〉</b><span id="spSec"></span><span class="sp2-info" id="spInfo"></span></div>
      <div class="sp2-rib" id="spRib" aria-live="polite"></div><button class="sp2-x" id="spX">關閉</button></div>
    <div class="sp2-hl" id="spHl"></div>
    <div class="sp2-sub" id="spSub"><span class="w" id="spWho"></span><p id="spZh"></p><small id="spKo"></small></div>
    <div class="sp2-bar" id="spBar">${L.secs.map(s=>`<span class="${s.chorus?"ch":""}" style="flex-grow:${Math.max(1,Math.round(s.t1-s.t0))}" title="${esc(s.n)}"></span>`).join("")}<i class="sp2-pr" id="spPr"></i>${kpMarks}<i class="sp2-ph" id="spPh"></i></div>
    <div class="sp2-ctl"><button id="spPlay">❚❚ 暫停</button><span class="tm" id="spTime">0:00 / ${fmt(total)}</span><small>${esc(opts.note||(hasAu?"跟著定案 mp3":"還沒有音檔:無聲的時間軸"))}</small><span class="sp"></span>
      <div class="sp2-vw" role="group" aria-label="視角"><button data-v="stage" class="on">舞台</button><button data-v="top">俯視</button><button data-v="fan" id="spFanB">直拍・${memOf(fan).n} ▾</button></div>
      <div class="sp2-pick" id="spPick">${IDS.map(id=>`<button data-fan="${id}">${faceHTML(id)}<b>${memOf(id).n}</b></button>`).join("")}</div></div>
    <div class="sp2-load" id="spLoad"><span>舞台準備中…</span></div>`;
  $("#stage").appendChild(el); setPause("spv",true);
  const q=s=>el.querySelector(s), W0=()=>el.clientWidth||784, H0=()=>el.clientHeight||354;
  const me={el,raf:0,au:null,lastS:-1}; CUR=me;
  q("#spX").onclick=closeSP;

  /* ---------- 立繪:縮好、畫好正面與背面 ---------- */
  const dpr=Math.min(3,window.devicePixelRatio||1), FIG={}, chMax=Math.min(1500,Math.round(G.h0*H0()*1.75*dpr));
  await Promise.all(IDS.map(async id=>{ const m=memOf(id); try{ FIG[id]=await paint(await loadImg(await spriteURL(id,LK.out[id]?.code,ex)),chMax,m.c) }
    catch(e){ window.logErr?.("舞台預覽立繪",e); try{ FIG[id]=await paint(await loadImg(spr(id,null,"smile")),chMax,m.c) }catch(_){} } }));
  if(CUR!==me) return;
  const floor=q("#spFloor");
  for(const id of IDS){ const m=memOf(id), F=FIG[id]; if(!F) continue; const d=document.createElement("div"); d.className="sp2-fig"; d.dataset.m=id; d.style.setProperty("--c",m.c);
    d.innerHTML=`<i class="sp2-sh"></i><i class="sp2-glow"></i><div class="sp2-card"></div>`; F.f.className="f"; F.b.className="b"; F.g.className="g"; d.lastChild.append(F.g,F.f,F.b); floor.appendChild(d); F.el=d; F.card=d.lastChild; F.cm=(m.cm||165)/168 }

  /* ---------- 版面大小(轉向、改視窗時重算) ---------- */
  let W=W0(), Hh=H0(), PS={w:1,h:1}, barW=1;
  const size=()=>{ W=W0(); Hh=H0(); for(const id of IDS){ const F=FIG[id]; if(!F) continue; F.h=G.h0*Hh*F.cm; F.w=F.h*F.ar; F.el.style.width=F.w.toFixed(1)+"px"; F.el.style.height=F.h.toFixed(1)+"px" }
    const r=q("#spPS").getBoundingClientRect(); PS={w:r.width||1,h:r.height||1}; barW=q("#spBar").clientWidth||1 };
  size();

  /* ---------- 時間:有音檔就跟著 mp3,開始播之前用時鐘 ---------- */
  let au=null; if(hasAu){ try{ const u=await window.songAudioURL?.(T); if(u&&CUR===me){ au=new Audio(); au.preload="auto"; au.src=u; me.au=au } }catch(e){ window.logErr?.("舞台預覽音檔",e) } }
  if(CUR!==me){ au?.pause(); return }
  let playing=true, base=performance.now(), off=0, auOn=false;
  const now=()=>auOn?au.currentTime:off+(playing?(performance.now()-base)/1000:0);
  let lastSi=-1, lastEv=-2, camSnap=true;
  const seek=t=>{ t=cl(t,0,total-.05); if(auOn) au.currentTime=t; off=t; base=performance.now(); lastSi=-1; lastEv=-2; camSnap=true };
  const setPlay=on=>{ const b=q("#spPlay");
    if(on){ if(now()>=total-.05) seek(0); playing=true; base=performance.now(); if(auOn) au.play().catch(()=>{}); b.textContent="❚❚ 暫停"; cancelAnimationFrame(me.raf); me.raf=requestAnimationFrame(frame) }
    else { off=now(); playing=false; au?.pause(); b.textContent=off>=total-.05?"▶ 再看一次":"▶ 繼續" } };
  if(au){ const go=()=>{ if(CUR!==me) return; const t=now(); try{ au.currentTime=t }catch(e){} auOn=true; off=t; if(playing) au.play().catch(()=>{}) };
    if(au.readyState>=1) go(); else au.addEventListener("loadedmetadata",go,{once:true}) }

  /* ---------- 沒有編舞時:唱最多的人站中間,大家律動 ---------- */
  const fbCache={}, fallback=si=>{ const sec=T.secs[si]||{lines:[]}, by={}; sec.lines.forEach(l=>(l.who||[]).forEach(id=>by[id]=(by[id]||0)+(+l.s||0)));
    const ord=IDS.slice().sort((a,b)=>(by[b]||0)-(by[a]||0)), pos={}, mv={}, deg={}; ord.forEach((id,k)=>{ pos[id]=DEF[k]; mv[id]="groove"; deg[id]=0 }); return {pos,mv,ez:{},fc:{},deg,cue:{},foc:null,walk:null} };

  /* ---------- 狀態 ---------- */
  let view="stage", lastSecTxt="", lastKP=null, lastBeat=-9, lastHl=null, lastNow=performance.now(), lastNext, lastPlanTxt={};
  const cam={z:1,x:0,y:0}, ST={}; IDS.forEach(id=>{ ST[id]={va:0,px:null,py:null,z:-1,sing:false} });
  const kpw=CS.kpw||[], hls=CS.hl||[], prof=CS.prof||{};
  const sub={who:q("#spWho"),zh:q("#spZh"),ko:q("#spKo")}, PR=q("#spPr"), PH=q("#spPh"), TM=q("#spTime"), SEC=q("#spSec"), RIB=q("#spRib"), HL=q("#spHl"), VEIL=q("#spVeil"), SPOT=q("#spSpot"), WORLD=q("#spW");
  const PD=Object.fromEntries(IDS.map(id=>[id,el.querySelector(`[data-p="${id}"]`)]));
  const avgProf=Math.round(IDS.reduce((a,i)=>a+(+prof[i]||0),0)/5);
  q("#spInfo").innerHTML=[lookNames.length?`穿〈${esc(lookNames.join("、"))}〉`:"",CS.has?`熟練度 ${avgProf}`:"還沒編舞:先用預設站位"].filter(Boolean).join("<i>・</i>")+
    (LK.missing.length?`<button class="sp2-mk" id="spMk">打歌服還沒做立繪(${LK.missing.length} 位)▸</button>`:"");

  const singer=ei=>{ const e=L.ev[ei]; IDS.forEach(id=>{ const on=!!e&&e.who.includes(id); if(ST[id].sing!==on){ ST[id].sing=on; FIG[id]?.el.classList.toggle("sing",on); PD[id].classList.toggle("sing",on) } });
    if(!e){ sub.who.textContent=""; sub.zh.textContent="♪"; sub.ko.textContent=""; return }
    sub.who.textContent=e.who.length>=5?"全員":e.who.map(id=>memOf(id).n).join("、")+(e.k?"・killing part":"");
    sub.zh.textContent=e.zh||(e.who.length?"(這句還沒寫歌詞)":"♪"); sub.ko.textContent=e.ko||"" };
  const ribbon=(w,bi)=>{ const k=CS.kp; if(!w||!k){ RIB.classList.remove("on"); return }
    const steps=(k.steps||[]).map(s=>String(s).replace(/^\s*\d+\s*[::.、]\s*/,"")), lead=w.lead, n=Math.max(1,Math.min(8,Math.round(w.len)));
    RIB.innerHTML=`<div class="r1"><span class="e">✦ KEY POINT</span><b class="n">${esc(k.name||"KEY POINT")}</b>${w.final?`<span class="fin">最後副歌</span>`:""}</div>
      <div class="r2"><span class="bt">${Array.from({length:n},(_,i)=>`<i class="${i===bi?"on":i<bi?"dn":""}">${i+1}</i>`).join("")}</span><span class="st">${esc(steps[Math.max(0,bi)]||"")}</span>
      ${lead&&lead!=="all"&&IDS.includes(lead)?`<span class="ld">${faceHTML(lead)}${memOf(lead).n}領舞</span>`:`<span class="ld">全員</span>`}</div>`;
    RIB.classList.add("on") };

  /* ---------- 俯視:隊形圖(下一個隊形是虛線) ---------- */
  const xy=p=>[(6+p[0]*88),(10+(1-p[1])*80)];
  const planNext=nk=>{ q("#spPG").innerHTML=nk?IDS.map(id=>{ const p=nk.pos[id]; if(!p) return ""; const [x,y]=xy(p); return `<span class="sp2-pg" style="--c:${memOf(id).c};left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"></span>` }).join(""):"" };
  /* 往下一個隊形的虛線:五條線開場就建好,之後只在位置有變時改端點 */
  const PLN=(()=>{ const svg=q("#spPL"), o={}; IDS.forEach(id=>{ const l=document.createElementNS("http://www.w3.org/2000/svg","line"); l.setAttribute("stroke",memOf(id).c); l.setAttribute("stroke-width","1.5");
    l.setAttribute("stroke-dasharray","3 3"); l.setAttribute("vector-effect","non-scaling-stroke"); l.setAttribute("opacity",".85"); l.style.display="none"; svg.appendChild(l); o[id]={l,k:""} }); return o })();
  const planLines=(pos,nk)=>{ IDS.forEach(id=>{ const L=PLN[id], a=pos[id], z=nk?.pos[id]; if(!a||!z){ if(L.k!=="-"){ L.k="-"; L.l.style.display="none" } return }
    const [x1,y1]=xy(a), [x2,y2]=xy(z), k=`${x1.toFixed(1)},${y1.toFixed(1)},${x2.toFixed(1)},${y2.toFixed(1)}`; if(k===L.k) return; L.k=k;
    L.l.setAttribute("x1",x1.toFixed(1)); L.l.setAttribute("y1",y1.toFixed(1)); L.l.setAttribute("x2",x2.toFixed(1)); L.l.setAttribute("y2",y2.toFixed(1)); L.l.style.display="" }) };

  /* ---------- 每一幀 ---------- */
  function frame(nowMs){ if(CUR!==me) return; const dt=Math.min(.1,Math.max(0,(nowMs-lastNow)/1000)); lastNow=nowMs;
    let t=now(); if(t>=total){ t=total; if(playing) setPlay(false) }
    let si=lastSi>=0&&L.secs[lastSi]&&t>=L.secs[lastSi].t0&&t<L.secs[lastSi].t1?lastSi:L.secs.findIndex(s=>t>=s.t0&&t<s.t1); if(si<0) si=L.secs.length-1; lastSi=si;
    const sec=L.secs[si], b=Math.max(0,(t-sec.t0)/bs), st=CS.has?CS.at(si,b):(fbCache[si]||(fbCache[si]=fallback(si)));
    const fnow=st.foc, mvName=CS.MV?.[st.mv[fnow||"ys"]]?.n||"", stxt=sec.n+(mvName?`・${mvName}`:"");
    if(stxt!==lastSecTxt){ lastSecTxt=stxt; SEC.textContent=stxt }
    let ei=lastEv>=0&&L.ev[lastEv]&&t>=L.ev[lastEv].t0&&t<L.ev[lastEv].t1?lastEv:L.ev.findIndex(e=>t>=e.t0&&t<e.t1); if(ei!==lastEv){ lastEv=ei; singer(ei) }
    /* KEY POINT 與小亮點 */
    const kw=kpw.find(w=>t>=w.t0-.12&&t<w.t1+.45)||null, bi=kw?cl(Math.floor((t-kw.t0)/bs),-1,Math.round(kw.len)-1):-9;
    if(kw!==lastKP||bi!==lastBeat){ ribbon(kw,bi); lastKP=kw; lastBeat=bi }
    const hw=hls.find(h=>t>=h.t0&&t<h.t1)||null;
    if(hw!==lastHl){ lastHl=hw; if(hw){ HL.innerHTML=`<b>✧ 小亮點</b>${hw.who.length===1?faceHTML(hw.who[0]):""}<span>${esc(hw.desc)}</span>`; HL.classList.add("on") } else HL.classList.remove("on") }
    /* 成員 */
    const order=IDS.slice().sort((a,c)=>(st.pos[a]?.[0]??.5)-(st.pos[c]?.[0]??.5)), kpLead=kw?(kw.lead&&kw.lead!=="all"?kw.lead:"all"):null;
    for(const id of IDS){ const F=FIG[id]; if(!F) continue; const S=ST[id], p=st.pos[id]||[.5,.5], s=sOf(p[1]);
      const X=W/2+(p[0]-.5)*W*G.span*s, Y=Hh*(G.hz+(G.f0-G.hz)*s);
      const sp=S.px==null||dt<=0?0:Math.hypot((p[0]-S.px)*10,(p[1]-S.py)*6)/dt; S.px=p[0]; S.py=p[1];   // 走位速度(公尺/秒)
      const mv=st.mv[id]||"groove", M=MOT[mv]||MOT.groove, ez=!!st.ez?.[id], c=st.cue?.[id];
      let ph=b-(1-cl(+prof[id]||0,0,100)/100)*.12*SEED[id];
      if(M.lag&&c){ const w=c.who==="all"||!c.who?IDS:[].concat(c.who), ord=order.filter(x=>w.includes(x)); ph-=Math.max(0,ord.indexOf(id))*M.lag }
      const walking=sp>.35, amp=(walking?Math.max(M.a*.6,.011):M.a)*(ez?.75:1)*F.h, cyc=ph*(walking?1:M.f), fr=cyc-Math.floor(cyc);
      let dy; if(M.hop&&!walking){ const u=fr/.55; dy=u<1?-amp*Math.sin(Math.PI*u):0 } else if(M.hit&&!walking) dy=amp*M.hit*Math.exp(-7*fr)-amp*(1-M.hit)*Math.sin(Math.PI*fr)**2; else dy=-amp*Math.sin(Math.PI*fr)**2;
      if(M.dip&&!walking) dy+=M.dip*F.h;
      const sw=(walking?.8:M.sw)*(ez?.8:1)*Math.sin(Math.PI*cyc)*(M.mir&&p[0]<.5?-1:1);
      /* 朝向:慢慢轉過去(背對:右邊的人往右轉、左邊的往左) */
      let tg=st.fc?.[id]==="look"?(p[0]<.5?-32:32):visDeg(st.deg?.[id]||0);
      if(Math.abs(tg)>=179.5) tg=S.va>1||(Math.abs(S.va)<=1&&p[0]>=.5)?180:-180;
      const dv=tg-S.va, mx=560*dt; S.va=camSnap?tg:S.va+(Math.abs(dv)<=mx?dv:Math.sign(dv)*mx);
      let spin=0; if(mv==="spin"&&!walking){ const qq=((ph%4)+4)%4; if(qq<1.5) spin=360*sm(qq/1.5) }
      F.el.style.transform=`translate3d(${(X-F.w/2).toFixed(1)}px,${(Y-F.h).toFixed(1)}px,0) scale(${s.toFixed(4)})`;
      F.card.style.transform=`translate3d(0,${dy.toFixed(2)}px,0) rotate(${sw.toFixed(2)}deg) rotateY(${(S.va+spin).toFixed(1)}deg)`;
      const z=Math.round((1-p[1])*100)+10; if(z!==S.z){ S.z=z; F.el.style.zIndex=String(z) }
      S.X=X; S.Y=Y; S.s=s;
      if(view==="top"){ const d=PD[id], [x,y]=xy(p); d.style.transform=`translate3d(${(x/100*PS.w).toFixed(1)}px,${(y/100*PS.h).toFixed(1)}px,0)`;
        const dg=st.deg?.[id]||0; d.children[1].style.transform=`rotate(${-dg}deg)`; d.classList.toggle("bk",Math.abs(dg)>=120); d.classList.toggle("lk",st.fc?.[id]==="look");
        const lab=(CS.MV?.[mv]?.n||"")+(ez?"・簡":""); if(lastPlanTxt[id]!==lab){ lastPlanTxt[id]=lab; d.lastChild.textContent=lab }
        d.classList.toggle("foc",fnow===id); d.classList.toggle("kp",!!kw&&(kpLead==="all"||kpLead===id)) } }
    if(view==="top"&&CS.has){ const nk=CS.next(si,b); if(nk!==lastNext){ lastNext=nk; planNext(nk) } planLines(st.pos,nk) }
    /* 鏡頭:KEY POINT 推近領舞;小亮點輕推;直拍跟著一個人 */
    /* 取景:讓某個人的頭頂在畫面 hy 的高度、從頭到膝蓋左右佔滿畫面(cover = 身高佔畫面高的幾倍) */
    let tz=1, tx=0, ty=0;
    const shot=(id,hy,cover,zmax)=>{ const S=ST[id], F=FIG[id]; if(!S||!F||S.X==null) return false; const hp=F.h*S.s; tz=cl(cover*Hh/hp,1,zmax); tx=W*.5-S.X*tz; ty=Hh*hy-(S.Y-hp)*tz; return true };
    if(view==="fan") shot(fan,kpLead===fan||kpLead==="all"&&kw?.21:.07,kpLead===fan?1.2:1.08,2.3);
    else if(view==="stage"&&kw&&kw.t0<=t+.12){ if(kpLead==="all"){ const v=IDS.filter(id=>ST[id]?.X!=null); tz=1.12; const top=Math.min(...v.map(id=>ST[id].Y-FIG[id].h*ST[id].s)); tx=W*.5-v.reduce((a,id)=>a+ST[id].X,0)/v.length*tz; ty=Hh*.22-top*tz }
      else shot(kpLead,.21,1.06,1.9) }
    else if(view==="stage"&&hw&&hw.who.length===1) shot(hw.who[0],.12,.9,1.5);
    tx=cl(tx,W*(1-tz),0); ty=cl(ty,Hh*(1-tz),0); const k=camSnap?1:1-Math.exp(-dt*(view==="fan"?6:2.8)); camSnap=false;
    cam.z+=(tz-cam.z)*k; cam.x+=(tx-cam.x)*k; cam.y+=(ty-cam.y)*k;
    if(view!=="top") WORLD.style.transform=`translate3d(${cam.x.toFixed(1)}px,${cam.y.toFixed(1)}px,0) scale(${cam.z.toFixed(4)})`;
    const vo=view==="stage"&&kw?"1":"0"; if(VEIL.style.opacity!==vo) VEIL.style.opacity=vo;
    /* 追蹤燈:跟著焦點(KEY POINT 時跟著領舞) */
    const sid=kpLead&&kpLead!=="all"?kpLead:fnow, Sx=sid&&ST[sid];
    if(Sx&&Sx.X!=null){ SPOT.style.transform=`translate3d(${(Sx.X-W*.15).toFixed(1)}px,0,0) scaleY(${(Sx.Y/Hh*1.02).toFixed(3)})`; const so=kw?"1":".72"; if(SPOT.style.opacity!==so) SPOT.style.opacity=so; SPOT.classList.toggle("gd",!!kw) }
    else if(SPOT.style.opacity!=="0") SPOT.style.opacity="0";
    /* 進度 */
    PR.style.transform=`scaleX(${(t/total).toFixed(4)})`; PH.style.transform=`translate3d(${(t/total*barW).toFixed(1)}px,0,0)`;
    const sNow=Math.floor(t); if(sNow!==me.lastS){ me.lastS=sNow; TM.textContent=`${fmt(t)} / ${fmt(total)}` }
    if(playing) me.raf=requestAnimationFrame(frame) }
  const redraw=()=>{ if(!playing){ lastNow=performance.now(); frame(lastNow) } };
  me.ctl={ seek:t=>{ seek(t); redraw() }, play:on=>setPlay(on!==false), time:()=>now(), view:()=>view };   // 測試與之後的功能用(window.stagePlayCtl)

  /* ---------- 操作 ---------- */
  const setView=v=>{ view=v; el.dataset.view=v; el.querySelectorAll(".sp2-vw [data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===v)); q("#spFanB").textContent=`直拍・${memOf(fan).n} ▾`;
    if(v==="top"){ size(); lastNext=undefined; lastPlanTxt={} } if(!playing) camSnap=true; redraw() };
  q("#spPlay").onclick=()=>setPlay(!playing);
  el.querySelectorAll(".sp2-vw [data-v]").forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); const v=b.dataset.v, pk=q("#spPick");
    if(v==="fan"&&view==="fan"){ pk.classList.toggle("on"); return } pk.classList.remove("on"); setView(v) });
  el.querySelectorAll("[data-fan]").forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); fan=b.dataset.fan; q("#spPick").classList.remove("on"); setView("fan") });
  el.addEventListener("pointerdown",e=>{ if(!e.target.closest("#spPick,#spFanB")) q("#spPick").classList.remove("on") });
  const bar=q("#spBar"); bar.onpointerdown=e=>{ const r=bar.getBoundingClientRect(); seek((e.clientX-r.left)/r.width*total); redraw() };
  const mkb=q("#spMk"); if(mkb) mkb.onclick=async()=>{ if(!window.processSprites) return; const L2=LK.missing, nm=[...new Set(L2.map(x=>x.name))].join("、");
    if(!confirm(`把〈${nm}〉做成遊戲立繪(${L2.length} 位,每位約十幾秒)?做好之後舞台預覽會穿打歌服。`)) return;
    setPlay(false); mkb.disabled=true; let ok=0;
    for(const [i,x] of L2.entries()){ mkb.textContent=`立繪處理中 ${i+1}/${L2.length}…`; try{ await processSprites(x.code,x.slot); ok++ }catch(e){ window.logErr?.("舞台預覽做立繪",e) } }
    toast2(ok===L2.length?"打歌服的立繪做好了":`做好 ${ok} 位,${L2.length-ok} 位沒成功(可以在造型室的卡片再試)`); if(CUR===me) window.openStagePlay(T,{...opts,at:now(),view,fan}) };
  const onRs=()=>{ size(); camSnap=true; redraw() }, onVis=()=>{ if(document.hidden&&playing) setPlay(false) };
  window.addEventListener("resize",onRs); document.addEventListener("visibilitychange",onVis);
  me.off=()=>{ window.removeEventListener("resize",onRs); document.removeEventListener("visibilitychange",onVis) };

  /* ---------- 開始 ---------- */
  if(opts.at>0) seek(opts.at);
  if(opts.view==="top"||opts.view==="fan") setView(opts.view);
  base=performance.now(); lastNow=base; frame(base); q("#spLoad").classList.add("out"); el.classList.remove("loading"); setTimeout(()=>q("#spLoad")?.remove(),500) };
})();
