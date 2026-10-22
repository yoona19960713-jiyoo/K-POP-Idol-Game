"use strict";
/* =====================================================================
   造型室(遊戲內設施)
   - 衣櫃:衣帽間的造型以收藏卡呈現
   - 設計工作台:用 OpenAI 自動替還沒有圖的造型生圖 → 待審 → 收下後寫回雲端(跟衣帽間工坊同一份資料)
   - 直接收:Claude 創作室送來的造型與長對話(網址 #import=…)直接存進雲端
   依賴 game.js 的全域:$, esc, M, byId, ITEMS, WMEM, WMETA, IDB, syAuth, syCfg, syToken, syBase, syJSON, syGet, setPause, toast2, renderAll
   ===================================================================== */

/* ---------- 共用:衣帽間的分類與提示詞(與衣帽間工坊相同) ---------- */
const W_SEASONS=["春","夏","秋","冬"];
const wIsDaily=o=>o==="練習"||String(o||"").startsWith("日常");
const wSeasonText=a=>Array.isArray(a)&&a.length&&a.length<4?W_SEASONS.filter(s=>a.includes(s)).join("、"):"四季";
const W_CATS=[["all","全部"],["stage","舞台與活動"],["練習","練習服"],["日常・居家","居家"],["日常・外出","外出"],["日常・睡衣","睡衣"]];
const wCatOf=o=>wIsDaily(o)?o:"stage";
function wLookPrompt(lk,slot){
  const o=lk.members?.[slot]; if(!o) return "";
  const group=lk.type==="group"&&lk.base?` This is her own version of a coordinated K-pop group outfit; the shared design language of the set is: ${lk.base}.`:"";
  return `Use the attached image as the exact base. Keep her face, hairstyle, hair color, expression, body, proportions, pose, framing, art style, lighting and plain light gray background completely identical. Change only her clothing, shoes and accessories.${group} Her outfit: ${o.outfit} Everything is opaque and fully lined, styled as tasteful K-pop idol fashion that fits her body naturally, with realistic folds and drape. No logos, brand names or printed text. ${wIsDaily(lk.occasion)?" Do not add any hat, cap, mask, sunglasses, glasses, or headband or hair accessory over the eyebrows; keep the whole face and both eyebrows fully visible.":""} Full body visible from head to toe.`;
}
const slotOf=mid=>Object.keys(WMEM).find(k=>WMEM[k]===mid);
const midOf=slot=>WMEM[slot];
const wLooks=()=>Object.values(ITEMS).filter(l=>l&&(!l.kind||l.kind==="look")&&!l.deleted);

/* ---------- 雲端圖片(衣帽間把圖片以雜湊存在 users/{uid}/blobs) ---------- */
const BLOBMEM=new Map();
async function getBlob(ref){
  if(!ref) return ""; if(String(ref).startsWith("data:")) return ref;
  const h=String(ref).replace(/^blob:/,""); if(BLOBMEM.has(h)) return BLOBMEM.get(h);
  let s=await IDB.get("blob:"+h);
  if(!s&&syAuth()&&syCfg()){ const first=await syGet(`blobs/${h}-0`); if(!first) return "";
    const n=+first.fields.n.integerValue; s=first.fields.d.stringValue;
    for(let i=1;i<n;i++){const d=await syGet(`blobs/${h}-${i}`); s+=d?.fields?.d?.stringValue||""}
    await IDB.set("blob:"+h,s) }
  if(s) BLOBMEM.set(h,s); return s||"";
}
const THUMB=new Map();
async function getThumb(ref){
  const h=String(ref).replace(/^blob:/,""); if(THUMB.has(h)) return THUMB.get(h);
  let t=await IDB.get("thumb:"+h);
  if(!t){ const src=await getBlob(ref); if(!src) return "";
    const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src}).catch(()=>null); if(!img) return "";
    const H=540,W=Math.round(img.width*H/img.height),c=document.createElement("canvas"); c.width=W;c.height=H; c.getContext("2d").drawImage(img,0,0,W,H);
    t=c.toDataURL("image/webp",.85); await IDB.set("thumb:"+h,t) }
  THUMB.set(h,t); return t;
}
async function wHash(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].slice(0,16).map(x=>x.toString(16).padStart(2,"0")).join("")}
async function wStrip(obj,blobs){
  if(typeof obj==="string"){ if(obj.startsWith("data:image")){const h=await wHash(obj);blobs.set(h,obj);return "blob:"+h} return obj }
  if(Array.isArray(obj)){const o=[];for(const x of obj) o.push(await wStrip(x,blobs));return o}
  if(obj&&typeof obj==="object"){const o={};for(const [k,v] of Object.entries(obj)) o[k]=await wStrip(v,blobs);return o}
  return obj}
