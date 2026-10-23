"use strict";
/* =====================================================================
   養成:好感度(只升不降)、成員之間的團隊默契、能力成長、出道倒數與月評
   出道日固定 2017.07.13;回歸日由玩家在企劃室決定(之後接上)
   ===================================================================== */
(()=>{
/* ---------- 好感度:點數制,階段門檻越後面越高 ---------- */
const pk=(a,b)=>[a,b].sort().join("-");
const XP_STAGE=[["戒備",0],["信任",1000],["夥伴",4800],["心動",12000],["戀人",20000],["親密",30000]];
const STAGE_RANK=["戒備","信任","夥伴","心動","戀人","親密","多人親密"];
window.STAGE_RANK=STAGE_RANK;
const DEBUT=new Date(2017,6,13);
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
  if(!S.skill){ S.skill={}; const BASE={ys:{vocal:64,dance:62,rap:30,expr:72,kor:100},tr:{vocal:45,dance:74,rap:72,expr:70,kor:100},hy:{vocal:48,dance:80,rap:22,expr:68,kor:55},he:{vocal:52,dance:62,rap:50,expr:76,kor:100},hr:{vocal:74,dance:55,rap:30,expr:55,kor:100}};
    // 練習生起點:比出道時預定的水準低一截,兩年好好培養就能追上甚至超過
    for(const [id,b] of Object.entries(BASE)) S.skill[id]=Object.fromEntries(Object.entries(b).map(([k,v])=>[k,k==="kor"?(v>=100?100:v-15):Math.max(15,v-16)])) }
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
window.gainFromChoice=(id,c)=>{ const s=S.m[id]; if(!s) return {xp:0,heart:0};
  const p=(PREF[id]||{})[c.s]??1, g=+c.g||0, raw=g*p; let xp=0, heart=0;
  if(raw>0){ xp=Math.round(Math.min(18,raw*5)); if(c.s&&c.s===bestStyle(id)) xp+=6 }
  const st=stageOfXp(id);
  if(STAGE_RANK.indexOf(st)>=2||s.xp>=4800){ if(c.heart) heart=Math.max(0,Math.min(2,+c.heart)); else if(WARM.includes(c.s)&&raw>=2) heart=1 }
  return {xp,heart} };
window.applyGain=(id,c,show)=>{ const s=S.m[id]; if(!s) return 0; const before=stageOfXp(id), {xp,heart}=gainFromChoice(id,c);
  s.xp=(s.xp||0)+xp; s.heart=Math.min(100,(s.heart||0)+heart); s.trust=Math.round(xpToTrust(s.xp));
  if(c.mood>0) s.mood=clamp(s.mood+(+c.mood),0,100); if(c.stress<0) s.stress=clamp(s.stress+(+c.stress),0,100);   // 只套用好的方向
  if(c.set) S.flags[c.set]=(S.flags[c.set]||0)+1;
  const after=stageOfXp(id);
  if(show){ if(xp) show(id,`好感 +${xp}`); if(heart) show(id,`心動 +${heart}`); if(after!==before) show(id,`關係進展:${after}`) }
  if(after!==before) toast2(`${byId(id).n}和你的關係變成「${after}」了`);
  return xp };

/* ---------- 團隊默契(每對成員,只會增加) ---------- */
window.addBond=(ids,v)=>{ const u=[...new Set(ids)].filter(id=>byId(id)); for(let i=0;i<u.length;i++) for(let j=i+1;j<u.length;j++){ const k=pk(u[i],u[j]); S.bond[k]=Math.min(100,(S.bond[k]||30)+v) } };
window.bondOf=(a,b)=>S.bond?.[pk(a,b)]||30;
window.teamBond=()=>{ const v=Object.values(S.bond||{}); return v.length?v.reduce((a,b)=>a+b,0)/v.length:30 };

/* ---------- 能力成長 ---------- */
const SK={vocal:"唱功",dance:"舞蹈",rap:"Rap",expr:"表情管理",kor:"韓語"};
window.SKILL_NAMES=SK;
function grow(id,k,v){ const s=S.skill[id]; if(!s||s[k]==null) return; s[k]=Math.min(99,s[k]+v*(1-s[k]/120)) }
const LESSON={1:[["dance",.04]],2:[["vocal",.04]],3:[["dance",.04]],4:[["vocal",.03],["rap",.03]],5:[["dance",.02],["expr",.02]],6:["weak"]};
function slotGrowth(){ const wd=dateOf(S.day).getDay(), sl=S.slot;
  for(const m of M){ const w=S.where[m.id]||"";
    if(w==="practice"){grow(m.id,"dance",.016);grow(m.id,"expr",.008)}
    if(w==="studio"){grow(m.id,"vocal",.016);grow(m.id,"rap",.01)}
    if(w==="styling") grow(m.id,"expr",.006);
    if(m.id==="hy"&&!w.startsWith("bed_")) grow("hy","kor",.01);
    if(sl===2&&LESSON[wd]){ for(const L of LESSON[wd]){ if(L==="weak"){ const s=S.skill[m.id]; const k=["vocal","dance","rap","expr"].sort((a,b)=>s[a]-s[b])[0]; grow(m.id,k,.04) } else grow(m.id,L[0],L[1]) } } }
  // 一起在同一個地方的成員,默契慢慢累積
  const by={}; for(const m of M){ const w=S.where[m.id]; if(w&&!w.startsWith("bed_")&&!w.startsWith("外出")) (by[w]=by[w]||[]).push(m.id) }
  for(const ids of Object.values(by)) if(ids.length>1) addBond(ids,.04) }
/* 代表在練習室或錄音室陪練:選了好的回應,能力也跟著成長 */
window.coachGrowth=(id,place)=>{ if(place==="practice"){grow(id,"dance",.08);grow(id,"expr",.04)} else if(place==="studio"){grow(id,"vocal",.08);grow(id,"rap",.04)} };
window.gameSkill=()=>S.skill;

/* ---------- 月評:每月最後一個週六的下午 ---------- */
const isEvalDay=d=>{const x=new Date(d.getFullYear(),d.getMonth()+1,0); while(x.getDay()!==6) x.setDate(x.getDate()-1); return x.getDate()===d.getDate()};
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
  // 下午結束(進入晚上)時,如果是月評日就舉行月評
  if(S.slot===2&&isEvalDay(dateOf(S.day))&&S.lastEval!==S.day){ S.lastEval=S.day; setTimeout(monthlyEval,400) } };
window.growthInit=migrate;
window.debutText=()=>{ const dd=debutDay-S.day; return dd>0?`出道 D-${dd}`:dd===0?"今天出道":`出道第 ${-dd+1} 天` };
})();
