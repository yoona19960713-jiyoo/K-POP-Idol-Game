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
function secInfo(T){ const A=API(), bs=beatSec(T), SB=T.sync?.bars||null; return T.secs.map((s,i)=>{ const v=s.lines.reduce((x,l)=>x+(+l.s||0),0), by={};
  let dur=v+A.instOf(s); if(SB&&SB[i]!=null&&SB[i+1]!=null&&SB[i+1]>SB[i]) dur=(SB[i+1]-SB[i])*4*bs; else if(SB&&SB[i]!=null&&i===T.secs.length-1&&+T.sync.end>0){ const st=(+T.sync.downbeat||0)+(SB[i]-1)*4*bs; if(T.sync.end>st) dur=T.sync.end-st }   // 2.0:對過拍的段落用 mp3 實際的長度
  s.lines.forEach(l=>l.who.forEach(id=>by[id]=(by[id]||0)+(+l.s||0)/l.who.length));
  const k=s.lines.find(l=>l.k);
  return {i,n:s.n,chorus:!!s.chorus,dur,beats:dur/bs,top:Object.entries(by).sort((a,b)=>b[1]-a[1])[0]?.[0]||null,
    rap:s.lines.filter(l=>l.t==="rap").length/(s.lines.length||1),kill:!!k,killer:k?.who?.[0]||null,killLine:k?s.lines.indexOf(k)+1:0} }) }
/* ---------- 2.0 拍子與時間軸(2026-11-01):一段可以有很多動作片段(cues)與換隊形(forms),位置都以「拍」算 ---------- */
const bpmOf=T=>{ const b=+T?.bpm; return b>=50&&b<=240?b:0 };
const beatSec=T=>60/(bpmOf(T)||120);           // 沒有 BPM 時先當 120
const cnt=c=>{ if(typeof c==="number") return Math.max(0,c); const m=/^\s*(\d+)\s*-\s*(\d+(?:\.5)?)\s*$/.exec(String(c||"")); return m?Math.max(0,(+m[1]-1)*8+(+m[2]-1)):0 };
const cntTxt=b=>`${Math.floor(b/8)+1}-${+(b%8+1).toFixed(1)}`;
const whoIds=w=>w==="all"||!w?IDS.slice():[].concat(w).filter(id=>IDS.includes(id));
const STAGE_W=10, STAGE_D=6, RUN=3.2;          // 舞台約 10×6 公尺;走位超過每秒 3.2 公尺就來不及
/* 每段的動作片段:舊的編舞(一段一個動作)當成整段一個片段 */
function cuesOf(s,nb){ const C=Array.isArray(s.cues)&&s.cues.length?s.cues:[{b:0,len:nb,mv:s.mv,who:"all",focus:s.focus}];
  return C.map(c=>({...c,b:Math.max(0,+c.b||0),len:Math.max(.5,+c.len||nb),mv:MV[c.mv]?c.mv:(s.mv||"groove"),who:c.who||"all"})).sort((a,b)=>a.b-b.b) }
function formsOf(s){ return (Array.isArray(s.forms)?s.forms:[]).filter(k=>k&&k.pos).map(k=>({...k,b:Math.max(0,+k.b||0),walk:Math.max(0,+k.walk||0)})).sort((a,b)=>a.b-b.b) }
/* 某一拍每個人在哪裡(換隊形時依走位拍數線性移動) */
function posAt(s,b){ let cur=s.pos||{}; for(const k of formsOf(s)){ if(b>=k.b) { cur=k.pos; continue } const t0=k.b-k.walk; if(k.walk>0&&b>t0){ const r=(b-t0)/k.walk, o={};
      IDS.forEach(id=>{ const a=cur[id]||[.5,.5], z=k.pos[id]||a; o[id]=[a[0]+(z[0]-a[0])*r,a[1]+(z[1]-a[1])*r] }); return o } break }
  return cur }
/* 某一拍每個人在做的動作:同一個人取最近開始的片段(片段結束後沒有新的,就延續) */
function movesAt(C,b,fallback){ const o={}, ez={}, fc={}; IDS.forEach(id=>{ o[id]=fallback; fc[id]="front" }); let foc=null;
  for(const c of C){ if(c.b>b+1e-6) break; whoIds(c.who).forEach(id=>{ o[id]=c.mv; ez[id]=!!c.easy; fc[id]=c.face||"front" }); if(c.focus!==undefined) foc=c.focus||null } return {o,foc,ez,fc} }
/* 簡化版(2.0 第 3 包):同一套動作的簡化版,難度 −1.5、強度 −0.5 */
const effMv=(m,easy)=>easy?{...m,e:Math.max(1,m.e-.5),d:Math.max(1,m.d-1.5)}:m;
/* 朝向(2.0 第 4 包,編舞室的需求):片段可以標朝向;左右照觀眾看過去的方向。只給舞台預覽看,不影響分數。
   朝外、朝內依當下隊形的中心自動算每個人的方向;回頭 = 背對觀眾、從肩膀上回頭看鏡頭 */
const FACES=[["front","正面","正"],["back","背對","背"],["left","朝左","左"],["right","朝右","右"],["out","朝外","外"],["in","朝內","內"],["look","回頭","回"]];
const FACE_ALIAS={正面:"front",正:"front",面向觀眾:"front",背對:"back",背:"back",背面:"back",背對觀眾:"back",朝左:"left",左:"left",向左:"left",朝右:"right",右:"right",向右:"right",朝外:"out",外:"out",向外:"out",朝內:"in",內:"in",向內:"in",面對面:"in",回頭:"look",回望:"look"};
const faceCode=x=>{ const v=String(x??"").trim(); return FACES.some(f=>f[0]===v)?v:FACE_ALIAS[v]||null };
/* 曲風也算進概念(2.0 第 3 包):節奏強的曲風,力量型的群舞、技巧動作也算合 */
const DRIVE=new Set(["edmpop","poprock","house","futurebass","girlcrush","trap","drill","njs","disco","moombah"]);
const conOf=(m,mood,drive)=>m.md.includes(mood)?100:(drive&&m.e>=4&&["群舞","技巧","個人"].includes(m.cat))?85:m.md.length>=6?65:20;
/* 走位來不及:換隊形時每個人要走的距離 ÷ 走位時間 */
function walkIssues(T,D,SI){ const bs=beatSec(T), out=[];
  D.secs.forEach((s,i)=>{ let prev=s.pos||{}; for(const k of formsOf(s)){ let worst=null;
      IDS.forEach(id=>{ const a=prev[id]||[.5,.5], z=k.pos[id]||a, d=Math.hypot((z[0]-a[0])*STAGE_W,(z[1]-a[1])*STAGE_D), t=k.walk*bs;
        if(d>.6&&(k.walk===0?d>2.5:d/t>RUN)&&(!worst||d>worst.d)) worst={id,d,t} });
      if(worst) out.push({sec:i,n:SI[i].n,b:k.b,...worst}); prev=k.pos } });
  return out }
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

/* ---------- 評分(2.0:依時間加權,半拍一格;舊的一段一個動作算出來跟以前一樣) ---------- */
function evalDance(T){ const D=T?.dance?getD(T):null; if(!D) return {has:false};
  const SI=secInfo(T), mood=T.mood, tot=SI.reduce((x,s)=>x+s.dur,0)||1, focT={}, cenT={}, dT={}, focTot={}; IDS.forEach(i=>{focT[i]=0;cenT[i]=0;dT[i]=0});
  let fit=0,con=0,eAvg=0,dAvg=0,imp=0; const chE=[],veE=[], drive=(T.g||[]).some(g=>DRIVE.has(g));
  SI.forEach((si,i)=>{ const s=D.secs[i], nb=Math.max(.5,si.beats), C=cuesOf(s,nb), E=expectE(si,T), k=kindOf(si), step=.5, n=Math.max(1,Math.round(nb/step)), w=si.dur/tot/n;
    for(let q=0;q<n;q++){ const b=q*step+step/2, {o,foc,ez}=movesAt(C,b,s.mv||"groove"), ms=IDS.map(id=>effMv(MV[o[id]]||MV.groove,ez[id]));
      const eMax=Math.max(...ms.map(m=>m.e)), eAv=ms.reduce((x,m)=>x+m.e,0)/5, e=eMax*.7+eAv*.3;
      fit+=w*cl(100-Math.abs(e-E)*22,0,100); con+=w*ms.reduce((x,m)=>x+conOf(m,mood,drive),0)/5;
      eAvg+=w*e; const dd=ms.reduce((x,m)=>x+m.d,0)/5; dAvg+=w*dd; imp+=w*(e*.6+dd*.4);
      IDS.forEach((id,z)=>dT[id]+=w*ms[z].d);
      if(k==="chorus"||k==="final") chE.push(e); if(k==="verse") veE.push(e);
      const f=foc!==null&&foc!==undefined?foc:s.focus; if(f) focT[f]+=si.dur/n;
      const P=posAt(s,b), c=IDS.slice().sort((a,b2)=>prom(P[a])-prom(P[b2]))[0]; cenT[c]+=si.dur/n } });
  const ch=SI.filter(s=>s.chorus), kp=kpOf(T,D,SI);
  const hm=kp?MV[kp.mv]:MV[D.secs[ch[0]?.i]?.mv], named=(kp?.name||D.hook?.name||"").trim();
  let hook=0; if(ch.length){ if(hm?.hook) hook+=45;
    if(kp) { if(kp.every) hook+=20 } else { const chm=ch.map(x=>D.secs[x.i].mv); if(chm.every(x=>x===chm[0])) hook+=20 }
    if(named) hook+=15;
    const ks=SI.find(s=>s.kill); if(ks&&ks.killer){ const ksec=D.secs[ks.i], kl=edLines(T,ks).find(l=>l.k), fk=kl?movesAt(cuesOf(ksec,ks.beats),kl.b+.25,ksec.mv).foc:null;
      if((fk!=null?fk:ksec.focus)===ks.killer) hook+=20 }   /* killing part 那一句的焦點是唱的人(2.0 看那一拍) */
    if(kp&&kp.len>4) hook-=10 }
  hook=cl(hook,0,100);
  const states=[]; D.secs.forEach(s=>{ states.push(s.f); formsOf(s).forEach(k=>states.push(k.f||"free")) });
  const distinct=new Set(states).size, ideal=cl(Math.round(SI.length*.55),3,7), fs=D.secs.map(s=>s.f); let run=1,maxRun=1;
  for(let i=1;i<fs.length;i++){ if(fs[i]===fs[i-1]&&fs[i]!=="free"&&!formsOf(D.secs[i-1]).length){ run++; maxRun=Math.max(maxRun,run) } else run=1 }
  const walks=walkIssues(T,D,SI);
  const form=cl(100-Math.abs(Math.min(distinct,ideal+2)-ideal)*14-Math.max(0,distinct-ideal-2)*6-Math.max(0,maxRun-2)*12-Math.min(30,walks.length*10),0,100);
  const share=Object.fromEntries(IDS.map(i=>[i,(focT[i]*.6+cenT[i]*.4)/tot])), mx=Math.max(...IDS.map(i=>share[i]));
  const fair=cl(100-IDS.reduce((x,i)=>x+Math.max(0,.12-share[i])*420,0)-Math.max(0,mx-.4)*200,0,100);
  const gaps=Object.fromEntries(IDS.map(i=>[i,35+dT[i]*11+focT[i]/tot*20-byId(i).dance]));
  const exec=cl(100-IDS.reduce((x,i)=>x+Math.max(0,gaps[i]),0)/5*2.5,0,100);
  const score=fit*.24+con*.18+hook*.2+form*.1+fair*.14+exec*.14, avgProf=IDS.reduce((x,i)=>x+D.prof[i],0)/5;
  const N=[], nm=i=>byId(i).n, avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  if(chE.length&&veE.length&&avg(chE)<=avg(veE)) N.push(["w","副歌的動作沒有比主歌強,高潮會起不來。"]);
  if(fit<60) N.push(["w","動作強弱跟歌曲起伏對不太上,參考每段的「期待強度」。"]);
  if(con<55) N.push(["w",`這首是「${mood}」的歌,很多動作不是這個感覺。`]);
  if(ch.length&&!hm?.hook) N.push(["w",kp?"KEY POINT 的動作不適合當記憶點,試試招牌手勢、比心、指向、人浪或鏡面。":"副歌的動作不適合當記憶點,試試招牌手勢、比心、指向、人浪或鏡面。"]);
  else if(ch.length&&!named) N.push(["w","記憶點舞步還沒取名字,粉絲比較難跟著跳。"]);
  if(kp&&kp.len>4) N.push(["w",`KEY POINT 有 ${kp.len} 拍,超過 4 拍不好學。`]);
  if(!kp&&ch.length>1){ const chm=ch.map(x=>D.secs[x.i].mv); if(!chm.every(x=>x===chm[0])) N.push(["w","每次副歌的動作不一樣,記憶點會被稀釋。"]) }
  walks.slice(0,2).forEach(w=>N.push(["w",`${w.n} ${cntTxt(w.b)}:${nm(w.id)}走位來不及(${w.t>0?`${+(w.t).toFixed(1)} 秒`:"瞬間"}要移動約 ${Math.round(w.d)} 公尺)。`]));
  if(distinct<3) N.push(["w","隊形幾乎沒變,舞台會很平。"]); else if(distinct>ideal+4) N.push(["w","隊形換得太頻繁,看起來會亂。"]);
  if(maxRun>=4) N.push(["w",`連續 ${maxRun} 段用同一個隊形。`]);
  IDS.filter(i=>share[i]<.05).forEach(i=>N.push(["b",`${nm(i)}一整首都沒有焦點,也幾乎沒站中間,個人粉會不滿。`]));
  IDS.filter(i=>share[i]>.45).forEach(i=>N.push(["w",`${nm(i)}的焦點太多,會被說公司偏心。`]));
  const weak=IDS.filter(i=>gaps[i]>8); if(weak.length) N.push(["b",`${weak.map(nm).join("、")}的舞蹈實力撐不住這份編舞,要多練或換簡單一點的動作。`]);
  const brk=SI.find(s=>kindOf(s)==="brk"), bd=bestDancer(); if(brk&&D.secs[brk.i].focus!==bd&&!cuesOf(D.secs[brk.i],brk.beats).some(c=>c.focus===bd)) N.push(["w",`${brk.n}可以交給${nm(bd)}領舞,她最擅長。`]);
  if(score>=80) N.push(["g","這份編舞很完整,上打歌會很有看頭。"]); if(hook>=80) N.push(["g","副歌舞步很好記,有機會變成挑戰。"]);
  return {has:true,score,fit,concept:con,hook,form,fair,exec,energy:eAvg,diff:dAvg,impact:cl((imp-1)/4*100,0,100),share,gaps,avgProf,prof:{...D.prof},hookName:named,hookMove:hm?.n||"",notes:N,walks,kp} }