async function syPatchPath(path,fields){const t=await syToken();return syJSON(syBase()+"/"+path,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({fields})})}
/* 寫回雲端:圖片先上傳成 blobs,文件只留參照(跟衣帽間工坊完全相同的格式) */
async function pushDoc(col,it){
  const blobs=new Map(), json=JSON.stringify(await wStrip(it,blobs));
  const up=new Set(await IDB.get("blobsUp")||[]);
  for(const [h,s] of blobs){ if(up.has(h)) continue;
    const parts=[];for(let i=0;i<s.length;i+=900000) parts.push(s.slice(i,i+900000));
    for(let i=0;i<parts.length;i++) await syPatchPath(`blobs/${h}-${i}`,{d:{stringValue:parts[i]},n:{integerValue:String(parts.length)}});
    up.add(h); BLOBMEM.set(h,s); await IDB.set("blob:"+h,s); await IDB.set("blobsUp",[...up]) }
  await syPatchPath(`${col}/${encodeURIComponent(it.code)}`,{json:{stringValue:json},updatedAt:{integerValue:String(Math.round(it.updatedAt||Date.now()))},deleted:{booleanValue:false}});
  return JSON.parse(json);
}
/* 沒登入或網路斷了先放待上傳區,下次同步再送 */
async function saveDoc(col,it){
  if(syAuth()&&syCfg()){ try{ const slim=await pushDoc(col,it); if(col==="items") {ITEMS[it.code]=slim; await IDB.set("items",ITEMS)} return true }catch(e){} }
  const ob=await IDB.get("outbox")||[]; const i=ob.findIndex(x=>x.col===col&&x.it.code===it.code); if(i>=0) ob[i]={col,it}; else ob.push({col,it}); await IDB.set("outbox",ob);
  if(col==="items"){ITEMS[it.code]=it; await IDB.set("items",ITEMS)} return false;
}
window.pushOutbox=async()=>{ if(!syAuth()||!syCfg()) return; const ob=await IDB.get("outbox")||[]; if(!ob.length) return; const left=[];
  for(const x of ob){ try{ const slim=await pushDoc(x.col,x.it); if(x.col==="items") ITEMS[x.it.code]=slim }catch(e){left.push(x)} }
  await IDB.set("outbox",left); await IDB.set("items",ITEMS) };

