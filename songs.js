"use strict";
/* =====================================================================
   企劃室與錄音室(由歌曲企劃室搬進遊戲)
   計算公式與歌曲企劃室完全相同;資料是雲端的 users/{uid}/songs/state(與歌曲企劃室共用)
   整個模組包在函式裡,避免和 game.js 的名稱衝突
   ===================================================================== */
(()=>{
const M=[
  {id:"ys",n:"藝瑟",c:"#7B4FBF",vocal:64,dance:62,rap:30,expr:72,kor:100,exp:.21},
  {id:"tr",n:"泰梨",c:"#C8102E",vocal:45,dance:74,rap:72,expr:70,kor:100,exp:.19},
  {id:"hy",n:"日和",c:"#C9A35E",vocal:48,dance:80,rap:22,expr:68,kor:55,exp:.17},
  {id:"he",n:"夏恩",c:"#E9746A",vocal:52,dance:62,rap:50,expr:76,kor:100,exp:.19},
  {id:"hr",n:"河嵐",c:"#7FAF2C",vocal:74,dance:55,rap:30,expr:55,kor:100,exp:.24},
];
const byId=id=>M.find(m=>m.id===id);
const TYPES={main:"主唱句",high:"高音",harm:"和聲",adlib:"即興",rap:"Rap",spoken:"唸白"};
const FAM={pop:"流行與電子",hip:"嘻哈",rnb:"R&B",bal:"抒情",oth:"其他"};
/* 曲風:所屬大類、2015~2022 流行度、季節 */
const GENRES={
  bubblegum:{n:"泡泡糖流行",f:"pop",tr:[85,78,72,65,58,52,50,48],su:1},
  fresh:{n:"青春清新流行",f:"pop",tr:[80,82,74,62,55,50,48,46],su:1},
  synthpop:{n:"合成器流行",f:"pop",tr:[55,58,62,66,70,74,72,70]},
  edmpop:{n:"EDM 流行",f:"pop",tr:[70,72,70,66,62,58,55,52]},
  tropical:{n:"熱帶浩室",f:"pop",tr:[55,84,85,68,52,45,42,40],su:1},
  moombah:{n:"Moombahton",f:"pop",tr:[45,62,72,70,60,52,48,45],su:1},
  futurebass:{n:"Future Bass",f:"pop",tr:[40,52,68,78,74,62,55,50]},
  house:{n:"浩室",f:"pop",tr:[52,55,58,60,66,70,72,76]},
  disco:{n:"復古 Disco",f:"pop",tr:[38,42,48,56,70,90,82,70]},
  citypop:{n:"City Pop",f:"pop",tr:[35,38,42,48,56,72,74,66],su:1},
  njs:{n:"New Jack Swing",f:"pop",tr:[30,30,32,34,38,48,62,76]},
  poprock:{n:"流行搖滾",f:"pop",tr:[45,46,48,50,55,60,64,70]},
  latin:{n:"拉丁流行",f:"pop",tr:[40,46,58,72,70,64,60,58],su:1},
  dreampop:{n:"夢幻流行",f:"pop",tr:[42,46,52,58,64,66,62,58]},
  girlcrush:{n:"Girl crush 電子嘻哈",f:"hip",tr:[60,66,74,85,88,82,84,90]},
  trap:{n:"Trap",f:"hip",tr:[55,62,70,78,82,78,80,82]},
  boombap:{n:"Boom Bap",f:"hip",tr:[50,48,46,46,48,52,56,62]},
  drill:{n:"Drill",f:"hip",tr:[20,22,25,30,38,48,60,72]},
  rnb:{n:"當代 R&B",f:"rnb",tr:[55,58,62,66,68,70,72,74]},
  rnbballad:{n:"R&B 抒情",f:"rnb",tr:[60,60,62,64,64,66,66,64],wi:1},
  ballad:{n:"抒情",f:"bal",tr:[70,68,66,64,62,63,62,60],wi:1},
  orchestral:{n:"管弦抒情",f:"bal",tr:[48,52,56,60,64,70,68,64],wi:1},
  acoustic:{n:"原聲吉他",f:"bal",tr:[62,60,58,56,55,56,56,54]},
  oriental:{n:"東方國樂融合",f:"oth",tr:[35,38,40,44,52,66,64,58]},
};
const GOOD=[["girlcrush","trap"],["edmpop","futurebass"],["disco","synthpop"],["citypop","synthpop"],["tropical","moombah"],["rnb","trap"],["poprock","bubblegum"],["orchestral","girlcrush"],["oriental","girlcrush"],["njs","bubblegum"],["house","rnb"],["drill","girlcrush"],["latin","edmpop"],["dreampop","synthpop"],["disco","njs"],["oriental","trap"],["acoustic","fresh"],["futurebass","fresh"]];
const BAD=[["ballad","trap"],["ballad","drill"],["ballad","boombap"],["acoustic","drill"],["acoustic","trap"],["acoustic","edmpop"],["orchestral","bubblegum"],["drill","fresh"],["drill","bubblegum"]];
const pairIn=(list,a,b)=>list.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
/* 製作團隊(原創名,以現實的製作人類型為原型) */
const PRODS={
  kinyo:{n:"金曜工作室",lv:4,s:"甜美系金牌作曲組,擅長洗腦副歌",g:["bubblegum","fresh","edmpop","disco"]},
  light:{n:"Lighthouse",lv:5,s:"頂流嘻哈製作人,很挑合作對象",g:["girlcrush","trap","drill","boombap"]},
  neon:{n:"霓虹樂章",lv:4,s:"電子舞曲團隊,節拍與 drop 很強",g:["tropical","moombah","futurebass","edmpop"]},
  velvet:{n:"天鵝絨實驗室",lv:5,s:"實驗電子與 R&B,作品口碑高但不一定好紅",g:["synthpop","house","rnb","dreampop"]},
  nordic:{n:"北境作曲營",lv:4,s:"歐洲作曲家營,旋律工整國際感強",g:["edmpop","futurebass","synthpop","poprock"]},
  dawn:{n:"白晝聲響",lv:4,s:"復古曲風專門,80 年代質感",g:["disco","citypop","njs","synthpop"]},
  pear:{n:"梨花棧",lv:4,s:"抒情名家,擅長寫高音段落",g:["ballad","rnbballad","acoustic","orchestral"]},
  kuro:{n:"黑潮製作",lv:3,s:"新銳嘻哈團隊,便宜好溝通",g:["trap","drill","rnb"]},
  east:{n:"東韻工坊",lv:3,s:"國樂與管弦編曲",g:["oriental","orchestral","ballad"]},
  sunset:{n:"夕光律動",lv:3,s:"拉丁與熱帶節奏",g:["latin","moombah","tropical"]},
  tree:{n:"單木音樂",lv:3,s:"樂團編制,現場感強",g:["poprock","citypop","acoustic"]},
  rookie:{n:"公司內部新人",lv:2,s:"什麼都能做,但都不頂尖",g:Object.keys(GENRES)},
};
const MOODS=["甜蜜","清涼","狂野","神祕","悲傷","自信","療癒"];
const YEARS=[2015,2016,2017,2018,2019,2020,2021,2022];
const RTYPES={digital:{n:"數位單曲",min:1,max:1,wk:3,sale:.3},single:{n:"單曲專輯",min:2,max:3,wk:5,sale:.6},mini:{n:"迷你專輯",min:4,max:6,wk:8,sale:1},full:{n:"正規專輯",min:8,max:12,wk:12,sale:1.5}};

/* 結構樣板 */
const L=(t,s,d,k)=>({t,s,d,k:!!k,who:[]});
const INST={"前奏":10,"主歌一":4,"主歌二":4,"導歌":2,"副歌":2,"後副歌":12,"舞蹈段":14,"橋段":6,"最後副歌":4,"尾奏":10};
const instOf=sec=>sec.inst??INST[sec.n]??2;
const IDEAL=[210,205,200,195,190,185,175,170]; // 各年份主打歌的常見長度(秒)
const fmt=t=>`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,"0")}`;
function lengthOf(T){const v=T.secs.reduce((x,s)=>x+s.lines.reduce((y,l)=>y+(+l.s||0),0),0), i=T.secs.reduce((x,s)=>x+instOf(s),0);return {v,i,t:v+i}}
function template(gen){
  const fam=GENRES[gen]?.f||"pop";
  const chorus=()=>[L("main",5,3),L("main",5,3),L("main",5,3),L("high",4,4)];
  let secs;
  if(fam==="bal") secs=[
    {n:"前奏",lines:[L("harm",5,2)]},
    {n:"主歌一",lines:[L("main",5,2),L("main",5,2),L("main",5,3),L("main",5,2)]},
    {n:"導歌",lines:[L("main",5,3),L("high",4,4)]},
    {n:"副歌",chorus:1,lines:[L("main",5,3),L("main",5,3),L("main",5,3),L("high",4,4)]},
    {n:"主歌二",lines:[L("main",5,2),L("main",5,3),L("main",5,2),L("main",5,3)]},
    {n:"副歌",chorus:1,lines:[L("main",5,3),L("main",5,3),L("main",5,3),L("high",4,4)]},
    {n:"橋段",lines:[L("main",5,4),L("high",6,5)]},
    {n:"最後副歌",chorus:1,lines:[L("main",5,3),L("main",5,3),L("adlib",4,4),L("high",5,5)]},
    {n:"尾奏",lines:[L("harm",5,2)]}];
  else{ const hip=fam==="hip", rnb=fam==="rnb";
    secs=[
    {n:"前奏",lines:[hip?L("spoken",3,1):L("adlib",3,2)]},
    {n:"主歌一",lines:hip?[L("rap",5,3),L("rap",5,3),L("main",5,2),L("main",5,2)]:[L("main",5,2),L("main",5,2),L("main",5,3),L("main",5,2)]},
    {n:"導歌",lines:[L("main",5,3),L(rnb?"harm":"main",4,3)]},
    {n:"副歌",chorus:1,lines:chorus()},
    {n:hip?"舞蹈段":"後副歌",lines:[L("spoken",4,1)]},
    {n:"主歌二",lines:rnb?[L("main",5,3),L("rap",5,3),L("main",5,2),L("adlib",4,3)]:[L("rap",5,3),L("rap",5,hip?4:3),L("main",5,2),L("main",5,2)]},
    {n:"導歌",lines:[L("main",5,3),L("main",5,3)]},
    {n:"副歌",chorus:1,lines:chorus()},
    {n:"橋段",lines:hip?[L("rap",5,4),L("high",4,5)]:[L("main",5,3),L("high",4,5)]},
    {n:"最後副歌",chorus:1,lines:[...chorus(),L("adlib",3,4)]},
    {n:"尾奏",lines:[L("spoken",3,1)]}]; }
  const ch=secs.find(s=>s.chorus); ch.lines[2].k=true; return secs;
}
let tid=0; const newTrack=(name,gen)=>({id:"t"+Date.now().toString(36)+(tid++),name,g:[gen,"",""],mood:"自信",prod:"kinyo",choreo:3,secs:template(gen)});

/* 狀態(由外層載入) */
let R=null;
function fresh(){
  const a=newTrack("Crimson Lullaby","girlcrush"); a.g=["girlcrush","orchestral",""]; a.mood="神祕"; a.prod="light"; a.choreo=4;
  const b=newTrack("Paper Moon","citypop"); b.g=["citypop","synthpop",""]; b.mood="療癒"; b.prod="dawn"; b.choreo=2;
  return {name:"NOCTURNE",type:"single",year:2016,month:10,tracks:[a,b],title:a.id,cur:a.id,shareMode:"song"};
}
const cur=()=>R.tracks.find(t=>t.id===R.cur)||R.tracks[0];
/* 計算 */
const req=d=>30+d*12;
function ability(m,t,kill){
  let a = t==="rap"?m.rap : t==="spoken"?(m.expr+m.dance)/2 : t==="adlib"?(m.vocal+m.expr)/2 : m.vocal;
  if(t!=="spoken"&&m.kor<100) a*=.75+.25*m.kor/100;
  if(kill) a=a*.4+(m.expr+m.dance)/2*.6;
  return a;
}
function lineScore(l){
  if(!l.who.length) return null;
  const ms=l.who.map(byId); const a=ms.reduce((x,m)=>x+ability(m,l.t,l.k),0)/ms.length+(ms.length>1?5:0);
  return {s:Math.min(1.1,a/req(l.d))*100, w:l.t==="harm"?.6:1};
}
function genreInfo(T){
  const gs=T.g.filter(Boolean); const yi=YEARS.indexOf(+R.year); const p=gs[0];
  let trend=GENRES[p].tr[yi]; const sec=gs.slice(1);
  if(sec.length) trend=trend*.6+sec.reduce((x,g)=>x+GENRES[g].tr[yi],0)/sec.length*.4;
  let combo=0; const notes=[];
  for(let i=0;i<gs.length;i++) for(let j=i+1;j<gs.length;j++){
    if(pairIn(GOOD,gs[i],gs[j])){combo+=6;notes.push(["g",`${GENRES[gs[i]].n} × ${GENRES[gs[j]].n} 是很搭的組合。`])}
    else if(pairIn(BAD,gs[i],gs[j])){combo-=9;notes.push(["w",`${GENRES[gs[i]].n} 和 ${GENRES[gs[j]].n} 很難融合,聽起來會打架。`])}
    else combo-=2;
  }
  const P=PRODS[T.prod]; const fit=gs.map((g,i)=>(P.g.includes(g)?1:.62)*(i===0?.6:.4/(gs.length-1||1)));
  const prodFit=Math.min(100,P.lv*20*fit.reduce((x,v)=>x+v,0)/(gs.length>1?1:.6));
  const miss=gs.filter(g=>!P.g.includes(g));
  if(miss.length) notes.push(["w",`${P.n}不擅長${miss.map(g=>GENRES[g].n).join("、")},製作品質打折。`]);
  return {gs,trend:Math.max(0,Math.min(100,trend+combo)),prodFit,notes,P};
}
function computeTrack(T){
  const all=T.secs.flatMap((sec,si)=>sec.lines.map((l,li)=>({...l,si,li,sec})));
  const total=all.reduce((x,l)=>x+(+l.s||0),0)||1;
  const secOf={}, growth={}, flags={}; M.forEach(m=>{secOf[m.id]=0;growth[m.id]={vocal:0,rap:0,expr:0};flags[m.id]=[]});
  let q=0,qw=0,risk=0,empty=0; const warns=[];
  for(const l of all){
    const sc=lineScore(l); if(!sc){empty+=+l.s;continue}
    l.who.forEach(id=>secOf[id]+=(+l.s)/l.who.length);
    q+=sc.s*(+l.s)*sc.w; qw+=(+l.s)*sc.w;
    for(const id of l.who){const m=byId(id),a=ability(m,l.t,l.k),r=req(l.d);
      const k=l.t==="rap"?"rap":l.t==="spoken"?"expr":"vocal"; growth[id][k]+=(+l.s)/l.who.length*(a<r?1.6:1);
      if(a<r-6&&l.d>=4){risk+=(+l.s)*(r-a)/r*(1+(T.choreo-1)*.3);flags[id].push(`${l.sec.n}的${TYPES[l.t]}`)}}
  }
  const quality=qw?q/qw:0;
  const shares={}; M.forEach(m=>shares[m.id]=secOf[m.id]/total);
  const fairness=Math.max(0,Math.min(100,100-M.reduce((x,m)=>x+Math.abs(shares[m.id]-m.exp),0)*180));
  let run=1,maxRun=1,runWho=null,prev=null;
  for(const l of all){const k=l.who.length===1?l.who[0]:null;if(k&&k===prev){run++;if(run>maxRun){maxRun=run;runWho=k}}else run=1;prev=k}
  const variety=Math.max(0,100-Math.max(0,maxRun-2)*14);
  const live=Math.max(0,100-risk*2.2);
  const G=genreInfo(T);
  let season=0; const mo=+R.month, gp=GENRES[G.gs[0]];
  if(gp.su&&mo>=6&&mo<=8) season+=5; if(gp.wi&&(mo>=10||mo<=1)) season+=5;
  if(T.mood==="清涼"&&mo>=6&&mo<=8) season+=3; if(T.mood==="清涼"&&(mo>=11||mo<=2)) season-=4;
  const kills=all.filter(l=>l.k), killer=kills[0]?.who||[];
  const LN=lengthOf(T), ideal=IDEAL[YEARS.indexOf(+R.year)]+(GENRES[G.gs[0]].f==="bal"?25:0), off=LN.t-ideal;
  const lenAdj=-Math.min(6,Math.max(0,Math.abs(off)-20)/6);
  let score=quality*.32+G.trend*.22+G.prodFit*.18+fairness*.12+variety*.08+live*.08+season+lenAdj;
  if(empty) score-=Math.min(25,empty/total*60);
  score=Math.max(0,Math.min(100,score));
  if(empty) warns.push(["b",`還有 ${Math.round(empty)} 秒沒分配,先補齊才能錄音。`]);
  if(!kills.length) warns.push(["w","還沒指定 killing part,沒有記憶點的歌很難爆紅。"]);
  if(killer.length>1) warns.push(["w","killing part 由多人一起唱,記憶點會被稀釋。"]);
  M.forEach(m=>{ if(!secOf[m.id]) warns.push(["b",`${m.n}一句都沒有,個人粉一定會炸鍋。`]);
    else if(shares[m.id]<m.exp-.08) warns.push(["w",`${m.n}只有 ${Math.round(shares[m.id]*100)}%,比她的定位應有的少很多。`]);
    if(shares[m.id]>m.exp+.1) warns.push(["w",`${m.n}占了 ${Math.round(shares[m.id]*100)}%,會被說公司偏心。`]); });
  if(maxRun>3) warns.push(["w",`${byId(runWho).n}連續獨唱 ${maxRun} 句,聽起來會單調。`]);
  if(risk>8) warns.push(["b","高難度句交給了還撐不住的成員,打歌現場容易出狀況。"]);
  warns.push(...G.notes);
  if(off>20) warns.push(["w",`全長 ${fmt(LN.t)},比 ${R.year} 年常見的 ${fmt(ideal)} 長,聽眾容易在副歌重複時跳歌。`]);
  if(off<-20) warns.push(["w",`全長 ${fmt(LN.t)},比 ${R.year} 年常見的 ${fmt(ideal)} 短,會被說誠意不足。`]);
  if(season>0) warns.push(["g","發行時機和曲風很搭,季節加分。"]);
  if(season<0) warns.push(["w","清涼的歌在冬天發,氣氛不對。"]);
  if(G.trend>=80) warns.push(["g",`${R.year} 年這個曲風組合正流行,順風。`]);
  if(G.trend<50) warns.push(["w",`${R.year} 年這個曲風不太流行,要靠作品本身撐。`]);
  return {LN,ideal,all,total,secOf,shares,quality,fairness,variety,live,trend:G.trend,prodFit:G.prodFit,season,score,warns,growth,flags,killer,center:T.secs.find(s=>s.chorus)?.c};
}
const rankText=v=>v>=88?"音源冠軍候補":v>=78?"前十名":v>=68?"前三十名":v>=56?"百名內邊緣":"可能進不了榜";
function computeRelease(){
  const RT=RTYPES[R.type]; const res=R.tracks.map(T=>({T,c:computeTrack(T)}));
  const title=res.find(x=>x.T.id===R.title)||res[0]; const others=res.filter(x=>x!==title);
  const bAvg=others.length?others.reduce((a,x)=>a+x.c.score,0)/others.length:null;
  const secAll={}; M.forEach(m=>secAll[m.id]=res.reduce((a,x)=>a+x.c.secOf[m.id],0));
  const totAll=Object.values(secAll).reduce((a,b)=>a+b,0)||1; const sharesAll={}; M.forEach(m=>sharesAll[m.id]=secAll[m.id]/totAll);
  const fams=new Set(R.tracks.map(T=>GENRES[T.g[0]].f)), prim=new Set(R.tracks.map(T=>T.g[0]));
  const w=[];
  const n=R.tracks.length;
  if(n<RT.min) w.push(["b",`${RT.n}至少要 ${RT.min} 首,現在只有 ${n} 首。`]);
  if(n>RT.max) w.push(["b",`${RT.n}最多 ${RT.max} 首,現在有 ${n} 首。`]);
  let cohesion=0;
  if(n>=3&&prim.size===1){cohesion=-4;w.push(["w","每首都是同一個曲風,整張聽起來會單調。"])}
  else if(n>=3&&fams.size>=4){cohesion=-4;w.push(["w","曲風跳太多,專輯概念不夠統一。"])}
  else if(n>=3){cohesion=3;w.push(["g","收錄曲風有變化又不失統一,專輯完整度不錯。"])}
  const albumDev=M.reduce((x,m)=>x+Math.abs(sharesAll[m.id]-m.exp),0);
  if(n>1&&albumDev<.2&&title.c.fairness<60) w.push(["g","主打分量不均,但收錄曲有幫其他成員補回來,粉絲比較能接受。"]);
  const quality=bAvg==null?title.c.score:title.c.score*.7+bAvg*.3;
  const sales=Math.round((quality+cohesion)*RT.sale*100)/100;
  const salesTxt=sales>=120?"爆量":sales>=85?"很好":sales>=55?"中等":sales>=30?"偏少":"很少";
  return {RT,res,title,bAvg,sharesAll,secAll,w,quality:quality+cohesion,salesTxt};
}


/* 建議分配 */
function suggest(T){
  const lines=T.secs.flatMap(s=>s.lines), tot=lines.reduce((x,l)=>x+(+l.s),0);
  const got={}; M.forEach(m=>got[m.id]=0); let prev=null,run=0; lines.forEach(l=>l.who=[]);
  const last=T.secs[T.secs.length-2];
  for(const sec of T.secs) for(const l of sec.lines){
    if(sec===last&&l===sec.lines[sec.lines.length-1]&&l.t!=="spoken"){l.who=M.map(m=>m.id);M.forEach(m=>got[m.id]+=(+l.s)/5);prev=null;continue}
    let best=null,bv=-1e9;
    for(const m of M){const a=ability(m,l.t,l.k),fit=Math.min(1.15,a/req(l.d)),over=(got[m.id]+(+l.s))/tot-m.exp;
      let v=fit*100-Math.max(0,over)*320+Math.max(0,-over)*240; if(m.id===prev&&run>=2) v-=60; if(l.t==="rap"&&m.rap<45) v-=40;
      if(v>bv){bv=v;best=m}}
    l.who=[best.id]; got[best.id]+=(+l.s); run=best.id===prev?run+1:1; prev=best.id;
  }
  T.secs.forEach(s=>{if(s.chorus&&!s.c) s.c="he"});
}


function songSummary(){const T=R.tracks.find(x=>x.id===R.title)||R.tracks[0]; const C=computeTrack(T); const hl={};
  T.secs.forEach(sec=>sec.lines.forEach(l=>{if(l.t==="high") l.who.forEach(id=>hl[id]=(hl[id]||0)+1)}));
  return {title:{name:T.name||"未命名",score:C.score,killer:C.killer[0]||"",center:C.center||"",highLines:hl,genre:T.g[0],mood:T.mood},release:R.name,type:R.type,tracks:R.tracks.map(x=>x.name).filter(Boolean)}}

/* ---------- 存檔與雲端(users/{uid}/songs/state,與歌曲企劃室同一份) ---------- */
const SKEY="kpopGame.songs";
try{R=JSON.parse(localStorage.getItem(SKEY))||null}catch(e){R=null}
if(!R||!Array.isArray(R.tracks)||!R.tracks.length) R=fresh();
let AVS=null, pushT=0, dirty=false;
function save(bump=true){ if(bump){R.updatedAt=Date.now(); dirty=true; clearTimeout(pushT); pushT=setTimeout(()=>push(),4000)} try{localStorage.setItem(SKEY,JSON.stringify(R))}catch(e){} }
async function push(){
  if(!syAuth()||!syCfg()) return;
  try{ const t=await syToken();
    await syJSON(syBase()+"/songs/state",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},
      body:JSON.stringify({fields:{json:{stringValue:JSON.stringify({release:R,avatars:AVS||{},summary:songSummary()})},updatedAt:{integerValue:String(R.updatedAt||Date.now())}}})});
    dirty=false }catch(e){}
}
async function sync(){
  if(!syAuth()||!syCfg()) return;
  const d=await syGet("songs/state"); const remoteAt=d?+d.fields.updatedAt.integerValue:0, localAt=+(R.updatedAt||0);
  if(d){ try{const o=JSON.parse(d.fields.json.stringValue); AVS=o.avatars||{}; if(remoteAt>localAt&&o.release?.tracks?.length){R=o.release;R.updatedAt=remoteAt;save(false);if(OPEN)render()}}catch(e){} }
  if(localAt>remoteAt||!d) await push();
}
(window.SYNC_HOOKS=window.SYNC_HOOKS||[]).push(sync);