/* KEY POINT:第一次出現的段落與拍子;每次副歌同一拍有同一個動作就算「每次都有」 */
function kpOf(T,D,SI){ const k=D.kp; if(!k||!k.name&&k.b==null) return null; const i=cl(+k.sec||0,0,SI.length-1), s=D.secs[i], C=cuesOf(s,SI[i].beats);
  const pos=kpPos(k), at=C.filter(c=>c.b<=k.b+1e-6&&(k.lead==="all"||!k.lead||whoIds(c.who).includes(k.lead))).pop()||C[0], mv=at?.mv||s.mv;
  const every=SI.filter(x=>x.chorus).every(x=>{ const CC=cuesOf(D.secs[x.i],x.beats); return pos.every(b=>CC.filter(c=>c.b<=b+1e-6).pop()?.mv===mv) });
  return {...k,sec:i,mv,every,len:+k.len||4,pos} }
const kpPos=k=>[k.b,...(Array.isArray(k.also)?k.also.map(a=>a.b):[])].filter(b=>b!=null);
window.choreoEval=T=>evalDance(T);
/* 朝向的角度(俯視:0 面向觀眾、90 朝右、180 背對、-90 朝左;左右照觀眾看過去);朝外、朝內看當下隊形的中心 */
function faceDeg(code,id,pos){ if(code==="back"||code==="look") return 180; if(code==="left") return -90; if(code==="right") return 90;
  if(code==="out"||code==="in"){ const ps=IDS.map(i=>pos[i]).filter(Boolean); if(!ps.length) return 0; const cx=ps.reduce((a,p)=>a+p[0],0)/ps.length, cy=ps.reduce((a,p)=>a+p[1],0)/ps.length, p=pos[id]||[cx,cy];
    let dx=(p[0]-cx)*STAGE_W, dy=(p[1]-cy)*STAGE_D; if(code==="in"){ dx=-dx; dy=-dy } if(Math.hypot(dx,dy)<.3) return code==="in"?180:0;
    return Math.round(Math.atan2(dx,-dy)*180/Math.PI) }
  return 0 }
/* 舞台預覽 2.0(第 4 包)用的資料:每一拍誰站哪裡(換隊形時緩起緩停)、在做什麼動作、朝哪裡、焦點是誰;KEY POINT 與小亮點在整首的哪幾秒 */
window.choreoStage=T=>{ const D=getD(T), SI=secInfo(T), L=window.songTimeline(T), bs=beatSec(T);
  const base={bs,L,mood:T.mood||"",FACES,MV:Object.fromEntries(MOVES.map(m=>[m.id,{n:m.n,e:m.e,cat:m.cat}]))};
  if(!D) return {...base,has:false};
  const secs=D.secs.map((s,i)=>{ const nb=Math.max(1,Math.ceil(SI[i].beats*2)/2); return {i,s,nb,C:cuesOf(s,nb),F:formsOf(s),t0:L.secs[i]?.t0||0,t1:L.secs[i]?.t1||0,n:SI[i].n,chorus:SI[i].chorus} });
  const posF=(x,b)=>{ let cur=x.s.pos||{}; for(const k of x.F){ if(b>=k.b){ cur=k.pos; continue } const t0=k.b-k.walk;
      if(k.walk>0&&b>t0){ const r=(b-t0)/k.walk, e=r*r*(3-2*r), o={}; IDS.forEach(id=>{ const a=cur[id]||[.5,.5], z=k.pos[id]||a; o[id]=[a[0]+(z[0]-a[0])*e,a[1]+(z[1]-a[1])*e] }); return {pos:o,walk:k} } break }
    return {pos:cur,walk:null} };
  const at=(si,b)=>{ const x=secs[si]; if(!x) return null; const {pos,walk}=posF(x,b), m=movesAt(x.C,b,x.s.mv), deg={}, cue={};
    for(const c of x.C){ if(c.b>b+1e-6) break; whoIds(c.who).forEach(id=>cue[id]=c) }
    IDS.forEach(id=>deg[id]=faceDeg(m.fc[id],id,pos));
    return {pos,walk,mv:m.o,ez:m.ez,fc:m.fc,deg,cue,foc:x.C.some(c=>c.b<=b+1e-6&&c.focus!==undefined)?m.foc:(x.s.focus||null)} };
  const next=(si,b)=>{ const x=secs[si]; return x?x.F.find(k=>k.b>b+1e-6)||null:null };
  const e=evalDance(T), k=e.kp, kpw=[];
  if(k) secs.forEach(x=>{ const main=x.i===k.sec, fin=!!k.final&&k.final.sec===x.i; if(!main&&!x.chorus&&!fin) return;
    k.pos.forEach((b,j)=>{ if(b>=x.nb) return; const c=x.C.filter(c=>c.b<=b+1e-6).pop(); if(!main&&!fin&&c?.mv!==k.mv) return;
      kpw.push({si:x.i,b,len:k.len,t0:x.t0+b*bs,t1:x.t0+(b+k.len)*bs,lead:fin&&k.final.lead?k.final.lead:(k.lead||"all"),final:fin,n:j}) }) });
  kpw.sort((a,b)=>a.t0-b.t0);
  const hl=(D.hl||[]).filter(h=>secs[h.sec]).map(h=>({si:h.sec,t0:secs[h.sec].t0+h.b*bs,t1:secs[h.sec].t0+(h.b+h.len)*bs,who:h.who||[],desc:h.desc||""}));
  return {...base,has:true,secs:secs.map(x=>({i:x.i,n:x.n,t0:x.t0,t1:x.t1,nb:x.nb,chorus:x.chorus})),at,next,
    kp:k?{name:k.name||"",steps:k.steps||[],lead:k.lead||"all",len:k.len,mv:k.mv,final:k.final||null}:null,kpw,hl,prof:{...D.prof},kpm:{...(D.kpm||{})}} };
window.choreoSections=T=>{ const D=getD(T); return D?D.secs.map(s=>({move:MV[s.mv]?.n||"",energy:MV[s.mv]?.e||0,focus:s.focus,f:s.f,pos:s.pos})):null };
window.choreoSummary=T=>{ const e=evalDance(T); return e.has?{has:true,score:e.score,impact:e.impact,diff:e.diff,energy:e.energy,hook:e.hook,hookName:e.hookName||e.hookMove,prof:e.prof,kp:e.kp?{name:e.kp.name||"",lead:e.kp.lead||"all",len:e.kp.len}:null,kpm:(()=>{ const D=getD(T), m=D?.kpm||{}; return Math.round(IDS.reduce((x,i)=>x+(+m[i]||0),0)/5) })()}:{has:false} };
/* ---------- 2.0 編舞的匯入、匯出(2026-11-01;格式見《編舞室_專用對話說明》第 6 節,ver 1;ver 0 會自動轉) ---------- */
const MVN=Object.fromEntries(MOVES.map(m=>[m.n,m.id]));
const mvCode=x=>MV[x]?x:MVN[String(x||"").trim()]||null;
const posObj=p=>{ if(!p) return null; const o={}; if(Array.isArray(p)) IDS.forEach((id,k)=>{ if(Array.isArray(p[k])) o[id]=p[k] }); else IDS.forEach(id=>{ if(Array.isArray(p[id])) o[id]=p[id] });
  if(IDS.some(id=>!o[id])) return null; IDS.forEach(id=>o[id]=[+cl(+o[id][0]||0,0,1).toFixed(3),+cl(+o[id][1]||0,0,1).toFixed(3)]); return o };
