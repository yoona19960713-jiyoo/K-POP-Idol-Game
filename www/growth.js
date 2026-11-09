"use strict";
/* =====================================================================
   養成:好感度(只升不降)、成員之間的團隊默契、能力成長、出道倒數與月評
   出道日固定 2017.01.13(改版 1.0;舊版是 2017.07.13);回歸日由玩家在企劃室決定
   ===================================================================== */
(()=>{
/* ---------- 好感度:點數制,階段門檻越後面越高 ---------- */
const pk=(a,b)=>[a,b].sort().join("-");
const capOf=(id,k)=>k==="kor"?100:(({ys:["vocal","dance"],tr:["rap","dance"],hy:["dance","expr"],he:["expr","vocal"],hr:["vocal"]})[id]||[]).includes(k)?99:95;
const XP_STAGE=[["戒備",0],["信任",1000],["夥伴",4800],["心動",12000],["戀人",20000],["親密",30000]];
const STAGE_RANK=["戒備","信任","夥伴","心動","戀人","親密","多人親密"];
window.STAGE_RANK=STAGE_RANK;
const DEBUT=new Date(2017,0,13);   // 2016.01.13 上任,一年後出道
const debutDay=Math.round((DEBUT-START)/864e5);
window.DEBUT_DAY=debutDay;
const debuted=()=>S.day>=debutDay;
const xpToTrust=x=>x<1000?x/40:x<4800?25+(x-1000)/152:x<12000?50+(x-4800)/288:Math.min(100,75+(x-12000)/320);
const trustToXp=t=>t<25?t*40:t<50?1000+(t-25)*152:t<75?4800+(t-50)*288:12000+(t-75)*320;
function migrate(){ for(const m of M){ const s=S.m[m.id]; if(s.xp==null) s.xp=Math.round(trustToXp(s.trust||0)); s.trust=Math.round(xpToTrust(s.xp)) }
  if(!S.bond){ S.bond={}; const base={"ys-tr":34,"ys-hy":40,"ys-he":44,"ys-hr":46,"tr-hy":28,"tr-he":32,"tr-hr":30,"hy-he":42,"hy-hr":38,"he-hr":48};
    for(const [k,v] of Object.entries(base)){ const [a,b]=k.split("-"); S.bond[pk(a,b)]=v } }
  else { // 舊版存檔可能有順序不同的重複鍵,合併成一個
    for(const k of Object.keys(S.bond)){ const [a,b]=k.split("-"), n=pk(a,b); if(n!==k){ S.bond[n]=Math.max(S.bond[n]||0,S.bond[k]); delete S.bond[k] } } }
  // 能力 v2:完美團體。起點已經是頂尖練習生,出道時是怪物新人,之後全方位 90、主項 99
  const START2={ys:{vocal:70,dance:70,rap:52,expr:74,kor:100},tr:{vocal:58,dance:72,rap:76,expr:70,kor:100},hy:{vocal:58,dance:78,rap:48,expr:72,kor:58},he:{vocal:62,dance:66,rap:60,expr:78,kor:100},hr:{vocal:78,dance:62,rap:50,expr:62,kor:100}};
  if(!S.skill||S.skillVer!==2){ const OLD={ys:{vocal:48,dance:46,rap:15,expr:56,kor:100},tr:{vocal:29,dance:58,rap:56,expr:54,kor:100},hy:{vocal:32,dance:64,rap:15,expr:52,kor:40},he:{vocal:36,dance:46,rap:34,expr:60,kor:100},hr:{vocal:58,dance:39,rap:15,expr:39,kor:100}};
    const prev=S.skill; S.skill={};
    for(const [id,b] of Object.entries(START2)) S.skill[id]=Object.fromEntries(Object.entries(b).map(([k,v])=>[k,Math.min(capOf(id,k),v+Math.max(0,(prev?.[id]?.[k]??OLD[id][k])-OLD[id][k]))]));   // 保留已經練出來的進步
    S.skillVer=2; S.evalSnap=JSON.parse(JSON.stringify(S.skill)) }
  if(!S.evalSnap) S.evalSnap=JSON.parse(JSON.stringify(S.skill)) }
function baseStage(id){ const s=S.m[id]; if(!s) return "戒備"; let st="戒備";
  for(const [n,v] of XP_STAGE){ if(s.xp>=v){ if(n==="心動"&&(s.heart||0)<30) break; if(n==="戀人"&&((s.heart||0)<70||!debuted())) break; if(n==="親密"&&(s.heart||0)<90) break; st=n } } return st }
/* 多人親密:自己在親密階段,而且另一位也在親密階段的成員和她默契 80 以上 */
const multiPartners=id=>M.filter(o=>o.id!==id&&baseStage(o.id)==="親密"&&bondOf(id,o.id)>=80).map(o=>o.id);
window.multiPartners=multiPartners;
window.stageOfXp=id=>{ const st=baseStage(id); return st==="親密"&&multiPartners(id).length?"多人親密":st };
window.nextStageInfo=id=>{ const s=S.m[id], cur=stageOfXp(id);
  if(cur==="多人親密") return null;
  if(cur==="親密") return {name:"多人親密",p:Math.min(1,Math.max(...M.filter(o=>o.id!==id).map(o=>bondOf(id,o.id)))/80),extra:"需要另一位成員也到「親密」,而且和她默契 80 以上"};
  const i=XP_STAGE.findIndex(x=>x[0]===cur), nx=XP_STAGE[i+1]; if(!nx) return null;
  const from=XP_STAGE[i][1], need=nx[1], p=Math.max(0,Math.min(1,(s.xp-from)/(need-from)));
  const extra=nx[0]==="心動"&&(s.heart||0)<30?"還需要更多心動的時刻":nx[0]==="戀人"&&!debuted()?"出道之後":(nx[0]==="戀人"&&(s.heart||0)<70)||(nx[0]==="親密"&&(s.heart||0)<90)?"還需要更多心動的時刻":"";
  return {name:nx[0],p,extra} };
/* 選擇的效果:回錯方式不扣分;她最喜歡的回應方式額外加分 */
const bestStyle=id=>Object.entries(PREF[id]||{}).sort((a,b)=>b[1]-a[1])[0]?.[0];
/* 好感速度(2026-10-27 使用者要求心動快一點:平均照顧五人約 8~10 個月 → 6~8 個月) */
const XP_RATE=1.3;
window.gainFromChoice=(id,c)=>{ const s=S.m[id]; if(!s) return {xp:0,heart:0};
  const p=(PREF[id]||{})[c.s]??1, g=+c.g||0, raw=g*p; let xp=0, heart=0;
  if(raw>0){ xp=Math.round(Math.min(18,raw*5)); if(c.s&&c.s===bestStyle(id)) xp+=6; xp=Math.round(xp*XP_RATE) }
  const st=stageOfXp(id);
  if(STAGE_RANK.indexOf(st)>=2||s.xp>=4800){ if(c.heart) heart=Math.max(0,Math.min(2,+c.heart)); else if(WARM.includes(c.s)&&raw>=2) heart=1 }
  return {xp,heart} };
window.applyGain=(id,c,show)=>{ const s=S.m[id]; if(!s) return 0; window.missSeen?.(id); const before=stageOfXp(id), {xp,heart}=gainFromChoice(id,c);   // 冷落的心情(miss.js)
  s.xp=(s.xp||0)+xp; s.heart=Math.min(100,(s.heart||0)+heart); s.trust=Math.round(xpToTrust(s.xp));
  if(c.mood>0) s.mood=clamp(s.mood+(+c.mood),0,100); if(c.stress<0) s.stress=clamp(s.stress+(+c.stress),0,100);   // 只套用好的方向
  if(c.set){ S.flags[c.set]=(S.flags[c.set]||0)+1; const fa=S.flagAt=S.flagAt||{}; if(fa[c.set]==null) fa[c.set]=S.day; window.memRecord?.(c.set,id,c) }   // 1.1 第 2 輪:記得你要知道是哪一天設的
  const after=stageOfXp(id); if(after!==before){ (S.stageAt=S.stageAt||{})[id+":"+after]=S.day }   // 擬真 ②:關係轉折的回想要知道哪天升上來的
  if(show){ if(xp) show(id,`好感 +${xp}`); if(heart) show(id,`心動 +${heart}`); if(after!==before) show(id,`關係進展:${after}`) }
  if(after!==before){ toast2(`${byId(id).n}和你的關係變成「${after}」了`); window.feedback?.("m") }
  return xp };

/* ---------- 團隊默契(每對成員,只會增加) ---------- */
window.addBond=(ids,v)=>{ S.bond=S.bond||{}; const u=[...new Set(ids)].filter(id=>byId(id)); for(let i=0;i<u.length;i++) for(let j=i+1;j<u.length;j++){ const k=pk(u[i],u[j]); S.bond[k]=Math.min(100,(S.bond[k]||30)+v) } };
window.bondOf=(a,b)=>S.bond?.[pk(a,b)]||30;
window.teamBond=()=>{ const v=Object.values(S.bond||{}); return v.length?v.reduce((a,b)=>a+b,0)/v.length:30 };

/* ---------- 能力成長 ---------- */
const SK={vocal:"唱功",dance:"舞蹈",rap:"Rap",expr:"表情管理",kor:"韓語"};
const MAIN={ys:["vocal","dance"],tr:["rap","dance"],hy:["dance","expr"],he:["expr","vocal"],hr:["vocal"]};
window.SKILL_NAMES=SK;
/* 改版 1.0 第 5 輪(2026-10-29):一年就出道(以前兩年),每天成長大約快一倍;主項再快一點,出道時主項約 90~95(整年模擬:r5_year.py) */
const GROW={rate:2.2,main:1.3};
function grow(id,k,v){ const s=S.skill[id]; if(!s||s[k]==null) return; const cap=capOf(id,k), T=window.GROW_TUNE||GROW, mul=(S.day<debutDay?T.rate:1.2)*(MAIN[id]?.includes(k)?T.main:1);   /* 出道後回到慢一點(打歌、演唱會的實戰經驗另外加) */
  s[k]=Math.min(cap,s[k]+v*mul*Math.max(0,1-s[k]/cap)) }
const LESSON={1:[["dance",.08]],2:[["vocal",.08]],3:[["dance",.08]],4:[["vocal",.06],["rap",.06]],5:[["dance",.04],["expr",.04]],6:["weak"]};
function dailyRoutine(){ for(const m of M) for(const k of Object.keys(SK)) grow(m.id,k,MAIN[m.id].includes(k)?.07:.06) }
function slotGrowth(){ const wd=dateOf(S.day).getDay(), sl=S.slot;
  if(sl===4) dailyRoutine();
  for(const m of M){ const w=S.where[m.id]||"";
    if(w==="practice"){grow(m.id,"dance",.03);grow(m.id,"expr",.015)}
    if(w==="studio"){grow(m.id,"vocal",.03);grow(m.id,"rap",.02)}
    if(w==="styling") grow(m.id,"expr",.012);
    if(m.id==="hy"&&!w.startsWith("bed_")) grow("hy","kor",.02);
    if(sl===2&&LESSON[wd]){ for(const L of LESSON[wd]){ if(L==="weak"){ const s=S.skill[m.id]; const k=["vocal","dance","rap","expr"].sort((a,b)=>s[a]-s[b])[0]; grow(m.id,k,.08) } else grow(m.id,L[0],L[1]) } } }
  // 一起在同一個地方的成員,默契慢慢累積
  const by={}; for(const m of M){ const w=S.where[m.id]; if(w&&!w.startsWith("bed_")&&!w.startsWith("外出")) (by[w]=by[w]||[]).push(m.id) }
  for(const ids of Object.values(by)) if(ids.length>1) addBond(ids,.04) }
/* 代表在練習室或錄音室陪練:選了好的回應,能力也跟著成長 */
window.coachGrowth=(id,place)=>{ if(place==="practice"){grow(id,"dance",.12);grow(id,"expr",.06)} else if(place==="studio"){grow(id,"vocal",.12);grow(id,"rap",.06)} };
/* 出道後:每一場打歌都是實戰經驗 */
window.growthOnShow=ids=>{ for(const id of ids){ grow(id,"vocal",.25); grow(id,"dance",.25); grow(id,"expr",.3); for(const k of MAIN[id]) grow(id,k,.15) } save(true) };
window.gameSkill=()=>S.skill;
window.growthGrow=(id,k,v)=>grow(id,k,v);   // 練習室練舞會小幅提升舞蹈

/* ---------- 月評:每月最後一個週六的下午 ---------- */
const isEvalDay=d=>{const x=new Date(d.getFullYear(),d.getMonth()+1,0); while(x.getDay()!==6) x.setDate(x.getDate()-1); if(x.getMonth()===11&&x.getDate()===31) x.setDate(30); return x.getDate()===d.getDate()};   // 12/31 是跨年夜:改到前一天(2016 年是 12/30 出道前最終評估)
window.isEvalDay=isEvalDay;
function monthlyEval(){
  const d=dateOf(S.day), rows=M.map(m=>{ const a=S.skill[m.id], b=S.evalSnap[m.id]||a; const diff=Object.keys(SK).map(k=>[k,a[k]-(b[k]||a[k])]).filter(([,v])=>v>.05).sort((x,y)=>y[1]-x[1]);
    const best=diff[0]; S.m[m.id].mood=clamp(S.m[m.id].mood+5,0,100); S.m[m.id].stress=clamp(S.m[m.id].stress-6,0,100);
    const praise=best?`${SK[best[0]]}進步最多`:"穩定維持";
    return `<div class="ev-row" style="--c:${m.c}"><span class="pface" style="--c:${m.c};background-image:url(${spr(m.id,null,"smile")})"></span><div><b>${m.n}</b><small>${praise}</small>
      <div class="ev-sk">${Object.keys(SK).filter(k=>!(k==="kor"&&a.kor>=100)).map(k=>`<span>${SK[k]} <em>${Math.round(a[k])}</em>${a[k]-(b[k]||a[k])>=.5?`<i>+${Math.round(a[k]-(b[k]||a[k]))}</i>`:""}</span>`).join("")}</div></div></div>` }).join("");
  S.evalSnap=JSON.parse(JSON.stringify(S.skill)); save(true);
  const dd=debutDay-S.day;
  const el=document.createElement("div"); el.className="evbox"; el.innerHTML=`<div class="evcard"><small>MONTHLY EVALUATION</small><h2>${d.getFullYear()} 年 ${d.getMonth()+1} 月 月評</h2>
    <p class="ev-lead">${dd>0?`距離出道還有 ${dd} 天。`:"出道後的第一次評估。"}評審老師們看完五個人的表演,給了大家這個月的評語。大家都很努力,心情和壓力都好了一些。</p>${rows}
    <button class="fbtn pri" id="evOk">知道了</button></div>`;
  $("#stage").appendChild(el); setPause("eval",true); $("#evOk").onclick=()=>{el.remove();setPause("eval",false)};
}
/* ---------- 掛進時段流程 ---------- */
window.growthOnSlotEnd=()=>{ migrate(); slotGrowth();
  if(S.slot===4) setTimeout(()=>{ window.timelineOnDayEnd?.(S.day-1); window.timelineOnDayStart?.() },50);   // 深夜結束 → 新的一天
  // 下午結束(進入晚上)時,如果是月評日就舉行月評
  if(S.slot===2&&isEvalDay(dateOf(S.day))&&S.lastEval!==S.day){ S.lastEval=S.day; setTimeout(monthlyEval,400) } };
window.growthInit=migrate;
window.debutText=()=>{ const dd=debutDay-S.day; return dd>0?`出道 D-${dd}`:dd===0?"今天出道":`出道第 ${-dd+1} 天` };
})();

