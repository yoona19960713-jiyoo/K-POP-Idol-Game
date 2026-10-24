"use strict";
/* =====================================================================
   遊戲內手機:訊息、團體聊天室、行程、社群(STARLOG)、設定(桌布)
   - 訊息與團體聊天:製作者模式的「訊息」「群組聊天」片段;有選項時在聊天室裡回覆,回覆方式影響信任與心情
   - 社群:「社群」片段變成成員的貼文與粉絲反應
   - 行程:今天每位成員各時段的預定位置,以及這一週的公司行事曆
   看手機不花行動,打開時時間暫停
   ===================================================================== */
(()=>{
const EXN={neutral:1,smile:1,laugh:1,sad:1,angry:1,shy:1};
const GROUP_NAME="完美女團 ♡ 宿舍群組";
function ph(){ if(!S.phone){ S.phone={threads:{},pend:{},feed:[],read:{},wall:"title"};
    // 舊版的訊息搬進聊天室
    for(const x of [...(S.msgs||[])].reverse()){ (S.phone.threads[x.id]=S.phone.threads[x.id]||[]).push({w:x.id,t:x.t,when:x.when}) } }
  return S.phone }
const stamp=()=>({day:S.day,slot:S.slot,hm:hm()});
const whenTxt=x=>x?.day==null?(x?.when||""):x.day===S.day?x.hm:`${x.day===S.day-1?"昨天":`第 ${x.day+1} 天`} ${x.hm}`;
const face=(id,cls="")=>{const m=byId(id); return `<span class="pface ${cls}" style="--c:${m.c};background-image:url(${spr(id,null,"smile")})"></span>`};
const stripQ=t=>String(t||"").replace(/^「|」$/g,"");
const unreadOf=k=>{const p=ph(), n=(p.threads[k]||[]).length; return Math.max(0,n-(p.read[k]||0))+(p.pend[k]?0:0)};
function recount(){ const p=ph(); let n=0; for(const k of Object.keys(p.threads)) n+=unreadOf(k); n+=p.feed.filter(f=>!f.seen).length; S.unread=n; renderHud() }

/* ---------- 時段切換時:收到訊息、群組、社群貼文 ---------- */
function okSnip(sn){ return (!sn.sl?.length||sn.sl.includes(S.slot))&&stageOk(sn)&&(!sn.period||sn.period===periodNow())&&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||4))&&sn.nodes?.start }
function pushLines(key,lines){ const p=ph(), t=p.threads[key]=p.threads[key]||[], st=stamp();
  for(const l of lines||[]) if(l&&l[1]) t.push({w:l[0]||"",t:l[1],e:EXN[l[2]]?l[2]:"",...st});
  if(t.length>80) t.splice(0,t.length-80) }
window.phoneIncoming=r=>{
  const p=ph();
  // 個人訊息
  if(r()<.55){ const m=M[Math.floor(r()*5)];
    if(!p.pend[m.id]){ const cs=snips().filter(sn=>sn.type==="msg"&&(sn.member||sn.who?.[0])===m.id&&okSnip(sn)); const sn=pickW(cs,r);
      if(sn){ S.seen[sn.code]=S.day; pushLines(m.id,sn.nodes.start.L); if(sn.nodes.start.C?.length) p.pend[m.id]={code:sn.code,node:"start"} }
      else { const pool=(MSG[m.id]||[]).filter(x=>x[1].includes(S.slot)); if(pool.length) pushLines(m.id,[[m.id,pool[Math.floor(r()*pool.length)][0]]]) } } }
  // 團體聊天室
  if(r()<.28&&!p.pend.group){ const cs=snips().filter(sn=>sn.type==="group"&&okSnip(sn)); const sn=pickW(cs,r);
    if(sn){ S.seen[sn.code]=S.day; pushLines("group",sn.nodes.start.L); if(window.addBond) addBond([...new Set((sn.nodes.start.L||[]).map(l=>l[0]))],.8); if(sn.nodes.start.C?.length) p.pend.group={code:sn.code,node:"start"} } }
  // 社群貼文
  if(r()<.3){ const cs=snips().filter(sn=>sn.type==="social"&&okSnip(sn)); const sn=pickW(cs,r);
    if(sn){ S.seen[sn.code]=S.day; const id=sn.member||sn.who?.[0]; const pop=Math.max(5,(S.m[id]?.trust||10));
      p.feed.unshift({code:sn.code,id,sc:sn.sc||"",lines:sn.nodes.start.L||[],likes:Math.round((800+r()*2200)*(1+pop/40)),cm:Math.round((40+r()*260)*(1+pop/60)),...stamp(),seen:false,
        choice:sn.nodes.start.C?.length?"start":null}); p.feed=p.feed.slice(0,40); fillPhotos() } }
  recount();
};