/* 段落名稱照順序對(兩個「副歌」:第 1 個對第 1 個) */
function matchSecs(T,arr){ const used=new Set(); return T.secs.map((s,i)=>{ let k=arr.findIndex((y,yi)=>!used.has(yi)&&y?.name===s.n); if(k<0&&arr[i]&&!used.has(i)&&!arr.some(y=>y?.name===s.n)) k=i; if(k<0) return null; used.add(k); return arr[k] }) }
function fromJSON(T,o){ const bpm=+o.bpm>=50&&+o.bpm<=240?+o.bpm:0;
  let sync=null; if(o.sync&&Array.isArray(o.sync.sections)){ const SX=matchSecs(T,o.sync.sections), bars={}; SX.forEach((y,i)=>{ if(y&&+y.bar>=1) bars[i]=+y.bar });
    if(Object.keys(bars).length) sync={downbeat:+o.sync.downbeat||0,bars,...(+o.sync.end>0?{end:+o.sync.end}:{})} }
  const TT={...T,bpm:bpm||T.bpm,sync:sync||T.sync}, SI=secInfo(TT), bs=beatSec(TT), X=matchSecs(T,Array.isArray(o.sections)?o.sections:[]), miss=[], warn=[];
  let prev=null; const v0=+o.ver===0||(!o.ver&&X.some(x=>x&&!x.cues&&(x.move||x.detail)));
  const secs=SI.map((si,i)=>{ const x=X[i]; if(!x){ miss.push(si.n); const sg=suggest(TT).secs[i]; prev=sg.pos; return sg }
    const nb=Math.max(1,Math.round(si.beats*2)/2); let f=FM[x.formation]?x.formation:"free", pos=posObj(x.positions); /* 有寫位置就照位置(預設隊形也可以微調) */ if(!pos){ if(f==="free") f="line"; pos=place(f,orderFor(x.focus||null,prev)) }
    let cues=[];
    if(v0){ const mv=mvCode(x.move)||"groove"; cues=[{b:0,len:nb,mv,who:"all",focus:IDS.includes(x.focus)?x.focus:null}];
      (Array.isArray(x.detail)?x.detail:[]).forEach(d=>{ const b=(+d.at||0)/bs; if(b>0&&b<nb) cues.push({b:Math.round(b*2)/2,len:Math.max(.5,Math.round((+d.dur||2)/bs*2)/2),mv,who:whoIds(d.who).length===5?"all":whoIds(d.who),focus:null,desc:String(d.desc||"").slice(0,60)}) }) }
    else (Array.isArray(x.cues)?x.cues:[]).forEach(c=>{ const mv=mvCode(c.move); if(!mv){ warn.push(`${si.n}:看不懂的動作「${c.move}」`); return } const who=whoIds(c.who);
      if(!who.length) return; const fc=c.face!=null&&c.face!==""?faceCode(c.face):"front"; if(!fc) warn.push(`${si.n}:看不懂的朝向「${c.face}」(當成正面)`);
      cues.push({b:Math.round(cnt(c.count)*2)/2,len:Math.max(.5,Math.round((+c.beats||8)*2)/2),mv,who:who.length===5?"all":who,focus:IDS.includes(c.focus)?c.focus:null,desc:String(c.desc||"").slice(0,120),...(c.easy||c.simple?{easy:true}:{}),...(fc&&fc!=="front"?{face:fc}:{})}) });
    cues=cues.filter(c=>c.b<nb).sort((a,b)=>a.b-b.b); if(!cues.length) cues=[{b:0,len:nb,mv:"groove",who:"all",focus:null}];
    if(cues.some(c=>c.b+c.len>nb+.01)) warn.push(`${si.n}:有片段超過這段的長度(${Math.round(nb)} 拍)`);
    const forms=(Array.isArray(x.forms)?x.forms:[]).map(k=>{ let kf=FM[k.formation]?k.formation:"free", kp2=posObj(k.positions); if(!kp2){ if(kf==="free") return null; kp2=place(kf,orderFor(x.focus||null,pos)) }
      return {b:Math.round(cnt(k.count)*2)/2,walk:Math.max(0,Math.round((+k.walk||0)*2)/2),f:kf,pos:kp2} }).filter(k=>k&&k.b<=nb).sort((a,b)=>a.b-b.b);
    const tally={}; cues.forEach((c,z)=>{ const end=cues.slice(z+1).find(d=>d.b>c.b)?.b??nb; tally[c.mv]=(tally[c.mv]||0)+(end-c.b)*whoIds(c.who).length });
    const mv=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0][0], focus=IDS.includes(x.focus)?x.focus:(cues.find(c=>c.focus)?.focus||null);
    prev=forms.length?forms.at(-1).pos:pos;
    return {n:si.n,f,pos,mv,focus,cues,forms,note:String(x.note||"").slice(0,120),tr:String(x.transition||"").slice(0,80)} });
  let kp=null; const K=o.keyPoint; if(K&&K.name){ let ks=SI.findIndex(x=>x.n===K.section); if(ks<0) ks=SI.findIndex(x=>x.chorus);
    kp={name:String(K.name).slice(0,16),nameKo:String(K.nameKo||"").slice(0,24),nameEn:String(K.nameEn||"").slice(0,24),sec:Math.max(0,ks),line:+K.line||1,
      b:K.count!=null?Math.round(cnt(K.count)*2)/2:(K.from!=null?Math.round(+K.from/bs*2)/2:0),len:+K.beats||(K.to!=null&&K.from!=null?Math.round((K.to-K.from)/bs):4),
      lead:K.lead==="all"||IDS.includes(K.lead)?K.lead:null,also:(Array.isArray(K.also)?K.also:[]).map(a=>({line:+a.line||0,b:Math.round(cnt(a.count)*2)/2})).filter(a=>a.b>0).slice(0,3),steps:(Array.isArray(K.steps)?K.steps:Array.isArray(K.beats)?K.beats:[]).map(x=>String(x).slice(0,100)).slice(0,8),
      why:String(K.why||"").slice(0,120),final:K.final&&typeof K.final==="object"?{sec:SI.findIndex(x=>x.n===K.final.section),lead:K.final.lead||null,change:String(K.final.change||"").slice(0,120)}:(K.finalVariation?{change:String(K.finalVariation).slice(0,120)}:null)} }
  const hl=(Array.isArray(o.highlights)?o.highlights:[]).map(h=>({sec:SI.findIndex(x=>x.n===h.section),b:Math.round(cnt(h.count)*2)/2,len:+h.beats||8,who:whoIds(h.who),desc:String(h.desc||"").slice(0,200)})).filter(h=>h.sec>=0).slice(0,3);
  const D={v:2,secs,kp,hl,concept:String(o.concept||"").slice(0,300),hook:{name:kp?.name||""},prof:{...(T.dance?.prof||Object.fromEntries(IDS.map(i=>[i,0])))},at:Date.now(),src:{ver:v0?0:1,at:Date.now()}};
  return {D,sync,bpm,miss,warn,needs:Array.isArray(o.needs)?o.needs.slice(0,6):[]} }
/* 現在的編舞 → ver 1(匯出編舞單時帶給編舞室對話) */
function toJSON(T){ const D=getD(T), SI=secInfo(T); if(!D) return null; const pz=p=>Object.fromEntries(IDS.map(id=>[id,p[id]]));
  return {app:"kpop-choreo",ver:1,code:T.id,title:T.name||"",bpm:bpmOf(T)||null,
    sync:T.sync?{downbeat:T.sync.downbeat,...(T.sync.end?{end:T.sync.end}:{}),sections:SI.map((si,i)=>T.sync.bars[i]!=null?{name:si.n,bar:T.sync.bars[i]}:null).filter(Boolean)}:null,
    concept:D.concept||"",keyPoint:D.kp?{...D.kp,section:SI[D.kp.sec]?.n,count:cntTxt(D.kp.b),beats:D.kp.len,also:(D.kp.also||[]).map(a=>({line:a.line,count:cntTxt(a.b)})),final:D.kp.final?{...D.kp.final,section:SI[D.kp.final.sec]?.n||null}:null}:null,
    highlights:(D.hl||[]).map(h=>({section:SI[h.sec]?.n,count:cntTxt(h.b),beats:h.len,who:h.who,desc:h.desc})),
    sections:D.secs.map((s,i)=>({name:SI[i].n,formation:s.f,positions:pz(s.pos),focus:s.focus||null,
      cues:cuesOf(s,SI[i].beats).map(c=>({count:cntTxt(c.b),beats:c.len,move:c.mv,who:c.who,focus:c.focus??null,desc:c.desc||"",...(c.easy?{easy:true}:{}),...(c.face?{face:c.face}:{})})),
      forms:formsOf(s).map(k=>({count:cntTxt(k.b),walk:k.walk,formation:k.f,positions:pz(k.pos)})),transition:s.tr||"",note:s.note||""})),needs:[]} }
function exportChoreo(T){ const A=API(), sh=A.sheetOf(T), SI=secInfo(T), bs=beatSec(T);
  const o={app:"kpop-choreo-sheet",ver:1,game:"完美女團",exportedAt:new Date().toISOString(),code:T.id,title:T.name||"",isTitle:A.R.title===T.id,genres:sh.genres,mood:T.mood,
    bpm:bpmOf(T)||null,lengthSec:Math.round(SI.reduce((x,s)=>x+s.dur,0)),
    note:"給編舞室對話:sections 是段落(名稱與順序不能改)、每段秒數與拍數、逐句分配;current 是練習室目前的編舞(ver 1 格式);members 的 dance、expr 是現在的舞蹈實力與表現力;prof 是熟練度。回傳 ver 1 的完整編舞 JSON,在 4F 練習室「匯入編舞」貼上。",
    sections:SI.map((si,i)=>({name:si.n,chorus:si.chorus,sec:+si.dur.toFixed(2),beats:bpmOf(T)?+si.beats.toFixed(1):null,bar:T.sync?.bars?.[i]??null,instSec:sh.sections[i]?.instSec,center:sh.sections[i]?.center||null,
      lines:sh.sections[i]?.lines.map((l,li)=>({who:l.who,type:l.type,sec:l.sec,killing:l.killing,zh:l.zh,...(T.sync?.lines?.[i]?.[li]!=null?{count:cntTxt(T.sync.lines[i][li])}:{})}))||[]})),
    members:sh.members.map(m=>({id:m.id,name:m.name,dance:m.dance,expr:m.expr})),current:T.dance?toJSON(T):null,prof:T.dance?.prof||null,
    evaluation:(()=>{ const e=evalDance(T); return e.has?{score:Math.round(e.score),fit:Math.round(e.fit),concept:Math.round(e.concept),hook:Math.round(e.hook),form:Math.round(e.form),fair:Math.round(e.fair),exec:Math.round(e.exec),notes:e.notes.map(n=>n[1])}:null })()};
  const txt=JSON.stringify(o,null,1), d=new Date(), pad=n=>String(n).padStart(2,"0"), name=`完美女團_編舞單_${(T.name||"未命名").replace(/[\\/:*?"<>|]/g,"")}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.json`;
  if(typeof isNative!=="undefined"&&isNative){ copyText(txt).then(ok=>toast2(ok?"已複製這首的編舞單,可以直接貼到編舞室對話":"複製失敗")); return }
  const u=URL.createObjectURL(new Blob([txt],{type:"application/json"})), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
  toast2(`已匯出編舞單(${name})`) }
/* 匯入:貼上 → 試算(樣張 3)→ 確認才換,換之前留一份 */
function importChoreoUI(T,rerender){ const box=document.createElement("div"); box.className="sfmodal";
  box.innerHTML=`<div class="sfm-card"><h3>匯入編舞</h3><p>把編舞室對話回傳的完整編舞 JSON 貼在下面,也可以選檔案。會先試算給你看,確認才換。</p>
    <textarea id="chTxt" placeholder='{"app":"kpop-choreo","ver":1,"code":"…","sections":[…]}'></textarea>
    <div class="sfm-row"><label class="cbtn">選檔案<input type="file" id="chFile" accept=".json,application/json,text/plain" hidden></label><span class="sp"></span><button class="cbtn" id="chNo">取消</button><button class="cbtn pri" id="chGo">試算</button></div></div>`;
  $("#songFac").appendChild(box); const close=()=>box.remove();
  $("#chNo").onclick=close; $("#chFile").onchange=async e=>{ const f=e.target.files?.[0]; if(f) $("#chTxt").value=await f.text() };
  $("#chGo").onclick=()=>{ let o; try{ o=JSON.parse($("#chTxt").value.trim().replace(/^```(json)?|```$/g,"")) }catch(e){ toast2("看不懂這段內容:請貼編舞室對話給的 JSON"); return }
    if(!Array.isArray(o?.sections)){ toast2("這不是編舞 JSON(沒有 sections)"); return }
    const A=API(); let t=A.R.tracks.find(x=>x.id===o.code)||A.R.tracks.find(x=>o.title&&String(x.name||"").trim().toLowerCase()===String(o.title).trim().toLowerCase());
    if(!t){ if(!confirm(`找不到這首歌(code ${o.code||"無"}),要放進目前這首《${T.name||"未命名"}》嗎?`)) return; t=T }
    close(); trialUI(t,o,rerender) } }
