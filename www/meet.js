"use strict";
/* =====================================================================
   點成員 → 互動面板(改版 1.0 第 3 輪;2026-10-29 使用者選定「下方面板」樣式)
   畫面變暗,她的半身立繪從左邊出來,下方是她專屬配色的面板:名牌(動物徽記)、她的一句話、她現在在做什麼,四個大按鈕:
     打招呼(一天一次,5 分)/隨口互動 ▸(遞飲料、注意到她的變化、一起滑手機、擊掌、摸頭;依關係開放,5 分)
     聊天(進房間直接跟她聊,15~30 分)/邀她做…(第 4 輪的活動接上之前是灰的)
   隨口互動就在面板裡演(1~3 句,點一下下一句),不換畫面;內容先找內容庫(casual),沒有那一格才用內建備用(DAILY.CASUAL_FB)。
   打開時時間暫停,扣的時間在關掉之後才走(spendTime)
   ===================================================================== */
(()=>{
const DY=window.DAILY;
const SVG=(vb,b)=>`<svg viewBox="${vb}" aria-hidden="true">${b}</svg>`;
/* 名牌前的動物徽記(白色剪影 .a、她的淺色細節 .b、深色五官 .c) */
const ANIMAL={
  ys:SVG("0 0 32 32",`<ellipse class="a" cx="11.6" cy="9.4" rx="2.9" ry="7.2" transform="rotate(-14 11.6 9.4)"/><ellipse class="a" cx="20.4" cy="9.4" rx="2.9" ry="7.2" transform="rotate(14 20.4 9.4)"/>
    <ellipse class="b" cx="11.7" cy="9.8" rx="1.2" ry="4.9" transform="rotate(-14 11.7 9.8)"/><ellipse class="b" cx="20.3" cy="9.8" rx="1.2" ry="4.9" transform="rotate(14 20.3 9.8)"/>
    <ellipse class="a" cx="16" cy="20.6" rx="8.2" ry="7.3"/><circle class="c" cx="12.9" cy="19.6" r=".95"/><circle class="c" cx="19.1" cy="19.6" r=".95"/><path class="b" d="M14.9 22.4h2.2L16 23.7z"/>
    <ellipse class="b" cx="11.2" cy="22.6" rx="1.5" ry=".8" opacity=".55"/><ellipse class="b" cx="20.8" cy="22.6" rx="1.5" ry=".8" opacity=".55"/>`),
  tr:SVG("0 0 32 32",`<path class="a" d="M6.2 12.4L7.6 4.6l5.6 4.6q2.8-.9 5.6 0l5.6-4.6 1.4 7.8q2.6 5.4-.4 10.6Q21.6 28 16 28t-9.4-5Q3.6 17.8 6.2 12.4z"/>
    <path class="b" d="M8.7 7.3l3 2.6-2.4 1.5zM23.3 7.3l-3 2.6 2.4 1.5z"/><ellipse class="c" cx="12" cy="17.8" rx="1.7" ry="1.1" transform="rotate(-12 12 17.8)"/><ellipse class="c" cx="20" cy="17.8" rx="1.7" ry="1.1" transform="rotate(12 20 17.8)"/>
    <path class="b" d="M15 21.1h2l-1 1.2z"/><path class="w" d="M2.6 19.8h5.2M3 22.4l4.9-1M29.4 19.8h-5.2M29 22.4l-4.9-1"/>`),
  hy:SVG("0 0 32 32",`<ellipse class="a" cx="17.6" cy="21.6" rx="9.6" ry="5"/><path class="a" d="M23.6 19.2l5.6-5 -1.4 7.6z"/>
    <path class="s" d="M11.6 21.2C7.2 17.6 7.6 12.9 11.5 10.5"/><circle class="a" cx="12.6" cy="8.6" r="2.6"/><path class="b" d="M10.4 8.4L6.6 9.6l3.9.8z"/><circle class="c" cx="13.1" cy="8.1" r=".6"/>
    <path class="bl" d="M13.4 20.6c3.4-2.6 7.6-2.8 11-.6"/><path class="bl" d="M5 28c2-1 4-1 6 0s4 1 6 0 4-1 6 0"/>`),
  he:SVG("0 0 32 32",`<path class="s2" d="M12.4 11.4C11.2 8.1 9.2 6.5 7 5.7M10.6 8.3C10.8 6.5 10.2 4.9 9.2 3.7M9 7.2C7.8 7.4 6.6 7.1 5.6 6.4M19.6 11.4C20.8 8.1 22.8 6.5 25 5.7M21.4 8.3C21.2 6.5 21.8 4.9 22.8 3.7M23 7.2C24.2 7.4 25.4 7.1 26.4 6.4"/>
    <ellipse class="a" cx="8.6" cy="13.6" rx="3.8" ry="1.8" transform="rotate(-24 8.6 13.6)"/><ellipse class="a" cx="23.4" cy="13.6" rx="3.8" ry="1.8" transform="rotate(24 23.4 13.6)"/>
    <ellipse class="b" cx="8.9" cy="13.6" rx="2.2" ry=".8" transform="rotate(-24 8.9 13.6)"/><ellipse class="b" cx="23.1" cy="13.6" rx="2.2" ry=".8" transform="rotate(24 23.1 13.6)"/>
    <path class="a" d="M16 29c-3.2 0-5-2.6-5.2-6.2L10 15.6c-.2-2.6 2.6-4.5 6-4.5s6.2 1.9 6 4.5l-.8 7.2C21 26.4 19.2 29 16 29z"/>
    <ellipse class="c" cx="13.4" cy="18" rx=".9" ry="1.2"/><ellipse class="c" cx="18.6" cy="18" rx=".9" ry="1.2"/><ellipse class="c" cx="16" cy="26.4" rx="1.6" ry="1.1"/><circle class="b" cx="14.6" cy="14" r=".6"/><circle class="b" cx="17.4" cy="14.2" r=".5"/>`),
  hr:SVG("0 0 32 32",`<circle class="a" cx="16" cy="16.6" r="8.2"/><path class="b" d="M8.6 9.8C5.6 9 3.4 11.4 3.6 15c.2 3 1.6 5.2 3.6 5.6 1.6.3 2.3-1.4 2.3-3.4zM23.4 9.8c3-.8 5.2 1.6 5 5.2-.2 3-1.6 5.2-3.6 5.6-1.6.3-2.3-1.4-2.3-3.4z"/>
    <ellipse class="m" cx="16" cy="20.6" rx="4.6" ry="3.6"/><circle class="c" cx="12.6" cy="15" r="1"/><circle class="c" cx="19.4" cy="15" r="1"/><ellipse class="c" cx="16" cy="18.8" rx="1.7" ry="1.2"/>
    <path class="cl" d="M16 20v1.3M14.2 21.8c.9.8 2.7.8 3.6 0"/><path class="b" d="M15.2 22.3c0 1.5 1.6 1.5 1.6 0z"/>`)};
/* 按鈕圖示(白色線條,放在她的配色圓章裡) */
const IC={
  hello:'<path d="M7 12.5V7.8a1.3 1.3 0 0 1 2.6 0V11M9.6 10.6V5.8a1.3 1.3 0 0 1 2.6 0v4.8M12.2 10.4V6.6a1.3 1.3 0 0 1 2.6 0v5M14.8 11.4V9a1.3 1.3 0 0 1 2.6 0v4.4c0 3.6-2.2 6.4-5.6 6.4-2.4 0-3.9-1.2-5.2-3.2L4.8 13.8a1.3 1.3 0 0 1 2.2-1.3"/><path d="M18.6 4.6l1.2-1.2M19.8 7.6h1.6"/>',
  casual:'<path d="M6 9h10v5.5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/><path d="M16 10.5h1.2a2 2 0 0 1 0 4H16"/><path d="M9 4.5c0 1 .9 1.2.9 2.2M12.4 4.5c0 1 .9 1.2.9 2.2"/>',
  talk:'<path d="M4.5 6.5h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4 3v-3H4.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z"/><path d="M7.5 11.5h.01M11 11.5h.01M14.5 11.5h.01"/>',
  act:'<rect x="3.5" y="5.5" width="17" height="15" rx="2.2"/><path d="M3.5 9.8h17M8 3.5v3.6M16 3.5v3.6"/><path d="M12 12.4l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z"/>',
  drink:'<path d="M6 9h10v5.5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/><path d="M16 10.5h1.2a2 2 0 0 1 0 4H16"/><path d="M9 4.5c0 1 .9 1.2.9 2.2M12.4 4.5c0 1 .9 1.2.9 2.2"/>',
  notice:'<path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z"/><circle cx="12" cy="12" r="2.6"/><path d="M19 3.4l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z"/>',
  scroll:'<rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M10.4 5.6h3.2M9.6 9.5h4.8M9.6 12.5h4.8M9.6 15.5h3"/>',
  five:'<path d="M8 12.6V6.4a1.3 1.3 0 0 1 2.6 0v4.6M10.6 10.6V4.9a1.3 1.3 0 0 1 2.6 0v5.7M13.2 10.6V6a1.3 1.3 0 0 1 2.6 0v5.4M15.8 11.6V9.2a1.3 1.3 0 0 1 2.6 0v4.6c0 3.4-2.3 6.2-5.6 6.2-2.5 0-4-1.3-5.2-3.2l-1.8-3a1.3 1.3 0 0 1 2.2-1.3L8 12.6"/><path d="M3.4 6.4l1.6.9M3.6 10.4l1.8-.2M5.6 3.4l.8 1.6"/>',
  pat:'<path d="M12 20s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.7 12 20 12 20z"/><path d="M17.6 4.2l.4 1.3 1.3.4-1.3.4-.4 1.3-.4-1.3-1.3-.4 1.3-.4z"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  back:'<path d="M14.5 6l-6 6 6 6"/>',
  note:'<path d="M9 18V6.5l10-2.2V16"/><circle cx="6.8" cy="18" r="2.3"/><circle cx="16.8" cy="16" r="2.3"/>',
  run:'<circle cx="14.5" cy="4.8" r="1.8"/><path d="M9.5 21l2.2-5.2 3 2.6V22M7 11.5l3.4-3 3.5.6 2.4 3.2 2.7 1M11.7 15.8l1-5.2"/>',
  star:'<path d="M12 3.8l2.4 5 5.4.7-4 3.7 1 5.4L12 16l-4.8 2.6 1-5.4-4-3.7 5.4-.7z"/><path d="M19.5 3.5v2.4M18.3 4.7h2.4"/>',
  tv:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8.5 3l3.5 3 3.5-3M8 21h8"/>',
  bag:'<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  book:'<path d="M4 5.5c3-1.3 5.5-1.3 8 .5 2.5-1.8 5-1.8 8-.5v13c-3-1.3-5.5-1.3-8 .5-2.5-1.8-5-1.8-8-.5z"/><path d="M12 6v13"/>',
  pan:'<circle cx="10" cy="13" r="6"/><path d="M15.6 10.6L21 7"/><path d="M8 11.5c.8-.9 2-.9 2.8 0"/>',
  walk:'<path d="M3 17c2.5-1.6 4.5-1.6 7 0s4.5 1.6 7 0 3-1.2 4-1"/><path d="M3 12c2.5-1.6 4.5-1.6 7 0s4.5 1.6 7 0 3-1.2 4-1"/><path d="M15 4.5l2.5 3"/>'};
const ic=(k,cls="")=>`<i class="mt-ic${cls?" "+cls:""}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg></i>`;
const ACT_IC={dance:"five",vocal:"note",hr_guitar:"note",tr_earphone:"note",drama:"tv",river:"walk",store:"bag",run:"run",roof:"star",ys_notebook:"book",he_kitchen:"pan",hy_ballet:"five"};
const CA_N={drink:"遞飲料",notice:"注意到她的變化",scroll:"一起滑手機",five:"擊掌",pat:"摸頭"};
const CA_SHORT={drink:"遞飲料",notice:"注意變化",scroll:"滑手機",five:"擊掌",pat:"摸頭"};
const CA_SUB={drink:"順手遞一瓶",notice:"髮型、配件、心情",scroll:"她給你看手機",five:"練完、做得好的時候",pat:"夥伴以上"};
const CA_GATE={drink:"戒備",notice:"戒備",scroll:"信任",five:"信任",pat:"夥伴"};
const RANK=()=>window.STAGE_RANK||["戒備","信任","夥伴","心動","戀人","親密"];
const gateOk=(id,ca)=>RANK().indexOf(stageOf(id))>=RANK().indexOf(CA_GATE[ca]||"戒備");
const ACT_N={practice:"練習",vocal:"練聲",studio:"錄音、寫歌",office:"開會",styling:"試裝",photo:"拍攝",lobby:"休息",living:"在客廳",kitchen:"在廚房",store:"買東西",river:"散步",bed:"在房間"};
let MT=null, lastOpen=0;
const bandNow=id=>DY.bandOf(stageOf(id));
function stateOf(id){ const s=S.m[id]; if(S.slot===4) return "sleepy"; if(s.stress>=70) return "tired"; if(["practice","vocal"].includes(S.where[id])&&(S.slot===2||S.slot===3)) return "after_practice"; if(s.mood>=80) return "bright"; return "" }
function nowLine(id){ const w=S.where[id]||"", base=w.startsWith("bed_")?"bed":w; return `${PL[w]?.n||""}・${S.doing?.[id]||ACT_N[base]||""}` }
function greet(id){ const L=DY.GREET?.[id]?.[bandNow(id)==="A"?"A":"B"]||[["……","neutral"]], r=rng(seedOf(S.day,S.slot,"greet"+id)); return L[Math.floor(r()*L.length)] }
/* 隨口互動:內容庫優先(同房間的更優先),沒有才用內建備用 */
function pickCasual(id,ca){ const st=stageOf(id), band=bandNow(id), room=S.where[id]||"", grp=DY.grpOf?.(room), state=stateOf(id);
  const ok=sn=>sn.type==="casual"&&(sn.member===id||sn.who?.[0]===id)&&sn.ca===ca&&(!sn.band||sn.band===band)&&(!sn.stage||sn.stage===st)&&(!sn.sl?.length||sn.sl.includes(S.slot))
    &&(!sn.room||DY.grpOf?.(sn.room)===grp)&&(!sn.state||sn.state===state)&&dateOk(sn)&&(!sn.period||sn.period===periodNow())&&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||3))&&sn.nodes?.start?.L?.length;
  const cs=snips().filter(ok), exact=cs.filter(sn=>sn.room===room), sn=pickW(exact.length&&Math.random()<.6?exact:cs);
  if(sn){ S.seen[sn.code]=S.day; return {L:fillVars(sn).nodes.start.L.filter(l=>l[0]!=="@"),code:sn.code} }
  const fb=DY.CASUAL_FB?.[id]?.[ca]; return fb?{L:fb.L,code:""}:null }