/* ---------- 直接收:Claude 創作室送來的造型或長對話 ---------- */
async function takeImport(){
  const m=location.hash.match(/^#import=(z?)\.([A-Za-z0-9_-]+)$/); if(!m) return;
  history.replaceState(null,"",location.pathname+location.search);
  try{
    let bytes=Uint8Array.from(atob(m[2].replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
    if(m[1]==="z") bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    const o=JSON.parse(new TextDecoder().decode(bytes)); const col=o.app==="kpop-clothes"?"items":o.app==="kpop-scripts"?"scripts":null;
    if(!col||!Array.isArray(o.items)) throw 0;
    let n=0,off=0; for(const it of o.items){ if(!it?.code) continue; it.updatedAt=it.updatedAt||Date.now(); if(!(await saveDoc(col,it))) off++; n++ }
    const what=col==="items"?`${n} 套造型,已放進造型室的設計工作台`:`${n} 段長對話,已存進雲端(劇本工坊的審稿區看得到)`;
    setTimeout(()=>toast2(`收到 Claude 創作室送來的 ${what}`+(off?"(還沒登入雲端,登入後會自動上傳)":"")),900);
    if(col==="items"&&window.renderFacility) renderFacility();
  }catch(e){ setTimeout(()=>toast2("收到的資料無法讀取"),900) }
}
window.addEventListener("hashchange",takeImport);

/* ---------- OpenAI 生圖 ---------- */
const OAI_KEY="kpopGame.openai";
const oai=()=>{try{return {model:"gpt-image-2",quality:"medium",...JSON.parse(localStorage.getItem(OAI_KEY)||"{}")}}catch(e){return {model:"gpt-image-2",quality:"medium"}}};
const setOai=o=>localStorage.setItem(OAI_KEY,JSON.stringify({...oai(),...o}));
const OAI_PRICE={low:.02,medium:.06,high:.22};   // 每張約略費用(直圖+參考圖),只用來估算
function dataURLtoBlob(u){const [h,b]=u.split(","),mime=h.match(/:(.*?);/)[1],bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:mime})}
async function toPng(u){const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=u});const c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);return await new Promise(ok=>c.toBlob(ok,"image/png"))}
async function baseFor(slot){const m=WMETA.find(x=>x.id===slot); if(!m?.gen) return ""; return await getBlob(m.gen)}
async function oaiEdit(prompt,baseURL,model){
  const o=oai(); if(!o.key) throw {code:"no_key"};
  const fd=new FormData(); fd.append("model",model); fd.append("prompt",prompt); fd.append("image[]",await toPng(baseURL),"base.png");
  fd.append("size","1024x1536"); fd.append("quality",o.quality||"medium"); fd.append("n","1"); fd.append("output_format","webp");
  if(model==="gpt-image-1.5"||model==="gpt-image-1") fd.append("input_fidelity","high");
  let r; try{ r=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:"Bearer "+o.key},body:fd}) }catch(e){throw {code:"network"}}
  const j=await r.json().catch(()=>({}));
  if(!r.ok){ const msg=j?.error?.message||"", code=j?.error?.code||"";
    if(r.status===401) throw {code:"bad_key",msg};
    if(r.status===429) throw {code:/quota|billing/i.test(msg)?"quota":"rate",msg};
    if(/moderation|safety/i.test(msg+code)) throw {code:"blocked",msg};
    if(r.status===404||/model/i.test(code)) throw {code:"bad_model",msg};
    if(/verif/i.test(msg)) throw {code:"verify",msg};
    throw {code:"server",msg} }
  const b=j.data?.[0]?.b64_json; if(!b) throw {code:"server",msg:"沒有收到圖片"};
  return "data:image/webp;base64,"+b;
}
const OAI_ERR={no_key:"還沒設定 OpenAI 金鑰(選單 → AI 生圖)",bad_key:"OpenAI 金鑰不正確",quota:"OpenAI 帳戶額度不足,請到 OpenAI 儲值",rate:"太頻繁了,稍等再試",
  blocked:"被 OpenAI 的安全審查擋下,可以改一下服裝描述再試",bad_model:"這個生圖模型不能用",verify:"這個模型需要先在 OpenAI 完成組織驗證",network:"連不上 OpenAI",server:"OpenAI 回傳錯誤"};