function trialUI(T,o,rerender){ const r=fromJSON(T,o), e0=T.dance?evalDance(T):null;
  const t2={...T,dance:r.D,bpm:r.bpm||T.bpm,sync:r.sync||T.sync}; const e1=evalDance(t2);
  const changed=T.dance?r.D.secs.filter((s,i)=>{ const a=T.dance.secs[i]; return !a||JSON.stringify([a.mv,a.f,a.cues||null,a.forms||null])!==JSON.stringify([s.mv,s.f,s.cues,s.forms]) }).length:r.D.secs.length;
  const frac=changed/Math.max(1,r.D.secs.length), p0=e0?e0.avgProf:0, p1=Math.floor(p0*(1-.6*frac));
  const nCue=r.D.secs.reduce((x,s)=>x+s.cues.length,0), nForm=r.D.secs.reduce((x,s)=>x+s.forms.length,0), nm=i=>byId(i)?.n||i;
  const bars=[["歌舞契合","fit"],["概念一致","concept"],["記憶點","hook"],["隊形變化","form"],["亮點公平","fair"],["難度與實力","exec"]].map(([n,k])=>{ const a=e0?Math.round(e0[k]):0, b=Math.round(e1[k]);
    return `<div class="c2bar${e0&&b<a-2?" dn":""}"><span>${n}</span><span class="t"><i style="width:${b}%"></i>${e0?`<u style="left:${a}%"></u>`:""}</span><span class="n">${e0?`<s>${a}</s> → `:""}<b>${b}</b></span></div>` }).join("");
  const L=[`<li>${changed} 段換新:<b>動作片段 ${nCue} 個</b>、換隊形 ${nForm} 次</li>`];
  if(r.D.kp) L.push(`<li>KEY POINT <b>「${esc(r.D.kp.name)}」</b>:${esc(T.secs[r.D.kp.sec]?.n||"")}第 ${r.D.kp.line} 句,${r.D.kp.lead==="all"?"全員":nm(r.D.kp.lead)}領舞</li>`);
  if(r.D.hl.length) L.push(`<li>小亮點:${r.D.hl.map(h=>`${esc(T.secs[h.sec]?.n||"")} ${cntTxt(h.b)}(${h.who.length===5?"全員":h.who.map(nm).join("、")})`).join("、")}</li>`);
  if(r.bpm||r.sync) L.push(`<li>${r.bpm?`BPM ${r.bpm}`:""}${r.sync?`${r.bpm?"、":""}對拍 ${Object.keys(r.sync.bars).length} 段(段落長度照 mp3)`:""}</li>`);
  if(e0&&p0>=1) L.push(`<li class="w">熟練度:改到的部分要重練,平均 <b>${Math.round(p0)}% → ${p1}%</b></li>`);
  e1.notes.filter(n=>n[0]==="b").slice(0,2).forEach(n=>L.push(`<li class="b">${esc(n[1])}</li>`));
  e1.walks.slice(0,2).forEach(w=>L.push(`<li class="w">${esc(w.n)} ${cntTxt(w.b)}:${nm(w.id)}走位來不及(約 ${Math.round(w.d)} 公尺)</li>`));
  r.miss.length&&L.push(`<li class="w">對不上的段落(用建議版補):${r.miss.map(esc).join("、")}</li>`);
  r.warn.slice(0,2).forEach(w=>L.push(`<li class="w">${esc(w)}</li>`));
  const box=document.createElement("div"); box.className="c2 c2dim"; box.id="chTrial";
  box.innerHTML=`<div class="c2sheet" style="width:min(94%,680px)"><div class="c2sh"><span class="eb">匯入編舞・先試算</span><span class="c2src">《${esc(T.name||"未命名")}》・編舞室對話・格式 ver ${r.D.src.ver}</span><span class="sp"></span></div>
    <div class="c2imp"><div><div class="c2big">${e0?`<span class="o">${Math.round(e0.score)}</span><span class="ar">→</span>`:""}<b>${Math.round(e1.score)}</b><small>編舞分</small></div>${bars}
      ${e0?`<p class="c2note" style="margin:4px 0 0">細線是現在、色條是匯入後。</p>`:""}</div>
    <div class="c2scroll"><p class="c2h5">${e0?"會換掉的":"這份編舞"}</p><ul class="c2list">${L.join("")}</ul></div></div>
    <div class="c2foot"><span class="c2note">${e0?"匯入前的編舞會留一份,練習室可以「還原匯入前」。":"之後可以在練習室慢慢調整。"}</span><button class="c2b" id="chCancel">取消</button><button class="c2b pri" id="chOk">確認匯入</button></div></div>`;
  $("#songFac").appendChild(box);
  $("#chCancel").onclick=()=>box.remove();
  $("#chOk").onclick=()=>{ if(T.dance) T.danceBak={dance:JSON.parse(JSON.stringify(T.dance)),bpm:T.bpm||null,sync:T.sync?JSON.parse(JSON.stringify(T.sync)):null,at:Date.now()};
    const prof=Object.fromEntries(IDS.map(i=>[i,Math.floor((+T.dance?.prof?.[i]||0)*(1-.6*frac))]));
    T.dance=r.D; T.dance.prof=prof; if(r.bpm) T.bpm=r.bpm; if(r.sync) T.sync={...r.sync,...(T.sync?.lines?{lines:T.sync.lines}:{})}; box.remove(); SEL=0; PICK=null; commit(T,false,rerender);
    toast2(`已匯入編舞:${Math.round(e1.score)} 分${r.needs.length?`;編舞室對話提了 ${r.needs.length} 個需求,請轉給大腦`:""}`) } }
function restoreChoreo(T,rerender){ const B=T.danceBak; if(!B||!confirm("把這首的編舞還原成匯入前的樣子?")) return; T.dance=B.dance; T.bpm=B.bpm||undefined; T.sync=B.sync||undefined; delete T.danceBak; SEL=0; commit(T,false,rerender); toast2("已還原匯入前的編舞") }
window.choreoTapState=()=>TAP; window.choreoImportJSON=(T,o)=>fromJSON(T,o); window.choreoToJSON=T=>toJSON(T);   // 測試與之後的排舞模式用
/* ---------- 熟練度:練習(花行動)、待在練習室自己練、打歌後進步 ---------- */
const titleT=()=>{ const R=API()?.R; return R?R.tracks.find(t=>t.id===R.title):null };
function gain(D,id,base){ const g=Math.max(1,Math.round(base*(1-D.prof[id]/110))); D.prof[id]=Math.min(100,D.prof[id]+g); return g }
window.choreoOnSlotEnd=ids=>{ const T=titleT(), D=getD(T); if(!D||!ids?.length) return; ids.forEach(id=>gain(D,id,3)); API().save() };
window.choreoKPHeat=n=>{ const T=titleT(), D=getD(T); if(!D||!n) return; D.heat=(+D.heat||0)+n; API().save() };   /* KEY POINT 的短影音挑戰熱度(打歌後累積) */
window.choreoReview=id=>{ const T=titleT(), D=getD(T); if(!D) return 0; const g=gain(D,id,2); API().save(); return g };   /* 1.1 第 3 輪:陪她看練習影片 */
window.choreoAfterShow=ids=>{ const T=titleT(), D=getD(T); if(!D||!ids?.length) return; ids.forEach(id=>gain(D,id,2)); API().save() };
function practice(T){ const D=getD(T), e=evalDance(T); S.lastPrac=S.day; let tot=0;   // 改版 1.0:全員練一次花 1 小時(以前花 1 次行動)
  for(const id of IDS){ const st=S.m[id]; tot+=gain(D,id,14*(.6+byId(id).dance/200)*(1.25-e.diff*.07)*(st.stress>75?.6:1));
    st.stress=cl(st.stress+5,0,100); window.growthGrow?.(id,"dance",.15) }
  D.at=Date.now(); API().save(); save(true); if(typeof renderHud==="function") renderHud();
  window.spendTime?.(60,"練舞"); toast2(`練習完成:平均熟練度 +${Math.round(tot/5)}%・花了 1 小時`) }