/* ---------- 手機外殼 ---------- */
let APP="home", CHAT=null;
function shell(){
  const el=$("#phone"); if(el.dataset.v==="2") return; el.dataset.v="2"; el.className="phone2";
  el.innerHTML=`<div class="pdev" role="dialog" aria-label="手機"><div class="pscreen" id="pScreen">
      <div class="pstat"><b id="pTime"></b><i class="island"></i><span class="psig"><i></i><i></i><i></i><i></i></span><span class="pbat"><i id="pBat"></i></span></div>
      <div class="pbody" id="pBody"></div><div class="pfx" id="pFx"></div>
      <button class="phome" id="pHome" aria-label="回到主畫面"></button></div></div>
    <button class="pclose" id="pClose">收起手機</button>`;
  $("#pHome").onclick=()=>{ if(APP==="home") close(); else {APP="home";CHAT=null;render()} };
  $("#pClose").onclick=close; el.onclick=e=>{if(e.target===el) close()};
}
function open(){ shell(); APP="home"; CHAT=null; $("#phone").classList.add("on"); setPause("phone",true); render() }
function close(){ $("#phone").classList.remove("on"); setPause("phone",false); save() }
function status(){ $("#pTime").textContent=hm(); const b=Math.max(8,100-S.slot*18-Math.floor((S.t||0)/SLOT_SEC*14)); const e=$("#pBat"); e.style.width=b+"%"; e.classList.toggle("low",b<25) }
function pfx(t,c){const e=document.createElement("span"); e.style.setProperty("--c",c||"#E85C8A"); e.textContent=t; $("#pFx").appendChild(e); setTimeout(()=>e.remove(),2400)}
/* 桌布:合照是橫的,直接鋪滿只會剩中間一人,所以用「完整合照 + 同一張模糊放大當底」;場景類照樣鋪滿 */
const WALLS={title:"assets/bg/title.webp",group:"assets/bg/group_photo.webp",styling:"assets/bg/styling_evening.webp",night:"assets/scene/map_night.webp",portrait:"assets/bg/wall_group.webp"};
const FIT={title:"group",group:"group"};
const wallHTML=k=>{const src=WALLS[k]||WALLS.title; return FIT[k]==="group"
  ?`<div class="pwall blur" style="background-image:url(${src})"></div><div class="pwall fit${k==="title"?" low":""}" style="background-image:url(${src})"></div>`
  :k==="portrait"?`<div class="pwall dark"></div><div class="pwall portrait" style="background-image:url(${src})"></div>`
  :`<div class="pwall" style="background-image:url(${src})"></div>`};
function render(){ status(); const B=$("#pBody"); B.className="pbody app-"+APP;
  B.innerHTML=APP==="home"?home():APP==="chats"?chats():APP==="chat"?chat():APP==="sched"?sched():APP==="star"?star():APP==="set"?settings():APP==="album"&&window.cgAlbumHTML?cgAlbumHTML():"";
  bind(B); if(APP==="album"&&window.cgAlbumBind) cgAlbumBind(B,render); if(APP==="chat"){const L=$("#pLog"); if(L) L.scrollTop=L.scrollHeight} }