/* =====================================================================
   時間軸:出道日、宣傳期(四週,打歌照日期)、回歸日(玩家自己決定)
   ===================================================================== */
(()=>{
const PROMO_LEN=28;
const SHOW_N=["SHOW PULSE","CHAMPION LIVE","COUNTDOWN","MUSIC STAGE","SHOW CORE","STAR STAGE"];
const WD_K={2:0,3:1,4:2,5:3,6:4,0:5};     // 週二~週日 對應六個節目
const promo=()=>S.promo&&S.day>=S.promo.start&&S.day<S.promo.start+PROMO_LEN?S.promo:null;
window.promoActive=()=>!!promo();
/* 某一天是宣傳期的第幾場(沒有打歌回傳 null) */
function showIdx(day,P){ const d=dateOf(day), k=WD_K[d.getDay()]; if(k==null) return null;
  const sd=dateOf(P.start), back=(sd.getDay()+5)%7;            // 宣傳期第一週的週二
  const w=Math.floor((day-(P.start-back))/7); return w*6+k }
window.promoToday=()=>{ const P=promo(); if(!P) return null; const i=showIdx(S.day,P);
  return {P,idx:i,show:i==null?null:(window.STAGE_SHOWS||SHOW_N)[i%6],week:Math.floor((S.day-P.start)/7)+1,dayN:S.day-P.start+1} };
window.promoFirstIdx=P=>{ for(let d=P.start;d<P.start+7;d++){ const i=showIdx(d,P); if(i!=null) return i } return 0 };
window.promoShowOn=day=>{ const P=S.promo; if(!P||day<P.start||day>=P.start+PROMO_LEN) return null; const i=showIdx(day,P); return i==null?null:(window.STAGE_SHOWS||SHOW_N)[i%6] };
window.promoInfo=()=>S.promo?{...S.promo,end:S.promo.start+PROMO_LEN-1,active:!!promo()}:null;
/* 回歸日:玩家在企劃室選;只提醒,不強制 */
window.setComeback=day=>{ S.comeback=day; save(true); toast2(`回歸日定在 ${fmtD(day)}`) };
const fmtD=day=>{const d=dateOf(day);return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`};
window.fmtGameDay=fmtD;
/* 專輯(2026-10-29):每次發行(出道、回歸)就是一張,a1 = 出道;最後一個是企劃室正在準備的「下一張」 */
window.albumList=()=>{ const seen=new Set(), L=[];
  for(const p of [...(S.promoHist||[]),...(S.promo?[S.promo]:[])]){ if(!p?.n||seen.has(p.n)) continue; seen.add(p.n); L.push({key:"a"+p.n,n:p.n,name:p.release||p.title||"",title:p.title||"",kind:p.kind,start:p.start}) }
  L.sort((a,b)=>a.n-b.n); const nx=(L.at(-1)?.n||0)+1, sum=window.songSummary?.();
  L.push({key:"a"+nx,n:nx,name:sum?.release||"",title:sum?.title?.name||"",upcoming:true}); return L };
window.albumName=(k,short)=>{ const a=window.albumList().find(x=>x.key===k); if(!a) return k?"(已不存在的專輯)":"未分類";
  const head=a.n===1?"出道":`第 ${a.n-1} 次回歸`, nm=a.name?`〈${a.name}〉`:""; return short?`${head}${nm}${a.upcoming?"・準備中":""}`:`${head}${nm}${a.upcoming?"(準備中)":""}` };

function startPromo(kind){ const sum=window.songSummary?songSummary():null;
  S.promo={start:S.day,kind,title:sum?.title?.name||"出道曲",release:sum?.release||"",tracks:sum?.tracks||[],n:(S.promoHist||[]).length+1}; window.songsArchive?.(S.promo.n);   // 這張專輯存進專輯紀錄   // tracks:演唱會歌單可以選收錄曲
  S.promoHist=[...(S.promoHist||[]),{...S.promo}]; window.logEvent?.("promo",{title:S.promo.title}); save(true);
  window.stageNewPromo?.(S.promo) }
function bigEvent(kind){ setTimeout(()=>window.feedback?.("l"),600); if(kind==="debut") window.cgGroupUnlock?.("g_debut");
  const deb=kind==="debut", m=M, sum=window.songSummary?songSummary():null;
  const lines0=deb?[["ys","代表,我們真的……要出道了。","laugh"],["tr","……我不會讓你後悔選了我們。","shy"],["hy","一年間、ありがとうございました!啊,是謝謝代表!","laugh"],["he","今天的 Showcase 結束之後,大家一起去吃烤肉吧!","smile"],["hr","代表要坐第一排喔!我會一直看著那裡唱!","laugh"]]
    :[["he","又回到舞台上了!","laugh"],["ys","這一次也拜託你了,代表。","smile"],["hr","新歌我練到夢裡都在唱!","laugh"],["tr","……這次的舞台,我很有信心。","smile"],["hy","みんな、がんばろう!","laugh"]];
  const lines=window.eventLines?.(deb?"debut":"comeback",lines0)||lines0;   // 內容庫有事件劇本就用
  const el=document.createElement("div"); el.className="bigev";
  el.innerHTML=`<div class="bg-shot" style="background-image:url(assets/bg/ev_showcase.webp)"></div><div class="bg-veil"></div><div class="bigcard"><small>${deb?`DEBUT SHOWCASE ・ ${(d=>`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`)(dateOf(DEBUT_DAY))}`:"COMEBACK"}</small>
    <h2>${deb?`${esc(window.groupName?.()||"完美女團")},正式出道`:`${esc(window.groupName?.()||"完美女團")} 回歸`}</h2><p class="lead">${deb?"從代表上任那天算起,整整一年的練習生生活,在這一天畫下句點。Showcase 的燈光亮起,台下坐滿了記者和第一批粉絲。":"新的企劃、新的舞台。回歸 Showcase 的燈光再次亮起。"}${sum?.title?`主打歌〈${esc(sum.title.name)}〉`:""}今天起四週的打歌期開始了,電視台正式開放。</p>
    <div class="evlines">${lines.map(([id,t,e])=>{const mm=byId(id);return `<div class="evl"><span class="pface" style="--c:${mm.c};background-image:url(${spr(id,null,e)})"></span><p><b style="color:${mm.c}">${mm.n}</b>${esc(t)}</p></div>`}).join("")}</div>
    <button class="fbtn pri" id="bigOk">${deb?"一起走下去":"上台吧"}</button></div>`;
  $("#stage").appendChild(el); setPause("bigev",true);
  $("#bigOk").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("bigev",false);
    for(const mm of m){ const s=S.m[mm.id]; s.mood=Math.min(100,s.mood+15); s.xp=(s.xp||0)+120 } addBond(M.map(x=>x.id),3); save(true); renderAll() };
}
/* 每天開始(清晨)時檢查:出道日、回歸日;每天結束時:沒去的打歌自動上台 */
window.timelineOnDayStart=()=>{
  if(S.day===DEBUT_DAY&&!S.debuted){ S.debuted=true; startPromo("debut"); setTimeout(()=>bigEvent("debut"),600) }
  else if(S.comeback!=null&&S.day>=S.comeback&&!promo()&&S.day>=DEBUT_DAY){ S.comeback=null; startPromo("comeback"); setTimeout(()=>bigEvent("comeback"),600) } };
window.timelineOnDayEnd=day=>{ const P=S.promo; if(!P||day<P.start||day>=P.start+PROMO_LEN) return; const i=showIdx(day,P); if(i!=null) window.stageCatchUp?.(i+1,promoFirstIdx(P)) };
})();
window.gameState=()=>S;

/* =====================================================================
   成績與年度事件:一位紀錄、粉絲數、宣傳期結算、第一個一位、年末頒獎與歌謠祭
   ===================================================================== */
(()=>{
const st=()=>{ S.stats=S.stats||{fans:0,wins:0,winsByYear:{},firstWin:false,awards:[]}; return S.stats };
const yr=()=>dateOf(S.day).getFullYear();
window.fansText=()=>{ const f=st().fans; return f>=10000?`${(f/10000).toFixed(1)} 億`:f>=1?`${Math.round(f)} 萬`:"還沒有粉絲" };
/* 待機室每一場打歌的結果 */
window.onShowResult=r=>{ const s=st(), promo=window.promoActive?.(); if(!promo) return null;   // 練習模式不算
  let first=false;
  if(r.win){ window.logEvent?.("win",{show:r.sh?.n||"音樂節目",song:S.promo?.title||""}); s.wins++; s.winsByYear[yr()]=(s.winsByYear[yr()]||0)+1; s.fans+=3+Math.min(6,(r.views||0)/80); if(!s.firstWin){ s.firstWin=true; first=true; window.cgGroupUnlock?.("g_firstwin"); for(const m of M){S.m[m.id].xp+=200; S.m[m.id].mood=Math.min(100,S.m[m.id].mood+20)} addBond(M.map(x=>x.id),4) } }
  else s.fans+=1+Math.min(3,(r.views||0)/150);
  S.promo.wins=(S.promo.wins||0)+(r.win?1:0); S.promo.shows=(S.promo.shows||0)+1; if(!r.auto) window.spendTime?.(180,"打歌"); save(true);   // 跟去電視台打歌:扣 3 小時(改版 1.0;1.2 重做宣傳期)
  if(first&&r.auto) setTimeout(()=>window.showCard({tag:"FIRST WIN",bg:"assets/bg/ev_stage.webp",title:"第一個一位!",lead:`你不在電視台的那天,${window.groupName?.()||"完美女團"}在《${r.sh?.n||"音樂節目"}》拿下了出道後的第一個一位。一回到宿舍,五個人就衝過來抱住你。`,
    lines:(L0=>(window.feedback?.("l"),window.eventLines?.("first_win",L0)||L0))([["he","代表……我們拿到一位了!","sad"],["hr","代表!!我們是一位!!","laugh"],["tr","……下次,你要在台下看。","shy"]]),ok:"抱緊她們"}),1500);
  return first?[["he","代表……我們拿到一位了,真的嗎?","sad"],["ys","不要哭啦,夏恩……(她自己也哭了)","sad"],["hr","代表!代表!!我們是一位!!","laugh"],["tr","……這是我這輩子最開心的一天。","shy"],["hy","代表、本當にありがとう……謝謝你。","laugh"]]:null };
/* 一次只顯示一張事件卡,其他的排隊 */
const CQ=[];
function card(o){ if(document.querySelector(".bigev:not(.out)")){ CQ.push(o); if(CQ.length===1) waitNext(); return } showCardNow(o) }
function waitNext(){ const t=setInterval(()=>{ if(!document.querySelector(".bigev:not(.out)")&&CQ.length){ const o=CQ.shift(); showCardNow(o); if(!CQ.length) clearInterval(t) } else if(!CQ.length) clearInterval(t) },400) }
function showCardNow(o){ const el=document.createElement("div"); el.className="bigev";
  el.innerHTML=`<div class="bg-shot"${o.bg?` style="background-image:url(${o.bg})"`:""}></div><div class="bg-veil"></div><div class="bigcard"><small>${o.tag}</small><h2>${o.title}</h2><p class="lead">${o.lead}</p>
    ${o.stats?`<div class="evstats">${o.stats.map(([n,v])=>`<div><b>${v}</b><span>${n}</span></div>`).join("")}</div>`:""}
    ${o.lines?`<div class="evlines${o.cols?" two":""}">${o.lines.map(([id,t,e])=>{const mm=byId(id);return `<div class="evl"><span class="pface" style="--c:${mm.c};background-image:url(${spr(id,null,e)})"></span><p><b style="color:${mm.c}">${mm.n}</b>${esc(t)}</p></div>`}).join("")}</div>`:""}
    <button class="fbtn pri cardOk">${o.ok||"繼續"}</button></div>`;
  $("#stage").appendChild(el); setPause("card",true);
  el.querySelector(".cardOk").onclick=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("card",false); o.after?.(); save(true); renderAll() } }
window.showCard=card;
/* 宣傳期結算 */
function settle(P){ const s=st(), w=P.wins||0, n=P.shows||0, sum=window.songSummary?songSummary():null;
  const gain=Math.round(8+w*4+(sum?.title?.score||60)/10); s.fans+=gain; P.settled=true;
  for(const m of M){ S.m[m.id].xp+=150+w*20; S.m[m.id].stress=Math.max(0,S.m[m.id].stress-15) } addBond(M.map(x=>x.id),2);
  const rank=w>=12?"打歌節目全面制霸":w>=6?"音源與打歌雙雙登頂":w>=1?"拿下了一位":"每一場都留下了好舞台";
  card({tag:`${P.kind==="debut"?"DEBUT":"COMEBACK"} RESULT`,bg:"assets/bg/ev_stage.webp",title:`〈${esc(P.title)}〉宣傳期結算`,
    lead:`四週的${P.kind==="debut"?"出道":"回歸"}活動結束了:${rank}。公司為大家準備了慶功宴,成員們的壓力都放下了一些。下一次回歸日可以到 2F 企劃室決定。`,
    stats:[["一位",`${w} 次`],["完成打歌",`${n} 場`],["新增粉絲",`+${gain} 萬`],["粉絲總數",fansText()]],ok:"慶功宴乾杯"}) }
/* 年末:12/2 亞洲音樂大獎、12/31 年末歌謠大祭典 */
function awards(){ const s=st(), y=yr(), w=s.winsByYear[y]||0, debutYear=dateOf(DEBUT_DAY).getFullYear()===y;
  const got=[]; if(debutYear) got.push("最佳新人獎"); if(w>=3) got.push("年度本賞"); if(w>=6) got.push("最佳女子團體獎"); if(w>=12&&s.fans>=60) got.push("年度大賞・年度歌手");
  const firstDaesang=got.some(g=>g.includes("大賞"))&&!s.awards.some(a=>(a.got||[]).some(g=>g.includes("大賞")));
  s.awards.push({y,got}); for(const m of M) S.m[m.id].xp+=got.length*80; if(firstDaesang) window.cgGroupUnlock?.("g_daesang");
  card({tag:`ASIA MUSIC AWARDS ・ ${y}`,bg:"assets/bg/ev_awards.webp",title:got.length?`拿下 ${got.length} 個獎`:"第一次站上頒獎典禮",
    lead:got.length?`今年的${window.groupName?.()||"完美女團"}拿下了:${got.join("、")}。${got.some(g=>g.includes("大賞"))?"出道第一年就拿下大賞,整個會場都在喊她們的名字。":""}`:"這一年雖然沒有拿獎,但能站在這個舞台上表演,已經是很多團體夢寐以求的事。",
    stats:[["今年一位",`${w} 次`],["粉絲總數",fansText()]],
    lines:got.length?[["ys","代表……這座獎,是我們六個人一起拿的。","sad"],["hr","我要把獎盃帶回濟州給外婆看!","laugh"]]:[["he","明年,我們一定會拿到。","smile"]],ok:"一起拍張照"}) }
function festival(){ const y=yr(); window.cgGroupUnlock?.("g_newyear");
  card({tag:`YEAR-END FESTIVAL ・ ${y}`,bg:"assets/bg/ev_festival.webp",title:"年末歌謠大祭典",lead:"年末歌謠祭的舞台一結束,五個人沒有回宿舍,套上羽絨外套就拉著你跑到下雪的漢江邊——她們說,今年的倒數,想跟代表一起數。",
    lines:[["tr","……新年快樂,代表。明年也請多指教。","shy"],["hy","来年もよろしくね!明年也要在一起喔!","laugh"]],ok:"新年快樂"}) }
const _ds=window.timelineOnDayStart;
window.timelineOnDayStart=()=>{ _ds?.(); if(S.day<DEBUT_DAY) return; const d=dateOf(S.day);
  const P=S.promo; if(P&&!P.settled&&S.day>=P.start+28) setTimeout(()=>settle(P),900);
  if(d.getMonth()===11&&d.getDate()===2&&S.awardYear!==d.getFullYear()){ S.awardYear=d.getFullYear(); setTimeout(awards,1200) }
  if(d.getMonth()===11&&d.getDate()===31&&S.festYear!==d.getFullYear()){ S.festYear=d.getFullYear(); setTimeout(festival,1200) }
  if(S.day===DEBUT_DAY+365) window.cgGroupUnlock?.("g_anniv1") };
})();

/* ---- 擬真第一階段 ①(2026-11-09):決定記憶 ----
   選項設旗標(set)時,同時記下一筆記憶 S.memx[旗標]:哪天、哪個時段、在哪、當時在場的人(who)、知道的人(knows = 在場的人 + 選項 tell 指定的人)、
   感覺 tone(溫暖、心動、好笑、心疼、驕傲)、重要程度 w(1~3,沒寫時有心動的選擇算 2)、細節 vars(之後提起時填進台詞)、來自哪段內容 src。
   同一個旗標再設一次只加次數 n。舊存檔的旗標(成員代號開頭的,例如 trChaseVerse、grpBackstageHands)開檔時一次轉成記憶:
   日期用 S.flagAt,知道的人 = 那位成員(grp = 五個人),conv:1 標記是轉換來的。只有記憶,不會自己傳開 ---- */
(()=>{
const MEM_ID=/^(ys|tr|hy|he|hr|grp)[A-Z]/, ALL=()=>M.map(m=>m.id);
window.memRecord=(k,id,c={})=>{ try{ const X=S.memx=S.memx||{}; if(X[k]){ X[k].n=(X[k].n||1)+1; return X[k] }
  const pres=(typeof V!=="undefined"&&V?.present?.length)?[...V.present]:[id], who=[...new Set([id,...pres])].filter(x=>byId(x));
  const tell=(Array.isArray(c.tell)?c.tell:c.tell?[c.tell]:[]).filter(x=>byId(x));
  return X[k]={day:S.day,slot:S.slot,room:(typeof V!=="undefined"&&(V?.room||V?.pid))||S.where?.[id]||null,who,knows:c.secret?[...who]:[...new Set([...who,...tell])],...(c.secret?{secret:true}:{}),
    tone:c.tone||null,w:Math.max(1,Math.min(3,+c.w||(+c.heart>0?2:1))),vars:c.memv||null,src:(typeof D!=="undefined"&&D?.sn?.code)||null,said:String(c.t||"").slice(0,40)||null,n:1} }catch(e){ window.logErr?.("記憶",e) } };
window.memEnsure=()=>{ const X=S.memx=S.memx||{}, fa=S.flagAt||{}; let n=0;
  for(const k of Object.keys(S.flags||{})){ if(X[k]||!MEM_ID.test(k)) continue; const p=k.match(MEM_ID)[1], who=p==="grp"?ALL():[p];
    X[k]={day:fa[k]??S.day,slot:null,room:null,who,knows:[...who],tone:null,w:1,vars:null,src:null,n:+S.flags[k]||1,conv:1}; n++ }
  const SA=S.stageAt=S.stageAt||{}, SI=S.stageAtInit=S.stageAtInit||{}; for(const m of M){ const st=stageOf(m.id), kk=m.id+":"+st; if(SA[kk]==null){ SA[kk]=S.day; SI[kk]=1 } }   // 舊存檔:現在的階段從今天算(相簿不列這筆)
  return n };
window.memKnows=(k,id)=>!!S.memx?.[k]?.knows?.includes(id);   // 這位成員知道這件事嗎(回想、日記用)
window.memTell=(k,ids)=>{ const m=S.memx?.[k]; if(!m) return; for(const x of [].concat(ids)) if(byId(x)&&!m.knows.includes(x)) m.knows.push(x) };
})();

/* ---- 擬真第一階段 ⑥(2026-11-09):成員日記、我們的相簿、每週整理 ----
   日記:她知道的、重要程度 2 以上的記憶,一筆一篇(專屬日記 need.mem 優先,沒有就挑同感覺的通用日記,再沒有用內建的一句);挑到哪篇記在 S.diaryPick,之後不會變。
   到心動階段她才讓代表看,之前只看得到封面和日期(使用者 11/09 定案)。保密的事只會寫在當時在場的人自己的日記裡。
   相簿:全部的記憶依時間排,加上關係轉折;「最有故事的時刻」用固定規則挑:每位成員的第一筆、重要程度 3、心動。
   每週整理:週日 21:00 以後,畫面空著時一張卡片(週句型 weekly,沒有就用內建的),一週一次 ---- */
(()=>{
const TONE_C={溫暖:"#E8A13C",心動:"#E85C8A",好笑:"#4FAF83",心疼:"#7A8FD6",驕傲:"#C9A227"};
const DIARY_FB={溫暖:"{mem.slot}在{mem.room}的那件事,一整天都在心裡暖暖的。想記下來,以後翻到的時候也能想起來。",
  心動:"這頁不給任何人看。{mem.room}那時候,心跳快得連自己都嚇一跳。……就先寫到這裡。",
  好笑:"想到{mem.room}那時候的事就忍不住笑。今天就記這個,當作獎勵自己。",
  心疼:"今天有點難過,可是有人在。{mem.room}那時候,代表沒有走開。我想記住這件事。",
  驕傲:"今天的自己,我想好好記住。{mem.room}那時候,我做到了。"};
const WEEKLY_FB={open:"一週又過去了。",best:"這週最亮的一刻,是{mem.slot}的{mem.room},和{member}一起。",work:"這週的工作:{work}。",member:"{member}這週好像特別有精神。",close:"下週也一起加油吧。"};
const rk=s=>(window.STAGE_RANK||[]).indexOf(s), canRead=id=>rk(stageOf(id))>=rk("心動");
const fmt=d=>{ const t=dateOf(d); return `${t.getFullYear()} 年 ${t.getMonth()+1} 月 ${t.getDate()} 日` };
const fillOne=(t,k)=>k&&window.memFill?window.memFill({code:"_",nodes:{start:{L:[["",t]],C:[]}}},k).nodes.start.L[0][1]:t;
function diaryList(id){ const X=S.memx||{}, P=S.diaryPick=S.diaryPick||{}, out=[], lib=snips().filter(sn=>sn.type==="diary"&&sn.member===id), bd=window.DAILY?.bandOf?.(stageOf(id));
  for(const [k,m] of Object.entries(X)){ if((m.w||1)<2||!m.knows?.includes(id)||(m.secret&&!m.who?.includes(id))) continue;
    const pk=id+":"+k; let sn=P[pk]&&lib.find(x=>x.code===P[pk]);
    if(!sn){ const own=lib.filter(x=>x.need?.mem===k), gen=lib.filter(x=>!x.need?.mem&&(!m.tone||x.tone===m.tone)&&(!x.band||x.band===bd)), L=own.length?own:gen;
      if(L.length){ sn=L[Math.floor(rng(seedOf(m.day,k,id))()*L.length)]; P[pk]=sn.code } }
    const raw=sn?.text||sn?.nodes?.start?.L?.[0]?.[1]||DIARY_FB[m.tone]||DIARY_FB.溫暖;
    out.push({day:m.day,tone:m.tone,text:fillOne(raw,k),k}) }
  return out.sort((a,b)=>b.day-a.day) }
function panel(tag,title,html,cls=""){ const el=document.createElement("div"); el.className="bigev memp";
  el.innerHTML=`<div class="bg-veil"></div><div class="bigcard memcard ${cls}"><small>${tag}</small><h2>${title}</h2>${html}<button class="fbtn pri cardOk">闔上</button></div>`;
  $("#stage").appendChild(el); setPause("card",true); el.querySelector(".cardOk").onclick=()=>{ el.classList.add("out"); setPause("card",false); setTimeout(()=>el.remove(),500) } }
const closeDrawer=()=>{ $("#drawer")?.classList.remove("on"); setPause("drawer",false) };
window.diaryOpen=id=>{ try{ closeDrawer(); const m=byId(id), L=diaryList(id);
  const html=!L.length?`<p class="lead">還是空白的。和她一起留下一些回憶吧。</p>`
    :canRead(id)?`<div class="dlist">${L.map(e=>`<div class="dent" style="--tc:${TONE_C[e.tone]||m.c}"><b>${fmt(e.day)}</b>${e.tone?`<i>${e.tone}</i>`:""}<p>${esc(e.text)}</p></div>`).join("")}</div>`
    :`<p class="lead">「這本……還不能給你看。」</p><div class="dcover" style="--c:${m.c}"><span>${esc(m.n)}</span><em>DIARY</em></div><div class="ddates">${L.map(e=>`<span>${fmt(e.day)}</span>`).join("")}</div><p class="dnote">到心動的時候,她才會讓你翻開。</p>`;
  panel("DIARY",`${esc(m.n)}的日記`,html,"diary") }catch(e){ window.logErr?.("日記",e) } };
function stars(){ const X=S.memx||{}, first={}; for(const [k,m] of Object.entries(X)) for(const id of m.who||[]) if(!first[id]||X[first[id]].day>m.day) first[id]=k; return new Set(Object.values(first)) }
window.albumOpen=()=>{ try{ closeDrawer(); const X=S.memx||{}, F=stars(), SI=S.stageAtInit||{};
  const ev=Object.entries(X).map(([k,m])=>({day:m.day,k,m,score:(m.w||1)*2+(F.has(k)?2:0)+(m.tone==="心動"?1:0)}));
  for(const [kk,d] of Object.entries(S.stageAt||{})){ if(SI[kk]) continue; const [id,st]=kk.split(":"); if(!byId(id)||!["信任","夥伴","心動","戀人"].includes(st)) continue; ev.push({day:d,turn:[id,st],score:st==="心動"||st==="戀人"?6:3}) }
  if(!ev.length){ panel("ALBUM","我們的相簿",`<p class="lead">還沒有照片。一起做的決定,都會留在這裡。</p>`,"album"); return }
  const face=id=>{ const m=byId(id); return m?`<span class="aface" style="--c:${m.c}" title="${m.n}">${m.n[0]}</span>`:"" };
  const row=e=>e.turn?`<div class="aent turn"><b>${fmt(e.day)}</b><p>${face(e.turn[0])}${esc(byId(e.turn[0]).n)}和你的關係,變成了「${e.turn[1]}」。</p></div>`
    :`<div class="aent" style="--tc:${TONE_C[e.m.tone]||"#B9A6C9"}"><b>${fmt(e.day)}${e.m.w>=3||F.has(e.k)?" ★":""}</b><p>${(e.m.who||[]).map(face).join("")}${e.m.room?`<small>${esc(PL[e.m.room]?.n||"")}${e.m.slot!=null?"・"+SLOTS[e.m.slot].n:""}</small>`:""}${e.m.said?`「${esc(e.m.said)}」`:esc((e.m.who||[]).map(i=>byId(i)?.n).filter(Boolean).join("、"))+"記得的那件事"}</p></div>`;
  const top=[...ev].sort((a,b)=>b.score-a.score||b.day-a.day).slice(0,5), all=[...ev].sort((a,b)=>b.day-a.day);
  let html=`<h4>最有故事的時刻</h4>${top.map(row).join("")}<h4>全部</h4>`, ym="";
  for(const e of all){ const t=dateOf(e.day), y=`${t.getFullYear()} 年 ${t.getMonth()+1} 月`; if(y!==ym){ ym=y; html+=`<h5>${y}</h5>` } html+=row(e) }
  panel("ALBUM","我們的相簿",`<div class="alb">${html}</div>`,"album") }catch(e){ window.logErr?.("相簿",e) } };
function wline(part,vars,k){ const L=snips().filter(sn=>sn.type==="weekly"&&sn.part===part), r=rng(seedOf(S.day,"weekly",part));
  let t=L.length?(L[Math.floor(r()*L.length)].text||WEEKLY_FB[part]):WEEKLY_FB[part]; t=t.replace(/\{member\}/g,vars.member||"大家").replace(/\{work\}/g,vars.work||"練習"); return esc(fillOne(t,k)) }
function weeklyCheck(){ try{ if(paused()||(typeof V!=="undefined"&&V)||(typeof D!=="undefined"&&D)) return; if(dateOf(S.day).getDay()!==0||S.min<21*60) return;
  const W=S.weekly=S.weekly||{}; if(W.last===S.day||document.querySelector(".bigev:not(.out),.cine,#welc,#exitv")) return; W.last=S.day;
  const X=Object.entries(S.memx||{}).filter(([k,m])=>S.day-m.day>=0&&S.day-m.day<7).sort((a,b)=>(b[1].w||1)-(a[1].w||1)||b[1].day-a[1].day), best=X[0];
  const work=[...new Set((S.evLog||[]).filter(e=>S.day-e.day>=0&&S.day-e.day<7).map(e=>({win:"拿下一位",concert:"演唱會",promo:"打歌"}[e.k])).filter(Boolean))].join("、")||(S.debuted?"練習與行程":"練習");
  const bm=best?byId(best[1].who?.[0]):null, mm=M[Math.floor(rng(seedOf(S.day,"weeklym"))()*M.length)];
  const lead=[wline("open",{}),best?wline("best",{member:bm?.n},best[0]):"",wline("work",{work}),wline("member",{member:mm.n}),wline("close",{})].filter(Boolean).join("<br>");
  const gname=typeof STORY_VARS!=="undefined"&&STORY_VARS["團名"]?.()||"我們";
  window.showCard?.({tag:"WEEKLY",title:`這週的${/^[A-Za-z0-9]/.test(String(gname))?" ":""}${esc(String(gname))}`,lead}) }catch(e){ window.logErr?.("每週整理",e) } }
window.weeklyCheck=weeklyCheck;
every(2000,weeklyCheck);
})();