/* ---------- 畫面 ---------- */
let SEL=0, PICK=null, PREV=null;
function render(body,rerender){ const A=API(), R=A.R, T=A.cur(), M=A.M;
  const tapes=`<div class="cr-tapes">${R.tracks.map((x,i)=>`<button class="cr-tape${x.id===T.id?" on":""}" data-tk="${x.id}">${String(i+1).padStart(2,"0")} ${esc(x.name||"未命名")}${x.id===R.title?"・主打":""}</button>`).join("")}<span class="cr-info">${esc(A.GENRES[T.g?.[0]]?.n||"")}・${esc(T.mood||"")}</span><label class="cr-bpm">BPM<input id="dBpm" type="number" inputmode="decimal" min="50" max="240" step="0.01" value="${bpmOf(T)||""}" placeholder="—"></label><button class="cr-tape" data-goroom="recording">← 錄音室</button></div>
  <div class="cr-io">${T.dance?.kp?`<button class="cr-tape kpb" id="dKP">✦ ${esc(T.dance.kp.name||"KEY POINT")}</button>`:""}<button class="cr-tape" id="dExp">匯出編舞單</button><button class="cr-tape" id="dImp">匯入編舞</button>${T.danceBak?`<button class="cr-tape" id="dUndo">還原匯入前</button>`:""}${window.songHasAudio?.(T)?`<button class="cr-tape" id="dTap">逐句對拍</button>`:""}${T.sync?`<span class="cr-sync">已對拍 ${Object.keys(T.sync.bars||{}).length} 段${T.sync.lines?`・${Object.values(T.sync.lines).reduce((x,a)=>x+a.filter(v=>v!=null).length,0)} 句`:""}</span>`:""}</div>`;
  const bindTapes=()=>{ body.querySelectorAll("[data-tk]").forEach(b=>b.onclick=()=>{ stopPrev(); R.cur=b.dataset.tk; SEL=0; PICK=null; A.save(false); rerender() });
    body.querySelectorAll("[data-goroom]").forEach(b=>b.onclick=()=>{ stopPrev(); A.open(b.dataset.goroom) });
    $("#dKP")&&($("#dKP").onclick=()=>{ stopPrev(); kpCard(T,rerender) }); $("#dTap")&&($("#dTap").onclick=()=>{ stopPrev(); tapOpen(T,rerender) }); $("#dExp").onclick=()=>exportChoreo(T); $("#dImp").onclick=()=>{ stopPrev(); importChoreoUI(T,rerender) }; $("#dUndo")&&($("#dUndo").onclick=()=>restoreChoreo(T,rerender));
    $("#dBpm").onchange=ev=>{ const v=+ev.target.value; if(v&&(v<50||v>240)){ toast2("BPM 要在 50~240 之間"); ev.target.value=bpmOf(T)||""; return } T.bpm=v?Math.round(v*100)/100:undefined; A.save(); rerender() } };
  if(!T.dance){ body.innerHTML=`${tapes}<div class="cr-card cr-start"><h4>《${esc(T.name||"未命名")}》還沒有編舞</h4>
      <p>依錄音室的段落,一段一段決定隊形、動作和焦點成員。主打的編舞會影響打歌舞台、短影音挑戰和音源反應;還沒編之前,用公司的預設編舞(普通)。</p>
      <div class="cr-btns"><button class="pbtn pri" id="dNewSug">用建議版開始</button><button class="pbtn" id="dNewBlank">從空白開始</button></div></div>`;
    bindTapes(); $("#dNewSug").onclick=()=>{ T.dance=suggest(T); commit(T,false,rerender) }; $("#dNewBlank").onclick=()=>{ T.dance=blank(T); commit(T,false,rerender) }; return }
  const D=getD(T), SI=secInfo(T), e=evalDance(T); SEL=cl(SEL,0,SI.length-1); const s=D.secs[SEL], si=SI[SEL], E=expectE(si,T);
  const isT=R.title===T.id, bar=([n,v])=>`<div class="cr-bar"><span>${n}</span><span class="t"><i style="width:${cl(v,0,100)}%"></i></span><span class="num">${Math.round(v)}</span></div>`;
  body.innerHTML=`${tapes}
  <div class="cr-ribbon">${SI.map((x,i)=>`<button class="cr-sec${i===SEL?" on":""}" data-si="${i}" style="flex-grow:${Math.max(1,Math.round(x.dur))};--c:${D.secs[i].focus?byId(D.secs[i].focus).c:"#B9AD9C"}" title="${esc(x.n)}">${esc(x.n)}</button>`).join("")}</div>
  <div class="cr-grid">
    <div class="cr-card cr-main"><h4>${esc(si.n)}<small>${Math.round(si.dur)} 秒${bpmOf(T)?`・${Math.round(si.beats)} 拍`:""}・期待強度 ${E.toFixed(1)}</small></h4>
      ${(s.cues?.length>1||s.forms?.length)?`<div class="cr-cues">${cuesOf(s,si.beats).map(c=>`<span class="cr-cue${D.kp&&(D.kp.sec===SEL||SI[SEL].chorus)&&Math.abs(c.b-D.kp.b)<.01?" kp":""}"><i>${cntTxt(c.b)}</i>${esc(MV[c.mv].n)}${c.who==="all"?"":`・${whoIds(c.who).map(id=>byId(id).n).join("")}`}</span>`).join("")}${formsOf(s).map(k=>`<span class="cr-cue fm"><i>${cntTxt(k.b)}</i>◆${k.f==="free"?"自訂":FM[k.f]?.n||""}</span>`).join("")}</div>`:""}
      <div class="cr-stagebox"><div class="cr-stage" id="dStage"><span class="cr-back">舞台後方</span><span class="cr-front">觀眾</span><span class="cr-mvlab" id="dMvLab">${esc(MV[s.mv]?.n||"")}</span>
        ${IDS.map(id=>{ const p=s.pos[id]||[.5,.5], m=byId(id); return `<button class="cr-dot${PICK===id?" sel":""}${s.focus===id?" foc":""}" data-dot="${id}" style="--c:${m.c};left:${6+p[0]*88}%;top:${10+(1-p[1])*80}%" aria-label="${m.n}">${m.n[0]}</button>` }).join("")}</div></div>
      <div class="cr-ctrl"><div class="cr-chips">${FORMS.map(f=>`<button class="cr-chip${s.f===f.id?" on":""}" data-form="${f.id}">${f.n}</button>`).join("")}${s.f==="free"?`<span class="cr-chip on">自訂</span>`:""}</div>
      <p class="cr-hint">${PICK?`已選${byId(PICK).n}:再點另一個人互換位置`:"點兩個人互換位置,或直接拖曳到想要的地方。選預設隊形時,焦點成員會站最顯眼的位置。"}</p>
      <div class="cr-btns"><button class="pbtn pri" id="dEdit">排舞模式 ▸</button><button class="pbtn" id="dPlay">舞台預覽</button><button class="pbtn" id="dPrev">${PREV?"■ 停止":"▶ 隊形預覽"}</button>${SEL>0?`<button class="pbtn" id="dCopy">沿用上一段隊形</button>`:""}<button class="pbtn" id="dSug">整首換成建議版</button></div></div></div>
    <div class="cr-card"><h5>動作</h5><div class="cr-moves">${CATS.map(c=>`<div class="cr-cat"><small>${c}</small>${MOVES.filter(m=>m.cat===c).map(m=>`<button class="cr-mv${s.mv===m.id?" on":""}${m.md.includes(T.mood)?" fit":""}" data-mv="${m.id}"><b>${m.n}</b><i>強${m.e}・難${m.d}${m.hook?"・記憶點":""}</i></button>`).join("")}</div>`).join("")}</div>
      <h5>焦點成員<small>這段鏡頭給誰</small></h5><div class="cr-focs">${IDS.map(id=>{ const m=byId(id); return `<button class="cr-foc${s.focus===id?" on":""}" data-foc="${id}" style="--c:${m.c}">${m.n}</button>` }).join("")}</div>
      <h5>記憶點舞步<small>副歌動作:${esc(e.hookMove||"—")}</small></h5><input class="cr-hook" id="dHook" maxlength="16" placeholder="替副歌的招牌動作取名,例:數到十手勢" value="${esc(D.hook.name||"")}"></div>
    <div class="cr-card"><div class="cr-big"><b>${Math.round(e.score)}</b><span>編舞分${isT?"・會影響打歌與音源反應":"(收錄曲)"}</span></div>
      ${[["歌舞契合",e.fit],["概念一致",e.concept],["記憶點",e.hook],["隊形變化",e.form],["亮點公平",e.fair],["難度與實力",e.exec]].map(bar).join("")}
      <ul class="cr-notes">${(e.notes.length?e.notes:[["g","沒有明顯的問題。"]]).slice(0,5).map(([k,t])=>`<li class="${k}">${t}</li>`).join("")}</ul>
      <h5>熟練度<small>平均 ${Math.round(e.avgProf)}%</small></h5>
      ${IDS.map(id=>{ const m=byId(id); return `<div class="cr-prof"><span style="color:${m.c}">${m.n}</span><span class="cr-pb"><i style="width:${D.prof[id]}%;background:${m.c}"></i></span><span class="num">${D.prof[id]}%</span></div>` }).join("")}
      <div class="cr-btns"><button class="pbtn pri" id="dPrac">全員練習這首(花 1 小時)</button></div>
      <p class="cr-hint">練一次花 1 小時(關掉練習室之後時間才往前走)。練習會增加壓力;${isT?"待在練習室的成員每個時段也會自己練一點。熟練度不夠,打歌容易跳錯。":"打歌用的是主打的熟練度。"}改動作或隊形,熟練度會掉一點。</p></div>
  </div>`;
  bindTapes();
  body.querySelectorAll("[data-si]").forEach(b=>b.onclick=()=>{ stopPrev(); SEL=+b.dataset.si; PICK=null; rerender() });
  body.querySelectorAll("[data-form]").forEach(b=>b.onclick=()=>{ s.f=b.dataset.form; s.pos=place(s.f,orderFor(s.focus,s.pos)); PICK=null; commit(T,true,rerender) });
  body.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{ if(s.mv===b.dataset.mv&&!(s.cues?.length>1)) return;
    if(s.cues?.length>1&&!confirm(`這段有 ${s.cues.length} 個動作片段,要整段換成「${MV[b.dataset.mv].n}」嗎?`)) return;
    s.mv=b.dataset.mv; if(s.cues?.length) s.cues=[{b:0,len:Math.max(.5,si.beats),mv:s.mv,who:"all",focus:s.focus}]; commit(T,true,rerender) });
  body.querySelectorAll("[data-foc]").forEach(b=>b.onclick=()=>{ s.focus=s.focus===b.dataset.foc?null:b.dataset.foc; commit(T,false,rerender) });
  $("#dHook").onchange=ev=>{ D.hook={name:ev.target.value.trim()}; if(D.kp) D.kp.name=D.hook.name; commit(T,false,rerender) };
  $("#dPrac").onclick=()=>{ practice(T); rerender() };
  $("#dEdit").onclick=()=>edOpen(T,SEL,rerender); $("#dPrev").onclick=()=>preview(T,rerender); $("#dPlay").onclick=()=>{ stopPrev(); window.openStagePlay?.(T) };
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
/* ---------- 排舞模式(2.0 第 1 包後半,2026-11-01;樣張 1):一段一段排動作片段與換隊形,以拍為單位 ---------- */
let ED=null;
const EDH=[200,30,265,330,20,240,90,0,300,170,45];   // 動作片段的色相(依動作類別)
const hueOf=mv=>EDH[CATS.indexOf(MV[mv]?.cat)]??30;
function edSec(){ const T=ED.T, SI=secInfo(T), si=SI[ED.si], s=getD(T).secs[ED.si], nb=Math.max(1,Math.ceil(si.beats*2)/2); return {T,SI,si,s,nb,D:getD(T)} }
function edMat(s,nb){ if(!Array.isArray(s.cues)||!s.cues.length) s.cues=cuesOf(s,nb).map(c=>({...c,focus:c.focus??null})); if(!Array.isArray(s.forms)) s.forms=[] }
function edPush(){ const {s}=edSec(); ED.undo.push({si:ED.si,s:JSON.stringify(s),kp:JSON.stringify(getD(ED.T).kp||null)}); if(ED.undo.length>30) ED.undo.shift() }
function edDone(after){ const {s,nb,D}=edSec(); s.cues.sort((a,b)=>a.b-b.b); s.forms.sort((a,b)=>a.b-b.b); after?.(s);
  const tally={}; s.cues.forEach((c,z)=>{ const end=Math.min(nb,s.cues.slice(z+1).find(d=>d.b>c.b)?.b??nb); tally[c.mv]=(tally[c.mv]||0)+Math.max(.5,end-c.b)*whoIds(c.who).length });
  s.mv=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0]?.[0]||s.mv; D.at=Date.now(); ED.dirty=true;
  const e=evalDance(ED.T); ED.T.choreo=cl(Math.round(e.energy),1,5); API().save(); edRender() }
function edClose(){ edStop(); if(!ED) return; const T=ED.T, D=getD(T); if(ED.dirty&&D) IDS.forEach(i=>{ D.prof[i]=Math.floor(D.prof[i]*.97) });
  if(ED.dirty) API().save(); ED.el.remove(); const rr=ED.rr; SEL=ED.si; ED=null; rr?.() }
function edOpen(T,si,rerender){ stopPrev(); if(ED) edClose(); const el=document.createElement("div"); el.className="c2 c2ed"; el.id="c2ed";
  $("#songFac").appendChild(el); ED={T,si,el,rr:rerender,sel:null,ph:0,snap:1,undo:[],dirty:false,pick:false}; edRender() }
window.choreoEditorOpen=(si)=>{ const T=API().cur(); if(!T?.dance) return; edOpen(T,si??SEL,()=>API().render()) };
/* 這段裡每一句歌詞的位置(拍):照錄音室的秒數,有對拍時依 mp3 的長度等比例縮放 */
function edLines(T,si){ const L=window.songTimeline(T), sec=L.secs[si.i], bs=beatSec(T);
  return L.ev.filter(e=>e.si===si.i).map(e=>({b:(e.t0-sec.t0)/bs,len:(e.t1-e.t0)/bs,who:e.who,k:e.k})) }
function edRows(C){ const rows=[]; return C.map(c=>{ let r=rows.findIndex(e=>e<=c.b+1e-6); if(r<0){ r=rows.length; rows.push(0) } rows[r]=c.b+c.len; return Math.min(r,2) }) }
function edRender(){ if(!ED) return; const {T,SI,si,s,nb,D}=edSec(), e=evalDance(T), bs=beatSec(T), C=cuesOf(s,nb), F=formsOf(s), P=b=>cl(b/nb*100,0,100);
  const kp=e.kp, isKP=c=>!!kp&&(kp.sec===ED.si||si.chorus)&&kp.pos.some(b=>Math.abs(c.b-b)<.01);
  const pos=posAt(s,ED.ph), nk=F.find(k=>k.b>ED.ph+1e-6), {o:mvNow}=movesAt(C,ED.ph,s.mv), ws=walkIssues(T,D,SI).filter(w=>w.sec===ED.si);
  const lead=C.filter(c=>c.b<=ED.ph+1e-6).pop(), fNow=lead?.focus||s.focus;
  const {fc}=movesAt(C,ED.ph,s.mv);
  const dots=IDS.map(id=>{ const p=pos[id]||[.5,.5], m=byId(id), dg=faceDeg(fc[id],id,pos); return `<button class="c2dot${fNow===id?" foc":""}" data-ed-dot="${id}" style="--c:${m.c};left:${(6+p[0]*88).toFixed(2)}%;top:${(10+(1-p[1])*80).toFixed(2)}%" aria-label="${m.n}">${m.n[0]}<i class="c2fd${dg?"":" z"}${fc[id]==="look"?" lk":""}" style="transform:rotate(${-dg}deg)"></i></button>` }).join("");
  const ghost=nk?IDS.map(id=>{ const p=nk.pos[id], m=byId(id); return `<span class="c2ghost" style="--c:${m.c};left:${(6+p[0]*88).toFixed(2)}%;top:${(10+(1-p[1])*80).toFixed(2)}%">${m.n[0]}</span>` }).join(""):"";
  const lines=nk?IDS.map(id=>{ const a=pos[id], z=nk.pos[id]; return `<line x1="${6+a[0]*88}" y1="${10+(1-a[1])*80}" x2="${6+z[0]*88}" y2="${10+(1-z[1])*80}" stroke="${byId(id).c}" stroke-width="1.6" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" opacity=".85"/>` }).join(""):"";
  const stage=`<div class="c2stage" id="edStage"><span class="lab b">舞台後方</span><span class="lab f">觀眾</span>
    <span class="now">${cntTxt(ED.ph)} ${isKP(lead||{})?"<i>✦</i> ":""}${esc(MV[mvNow[fNow||"ys"]]?.n||"")}</span>${nk?`<span class="nxt">${cntTxt(nk.b)} → ${nk.f==="free"?"自訂":FM[nk.f]?.n}(虛線)</span>`:""}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${ghost}${dots}</div>`;
  /* 右邊:選到的東西 */
  let insp;
  const stepper=(lab,val,key)=>`<span class="c2stp"><b>${lab}</b><button data-ed-step="${key}" data-d="-1" aria-label="${lab}減">−</button><em>${val}</em><button data-ed-step="${key}" data-d="1" aria-label="${lab}加">+</button></span>`;
  if(ED.sel?.t==="cue"&&C[ED.sel.i]){ const c=C[ED.sel.i], m=MV[c.mv], who=whoIds(c.who);
    if(ED.pick) insp=`<div class="c2insp"><div class="c2ih"><b>換動作</b><small>${esc(T.mood||"")}的歌:金框比較合</small><button class="c2x" data-ed="pickx">返回</button></div>
      <div class="c2mvs">${CATS.map(ct=>`<div class="c2mvc"><small>${ct}</small>${MOVES.filter(x=>x.cat===ct).map(x=>`<button class="c2mvb${x.id===c.mv?" on":""}${x.md.includes(T.mood)?" fit":""}" data-ed-mv="${x.id}"><b>${x.n}</b><i>強${x.e} 難${x.d}${x.hook?" ★":""}</i></button>`).join("")}</div>`).join("")}</div></div>`;
    else insp=`<div class="c2insp"><div class="c2ih"><b>片段 ${ED.sel.i+1}/${C.length}</b><small>${cntTxt(c.b)}・${c.len} 拍・${(c.len*bs).toFixed(1)} 秒</small><button class="c2kp${isKP(c)?"":" off"}" data-ed="kp">✦ KEY POINT</button></div>
      <div class="c2r"><label>動作</label><button class="c2sel" data-ed="pick"><b>${esc(m.n)}</b><i>強 ${m.e}・難 ${m.d}${m.hook?"・記憶點":""}</i><span class="ar">換 ▸</span></button></div>
      <div class="c2r"><label>拍子</label><div class="c2steps">${stepper("開始",cntTxt(c.b),"cb")}${stepper("長度",c.len+" 拍","cl")}</div></div>
      <div class="c2r"><label>誰跳</label><div class="c2who">${IDS.map(id=>`<button class="c2m${who.includes(id)?"":" off"}${c.focus===id?" st":""}" data-ed-who="${id}" style="--c:${byId(id).c}" aria-label="${byId(id).n}">${byId(id).n[0]}</button>`).join("")}<button class="c2fb" data-ed="foc">焦點:${c.focus?byId(c.focus).n:"無"} ▸</button></div></div>
      <div class="c2acts"><button data-ed="split">拆成兩段</button><button data-ed="copych"${si.chorus?"":" disabled"}>套用到副歌</button><button data-ed="easy" class="${c.easy?"on":""}">${c.easy?"✓ 簡化":"簡化版"}</button><button data-ed="face" class="fc${c.face?" on":""}${ED.facePick?" open":""}" aria-expanded="${!!ED.facePick}">${c.face?FACES.find(f=>f[0]===c.face)?.[1]:"朝向"} ▾</button><button class="del" data-ed="del">刪除</button></div>
      ${ED.facePick?`<div class="c2fpop" role="group" aria-label="朝向(左右照觀眾看過去)"><small>朝向・左右照觀眾看過去</small><div class="c2fcs">${FACES.map(([k,n])=>`<button class="c2fc${(c.face||"front")===k?" on":""}" data-ed-face="${k}"${(c.face||"front")===k?' aria-pressed="true"':""}>${n}</button>`).join("")}</div></div>`:""}</div>` }
  else if(ED.sel?.t==="form"&&F[ED.sel.i]){ const k=F[ED.sel.i], w=ws.find(x=>Math.abs(x.b-k.b)<.01);
    insp=`<div class="c2insp"><div class="c2ih"><b>換隊形 ${ED.sel.i+1}/${F.length}</b><small>${cntTxt(k.b)} 站好・走位 ${k.walk} 拍</small></div>
      <div class="c2r"><label>隊形</label><select class="c2sel" id="edForm">${FORMS.map(f=>`<option value="${f.id}"${k.f===f.id?" selected":""}>${f.n}</option>`).join("")}<option value="free"${k.f==="free"?" selected":""}>自訂(拖曳)</option></select></div>
      <div class="c2r"><label>拍子</label><div class="c2steps">${stepper("站好",cntTxt(k.b),"fb")}${stepper("走位",k.walk+" 拍","fw")}</div></div>
      <p class="c2tip${w?" bad":""}">${w?`${byId(w.id).n}要走約 ${Math.round(w.d)} 公尺,來不及:走位拍數加多一點,或站近一點。`:"在左邊拖曳成員,調整這個隊形。"}</p>
      <div class="c2acts"><button class="del" data-ed="delf">刪除這次換隊形</button></div></div>` }
  else insp=`<div class="c2insp"><div class="c2ih"><b>${esc(si.n)}</b><small>${Math.round(nb)} 拍・期待強度 ${expectE(si,T).toFixed(1)}</small></div>
      <p class="c2tip">點下面時間軸的動作片段或 ◆ 來編輯;點時間軸的空白處移動紅線,再按「+ 動作」「+ 隊形」加在紅線的位置。左邊的成員可以直接拖曳。</p>
      <ul class="c2nts">${e.notes.filter(n=>n[1].includes(si.n)||n[0]==="b").slice(0,2).map(n=>`<li class="${n[0]}">${esc(n[1])}</li>`).join("")||`<li class="g">這段沒有明顯的問題。</li>`}</ul></div>`;
  /* 時間軸 */
  const tk=Array.from({length:Math.floor(nb)},(_,b)=>`<span class="tk${b%4===0?" h":""}" style="left:${P(b)}%"></span>`).join("")+Array.from({length:Math.ceil(nb/8)},(_,k)=>`<span class="ec" style="left:${P(k*8)}%">${k+1}<small>八拍</small></span>`).join("");
  const rows=edRows(C), nr=Math.max(...rows,0)+1;
  const laneH=nr===1?30:nr===2?38:46;
  const cz=C.map((c,z)=>{ const w=whoIds(c.who), f=c.focus||(w.length===1?w[0]:null);
    return `<button class="c2cue${isKP(c)?" kp":""}${ED.sel?.t==="cue"&&ED.sel.i===z?" sel":""}${c.len<3?" nar":""}" data-ed-cue="${z}" style="left:calc(${P(c.b)}% + 1px);width:calc(${P(Math.min(c.len,nb-c.b))}% - 2px);top:${rows[z]/nr*100}%;height:calc(${100/nr}% - 2px);--h:${hueOf(c.mv)};--fc:${f?byId(f).c:"transparent"}"><b>${isKP(c)&&c.len>=6?"✦ ":""}${esc(MV[c.mv].n)}${c.easy?"・簡":""}</b>${nr<2?`<i>${w.length===5?"全員":w.map(id=>byId(id).n).join("")}${c.easy?"・簡化版":""}</i>`:""}</button>` }).join("");
  const kz=F.map((k,z)=>{ const bad=ws.some(w=>Math.abs(w.b-k.b)<.01); return `${k.walk>0?`<span class="c2tr${bad?" bad":""}" style="left:${P(k.b-k.walk)}%;width:${P(k.walk)}%"></span>`:""}<button class="c2kf${ED.sel?.t==="form"&&ED.sel.i===z?" sel":""}${bad?" bad":""}" data-ed-form="${z}" style="left:${P(k.b)}%" aria-label="換隊形 ${cntTxt(k.b)}"></button><span class="c2kfl${P(k.b)>82?" r":""}" style="left:${P(k.b)}%">${k.f==="free"?"自訂":FM[k.f]?.n}</span>` }).join("");
  const lz=edLines(T,si).filter(l=>l.len>0).map(l=>`<span class="c2ly${l.k?" k":""}" style="left:calc(${P(l.b)}% + 1px);width:calc(${P(l.len)}% - 2px);--c:${l.who.length===1?byId(l.who[0]).c:"#B8955A"}">${l.who.length>=5?"全員":l.who.map(id=>byId(id).n).join("")}${l.k?" ★":""}</span>`).join("");
  const tl=`<div class="c2tl"><div class="c2th"><b>時間軸</b><span class="leg"><span><i style="background:#E3BF6E"></i>KEY POINT</span><span><i style="background:#3A2A1C"></i>換隊形</span><span><i style="background:repeating-linear-gradient(90deg,#C9A24B 0 3px,transparent 3px 5px)"></i>走位</span></span>
      <span class="sp"></span><button data-ed="snap" class="${ED.snap===1?"on":""}">對齊:${ED.snap===1?"拍":"半拍"}</button><button data-ed="addc">+ 動作</button><button data-ed="addf">+ 隊形</button></div>
    <div class="c2grid"><span class="ln"></span><div class="c2trk c2ruler" data-ed-trk>${tk}</div>
      <span class="ln">動作</span><div class="c2trk c2lane${nr>1?" multi":""}" data-ed-trk style="height:${laneH}px">${cz}<span class="c2ph" id="edPh" style="left:${P(ED.ph)}%"></span></div>
      <span class="ln">隊形</span><div class="c2trk c2flane" data-ed-trk>${kz}</div>
      <span class="ln">歌詞</span><div class="c2trk c2llane" data-ed-trk>${lz}</div></div></div>`;
  const top=`<div class="c2top"><button class="c2pill" data-ed="close">‹ 練習室</button><button class="c2nav" data-ed="prev" aria-label="上一段"${ED.si?"":" disabled"}>‹</button>
    <div class="c2ttl"><small>第 ${ED.si+1}/${SI.length} 段・${bpmOf(T)?`BPM ${bpmOf(T)}`:"還沒填 BPM"}・${Math.round(nb/8*10)/10} 個八拍</small><b>〈${esc(T.name||"未命名")}〉${esc(si.n)}<em>${API().fmt(SI.slice(0,ED.si).reduce((x,y)=>x+y.dur,0))}–${API().fmt(SI.slice(0,ED.si+1).reduce((x,y)=>x+y.dur,0))}</em></b></div>
    <button class="c2nav" data-ed="next" aria-label="下一段"${ED.si<SI.length-1?"":" disabled"}>›</button><span class="c2sp"></span>
    <button class="c2btn" data-ed="undo"${ED.undo.length?"":" disabled"} aria-label="復原">↶</button><button class="c2btn pri" data-ed="play">${ED.playing?"■ 停止":"▶ 播這段"}</button><button class="c2btn" data-ed="spv">舞台預覽</button>
    <div class="c2score"><b>${Math.round(e.score)}</b><small>編舞分</small></div></div>`;
  ED.el.innerHTML=`${top}<div class="c2mid">${stage}${insp}</div>${tl}`; edBind() }
