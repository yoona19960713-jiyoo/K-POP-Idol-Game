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
  const daily=wIsDaily(lk.occasion);
  return `Use the attached image as the exact base. Keep her face, hairstyle, hair color, expression, body, proportions, pose, framing, art style${daily?" and lighting":", lighting and plain light gray background"} completely identical. Change only her clothing, shoes and accessories.${group} Her outfit: ${o.outfit} Everything is opaque and fully lined, styled as tasteful K-pop idol fashion that fits her body naturally, with realistic folds and drape. No logos, brand names or printed text. ${daily?" Do not add any hat, cap, mask, sunglasses, glasses, or headband or hair accessory over the eyebrows; keep the whole face and both eyebrows fully visible.":""} Full body visible from head to toe.${daily?" Remove the background completely: output only her full figure on a fully transparent background, with clean edges around her hair and clothing.":""}`;
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
    if(col==="items") ensureMeta();
    let n=0,off=0; for(const it of o.items){ if(!it?.code) continue; it.updatedAt=it.updatedAt||Date.now();
      // 造型可以用成員代號(ys、tr、hy、he、hr)標示,這裡換成衣帽間的成員欄位,不怕欄位順序不同
      if(col==="items"&&it.members){ const ms={}; for(const [k,v] of Object.entries(it.members)) ms[byId(k)?(slotOf(k)||DEFAULT_SLOT[k]):k]=v; it.members=ms;
        if(it.target&&byId(it.target)) it.target=slotOf(it.target)||DEFAULT_SLOT[it.target];
        it.kind=it.kind||"look"; for(const v of Object.values(it.members)){ v.img=v.img||""; v.status=v.status||0 } }
      if(!(await saveDoc(col,it))) off++; n++ }
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
async function oaiEdit(prompt,baseURL,model,transparent){
  const o=oai(); if(!o.key) throw {code:"no_key"};
  if(transparent) model="gpt-image-1.5";   // gpt-image-2 不支援透明背景
  const fd=new FormData(); fd.append("model",model); fd.append("prompt",prompt); fd.append("image[]",await toPng(baseURL),"base.png");
  fd.append("size","1024x1536"); fd.append("quality",o.quality||"medium"); fd.append("n","1"); fd.append("output_format",transparent?"png":"webp");
  if(transparent) fd.append("background","transparent");
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
  if(!transparent) return "data:image/webp;base64,"+b;
  // 透明 PNG 轉成 webp(保留透明),檔案小很多
  const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src="data:image/png;base64,"+b});
  const c=document.createElement("canvas"); c.width=img.width; c.height=img.height; c.getContext("2d").drawImage(img,0,0);
  const w=c.toDataURL("image/webp",.92); return w.startsWith("data:image/webp")?w:"data:image/png;base64,"+b;
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
      const tr=wIsDaily(lk.occasion);
      let img; try{ img=await oaiEdit(wLookPrompt(lk,job.slot),base,model,tr) }
      catch(e){ if(e.code==="bad_model"&&model!=="gpt-image-1.5"){model="gpt-image-1.5"; setOai({model}); img=await oaiEdit(wLookPrompt(lk,job.slot),base,model,tr)} else throw e }
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
  if(wIsDaily(lk.occasion)&&window.processSprites){ toast2("正在處理成遊戲立繪…");
    try{ const r=await processSprites(p.code,p.slot); toast2(`${byId(midOf(p.slot))?.n}換上「${lk.name}」了:立繪處理完成`+(r.keyed?"(背景不是透明的,已自動去背,建議看一下邊緣)":"")) }
    catch(e){ toast2("立繪處理失敗:"+(e.message||"請在卡片詳情按「處理成遊戲立繪」再試")) } renderFacility() }
}
async function retry(id){ delete PENDING[id]; await IDB.set("pending",PENDING); const j=JOBS.find(x=>x.id===id); if(j){j.state="wait";j.err=""} else {const [code,slot]=id.split("@"); JOBS.push({id,code,slot,state:"wait"})} renderFacility(); runQueue() }
async function discard(id){ delete PENDING[id]; await IDB.set("pending",PENDING); JOBS=JOBS.filter(j=>j.id!==id); renderFacility() }