/* ---------- 畫面 ---------- */
function portraitUrl(id,e){ return spr(id,outfitAt(id,S.where[id],S.slot),e||"neutral") }
function head(id){ const m=byId(id); return `<div class="mt-name"><span class="mt-emb">${ANIMAL[id]||""}</span><b>${esc(m.n)}</b><em>${esc((m.f||id).toUpperCase())}</em><span class="mt-stage">${esc(stageOf(id))}</span></div>` }
function optsHTML(id){ const greeted=S.greet?.[id]===S.day;
  return `<div class="mt-opts">
    <button class="mt-opt" data-mt="hello" ${greeted?"disabled":""}>${ic("hello")}<span><b>打招呼</b><small>${greeted?"今天打過招呼了":"5 分"}</small></span></button>
    <button class="mt-opt sub" data-mt="casual">${ic("casual")}<span><b>隨口互動</b><small>每次 5 分</small></span></button>
    <button class="mt-opt" data-mt="talk">${ic("talk")}<span><b>聊天</b><small>15~30 分</small></span></button>
    ${(()=>{ const n=window.actsFor?.(id)?.length||0; return `<button class="mt-opt sub" data-mt="act" ${n?"":"disabled"}>${ic("act")}<span><b>邀她做…</b><small>${n?`${n} 個活動`:"現在沒有"}</small></span></button>` })()}</div>` }