function edBind(){ const el=ED.el, {T,SI,si,s,nb,D}=edSec(), C=cuesOf(s,nb), sn=()=>ED.snap, q=v=>Math.round(v/sn())*sn();
  const act={ close:edClose, prev:()=>{ edStop(); ED.si--; ED.sel=null; ED.ph=0; edRender() }, next:()=>{ edStop(); ED.si++; ED.sel=null; ED.ph=0; edRender() },
    undo:()=>{ const u=ED.undo.pop(); if(!u) return; ED.si=u.si; const d=getD(T); d.secs[u.si]=JSON.parse(u.s); d.kp=JSON.parse(u.kp); ED.sel=null; ED.pick=false; const S2=edSec().s; if(!S2.cues) S2.cues=cuesOf(S2,edSec().nb); if(!S2.forms) S2.forms=[]; edDone() },
    play:()=>ED.playing?edStop():edPlay(), spv:()=>{ edStop(); window.openStagePlay?.(T,{at:window.songTimeline(T).secs[ED.si].t0}) }, snap:()=>{ ED.snap=ED.snap===1?.5:1; edRender() },
    pick:()=>{ ED.pick=true; edRender() }, pickx:()=>{ ED.pick=false; edRender() },
    addc:()=>{ edPush(); edMat(s,nb); const b=cl(q(ED.ph),0,nb-.5), cur=movesAt(cuesOf(s,nb),b,s.mv).o.ys, nc={b,len:Math.min(4,nb-b),mv:cur||"groove",who:"all",focus:s.focus||null}; s.cues.push(nc); edDone(x=>{ ED.sel={t:"cue",i:x.cues.indexOf(nc)} }) },
    addf:()=>{ const b=cl(q(ED.ph),.5,nb); edMat(s,nb); if(s.forms.some(k=>Math.abs(k.b-b)<.01)){ toast2("這一拍已經有換隊形了"); return } edPush(); const nk={b,walk:Math.min(2,b),f:"free",pos:JSON.parse(JSON.stringify(posAt(s,b)))}; s.forms.push(nk); edDone(x=>{ ED.sel={t:"form",i:x.forms.indexOf(nk)} }) },
    kp:()=>{ const c=C[ED.sel.i]; edPush(); const d=getD(T), k=d.kp, inSec=!!k&&(k.sec===ED.si||si.chorus), hit=inSec?kpPos(k).findIndex(b=>Math.abs(b-c.b)<.01):-1,
        ln=edLines(T,si).findIndex(l=>c.b>=l.b-.01&&c.b<l.b+l.len), w=whoIds(c.who);
      if(hit===0){ if(k.also?.length){ const a=k.also.shift(); k.b=a.b; k.line=a.line||k.line; toast2("這個位置取消了,第二個位置變成主要的") } else { d.kp=null; toast2("取消 KEY POINT") } }
      else if(hit>0){ k.also.splice(hit-1,1); toast2("取消這段的第二個 KEY POINT") }
      else if(inSec){ k.also=[...(k.also||[]),{line:ln>=0?ln+1:0,b:c.b}].slice(0,3); toast2("加成同一段的第二個 KEY POINT") }
      else { d.kp={...(k||{}),also:[],name:k?.name||d.hook?.name||"",sec:ED.si,line:ln>=0?ln+1:1,b:c.b,len:c.len,lead:c.focus||(w.length===1?w[0]:"all")}; if(!d.kp.name) toast2("在練習室替 KEY POINT 取個名字") }
      edDone() },
    face:()=>{ ED.facePick=!ED.facePick; edRender() },
    easy:()=>{ edPush(); edMat(s,nb); const c=s.cues[ED.sel.i]; if(c.easy) delete c.easy; else c.easy=true; toast2(c.easy?"這個片段改成簡化版:難度照簡化後算":"取消簡化版"); edDone() },
    foc:()=>{ edPush(); edMat(s,nb); const c=s.cues[ED.sel.i], w=whoIds(c.who), opts=[null,...w], k=opts.indexOf(c.focus??null); c.focus=opts[(k+1)%opts.length]; edDone() },
    split:()=>{ edMat(s,nb); const c=s.cues[ED.sel.i], at=(ED.ph>c.b&&ED.ph<c.b+c.len)?q(ED.ph):q(c.b+c.len/2); if(at<=c.b||at>=c.b+c.len){ toast2("這個片段太短,不能再拆"); return }
      edPush(); s.cues.push({...c,b:at,len:c.b+c.len-at}); c.len=at-c.b; edDone(x=>{ ED.sel={t:"cue",i:x.cues.indexOf(c)} }) },
    copych:()=>{ const tg=SI.filter(x=>x.chorus&&x.i!==ED.si&&x.n===si.n); if(!tg.length){ toast2("沒有其他同名的副歌"); return }
      if(!confirm(`把這段的動作片段與換隊形套用到其他 ${tg.length} 次「${si.n}」?那幾段原本的編排會被取代。`)) return; edPush(); edMat(s,nb);
      tg.forEach(x=>{ const t=D.secs[x.i]; t.cues=JSON.parse(JSON.stringify(s.cues)); t.forms=JSON.parse(JSON.stringify(s.forms)); t.f=s.f; t.pos=JSON.parse(JSON.stringify(s.pos)); t.mv=s.mv }); toast2(`已套用到 ${tg.length} 段`); edDone() },
    del:()=>{ edMat(s,nb); if(s.cues.length<=1){ toast2("一段至少要有一個動作片段"); return } edPush(); s.cues.splice(ED.sel.i,1); ED.sel=null; edDone() },
    delf:()=>{ edPush(); edMat(s,nb); s.forms.splice(ED.sel.i,1); ED.sel=null; edDone() } };
  el.querySelectorAll("[data-ed]").forEach(b=>b.onclick=()=>act[b.dataset.ed]?.());
  el.querySelectorAll("[data-ed-cue]").forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); ED.sel={t:"cue",i:+b.dataset.edCue}; ED.pick=false; ED.facePick=false; ED.ph=C[+b.dataset.edCue].b; edRender() });
  el.querySelectorAll("[data-ed-form]").forEach(b=>b.onclick=ev=>{ ev.stopPropagation(); ED.sel={t:"form",i:+b.dataset.edForm}; ED.ph=formsOf(s)[+b.dataset.edForm].b; edRender() });
  el.querySelectorAll("[data-ed-face]").forEach(b=>b.onclick=()=>{ edPush(); edMat(s,nb); const c=s.cues[ED.sel.i], f=b.dataset.edFace; if(f==="front") delete c.face; else c.face=f; ED.facePick=false; edDone() });
  el.querySelectorAll("[data-ed-mv]").forEach(b=>b.onclick=()=>{ edPush(); edMat(s,nb); s.cues[ED.sel.i].mv=b.dataset.edMv; ED.pick=false; edDone() });
  el.querySelectorAll("[data-ed-who]").forEach(b=>b.onclick=()=>{ edPush(); edMat(s,nb); const c=s.cues[ED.sel.i], id=b.dataset.edWho; let w=whoIds(c.who);
    w=w.includes(id)?w.filter(x=>x!==id):[...w,id]; if(!w.length){ toast2("至少要有一個人"); ED.undo.pop(); return } c.who=w.length===5?"all":IDS.filter(x=>w.includes(x)); if(c.focus&&!w.includes(c.focus)) c.focus=null; edDone() });
  el.querySelectorAll("[data-ed-step]").forEach(b=>b.onclick=()=>{ edPush(); edMat(s,nb); const d=+b.dataset.d*sn(), k=b.dataset.edStep;
    if(k==="cb"){ const c=s.cues[ED.sel.i]; c.b=cl(c.b+d,0,nb-.5); ED.ph=c.b } else if(k==="cl"){ const c=s.cues[ED.sel.i]; c.len=cl(c.len+d,.5,nb-c.b) }
    else { const f=s.forms[ED.sel.i]; if(k==="fb"){ f.b=cl(f.b+d,.5,nb); ED.ph=f.b } else f.walk=cl(f.walk+d,0,f.b) }
    const cur=k[0]==="c"?s.cues[ED.sel.i]:s.forms[ED.sel.i]; edDone(x=>{ ED.sel.i=Math.max(0,(k[0]==="c"?x.cues:x.forms).indexOf(cur)) }) });
  const fs=el.querySelector("#edForm"); if(fs) fs.onchange=()=>{ edPush(); edMat(s,nb); const f=s.forms[ED.sel.i]; f.f=fs.value; if(fs.value!=="free"){ const prev=posAt(s,f.b-f.walk-.01); f.pos=place(fs.value,orderFor(movesAt(cuesOf(s,nb),f.b,s.mv).foc||s.focus,prev)) } edDone() };
  el.querySelectorAll("[data-ed-trk]").forEach(t=>t.onclick=ev=>{ if(ev.target.closest("[data-ed-cue],[data-ed-form]")) return; const r=t.getBoundingClientRect(); ED.ph=cl(q((ev.clientX-r.left)/r.width*nb),0,nb-.5); ED.sel=null; ED.pick=false; edRender() });
  /* 拖曳成員:改「紅線這一拍已經站好的那個隊形」(還沒換過就改這段一開始的隊形) */
  const st=el.querySelector("#edStage");
  st.querySelectorAll("[data-ed-dot]").forEach(dot=>dot.onpointerdown=ev=>{ if(ED.playing) return; ev.preventDefault(); const id=dot.dataset.edDot, r=st.getBoundingClientRect(); let np=null;
    try{ dot.setPointerCapture(ev.pointerId) }catch(e){} dot.classList.add("drag");
    dot.onpointermove=e2=>{ const x=cl(((e2.clientX-r.left)/r.width*100-6)/88,0,1), y=cl(1-((e2.clientY-r.top)/r.height*100-10)/80,0,1); dot.style.left=(6+x*88)+"%"; dot.style.top=(10+(1-y)*80)+"%"; np=[+x.toFixed(3),+y.toFixed(3)] };
    dot.onpointerup=dot.onpointercancel=()=>{ dot.onpointermove=dot.onpointerup=dot.onpointercancel=null; dot.classList.remove("drag"); if(!np) return; edPush(); edMat(s,nb);
      const k=s.forms.filter(k=>k.b<=ED.ph+1e-6).sort((a,b)=>a.b-b.b).pop(); if(k){ k.pos={...k.pos,[id]:np}; k.f="free" } else { s.pos={...s.pos,[id]:np}; s.f="free" } edDone() } }) }