/* =====================================================================
   造型室補完:委託設計(Gemini)、修改與刪除造型、成員生圖底模
   設計提示詞與衣帽間工坊相同
   ===================================================================== */
const W_OCC=["打歌舞台","演唱會","頒獎典禮","寫真","綜藝","機場","練習","日常・居家","日常・外出","日常・睡衣"];
const W_OCC_NOTE={
  "練習":"在公司練習室穿的練習服:方便跳舞的運動上衣、運動褲或運動短褲、運動鞋,可以加薄外套或綁在腰上的襯衫;簡單耐穿,不要舞台感。",
  "日常・居家":"在宿舍穿的居家服:寬鬆舒服的上衣、棉褲或居家短褲、襪子或室內拖鞋;放鬆的感覺,不要外出打扮,不要包包。",
  "日常・外出":"休假或下班外出的私服:符合她個性的日常穿搭,可以有包包;比舞台樸素,像真實偶像的私服。",
  "日常・睡衣":"睡覺穿的睡衣:成套、布料厚實不透明、樣式保守的家居睡衣(例如棉質長袖長褲或短袖短褲套裝),搭配室內拖鞋或襪子;不要絲質吊帶、不要短睡裙。"};
const W_DAILY_RULE="- 這套會用在遊戲立繪,臉部之後會另外換表情:不要帽子、遮到眉毛的髮箍或瀏海配件、口罩、墨鏡、眼鏡、面紗,或任何遮到臉和眉毛的東西;髮夾、耳環、項鍊可以。";
const W_AXES=[["sweet","甜美","冷豔"],["pure","清純","性感"],["lively","活潑","優雅"],["fancy","華麗","簡約"],["retro","復古","未來"]];
const W_PROFILES=[
  [/藝瑟|Yeseul/i,"隊長、領唱、領舞(原型 Dreamcatcher JiU)。黑色長直髮內層挑染紫。代表色紫(#7B4FBF)。168 cm,高挑優雅、腿長、上圍豐滿。舞台上暗黑哥德的神祕感,私下開朗愛笑的團媽,私人物品偏愛粉紅色。適合長版、蕾絲、鍊條、優雅剪裁。"],
  [/泰梨|Taeri/i,"主 Rapper、領舞(原型 aespa Karina)。深紅色鮑伯頭、灰色眼睛。代表色紅(#C8102E)。167 cm,結實曲線運動型。外表冷豔完美像 AI,私下害羞傻氣。適合皮革、金屬扣環、短版外套、褲裝、未來感材質。"],
  [/日和|Hiyori/i,"主舞、副唱,日籍,芭蕾出身(原型 LE SSERAFIM 中村一葉)。深棕色低盤髮。代表色香檳金(#E3CFA6)。165 cm,纖細健康的舞者體態、上圍適中。優雅但開朗外向,暱稱天鵝。適合緞帶、薄紗、芭蕾元素、方便舞動的裙裝。"],
  [/夏恩|Haeun/i,"門面、C 位、副 Rapper(原型 少女時代 潤娥)。及肩栗棕色波浪髮。代表色珊瑚粉(#F28C82)。163 cm,沙漏曲線身材。國民初戀型的開朗隨和,常站中間位置。適合清新又華麗的設計、珍珠、合身剪裁、閃耀材質。"],
  [/河嵐|Haram/i,"主唱、綜藝擔當、老么(原型 Apink 鄭恩地)。亂翹層次短髮。代表色萊姆綠(#A8D84E)。160 cm,嬌小曲線、全團上圍最豐滿。直率大嗓門、有點男孩子氣、講濟州方言。適合運動元素、短版、牛仔、亮色,以及方便唱跳的款式。"]];
const DEFAULT_SLOT={ys:"m1",tr:"m2",hy:"m3",he:"m4",hr:"m5"};
/* 衣帽間還沒設定成員時,先用預設的五個欄位 */
function ensureMeta(){ if(Object.keys(WMEM).length) return;
  WMEM={}; for(const m of M) WMEM[DEFAULT_SLOT[m.id]]=m.id;
  if(!WMETA.length) WMETA=M.map(m=>({id:DEFAULT_SLOT[m.id],name:m.n,en:m.f[0].toUpperCase()+m.f.slice(1),gen:"",profile:"",current:""})) }
