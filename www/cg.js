"use strict";
/* =====================================================================
   戀愛紀念 CG
   - 關係升級(信任/夥伴/心動/戀人/親密)時,全螢幕顯示該成員那一階段的紀念 CG
   - 收進手機「相簿」,可以隨時重看
   - 不管升級是從對話、結算、頒獎哪裡來的,都在「沒有任何畫面開著」時統一檢查、依序顯示
   - 舊存檔第一次載入:已經到達的階段直接收進相簿,不一張張跳出來
   圖片:assets/cg/<成員代號>_<階段>.webp(1600×900)與縮圖 _s.webp
   ===================================================================== */
(()=>{
const ORDER=["信任","夥伴","心動","戀人","親密"];
const KEY={信任:"trust",夥伴:"partner",心動:"heart",戀人:"lover",親密:"intimate"};
const CG={
  ys:{信任:["深夜練習室的筆記","代表也還沒回去啊……先喝點水吧。"],
      夥伴:["沙發上的追星本","你看你看!這張我等了三個月才換到的!"],
      心動:["頂樓,靠近的那一步","……領帶,歪了。"],
      戀人:["後台走廊的角落","謝謝你……讓我站上那個舞台。"],
      親密:["替你解開領帶","今晚,換我照顧代表。"]},
  tr:{信任:["分你一邊耳機","……你聽聽看。不好聽也要說實話。"],
      夥伴:["便利商店外的泡麵","不、不行,我笑到停不下來……"],
      心動:["同一把傘下","……雨,好像變大了。"],
      戀人:["黑膠唱片與你的肩膀","這首歌結束之前,不要動。"],
      親密:["穿著你的襯衫的早晨","……早安。再躺一下就好。"]},
  hy:{信任:["清晨的把桿","おはよう!代表今天也好早!"],
      夥伴:["玉子燒,張嘴","來,あーん~很好吃的喔!"],
      心動:["旋轉之後","……謝謝你,接住我。"],
      戀人:["兩個人的圍巾","這樣就不冷了吧?"],
      親密:["海外巡演的飯店","行かないで……今晚不要走。"]},
  he:{信任:["先吃飯再說啦","先吃飯再說啦!工作又不會跑掉。"],
      夥伴:["漢江野餐","看!全部都是我自己包的喔!"],
      心動:["摩天輪的最高點","代表……我有話想跟你說。"],
      戀人:["聖誕節的手織圍巾","我織了好久喔,不准拿下來。"],
      親密:["別走嘛","別走嘛……再陪我一下。"]},
  hr:{信任:["只唱給你聽","怎樣,我很會唱吧?"],
      夥伴:["濟州的橘子","不吃就是不給我面子喔!"],
      心動:["抓住你的袖口","……代表,你剛剛在看我嗎?"],
      戀人:["空蕩蕩的演唱會","這首歌,只唱給你一個人聽。"],
      親密:["被單裡的笑聲","不要一直看啦……很害羞耶。"]}};
const src=(id,st,small)=>`assets/cg/${id}_${KEY[st]}${small?"_s":""}.webp`;
const has=(id,st)=>!!CG[id]?.[st];
window.CG_DATA=CG;

/* ---------- 解鎖紀錄:S.cg[id][階段]=解鎖的遊戲日;S.cgNew=相簿裡還沒看過的 ---------- */
function data(){ if(!S.cg){ S.cg={}; S.cgNew=[]; S.cgInit=false } return S.cg }
const reached=id=>{ const st=window.stageOfXp?stageOfXp(id):"戒備", r=(window.STAGE_RANK||[]).indexOf(st); return ORDER.filter(x=>(window.STAGE_RANK||[]).indexOf(x)<=r) };
const unlocked=(id,st)=>data()[id]?.[st]!=null;
const QUEUE=[];
/* 新遊戲開始時有幾位成員已經在「信任」(起始好感不同),她們的信任 CG 要再多相處一點才出現,
   才會是一個「時刻」而不是開場就跳出來;泰梨等從戒備升上來的照常在升級時出現 */
const trustReady=id=>S.m[id].xp>=Math.max(1000,(S.cgBase?.[id]??0)+600);
function scan(){
  if(typeof S==="undefined"||!S?.m||!window.stageOfXp) return;
  const d=data(); let first=!S.cgInit, n=0;
  if(first&&S.day<=3){ S.cgBase=Object.fromEntries(M.map(m=>[m.id,S.m[m.id].xp||0])); S.cgInit=true; first=false }   // 新遊戲:不補發
  for(const m of M) for(const st of reached(m.id)){ if(!has(m.id,st)||unlocked(m.id,st)) continue;
    if(st==="信任"&&!first&&!trustReady(m.id)) continue;
    (d[m.id]=d[m.id]||{})[st]=S.day; (S.cgNew=S.cgNew||[]).push(m.id+"|"+st); n++;
    if(!first) QUEUE.push([m.id,st]) }
  if(first){ S.cgInit=true; if(n) setTimeout(()=>toast2(`手機「相簿」收進了 ${n} 張戀愛紀念照`),1500); save?.(true) }
}
/* 沒有任何畫面開著時才顯示(對話、手機、設施、事件卡都會暫停時間) */
setInterval(()=>{ try{ scan(); if(QUEUE.length&&!paused()&&!document.querySelector(".bigev:not(.out),#cgView")){ const [id,st]=QUEUE.shift(); show(id,st,true) } }catch(e){} },1200);

/* ---------- 全螢幕顯示 ---------- */
function show(id,st,fresh,onClose){
  const m=byId(id), [title,line]=CG[id][st];
  const el=document.createElement("div"); el.id="cgView"; el.className="cgview"+(fresh?" fresh":"");
  el.style.setProperty("--c",m.c);
  el.innerHTML=`<div class="cgimg" style="background-image:url(${src(id,st)})"></div><div class="cgshade"></div>
    <div class="cgcap"><small>${fresh?"NEW MEMORY ・ 戀愛紀念":"MEMORY ・ 戀愛紀念"}</small>
      <div class="cgwho"><b>${esc(m.n)}</b><i>${esc(st)}</i></div><h2>「${esc(title)}」</h2><p>${esc(line)}</p>
      ${fresh?`<span class="cgsaved">已收進手機「相簿」,隨時可以重看</span>`:""}</div>
    <div class="cgbtns"><button class="cgb" data-hide>隱藏文字</button><button class="cgb pri" data-close>${fresh?"收進相簿":"關閉"}</button></div>`;
  $("#stage").appendChild(el); setPause("cg",true);
  const cap=()=>el.classList.toggle("bare");
  el.querySelector("[data-hide]").onclick=e=>{e.stopPropagation();cap()};
  el.querySelector(".cgimg").onclick=()=>{ if(el.classList.contains("bare")) cap() };
  el.querySelector("[data-close]").onclick=e=>{ e.stopPropagation(); el.classList.add("out"); setTimeout(()=>el.remove(),500); setPause("cg",false); save?.(true); onClose?.() };
}
window.showCG=show;

/* ---------- 手機相簿 ---------- */
let AM=null;
window.cgNewCount=()=>(data(),(S.cgNew||[]).length);
window.cgAlbumHTML=()=>{ data(); const cur=AM||M[0].id, total=M.reduce((a,m)=>a+ORDER.filter(st=>has(m.id,st)).length,0), got=M.reduce((a,m)=>a+ORDER.filter(st=>unlocked(m.id,st)).length,0);
  const isNew=k=>(S.cgNew||[]).includes(k);
  const chips=M.map(m=>{const g=ORDER.filter(st=>unlocked(m.id,st)).length, nw=ORDER.some(st=>isNew(m.id+"|"+st));
    return `<button class="cgchip${m.id===cur?" on":""}" data-cgm="${m.id}" style="--c:${m.c}">${esc(m.n)}<small>${g}/5</small>${nw?`<i></i>`:""}</button>`}).join("");
  const cards=ORDER.filter(st=>has(cur,st)).map(st=>{ const u=unlocked(cur,st), [t]=CG[cur][st];
    return u?`<button class="cgcard" data-cgv="${cur}|${st}"><span class="cgth" style="background-image:url(${src(cur,st,true)})"></span><span class="cgmeta"><i>${esc(st)}</i><b>${esc(t)}</b>${isNew(cur+"|"+st)?`<em>NEW</em>`:""}</span></button>`
      :`<div class="cgcard lock"><span class="cgth"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span><span class="cgmeta"><i>${esc(st)}</i><b>關係到「${esc(st)}」時解鎖</b></span></div>` }).join("");
  return `<div class="phead"><button class="pback" data-go="home">‹</button><b>相簿</b><span>${got}/${total}</span></div>
    <div class="cgchips">${chips}</div><div class="pscroll cgscroll">${cards}</div>` };
window.cgAlbumBind=(B,rerender)=>{
  B.querySelectorAll("[data-cgm]").forEach(b=>b.onclick=()=>{AM=b.dataset.cgm;rerender()});
  B.querySelectorAll("[data-cgv]").forEach(b=>b.onclick=()=>{ const [id,st]=b.dataset.cgv.split("|"); S.cgNew=(S.cgNew||[]).filter(k=>k!==id+"|"+st);
    show(id,st,false,()=>rerender()) });
};
window.cgAlbumOpen=()=>{ if(!AM){ const k=(S.cgNew||[])[0]; AM=k?k.split("|")[0]:M[0].id } };
})();
