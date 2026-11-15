"use strict";
/* =====================================================================
   榜單(2026-11-15,2.0 第八個大腦,全面審視第 2 包之一「看得見的成績」)
   把打歌本來就在算的成績攤開來看:手機主畫面最下面那一條(出道後變成今天的名次)→「榜單」App 三頁。
   ・音源:主打每天在音源榜第幾名(前 100,榜上有對手和其他歌手的歌)、名次曲線、最高名次、前十天數;收錄曲也有自己的名次。
   ・專輯:初動(發行後 7 天逐日)、累計、和對手比。簽售會那幾天多賣一些。
   ・MV:觀看數、24 小時、里程碑。
   資料在 S.chart.rel[第幾次發行](跟著存檔與雲端):
     {n,start,title,album,bs:[收錄曲],q:歌的分數,sc:現在的音源分數,ld:算到哪一天,d:[每天的名次,0=圈外],b:{收錄曲:[名次]},
      peak,n10,n1,sl:[初動逐日,萬張],fw:初動,tot:累計,mv:觀看(萬次),mv24,mm:[[里程碑,第幾天]],show:{d,dg,rd,rn,rs} 最近一場打歌}
   怎麼算:
     音源分數=那天打歌的「音源」那一項(stage.js 的 us.digital:歌的分數 × 週數 × 知名度與話題度);沒打歌的日子慢慢往下;
     名次=榜上有幾首歌分數比它高。榜上的其他歌照日期固定算出來(同一天每次看都一樣),同週對手的歌用打歌那一場的分數。
     名次一天更新一次,跟著遊戲日期走(時間只在遊戲開著時走);跳過的日子會補算。
   世界的反應:進前十、登上第一名、逆行、初動結算、MV 里程碑會寫進公開紀錄(S.pubx),手機的新聞與粉絲站跟著報(growth.js 呼叫 chartNews/chartFan/chartRecap)。
   沒有懲罰:這裡只是讓結果看得見。
   ===================================================================== */