/* 工作佇列:每一筆是 一套造型 × 一位成員 */
let JOBS=[];        // {id,code,slot,state:"wait"|"run"|"done"|"err",err}
let RUNNING=false, STOP=false;
let PENDING={};     // id → {code,slot,img,at}
const jobId=(code,slot)=>code+"@"+slot;
const hasBase=slot=>!!WMETA.find(x=>x.id===slot)?.gen;
function noBaseCount(){let n=0; for(const lk of wLooks()) for(const [slot,o] of Object.entries(lk.members||{})) if(midOf(slot)&&!o?.img&&o?.outfit&&!hasBase(slot)) n++; return n}
function todoList(){ const out=[];
  for(const lk of wLooks()) for(const [slot,o] of Object.entries(lk.members||{})){ if(!midOf(slot)||!hasBase(slot)) continue;
    if(!o?.img&&o?.outfit&&!PENDING[jobId(lk.code,slot)]) out.push({code:lk.code,slot}) }
  return out }
async function runQueue(){
  if(RUNNING) return; RUNNING=true; STOP=false; renderFacility();
  const o=oai(); let model=o.model||"gpt-image-2";
  while(!STOP){ const job=JOBS.find(j=>j.state==="wait"); if(!job) break; job.state="run"; renderFacility();
    try{ const lk=ITEMS[job.code], base=await baseFor(job.slot);
      if(!base) throw {code:"no_base"};
      let img; try{ img=await oaiEdit(wLookPrompt(lk,job.slot),base,model) }
      catch(e){ if(e.code==="bad_model"&&model!=="gpt-image-1.5"){model="gpt-image-1.5"; setOai({model}); img=await oaiEdit(wLookPrompt(lk,job.slot),base,model)} else throw e }
      PENDING[job.id]={code:job.code,slot:job.slot,img,at:Date.now()}; await IDB.set("pending",PENDING); job.state="done";
    }catch(e){ job.state="err"; job.err=e.code==="no_base"?"衣帽間還沒有這位成員的生圖底模":(OAI_ERR[e.code]||"失敗")+(e.msg?`:${String(e.msg).slice(0,80)}`:"");
      if(["no_key","bad_key","quota","verify","bad_model"].includes(e.code)){STOP=true; toast2(OAI_ERR[e.code])}
      if(e.code==="rate"){ job.state="wait"; await new Promise(r=>setTimeout(r,20000)) } }
    renderFacility() }
  RUNNING=false; renderFacility();
}
async function approve(id){
  const p=PENDING[id]; if(!p) return; const lk=JSON.parse(JSON.stringify(ITEMS[p.code]||{})); if(!lk.code) return;
  // 還原其他成員已有的圖片參照即可(pushDoc 只會上傳 data: 開頭的新圖)
  lk.members[p.slot]={...(lk.members[p.slot]||{}),img:p.img,status:1}; lk.updatedAt=Date.now();
  delete PENDING[id]; await IDB.set("pending",PENDING);
  const ok=await saveDoc("items",lk); toast2(ok?"已收進衣櫃,並同步到雲端":"已收進衣櫃(還沒同步,登入後會自動上傳)");
  JOBS=JOBS.filter(j=>j.id!==id); renderFacility();
}
async function retry(id){ delete PENDING[id]; await IDB.set("pending",PENDING); const j=JOBS.find(x=>x.id===id); if(j){j.state="wait";j.err=""} else {const [code,slot]=id.split("@"); JOBS.push({id,code,slot,state:"wait"})} renderFacility(); runQueue() }
async function discard(id){ delete PENDING[id]; await IDB.set("pending",PENDING); JOBS=JOBS.filter(j=>j.id!==id); renderFacility() }

/* =====================================================================
   畫面
   ===================================================================== */