function edPlay(){ const {T,nb}=edSec(), bs=beatSec(T); ED.playing=true; if(ED.ph>=nb-.5) ED.ph=0; ED.el.classList.add("songplay"); edRender();
  const sec=window.songTimeline(T).secs[ED.si], me=ED; let last=performance.now(), au=null;
  /* 有定案 mp3 就跟著歌走(從這段的開頭、紅線的位置開始放) */
  window.songAudioURL?.(T).then(u=>{ if(!u||ED!==me||!ED.playing) return; au=new Audio(); au.preload="auto"; au.src=u; ED.au=au;
    const go=()=>{ if(ED!==me||!ED.playing){ au.pause(); return } au.currentTime=sec.t0+ED.ph*bs; au.play().catch(()=>{}) };
    if(au.readyState>=1) go(); else au.addEventListener("loadedmetadata",go,{once:true}) }).catch(e=>window.logErr?.("排舞模式音檔",e));
  const step=now=>{ if(!ED?.playing) return; if(au&&!au.paused&&au.currentTime>0) ED.ph=(au.currentTime-sec.t0)/bs; else ED.ph+=(now-last)/1000/bs; last=now;
    if(ED.ph>=nb){ ED.ph=nb-.5; edStop(); return } edTick(); ED.raf=requestAnimationFrame(step) }; ED.raf=requestAnimationFrame(step) }
function edStop(){ if(!ED) return; cancelAnimationFrame(ED.raf); ED.au?.pause(); ED.au=null; ED.el.classList.remove("songplay"); if(ED.playing){ ED.playing=false; ED.ph=Math.round(ED.ph*2)/2; edRender() } }
/* 播放中只改位置與紅線(transform 以外只動 left/top,元素很少) */
function edTick(){ const {s,nb}=edSec(), pos=posAt(s,ED.ph), {fc}=movesAt(cuesOf(s,nb),ED.ph,s.mv); ED.el.querySelectorAll("[data-ed-dot]").forEach(d=>{ const id=d.dataset.edDot, p=pos[id]||[.5,.5], dg=faceDeg(fc[id],id,pos), w=d.querySelector(".c2fd"); d.style.left=(6+p[0]*88)+"%"; d.style.top=(10+(1-p[1])*80)+"%";
    if(w){ w.style.transform=`rotate(${-dg}deg)`; w.classList.toggle("z",!dg); w.classList.toggle("lk",fc[id]==="look") } });
  const ph=ED.el.querySelector("#edPh"); if(ph) ph.style.left=cl(ED.ph/nb*100,0,100)+"%" }
/* 2.0 第 2 包:整首的時間軸。有對拍(T.sync)時段落照 mp3 的小節,每段裡的句子照錄音室的秒數等比例放進去;
   之後的逐句對拍(T.sync.lines[段][句] = 這句在段落裡第幾拍開始)會蓋過估計 */
window.songTimeline=T=>{ if(!T?.sync?.bars) window.songsAudioSync?.(); const A=API(), ev=[], secs=[], SB=T.sync?.bars, bs=beatSec(T), db=+T.sync?.downbeat||0, n=T.secs.length;
  const st=i=>i===0?0:(SB&&SB[i]!=null?db+(SB[i]-1)*4*bs:null); let t=0;
  T.secs.forEach((s,si)=>{ const raw=s.lines.reduce((x,l)=>x+Math.max(.5,+l.s||0),0)+A.instOf(s); let t0=st(si); if(t0==null||t0<t-.01) t0=t;
    const nx=si<n-1?st(si+1):null, t1=si===n-1&&+T.sync?.end>t0?+T.sync.end:(nx!=null&&nx>t0?nx:t0+raw), k=raw>0?(t1-t0)/raw:1; let u=t0;
    s.lines.forEach((l,li)=>{ const d=Math.max(.5,+l.s||0)*k, lb=T.sync?.lines?.[si]?.[li], a=lb!=null?t0+lb*bs:u;
      ev.push({si,li,t0:a,t1:a+d,who:l.who||[],zh:l.zh||"",ko:l.ko||"",type:l.t,k:!!l.k}); u=a+d });
    secs.push({si,t0,t1,n:s.n,chorus:!!s.chorus,lines:s.lines.length}); t=t1 });
  return {ev,secs,total:Math.max(1,t)} };