/* =====================================================================
   畫面:企劃室(2F,製作人的辦公桌)與錄音室(3F,混音台)
   ===================================================================== */
let OPEN=null;
const face=id=>`<span class="sface" style="--c:${byId(id).c};background-image:url(${spr(id,null,"neutral")})"></span>`;
function shell(){
  if($("#songFac")) return;
  const el=document.createElement("section"); el.id="songFac"; el.className="fac-wrap hide";
  el.innerHTML=`<div class="fac-bg"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small id="sfSub"></small><b id="sfTitle"></b></div>
      <nav class="fac-tabs"><button data-sf="planning">企劃室</button><button data-sf="concert" hidden>演唱會</button><button data-sf="recording">錄音室</button></nav>
      <button class="fac-close" id="sfClose">離開</button></header>
    <div class="fac-body" id="sfBody"></div>`;
  $("#stage").appendChild(el);
  el.querySelectorAll("[data-sf]").forEach(b=>b.onclick=()=>open(b.dataset.sf));
  $("#sfClose").onclick=close;
}
function open(kind){ shell(); OPEN=kind; setPause("song",true);
  const el=$("#songFac"); const was=el.classList.contains("hide"); el.className="fac-wrap "+(kind==="recording"?"th-studio":"th-office")+(was?" hide":""); void el.offsetWidth; el.classList.remove("hide");
  el.querySelector(".fac-bg").style.backgroundImage=`url(assets/bg/${kind==="recording"?"studio":"office"}_${SLOTS[S.slot].light}.webp)`;
  $("#sfTitle").textContent=kind==="planning"?"企劃室":kind==="concert"?"演唱會企劃":"錄音室"; $("#sfSub").textContent=kind==="recording"?"COMPANY ・ 3F ・ RECORDING":kind==="concert"?"COMPANY ・ 2F ・ CONCERT":"COMPANY ・ 2F ・ PLANNING";
  const ct=el.querySelector('[data-sf="concert"]'); if(ct) ct.hidden=!(window.concertUnlocked?.()||S.concertNext);
  el.querySelectorAll("[data-sf]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.sf===kind)));
  render() }
function close(){ $("#songFac").classList.add("hide"); setPause("song",false); OPEN=null; if(dirty) push() }
const syncSkill=()=>{ const k=window.gameSkill?.(); if(!k) return; for(const m of M){ const s=k[m.id]; if(!s) continue; for(const f of ["vocal","dance","rap","expr","kor"]) if(m[f]!=null&&s[f]!=null) m[f]=Math.round(s[f]) } };
function render(){ if(!OPEN) return; syncSkill(); OPEN==="planning"?renderPlan():OPEN==="concert"?window.concertPlanRender?.($("#sfBody"),render):renderRec() }
const note=([k,t])=>`<li class="sn ${k}">${t}</li>`;

/* ---------- 企劃室 ---------- */
function syncRelease(){ const G=window; if(!G.promoInfo) return null; const st=GS(); let day=null;
  if(G.DEBUT_DAY-st.day>0) day=G.DEBUT_DAY; else if(st.comeback!=null) day=st.comeback;
  if(day!=null){ const d=dateOf(day); if(+R.year!==d.getFullYear()||+R.month!==d.getMonth()+1){ R.year=d.getFullYear(); R.month=d.getMonth()+1; save() } }
  return day }
function renderPlan(){
  const fixed=syncRelease();
  const RL=computeRelease(), T=cur(), C=RL.res.find(x=>x.T.id===T.id).c, P=PRODS[T.prod], RT=RTYPES[R.type];
  const tot=R.tracks.reduce((a,x)=>a+lengthOf(x).t,0);
  $("#sfBody").innerHTML=`<div class="pdesk">
  <div class="pcol paper">
    <h3>這次發行</h3>
    <input class="pin-in big" id="pName" value="${esc(R.name)}" aria-label="專輯或單曲名稱" placeholder="發行名稱">
    <p class="psub">${RT.n}・${R.tracks.length} 首・總長 ${fmt(tot)}・準備期約 ${RT.wk} 週</p>
    <div class="pchips">${Object.entries(RTYPES).map(([k,t])=>`<button class="pchip${R.type===k?" on":""}" data-rt="${k}">${t.n}<small>${t.min===t.max?t.min:t.min+"~"+t.max} 首</small></button>`).join("")}</div>
    <div class="prow"><label>發行<select id="pYear" ${fixed!=null?"disabled":""}>${YEARS.map(y=>`<option ${+R.year===y?"selected":""}>${y}</option>`).join("")}</select>年</label>
      <label><select id="pMonth" ${fixed!=null?"disabled":""}>${[...Array(12)].map((_,i)=>`<option value="${i+1}" ${+R.month===i+1?"selected":""}>${i+1}</option>`).join("")}</select>月</label>${fixed!=null?`<small class="psub">跟著${fixed===window.DEBUT_DAY?"出道日":"回歸日"}</small>`:""}</div>
    <h4>曲目</h4>
    <div class="tapes">${R.tracks.map((x,i)=>{const c=RL.res.find(r=>r.T.id===x.id).c;return `<button class="tape${x.id===R.cur?" on":""}" data-tk="${x.id}">
      <span class="tno">${String(i+1).padStart(2,"0")}</span><span class="tnm">${esc(x.name||"未命名")}${x.id===R.title?`<i class="stamp">主打</i>`:""}</span>
      <span class="tg">${GENRES[x.g[0]].n}</span><span class="tsc">${Math.round(c.score)}</span></button>`}).join("")}
      ${R.tracks.length<RT.max?`<button class="tape add" id="pAdd">+ 新增曲目</button>`:""}</div>
    ${releaseBox()}
  </div>
  <div class="pcol paper">
    <h3>曲目企劃</h3>
    <div class="prow"><input class="pin-in" id="pSong" value="${esc(T.name)}" placeholder="輸入歌名(不參與評分)" aria-label="歌名">
      <button class="pbtn" id="pTitle" ${R.title===T.id?"disabled":""}>${R.title===T.id?"這首是主打":"設為主打"}</button><button class="pbtn ghost" id="pDel" ${R.tracks.length<=1?"disabled":""}>刪除</button></div>
    <h4>曲風</h4>
    <div class="prow3">${[0,1,2].map(i=>`<label>${["主曲風","混合一","混合二"][i]}<select data-g="${i}">${(i?`<option value="">(不混合)</option>`:"")+Object.entries(FAM).map(([f,fn])=>`<optgroup label="${fn}">${Object.entries(GENRES).filter(([,g])=>g.f===f).map(([k,g])=>`<option value="${k}" ${T.g[i]===k?"selected":""}>${g.n}</option>`).join("")}</optgroup>`).join("")}</select></label>`).join("")}</div>
    <h4>情緒</h4>
    <div class="pchips">${MOODS.map(m=>`<button class="pchip sm${T.mood===m?" on":""}" data-mood="${m}">${m}</button>`).join("")}</div>
    <h4>製作團隊</h4>
    <div class="prods">${Object.entries(PRODS).map(([k,p])=>{const fit=T.g.filter(Boolean).every(g=>p.g.includes(g));return `<button class="prod${T.prod===k?" on":""}" data-prod="${k}">
      <b>${p.n}</b><span class="star">${"★".repeat(p.lv)}${"☆".repeat(5-p.lv)}</span><small>${p.s}</small>${fit?`<i class="fit">擅長這個曲風</i>`:""}</button>`}).join("")}</div>
    <h4>編舞強度 <span class="num">${T.choreo}</span></h4>
    <input type="range" min="1" max="5" step="1" value="${T.choreo}" id="pChoreo" aria-label="編舞強度">
    <div class="prow"><button class="pbtn pri" id="pGoRec">到錄音室分配歌詞 →</button></div>
  </div>
  <div class="pcol">
    <div class="board"><div><b>${rankText(RL.title.c.score)}</b><span>主打音源預估</span></div><div><b>${RL.salesTxt}</b><span>實體銷量</span></div>
      <div><b class="num">${Math.round(RL.quality)}</b><span>整張完成度</span></div><div><b class="num">${RL.bAvg==null?"–":Math.round(RL.bAvg)}</b><span>收錄曲平均</span></div></div>
    <h3 class="lite">製作會議筆記</h3>
    <ul class="notes">${(RL.w.length?RL.w:[["g","形式和曲目數都沒問題。"]]).map(note).join("")}${C.warns.filter(([,t])=>!/秒沒分配|一句都沒有|只有 \d+%|占了|連續獨唱|killing part|高難度/.test(t)).map(note).join("")}</ul>
  </div></div>`;
  const B=$("#sfBody");
  $("#pName").oninput=e=>{R.name=e.target.value;save()};
  B.querySelectorAll("[data-rt]").forEach(b=>b.onclick=()=>{R.type=b.dataset.rt;save();render()});
  $("#pYear").onchange=e=>{R.year=+e.target.value;save();render()}; $("#pMonth").onchange=e=>{R.month=+e.target.value;save();render()};
  B.querySelectorAll("[data-tk]").forEach(b=>b.onclick=()=>{R.cur=b.dataset.tk;save(false);render()});
  const add=$("#pAdd"); if(add) add.onclick=()=>{const N=newTrack("",cur().g[0]);suggest(N);R.tracks.push(N);R.cur=N.id;save();render();$("#pSong").focus()};
  $("#pSong").oninput=e=>{cur().name=e.target.value;save()}; $("#pSong").onchange=()=>render();
  $("#pTitle").onclick=()=>{R.title=R.cur;save();render()};
  $("#pDel").onclick=()=>{ if(R.tracks.length<=1||!confirm("確定刪除這首?")) return; const i=R.tracks.findIndex(t=>t.id===R.cur); R.tracks.splice(i,1);
    if(R.title===R.cur) R.title=R.tracks[0].id; R.cur=R.tracks[Math.max(0,i-1)].id; save(); render() };
  B.querySelectorAll("[data-g]").forEach(e=>e.onchange=()=>{const T=cur(),i=+e.dataset.g;T.g[i]=e.value; if(i===0){if(T.g[1]===T.g[0])T.g[1]="";if(T.g[2]===T.g[0])T.g[2]=""} if(T.g[2]&&!T.g[1]){T.g[1]=T.g[2];T.g[2]=""} save();render()});
  B.querySelectorAll("[data-mood]").forEach(b=>b.onclick=()=>{cur().mood=b.dataset.mood;save();render()});
  B.querySelectorAll("[data-prod]").forEach(b=>b.onclick=()=>{cur().prod=b.dataset.prod;save();render()});
  $("#pChoreo").oninput=e=>{cur().choreo=+e.target.value;save();e.target.previousElementSibling.querySelector(".num").textContent=e.target.value}; $("#pChoreo").onchange=()=>render();
  $("#pGoRec").onclick=()=>open("recording");
  const cs=$("#cbSet"); if(cs) cs.onclick=()=>{ const v=$("#cbDate").value; if(!v) return; const day=dayOfIso(v);
    if(day<GS().day+14){toast2("回歸日至少要在兩週以後");return} window.setComeback(day); render() };
  const cc=$("#cbClear"); if(cc) cc.onclick=()=>{ window.gameState().comeback=null; toast2("已取消回歸日"); render() };
}

/* ---------- 回歸日(出道日固定,之後由代表決定) ---------- */
function releaseBox(){ const G=window; if(!G.promoInfo) return "";
  const P=G.promoInfo(), dd=G.DEBUT_DAY-GS().day;
  if(dd>0) return `<h4>發行日</h4><div class="relbox"><b>出道日 2017/7/13</b><span>${G.debutText()}・這張是出道作品,出道當天開始四週宣傳期</span></div>`;
  if(P?.active) return `<h4>發行日</h4><div class="relbox live"><b>宣傳期進行中</b><span>到 ${G.fmtGameDay(P.end)} 為止,結束後就能決定下一次回歸</span></div>`;
  const cb=GS().comeback, min=GS().day+14, sug=P?Math.max(min,P.end+42):min;
  return `<h4>下一次回歸</h4><div class="relbox">${cb!=null?`<b>回歸日 ${G.fmtGameDay(cb)}</b><span>還有 ${cb-GS().day} 天。當天會舉行回歸 Showcase,接著四週宣傳期</span><div class="prow"><button class="pbtn ghost" id="cbClear">取消回歸日</button></div>`
    :`<span>${P?`上一次宣傳期在 ${G.fmtGameDay(P.end)} 結束。`:""}建議留至少 6 週準備(${G.fmtGameDay(sug)} 以後),新歌和打歌服都準備好再回歸。</span>
      <div class="prow"><input type="date" id="cbDate" min="${isoOf(min)}" value="${isoOf(sug)}"><button class="pbtn pri" id="cbSet">定為回歸日</button></div>`}</div>` }
const GS=()=>window.gameState?window.gameState():{day:0};
const isoOf=day=>{const d=dateOf(day);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const dayOfIso=v=>{const [y,m,d]=v.split("-").map(Number); return Math.round((new Date(y,m-1,d)-dateOf(0))/864e5)};

/* ---------- 錄音室 ---------- */
function fillOf(l){ if(!l.who.length) return null; if(l.who.length===1) return byId(l.who[0]).c; const n=l.who.length;
  return `linear-gradient(90deg,${l.who.map((id,i)=>`${byId(id).c} ${i/n*100}% ${(i+1)/n*100}%`).join(",")})` }
function renderRec(){
  const RL=computeRelease(), T=cur(), C=RL.res.find(x=>x.T.id===T.id).c, isT=R.title===T.id;
  const blocks=[]; let lastSi=-1;
  for(const l of C.all){ if(l.si!==lastSi){lastSi=l.si; const ins=instOf(T.secs[l.si]); if(ins>0) blocks.push(`<span class="blk inst" style="flex-grow:${ins}"></span>`)} blocks.push(l) }
  const rel=R.shareMode==="rel", sh=rel?RL.sharesAll:C.shares, sc=rel?RL.secAll:C.secOf;
  $("#sfBody").innerHTML=`<div class="rtop"><div class="rtapes">${R.tracks.map((x,i)=>`<button class="rtape${x.id===R.cur?" on":""}" data-tk="${x.id}">${String(i+1).padStart(2,"0")} ${esc(x.name||"未命名")}${x.id===R.title?" ・主打":""}</button>`).join("")}</div>
    <span class="rlen">全長 <b>${fmt(C.LN.t)}</b>・人聲 ${fmt(C.LN.v)}・伴奏 ${fmt(C.LN.i)}・${R.year} 年常見約 ${fmt(C.ideal)}</span></div>
  <div class="ribbon"><div class="strip">${blocks.map(l=>{if(typeof l==="string") return l; const f=fillOf(l);
      return `<button class="blk${f?"":" empty"}" style="flex-grow:${l.s};${f?`background:${f}`:""}" data-go="${l.si}-${l.li}" title="${esc(l.sec.n)}・${TYPES[l.t]}・${l.s} 秒">${l.k?"<i>★</i>":""}</button>`}).join("")}</div>
    <div class="secs">${T.secs.map(sec=>`<span style="flex-grow:${sec.lines.reduce((x,l)=>x+(+l.s),0)+instOf(sec)}">${esc(sec.n)}</span>`).join("")}</div></div>
  <div class="rgridx">
    <div class="console" id="rEd">
      <div class="rbtns"><button class="cbtn pri" id="rSug">建議分配</button><button class="cbtn" id="rClr">清空分配</button><button class="cbtn" id="rRst">依主曲風重設結構</button></div>
      ${T.secs.map((sec,si)=>`<div class="csec"><div class="chead"><b>${esc(sec.n)}</b><label>伴奏<input type="number" min="0" max="40" value="${instOf(sec)}" data-in="${si}">秒</label>
        ${sec.chorus?`<label>C 位<select data-c="${si}"><option value="">未指定</option>${M.map(m=>`<option value="${m.id}" ${sec.c===m.id?"selected":""}>${m.n}</option>`).join("")}</select></label>`:""}</div>
        ${sec.lines.map((l,li)=>`<div class="cln" id="ln-${si}-${li}">
          <select data-t="${si}-${li}" aria-label="類型">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${l.t===k?"selected":""}>${v}</option>`).join("")}</select>
          <input type="number" min="1" max="12" value="${l.s}" data-s="${si}-${li}" aria-label="秒數"><span class="u">秒</span>
          <select data-d="${si}-${li}" aria-label="難度">${[1,2,3,4,5].map(d=>`<option value="${d}" ${+l.d===d?"selected":""}>難度 ${d}</option>`).join("")}</select>
          <span class="who">${M.map(m=>{const on=l.who.includes(m.id);return `<button class="mb${on?" on":""}" data-w="${si}-${li}-${m.id}" style="--c:${m.c}" aria-pressed="${on}" title="${m.n}">${m.n[0]}</button>`}).join("")}</span>
          <button class="kill${l.k?" on":""}" data-k="${si}-${li}" title="killing part">★</button><button class="del" data-x="${si}-${li}" title="刪除這句">×</button></div>`).join("")}
        <button class="addl" data-a="${si}">+ 加一句</button></div>`).join("")}
    </div>
    <div class="cside">
      <div class="cscore"><b class="num">${Math.round(C.score)}</b><div><span>${isT?rankText(C.score):"收錄曲"}</span><small>${isT?"主打歌的預估":"收錄曲影響整張完成度"}</small></div></div>
      ${[["歌曲品質",C.quality],["時代流行",C.trend],["製作團隊",C.prodFit],["分配公平",C.fairness],["聲線變化",C.variety],["現場穩定",C.live]].map(([n,v])=>`<div class="vu"><span>${n}</span><span class="vbar"><i style="width:${Math.max(0,Math.min(100,v))}%"></i></span><span class="num">${Math.round(v)}</span></div>`).join("")}
      <div class="chd"><b>分量統計</b><span class="seg"><button data-sm="song" class="${rel?"":"on"}">這首</button><button data-sm="rel" class="${rel?"on":""}">整張</button></span></div>
      ${M.map(m=>`<div class="share">${face(m.id)}<span class="strk"><i style="width:${Math.min(100,sh[m.id]*250)}%;background:${m.c}"></i><em style="left:${m.exp*250}%"></em></span><span class="num">${Math.round(sc[m.id])}秒 ${Math.round(sh[m.id]*100)}%</span></div>`).join("")}
      <div class="chd"><b>成員反應</b></div>
      ${M.map(m=>{const d=C.shares[m.id]-m.exp,g=C.growth[m.id],fl=C.flags[m.id],kill=C.killer.includes(m.id),center=C.center===m.id;
        const mood=!C.secOf[m.id]?["dn","心情大跌"]:d<-.07?["dn","有點失落"]:d>.08?["up","很開心,但怕被說偏心"]:["","心情平穩"];
        const ls=[]; if(kill) ls.push(isT?"拿到主打的 killing part":"拿到這首的 killing part"); if(center) ls.push("副歌站 C 位"); if(fl.length) ls.push(`${fl.slice(0,2).join("、")}很吃力,但進步快`);
        const gs=Object.entries(g).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>`${{vocal:"唱功",rap:"Rap",expr:"表情管理"}[k]} +${Math.max(1,Math.round(v/6))}`);
        return `<div class="react">${face(m.id)}<div><b style="color:${m.c}">${m.n}</b> <span class="${mood[0]}">${mood[1]}</span>${gs.length?`<small>成長:${gs.join("、")}</small>`:""}${ls.map(t=>`<small>${t}</small>`).join("")}</div></div>`}).join("")}
      <div class="chd"><b>製作會議筆記</b></div><ul class="notes dark">${(C.warns.length?C.warns:[["g","目前看起來沒有明顯問題。"]]).map(note).join("")}</ul>
    </div></div>`;
  const B=$("#sfBody"), at=s=>{const [a,b]=s.split("-").map(Number);return T.secs[a].lines[b]};
  const commit=(soft)=>{save(); const y=$("#rEd")?.scrollTop||0; render(); const e=$("#rEd"); if(e) e.scrollTop=y};
  B.querySelectorAll("[data-tk]").forEach(b=>b.onclick=()=>{R.cur=b.dataset.tk;save(false);render()});
  B.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{const el=document.getElementById("ln-"+b.dataset.go); if(el){el.scrollIntoView({behavior:"smooth",block:"center"}); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),900)}});
  $("#rSug").onclick=()=>{suggest(T);commit()}; $("#rClr").onclick=()=>{T.secs.forEach(s=>s.lines.forEach(l=>l.who=[]));commit()};
  $("#rRst").onclick=()=>{if(!confirm("依主曲風重設結構,現在的分配會清掉,確定?"))return; T.secs=template(T.g[0]);commit()};
  B.querySelectorAll("[data-t]").forEach(e=>e.onchange=()=>{at(e.dataset.t).t=e.value;commit()});
  B.querySelectorAll("[data-s]").forEach(e=>e.onchange=()=>{at(e.dataset.s).s=Math.max(1,Math.min(12,+e.value||1));commit()});
  B.querySelectorAll("[data-d]").forEach(e=>e.onchange=()=>{at(e.dataset.d).d=+e.value;commit()});
  B.querySelectorAll("[data-w]").forEach(e=>e.onclick=()=>{const [a,b,id]=e.dataset.w.split("-");const l=T.secs[a].lines[b];l.who=l.who.includes(id)?l.who.filter(x=>x!==id):[...l.who,id];commit()});
  B.querySelectorAll("[data-k]").forEach(e=>e.onclick=()=>{const l=at(e.dataset.k),on=!l.k;T.secs.forEach(s=>s.lines.forEach(x=>x.k=false));l.k=on;commit()});
  B.querySelectorAll("[data-x]").forEach(e=>e.onclick=()=>{const [a,b]=e.dataset.x.split("-").map(Number);T.secs[a].lines.splice(b,1);commit()});
  B.querySelectorAll("[data-a]").forEach(e=>e.onclick=()=>{T.secs[+e.dataset.a].lines.push(L("main",4,2));commit()});
  B.querySelectorAll("[data-c]").forEach(e=>e.onchange=()=>{T.secs.forEach(s=>{if(s.chorus) s.c=e.value});commit()});
  B.querySelectorAll("[data-in]").forEach(e=>e.onchange=()=>{T.secs[+e.dataset.in].inst=Math.max(0,Math.min(40,+e.value||0));commit()});
  B.querySelectorAll("[data-sm]").forEach(b=>b.onclick=()=>{R.shareMode=b.dataset.sm;save(false);commit()});
}
window.openSongFacility=open;
window.songSummary=()=>{syncSkill(); return songSummary()};

})();
