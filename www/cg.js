"use strict";
/* =====================================================================
   戀愛紀念 CG
   - 關係升級(信任/夥伴/心動/戀人/親密)時,全螢幕顯示該成員那一階段的紀念 CG
   - 收進手機「相簿」,可以隨時重看
   - 不管升級是從對話、結算、頒獎哪裡來的,都在「沒有任何畫面開著」時統一檢查、依序顯示
   - 舊存檔第一次載入:已經到達的階段直接收進相簿,不一張張跳出來
   - 多人親密 10 組:兩位成員都到「親密」、彼此默契 80 以上時解鎖(growth.js 的 multiPartners);相簿「雙人」分頁
   - 特別回憶:演唱會等事件收進來的 CG(concert.js 把代號放進 S.cgExtra);相簿「回憶」分頁
   圖片:assets/cg/<成員代號>_<階段>.webp、duo_<甲>_<乙>.webp、<回憶代號>.webp(2560×1440)與縮圖 _s.webp(400×225)
   紀錄:S.cg[成員][階段]、S.cgDuo[組]、S.cgEx[回憶] = 解鎖的遊戲日
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
const DUO={
  "ys-tr":["燭光下的領帶",[["ys","領帶,又歪了喔……代表。"],["tr","……心跳好快。是因為我們嗎?"]]],
  "ys-hy":["演出之後的化妝間",[["hy","じっとして~領帶我來弄就好。"],["ys","今天的掌聲,有一半是你的。"]]],
  "ys-he":["雨夜的草莓",[["ys","……再讓我靠一下。"],["he","張嘴~最甜的這顆留給代表。"]]],
  "ys-hr":["首爾夜景的陽台",[["ys","今晚的夜景,只給你看。"],["hr","不准偷偷溜回房間喔!"]]],
  "tr-hy":["巡演飯店的早晨",[["tr","……手借我。再五分鐘。"],["hy","代表、おはよう~今天要去哪裡玩?"]]],
  "tr-he":["深夜廚房的宵夜",[["tr","……你也餓了吧。"],["he","來,啊~不准說不要喔。"]]],
  "tr-hr":["凌晨三點的 demo",[["tr","新歌。……你第一個聽。"],["hr","聽完要說好聽喔,不然不放你走!"]]],
  "hy-he":["頂樓的夜櫻",[["hy","乾杯しよう!代表也要喝喔。"],["he","如果今晚不要結束就好了……"]]],
  "hy-hr":["濟州的月光",[["hy","月がきれいですね……代表知道這句話的意思嗎?"],["hr","手臂借我抱一下嘛!"]]],
  "he-hr":["枕頭堡裡的橘子",[["he","今天就睡在這裡好不好?"],["hr","張嘴!濟州的橘子最甜了!"]]]};
const duoSrc=(k,small)=>`assets/cg/duo_${k.replace("-","_")}${small?"_s":""}.webp`;
const duoOk=k=>{ const [a,b]=k.split("-"); return !!window.multiPartners?.(a)?.includes(b) };
const EXTRA={concert_first:{tag:"首場演唱會",t:"謝幕,和一整片的手燈海",line:"五個人牽著手,對著看不到盡頭的光海,深深地鞠了一躬。",lock:"首場演唱會謝幕時收進相簿",c:"#FF2E63"}};
const extraSrc=(k,small)=>`assets/cg/${k}${small?"_s":""}.webp`;
const DUO_C="#C9A24B";
/* 每場自己辦的演唱會一張紀念卡(場館照片 + 標題),代號 concert@遊戲日 */
const memKeys=()=>(S.concerts||[]).filter(c=>!c.first).map(c=>"concert@"+c.day);
const memOf=k=>{ const day=+String(k).split("@")[1], c=(S.concerts||[]).find(x=>x.day===day); if(!c) return null; const v=window.concertVenue?.(c.venue)||{n:c.venue,art:"assets/bg/ev_stage.webp"};
  return {tag:"演唱會",t:`〈${c.title}〉`,line:`${v.n}・${(c.att||0).toLocaleString()} 名觀眾${c.sold?"・全場售罄":""}${c.grade?`・演出評價 ${c.grade}`:""}`,img:v.art,th:v.art.replace(".webp","_s.webp"),c:"#FF2E63",lock:"",dl:`完美女團_演唱會_${c.title}`} };