/* ---------- KEY POINT 卡片(2.0 第 3 包,樣張 2):這首的招牌動作、每拍分解、為什麼好記、最後副歌的變化;練 KEY POINT(30 分) ---------- */
function kpFace(id){ const f={ys:"yeseul",tr:"taeri",hy:"hiyori",he:"haeun",hr:"haram"}[id]; return f?`<span class="c2face" style="--c:${byId(id).c};background-image:url(${typeof spr==="function"?spr(id,null,"smile"):`assets/chara/${f}_smile.webp`})"></span>`:"" }
function kpCard(T,rerender,editing){ document.querySelector("#kpCard")?.remove(); const D=getD(T), SI=secInfo(T), e=evalDance(T), k=e.kp; if(!k){ toast2("這首還沒有 KEY POINT:在排舞模式選一個副歌的動作片段,按「✦ KEY POINT」"); return }
  const L=window.songTimeline(T), bs=beatSec(T), t=L.secs[k.sec].t0+k.b*bs, si=SI[k.sec], nm=i=>byId(i)?.n||i, A=API();
  const chor=SI.filter(x=>x.chorus), fin=chor.find(x=>/最後/.test(x.n)), kl=SI.find(x=>x.kill);
  const ck=[[k.len<=4,k.len<=4?`${k.len} 拍做完`:`${k.len} 拍(超過 4 拍)`],[!!MV[k.mv]?.hook,MV[k.mv]?.hook?"記憶點動作":"動作不適合當記憶點"],[k.every,k.every?"每次副歌都有":"有的副歌沒有"],[!!(k.name||"").trim(),(k.name||"").trim()?"有名字":"還沒取名字"]];
  const steps=(k.steps||[]).map(x=>String(x).replace(/^\s*\d+\s*[::]\s*/,""));
  const kpm=D.kpm||{}, avgM=Math.round(IDS.reduce((x,i)=>x+(+kpm[i]||0),0)/5);
  const box=document.createElement("div"); box.className="c2 c2dim"; box.id="kpCard";
  const body=editing?`<div class="kpedit"><label>名字<input id="kpN" maxlength="16" value="${esc(k.name||"")}"></label><label>韓文名<input id="kpKo" maxlength="24" value="${esc(k.nameKo||"")}"></label><label>英文名<input id="kpEn" maxlength="24" value="${esc(k.nameEn||"")}"></label>
      <label class="w">每拍分解(一行一拍)<textarea id="kpSt">${esc(steps.join("\n"))}</textarea></label><label class="w">為什麼好記<textarea id="kpWhy">${esc(k.why||"")}</textarea></label><label class="w">最後副歌的變化<textarea id="kpFin">${esc(k.final?.change||"")}</textarea></label></div>`
   :`<div class="c2kpg"><div><div class="c2kpn">${esc(k.name||"(還沒取名字)")}</div><div class="c2kps">${esc([k.nameEn,k.nameKo].filter(Boolean).join(" ・ "))}</div>
      <dl class="c2facts"><dt>位置</dt><dd>${esc(si.n)}・第 ${k.line||1} 句<br><small>${A.fmt(t)}・${k.len} 拍${k.also?.length?`;同一段第 ${k.also.map(a=>a.line||"?").join("、")} 句再一次`:""}</small></dd>
       <dt>領舞</dt><dd class="c2lead">${k.lead&&k.lead!=="all"?`${kpFace(k.lead)}${esc(nm(k.lead))}`:"全員"}</dd>
       <dt>出現</dt><dd class="c2chips">${chor.map(x=>`<span class="${x===fin&&k.final?.change?"g":""}">${esc(x.n)}${k.pos.length>1?` ×${k.pos.length}`:""}${x===fin&&k.final?.change?"・變化":""}</span>`).join("")}</dd></dl></div>
    <div><p class="c2h5">每拍分解</p>${steps.length?`<div class="c2beats" style="grid-template-columns:repeat(${Math.min(4,steps.length)},minmax(0,1fr))">${steps.slice(0,8).map((x,z)=>`<div class="c2beat"><em>${z+1}</em>${esc(x)}</div>`).join("")}</div>`:`<p class="c2p">還沒有每拍分解:編舞室對話交回的編舞會帶,也可以按「編輯」自己寫。</p>`}
      ${k.why?`<p class="c2h5" style="margin-top:7px">為什麼好記</p><p class="c2p">${esc(k.why)}</p>`:""}
      ${k.final?.change?`<p class="c2h5" style="margin-top:5px">最後副歌的變化</p><p class="c2p">${esc(k.final.change)}</p>`:""}</div></div>
    <div class="c2mem"><b>${Math.round(e.hook)}</b><span class="lb">記憶點</span><span class="ck">${ck.map(([ok,tx])=>`<span class="${ok?"":"no"}">${tx}</span>`).join("")}</span><span class="kpm">KEY POINT 熟練 ${avgM}%${D.heat?`・挑戰熱度 ${D.heat}`:""}</span></div>`;
  box.innerHTML=`<div class="c2sheet"><div class="c2sh"><span class="eb">✦ KEY POINT・這首的招牌動作</span><span class="sp"></span><button class="c2x" id="kpX">${editing?"取消":"關閉"}</button></div>${body}
    <div class="c2foot">${editing?`<span class="c2note">名字也會改掉練習室的「記憶點舞步」。</span><button class="c2b pri" id="kpSave">儲存</button>`
      :`<span class="use">會用在:<b>打歌特寫</b>・<b>短影音挑戰</b>・粉絲反應・STARLOG・成員台詞</span><button class="c2b" id="kpSee">在舞台預覽看</button><button class="c2b" id="kpEd">編輯</button><button class="c2b pri" id="kpPrac">練 KEY POINT・30 分</button>`}</div></div>`;
  $("#songFac").appendChild(box); const close=()=>box.remove();
  $("#kpX").onclick=()=>editing?kpCard(T,rerender,false):close();
  if(editing) $("#kpSave").onclick=()=>{ const K=D.kp; K.name=$("#kpN").value.trim().slice(0,16); K.nameKo=$("#kpKo").value.trim(); K.nameEn=$("#kpEn").value.trim();
      K.steps=$("#kpSt").value.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,8); K.why=$("#kpWhy").value.trim().slice(0,160); K.final={...(K.final||{}),change:$("#kpFin").value.trim().slice(0,160)};
      D.hook={name:K.name}; D.at=Date.now(); API().save(); rerender?.(); kpCard(T,rerender,false); toast2("已儲存 KEY POINT") };
  else { $("#kpSee").onclick=()=>{ close(); window.openStagePlay?.(T,{at:Math.max(0,t-1.5)}) }; $("#kpEd").onclick=()=>kpCard(T,rerender,true);
    $("#kpPrac").onclick=()=>{ practiceKP(T); kpCard(T,rerender,false); rerender?.() } } }
function practiceKP(T){ const D=getD(T); D.kpm=D.kpm||{}; let tot=0;
  for(const id of IDS){ const cur=+D.kpm[id]||0, g=Math.max(2,Math.round(18*(1-cur/110)*(.7+byId(id).dance/250))); D.kpm[id]=Math.min(100,cur+g); tot+=g; gain(D,id,3);
    S.m[id].stress=cl(S.m[id].stress+2,0,100) }
  D.at=Date.now(); API().save(); save(true); if(typeof renderHud==="function") renderHud(); window.spendTime?.(30,"練 KEY POINT"); toast2(`練 KEY POINT:平均 +${Math.round(tot/5)}%・花了 30 分`) }
/* ---------- 逐句對拍(2.0 第 2 包後半,2026-11-01):放歌,每一句開始唱時點一下;存成 T.sync.lines[段][句] = 這句在段落裡第幾拍(對齊到半拍) ---------- */
let TAP=null; const TAP_LAT=.06;   // 人點下去通常晚一點點
function tapOpen(T,rerender){ if(!window.songHasAudio?.(T)){ toast2("這首還沒有音檔"); return } const L=window.songTimeline(T), list=L.ev.filter(e=>e.who.length||e.zh);
  if(!list.length){ toast2("這首還沒有歌詞"); return }
  const el=document.createElement("div"); el.className="c2 c2tap"; el.id="c2tap"; $("#songFac").appendChild(el);
  TAP={T,L,list,i:0,taps:{},el,au:null,rr:rerender,paused:false};
  window.songAudioURL(T).then(u=>{ if(!TAP||TAP.el!==el) return; const au=new Audio(); au.preload="auto"; au.src=u; TAP.au=au; au.ontimeupdate=()=>tapTime(); au.onended=()=>tapRender(); tapRender() });
  tapRender() }
function tapClose(save){ if(!TAP) return; const {T,L,list,taps,el,au,rr}=TAP; au?.pause(); TAP=null; el.remove();
  if(save&&Object.keys(taps).length){ const bs=beatSec(T); T.sync=T.sync||{downbeat:0,bars:{}}; T.sync.lines=T.sync.lines||{}; let n=0;
    list.forEach(e=>{ const t=taps[e.si+":"+e.li]; if(t==null) return; const b=Math.max(0,Math.round((t-L.secs[e.si].t0)/bs*2)/2); (T.sync.lines[e.si]=T.sync.lines[e.si]||[])[e.li]=b; n++ });
    API().save(); toast2(`已存逐句對拍:${n} 句`) }
  rr?.() }
function tapTime(){ const x=TAP?.el.querySelector("#tapT"); if(x&&TAP.au) x.textContent=`${API().fmt(TAP.au.currentTime)} / ${API().fmt(TAP.L.total)}` }
function tapSeek(t){ const au=TAP?.au; if(!au) return; t=Math.max(0,t); if(au.readyState>=1) au.currentTime=t; else au.addEventListener("loadedmetadata",()=>{ au.currentTime=t },{once:true}) }
function tapRender(){ if(!TAP) return; const {T,L,list,i,taps,el,au}=TAP, e=list[i], prev=list[i-1], nm=id=>byId(id)?.n||id, sec=e?L.secs[e.si]:null;
  const who=x=>x.who.length>=5?"全員":x.who.map(nm).join("、"), done=Object.keys(taps).length, started=au&&!au.paused;
  el.innerHTML=`<div class="tp-top"><div><small>逐句對拍・${esc(T.name||"未命名")}</small><b>${e?esc(sec.n):"全部點完了"}</b></div><span class="tp-sp"></span><span class="tp-n">${Math.min(i+1,list.length)} / ${list.length} 句</span>
      <button class="c2btn" data-tp="close">取消</button><button class="c2btn pri" data-tp="save"${done?"":" disabled"}>儲存(${done} 句)</button></div>
    <button class="tp-hit" data-tp="tap"${e&&started?"":" disabled"}>
      ${prev?`<span class="tp-prev">✓ ${esc(who(prev))}:${esc(prev.zh||"♪")}</span>`:""}
      ${e?`<span class="tp-who">${esc(who(e))}${e.k?"・killing part":""}</span><span class="tp-zh">${esc(e.zh||"(這句還沒寫歌詞)")}</span><span class="tp-ko">${esc(e.ko||"")}</span>
        <span class="tp-cta">${started?"這句一開始唱,就點這裡":au?"按下面的「▶ 開始」":"音檔載入中…"}</span>${list[i+1]?`<span class="tp-next">下一句 ${esc(who(list[i+1]))}:${esc(list[i+1].zh||"♪")}</span>`:""}`:`<span class="tp-zh">按「儲存」</span>`}</button>
    <div class="tp-ctl"><button class="c2btn pri" data-tp="play">${started?"❚❚ 暫停":i?"▶ 繼續":"▶ 開始"}</button><button class="c2btn" data-tp="back"${i?"":" disabled"}>◀ 退一句</button><button class="c2btn" data-tp="sec"${e?"":" disabled"}>這段重點</button><span id="tapT" class="tp-t"></span></div>`;
  el.querySelectorAll("[data-tp]").forEach(b=>b.onclick=()=>tapAct(b.dataset.tp)); tapTime() }
function tapAct(k){ const P=TAP; if(!P) return; const {L,list,au}=P;
  if(k==="close"){ if(Object.keys(P.taps).length&&!confirm("點好的還沒儲存,要放棄嗎?")) return; tapClose(false); return }
  if(k==="save"){ tapClose(true); return }
  if(k==="play"){ if(!au) return; if(au.paused){ if(!P.i) tapSeek(0); au.play().catch(()=>{}) } else au.pause(); setTimeout(tapRender,30); return }
  if(k==="tap"){ const e=list[P.i]; if(!e||!au||au.paused) return; P.taps[e.si+":"+e.li]=Math.max(0,au.currentTime-TAP_LAT); P.i++; tapRender(); return }
  if(k==="back"){ P.i=Math.max(0,P.i-1); const e=list[P.i]; delete P.taps[e.si+":"+e.li]; const pv=list[P.i-1]; tapSeek((pv?P.taps[pv.si+":"+pv.li]??L.secs[e.si].t0:L.secs[e.si].t0)-1.5); tapRender(); return }
  if(k==="sec"){ if(!au) return; const e=list[P.i], f=list.findIndex(x=>x.si===e.si); list.forEach((x,z)=>{ if(x.si===e.si) delete P.taps[x.si+":"+x.li] }); P.i=f; tapSeek(L.secs[e.si].t0-1); if(au.paused) au.play().catch(()=>{}); setTimeout(tapRender,30) } }
/* Android 返回鍵:試算視窗 → 匯入視窗 → 換動作清單 → 排舞模式 */
window.choreoBack=()=>{ if(TAP){ tapAct("close"); return true } const kc=document.querySelector("#kpCard"); if(kc){ kc.remove(); return true } const t=document.querySelector("#chTrial"); if(t){ t.remove(); return true } const m=document.querySelector("#songFac .sfmodal #chTxt"); if(m){ m.closest(".sfmodal").remove(); return true }
  if(ED){ if(ED.pick){ ED.pick=false; edRender() } else edClose(); return true } return false };
window.choreoRender=(body,rerender)=>render(body,rerender);
})();