/* 邀她做…:現在能一起做的活動(最多 5 個)+返回 */
function actHTML(id){ const L=(window.actsFor?.(id)||[]).slice(0,3);   // A55 上放得下的數量:三個活動+返回(她專屬的排前面)
  return `<div class="mt-opts">${L.map(({k,a,room})=>`<button class="mt-opt act" data-act="${k}" aria-label="${esc(a.n)}">${ic(ACT_IC[k]||"act")}<span><b>${esc(a.menu)}</b><small>${fmtMin(a.min)}${room!==S.where[id]?`・去${esc(PL[room]?.n||"")}`:""}</small></span></button>`).join("")}
    <button class="mt-opt back" data-mt="home">${ic("back")}<span><b>返回</b></span></button></div>` }
function casualHTML(id){ return `<div class="mt-opts six">${Object.keys(CA_N).map(k=>{ const ok=gateOk(id,k); return `<button class="mt-opt sm" data-ca="${k}" ${ok?"":"disabled"} aria-label="${CA_N[k]}">${ic(k)}<span><b>${CA_SHORT[k]}</b>${ok?"":`<small>${CA_GATE[k]}以後</small>`}</span></button>` }).join("")}
    <button class="mt-opt sm back" data-mt="home">${ic("back")}<span><b>返回</b></span></button></div>` }