const profileOf=slot=>{const w=WMETA.find(x=>x.id===slot); const m=byId(midOf(slot)); if(w?.profile) return w.profile; return (W_PROFILES.find(([re])=>re.test(m?.n||""))||[,""])[1]};

/* ---- Gemini(與製作者模式共用金鑰;網頁版也會沿用衣帽間的金鑰) ---- */
const gKey=()=>localStorage.getItem("kpopScripts.geminiKey")||localStorage.getItem("kpopClothes.geminiKey")||"";
const gModel=()=>{const m=localStorage.getItem("kpopScripts.model")||"gemini-flash-latest"; return ["gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash","gemini-2.0-flash-lite"].includes(m)?"gemini-flash-latest":m};
async function fileToJpegB64(f){const bmp=await createImageBitmap(f); const s=Math.min(1,1280/Math.max(bmp.width,bmp.height)); const c=document.createElement("canvas");
  c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s); c.getContext("2d").drawImage(bmp,0,0,c.width,c.height); return c.toDataURL("image/jpeg",.85).split(",")[1]}
async function gemJSON(prompt,files,signal){
  const key=gKey(); if(!key) throw {code:"no_key"};
  const parts=[{text:prompt}]; for(const f of files||[]) parts.push({inline_data:{mime_type:"image/jpeg",data:await fileToJpegB64(f)}});
  let r; try{ r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(gModel())}:generateContent`,{method:"POST",signal,headers:{"Content-Type":"application/json","x-goog-api-key":key},
    body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json"}})}) }catch(e){ if(e?.name==="AbortError") throw {code:"cancelled"}; throw {code:"network"} }
  const j=await r.json().catch(()=>({}));
  if(!r.ok){ if(r.status===429) throw {code:"rate"}; if(r.status===401||r.status===403) throw {code:"bad_key"}; throw {code:"server",msg:j?.error?.message} }
  const c=j.candidates?.[0]; if(j.promptFeedback?.blockReason||!c||["SAFETY","PROHIBITED_CONTENT","BLOCKLIST"].includes(c.finishReason)) throw {code:"blocked"};
  const t=(c.content?.parts||[]).map(p=>p.text||"").join(""); try{return JSON.parse(t)}catch(e){const m=t.match(/[\[{][\s\S]*[\]}]/); if(m){try{return JSON.parse(m[0])}catch(_){}} throw {code:"invalid_json"}}
}
const G_ERR={no_key:"還沒設定 Gemini 金鑰:選單 → 製作者模式 → 金鑰",bad_key:"Gemini 金鑰無效",rate:"Gemini 次數到上限,稍等再試",blocked:"被 Gemini 的安全機制擋下,改一下說明再試",invalid_json:"設計結果格式不完整,再按一次",network:"連不上 Gemini",server:"Gemini 暫時出錯",cancelled:"已停止"};
function wDesignPrompt(hasPhotos,hint,type,targets,occ,seasons){
  const prof=targets.map(m=>`- id "${m.id}":${m.name}${m.en?`(${m.en})`:""}:${m.profile||"(沒有資料)"}`).join("\n");
  return `你是 K-POP 女團的造型總監。${hasPhotos?"附上的圖片是穿搭參考,只看衣物與配件,不要描述照片中人物是誰或五官。":""}
請設計一套${type==="group"?"團體造型:全員共用同一個主題、配色與材質語彙,但每位成員的版本都依她的定位、身材、代表色和個性做一點小巧思的不同(例如剪裁、長度、細節、配件或點綴色),站在一起要協調又能一眼分出誰是誰;C 位的成員可以稍微華麗一點":"個人造型"}。
場合:${occ}
${W_OCC_NOTE[occ]?`場合說明:${W_OCC_NOTE[occ]}\n`:""}季節:${wSeasonText(seasons)}(布料厚薄、長短與外套都要符合季節)
使用者說明:${hint||"(無,請依場合自由發揮)"}
成員資料:
${prof}

規則:
- outfit 用英文,從頭到腳寫完整:上身、下身或連身、外套(若有)、鞋子、襪子或褲襪(若有)、飾品與小配件,寫出顏色、材質、剪裁、長度、裝飾細節;50~110 個英文字。不要改變髮型與髮色,髮飾可以。
- 不要提到人物長相、姿勢或背景。
${wIsDaily(occ)?W_DAILY_RULE+"\n":""}- 生圖器容易把豐滿身材判定成性感內容,所以絕對不要用 corset、bustier、lingerie、bra、sheer、see-through、transparent、tight、skin-tight、low-cut、plunging、sexy、revealing 這類字;改用 structured bodice、fitted stage top、sweetheart neckline、opaque fabric、layered tulle overlay 等中性用語,並寫出布料不透明。
- twist 用繁體中文一句話,說明這位成員版本的巧思。
- base 用英文 20~50 字,描述整套共用的設計語彙(個人造型也要寫)。
- attrs 五個軸,整數 -3~3:sweet(負=甜美,正=冷豔)、pure(負=清純,正=性感)、lively(負=活潑,正=優雅)、fancy(負=華麗,正=簡約)、retro(負=復古,正=未來)。
- tags 2~5 個繁中風格標籤;rarity 依華麗程度從 N、R、SR、SSR 選一。

只回覆一個 JSON 物件:
{"setName":"繁中造型名稱","concept":"繁中一句話概念","base":"English shared design language","attrs":{"sweet":0,"pure":0,"lively":0,"fancy":0,"retro":0},"tags":["暗黑"],"rarity":"SR","members":[{"id":"${targets[0].id}","outfit":"English full outfit","twist":"繁中巧思"}]}`;
}
function nextLookCode(){let max=0;for(const c of Object.keys(ITEMS)) if(/^LOOK-\d+$/.test(c)) max=Math.max(max,parseInt(c.slice(5))||0); return "LOOK-"+String(max+1).padStart(4,"0")}

/* ---- 委託設計畫面 ---- */
let DZ={type:"solo",mid:"he",occ:"日常・外出",seasons:["夏"],hint:"",photos:[]}, dCtl=null, dRes=null, dMsg="";
function renderDesign(){
  ensureMeta(); const has=!!gKey();
  return `<div class="fdesk2">
  <div class="fpanel"><h3>委託設計</h3>
    <p class="fnote">請造型總監(Gemini)依成員的定位、身材和代表色設計一套。設計好之後收進衣櫃,就會出現在設計工作台等著生圖。</p>
    <h4 class="fh">類型</h4><div class="fchips">${[["solo","個人造型"],["group","團體服(全員)"]].map(([k,n])=>`<button class="fchip${DZ.type===k?" on":""}" data-dt="${k}">${n}</button>`).join("")}</div>
    ${DZ.type==="solo"?`<h4 class="fh">給誰</h4><div class="fchips">${M.map(m=>`<button class="fchip${DZ.mid===m.id?" on":""}" data-dm="${m.id}" style="--mc:${m.c}">${m.n}</button>`).join("")}</div>`:""}
    <h4 class="fh">場合</h4><div class="fchips">${W_OCC.map(o=>`<button class="fchip${DZ.occ===o?" on":""}" data-do="${o}">${o.replace("日常・","")}</button>`).join("")}</div>
    <h4 class="fh">季節<small>不選就是四季</small></h4><div class="fchips">${W_SEASONS.map(x=>`<button class="fchip${DZ.seasons.includes(x)?" on":""}" data-ds2="${x}">${x}</button>`).join("")}</div>
    <h4 class="fh">說明</h4><textarea class="ftext" id="dHint" placeholder="例如:夏天去漢江野餐的私服,清爽的條紋與草帽以外的配件">${esc(DZ.hint)}</textarea>
    <div class="frow"><label class="fbtn">放參考照片<input type="file" accept="image/*" multiple id="dFile" hidden></label>${DZ.photos.map((p,i)=>`<span class="fthumb" style="background-image:url(${p.url})"><button data-dp="${i}">×</button></span>`).join("")}</div>
    <div class="frow"><button class="fbtn pri" id="dGo" ${dCtl||!has?"disabled":""}>${dCtl?"設計中…":"委託設計"}</button>${dCtl?`<button class="fbtn" id="dStop">停止</button>`:""}</div>
    <p class="fnote" style="color:${dMsg.startsWith("✓")?"#3E7A52":"#9A3D47"}">${esc(has?dMsg:G_ERR.no_key)}</p></div>
  <div class="fpanel wide"><h3>設計稿</h3>${dRes?`<div class="draft">
      <input class="dname" id="rName" value="${esc(dRes.name)}"><p class="dcon">${esc(dRes.concept)}</p>
      <p class="fnote">${esc(dRes.occasion)}・${wSeasonText(dRes.seasons)}${(dRes.tags||[]).length?"・"+dRes.tags.map(esc).join("、"):""}</p>
      ${Object.entries(dRes.members).map(([slot,o])=>{const m=byId(midOf(slot));return `<div class="dmem" style="--mc:${m?.c}"><b>${m?.n||slot}</b><small>${esc(o.twist)}</small>
        <textarea class="ftext sm" data-ro="${slot}">${esc(o.outfit)}</textarea></div>`}).join("")}
      <div class="frow"><button class="fbtn pri" id="rKeep">收進衣櫃</button><button class="fbtn" id="rAgain">重新設計</button><button class="fbtn ghost" id="rDrop">捨棄</button></div></div>`
    :`<p class="fempty">還沒有設計稿。左邊填好按「委託設計」,大約十幾秒到半分鐘。</p>`}</div></div>`;
}
function bindDesign(B){
  B.querySelectorAll("[data-dt]").forEach(b=>b.onclick=()=>{DZ.type=b.dataset.dt;renderFacility()});
  B.querySelectorAll("[data-dm]").forEach(b=>b.onclick=()=>{DZ.mid=b.dataset.dm;renderFacility()});
  B.querySelectorAll("[data-do]").forEach(b=>b.onclick=()=>{DZ.occ=b.dataset.do;renderFacility()});
  B.querySelectorAll("[data-ds2]").forEach(b=>b.onclick=()=>{const v=b.dataset.ds2; DZ.seasons=DZ.seasons.includes(v)?DZ.seasons.filter(x=>x!==v):W_SEASONS.filter(x=>x===v||DZ.seasons.includes(x)); renderFacility()});
  const h=B.querySelector("#dHint"); if(h) h.oninput=e=>DZ.hint=e.target.value;
  const f=B.querySelector("#dFile"); if(f) f.onchange=e=>{for(const x of [...e.target.files]){ if(DZ.photos.length>=5) break; DZ.photos.push({file:x,url:URL.createObjectURL(x)}) } renderFacility()};
  B.querySelectorAll("[data-dp]").forEach(b=>b.onclick=()=>{DZ.photos.splice(+b.dataset.dp,1);renderFacility()});
  const go=B.querySelector("#dGo"); if(go) go.onclick=design;
  const st=B.querySelector("#dStop"); if(st) st.onclick=()=>dCtl?.abort();
  if(dRes){ B.querySelector("#rName").oninput=e=>dRes.name=e.target.value;
    B.querySelectorAll("[data-ro]").forEach(t=>t.oninput=()=>dRes.members[t.dataset.ro].outfit=t.value);
    B.querySelector("#rKeep").onclick=async()=>{ const it={...dRes,code:nextLookCode(),createdAt:Date.now(),updatedAt:Date.now()}; dRes=null; dMsg="✓ 已收進衣櫃,到設計工作台就能生圖";
      const ok=await saveDoc("items",it); toast2(ok?`「${it.name}」已收進衣櫃`:"已收進衣櫃(還沒同步,登入後會自動上傳)"); renderFacility() };
    B.querySelector("#rAgain").onclick=design; B.querySelector("#rDrop").onclick=()=>{dRes=null;renderFacility()} }
}
async function design(){
  ensureMeta(); if(!DZ.hint.trim()&&!DZ.photos.length){toast2("寫一點造型說明,或放參考照片");return}
  const slots=DZ.type==="group"?M.map(m=>slotOf(m.id)):[slotOf(DZ.mid)];
  const targets=slots.map(s=>{const w=WMETA.find(x=>x.id===s)||{}; return {id:s,name:w.name||byId(midOf(s))?.n,en:w.en||"",profile:profileOf(s)}});
  dCtl=new AbortController(); dMsg=""; renderFacility();
  try{ const r=await gemJSON(wDesignPrompt(!!DZ.photos.length,DZ.hint.trim(),DZ.type,targets,DZ.occ,DZ.seasons),DZ.photos.map(p=>p.file),dCtl.signal);
    const ms={}; for(const t of targets){const x=(r.members||[]).find(y=>y.id===t.id)||{}; ms[t.id]={outfit:String(x.outfit||""),twist:String(x.twist||""),img:"",status:0}}
    const attrs={}; W_AXES.forEach(([k])=>attrs[k]=Math.max(-3,Math.min(3,Math.round(+r.attrs?.[k]||0))));
    dRes={kind:"look",type:DZ.type,target:DZ.type==="solo"?slots[0]:"",occasion:DZ.occ,seasons:[...DZ.seasons],name:String(r.setName||"未命名造型"),concept:String(r.concept||""),base:String(r.base||""),
      attrs,tags:(Array.isArray(r.tags)?r.tags:[]).map(String).slice(0,6),rarity:["N","R","SR","SSR"].includes(r.rarity)?r.rarity:"R",notes:"在遊戲造型室設計",source:DZ.hint.trim()||"照片",members:ms};
  }catch(e){ dMsg=G_ERR[e?.code]||"設計失敗,請再試一次" }
  finally{ dCtl=null; renderFacility() }
}

/* ---- 修改與刪除造型(在卡片詳情裡) ---- */
function editLook(code){
  const lk=JSON.parse(JSON.stringify(ITEMS[code]||{})); if(!lk.code) return; const d=$("#facDetail");
  d.innerHTML=`<div class="dcard edit"><button class="fac-close dx" id="eClose">取消</button><div class="dtext full">
    <small>${esc(lk.code)}・編輯</small><input class="dname" id="eName" value="${esc(lk.name||"")}">
    <div class="frow"><label class="flab">場合<select id="eOcc">${(W_OCC.includes(lk.occasion)?W_OCC:[...W_OCC,lk.occasion]).map(o=>`<option ${o===lk.occasion?"selected":""}>${o}</option>`).join("")}</select></label>
      <span class="flab">季節</span>${W_SEASONS.map(x=>`<button class="fchip${(lk.seasons||[]).includes(x)?" on":""}" data-es="${x}">${x}</button>`).join("")}</div>
    <label class="flab block">概念<input class="ftext one" id="eCon" value="${esc(lk.concept||"")}"></label>
    ${Object.entries(lk.members||{}).filter(([s])=>midOf(s)).map(([s,o])=>{const m=byId(midOf(s));return `<div class="dmem" style="--mc:${m.c}"><b>${m.n}</b>${o.img?`<small>已經有圖;改了描述後,可以到設計工作台按「重生」換新圖</small>`:""}
      <input class="ftext one" data-tw="${s}" value="${esc(o.twist||"")}" placeholder="小巧思"><textarea class="ftext sm" data-ou="${s}">${esc(o.outfit||"")}</textarea>
      ${o.img?`<button class="flink" data-clr="${s}">把她的圖清掉,重新排進待生圖</button>`:""}</div>`}).join("")}
    <div class="frow"><button class="fbtn pri" id="eSave">儲存</button><button class="fbtn ghost" id="eDel">刪除這套造型</button></div></div></div>`;
  d.classList.remove("hide");
  $("#eClose").onclick=()=>openDetail(code,Object.keys(lk.members||{})[0]);
  d.querySelectorAll("[data-es]").forEach(b=>b.onclick=()=>{const v=b.dataset.es,a=new Set(lk.seasons||[]); a.has(v)?a.delete(v):a.add(v); lk.seasons=W_SEASONS.filter(x=>a.has(x)); b.classList.toggle("on",a.has(v))});
  d.querySelectorAll("[data-clr]").forEach(b=>b.onclick=()=>{lk.members[b.dataset.clr].img="";lk.members[b.dataset.clr].status=0;b.textContent="已清掉,儲存後生效";b.disabled=true});
  $("#eSave").onclick=async()=>{ lk.name=$("#eName").value.trim()||lk.name; lk.occasion=$("#eOcc").value; lk.concept=$("#eCon").value;
    d.querySelectorAll("[data-ou]").forEach(t=>lk.members[t.dataset.ou].outfit=t.value); d.querySelectorAll("[data-tw]").forEach(t=>lk.members[t.dataset.tw].twist=t.value);
    lk.updatedAt=Date.now(); const ok=await saveDoc("items",lk); toast2(ok?"已儲存並同步":"已儲存(還沒同步)"); ensureWear(true); openDetail(code,Object.keys(lk.members)[0]); renderFacility() };
  $("#eDel").onclick=async()=>{ if(!confirm(`確定刪除「${lk.name}」?衣帽間那邊也會一起刪除。`)) return;
    delete ITEMS[code]; await IDB.set("items",ITEMS);
    try{ await syPatchPath(`items/${encodeURIComponent(code)}`,{json:{stringValue:"{}"},updatedAt:{integerValue:String(Date.now())},deleted:{booleanValue:true}}) }catch(e){}
    d.classList.add("hide"); toast2("已刪除"); ensureWear(true); renderFacility() };
}

/* ---- 成員生圖底模 ---- */
function renderBases(){ ensureMeta();
  return `<p class="fnote dark">自動生圖會把這張底模附給 OpenAI,只換衣服。請用定案平常立繪(灰底、白 T、平常表情),換臉層才對得準。這裡改了會同步到衣帽間工坊。</p>
  <div class="bgrid">${M.map(m=>{const s=slotOf(m.id), w=WMETA.find(x=>x.id===s)||{};return `<div class="bcard" style="--mc:${m.c}"><div class="bimg" data-bref="${esc(w.gen||"")}">${w.gen?"":`<span class="wnone">尚未設定</span>`}</div>
    <b>${m.n}</b><button class="fbtn" data-bup="${s}">${w.gen?"更換底模":"上傳底模"}</button>
    <details><summary>造型設計用的人設</summary><textarea class="ftext sm" data-bpf="${s}">${esc(profileOf(s))}</textarea><button class="flink" data-bps="${s}">儲存人設</button></details></div>`}).join("")}</div>`}
async function saveMetaCloud(){
  const raw=await IDB.get("wmetaRaw")||{}; const obj={...raw,members:WMETA}; obj.std=obj.std||{img:"",marks:{}};
  await IDB.set("wmeta",WMETA); await IDB.set("wmem",WMEM);
  if(!syAuth()||!syCfg()){toast2("還沒登入雲端,登入後再改一次才會同步");return false}
  const blobs=new Map(), json=JSON.stringify(await wStrip(obj,blobs)); const up=new Set(await IDB.get("blobsUp")||[]);
  for(const [h,s] of blobs){ if(up.has(h)) continue; const parts=[];for(let i=0;i<s.length;i+=900000) parts.push(s.slice(i,i+900000));
    for(let i=0;i<parts.length;i++) await syPatchPath(`blobs/${h}-${i}`,{d:{stringValue:parts[i]},n:{integerValue:String(parts.length)}}); up.add(h); BLOBMEM.set(h,s); await IDB.set("blob:"+h,s); await IDB.set("blobsUp",[...up]) }
  await syPatchPath("meta/state",{json:{stringValue:json},updatedAt:{integerValue:String(Date.now())}});
  WMETA=JSON.parse(json).members; await IDB.set("wmeta",WMETA); await IDB.set("wmetaRaw",JSON.parse(json)); return true }
function bindBases(B){
  B.querySelectorAll("[data-bup]").forEach(b=>b.onclick=()=>{ const s=b.dataset.bup, inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; try{ const bmp=await createImageBitmap(f), k=Math.min(1,1536/Math.max(bmp.width,bmp.height)), c=document.createElement("canvas");
      c.width=Math.round(bmp.width*k); c.height=Math.round(bmp.height*k); c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
      let url=c.toDataURL("image/webp",.92); if(!url.startsWith("data:image/webp")) url=c.toDataURL("image/png");
      let w=WMETA.find(x=>x.id===s); if(!w){w={id:s,name:byId(midOf(s)).n,en:"",gen:"",profile:"",current:""};WMETA.push(w)} w.gen=url;
      toast2("上傳中…"); const ok=await saveMetaCloud(); if(ok) toast2(`${byId(midOf(s)).n}的底模已更新,衣帽間也同步了`); renderFacility() }catch(e){toast2("讀不到這張圖,請換一張")} }; inp.click() });
  B.querySelectorAll("[data-bps]").forEach(b=>b.onclick=async()=>{ const s=b.dataset.bps, w=WMETA.find(x=>x.id===s); if(!w) return; w.profile=B.querySelector(`[data-bpf="${s}"]`).value; const ok=await saveMetaCloud(); if(ok) toast2("人設已儲存") });
  for(const el of B.querySelectorAll(".bimg[data-bref]")){ const r=el.dataset.bref; if(r) getThumb(r).then(t=>{if(t) el.style.backgroundImage=`url(${t})`}) }
}

/* =====================================================================
   畫面
   ===================================================================== */
let FAC=null, fTab="closet", fMem="all", fCat="all", fDetail=null;
function facShell(){
  if($("#facility")) return;
  const el=document.createElement("section"); el.id="facility"; el.className="fac-wrap hide"; el.setAttribute("aria-label","造型室");
  el.innerHTML=`<div class="fac-bg"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small>COMPANY ・ 1F</small><b>造型室</b></div>
      <nav class="fac-tabs" role="tablist"><button data-ft="closet" role="tab">衣櫃</button><button data-ft="design" role="tab">委託設計</button><button data-ft="studio" role="tab">設計工作台<i id="fBadge"></i></button><button data-ft="bases" role="tab">成員底模</button></nav>
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
  const sprite=(window.OUTFIT_SPRITES||[]).some(x=>x.look===lk.code)||Object.values(lk.members||{}).some(x=>x?.sprites);
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
  const body=$("#facBody"); body.innerHTML=fTab==="closet"?renderCloset():fTab==="design"?renderDesign():fTab==="bases"?renderBases():renderStudio();
  if(fTab==="design") bindDesign(body); if(fTab==="bases") bindBases(body);
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
  d.innerHTML=`<div class="dcard"><button class="fac-close dx" id="dClose">關閉</button><button class="fac-close dx2" id="dEdit">編輯</button>
    <div class="dimg" id="dImg">${o.img?"":`<span class="wnone">${o.outfit?"尚未生圖:到設計工作台按「全部開始生圖」":"沒有服裝描述"}</span>`}</div>
    <div class="dtext"><small>${esc(lk.code)}・${lk.type==="group"?"團體服":"個人造型"}</small><h2>${esc(lk.name||"")}</h2>
      <p class="dtags">${esc(lk.occasion||"")}・${wSeasonText(lk.seasons)}</p>
      <div class="fchips">${slots.map(s=>{const mm=byId(midOf(s));return `<button class="fchip${s===slot?" on":""}" data-ds="${s}" style="--mc:${mm.c}">${mm.n}${lk.members[s]?.img?"":" ・未生圖"}</button>`}).join("")}</div>
      ${lk.concept?`<p class="dcon">${esc(lk.concept)}</p>`:""}
      ${wIsDaily(lk.occasion)&&o.img?`<div class="dsp"><b>遊戲立繪</b> ${o.sprites?`<span class="ok">已處理,遊戲裡會依地點換穿</span>`:`<span class="no">還沒處理</span>`}
        <button class="fbtn" id="dProc">${o.sprites?"重新處理":"處理成遊戲立繪"}</button><div class="dspr" id="dSpr"></div></div>`:""}
      ${o.twist?`<p class="dcon"><b style="color:${m?.c}">${m?.n} 的小巧思</b> ${esc(o.twist)}</p>`:""}
      <details><summary>服裝描述(英文)</summary><p class="dout">${esc(o.outfit||"")}</p></details></div></div>`;
  d.classList.remove("hide");
  $("#dClose").onclick=()=>d.classList.add("hide"); $("#dEdit").onclick=()=>editLook(code);
  d.querySelectorAll("[data-ds]").forEach(b=>b.onclick=()=>openDetail(code,b.dataset.ds));
  const pb=$("#dProc"); if(pb) pb.onclick=async()=>{ pb.disabled=true; pb.textContent="處理中…(約幾秒)";
    try{ const r=await processSprites(code,slot); toast2("立繪處理完成"+(r.keyed?"(已自動去背)":"")); openDetail(code,slot) }catch(e){ toast2("處理失敗:"+(e.message||"")); pb.disabled=false; pb.textContent="再試一次" } };
  const box=$("#dSpr"); if(box&&o.sprites){ const mid=midOf(slot); window.needDyn&&needDyn(code,mid);
    const show=()=>{const d=window.DYN?.[code+"@"+mid]; if(d) box.innerHTML=["neutral","smile","laugh","sad","angry","shy"].map(e=>`<img src="${d[e]}" alt="">`).join(""); else setTimeout(show,400)}; show() }
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