let FAC=null, fTab="closet", fMem="all", fCat="all", fDetail=null;
function facShell(){
  if($("#facility")) return;
  const el=document.createElement("section"); el.id="facility"; el.className="fac-wrap hide"; el.setAttribute("aria-label","造型室");
  el.innerHTML=`<div class="fac-bg"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small>COMPANY ・ 1F</small><b>造型室</b></div>
      <nav class="fac-tabs" role="tablist"><button data-ft="closet" role="tab">衣櫃</button><button data-ft="studio" role="tab">設計工作台<i id="fBadge"></i></button></nav>
      <button class="fac-close" id="facClose">離開造型室</button></header>
    <div class="fac-body" id="facBody"></div>
    <div class="fac-detail hide" id="facDetail"></div>`;
  $("#stage").appendChild(el);
  el.querySelectorAll("[data-ft]").forEach(b=>b.onclick=()=>{fTab=b.dataset.ft;renderFacility()});
  $("#facClose").onclick=closeFacility;
}
window.openFacility=async kind=>{ facShell(); FAC=kind; PENDING=await IDB.get("pending")||{}; setPause("fac",true);
  const el=$("#facility"); el.querySelector(".fac-bg").style.backgroundImage=`url(assets/scene/company_${SLOTS[S.slot].light}.webp)`;
  el.classList.remove("hide"); renderFacility() };
function closeFacility(){ $("#facility").classList.add("hide"); $("#facDetail").classList.add("hide"); setPause("fac",false); FAC=null }

function chipRow(list,cur,attr){return list.map(([k,n,c])=>`<button class="fchip${k===cur?" on":""}" data-${attr}="${k}" ${c?`style="--mc:${c}"`:""}>${n}</button>`).join("")}
function cardHTML(lk,mid){
  const slot=mid?slotOf(mid):Object.keys(lk.members||{}).find(s=>lk.members[s]?.img&&midOf(s))||Object.keys(lk.members||{})[0];
  const m=byId(midOf(slot)), o=lk.members?.[slot]||{}, has=!!o.img;
  const sprite=(window.OUTFIT_SPRITES||[]).some(x=>x.look===lk.code);
  return `<button class="wcard" data-look="${esc(lk.code)}" data-slot="${slot}">
    <span class="wframe"></span><span class="wimg" data-ref="${has?esc(o.img):""}">${has?"":`<span class="wnone">尚未生圖</span>`}</span>
    ${m?`<span class="wwho" style="--mc:${m.c}">${lk.type==="group"?"全員":m.n}</span>`:""}
    <span class="wname">${esc(lk.name||lk.code)}</span><span class="wmeta">${esc(wIsDaily(lk.occasion)?lk.occasion.replace("日常・",""):lk.occasion||"")}${wSeasonText(lk.seasons)!=="四季"?"・"+wSeasonText(lk.seasons):""}${sprite?"・可穿":""}</span></button>`}
function renderCloset(){
  const mems=[["all","全員"],...M.map(m=>[m.id,m.n,m.c])];
  let list=wLooks().filter(l=>(fCat==="all"||wCatOf(l.occasion)===fCat)&&(fMem==="all"||Object.keys(l.members||{}).some(s=>midOf(s)===fMem)));
  list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)||String(b.code).localeCompare(String(a.code)));
  const have=list.filter(l=>Object.values(l.members||{}).some(o=>o?.img)).length;
  return `<div class="fbar"><div class="fchips">${chipRow(mems,fMem,"fm")}</div><div class="fchips">${chipRow(W_CATS,fCat,"fc")}</div></div>
    <p class="fsum">共 ${list.length} 套,已有圖 ${have} 套${wLooks().length?"":(syAuth()?"。還沒讀到衣帽間的造型:到選單按「立即同步」":"。還沒讀到衣帽間的造型:請先在選單登入雲端同步")}</p>
    <div class="wgrid">${list.map(l=>cardHTML(l,fMem==="all"?null:fMem)).join("")||`<p class="fempty">這個分類還沒有造型</p>`}</div>`}