function render(){ if(!MT) return; const {id,el}=MT, pan=el.querySelector(".mt-pan");
  pan.classList.toggle("play",MT.mode==="play");
  el.querySelector(".mt-right").innerHTML=MT.mode==="casual"?casualHTML(id):MT.mode==="act"?actHTML(id):MT.mode==="play"?"":optsHTML(id);
  el.querySelectorAll("[data-act]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); const k=b.dataset.act, pid=MT.pid; close(()=>window.actStart?.(id,k)) });
  el.querySelectorAll("[data-mt]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); act(b.dataset.mt) });
  el.querySelectorAll("[data-ca]").forEach(b=>b.onclick=e=>{ e.stopPropagation(); play(b.dataset.ca) }) }
function say(line,expr,narr){ if(!MT) return; const t=MT.el.querySelector(".mt-line"); t.classList.toggle("narr",!!narr); t.classList.remove("in"); void t.offsetWidth;
  t.textContent=narr?line:`「${line}」`; t.classList.add("in"); if(!narr&&expr) setFace(expr) }
function setFace(e){ const p=MT?.el.querySelector(".mt-por"); if(!p) return; const u=portraitUrl(MT.id,e), cur=p.querySelector("i:last-child");
  if(cur&&cur.dataset.u===u) return; const n=document.createElement("i"); n.dataset.u=u; n.style.backgroundImage=`url("${u}")`; p.appendChild(n);
  if(!RM.matches) n.animate([{opacity:0},{opacity:1}],{duration:220,easing:"ease-out"}); setTimeout(()=>{ while(p.children.length>1) p.firstChild.remove() },260) }
function chip(t,cls=""){ const w=MT?.el.querySelector(".mt-chips"); if(!w) return; const c=document.createElement("span"); c.className="mt-chip "+cls; c.textContent=t; w.appendChild(c);
  if(!RM.matches) c.animate([{opacity:0,translate:"0 40%"},{opacity:1,translate:"0 0"}],{duration:300,easing:"ease-out"}); setTimeout(()=>c.remove(),2600) }
/* ---------- 動作 ---------- */
function act(k){ if(!MT) return; const id=MT.id;
  if(k==="home"){ MT.mode="home"; render(); return }
  if(k==="casual"){ MT.mode="casual"; render(); return }
  if(k==="act"){ MT.mode="act"; render(); return }
  if(k==="hello"){ play("hello"); return }
  if(k==="talk"){ const pid=MT.pid; close(()=>window.visitTalk?.(pid,id)); return } }
function play(ca){ if(!MT) return; const id=MT.id, c=pickCasual(id,ca); if(!c){ toast2("這個還沒有內容"); return }
  MT.mode="play"; MT.q=c.L.slice(); MT.ca=ca; render(); next() }
function next(){ if(!MT||MT.mode!=="play") return; const l=MT.q.shift();
  if(!l){ finish(); return }
  const [w,t,e]=l; if(!w||w==="narr") say(t,null,true); else if(w===MT.id) say(t,e||"neutral"); else say(`${byId(w)?.n||""}:${t}`,null,true) }
function finish(){ const id=MT.id, ca=MT.ca;
  if(ca==="hello"){ (S.greet=S.greet||{})[id]=S.day }
  const before=S.m[id].xp||0; window.applyGain?.(id,{s:"陪著",g:ca==="pat"?2:1,to:id},()=>{}); const d=(S.m[id].xp||0)-before;
  if(d>0) chip(`好感 +${d}`,"g"); const used=window.spendTime?.(5,"隨口互動")||0; if(used) chip(`+${used} 分`);
  save(true); MT.mode="home"; setTimeout(()=>{ if(MT){ render() } },350) }
/* ---------- 打開、關閉 ---------- */
window.meetOpen=async(id,pid)=>{ if(MT||V||D||Date.now()-lastOpen<400) return; const m=byId(id); if(!m) return; lastOpen=Date.now();
  pid=pid||S.where[id]; setPause("meet",true);
  const [g,ge]=greet(id), u=portraitUrl(id,ge);
  try{ const im=new Image(); im.src=u; await Promise.race([im.decode(),new Promise(r=>setTimeout(r,350))]) }catch(e){}
  const el=document.createElement("div"); el.id="meet"; el.className="mtheme"; el.dataset.m=id;
  el.innerHTML=`<div class="mt-veil"></div><div class="mt-por"><i data-u="${u}" style="background-image:url(&quot;${u}&quot;)"></i></div>
    <button class="mt-x" aria-label="返回">${ic("back")}<span>返回</span></button>
    <div class="mt-pan"><span class="mt-orn tl"></span><span class="mt-orn tr"></span><span class="mt-orn bl"></span><span class="mt-orn br"></span>
      <div class="mt-left">${head(id)}<p class="mt-line">「${esc(g)}」</p><div class="mt-now"><span>${esc(nowLine(id))}</span><span class="mt-mood" style="--v:${S.m[id].mood}%">心情</span></div><div class="mt-chips"></div><span class="mt-next">▼</span></div>
      <div class="mt-right"></div></div>`;
  $("#stage").appendChild(el); $("#stage").classList.add("mt-on"); MT={id,pid,el,mode:"home",q:[]}; render();
  el.querySelector(".mt-veil").onclick=()=>MT?.mode==="play"?next():close();
  el.querySelector(".mt-x").onclick=e=>{ e.stopPropagation(); close() };
  el.querySelector(".mt-pan").onclick=()=>{ if(MT?.mode==="play") next() };
  el.querySelector(".mt-por").onclick=()=>{ if(MT?.mode==="play") next() };
  if(!RM.matches){ el.querySelector(".mt-veil").animate([{opacity:0},{opacity:1}],{duration:240,easing:"ease-out"});
    el.querySelector(".mt-por").animate([{opacity:0,translate:"-6% 0"},{opacity:1,translate:"0 0"}],{duration:380,easing:"cubic-bezier(.2,.8,.25,1)"});
    el.querySelector(".mt-pan").animate([{opacity:0,translate:"0 14%"},{opacity:1,translate:"0 0"}],{duration:320,delay:60,easing:"cubic-bezier(.2,.8,.25,1)",fill:"backwards"}) }
  window.feedback?.("s") };
function close(after){ if(!MT) return; const el=MT.el; MT=null;
  $("#stage").classList.remove("mt-on");
  const done=()=>{ el.remove(); setPause("meet",false); after?.(); renderAll() };
  if(RM.matches){ done(); return }
  el.querySelector(".mt-veil").animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards"});
  el.querySelector(".mt-por").animate([{opacity:1},{opacity:0,translate:"-4% 0"}],{duration:200,fill:"forwards"});
  el.querySelector(".mt-pan").animate([{opacity:1},{opacity:0,translate:"0 8%"}],{duration:200,fill:"forwards"}).finished.then(done,done) }
window.meetClose=close;
window.meetBack=()=>{ if(!MT) return false; if(MT.mode==="casual"||MT.mode==="act"){ MT.mode="home"; render() } else if(MT.mode==="play") next(); else close(); return true };
window.meetIsOpen=()=>!!MT;
})();
