"use strict";
/* =====================================================================
   練習室(編舞)2026-10-26
   每首歌依錄音室的段落編舞:每段選隊形(預設隊形+點兩人互換,或自由拖曳)、動作、焦點成員;全曲替記憶點舞步取名。
   編舞存在歌曲上(T.dance,跟著 songs/state 一起同步)。熟練度要練(花行動;待在練習室的成員每個時段也會自己練一點;
   打歌後也會進步),會影響打歌舞台與大眾反應(songs.js computeTrack、stage.js perform)。
   資料都對齊歌曲的時間軸;之後做 MV 或動態舞台(Live2D/3D)時照這份演出:動作代號(MOVES 的 id)就是之後的動作片段名稱,
   位置是舞台座標(x 0 左~1 右,從觀眾看;y 0 舞台前緣~1 後方)。
   ===================================================================== */
(()=>{
const API=()=>window.SONGS_API;
const IDS=["ys","tr","hy","he","hr"];
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
/* 動作庫:e 強度、d 難度(1~5),md 適合的歌曲氣氛,hook 可以當記憶點 */
const MOVES=[
  {id:"groove",n:"律動",cat:"基本",e:2,d:1,md:["清涼","自信","療癒","甜蜜"]},
  {id:"bounce",n:"彈跳踏步",cat:"基本",e:3,d:1,md:["甜蜜","清涼"]},
  {id:"sway",n:"搖擺",cat:"基本",e:1,d:1,md:["療癒","悲傷","甜蜜"]},
  {id:"clap",n:"拍手帶動",cat:"基本",e:2,d:1,md:["清涼","甜蜜","療癒"],hook:1},
  {id:"walk",n:"走位換隊形",cat:"走位",e:2,d:2,md:["甜蜜","清涼","狂野","神祕","悲傷","自信","療癒"]},
  {id:"catwalk",n:"台步",cat:"走位",e:2,d:1,md:["自信","狂野","神祕"]},
  {id:"gesture",n:"招牌手勢",cat:"記憶點",e:3,d:2,md:["甜蜜","清涼","自信"],hook:1},
  {id:"heart",n:"比心手勢",cat:"記憶點",e:2,d:1,md:["甜蜜","療癒"],hook:1},
  {id:"point",n:"指尖指向",cat:"記憶點",e:3,d:2,md:["自信","狂野","神祕"],hook:1},
  {id:"unison",n:"整齊群舞",cat:"群舞",e:4,d:3,md:["自信","狂野","清涼"]},
  {id:"power",n:"力量齊舞",cat:"群舞",e:5,d:4,md:["狂野","自信"]},
  {id:"wave",n:"人浪",cat:"群舞",e:3,d:3,md:["神祕","悲傷","自信"],hook:1},
  {id:"canon",n:"接力動作",cat:"群舞",e:3,d:3,md:["神祕","自信"]},
  {id:"mirror",n:"鏡面對稱",cat:"群舞",e:3,d:3,md:["神祕","自信"],hook:1},
  {id:"lift",n:"人形造型",cat:"群舞",e:3,d:4,md:["神祕","自信","狂野"]},
  {id:"popping",n:"機械舞",cat:"技巧",e:4,d:4,md:["狂野","自信"]},
  {id:"tutting",n:"手指舞",cat:"技巧",e:2,d:4,md:["神祕","自信"],hook:1},
  {id:"footwork",n:"碎步",cat:"技巧",e:4,d:4,md:["狂野","清涼"]},
  {id:"floor",n:"地板動作",cat:"技巧",e:4,d:5,md:["狂野","神祕"]},
  {id:"jump",n:"跳躍",cat:"技巧",e:5,d:3,md:["清涼","自信","甜蜜"]},
  {id:"spin",n:"轉圈",cat:"技巧",e:3,d:3,md:["甜蜜","清涼","悲傷"]},
  {id:"hairflip",n:"甩髮",cat:"魅力",e:3,d:2,md:["狂野","自信","神祕"]},
  {id:"body",n:"身體線條",cat:"魅力",e:3,d:3,md:["神祕","狂野"]},
  {id:"aegyo",n:"撒嬌動作",cat:"魅力",e:1,d:1,md:["甜蜜"],hook:1},
  {id:"slow",n:"慢動作",cat:"演技",e:2,d:3,md:["悲傷","神祕","療癒"]},
  {id:"acting",n:"表情演技",cat:"演技",e:1,d:2,md:["悲傷","神祕","甜蜜"]},
  {id:"freeze",n:"定格",cat:"演技",e:1,d:1,md:["甜蜜","清涼","狂野","神祕","悲傷","自信","療癒"]},
  {id:"solo",n:"個人 solo",cat:"個人",e:4,d:4,md:["自信","狂野"]},
];
const MV=Object.fromEntries(MOVES.map(m=>[m.id,m])), CATS=[...new Set(MOVES.map(m=>m.cat))];
/* 預設隊形:第 1 個位置最顯眼(焦點成員站這裡) */
const FORMS=[
  {id:"line",n:"一字",p:[[.5,.35],[.32,.35],[.68,.35],[.14,.35],[.86,.35]]},
  {id:"v",n:"V字",p:[[.5,.2],[.34,.38],[.66,.38],[.18,.58],[.82,.58]]},
  {id:"iv",n:"倒V",p:[[.5,.62],[.34,.44],[.66,.44],[.18,.24],[.82,.24]]},
  {id:"diamond",n:"菱形",p:[[.5,.2],[.3,.44],[.7,.44],[.5,.68],[.5,.44]]},
  {id:"w",n:"W",p:[[.5,.3],[.31,.56],[.69,.56],[.12,.3],[.88,.3]]},
  {id:"two",n:"前三後二",p:[[.5,.28],[.25,.28],[.75,.28],[.37,.6],[.63,.6]]},
  {id:"pyramid",n:"金字塔",p:[[.5,.2],[.37,.44],[.63,.44],[.24,.68],[.76,.68]]},
  {id:"spread",n:"散開",p:[[.5,.4],[.2,.24],[.8,.24],[.3,.72],[.7,.72]]},
  {id:"circle",n:"圓形",p:[[.5,.22],[.26,.42],[.74,.42],[.35,.72],[.65,.72]]},
  {id:"column",n:"縱列",p:[[.5,.16],[.5,.33],[.5,.5],[.5,.67],[.5,.84]]},
  {id:"diag",n:"斜線",p:[[.25,.2],[.37,.36],[.5,.52],[.63,.68],[.75,.84]]},
];
const FM=Object.fromEntries(FORMS.map(f=>[f.id,f]));
const prom=p=>p?Math.hypot(p[0]-.5,p[1]):9;   // 越小越顯眼(越前、越中間)
const byId=id=>API().M.find(m=>m.id===id);

/* ---------- 段落資訊(秒數、這段唱最多的人、killing part) ---------- */
function secInfo(T){ const A=API(); return T.secs.map((s,i)=>{ const v=s.lines.reduce((x,l)=>x+(+l.s||0),0), dur=v+A.instOf(s), by={};
  s.lines.forEach(l=>l.who.forEach(id=>by[id]=(by[id]||0)+(+l.s||0)/l.who.length));
  const k=s.lines.find(l=>l.k);
  return {i,n:s.n,chorus:!!s.chorus,dur,top:Object.entries(by).sort((a,b)=>b[1]-a[1])[0]?.[0]||null,
    rap:s.lines.filter(l=>l.t==="rap").length/(s.lines.length||1),kill:!!k,killer:k?.who?.[0]||null} }) }
const kindOf=si=>/舞蹈段|後副歌/.test(si.n)?"brk":/最後副歌/.test(si.n)?"final":si.chorus||/副歌/.test(si.n)?"chorus":/導歌/.test(si.n)?"pre":/橋段/.test(si.n)?"bridge":/前奏/.test(si.n)?"intro":/尾奏/.test(si.n)?"outro":"verse";
function expectE(si,T){ const k=kindOf(si); let e={brk:5,final:4.5,chorus:4,pre:3,bridge:2.5,intro:2,outro:1.5,verse:si.rap>=.5?3.5:2.5}[k];
  const f=API().GENRES[T.g?.[0]]?.f; if(f==="bal") e-=1.5; else if(f==="rnb") e-=.5; else if(f==="hip") e+=.3; return cl(e,1,5) }

/* ---------- 建議版 ---------- */
const SUG={intro:["spread","freeze"],verse:["two","groove"],pre:["v","walk"],chorus:["v","gesture"],brk:["pyramid","power"],bridge:["line","slow"],final:["w","unison"],outro:["line","freeze"]};
const MOOD_SWAP={甜蜜:{gesture:"heart",unison:"bounce",power:"jump"},療癒:{gesture:"heart",power:"unison",unison:"sway"},悲傷:{gesture:"wave",power:"canon",unison:"slow"},
  狂野:{gesture:"point",unison:"power",groove:"body"},神祕:{gesture:"mirror",unison:"canon",groove:"body"},清涼:{gesture:"clap",power:"jump"},自信:{gesture:"point"}};
function place(form,order){ const f=FM[form]||FM.line, pos={}; order.forEach((id,k)=>pos[id]=[...f.p[k]]); return pos }
function orderFor(focus,prev){ const rest=IDS.filter(x=>x!==focus); if(prev) rest.sort((a,b)=>prom(prev[a])-prom(prev[b])); return focus?[focus,...rest]:rest }
const bestDancer=()=>IDS.slice().sort((a,b)=>byId(b).dance-byId(a).dance)[0];
function suggest(T){ const SI=secInfo(T), best=bestDancer(), bal=API().GENRES[T.g?.[0]]?.f==="bal"; let prev=null;
  const secs=SI.map(si=>{ const k=kindOf(si); let [f,mv]=SUG[k]; mv=MOOD_SWAP[T.mood]?.[mv]||mv;
    if(bal&&MV[mv].e>3) mv=(k==="chorus"||k==="final")?"wave":"sway";
    const focus=k==="brk"?best:(si.kill&&si.killer)?si.killer:(si.top||IDS[si.i%5]);
    const pos=place(f,orderFor(focus,prev)); prev=pos; return {n:si.n,f,pos,mv,focus} });
  return {v:1,secs,hook:{name:""},prof:Object.fromEntries(IDS.map(i=>[i,0])),at:Date.now()} }
function blank(T){ const SI=secInfo(T); return {v:1,secs:SI.map(si=>({n:si.n,f:"line",pos:place("line",IDS),mv:"freeze",focus:null})),hook:{name:""},prof:Object.fromEntries(IDS.map(i=>[i,0])),at:Date.now()} }
/* 錄音室改過段落時,同名的段落照順序對回去,其他用建議版補 */
function getD(T){ const D=T?.dance; if(!D||!Array.isArray(D.secs)) return null; const SI=secInfo(T);
  if(D.secs.length!==SI.length||D.secs.some((s,i)=>s.n!==SI[i].n)){ const sg=suggest(T), pool={}; D.secs.forEach(s=>(pool[s.n]=pool[s.n]||[]).push(s)); D.secs=SI.map((si,i)=>pool[si.n]?.shift()||sg.secs[i]) }
  D.prof=D.prof||{}; IDS.forEach(i=>{ D.prof[i]=+D.prof[i]||0 }); D.hook=D.hook||{name:""}; return D }

/* ---------- 評分 ---------- */
function evalDance(T){ const D=T?.dance?getD(T):null; if(!D) return {has:false};
  const SI=secInfo(T), mood=T.mood, tot=SI.reduce((x,s)=>x+s.dur,0)||1, focT={}, cenT={}; IDS.forEach(i=>{focT[i]=0;cenT[i]=0});
  let fit=0,con=0,eAvg=0,dAvg=0,imp=0, chE=[],veE=[];
  SI.forEach((si,i)=>{ const s=D.secs[i], mv=MV[s.mv]||MV.groove, w=si.dur/tot, E=expectE(si,T);
    fit+=w*cl(100-Math.abs(mv.e-E)*22,0,100); con+=w*(mv.md.includes(mood)?100:mv.md.length>=6?65:20);
    eAvg+=w*mv.e; dAvg+=w*mv.d; imp+=w*(mv.e*.6+mv.d*.4);
    const k=kindOf(si); if(k==="chorus"||k==="final") chE.push(mv.e); if(k==="verse") veE.push(mv.e);
    if(s.focus) focT[s.focus]+=si.dur; const c=IDS.slice().sort((a,b)=>prom(s.pos[a])-prom(s.pos[b]))[0]; cenT[c]+=si.dur });
  const ch=SI.filter(s=>s.chorus), chm=ch.map(s=>D.secs[s.i].mv), hm=MV[chm[0]], named=(D.hook.name||"").trim();
  let hook=0; if(ch.length){ if(hm?.hook) hook+=45; if(chm.every(x=>x===chm[0])) hook+=20; if(named) hook+=15;
    const ks=SI.find(s=>s.kill); if(ks&&ks.killer&&D.secs[ks.i].focus===ks.killer) hook+=20 }
  hook=cl(hook,0,100);
  const fs=D.secs.map(s=>s.f), distinct=new Set(fs).size, ideal=cl(Math.round(SI.length*.55),3,7); let run=1,maxRun=1;
  for(let i=1;i<fs.length;i++){ if(fs[i]===fs[i-1]&&fs[i]!=="free"){ run++; maxRun=Math.max(maxRun,run) } else run=1 }
  const form=cl(100-Math.abs(distinct-ideal)*14-Math.max(0,maxRun-2)*12,0,100);
  const share=Object.fromEntries(IDS.map(i=>[i,(focT[i]*.6+cenT[i]*.4)/tot])), mx=Math.max(...IDS.map(i=>share[i]));
  const fair=cl(100-IDS.reduce((x,i)=>x+Math.max(0,.12-share[i])*420,0)-Math.max(0,mx-.4)*200,0,100);
  const need=35+dAvg*11, gaps=Object.fromEntries(IDS.map(i=>[i,need+focT[i]/tot*20-byId(i).dance]));
  const exec=cl(100-IDS.reduce((x,i)=>x+Math.max(0,gaps[i]),0)/5*2.5,0,100);
  const score=fit*.24+con*.18+hook*.2+form*.1+fair*.14+exec*.14, avgProf=IDS.reduce((x,i)=>x+D.prof[i],0)/5;
  const N=[], nm=i=>byId(i).n, avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  if(chE.length&&veE.length&&avg(chE)<=avg(veE)) N.push(["w","副歌的動作沒有比主歌強,高潮會起不來。"]);
  if(fit<60) N.push(["w","動作強弱跟歌曲起伏對不太上,參考每段的「期待強度」。"]);
  if(con<55) N.push(["w",`這首是「${mood}」的歌,很多動作不是這個感覺。`]);
  if(ch.length&&!hm?.hook) N.push(["w","副歌的動作不適合當記憶點,試試招牌手勢、比心、指向、人浪或鏡面。"]);
  else if(ch.length&&!named) N.push(["w","記憶點舞步還沒取名字,粉絲比較難跟著跳。"]);
  if(ch.length>1&&!chm.every(x=>x===chm[0])) N.push(["w","每次副歌的動作不一樣,記憶點會被稀釋。"]);
  if(distinct<3) N.push(["w","隊形幾乎沒變,舞台會很平。"]); else if(distinct>ideal+3) N.push(["w","隊形換得太頻繁,看起來會亂。"]);
  if(maxRun>=4) N.push(["w",`連續 ${maxRun} 段用同一個隊形。`]);
  IDS.filter(i=>share[i]<.05).forEach(i=>N.push(["b",`${nm(i)}一整首都沒有焦點,也幾乎沒站中間,個人粉會不滿。`]));
  IDS.filter(i=>share[i]>.45).forEach(i=>N.push(["w",`${nm(i)}的焦點太多,會被說公司偏心。`]));
  const weak=IDS.filter(i=>gaps[i]>8); if(weak.length) N.push(["b",`${weak.map(nm).join("、")}的舞蹈實力撐不住這份編舞,要多練或換簡單一點的動作。`]);
  const brk=SI.find(s=>kindOf(s)==="brk"), bd=bestDancer(); if(brk&&D.secs[brk.i].focus!==bd) N.push(["w",`${brk.n}可以交給${nm(bd)}領舞,她最擅長。`]);
  if(score>=80) N.push(["g","這份編舞很完整,上打歌會很有看頭。"]); if(hook>=80) N.push(["g","副歌舞步很好記,有機會變成挑戰。"]);
  return {has:true,score,fit,concept:con,hook,form,fair,exec,energy:eAvg,diff:dAvg,impact:cl((imp-1)/4*100,0,100),share,gaps,avgProf,prof:{...D.prof},hookName:named,hookMove:hm?.n||"",notes:N} }
window.choreoEval=T=>evalDance(T);
window.choreoSections=T=>{ const D=getD(T); return D?D.secs.map(s=>({move:MV[s.mv]?.n||"",energy:MV[s.mv]?.e||0,focus:s.focus,f:s.f,pos:s.pos})):null };
window.choreoSummary=T=>{ const e=evalDance(T); return e.has?{has:true,score:e.score,impact:e.impact,diff:e.diff,energy:e.energy,hook:e.hook,hookName:e.hookName||e.hookMove,prof:e.prof}:{has:false} };

/* ---------- 熟練度:練習(花行動)、待在練習室自己練、打歌後進步 ---------- */
const titleT=()=>{ const R=API()?.R; return R?R.tracks.find(t=>t.id===R.title):null };
function gain(D,id,base){ const g=Math.max(1,Math.round(base*(1-D.prof[id]/110))); D.prof[id]=Math.min(100,D.prof[id]+g); return g }
window.choreoOnSlotEnd=ids=>{ const T=titleT(), D=getD(T); if(!D||!ids?.length) return; ids.forEach(id=>gain(D,id,3)); API().save() };
window.choreoAfterShow=ids=>{ const T=titleT(), D=getD(T); if(!D||!ids?.length) return; ids.forEach(id=>gain(D,id,2)); API().save() };
function practice(T){ if(S.acts<=0) return; const D=getD(T), e=evalDance(T); S.acts--; S.lastPrac=S.day; let tot=0;
  for(const id of IDS){ const st=S.m[id]; tot+=gain(D,id,14*(.6+byId(id).dance/200)*(1.25-e.diff*.07)*(st.stress>75?.6:1));
    st.stress=cl(st.stress+5,0,100); window.growthGrow?.(id,"dance",.15) }
  D.at=Date.now(); API().save(); save(true); if(typeof renderHud==="function") renderHud();
  toast2(`練習完成:平均熟練度 +${Math.round(tot/5)}%`+(S.acts<=0?"。這個時段的行動用完了,離開後進入下一個時段":""));
  if(S.acts<=0) window.__actsOut=true }

/* ---------- 畫面 ---------- */
let SEL=0, PICK=null, PREV=null;
function render(body,rerender){ const A=API(), R=A.R, T=A.cur(), M=A.M;
  const tapes=`<div class="cr-tapes">${R.tracks.map((x,i)=>`<button class="cr-tape${x.id===T.id?" on":""}" data-tk="${x.id}">${String(i+1).padStart(2,"0")} ${esc(x.name||"未命名")}${x.id===R.title?"・主打":""}</button>`).join("")}<span class="cr-info">${esc(A.GENRES[T.g?.[0]]?.n||"")}・${esc(T.mood||"")}</span></div>`;
  const bindTapes=()=>body.querySelectorAll("[data-tk]").forEach(b=>b.onclick=()=>{ stopPrev(); R.cur=b.dataset.tk; SEL=0; PICK=null; A.save(false); rerender() });
  if(!T.dance){ body.innerHTML=`${tapes}<div class="cr-card cr-start"><h4>《${esc(T.name||"未命名")}》還沒有編舞</h4>
      <p>依錄音室的段落,一段一段決定隊形、動作和焦點成員。主打的編舞會影響打歌舞台、短影音挑戰和音源反應;還沒編之前,用公司的預設編舞(普通)。</p>
      <div class="cr-btns"><button class="pbtn pri" id="dNewSug">用建議版開始</button><button class="pbtn" id="dNewBlank">從空白開始</button></div></div>`;
    bindTapes(); $("#dNewSug").onclick=()=>{ T.dance=suggest(T); commit(T,false,rerender) }; $("#dNewBlank").onclick=()=>{ T.dance=blank(T); commit(T,false,rerender) }; return }
  const D=getD(T), SI=secInfo(T), e=evalDance(T); SEL=cl(SEL,0,SI.length-1); const s=D.secs[SEL], si=SI[SEL], E=expectE(si,T);
  const isT=R.title===T.id, bar=([n,v])=>`<div class="cr-bar"><span>${n}</span><span class="t"><i style="width:${cl(v,0,100)}%"></i></span><span class="num">${Math.round(v)}</span></div>`;
  body.innerHTML=`${tapes}
  <div class="cr-ribbon">${SI.map((x,i)=>`<button class="cr-sec${i===SEL?" on":""}" data-si="${i}" style="flex-grow:${Math.max(1,Math.round(x.dur))};--c:${D.secs[i].focus?byId(D.secs[i].focus).c:"#B9AD9C"}" title="${esc(x.n)}">${esc(x.n)}</button>`).join("")}</div>
  <div class="cr-grid">
    <div class="cr-card cr-main"><h4>${esc(si.n)}<small>${Math.round(si.dur)} 秒・期待強度 ${E.toFixed(1)}</small></h4>
      <div class="cr-stagebox"><div class="cr-stage" id="dStage"><span class="cr-back">舞台後方</span><span class="cr-front">觀眾</span><span class="cr-mvlab" id="dMvLab">${esc(MV[s.mv]?.n||"")}</span>
        ${IDS.map(id=>{ const p=s.pos[id]||[.5,.5], m=byId(id); return `<button class="cr-dot${PICK===id?" sel":""}${s.focus===id?" foc":""}" data-dot="${id}" style="--c:${m.c};left:${6+p[0]*88}%;top:${10+(1-p[1])*80}%" aria-label="${m.n}">${m.n[0]}</button>` }).join("")}</div></div>
      <div class="cr-ctrl"><div class="cr-chips">${FORMS.map(f=>`<button class="cr-chip${s.f===f.id?" on":""}" data-form="${f.id}">${f.n}</button>`).join("")}${s.f==="free"?`<span class="cr-chip on">自訂</span>`:""}</div>
      <p class="cr-hint">${PICK?`已選${byId(PICK).n}:再點另一個人互換位置`:"點兩個人互換位置,或直接拖曳到想要的地方。選預設隊形時,焦點成員會站最顯眼的位置。"}</p>
      <div class="cr-btns"><button class="pbtn pri" id="dPlay">舞台預覽</button><button class="pbtn" id="dPrev">${PREV?"■ 停止":"▶ 隊形預覽"}</button>${SEL>0?`<button class="pbtn" id="dCopy">沿用上一段隊形</button>`:""}<button class="pbtn" id="dSug">整首換成建議版</button></div></div></div>
    <div class="cr-card"><h5>動作</h5><div class="cr-moves">${CATS.map(c=>`<div class="cr-cat"><small>${c}</small>${MOVES.filter(m=>m.cat===c).map(m=>`<button class="cr-mv${s.mv===m.id?" on":""}${m.md.includes(T.mood)?" fit":""}" data-mv="${m.id}"><b>${m.n}</b><i>強${m.e}・難${m.d}${m.hook?"・記憶點":""}</i></button>`).join("")}</div>`).join("")}</div>
      <h5>焦點成員<small>這段鏡頭給誰</small></h5><div class="cr-focs">${IDS.map(id=>{ const m=byId(id); return `<button class="cr-foc${s.focus===id?" on":""}" data-foc="${id}" style="--c:${m.c}">${m.n}</button>` }).join("")}</div>
      <h5>記憶點舞步<small>副歌動作:${esc(e.hookMove||"—")}</small></h5><input class="cr-hook" id="dHook" maxlength="16" placeholder="替副歌的招牌動作取名,例:數到十手勢" value="${esc(D.hook.name||"")}"></div>
    <div class="cr-card"><div class="cr-big"><b>${Math.round(e.score)}</b><span>編舞分${isT?"・會影響打歌與音源反應":"(收錄曲)"}</span></div>
      ${[["歌舞契合",e.fit],["概念一致",e.concept],["記憶點",e.hook],["隊形變化",e.form],["亮點公平",e.fair],["難度與實力",e.exec]].map(bar).join("")}
      <ul class="cr-notes">${(e.notes.length?e.notes:[["g","沒有明顯的問題。"]]).slice(0,5).map(([k,t])=>`<li class="${k}">${t}</li>`).join("")}</ul>
      <h5>熟練度<small>平均 ${Math.round(e.avgProf)}%</small></h5>
      ${IDS.map(id=>{ const m=byId(id); return `<div class="cr-prof"><span style="color:${m.c}">${m.n}</span><span class="cr-pb"><i style="width:${D.prof[id]}%;background:${m.c}"></i></span><span class="num">${D.prof[id]}%</span></div>` }).join("")}
      <div class="cr-btns"><button class="pbtn pri" id="dPrac" ${S.acts<=0?"disabled":""}>全員練習這首(花 1 次行動)</button></div>
      <p class="cr-hint">這個時段剩 ${S.acts} 次行動。練習會增加壓力;${isT?"待在練習室的成員每個時段也會自己練一點。熟練度不夠,打歌容易跳錯。":"打歌用的是主打的熟練度。"}改動作或隊形,熟練度會掉一點。</p></div>
  </div>`;
  bindTapes();
  body.querySelectorAll("[data-si]").forEach(b=>b.onclick=()=>{ stopPrev(); SEL=+b.dataset.si; PICK=null; rerender() });
  body.querySelectorAll("[data-form]").forEach(b=>b.onclick=()=>{ s.f=b.dataset.form; s.pos=place(s.f,orderFor(s.focus,s.pos)); PICK=null; commit(T,true,rerender) });
  body.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{ if(s.mv===b.dataset.mv) return; s.mv=b.dataset.mv; commit(T,true,rerender) });
  body.querySelectorAll("[data-foc]").forEach(b=>b.onclick=()=>{ s.focus=s.focus===b.dataset.foc?null:b.dataset.foc; commit(T,false,rerender) });
  $("#dHook").onchange=ev=>{ D.hook={name:ev.target.value.trim()}; commit(T,false,rerender) };
  $("#dPrac").onclick=()=>{ practice(T); rerender() };
  $("#dPrev").onclick=()=>preview(T,rerender); $("#dPlay").onclick=()=>{ stopPrev(); window.openStagePlay?.(T) };
  $("#dCopy")&&($("#dCopy").onclick=()=>{ const p=D.secs[SEL-1]; s.f=p.f; s.pos=JSON.parse(JSON.stringify(p.pos)); commit(T,true,rerender) });
  $("#dSug").onclick=()=>{ if(!confirm("整首換成建議版?目前這首的隊形、動作、焦點都會被取代(熟練度保留一部分)。")) return; const pr=D.prof, nm=D.hook; T.dance=suggest(T); T.dance.prof=pr; T.dance.hook=nm; commit(T,true,rerender) };
  /* 隊形:點兩人互換,或拖曳 */
  const st=$("#dStage");
  st.querySelectorAll("[data-dot]").forEach(dot=>dot.onpointerdown=ev=>{ if(PREV) return; ev.preventDefault(); const id=dot.dataset.dot, r=st.getBoundingClientRect(), x0=ev.clientX, y0=ev.clientY; let moved=false, np=null;
    try{ dot.setPointerCapture(ev.pointerId) }catch(e){} dot.classList.add("drag");
    dot.onpointermove=e2=>{ if(!moved&&Math.hypot(e2.clientX-x0,e2.clientY-y0)<6) return; moved=true;
      const px=(e2.clientX-r.left)/r.width*100, py=(e2.clientY-r.top)/r.height*100, x=cl((px-6)/88,0,1), y=cl(1-(py-10)/80,0,1);
      dot.style.left=(6+x*88)+"%"; dot.style.top=(10+(1-y)*80)+"%"; np=[+x.toFixed(3),+y.toFixed(3)] };
    dot.onpointerup=dot.onpointercancel=()=>{ dot.onpointermove=dot.onpointerup=dot.onpointercancel=null; dot.classList.remove("drag");
      if(moved&&np){ s.pos[id]=np; s.f="free"; PICK=null; commit(T,true,rerender); return }
      if(!PICK){ PICK=id; rerender(); return } if(PICK===id){ PICK=null; rerender(); return }
      const a=s.pos[PICK]; s.pos[PICK]=s.pos[id]; s.pos[id]=a; PICK=null; commit(T,true,rerender) } });
}
function commit(T,decay,rerender){ const D=getD(T); if(decay&&D) IDS.forEach(i=>{ D.prof[i]=Math.floor(D.prof[i]*.97) });
  if(D){ D.at=Date.now(); const e=evalDance(T); T.choreo=cl(Math.round(e.energy),1,5) }   // 錄音室的現場風險用編舞強度
  API().save(); rerender() }
function stopPrev(){ if(PREV){ clearTimeout(PREV); PREV=null } }
function preview(T,rerender){ if(PREV){ stopPrev(); rerender(); return }
  const D=getD(T), SI=secInfo(T); let i=0; PICK=null; SEL=0; rerender(); $("#dPrev").textContent="■ 停止預覽"; PREV=1;
  const step=()=>{ const st=$("#dStage"); if(!st||!PREV){ PREV=null; return }
    const s=D.secs[i]; st.querySelectorAll("[data-dot]").forEach(d=>{ const p=s.pos[d.dataset.dot]||[.5,.5]; d.style.left=(6+p[0]*88)+"%"; d.style.top=(10+(1-p[1])*80)+"%"; d.classList.toggle("foc",s.focus===d.dataset.dot) });
    document.querySelectorAll(".cr-sec").forEach((b,k)=>b.classList.toggle("on",k===i)); const lab=$("#dMvLab"); if(lab) lab.textContent=`${SI[i].n}・${MV[s.mv]?.n||""}`;
    SEL=i; i++; PREV=i<SI.length?setTimeout(step,Math.max(900,SI[i-1].dur*45)):setTimeout(()=>{ PREV=null; rerender() },1400) };
  step() }
window.choreoRender=(body,rerender)=>render(body,rerender);
})();