/* ---------- 主畫面 ---------- */
function icon(k,n,svg,badge,grad){return `<button class="papp" data-app="${k}"><span class="pico" style="background:${grad}">${svg}${badge?`<i class="pbadge">${badge>99?"99+":badge}</i>`:""}</span><small>${n}</small></button>`}
function home(){ const p=ph(), d=dateOf(S.day), WDN=["日","一","二","三","四","五","六"];
  const msgN=Object.keys(p.threads).filter(k=>k!=="group").reduce((a,k)=>a+unreadOf(k),0), grpN=unreadOf("group"), feedN=p.feed.filter(f=>!f.seen).length;
  return `${wallHTML(curWall())}
    <div class="pclock"><b>${hm()}</b><span>${d.getMonth()+1}月${d.getDate()}日 星期${WDN[d.getDay()]}・${SLOTS[S.slot].n}</span></div>
    <div class="pgrid">
      ${icon("chats","訊息",'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',msgN,"linear-gradient(160deg,#FF8FB3,#E0457B)")}
      ${icon("group","群組",'<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3 19c.8-3 3-4.5 5-4.5s4.2 1.5 5 4.5M11 19c.8-3 3-4.5 5-4.5s4.2 1.5 5 4.5"/></svg>',grpN,"linear-gradient(160deg,#B79CFF,#7B4FBF)")}
      ${icon("sched","行程",`<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M9 3v4M15 3v4"/></svg>`,0,"linear-gradient(160deg,#FFD38A,#E8963C)")}
      ${icon("star","STARLOG",'<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>',feedN,"linear-gradient(160deg,#7FE3D5,#2F9C9A)")}
      ${icon("album","相簿",'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></svg>',window.cgNewCount?cgNewCount():0,"linear-gradient(160deg,#FFB3C8,#C8102E)")}
      ${icon("set","設定",'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/></svg>',0,"linear-gradient(160deg,#C9CED8,#7E8696)")}
    </div>
    <div class="pdock"><span>看手機不花行動,時間會暫停</span></div>`}

/* ---------- 訊息列表 ---------- */
function head(title,back="home",right=""){return `<div class="phead"><button class="pback" data-go="${back}">‹</button><b>${title}</b><span>${right}</span></div>`}
function chats(){ const p=ph();
  const rows=M.map(m=>{const t=p.threads[m.id]||[], last=t[t.length-1]; return {m,last,u:unreadOf(m.id),pend:!!p.pend[m.id],ts:last?(last.day||0)*10+(last.slot||0):-1}}).sort((a,b)=>b.ts-a.ts);
  return head("訊息")+`<div class="plist">${rows.map(({m,last,u,pend})=>`<button class="prow" data-chat="${m.id}">${face(m.id)}<div class="pmid"><b>${m.n}</b><small>${last?esc(last.w==="me"?"你:"+last.t:last.t):"還沒有訊息"}</small></div>
      <div class="pright"><small>${last?whenTxt(last):""}</small>${u?`<i class="pdot">${u}</i>`:pend?`<i class="preply">待回覆</i>`:""}</div></button>`).join("")}</div>`}

/* ---------- 聊天室(個人與群組) ---------- */
function bubbles(t,isGroup){ let lastW=null, lastDay=null;
  return t.map(x=>{ let h=""; if(x.day!=null&&x.day!==lastDay){lastDay=x.day; h+=`<div class="pday">${x.day===S.day?"今天":`第 ${x.day+1} 天`}</div>`}
    const me=x.w==="me", m=byId(x.w), show=!me&&isGroup&&x.w!==lastW; lastW=x.w;
    if(!x.w) return h+`<div class="psys">${esc(x.t)}</div>`;
    return h+`<div class="pb ${me?"me":"them"}" style="--c:${m?.c||"#E85C8A"}">${!me&&x.w!==t[t.indexOf(x)-1]?.w?face(x.w,"sm"):`<span class="pgap"></span>`}
      <div>${show?`<small class="pwho" style="color:${m.c}">${m.n}</small>`:""}<p>${esc(x.t)}</p></div><time>${x.hm||""}</time></div>` }).join("") }
function chat(){ const p=ph(), k=CHAT, g=k==="group", t=p.threads[k]||[], pend=p.pend[k];
  p.read[k]=t.length; recount();
  let opts=""; if(pend){ const sn=snipBy(pend.code), n=sn?.nodes?.[pend.node]; if(n?.C?.length) opts=`<div class="popts">${n.C.map((c,i)=>`<button data-rep="${i}">${esc(stripQ(c.t))}</button>`).join("")}</div>` }
  return head(g?GROUP_NAME:byId(k).n,"chats",g?"6 人":"")+`<div class="plog" id="pLog">${t.length?bubbles(t,g):`<p class="pempty">${g?"群組裡還很安靜。":"還沒有訊息。時段切換時她可能會傳訊息來。"}</p>`}
    ${pend?`<div class="ptyping" id="pTyping" hidden><i></i><i></i><i></i></div>`:""}</div>${opts||`<div class="pinput"><span>${pend?"":"沒有需要回覆的訊息"}</span></div>`}`}
const snipBy=code=>snips().find(s=>s.code===code);
async function reply(i){ const p=ph(), k=CHAT, pend=p.pend[k]; if(!pend) return; const sn=snipBy(pend.code), n=sn?.nodes?.[pend.node], c=n?.C?.[i]; if(!c) return;
  const to=c.to&&byId(c.to)?c.to:(k==="group"?(sn.who?.[0]||"ys"):k);
  pushLines(k,[["me",stripQ(c.t)]]); delete p.pend[k];
  const before=S.m[to]?.xp||0; applyChoice({...c,to}); const dt=(S.m[to]?.xp||0)-before;
  if(dt>0) pfx(`${byId(to).n} 好感 +${dt}`,byId(to).c);
  render(); const typing=()=>{const e=$("#pTyping"); if(e){e.hidden=false; $("#pLog").scrollTop=1e9}};
  const next=c.next&&sn.nodes[c.next];
  const lines=[...(c.r||[]),...(next?.L||[])];
  for(const l of lines){ typing(); await new Promise(r=>setTimeout(r,650+Math.min(1400,String(l[1]||"").length*35))); if(APP!=="chat"||CHAT!==k) {pushLines(k,[l]); continue} pushLines(k,[l]); p.read[k]=(p.threads[k]||[]).length; render() }
  if(next?.C?.length) p.pend[k]={code:sn.code,node:c.next};
  save(); recount(); if(APP==="chat"&&CHAT===k) render() }

/* ---------- 行程 ---------- */
const placeName=k=>k.startsWith("外出:")?k.slice(3):k.startsWith("bed_")?"自己房間":(PL[k]?.n||k);
function whereAt(m,slot){ const w=WHERE[m.id][slot], r=rng(seedOf(S.day,slot,m.id));
  const ok=Object.fromEntries(Object.entries(w).filter(([k])=>k.startsWith("外出")||PL[k==="bedroom"?"bed_"+m.id:k].open.includes(slot)));
  let k=pickKey(Object.keys(ok).length?ok:{practice:1},r); if(k==="bedroom") k="bed_"+m.id; return k }
const WEEK=[["日","休假日・自主練習","rest"],["一","上午 公司週會・下午 舞蹈課",""],["二","下午 聲樂課",""],["三","下午 舞蹈課・晚上 體能訓練",""],["四","下午 錄音・晚上 自主練習",""],["五","下午 舞蹈評估",""],["六","上午 個人課程・下午 自主練習",""]];
function sched(){ const d=dateOf(S.day);
  const lastSat=(()=>{const x=new Date(d.getFullYear(),d.getMonth()+1,0); while(x.getDay()!==6) x.setDate(x.getDate()-1); return x.getDate()})();
  const days=[...Array(7)].map((_,i)=>{const day=S.day+i, x=dateOf(day); const w=WEEK[x.getDay()]; const eva=window.isEvalDay?isEvalDay(x):(x.getDay()===6&&x.getDate()===lastSat);
    const show=window.promoShowOn?.(day), deb=day===window.DEBUT_DAY, cb=S.comeback===day;
    const txt=deb?"<em>出道日</em>・Showcase":cb?"<em>回歸日</em>・回歸 Showcase":show?`<em>打歌</em>・${show}`:eva?"<em>月評</em>・全天 月末評估":w[1];
    return `<div class="pcal${i===0?" today":""}${w[2]==="rest"&&!show?" rest":""}${eva||show||deb||cb?" eva":""}"><b>${x.getMonth()+1}/${x.getDate()}<small>週${w[0]}</small></b><span>${txt}</span></div>`}).join("");
  const P=window.promoInfo?.(), dd=(window.DEBUT_DAY||0)-S.day;
  const notice=dd>0?`<b>出道企劃進行中・${debutText()}</b><p>2017 年 7 月 13 日出道。主打歌與造型在 2F 企劃室、1F 造型室準備,每月最後一個週六有月評。</p>`
    :P?.active?`<b>${P.kind==="debut"?"出道":"回歸"}宣傳期進行中</b><p>〈${esc(P.title)}〉打歌到 ${fmtGameDay(P.end)}。沒去電視台的那天,會用上一場的準備單自動上台。</p>`
    :S.comeback!=null?`<b>回歸日 ${fmtGameDay(S.comeback)}</b><p>還有 ${S.comeback-S.day} 天,企劃室和造型室可以開始準備了。</p>`
    :`<b>空白期</b><p>到 2F 企劃室決定下一次的回歸日。</p>`;
  const fansLine=dd<=0&&window.fansText?`<p class="pfans">粉絲 ${fansText()}・一位 ${S.stats?.wins||0} 次${(S.stats?.awards||[]).flatMap(a=>a.got).length?`・獎項 ${(S.stats.awards||[]).flatMap(a=>a.got).length} 座`:""}</p>`:"";
  return head("行程")+`<div class="pscroll"><h4>今天的成員動向 <small>之後的時段是預定,可能會變</small></h4>
    <div class="ptab"><div class="pth"><span></span>${SLOTS.map((s,i)=>`<span class="${i===S.slot?"now":i<S.slot?"past":""}">${s.n}</span>`).join("")}</div>
    ${M.map(m=>`<div class="ptr">${face(m.id,"sm")}${SLOTS.map((_,i)=>{const k=i===S.slot?(S.where[m.id]||whereAt(m,i)):whereAt(m,i);return `<span class="${i===S.slot?"now":i<S.slot?"past":""}">${esc(placeName(k))}</span>`}).join("")}</div>`).join("")}</div>
    <h4>這一週</h4><div class="pweek">${days}</div>
    <h4>公司公告</h4><div class="pnote">${notice}${fansLine}</div></div>`}

/* ---------- STARLOG(社群) ---------- */
/* 貼文配圖:照片清單在 assets/starlog.js。依貼文情境與台詞的關鍵字挑;沒命中就從她自己的自拍與物品照隨機。
   挑好寫進 feed 項目的 photo(存檔保留,不會換來換去);舊貼文第一次顯示時補挑。只有清單裡有的照片才會被挑。 */
const SLP=()=>window.STARLOG_PHOTOS||[];
const slSrc=k=>`assets/starlog/${k}.webp`;
function slHash(t){ let h=2166136261; for(const ch of String(t)) h=Math.imul(h^ch.charCodeAt(0),16777619); return h>>>0 }
function pickPhoto(f,recent){ const L=SLP(); if(!L.length) return null;
  const mine=L.filter(x=>x.who===f.id), own=(f.lines||[]).filter(l=>l[0]===f.id||!byId(l[0])).map(l=>l[1]).join(" ");
  const seed=slHash(`${f.code}|${f.day}|${f.slot}`), txt=`${f.sc||""} ${own}`;
  const pool=L.filter(x=>x.who===f.id||x.who==="grp");
  const score=x=>x.tags.reduce((a,t)=>a+(txt.includes(t)?1+(t.length>1?.5:0):0),0);
  let cand;
  if(/直播|開播|Live|LIVE|V ?LIVE/.test(txt)) cand=mine.filter(x=>x.kind==="selfie");
  if(!cand?.length){ const sc=pool.map(x=>[x,score(x)]).filter(([,v])=>v>0);
    if(sc.length){ const best=Math.max(...sc.map(([,v])=>v)); cand=sc.filter(([,v])=>v>=best-.5).map(([x])=>x) } }
  if(!cand?.length) cand=mine.length?mine:pool;
  if(!cand.length) return null;
  const fresh=cand.filter(x=>!recent.includes(x.key)); if(fresh.length) cand=fresh;
  return cand[seed%cand.length].key }
/* 新貼文與舊貼文補圖(由舊到新,避開前兩則剛用過的) */
function fillPhotos(){ const p=ph(); if(!SLP().length) return false; let ch=false;
  for(let i=p.feed.length-1;i>=0;i--){ const f=p.feed[i]; if(f.photo!==undefined&&(f.photo===null||SLP().some(x=>x.key===f.photo))) continue;
    f.photo=pickPhoto(f,[p.feed[i+1]?.photo,p.feed[i+2]?.photo].filter(Boolean)); ch=true }
  return ch }
function viewPhoto(i){ const f=ph().feed[i]; if(!f?.photo) return; const m=byId(f.id)||M[0];
  document.getElementById("slView")?.remove();
  const el=document.createElement("div"); el.id="slView"; el.className="slview"; el.style.setProperty("--c",m.c);
  el.innerHTML=`<div class="slbg" style="background-image:url(${slSrc(f.photo)})"></div>
    <figure><img src="${slSrc(f.photo)}" alt=""><figcaption>${face(m.id,"sm")}<div><b>${esc(m.n)}</b><small>@perfect_${m.f} ・ ${whenTxt(f)}</small></div><span>♡ ${f.likes.toLocaleString()}</span></figcaption></figure>
    <button class="slx" aria-label="關閉">✕</button>`;
  const close=()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),300) };
  el.onclick=close; $("#stage").appendChild(el) }
function star(){ const p=ph(); p.feed.forEach(f=>f.seen=true); if(fillPhotos()) save(); recount();
  const era=dateOf(S.day).getFullYear()>=2020?"粉絲通訊":"STARLOG";
  return head(era)+`<div class="pscroll feed">${p.feed.length?p.feed.map((f,i)=>{const m=byId(f.id)||M[0];
    const ln=(f.lines||[]).filter(l=>l[1]);
    return `<article class="ppost"><header>${face(m.id,"sm")}<div><b>${m.n}</b><small>@perfect_${m.f} ・ ${whenTxt(f)}</small></div></header>
      ${f.sc?`<p class="psc">${esc(f.sc)}</p>`:""}${ln.map(l=>l[0]===f.id||!byId(l[0])?`<p>${esc(l[1])}</p>`:`<p class="pfan"><b style="color:${byId(l[0]).c}">${byId(l[0]).n}</b> ${esc(l[1])}</p>`).join("")}
      ${f.photo?`<button class="pphoto" data-photo="${i}" aria-label="放大照片"><img src="${slSrc(f.photo)}" alt="" loading="lazy"></button>`:""}
      <footer><span>♡ ${f.likes.toLocaleString()}</span><span>💬 ${f.cm.toLocaleString()}</span>${f.liked?`<span class="on">你按了讚</span>`:`<button data-like="${i}">按讚</button>`}</footer>
      ${f.choice?(()=>{const sn=snipBy(f.code),n=sn?.nodes?.[f.choice]; return n?.C?.length?`<div class="popts in">${n.C.map((c,j)=>`<button data-cmt="${i}:${j}">${esc(stripQ(c.t))}</button>`).join("")}</div>`:""})():""}
      ${f.reply?`<p class="pmy">你:${esc(f.reply)}</p>`:""}${(f.r||[]).map(l=>`<p class="pfan"><b style="color:${byId(l[0])?.c}">${byId(l[0])?.n||""}</b> ${esc(l[1])}</p>`).join("")}</article>`}).join("")
    :`<p class="pempty">還沒有貼文。成員會不定時發文或開直播。</p>`}</div>`}

/* ---------- 設定 ---------- */
function settings(){ const p=ph();
  return head("設定")+`<div class="pscroll"><h4>桌布</h4><div class="pwalls">${Object.entries({title:"完美女團",group:"緋紅搖籃曲",styling:"造型室的傍晚",night:"夜晚的街區",...(HAS_PORTRAIT?{portrait:"直式合照"}:{})}).map(([k,n])=>`<button class="pwal${curWall()===k?" on":""}" data-wall="${k}">${wallHTML(k)}<small>${n}</small></button>`).join("")}</div>
    <h4>關於</h4><div class="pnote"><b>完美女團 ・ 公司配發手機</b><p>訊息、群組與社群的內容來自製作者模式的片段;內容越多,手機越熱鬧。</p></div></div>`}

function bind(B){
  B.querySelectorAll("[data-app]").forEach(b=>b.onclick=()=>{ const a=b.dataset.app; if(a==="group"){APP="chat";CHAT="group"} else APP=a; if(a==="album") window.cgAlbumOpen?.(); render() });
  B.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{APP=b.dataset.go;CHAT=null;render()});
  B.querySelectorAll("[data-chat]").forEach(b=>b.onclick=()=>{APP="chat";CHAT=b.dataset.chat;render()});
  B.querySelectorAll("[data-rep]").forEach(b=>b.onclick=()=>{B.querySelectorAll("[data-rep]").forEach(x=>x.disabled=true); reply(+b.dataset.rep)});
  B.querySelectorAll("[data-wall]").forEach(b=>b.onclick=()=>{const p=ph(); p.wall=b.dataset.wall; p.wallSet=true; save(); render()});
  B.querySelectorAll("[data-photo]").forEach(b=>b.onclick=()=>viewPhoto(+b.dataset.photo));
  B.querySelectorAll("[data-like]").forEach(b=>b.onclick=()=>{const f=ph().feed[+b.dataset.like]; f.liked=true; f.likes++; save(); render()});
  B.querySelectorAll("[data-cmt]").forEach(b=>b.onclick=()=>{ const [i,j]=b.dataset.cmt.split(":").map(Number), f=ph().feed[i], sn=snipBy(f.code), n=sn?.nodes?.[f.choice], c=n?.C?.[j]; if(!c) return;
    const to=c.to&&byId(c.to)?c.to:f.id, before=S.m[to]?.xp||0; applyChoice({...c,to}); const dt=(S.m[to]?.xp||0)-before; if(dt>0) pfx(`${byId(to).n} 好感 +${dt}`,byId(to).c);
    f.reply=stripQ(c.t); f.r=[...(c.r||[])]; f.choice=null; save(); render() });
}
setInterval(()=>{ if($("#phone")?.classList.contains("on")) status() },2000);
/* 有直式合照(assets/bg/wall_group.webp)時才出現在選項裡,並自動當預設桌布 */
let HAS_PORTRAIT=false; { const im=new Image(); im.onload=()=>{HAS_PORTRAIT=true}; im.src=WALLS.portrait }
function curWall(){ const p=ph(); return !p.wallSet&&HAS_PORTRAIT?"portrait":(p.wall||"title") }
window.openPhone=open;
})();