const exKeys=()=>[...Object.keys(EXTRA),...memKeys()];
const exInfo=k=>EXTRA[k]?{...EXTRA[k],img:extraSrc(k),th:extraSrc(k,true),dl:`完美女團_${EXTRA[k].tag}`}:memOf(k);


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
  S.cgDuo=S.cgDuo||{}; S.cgEx=S.cgEx||{};
  for(const k of Object.keys(DUO)){ if(S.cgDuo[k]!=null||!duoOk(k)) continue;
    S.cgDuo[k]=S.day; (S.cgNew=S.cgNew||[]).push("duo|"+k); n++; if(!first) QUEUE.push(["duo",k]) }
  for(const k of [...(S.cgExtra||[]).filter(k=>EXTRA[k]),...memKeys()]){ if(S.cgEx[k]!=null) continue; S.cgEx[k]=S.day; (S.cgNew=S.cgNew||[]).push("extra|"+k) }   // 演出當下已經看過,只標 NEW
  if(first){ S.cgInit=true; if(n) setTimeout(()=>toast2(`手機「相簿」收進了 ${n} 張戀愛紀念照`),1500); save?.(true) }
}
/* 沒有任何畫面開著時才顯示(對話、手機、設施、事件卡都會暫停時間) */
every(1200,()=>{ try{ scan(); if(QUEUE.length&&!paused()&&!document.querySelector(".bigev:not(.out),#cgView")){ const q=QUEUE.shift(); q[0]==="duo"?showDuo(q[1],true):show(q[0],q[1],true) } }catch(e){window.logErr?.("cg",e)} });

/* ---------- 全螢幕顯示 ---------- */
function view(o,fresh,onClose){
  const el=document.createElement("div"); el.id="cgView"; el.className="cgview"+(fresh?" fresh":"");
  el.style.setProperty("--c",o.c);
  el.innerHTML=`<div class="cgimg" style="background-image:url(${o.img})"></div><div class="cgshade"></div>
    <div class="cgcap"><small>${fresh?"NEW MEMORY":"MEMORY"} ・ ${esc(o.kind)}</small>
      <div class="cgwho">${o.who}</div><h2>「${esc(o.t)}」</h2>${o.line}
      ${fresh?`<span class="cgsaved">已收進手機「相簿」,隨時可以重看</span>`:""}</div>
    <div class="cgbtns"><button class="cgb" data-hide>只看圖</button><button class="cgb" data-dl>下載・設桌布</button><button class="cgb pri" data-close>${fresh?"收進相簿":"關閉"}</button></div>`;
  $("#stage").appendChild(el); setPause("cg",true); if(fresh) setTimeout(()=>window.feedback?.("l"),300);
  const cap=()=>el.classList.toggle("bare");
  el.querySelector("[data-hide]").onclick=e=>{e.stopPropagation();cap(); if(!S.flags.cgBareTip){S.flags.cgBareTip=1; toast2("點一下畫面,按鈕和文字就會回來")}};
  el.querySelector("[data-dl]").onclick=e=>{e.stopPropagation(); window.saveImage?.(o.img,o.dl,true)};
  el.querySelector(".cgimg").onclick=()=>{ if(el.classList.contains("bare")) cap() };
  el.querySelector("[data-close]").onclick=e=>{ e.stopPropagation(); el.classList.add("out"); setTimeout(()=>el.remove(),500); setPause("cg",false); save?.(true); onClose?.() };
}
function show(id,st,fresh,onClose){ const m=byId(id), [t,line]=CG[id][st];
  view({img:src(id,st),c:m.c,kind:"戀愛紀念",who:`<b>${esc(m.n)}</b><i>${esc(st)}</i>`,t,line:`<p>${esc(line)}</p>`,dl:`完美女團_${m.n}_${st}`},fresh,onClose) }
function showDuo(k,fresh,onClose){ const [a,b]=k.split("-").map(byId), [t,L]=DUO[k];
  view({img:duoSrc(k),c:a.c,kind:"戀愛紀念",who:`<b>${esc(a.n)} × ${esc(b.n)}</b><i>多人親密</i>`,t,dl:`完美女團_${a.n}x${b.n}_多人親密`,
    line:`<p class="cgduo">${L.map(([w,x])=>{ const m=byId(w); return `<span style="--q:${m.c}"><em>${esc(m.n)}</em>${esc(x)}</span>` }).join("")}</p>`},fresh,onClose) }
function showExtra(k,fresh,onClose){ const e=exInfo(k); if(!e) return;
  view({img:e.img,c:e.c,kind:"特別回憶",who:`<b>完美女團</b><i>${esc(e.tag)}</i>`,t:e.t,line:`<p>${esc(e.line)}</p>`,dl:e.dl},fresh,onClose) }