function renderStudio(){
  const o=oai(), todo=todoList(), pend=Object.entries(PENDING), waiting=JOBS.filter(j=>j.state==="wait"||j.state==="run").length, errs=JOBS.filter(j=>j.state==="err");
  const cost=(todo.length*(OAI_PRICE[o.quality]||.06)).toFixed(2);
  return `<div class="fdesk">
    <div class="fpanel">
      <h3>待生圖</h3>
      <p class="big">${todo.length}<small> 張</small></p>
      ${noBaseCount()?`<p class="fnote" style="color:#9A3D47">另有 ${noBaseCount()} 張因為衣帽間還沒設定該成員的「生圖底模」而略過</p>`:""}
      <p class="fnote">${o.key?`品質「${{low:"低",medium:"中",high:"高"}[o.quality]||o.quality}」,預估約 US$${cost}(以 OpenAI 帳單為準)`:"還沒設定 OpenAI 金鑰:選單 → AI 生圖"}</p>
      <div class="frow"><button class="fbtn pri" id="fStart" ${!o.key||(!todo.length&&!waiting)||RUNNING?"disabled":""}>${RUNNING?`生圖中…剩 ${waiting} 張`:"全部開始生圖"}</button>${RUNNING?`<button class="fbtn" id="fStop">暫停</button>`:""}</div>
      ${errs.length?`<div class="ferrs"><b>${errs.length} 張失敗</b>${errs.slice(0,6).map(j=>`<p>${esc(ITEMS[j.code]?.name||j.code)}・${byId(midOf(j.slot))?.n||""}:${esc(j.err||"")} <button class="flink" data-retry="${esc(j.id)}">重試</button></p>`).join("")}</div>`:""}
      <p class="fnote">生好的圖會放到右邊「待審」;收下後才會寫進衣櫃與雲端。收下的日常服之後交給 Claude 處理成遊戲立繪,就能在遊戲裡穿。</p>
    </div>
    <div class="fpanel wide"><h3>待審 <small>${pend.length} 張</small></h3>
      <div class="rgrid">${pend.map(([id,p])=>{const lk=ITEMS[p.code],m=byId(midOf(p.slot));return `<div class="rcard"><img src="${p.img}" alt="">
        <div class="rinfo"><b>${esc(lk?.name||p.code)}</b><span style="color:${m?.c}">${m?.n||""}</span></div>
        <div class="racts"><button class="fbtn pri" data-ok="${esc(id)}">收下</button><button class="fbtn" data-retry="${esc(id)}">重生</button><button class="fbtn ghost" data-no="${esc(id)}">捨棄</button></div></div>`}).join("")||`<p class="fempty">目前沒有待審的圖</p>`}</div></div></div>`}