(()=>{
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const h01=(...a)=>rng(seedOf(...a))();   // 固定的亂數:同一天、同一首歌每次都一樣
const fame=()=>Math.min(1,(window.fansNow?.()||0)/420);
const yearOf=d=>dateOf(d).getFullYear();
const albumF=d=>[1,1.25,1.7,2.6,3.6,4.6][clamp(yearOf(d)-2017,0,5)];   // 實體專輯市場逐年變大
const viewF=d=>1+clamp(yearOf(d)-2017,0,5)*.3;
const G=()=>{ const g=typeof STORY_VARS!=="undefined"&&STORY_VARS["團名"]?.(); return g?String(g):"她們" };
const sp=(a,b)=>/[A-Za-z0-9]$/.test(a)||/^[A-Za-z0-9]/.test(b)?a+" "+b:a+b;
const CH=()=>{ const c=S.chart=S.chart||{v:1,rel:{}}; c.rel=c.rel||{}; return c };
const rels=()=>Object.values(CH().rel).sort((a,b)=>b.start-a.start);
const fmtU=u=>u>=100?`${Math.round(u)}`:u>=10?`${u.toFixed(1)}`:`${u.toFixed(2)}`;                      // 萬張
const fmtV=v=>v>=10000?`${(v/10000).toFixed(2).replace(/\.?0+$/,"")} 億`:v>=100?`${Math.round(v).toLocaleString()} 萬`:`${v.toFixed(1)} 萬`;   // 次
const md=d=>{ const x=dateOf(d); return `${x.getMonth()+1}/${x.getDate()}` };
const ymd=d=>{ const x=dateOf(d); return `${x.getFullYear()}.${x.getMonth()+1}.${x.getDate()}` };

/* ---------- 榜上的其他歌(都是虛構的) ---------- */
/* 女團照 stage.js 的對手名單(同一批歌);另外有男團、歌手、樂團,讓榜單像真的。c=多久出一次新歌(天)、o=錯開的天數、pk=新歌最高分 */
const EXTRA=[
  {n:"EXON",pk:91,c:96,o:11,song:["Overdrive","Gravity Zero","Wild Signal"]},
  {n:"NOVA",pk:85,c:104,o:57,song:["Supernova Days","Blue Orbit","Comet Tail"]},
  {n:"SEORIN",pk:88,c:150,o:40,song:["Letter in November","Slow Tide","Goodnight, Seoul"]},
  {n:"MOONJAE",pk:83,c:120,o:95,song:["Paper Umbrella","Half Moon","Rooftop Radio"]},
  {n:"Blue Tangerine",pk:80,c:135,o:20,song:["Tangerine Soda","Weekend Bus","Seaside Letter"]},
  {n:"KANG DOHA",pk:82,c:110,o:70,song:["No Sleep Seoul","Black Coffee","0 A.M."]},
  {n:"LUCID BAY",pk:78,c:140,o:5,song:["Tidal","Glass Harbor","Low Sun"]}];
const FA=["HAEWON","Yoon Dara","Midnight Parade","OHJIN","Sunday Arcade","LEE SOL","The Lanterns","MIRAE","Coastline","JUNE.K","Violet Hour","DAON","Han River Club","SORA & JIN"];
const FT=["Stay a Little","Rainy Platform","First Snow Again","Polaroid","Late Bloom","Afterglow Avenue","Hello, Stranger","Seoul to You","Lemon Tree Street","Night Bus 370","Daydream Loop","Mint","Small Hours","Butterfly Note","Runaway Summer",
  "Cassette","Honest","Blue Hour","Moonwalk Home","Peach Sky","Ordinary Miracle","Fever Dream","Snowglobe","Rewind Me","Lighthouse","Sugarcoat","Tangerine Sunset","Echo Park","Slow Dance","Wonder Why"];
const curve=a=>a<3?.93+.025*a:a<21?1-.005*(a-3):Math.max(.5,.91*Math.pow(.5,(a-21)/34));   // 新歌的熱度:頭三天往上、三週內很高、之後慢慢退
const FCACHE={};
function field(d){ if(FCACHE.d===d&&FCACHE.k===fieldKey(d)) return FCACHE.L;
  const iso=dateOf(d).toISOString().slice(0,10), out=[], put=e=>{ const i=out.findIndex(o=>o.t===e.t&&o.a===e.a); if(i<0) out.push(e); else if(e.s>out[i].s||e.fix) out[i]=e };
  const acts=[...(window.stageRivalList?.()||[]).map((r,i)=>({n:r.n,pk:84*(r.pw||1),c:98+(i*13)%40,o:(i*29)%97,song:r.song,from:r.from,to:r.to})),...EXTRA];
  for(const A of acts){ if((A.from&&iso<A.from)||(A.to&&iso>A.to)) continue;
    const t=d+A.o, k=Math.floor(t/A.c), age=t%A.c, L=A.song.length;
    for(const [kk,ag] of [[k,age],[k-1,age+A.c]]){ const s=A.pk*curve(ag)*(.97+.06*h01(A.n,kk,"q"))+(h01(d,A.n,kk)-.5)*2.4; if(s>30) put({t:A.song[((kk%L)+L)%L],a:A.n,s}) } }
  for(let j=0;j<86;j++){ const q=Math.floor((d+j*11)/75); put({t:FT[(j*7+q)%FT.length],a:FA[(j*3+q)%FA.length],s:75.5-j*.56+(h01(d,"f",j)-.5)*2.6}) }
  for(const R of rels()) if(R.show&&R.show.d===d-1&&R.show.rn) put({t:R.show.rs||"",a:R.show.rn,s:R.show.rd,fix:1});   // 同週對手:用昨天那一場算出來的分數
  FCACHE.d=d; FCACHE.k=fieldKey(d); FCACHE.L=out; return out }
const fieldKey=d=>rels().map(R=>R.show&&R.show.d===d-1?R.n+":"+R.show.rd:"").join("|");
const rankOf=(s,d)=>{ const r=1+field(d).filter(e=>e.s>s).length; return r>100?0:r };

/* ---------- 每天算一次 ---------- */
const MVM=[100,300,500,1000,2000,3000,5000,10000,20000];   // MV 里程碑(萬次)
const SHARE=[.36,.17,.1,.08,.09,.12,.08];                  // 初動七天的分布
function pub(k,day,R,x){ (S.pubx=S.pubx||[]).push({k,day,n:R.n,title:R.title,release:R.album||"",...x}) }
function ensure(){ const c=CH(), sum=window.songSummary?.();
  for(const P of S.promoHist||[]){ if(P.start==null||P.start>S.day||c.rel[P.n]) continue;
    const cur=S.promo&&S.promo.n===P.n, q=clamp(+(cur?sum?.title?.score:0)||78,40,100);
    c.rel[P.n]={n:P.n,start:P.start,title:P.title||"主打歌",album:P.release||"",bs:(P.tracks||[]).filter(t=>t&&t!==P.title).slice(0,5),q,sc:0,ld:P.start-1,d:[],b:{},peak:0,n10:0,n1:0,sl:[],fw:0,tot:0,mv:0,mv24:0,mm:[],show:null,hot:0} } }
function stepDay(R,x){ const k=x-R.start, f=fame();
  /* 音源分數 */
  let sc;
  if(R.show&&R.show.d===x-1) sc=R.show.dg;
  else if(k===0||!R.sc) sc=R.q*.92*(.6+.4*f);
  else sc=R.sc*(k<=28?.992:k<60?.978:.988);
  if(R.boost>0){ sc*=1.012; R.boost-- }
  R.sc=sc;
  const rk=k>150?0:rankOf(sc,x); R.d[k]=rk;
  if(rk){ if(!R.peak||rk<R.peak) R.peak=rk; if(rk<=10) R.n10++; if(rk===1) R.n1++;
    if(rk<=10&&!R.m10){ R.m10=1; pub("chart10",x,R,{rank:rk,dn:k+1}) }
    if(rk===1&&!R.m1){ R.m1=1; pub("chart1",x,R,{dn:k+1,first:!rels().some(o=>o!==R&&o.m1)}) }
    const p5=R.d[k-5]; if(k>=12&&rk<=60&&(p5===0||p5-rk>=10)&&p5!==undefined&&(!R.mr||k-R.mr>=30)){ R.mr=k; pub("rerun",x,R,{rank:rk,from:p5||0,dn:k+1}) } }
  for(const nm of R.bs){ const fb=.58+.16*h01(R.n,nm,"b"); (R.b[nm]=R.b[nm]||[])[k]=k>120?0:rankOf(sc*fb,x) }
  /* 專輯:今天早上公布昨天賣了多少 */
  if(k>=1&&k<=7){ const W=(1.4+58*Math.pow(f,1.15))*albumF(x)*(.7+.3*R.q/90), wd=dateOf(x-1).getDay(), fs=k>1&&[3,5,6].includes(wd)?1.22:1;   // 週三、週五、週六有簽售會
    const u=Math.round(W*SHARE[k-1]*fs*(.92+.16*h01(R.n,"s",k))*100)/100; R.sl[k-1]=u; R.tot=Math.round((R.tot+u)*100)/100;
    if(k===7){ R.fw=Math.round(R.sl.reduce((a,b)=>a+(b||0),0)*100)/100; const prev=Math.max(0,...rels().filter(o=>o!==R&&o.fw).map(o=>o.fw)); pub("sales",x,R,{units:R.fw,rec:prev>0&&R.fw>prev,prev,first:!prev}) } }
  else if(k>7&&k<=120&&R.fw) R.tot=Math.round((R.tot+R.fw*.03*Math.pow(.96,k-8)*(.8+.4*h01(R.n,"t",k)))*100)/100;
  /* MV:觀看數 */
  if(k>=1&&k<=150){ const V=(35+1400*Math.pow(f,1.15))*viewF(x)*(.6+.4*R.q/90), fr=k<=7?[1,.55,.4,.32,.27,.24,.22][k-1]:.2*Math.pow(.975,k-7);
    const v=V*fr*(.9+.2*h01(R.n,"v",k))*(1+(R.hot||0)); if(k===1) R.mv24=Math.round(v*10)/10; const b=R.mv; R.mv=Math.round((R.mv+v)*10)/10; R.hot=(R.hot||0)*.6;
    const hit=MVM.filter(m=>b<m&&R.mv>=m).pop(); if(hit){ R.mm.push([hit,k]); pub("mv",x,R,{views:hit,dn:k}) } }
  R.ld=x }
function sync(){ try{ if(typeof S==="undefined"||!S||!(S.promoHist||[]).length) return; ensure(); let ch=false;
    for(const R of rels()){ if(S.day-R.start>170&&R.ld>=R.start+170) continue;
      for(let x=Math.max(R.ld+1,R.start);x<=Math.min(S.day,R.start+170);x++){ stepDay(R,x); ch=true } }
    return ch }catch(e){ window.logErr?.("榜單",e) } }
window.chartSync=sync;
/* 打歌的結果(growth.js onShowResult 之後):這一場的音源分數留到明天算名次;挑戰流行起來那幾天 MV 多看一些;新的回歸會帶動舊歌 */
const _os=window.onShowResult;
window.onShowResult=r=>{ const out=_os?.(r);
  try{ if(window.promoActive?.()&&S.promo&&r?.us){ sync(); const R=CH().rel[S.promo.n];
      if(R){ R.show={d:S.day,dg:Math.round(r.us.digital*10)/10,rd:Math.round((r.rv?.digital||0)*10)/10,rn:r.rival?.n||"",rs:r.rival?.song||""}; if(r.viral) R.hot=Math.max(R.hot||0,.5); if(r.win&&R.sc) R.sc*=1.004 } } }catch(e){ window.logErr?.("榜單",e) }
  return out };
const _ds=window.timelineOnDayStart;
window.timelineOnDayStart=()=>{ _ds?.(); const n0=Object.keys(CH().rel).length; sync();
  if(Object.keys(CH().rel).length>n0) for(const R of rels().slice(1)) if(S.day-R.start<400) R.boost=7 };   // 新歌發行:之前的歌跟著被找回來聽(逆行)

/* ---------- 新聞與粉絲站的句子(內建;之後 ⑦ 可以補句型,kind 是 chart10、chart1、rerun、sales、mv) ---------- */
window.chartKinds=["chart10","chart1","rerun","sales","mv"];
window.chartNews=x=>{ const g=G(), t=`〈${x.title||"主打歌"}〉`;
  if(x.k==="chart10") return {head:sp(g,`${t}打進音源榜前十`),body:`發行第 ${x.dn} 天,來到第 ${x.rank} 位`};
  if(x.k==="chart1") return {head:sp(g,`${t}登上音源榜第一名`),body:x.first?"這是她們第一次站上音源榜的頂端":`發行第 ${x.dn} 天登頂`};
  if(x.k==="rerun") return {head:sp(g,`${t}逆行,回到音源榜第 ${x.rank} 位`),body:`發行 ${x.dn} 天後,又被重新找回來聽`};
  if(x.k==="sales") return {head:sp(g,`《${x.release||x.title}》初動 ${fmtU(x.units)} 萬張`),body:x.rec?`刷新了她們自己的紀錄(上一張 ${fmtU(x.prev)} 萬張)`:x.first?"出道作品交出的第一張成績單":"第一週的成績出爐"};
  if(x.k==="mv") return {head:sp(g,`${t}MV 觀看突破 ${fmtV(x.views)}次`),body:`公開第 ${x.dn} 天`};
  return null };
window.chartFan=(x,r)=>{ const t=`〈${x.title||"主打歌"}〉`, pick=a=>a[Math.floor(r()*a.length)];
  if(x.k==="chart10") return pick([`${t}進前十了!!截圖存起來。`,`第 ${x.rank} 位……我們的歌真的在榜上。`,`今天也串流了,${t}再往上一點。`]);
  if(x.k==="chart1") return pick([`${t}音源榜第一名!!!我在公車上叫出來。`,`第一名的截圖,我要設成桌布。`,`一位的那一刻,群組直接炸掉。`]);
  if(x.k==="rerun") return pick([`${t}又爬回來了,好歌就是會被找到。`,`逆行!路人終於發現${t}了。`]);
  if(x.k==="sales") return pick([`初動 ${fmtU(x.units)} 萬張,我也貢獻了幾張。`,x.rec?"破紀錄了!下一張再一起破。":"簽售會排了三個小時,值得。",`《${x.release||x.title}》的小卡開到本命了。`]);
  if(x.k==="mv") return pick([`MV ${fmtV(x.views)}次!我看的應該佔了一百次。`,`${t}MV 第 2 分鐘那個鏡頭,不管看幾次都起雞皮疙瘩。`]);
  return "" };
window.chartRecap=(x,a)=>{ const t=`〈${x.title||"主打歌"}〉`;
  if(x.k==="chart1") return `【整理】${a},${t}第一次登上音源榜第一名的那天。`;
  if(x.k==="chart10") return `【整理】${a},${t}打進前十的那個晚上,大家都沒睡。`;
  if(x.k==="rerun") return `【整理】${a}${t}的那一波逆行,現在想起來還是很熱血。`;
  if(x.k==="sales") return `【整理】${a},《${x.release||x.title}》初動 ${fmtU(x.units)} 萬張的那一週。`;
  if(x.k==="mv") return `【整理】${a},${t}MV 突破 ${fmtV(x.views)}次。`;
  return "" };

/* ---------- 獎盃牆用的紀錄 ---------- */
window.chartRecords=()=>{ sync(); const L=rels(); if(!L.length) return null;
  const pk=L.filter(R=>R.peak).sort((a,b)=>a.peak-b.peak||b.n1-a.n1)[0], fw=L.filter(R=>R.fw).sort((a,b)=>b.fw-a.fw)[0], mv=L.filter(R=>R.mv).sort((a,b)=>b.mv-a.mv)[0];
  return {peak:pk?{rank:pk.peak,title:pk.title,n1:L.reduce((a,R)=>a+R.n1,0)}:null,week:fw?{units:fw.fw,album:fw.album||fw.title}:null,mv:mv?{views:mv.mv,title:mv.title}:null} };

/* ---------- 手機 ---------- */
let TAB="dig";
const rkTxt=r=>r?`${r}`:"圈外";
const move=(a,b)=>b===undefined?["new","NEW"]:!a&&!b?["","—"]:!b?["new","進榜"]:!a?["dn","▼"]:a<b?["up","▲"+(b-a)]:a>b?["dn","▼"+(a-b)]:["","—"];   // a=今天、b=昨天
function spark(d){ const v=d.slice(-28).map(r=>r||101), n=v.length; if(n<2) return "";
  const pts=v.map((r,i)=>`${(2+i*96/(n-1)).toFixed(1)},${(4+(Math.min(60,r)-1)/59*22).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="2,30 ${pts} 98,30" fill="rgba(255,210,122,.14)" stroke="none"/><polyline points="${pts}" fill="none" stroke="#FFD27A" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>` }
const row=(rk,t,a,mv,me)=>`<div class="crow${me?" me":""}"><span class="rk">${rk}</span><span class="nm"><b>${esc(t)}</b><span>${esc(a)}</span></span><span class="mv ${mv[0]}">${mv[1]}</span></div>`;
function digHTML(R){ const d=S.day, k=d-R.start, rk=R.d[k]||0, y=R.d[k-1], mv=move(rk,k===0?undefined:y||0), g=window.groupName?.()||"完美女團";
  /* 今天的榜單:前 5 名+我們的歌和前後各一首 */
  const mine=[]; for(const X of rels()){ const kk=d-X.start, r=X.d[kk]; if(r) mine.push({t:X.title,a:g+(X===R?"":"・"+(X.album||"之前的歌")),s:X.sc,me:1,mv:move(r,kk===0?undefined:X.d[kk-1]||0)});
    for(const nm of X.bs){ const rb=X.b[nm]?.[kk]; if(rb) mine.push({t:nm,a:g+"・收錄曲",s:X.sc*(.58+.16*h01(X.n,nm,"b")),me:1,mv:move(rb,kk===0?undefined:X.b[nm][kk-1]||0)}) } }
  const rkMap=L=>new Map(L.slice().sort((a,b)=>b.s-a.s).map((e,i)=>[e.t+"|"+e.a,i+1])), F=field(d), tr=rkMap(F), yr=rkMap(field(d-1));
  const all=[...F.map(e=>({...e})),...mine].sort((a,b)=>b.s-a.s).slice(0,100); all.forEach((e,i)=>{ e.rk=i+1; if(!e.me){ const p=yr.get(e.t+"|"+e.a); e.mv=move(tr.get(e.t+"|"+e.a),p===undefined||p>100?0:p) } });
  const show=new Set([0,1,2,3,4]); all.forEach((e,i)=>{ if(e.me){ show.add(i); if(i>0) show.add(i-1); if(i<all.length-1) show.add(i+1) } });
  let list="", last=-1; for(const i of [...show].sort((a,b)=>a-b)){ if(i>=all.length) continue; if(last>=0&&i>last+1) list+=`<div class="cgap">・・・</div>`; const e=all[i]; list+=row(e.rk,e.t,e.a,e.mv,e.me); last=i }
  const days=R.d.filter(Boolean).length;
  return `<div class="chero"><small>DAILY CHART ・ ${ymd(d)}</small><h4>${esc(R.title)}</h4><div class="who">${esc(g)}${R.album?` ・ 《${esc(R.album)}》主打`:""}</div>
    <div class="big"><b>${rkTxt(rk)}</b>${rk?"<i>位</i>":"<i>前 100 名以外</i>"}<em class="${mv[0]}">${mv[1]==="—"?"持平":mv[1]}</em></div>${spark(R.d.slice(0,k+1))}
    <div class="ckv"><span><b>${R.peak?R.peak+" 位":"–"}</b>最高</span><span><b>${days} 天</b>進榜</span><span><b>${R.n10} 天</b>前十</span></div></div>
    <h6><span>今日音源榜</span><span>前 100</span></h6>${list}` }
function albHTML(R){ const d=S.day, k=d-R.start, done=k>=7, sum=Math.round(R.sl.reduce((a,b)=>a+(b||0),0)*100)/100, mx=Math.max(.01,...R.sl.map(x=>x||0)), g=window.groupName?.()||"完美女團";
  const best=Math.max(0,...rels().map(o=>o.fw||0)), rec=done&&R.fw>=best&&rels().some(o=>o!==R&&o.fw);
  const bars=SHARE.map((_,i)=>R.sl[i]!=null?`<i style="height:${Math.max(6,Math.round(R.sl[i]/mx*100))}%"></i>`:`<i class="todo" style="height:14%"></i>`).join("");
  const days=SHARE.map((_,i)=>`<span>${i===0?md(R.start):dateOf(R.start+i).getDate()}</span>`).join("");
  /* 比一比:我們最近幾張、這次同週的對手、現在最紅的女團 */
  const RB={"TWINKLE":12,"RADIANT 9":8.6,"PRISM 9":9.5,"HARMONY":4.8,"VELVET ROSE":4.1,"CARAT NOIR":2.1,"GLOW":3.4,"PEACH":2.9}, rv=n=>Math.round((RB[n]||3)*albumF(d)*10)/10;
  const cmp=rels().filter(o=>o.fw||o===R).slice(0,3).map(o=>({n:`${g}《${o.album||o.title}》`,u:o===R&&!done?sum:o.fw,me:1,ing:o===R&&!done}));
  const wk=R.show?.rn||window.stageRivalsAt?.(R.start)?.[0]?.n; if(wk&&wk!=="TWINKLE") cmp.push({n:`${wk} 最新專輯`,u:rv(wk)}); cmp.push({n:"TWINKLE 最新專輯",u:rv("TWINKLE")});
  const top=Math.max(...cmp.map(c=>c.u||0),.01);
  return `<div class="chero"><small>FIRST WEEK ・ 發行後 7 天</small><h4>${esc(R.album||R.title)}</h4><div class="who">${R.n===1?"出道作品":`第 ${R.n-1} 次回歸`} ・ ${ymd(R.start)} 發行</div>
    <div class="big"><b>${k<1?"–":fmtU(done?R.fw:sum)}</b><i>萬張 ${done?"初動":k<1?"明天公布第一天":`初動進行中(第 ${k} 天)`}</i>${rec?`<em class="up">新紀錄</em>`:""}</div>
    <div class="cbars">${bars}</div><div class="cdays">${days}</div>
    <div class="ckv"><span><b>${fmtU(R.tot)} 萬</b>累計</span><span><b>${best?fmtU(best)+" 萬":"–"}</b>最高初動</span><span><b>第 ${k+1} 天</b>發行</span></div></div>
    <h6><span>初動比一比</span><span>萬張</span></h6>${cmp.map(c=>`<div class="ccmp${c.me?" me":""}"><header><span>${esc(c.n)}${c.ing?"(進行中)":""}</span><b>${fmtU(c.u||0)}</b></header><div class="bar"><i style="width:${Math.max(2,Math.round((c.u||0)/top*100))}%"></i></div></div>`).join("")}
    <p class="cnote">有簽售會的那幾天(週三、週五、週六),專輯會多賣一些。</p>` }
function mvHTML(R){ const d=S.day, k=d-R.start, next=MVM.find(m=>m>R.mv);
  const ms=R.mm.slice().reverse().map(([m,dn])=>`<div class="crow"><span class="rk">★</span><span class="nm"><b>突破 ${fmtV(m)}次</b><span>公開第 ${dn} 天 ・ ${ymd(R.start+dn)}</span></span><span class="mv"></span></div>`).join("");
  const old=rels().filter(o=>o!==R&&o.mv).map(o=>`<div class="ccmp"><header><span>〈${esc(o.title)}〉</span><b>${fmtV(o.mv)}</b></header></div>`).join("");
  return `<div class="chero"><small>MUSIC VIDEO ・ ${ymd(R.start)} 公開</small><h4>${esc(R.title)}</h4><div class="who">${esc(window.groupName?.()||"完美女團")} ・ 官方 MV</div>
    <div class="big"><b>${k<1?"–":fmtV(R.mv).replace(/ (萬|億)$/,"")}</b><i>${k<1?"明天開始計算":(R.mv>=10000?"億":"萬")+"次觀看"}</i></div>
    <div class="ckv"><span><b>${R.mv24?fmtV(R.mv24):"–"}</b>24 小時</span><span><b>第 ${k+1} 天</b>公開</span><span><b>${next?fmtV(next):"–"}</b>下一個里程碑</span></div></div>
    <h6><span>里程碑</span><span></span></h6>${ms||`<p class="cnote">突破 100 萬次以後,會記在這裡。</p>`}${old?`<h6><span>之前的 MV</span><span>觀看</span></h6>${old}`:""}` }
window.chartAppHTML=()=>{ sync(); const R=rels()[0];
  const head=`<div class="phead"><button class="pback" data-go="home">‹</button><b>榜單</b><span></span></div>`;
  if(!R) return `${head}<div class="pscroll pchart"><p class="cnote">出道以後,這裡會出現音源榜的名次、專輯的銷量和 MV 的觀看數。</p></div>`;
  return `${head}<div class="pscroll pchart"><div class="ctabs" role="tablist">${[["dig","音源"],["alb","專輯"],["mv","MV"]].map(([k,n])=>`<button role="tab" data-ctab="${k}" class="${TAB===k?"on":""}" aria-selected="${TAB===k}">${n}</button>`).join("")}</div>${TAB==="alb"?albHTML(R):TAB==="mv"?mvHTML(R):digHTML(R)}</div>` };
window.chartAppBind=(B,render)=>{ B.querySelectorAll("[data-ctab]").forEach(b=>b.onclick=()=>{ TAB=b.dataset.ctab; window.sfx?.("tap"); render() }) };
/* 主畫面最下面那一條:出道前是原本的說明,出道後是今天的名次(點了進榜單) */
window.chartDockHTML=()=>{ sync(); const R=rels()[0]; if(!R) return "";
  const k=S.day-R.start, rk=R.d[k]||0, mv=move(rk,k===0?undefined:R.d[k-1]||0);
  return `<button class="pdock pchw" data-app="chart" aria-label="榜單"><span class="t"><small>音源榜</small><b>${esc(R.title)}</b></span><span class="r"><b>${rk?rk+" 位":"圈外"}</b><i class="${mv[0]}">${mv[1]==="—"?"":mv[1]}</i></span></button>` };
})();