/* ---------- 手機相簿 ---------- */
let AM=null;
window.cgNewCount=()=>(data(),(S.cgNew||[]).length);
window.cgAlbumHTML=()=>{ data(); S.cgDuo=S.cgDuo||{}; S.cgEx=S.cgEx||{};
  const cur=AM||M[0].id, dk=Object.keys(DUO), ek=exKeys(), dGot=dk.filter(k=>S.cgDuo[k]!=null), eGot=ek.filter(k=>S.cgEx[k]!=null);
  const total=M.reduce((a,m)=>a+ORDER.filter(st=>has(m.id,st)).length,0)+dk.length+ek.length,
        got=M.reduce((a,m)=>a+ORDER.filter(st=>unlocked(m.id,st)).length,0)+dGot.length+eGot.length;
  const isNew=k=>(S.cgNew||[]).includes(k);
  const chip=(id,c,label,g,all,nw)=>`<button class="cgchip${id===cur?" on":""}" data-cgm="${id}" style="--c:${c}">${label}<small>${g}/${all}</small>${nw?`<i></i>`:""}</button>`;
  const chips=M.map(m=>chip(m.id,m.c,esc(m.n),ORDER.filter(st=>unlocked(m.id,st)).length,5,ORDER.some(st=>isNew(m.id+"|"+st)))).join("")
    +chip("duo",DUO_C,"雙人",dGot.length,dk.length,dk.some(k=>isNew("duo|"+k)))+chip("extra","#FF2E63","回憶",eGot.length,ek.length,ek.some(k=>isNew("extra|"+k)));
  const card=(key,th,meta,t)=>`<button class="cgcard" data-cgv="${key}"><span class="cgth" style="background-image:url(${th})"></span><span class="cgmeta"><i>${meta}</i><b>${esc(t)}</b>${isNew(key)?`<em>NEW</em>`:""}</span></button>`;
  const lock=(meta,txt)=>`<div class="cgcard lock"><span class="cgth"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span><span class="cgmeta"><i>${meta}</i><b>${txt}</b></span></div>`;
  const cards=cur==="duo"?dk.map(k=>{ const [a,b]=k.split("-").map(byId), meta=`${esc(a.n)} × ${esc(b.n)}`;
        return S.cgDuo[k]!=null?card("duo|"+k,duoSrc(k,true),meta,DUO[k][0]):lock(meta,`兩人都到「親密」、默契 80(目前 ${Math.round(bondOf(a.id,b.id))})`) }).join("")
    :cur==="extra"?[...ek].reverse().map(k=>{ const e=exInfo(k); return e?(S.cgEx[k]!=null?card("extra|"+k,e.th,esc(e.tag),e.t):lock(esc(e.tag),esc(e.lock))):"" }).join("")
    :ORDER.filter(st=>has(cur,st)).map(st=>unlocked(cur,st)?card(cur+"|"+st,src(cur,st,true),esc(st),CG[cur][st][0]):lock(esc(st),`關係到「${esc(st)}」時解鎖`)).join("");
  return `<div class="phead"><button class="pback" data-go="home">‹</button><b>相簿</b><span>${got}/${total}</span></div>
    <div class="cgchips">${chips}</div><div class="pscroll cgscroll">${cards}</div>` };
window.cgAlbumBind=(B,rerender)=>{
  const row=B.querySelector(".cgchips"), on=row?.querySelector(".cgchip.on");   // 選中的分頁捲到看得到的位置(「雙人」「回憶」在最右邊)
  if(on) row.scrollLeft=on.offsetLeft-row.offsetLeft-(row.clientWidth-on.offsetWidth)/2;
  B.querySelectorAll("[data-cgm]").forEach(b=>b.onclick=()=>{AM=b.dataset.cgm;rerender()});
  B.querySelectorAll("[data-cgv]").forEach(b=>b.onclick=()=>{ const v=b.dataset.cgv, [id,k]=v.split("|"); S.cgNew=(S.cgNew||[]).filter(x=>x!==v);
    const back=()=>rerender(); id==="duo"?showDuo(k,false,back):id==="extra"?showExtra(k,false,back):show(id,k,false,back) });
};
window.cgAlbumOpen=()=>{ if(!AM){ const k=(S.cgNew||[])[0]; AM=k?k.split("|")[0]:M[0].id } };
})();