async function renderFacility(){
  if(!FAC||!$("#facility")) return;
  const pc=Object.keys(PENDING).length; $("#fBadge").textContent=pc||"";
  document.querySelectorAll("#facility [data-ft]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.ft===fTab)));
  const body=$("#facBody"); body.innerHTML=fTab==="closet"?renderCloset():renderStudio();
  body.querySelectorAll("[data-fm]").forEach(b=>b.onclick=()=>{fMem=b.dataset.fm;renderFacility()});
  body.querySelectorAll("[data-fc]").forEach(b=>b.onclick=()=>{fCat=b.dataset.fc;renderFacility()});
  body.querySelectorAll("[data-look]").forEach(b=>b.onclick=()=>openDetail(b.dataset.look,b.dataset.slot));
  body.querySelectorAll("[data-ok]").forEach(b=>b.onclick=()=>approve(b.dataset.ok));
  body.querySelectorAll("[data-retry]").forEach(b=>b.onclick=()=>retry(b.dataset.retry));
  body.querySelectorAll("[data-no]").forEach(b=>b.onclick=()=>discard(b.dataset.no));
  const st=$("#fStart"); if(st) st.onclick=()=>{ for(const t of todoList()){const id=jobId(t.code,t.slot); if(!JOBS.some(j=>j.id===id)) JOBS.push({id,...t,state:"wait"})} runQueue() };
  const sp=$("#fStop"); if(sp) sp.onclick=()=>{STOP=true; toast2("這張畫完就暫停")};
  // 縮圖慢慢載入
  for(const el of body.querySelectorAll(".wimg[data-ref]")){ const ref=el.dataset.ref; if(!ref) continue;
    getThumb(ref).then(t=>{ if(t) el.style.backgroundImage=`url(${t})` }) }
}
window.renderFacility=renderFacility;
async function openDetail(code,slot){
  const lk=ITEMS[code]; if(!lk) return; fDetail={code,slot};
  const slots=Object.keys(lk.members||{}).filter(s=>midOf(s)), o=lk.members[slot]||{}, m=byId(midOf(slot));
  const d=$("#facDetail");
  d.innerHTML=`<div class="dcard"><button class="fac-close dx" id="dClose">關閉</button>
    <div class="dimg" id="dImg">${o.img?"":`<span class="wnone">${o.outfit?"尚未生圖:到設計工作台按「全部開始生圖」":"沒有服裝描述"}</span>`}</div>
    <div class="dtext"><small>${esc(lk.code)}・${lk.type==="group"?"團體服":"個人造型"}</small><h2>${esc(lk.name||"")}</h2>
      <p class="dtags">${esc(lk.occasion||"")}・${wSeasonText(lk.seasons)}</p>
      <div class="fchips">${slots.map(s=>{const mm=byId(midOf(s));return `<button class="fchip${s===slot?" on":""}" data-ds="${s}" style="--mc:${mm.c}">${mm.n}${lk.members[s]?.img?"":" ・未生圖"}</button>`}).join("")}</div>
      ${lk.concept?`<p class="dcon">${esc(lk.concept)}</p>`:""}
      ${o.twist?`<p class="dcon"><b style="color:${m?.c}">${m?.n} 的小巧思</b> ${esc(o.twist)}</p>`:""}
      <details><summary>服裝描述(英文)</summary><p class="dout">${esc(o.outfit||"")}</p></details></div></div>`;
  d.classList.remove("hide");
  $("#dClose").onclick=()=>d.classList.add("hide");
  d.querySelectorAll("[data-ds]").forEach(b=>b.onclick=()=>openDetail(code,b.dataset.ds));
  if(o.img){ const src=await getBlob(o.img); if(src&&fDetail?.code===code&&fDetail?.slot===slot) $("#dImg").style.backgroundImage=`url(${src})` }
}

/* ---------- 選單:AI 生圖設定 ---------- */
function oaiSettingsInit(){
  const box=$("#oaiBox"); if(!box) return; const o=oai();
  $("#oaiKey").value=o.key?"•••••••• 已設定":""; $("#oaiModel").value=o.model||"gpt-image-2"; $("#oaiQ").value=o.quality||"medium";
  $("#oaiKey").onfocus=e=>{ if(e.target.value.startsWith("•")) e.target.value="" };
  $("#oaiSave").onclick=()=>{ const k=$("#oaiKey").value.trim(); const patch={model:$("#oaiModel").value,quality:$("#oaiQ").value};
    if(k&&!k.startsWith("•")){ if(!/^sk-/.test(k)){toast2("OpenAI 金鑰通常是 sk- 開頭,請再確認");return} patch.key=k }
    setOai(patch); oaiSettingsInit(); toast2("AI 生圖設定已儲存") };
  $("#oaiClear").onclick=()=>{ const x=oai(); delete x.key; localStorage.setItem(OAI_KEY,JSON.stringify(x)); oaiSettingsInit(); toast2("已清除 OpenAI 金鑰") };
}
$("#menuBtn").addEventListener("click",oaiSettingsInit);

/* ---------- 啟動 ---------- */
(async()=>{ for(let i=0;i<40&&!IDB.db;i++) await new Promise(r=>setTimeout(r,100)); PENDING=await IDB.get("pending")||{}; await takeImport() })();
