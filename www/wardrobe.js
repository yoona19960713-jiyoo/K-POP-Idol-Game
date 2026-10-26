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
/* 定案姿勢:頭部位置與角度完全不動、手不靠近臉(換臉層才對得準);描述固定左右手與高度,五個人比出來一致
   [代號, 名稱, 分類, 英文描述] */
const W_POSES=[
  ["stand","自然站姿","日常","standing naturally, both arms relaxed at her sides"],
  ["wave","揮手打招呼","日常","her right hand raised to chest height beside her body, palm open facing forward in a friendly wave; her left arm relaxed at her side"],
  ["phone","拿著手機","日常","holding a smartphone in her right hand at waist height with the screen facing her, her left arm relaxed at her side"],
  ["peace","比 V","日常","her right hand making a cheerful V sign held out to her right side at waist height, well away from her face; her left arm relaxed at her side"],
  ["drink","捧著飲料","日常","holding a takeaway iced drink cup with a straw in both hands in front of her stomach"],
  ["heart","胸前比愛心","活動形象照","making a small finger heart with her right hand held in front of her chest; her left arm relaxed at her side"],
  ["clasp","雙手交握","活動形象照","both hands lightly clasped together in front of her lower stomach, elegant photocall pose, shoulders relaxed"],
  ["hipone","單手叉腰","活動形象照","her left hand resting on her left hip, her right arm relaxed at her side, weight slightly on one leg, classic photocall pose"],
  ["bag","拉著包包肩帶","機場","her right hand holding the strap of a shoulder bag on her right shoulder at chest height, her left arm relaxed at her side, as if walking through an airport"],
  ["suitcase","拉著行李箱","機場","her left hand holding the extended handle of a small rolling suitcase standing beside her left leg, her right arm relaxed at her side, airport fashion photo"],
  ["point","舞台指向鏡頭","舞台","her right arm extended straight forward toward the camera at shoulder height, pointing with her index finger, her left hand on her left hip, confident stage ending pose"],
  ["mic","雙手握麥克風","舞台","holding a handheld stage microphone with both hands in front of her chest, well below her chin, her shoulders relaxed"]];
const poseOf=k=>W_POSES.find(x=>x[0]===k)||W_POSES[0];
/* 每位成員自己的版本:同樣 12 種情境,依她的個性與舞台形象擺出不同的動作(頭部仍完全不動、手不靠近臉) */
const POSE_VAR={
  ys:{ // 藝瑟:隊長、優雅高挑、暗黑系舞台與私下的溫柔
    wave:"her right hand raised gently to chest height in a soft, graceful wave with relaxed fingers, her left hand lightly holding her left forearm",
    phone:"holding a smartphone with both hands in front of her waist, elbows relaxed, standing tall with one leg slightly in front of the other",
    peace:"her right hand making a soft V sign at her waist with the palm turned inward, her left hand resting on her left thigh, weight on one leg",
    drink:"cradling a takeaway coffee cup with both hands in front of her chest, well below her chin, shoulders relaxed and elegant",
    heart:"making a heart shape with both hands together in front of her chest, elbows out, standing tall",
    clasp:"both hands clasped elegantly in front of her lower stomach, legs crossed at the ankles, graceful and tall",
    hipone:"her right hand on her right hip, her long legs crossed at the knees, left arm relaxed, a confident leader's photocall pose",
    bag:"holding the strap of a shoulder bag with both hands at chest height, standing tall with one foot slightly forward",
    suitcase:"her right hand on the extended handle of a small rolling suitcase beside her right leg, her left hand lightly holding the edge of her jacket at her waist",
    point:"her right arm extended forward and slightly upward at shoulder height with an elegant open hand reaching toward the camera, her left hand on her chest below her collarbone, dramatic stage ending",
    mic:"holding a handheld microphone in her right hand at chest height, well below her chin, her left arm extended out to the side with an open palm"},
  tr:{ // 泰梨:冷豔、俐落、私下害羞
    wave:"a small, restrained wave with her right hand at waist height, her left hand in her pocket, cool expression kept",
    phone:"her left hand in her trouser or jacket pocket, holding a smartphone loosely in her right hand at her hip",
    peace:"her right hand making a V sign held low near her right hip, her left hand in her pocket, a cool and effortless stance",
    drink:"holding an iced drink cup in her right hand at her side, her left hand in her pocket, weight on one leg",
    heart:"a small finger heart with her right hand held close in front of her chest, her left arm relaxed, a little shy",
    clasp:"hands loosely clasped in front of her hips, feet apart at shoulder width, sharp and composed",
    hipone:"her left hand on her left hip, feet planted apart in a strong, powerful stance, right arm straight at her side",
    bag:"a crossbody bag strap across her chest with her right thumb hooked under the strap, her left hand in her pocket",
    suitcase:"leaning her left hand on the extended handle of a small rolling suitcase beside her left leg, her right hand in her jacket pocket, cool airport look",
    point:"her right arm extended straight toward the camera at shoulder height, pointing sharply with her index finger, her left hand clenched in a fist at her side, fierce stage ending",
    mic:"holding a handheld microphone in her right hand at chest height, her left hand in a loose fist at her side, a rapper's stance with feet apart"},
  hy:{ // 日和:芭蕾出身、優雅輕盈、開朗
    wave:"her right arm raised to chest height in a flowing, ballet-like wave with a soft wrist, her feet in a ballet third position",
    phone:"holding a smartphone in her right hand at waist height with a graceful ballet hand, her left arm softly rounded at her side, feet in ballet third position",
    peace:"her right hand making a V sign at waist height, her left hand lightly holding the side of her skirt or shorts, one foot pointed forward in tendu",
    drink:"holding a takeaway cup with both hands in front of her stomach, standing on one leg with the other foot lifted lightly behind her, playful",
    heart:"both arms curved in a ballet-like circle in front of her chest forming a heart shape with her fingertips touching",
    clasp:"hands softly joined low in front of her in a ballet first-position arm shape, feet in ballet first position, posture very upright",
    hipone:"her left hand on her waist, her right foot extended forward in a pointed tendu, her right arm gracefully rounded",
    bag:"holding a shoulder bag strap with her right hand at chest height, her left foot pointed forward, light and elegant like a dancer",
    suitcase:"her left hand on the extended handle of a small rolling suitcase, her right arm extended gracefully to the side at waist height, one foot pointed",
    point:"her right arm extended forward at shoulder height in a long ballet arabesque line with soft fingers, her left arm extended back behind her, elegant stage ending",
    mic:"holding a handheld microphone in her right hand at chest height, her left arm extended gracefully to the side in a soft ballet line"},
  he:{ // 夏恩:國民初戀、開朗明亮、C 位
    wave:"a big, cheerful wave with her right hand at shoulder height, palm open, her left hand resting lightly on her stomach",
    phone:"holding up a smartphone in both hands at chest height with the screen turned toward the viewer, as if showing a photo",
    peace:"her right hand making a bright V sign held forward at waist height, her left hand on her hip, leaning her body slightly but keeping her head still",
    drink:"holding a takeaway drink cup with both hands in front of her chest, well below her chin, bright and warm",
    heart:"making a big heart with both arms curved in front of her chest, her fingertips touching",
    clasp:"hands clasped sweetly in front of her, one knee slightly bent inward, a first-love photocall pose",
    hipone:"her right hand on her right hip, her left hand giving a small wave at waist height, the center member's confident pose",
    bag:"holding a small handbag in front of her with both hands at waist height, one knee slightly bent",
    suitcase:"her right hand on the extended handle of a small rolling suitcase, her left hand waving at waist height toward the viewer, cheerful airport look",
    point:"her right index finger pointing forward toward the camera at chest height, her left hand on her hip, a playful center-stage ending",
    mic:"holding a handheld microphone with both hands at chest height, well below her chin, standing at the center"},
  hr:{ // 河嵐:直率、男孩子氣、綜藝擔當
    wave:"an energetic wave with her right hand at shoulder height, her left hand giving a thumbs up at her waist",
    phone:"typing on a smartphone with both thumbs in front of her stomach, feet apart casually",
    peace:"both hands making V signs held out at waist height on each side, playful and boyish",
    drink:"raising a takeaway drink cup in her right hand at chest height as if making a toast, her left hand in a fist at her side",
    heart:"her right arm stretched forward at chest height making a finger heart toward the viewer, her left hand on her hip",
    clasp:"hands clasped in front of her stomach, rocking slightly on her heels, a cheerful youngest-member pose",
    hipone:"her right hand on her right hip, her left hand giving a thumbs up at waist height, wide confident stance",
    bag:"holding both shoulder straps of a backpack with her hands at chest height, feet apart, sporty",
    suitcase:"her left hand on the extended handle of a small rolling suitcase, her right hand giving a thumbs up at waist height, sporty airport look",
    point:"both hands making finger guns pointed toward the camera at waist height, a playful, boyish stage ending",
    mic:"holding a handheld microphone in her right hand at chest height, her left hand raised in a fist at shoulder height to the side, a powerful vocalist's stance"}};
const poseDesc=(mid,key)=>POSE_VAR[mid]?.[key]||poseOf(key)[3];

function wLookPrompt(lk,slot){
  const o=lk.members?.[slot]; if(!o) return "";
  const group=lk.type==="group"&&lk.base?` This is her own version of a coordinated K-pop group outfit; the shared design language of the set is: ${lk.base}.`:"";
  const daily=wIsDaily(lk.occasion);
  const P=poseOf(lk.pose), moved=P[0]!=="stand"&&!hasPoseBase(slot,P[0]);   // 有姿勢底模時姿勢已經在底圖裡
  return `Use the attached image as the exact base. Keep her face, hairstyle, hair color, expression, body, proportions, ${moved?"":"pose, "}framing, art style, lighting and plain light gray background completely identical.${moved?` Change only her arms and hands into this pose: ${poseDesc(midOf(slot),P[0])}. Her head, face position, head angle, gaze, hair and legs must stay exactly as in the attached image; her hands must not cover or come near her face or hair.`:""} ${moved?"Apart from the arms and hands, change only":"Change only"} her clothing, shoes and accessories.${group} Her outfit: ${o.outfit} Everything is opaque and fully lined, styled as tasteful K-pop idol fashion that fits her body naturally, with realistic folds and drape. No logos, brand names or printed text. ${daily?" Do not add any hat, cap, mask, sunglasses, glasses, or headband or hair accessory over the eyebrows; keep the whole face and both eyebrows fully visible.":""} Full body visible from head to toe.`;
}
const slotOf=mid=>Object.keys(WMEM).find(k=>WMEM[k]===mid);
const midOf=slot=>WMEM[slot];
const wLooks=()=>Object.values(ITEMS).filter(l=>l&&(!l.kind||l.kind==="look")&&!l.deleted);

/* ---------- 雲端圖片(衣帽間把圖片以雜湊存在 users/{uid}/blobs) ---------- */
const BLOBMEM=new Map();
async function getBlob(ref,noKeep){
  if(!ref) return ""; if(String(ref).startsWith("data:")) return ref;
  const h=String(ref).replace(/^blob:/,""); if(BLOBMEM.has(h)) return BLOBMEM.get(h);
  let s=await IDB.get("blob:"+h);
  if(!s&&syAuth()&&syCfg()){ const first=await syGet(`blobs/${h}-0`); if(!first) return "";
    const n=+first.fields.n.integerValue; s=first.fields.d.stringValue;
    for(let i=1;i<n;i++){const d=await syGet(`blobs/${h}-${i}`); s+=d?.fields?.d?.stringValue||""}
    await IDB.set("blob:"+h,s) }
  if(s&&!noKeep) BLOBMEM.set(h,s); return s||"";
}
/* ---------- 縮圖(衣櫃卡片、底模、待審舊圖) ----------
   以前:每張卡片同時讀完整原圖、在主執行緒解碼縮小再壓成 data URL,衣櫃一打開就整個卡住。
   現在:縮圖存成檔案(Blob)放在本機資料庫,顯示時用 object URL;要新做縮圖時,
   解碼與縮小交給瀏覽器背景處理(createImageBitmap),一次最多做兩張,看得到的卡片才做,
   遊戲閒置時也會先在背景把縮圖做好。 */
const THUMB=new Map(), THUMB_P=new Map(), THUMB_H=480;
let thumbRun=0; const thumbQ=[];
function thumbPump(){ while(thumbRun<2&&thumbQ.length){ const job=thumbQ.shift(); thumbRun++;
  makeThumb(job.ref).then(job.ok,()=>job.ok("")).finally(()=>{thumbRun--; thumbPump()}) } }
/* 縮圖工人:在背景執行緒讀原圖、縮小、壓成 webp、存回本機資料庫,主畫面完全不卡 */
let TW=null, twSeq=0; const twWait=new Map();
function thumbWorker(){
  if(TW!==null) return TW;
  if(!(window.Worker&&window.OffscreenCanvas&&window.createImageBitmap)) return TW=false;
  const code=`const op=()=>new Promise((ok,no)=>{const r=indexedDB.open("kpopGame",1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
let DB=null; const db=async()=>DB||(DB=await op());
const get=async k=>{const d=await db();return new Promise(ok=>{const q=d.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>ok(q.result??null);q.onerror=()=>ok(null)})};
const put=async(k,v)=>{const d=await db();return new Promise(ok=>{const t=d.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ok()})};
onmessage=async e=>{const {id,h,H}=e.data;try{const s=await get("blob:"+h);if(!s){postMessage({id,miss:1});return}
 const raw=await (await fetch(s)).blob();let b;try{b=await createImageBitmap(raw,{resizeHeight:H,resizeQuality:"high"})}catch(_){b=await createImageBitmap(raw)}
 const hh=Math.min(H,b.height),w=Math.round(b.width*hh/b.height),c=new OffscreenCanvas(w,hh);c.getContext("2d").drawImage(b,0,0,w,hh);b.close&&b.close();
 const out=await c.convertToBlob({type:"image/webp",quality:.85});await put("thumb2:"+h,out);postMessage({id,blob:out})}catch(err){postMessage({id,err:String(err)})}};`;
  try{ TW=new Worker(URL.createObjectURL(new Blob([code],{type:"text/javascript"})));
    TW.onmessage=e=>{const w=twWait.get(e.data.id); if(w){twWait.delete(e.data.id); w(e.data)}};
    TW.onerror=()=>{TW=false} }catch(e){ TW=false }
  return TW }
const viaWorker=h=>new Promise(ok=>{const w=thumbWorker(); if(!w) return ok(null); const id=++twSeq; twWait.set(id,ok); w.postMessage({id,h,H:THUMB_H})});
async function makeThumb(ref){
  const h=String(ref).replace(/^blob:/,"");
  let blob=String(ref).startsWith("data:")?null:await IDB.get("thumb2:"+h);
  if(!(blob instanceof Blob)){ blob=null;
    const old=String(ref).startsWith("data:")?null:await IDB.get("thumb:"+h);   // 舊版存的 data URL 縮圖:直接轉成檔案
    if(old){ blob=await (await fetch(old)).blob(); await IDB.set("thumb2:"+h,blob) }
    else if(!String(ref).startsWith("data:")&&thumbWorker()){
      let r=await viaWorker(h);
      if(r?.miss){ if(await getBlob(ref,true)) r=await viaWorker(h) }      // 原圖還在雲端:先下載到本機再做
      blob=r?.blob||null }
    if(!blob){ const src=await getBlob(ref,true); if(!src) return "";       // 不支援背景執行緒的瀏覽器:在主畫面做
      const raw=await (await fetch(src)).blob();
      let bmp=null; try{ bmp=await createImageBitmap(raw,{resizeHeight:THUMB_H,resizeQuality:"high"}) }catch(e){window.logErr?.("wardrobe",e)}
      if(!bmp){ bmp=await createImageBitmap(raw).catch(()=>null) } if(!bmp) return "";
      const H=Math.min(THUMB_H,bmp.height), W=Math.round(bmp.width*H/bmp.height);
      const c=document.createElement("canvas"); c.width=W; c.height=H; c.getContext("2d").drawImage(bmp,0,0,W,H); bmp.close?.();
      blob=await new Promise(ok=>c.toBlob(ok,"image/webp",.85)); if(!blob) return "";
      if(!String(ref).startsWith("data:")) await IDB.set("thumb2:"+h,blob) } }
  const url=URL.createObjectURL(blob); THUMB.set(h,url); return url }
function getThumb(ref){
  const h=String(ref).replace(/^blob:/,""); if(THUMB.has(h)) return Promise.resolve(THUMB.get(h));
  if(!THUMB_P.has(h)) THUMB_P.set(h,new Promise(ok=>{thumbQ.push({ref,ok}); thumbPump()}).then(u=>{ if(!u) THUMB_P.delete(h); return u }));
  return THUMB_P.get(h) }
/* 只替畫面上(或快捲到)的縮圖排隊 */
let thumbIO=null;
function lazyThumbs(root,sel,attr){
  if(!window.IntersectionObserver){ for(const el of root.querySelectorAll(sel)){ const r=el.dataset[attr]; if(r) getThumb(r).then(t=>{if(t) el.style.backgroundImage=`url(${t})`}) } return }
  thumbIO?.disconnect();
  thumbIO=new IntersectionObserver(es=>{ for(const e of es){ if(!e.isIntersecting) continue; thumbIO.unobserve(e.target);
    const el=e.target, r=el.dataset[attr]; if(r) getThumb(r).then(t=>{if(t) el.style.backgroundImage=`url(${t})`}) } },{root:document.getElementById("facBody"),rootMargin:"600px 0px"});
  for(const el of root.querySelectorAll(sel)){ const r=el.dataset[attr]; if(!r) continue;
    const h=String(r).replace(/^blob:/,""); if(THUMB.has(h)) el.style.backgroundImage=`url(${THUMB.get(h)})`; else thumbIO.observe(el) } }
/* 閒置時先把衣櫃的縮圖做好(一次一張,不影響遊戲) */
async function warmThumbs(){
  const refs=[]; for(const lk of wLooks()) for(const o of Object.values(lk.members||{})) if(o?.img) refs.push(o.img);
  for(const r of refs){ const h=String(r).replace(/^blob:/,""); if(THUMB.has(h)) continue;
    if(!(await IDB.get("thumb2:"+h) instanceof Blob)){ await new Promise(ok=>window.requestIdleCallback?requestIdleCallback(ok,{timeout:4000}):setTimeout(ok,300)) }
    await getThumb(r) } }
setTimeout(()=>{ warmThumbs().catch(()=>{}) },6000);
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
  if(syAuth()&&syCfg()){ try{ const slim=await pushDoc(col,it); if(col==="items") {ITEMS[it.code]=slim; await IDB.set("items",ITEMS)} return true }catch(e){window.logErr?.("wardrobe",e)} }
  const ob=await IDB.get("outbox")||[]; const i=ob.findIndex(x=>x.col===col&&x.it.code===it.code); if(i>=0) ob[i]={col,it}; else ob.push({col,it}); await IDB.set("outbox",ob);
  if(col==="items"){ITEMS[it.code]=it; await IDB.set("items",ITEMS)} return false;
}
/* ---------- 刪除造型(2026-10-26,衣櫃的刪除、改版取代共用) ----------
   本機刪掉 → 雲端寫墓碑(沒登入或沒網路先排隊,下次同步再送)→ 待上傳、待審、換衣快取一起清 →
   存檔裡指向它的地方(每日穿搭、打歌準備單、演唱會造型)改指新版 → 沒有別的造型或底模用到的圖片,本機與雲端一起刪 */
const blobRefs=o=>new Set((JSON.stringify(o||{}).match(/blob:[0-9a-f]{8,}/g)||[]).map(x=>x.slice(5)));
async function tombLook(code){ try{ if(!syAuth()||!syCfg()) throw {code:"未登入"};
    await syPatchPath(`items/${encodeURIComponent(code)}`,{json:{stringValue:"{}"},updatedAt:{integerValue:String(Date.now())},deleted:{booleanValue:true}}); return true }
  catch(e){ const t=await IDB.get("itemTombs")||[]; if(!t.includes(code)){ t.push(code); await IDB.set("itemTombs",t) } return false } }
async function dropBlobs(hashes){ if(!hashes.size) return 0; const used=blobRefs([Object.values(ITEMS),WMETA]), up=new Set(await IDB.get("blobsUp")||[]); let n=0;
  for(const h of hashes){ if(used.has(h)) continue; BLOBMEM.delete(h); await IDB.del("blob:"+h); n++;
    if(syAuth()&&syCfg()&&up.has(h)){ try{ const d0=await syGet(`blobs/${h}-0`), parts=+d0?.fields?.n?.integerValue||1, t=await syToken();
        for(let i=0;i<parts;i++) await syJSON(syBase()+`/blobs/${h}-${i}`,{method:"DELETE",headers:{Authorization:"Bearer "+t}}); up.delete(h) }catch(e){ window.logErr?.("刪除雲端圖片",e) } } }
  await IDB.set("blobsUp",[...up]); return n }
async function deleteLook(code,o={}){ const lk=ITEMS[code]; if(!lk) return false; const to=o.to&&ITEMS[o.to]?o.to:null, refs=blobRefs(lk);
  delete ITEMS[code]; await IDB.set("items",ITEMS);
  const ob=await IDB.get("outbox")||[], ob2=ob.filter(x=>!(x.col==="items"&&x.it?.code===code)); if(ob2.length!==ob.length) await IDB.set("outbox",ob2);
  for(const id of Object.keys(PENDING)) if(id.startsWith(code+"@")) delete PENDING[id]; await IDB.set("pending",PENDING); JOBS=JOBS.filter(j=>j.code!==code);
  for(const s of Object.keys(lk.members||{})){ const mid=midOf(s); if(mid&&window.DYN) delete window.DYN[code+"@"+mid] }
  const cloud=await tombLook(code);
  let lost=false;
  if(S.wear?.m) for(const [mid,wm] of Object.entries(S.wear.m)) for(const k in wm) if(wm[k]===code){ if(to&&ITEMS[to].members?.[slotOf(mid)]?.sprites) wm[k]=to; else { wm[k]=null; lost=true } }
  if(S.lastWear) for(const wm of Object.values(S.lastWear)) for(const k in wm||{}) if(wm[k]===code) wm[k]=to;
  if(S.concertNext?.look===code) S.concertNext.look=to;
  if(to) window.stageRemapLook?.(code,to);
  save(); if(lost) ensureWear(true);
  await dropBlobs(refs).catch(e=>window.logErr?.("刪除圖片",e));
  return cloud }

/* ---------- 改版取代(2026-10-26):服裝對話匯入的改版造型帶 replaces(被取代的舊造型代號,字串或陣列) ----------
   新版每位成員都收下新圖(日常服還要處理好遊戲立繪)之後,自動刪除 replaces 指向的舊造型(雲端一起);團體服要全員都好才刪 */
const reps=it=>[].concat(it?.replaces||[]).filter(c=>c&&c!==it.code);
const repMembers=it=>Object.entries(it?.members||{}).filter(([s,o])=>midOf(s)&&o?.outfit);
function replaceReady(it){ const ms=repMembers(it); return !!ms.length&&ms.every(([,o])=>o.img&&!o.redo&&(!wIsDaily(it.occasion)||o.sprites)) }
function readyNote(it){ if(!it) return "新版不見了"; const ms=repMembers(it), noImg=ms.filter(([,o])=>!o.img||o.redo).length, noSpr=wIsDaily(it.occasion)?ms.filter(([,o])=>o.img&&!o.redo&&!o.sprites).length:0;
  return noImg?`新版還有 ${noImg} 人沒生圖或還沒收下`:noSpr?`新版還有 ${noSpr} 人的遊戲立繪沒處理`:"新版已完成" }
async function checkReplaces(code,quiet){ const it=ITEMS[code]; if(!it||!reps(it).length||!replaceReady(it)) return 0; const names=[];
  for(const old of reps(it)){ const o=ITEMS[old]; if(!o||o.deleted) continue; names.push(o.name||old); await deleteLook(old,{to:code}) }
  if(names.length&&!quiet) toast2(`舊造型「${names.join("、")}」已被「${it.name||code}」取代,已刪除(雲端一起)`);
  if(names.length) renderFacility(); return names.length }
function replacedList(){ const by={};
  for(const it of wLooks()) for(const old of reps(it)) if(ITEMS[old]&&!ITEMS[old].deleted) (by[old]=by[old]||[]).push(it.code);
  return Object.entries(by).map(([old,news])=>{ const best=news.find(c=>replaceReady(ITEMS[c]))||news[0]; return {old,to:best,ready:replaceReady(ITEMS[best]),note:readyNote(ITEMS[best])} }) }
let REPL_SET=new Set();
function openReplacedList(){ const L=replacedList(); if(!L.length){ toast2("沒有被改版取代的舊造型"); return }
  const d=$("#facDetail");
  d.innerHTML=`<div class="dcard edit"><button class="fac-close dx" id="rpClose">取消</button><div class="dtext full">
    <small>衣櫃・改版整理</small><h2>刪除已被改版取代的舊造型</h2>
    <p class="fnote">這些舊造型都有新的改版(匯入時帶了 replaces)。刪除後雲端也會一起刪;存檔裡用到它的地方(每日穿搭、打歌準備單、演唱會造型)會改成新版。新版還沒完成的標紅字,不想刪就取消勾選。</p>
    <ul class="rplist">${L.map((x,i)=>{ const o=ITEMS[x.old], n=ITEMS[x.to]; return `<li><label><input type="checkbox" data-rp="${i}" checked><span class="rpt">
      <b>${esc(o.name||x.old)}</b><small>${esc(x.old)}・${esc(o.occasion||"")}</small><span class="rpto">→ 改版「${esc(n?.name||x.to)}」</span><em class="${x.ready?"ok":"no"}">${esc(x.note)}</em></span></label></li>` }).join("")}</ul>
    <div class="frow"><button class="fbtn pri" id="rpGo">刪除勾選的 <span id="rpN">${L.length}</span> 套</button></div></div></div>`;
  d.classList.remove("hide");
  const cnt=()=>d.querySelectorAll("[data-rp]:checked").length;
  $("#rpClose").onclick=()=>d.classList.add("hide");
  d.querySelectorAll("[data-rp]").forEach(c=>c.onchange=()=>{ $("#rpN").textContent=cnt(); $("#rpGo").disabled=!cnt() });
  $("#rpGo").onclick=async()=>{ const pick=[...d.querySelectorAll("[data-rp]:checked")].map(c=>L[+c.dataset.rp]); if(!pick.length) return;
    d.querySelectorAll("button,input").forEach(x=>x.disabled=true); let n=0,off=0;
    for(const x of pick){ toast2(`刪除中… ${n+1}/${pick.length}`); try{ if(!(await deleteLook(x.old,{to:x.to}))) off++; n++ }catch(e){ window.logErr?.("刪除舊造型",e) } }
    d.classList.add("hide"); renderFacility(); toast2(`已刪除 ${n} 套被改版取代的舊造型`+(off?`(${off} 套的雲端刪除還沒送出,登入或連上網路後會自動補送)`:",雲端也一起刪了")) } }

window.pushOutbox=async()=>{ if(!syAuth()||!syCfg()) return;
  const tb=await IDB.get("itemTombs")||[]; if(tb.length){ const keep=[]; for(const c of tb){ try{ await syPatchPath(`items/${encodeURIComponent(c)}`,{json:{stringValue:"{}"},updatedAt:{integerValue:String(Date.now())},deleted:{booleanValue:true}}) }catch(e){ keep.push(c) } } await IDB.set("itemTombs",keep) }
  const ob=await IDB.get("outbox")||[]; if(!ob.length) return; const left=[];
  for(const x of ob){ try{ const slim=await pushDoc(x.col,x.it); if(x.col==="items") ITEMS[x.it.code]=slim }catch(e){left.push(x)} }
  await IDB.set("outbox",left); await IDB.set("items",ITEMS) };

/* ---------- 造型改版(同代號再匯入,2026-10-26) ----------
   保留已經生好的圖、遊戲立繪與舊圖,只改寫文字;描述或姿勢有變的成員標成「改版待生圖」(redo,prevOutfit=舊圖對應的描述),
   排進設計工作台;收下新圖之前,卡片與遊戲裡照用舊版;收下時舊圖照原本的機制進 prev(連舊描述),可以「改回舊圖」 */
function reviseLook(old,neu){ const out={...old,...neu,createdAt:old.createdAt||neu.createdAt,updatedAt:Date.now(),members:{}};
  const poseCh=(neu.pose||"stand")!==(old.pose||"stand");
  for(const [slot,n] of Object.entries(neu.members||{})){ const o=old.members?.[slot];
    if(!o?.img){ out.members[slot]={...(o||{}),...n,img:o?.img||"",status:o?.status||0}; continue }
    const ch=poseCh||(n.outfit||"")!==(o.outfit||"");
    out.members[slot]={...o,outfit:n.outfit||o.outfit,twist:n.twist??o.twist,...(ch?{redo:1,prevOutfit:o.redo?(o.prevOutfit||""):(o.outfit||"")}:{})} }
  for(const [slot,o] of Object.entries(old.members||{})) if(!out.members[slot]) out.members[slot]=o;
  return out }

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
    let n=0,off=0,rv=0,rp=0; for(const it of o.items){ if(!it?.code) continue; it.updatedAt=it.updatedAt||Date.now();
      // 造型可以用成員代號(ys、tr、hy、he、hr)標示,這裡換成衣帽間的成員欄位,不怕欄位順序不同
      if(col==="items"&&it.members){ const ms={}; for(const [k,v] of Object.entries(it.members)) ms[byId(k)?(slotOf(k)||DEFAULT_SLOT[k]):k]=v; it.members=ms;
        if(it.target&&byId(it.target)) it.target=slotOf(it.target)||DEFAULT_SLOT[it.target];
        it.kind=it.kind||"look"; for(const v of Object.values(it.members)){ v.img=v.img||""; v.status=v.status||0 } }
      if(col==="items"&&reps(it).length) rp++;
      let doc=it; if(col==="items"&&ITEMS[it.code]&&!ITEMS[it.code].deleted){ doc=reviseLook(ITEMS[it.code],it); rv++ }
      if(!(await saveDoc(col,doc))) off++; n++ }
    const what=col==="items"?`${n} 套造型${rv?`(其中 ${rv} 套是改版:舊圖保留,改了描述的成員排進待生圖)`:""}${rp?`(${rp} 套是取代舊造型的改版:新圖收下後會自動刪除舊的那套)`:""},已放進造型室的設計工作台`:`${n} 段長對話,已存進雲端(製作者模式的「待審」看得到)`;
    setTimeout(()=>toast2(`收到 Claude 創作室送來的 ${what}`+(off?"(還沒登入雲端,登入後會自動上傳)":"")),900);
    if(col==="items"&&window.renderFacility) renderFacility();
  }catch(e){ setTimeout(()=>toast2("收到的資料無法讀取"),900) }
}
window.addEventListener("hashchange",takeImport);

/* ---------- OpenAI 生圖 ---------- */
const OAI_KEY="kpopGame.openai";
const oai=()=>{try{return {model:"gpt-image-2",quality:"medium",...JSON.parse(localStorage.getItem(OAI_KEY)||"{}"),model:"gpt-image-2"}}catch(e){return {model:"gpt-image-2",quality:"medium"}}};
const setOai=o=>localStorage.setItem(OAI_KEY,JSON.stringify({...oai(),...o}));
const OAI_PRICE={low:.02,medium:.06,high:.22};   // 每張約略費用(直圖+參考圖),只用來估算
async function toPng(u){const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=u});const c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);return await new Promise(ok=>c.toBlob(ok,"image/png"))}
/* 內建的姿勢底模(使用者用 ChatGPT 生好、Claude 檢查後放進遊戲):assets/pose/成員_姿勢.webp */
const POSE_ASSET=window.POSE_ASSETS||{};   // {"haeun_wave":1,...} 由 assets/poses.js 提供
const poseAsset=(slot,pose)=>{const f=byId(midOf(slot))?.f; return f&&POSE_ASSET[f+"_"+pose]?`assets/pose/${f}_${pose}.webp`:""};
async function urlToData(u){const r=await fetch(u); const b=await r.blob(); return await new Promise(ok=>{const fr=new FileReader(); fr.onload=()=>ok(fr.result); fr.readAsDataURL(b)})}
async function baseFor(slot,pose){const m=WMETA.find(x=>x.id===slot); if(!m?.gen) return "";
  if(pose&&pose!=="stand"){ if(m.poses?.[pose]) return await getBlob(m.poses[pose]); const a=poseAsset(slot,pose); if(a) return await urlToData(a) }   // 姿勢底模
  return await getBlob(m.gen)}
const hasPoseBase=(slot,pose)=>!!WMETA.find(x=>x.id===slot)?.poses?.[pose]||!!poseAsset(slot,pose);
async function oaiEdit(prompt,baseURL,model){
  const o=oai(); if(!o.key) throw {code:"no_key"};
  const fd=new FormData(); fd.append("model",model); fd.append("prompt",prompt); fd.append("image[]",await toPng(baseURL),"base.png");
  fd.append("size","1024x1536"); fd.append("quality",o.quality||"medium"); fd.append("n","1"); fd.append("output_format","webp");
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
  blocked:"被 OpenAI 的安全審查擋下,可以改一下服裝描述再試",bad_model:"gpt-image-2 目前不能用(不會自動改用其他模型)",verify:"這個模型需要先在 OpenAI 完成組織驗證",network:"連不上 OpenAI",server:"OpenAI 回傳錯誤"};

/* 工作佇列:每一筆是 一套造型 × 一位成員 */
let JOBS=[];        // {id,code,slot,state:"wait"|"run"|"done"|"err",err}
let RUNNING=false, STOP=false;
let PENDING={};     // id → {code,slot,img,at}
const jobId=(code,slot)=>code+"@"+slot;
const hasBase=slot=>!!WMETA.find(x=>x.id===slot)?.gen;
function noBaseCount(){let n=0; for(const lk of wLooks()) for(const [slot,o] of Object.entries(lk.members||{})) if(midOf(slot)&&(!o?.img||o?.redo)&&o?.outfit&&!hasBase(slot)) n++; return n}
function todoList(){ const out=[];
  for(const lk of wLooks()) for(const [slot,o] of Object.entries(lk.members||{})){ if(!midOf(slot)||!hasBase(slot)) continue;
    if((!o?.img||o?.redo)&&o?.outfit&&!PENDING[jobId(lk.code,slot)]) out.push({code:lk.code,slot}) }
  return out }
async function runQueue(){
  if(RUNNING) return; RUNNING=true; STOP=false; renderFacility();
  const o=oai(), model="gpt-image-2";   // 只用 gpt-image-2:1.5 的畫風、臉、身材都會跑掉,失敗就停下來,不自動換模型
  while(!STOP){ const job=JOBS.find(j=>j.state==="wait"); if(!job) break; job.state="run"; renderFacility();
    try{ const lk=ITEMS[job.code], base=await baseFor(job.slot,lk.pose);
      if(!base) throw {code:"no_base"};
      const img=await oaiEdit(wLookPrompt(lk,job.slot),base,model), used=model;
      PENDING[job.id]={code:job.code,slot:job.slot,img,model:used,quality:o.quality||"medium",at:Date.now()}; await IDB.set("pending",PENDING); job.state="done";
    }catch(e){ job.state="err"; job.err=e.code==="no_base"?"還沒有這位成員的生圖底模(造型室 → 成員底模)":(OAI_ERR[e.code]||"失敗")+(e.msg?`:${String(e.msg).slice(0,80)}`:"");
      if(["no_key","bad_key","quota","verify","bad_model"].includes(e.code)){STOP=true; toast2(OAI_ERR[e.code])}
      if(e.code==="rate"){ job.state="wait"; await new Promise(r=>setTimeout(r,20000)) } }
    renderFacility() }
  RUNNING=false; renderFacility();
}
async function approve(id,quiet){
  const p=PENDING[id]; if(!p) return; const lk=JSON.parse(JSON.stringify(ITEMS[p.code]||{})); if(!lk.code) return;
  // 還原其他成員已有的圖片參照即可(pushDoc 只會上傳 data: 開頭的新圖)
  const old=lk.members[p.slot]||{};
  const prev=old.img?{img:old.img,model:old.model||"",sprites:old.sprites||null,at:old.spriteAt||0,outfit:old.redo?(old.prevOutfit||""):(old.outfit||"")}:(old.prev||null);   // 舊圖不刪,可以改回
  lk.members[p.slot]={...old,img:p.img,model:p.model||"",status:1,prev}; delete lk.members[p.slot].sprites; delete lk.members[p.slot].redo; delete lk.members[p.slot].prevOutfit; lk.updatedAt=Date.now();
  delete PENDING[id]; await IDB.set("pending",PENDING);
  const ok=await saveDoc("items",lk); if(!quiet) toast2(ok?"已收進衣櫃,並同步到雲端":"已收進衣櫃(還沒同步,登入後會自動上傳)");
  JOBS=JOBS.filter(j=>j.id!==id); renderFacility();
  let spriteFail=false;
  if(wIsDaily(lk.occasion)&&window.processSprites){ if(!quiet) toast2("正在處理成遊戲立繪…");
    try{ await processSprites(p.code,p.slot); if(!quiet) toast2(`${byId(midOf(p.slot))?.n}換上「${lk.name}」了:已去背並做好換臉層,可在卡片詳情看六種表情`) }
    catch(e){ spriteFail=true; if(!quiet) toast2("立繪處理失敗:"+(e.message||"請在卡片詳情按「處理成遊戲立繪」再試")) } renderFacility() }
  const replaced=await checkReplaces(p.code,quiet).catch(e=>{ window.logErr?.("改版取代",e); return 0 });
  return {ok,spriteFail,replaced};
}
/* 一鍵全部收下:依序收下每一張(日常服照樣自動去背、做換臉層),最後一次回報結果 */
let BULK=false;
async function approveAll(){
  if(BULK) return; const ids=Object.keys(PENDING); if(!ids.length) return;
  if(!confirm(`把待審的 ${ids.length} 張全部收下?\n日常服會逐張自動去背、做換臉層,張數多時要等一下。`)) return;
  BULK=true; let n=0,off=0,sf=0,rd=0; renderFacility();
  for(const id of ids){ if(!PENDING[id]) continue; toast2(`全部收下中… ${n+1}/${ids.length}`);
    try{ const r=await approve(id,true); if(r){ n++; if(!r.ok) off++; if(r.spriteFail) sf++; rd+=r.replaced||0 } }catch(e){window.logErr?.("wardrobe",e)} }
  BULK=false; renderFacility();
  toast2(`已收下 ${n} 張`+(rd?`;刪除了 ${rd} 套被改版取代的舊造型`:"")+(off?`(${off} 張還沒同步,登入後會自動上傳)`:"")+(sf?`;${sf} 張立繪處理失敗,請到卡片詳情按「處理成遊戲立繪」`:""));
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
  const t=(c.content?.parts||[]).map(p=>p.text||"").join(""); try{return JSON.parse(t)}catch(e){const m=t.match(/[\[{][\s\S]*[\]}]/); if(m){try{return JSON.parse(m[0])}catch(_){window.logErr?.("wardrobe",_)}} throw {code:"invalid_json"}}
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
let DZ={type:"solo",mid:"he",occ:"日常・外出",seasons:["夏"],pose:"stand",hint:"",photos:[]}, dCtl=null, dRes=null, dMsg="";
function renderDesign(){
  ensureMeta(); const has=!!gKey();
  return `<div class="fdesk2">
  <div class="fpanel"><h3>委託設計</h3>
    <p class="fnote">請造型總監(Gemini)依成員的定位、身材和代表色設計一套。設計好之後收進衣櫃,就會出現在設計工作台等著生圖。</p>
    <h4 class="fh">類型</h4><div class="fchips">${[["solo","個人造型"],["group","團體服(全員)"]].map(([k,n])=>`<button class="fchip${DZ.type===k?" on":""}" data-dt="${k}">${n}</button>`).join("")}</div>
    ${DZ.type==="solo"?`<h4 class="fh">給誰</h4><div class="fchips">${M.map(m=>`<button class="fchip${DZ.mid===m.id?" on":""}" data-dm="${m.id}" style="--mc:${m.c}">${m.n}</button>`).join("")}</div>`:""}
    <h4 class="fh">場合</h4><div class="fchips">${W_OCC.map(o=>`<button class="fchip${DZ.occ===o?" on":""}" data-do="${o}">${o.replace("日常・","")}</button>`).join("")}</div>
    <h4 class="fh">季節<small>不選就是四季</small></h4><div class="fchips">${W_SEASONS.map(x=>`<button class="fchip${DZ.seasons.includes(x)?" on":""}" data-ds2="${x}">${x}</button>`).join("")}</div>
    <h4 class="fh">姿勢<small>一套衣服搭配一個姿勢;頭部不動,臉才能換表情</small></h4><div class="fchips">${W_POSES.map(([k,n])=>`<button class="fchip${DZ.pose===k?" on":""}" data-dpo="${k}">${n}</button>`).join("")}</div>
    <h4 class="fh">說明</h4><textarea class="ftext" id="dHint" placeholder="例如:夏天去漢江野餐的私服,清爽的條紋與草帽以外的配件">${esc(DZ.hint)}</textarea>
    <div class="frow"><label class="fbtn">放參考照片<input type="file" accept="image/*" multiple id="dFile" hidden></label>${DZ.photos.map((p,i)=>`<span class="fthumb" style="background-image:url(${p.url})"><button data-dp="${i}">×</button></span>`).join("")}</div>
    <div class="frow"><button class="fbtn pri" id="dGo" ${dCtl||!has?"disabled":""}>${dCtl?"設計中…":"委託設計"}</button>${dCtl?`<button class="fbtn" id="dStop">停止</button>`:""}</div>
    <p class="fnote" style="color:${dMsg.startsWith("✓")?"#3E7A52":"#9A3D47"}">${esc(has?dMsg:G_ERR.no_key)}</p></div>
  <div class="fpanel wide"><h3>設計稿</h3>${dRes?`<div class="draft">
      <input class="dname" id="rName" value="${esc(dRes.name)}"><p class="dcon">${esc(dRes.concept)}</p>
      <p class="fnote">${esc(dRes.occasion)}・${wSeasonText(dRes.seasons)}・姿勢:${poseOf(dRes.pose)[1]}${(dRes.tags||[]).length?"・"+dRes.tags.map(esc).join("、"):""}</p>
      ${Object.entries(dRes.members).map(([slot,o])=>{const m=byId(midOf(slot));return `<div class="dmem" style="--mc:${m?.c}"><b>${m?.n||slot}</b><small>${esc(o.twist)}</small>
        <textarea class="ftext sm" data-ro="${slot}">${esc(o.outfit)}</textarea></div>`}).join("")}
      <div class="frow"><button class="fbtn pri" id="rKeep">收進衣櫃</button><button class="fbtn" id="rAgain">重新設計</button><button class="fbtn ghost" id="rDrop">捨棄</button></div></div>`
    :`<p class="fempty">還沒有設計稿。左邊填好按「委託設計」,大約十幾秒到半分鐘。</p>`}</div></div>`;
}
function bindDesign(B){
  B.querySelectorAll("[data-dt]").forEach(b=>b.onclick=()=>{DZ.type=b.dataset.dt;renderFacility()});
  B.querySelectorAll("[data-dm]").forEach(b=>b.onclick=()=>{DZ.mid=b.dataset.dm;renderFacility()});
  B.querySelectorAll("[data-do]").forEach(b=>b.onclick=()=>{DZ.occ=b.dataset.do;renderFacility()});
  B.querySelectorAll("[data-dpo]").forEach(b=>b.onclick=()=>{DZ.pose=b.dataset.dpo;if(dRes)dRes.pose=DZ.pose;renderFacility()});
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
    dRes={kind:"look",type:DZ.type,target:DZ.type==="solo"?slots[0]:"",occasion:DZ.occ,seasons:[...DZ.seasons],pose:DZ.pose,name:String(r.setName||"未命名造型"),concept:String(r.concept||""),base:String(r.base||""),
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
    <div class="frow"><span class="flab">姿勢</span>${W_POSES.map(([k,n])=>`<button class="fchip${(lk.pose||"stand")===k?" on":""}" data-ep="${k}">${n}</button>`).join("")}</div>
    <p class="fnote">改了姿勢之後,到詳情按「重新生圖」才會換成新姿勢的圖。</p>
    <label class="flab block">概念<input class="ftext one" id="eCon" value="${esc(lk.concept||"")}"></label>
    ${Object.entries(lk.members||{}).filter(([s])=>midOf(s)).map(([s,o])=>{const m=byId(midOf(s));return `<div class="dmem" style="--mc:${m.c}"><b>${m.n}</b>${o.img?`<small>已經有圖;改了描述後,可以到設計工作台按「重生」換新圖</small>`:""}
      <input class="ftext one" data-tw="${s}" value="${esc(o.twist||"")}" placeholder="小巧思"><textarea class="ftext sm" data-ou="${s}">${esc(o.outfit||"")}</textarea>
      ${o.img?`<button class="flink" data-clr="${s}">把她的圖清掉,重新排進待生圖</button>`:""}</div>`}).join("")}
    <div class="frow"><button class="fbtn pri" id="eSave">儲存</button><button class="fbtn ghost" id="eDel">刪除這套造型</button></div></div></div>`;
  d.classList.remove("hide");
  $("#eClose").onclick=()=>openDetail(code,Object.keys(lk.members||{})[0]);
  d.querySelectorAll("[data-es]").forEach(b=>b.onclick=()=>{const v=b.dataset.es,a=new Set(lk.seasons||[]); a.has(v)?a.delete(v):a.add(v); lk.seasons=W_SEASONS.filter(x=>a.has(x)); b.classList.toggle("on",a.has(v))});
  d.querySelectorAll("[data-ep]").forEach(b=>b.onclick=()=>{lk.pose=b.dataset.ep; d.querySelectorAll("[data-ep]").forEach(x=>x.classList.toggle("on",x===b))});
  d.querySelectorAll("[data-clr]").forEach(b=>b.onclick=()=>{lk.members[b.dataset.clr].img="";lk.members[b.dataset.clr].status=0;b.textContent="已清掉,儲存後生效";b.disabled=true});
  $("#eSave").onclick=async()=>{ lk.name=$("#eName").value.trim()||lk.name; lk.occasion=$("#eOcc").value; lk.concept=$("#eCon").value;
    d.querySelectorAll("[data-ou]").forEach(t=>lk.members[t.dataset.ou].outfit=t.value); d.querySelectorAll("[data-tw]").forEach(t=>lk.members[t.dataset.tw].twist=t.value);
    lk.updatedAt=Date.now(); const ok=await saveDoc("items",lk); toast2(ok?"已儲存並同步":"已儲存(還沒同步)"); ensureWear(true); openDetail(code,Object.keys(lk.members)[0]); renderFacility() };
  $("#eDel").onclick=async()=>{ if(!confirm(`確定刪除「${lk.name}」?雲端的這套造型也會一起刪除。`)) return;
    const ok=await deleteLook(code); d.classList.add("hide"); toast2(ok?"已刪除(雲端一起)":"已刪除(雲端的刪除登入或連上網路後會自動補送)"); renderFacility() };
}

/* ---- 成員生圖底模 ---- */
let PB_BUSY=new Set(), PB_MEM="ys";
function poseBasePrompt(P,mid){ return `Use the attached image as the exact base. Keep her face, head position, head angle, gaze, expression, hairstyle, hair color, body, proportions, white T-shirt and shorts, framing, art style, lighting and plain light gray background completely identical. Change only her pose: ${poseDesc(mid,P[0])}. Her head must stay in exactly the same place and at exactly the same angle as in the attached image; her hands must not cover or come near her face or hair. Any prop is plain, with no logos, brand names or printed text. Full body visible from head to toe.` }
async function genPoseBase(slot,key){
  const P=poseOf(key), m=WMETA.find(x=>x.id===slot); if(!m?.gen){toast2("先設定這位成員的生圖底模");return}
  if(!oai().key){toast2(OAI_ERR.no_key);return} const id=slot+"@"+key; if(PB_BUSY.has(id)) return; PB_BUSY.add(id); renderFacility();
  try{ const img=await oaiEdit(poseBasePrompt(P,midOf(slot)),await getBlob(m.gen),oai().model||"gpt-image-2");
    m.poses={...(m.poses||{}),[key]:img}; toast2(`${byId(midOf(slot)).n}「${P[1]}」的姿勢底模完成,存到雲端中…`); await saveMetaCloud() }
  catch(e){ toast2((OAI_ERR[e.code]||"生成失敗")+(e.msg?`:${String(e.msg).slice(0,60)}`:"")) }
  finally{ PB_BUSY.delete(id); renderFacility() } }
function poseBaseHTML(){ const s=slotOf(PB_MEM), w=WMETA.find(x=>x.id===s)||{}, m=byId(PB_MEM); let cat="";
  return `<h3 class="fh2">姿勢底模</h3><p class="fnote dark">每個姿勢先做一張穿白 T 的定案圖。生衣服時選了哪個姿勢,就拿那張換衣服:姿勢每次一致,頭也不會動,換臉層才對得準。沒有姿勢底模的,會改用文字描述姿勢(比較不穩)。</p>
  <div class="fchips">${M.map(o=>`<button class="fchip${o.id===PB_MEM?" on":""}" data-pbm="${o.id}" style="--mc:${o.c}">${o.n}・${W_POSES.filter(p=>p[0]!=="stand"&&hasPoseBase(slotOf(o.id),p[0])).length}/${W_POSES.length-1}</button>`).join("")}
    <button class="fbtn" id="pbAll" ${w.gen?"":"disabled"}>${m.n}:把缺的全部生成</button></div>
  <div class="pbgrid">${W_POSES.map(P=>{ const k=P[0], ref=k==="stand"?w.gen:w.poses?.[k], busy=PB_BUSY.has(s+"@"+k), head=P[2]!==cat?(cat=P[2],`<h4 class="pbcat">${P[2]}</h4>`):"";
    const asset=k!=="stand"&&!ref?poseAsset(s,k):"";
    return head+`<div class="pbcard"><div class="bimg" data-bref="${esc(ref||"")}" ${asset?`style="background-image:url(${asset})"`:""}>${busy?`<span class="wnone">生成中…</span>`:ref||asset?"":`<span class="wnone">尚未生成</span>`}</div><b>${P[1]}</b>${asset?`<small>內建底模</small>`:""}
      ${k==="stand"?`<small>就是生圖底模</small>`:`<div class="pbact"><button class="flink" data-pbg="${k}" ${busy||!w.gen?"disabled":""}>${ref?"重新生成":"自動生成"}</button><button class="flink" data-pbu="${k}">上傳</button>${ref?`<button class="flink" data-pbd="${k}">清除</button>`:""}</div>`}</div>` }).join("")}</div>` }
function renderBases(){ ensureMeta();
  return `<p class="fnote dark">自動生圖會把這張底模附給 OpenAI,只換衣服。請用定案平常立繪(灰底、白 T、平常表情),換臉層才對得準。改了會同步到雲端。</p>
  <div class="bgrid">${M.map(m=>{const s=slotOf(m.id), w=WMETA.find(x=>x.id===s)||{};return `<div class="bcard" style="--mc:${m.c}"><div class="bimg" data-bref="${esc(w.gen||"")}">${w.gen?"":`<span class="wnone">尚未設定</span>`}</div>
    <b>${m.n}</b><button class="fbtn" data-bup="${s}">${w.gen?"更換底模":"上傳底模"}</button>
    <details><summary>造型設計用的人設</summary><textarea class="ftext sm" data-bpf="${s}">${esc(profileOf(s))}</textarea><button class="flink" data-bps="${s}">儲存人設</button></details></div>`}).join("")}</div>${poseBaseHTML()}`}
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
  B.querySelectorAll("[data-pbm]").forEach(b=>b.onclick=()=>{PB_MEM=b.dataset.pbm;renderFacility()});
  B.querySelectorAll("[data-pbg]").forEach(b=>b.onclick=()=>genPoseBase(slotOf(PB_MEM),b.dataset.pbg));
  const all=B.querySelector("#pbAll"); if(all) all.onclick=async()=>{ const s=slotOf(PB_MEM), w=WMETA.find(x=>x.id===s)||{};
    const miss=W_POSES.filter(P=>P[0]!=="stand"&&!w.poses?.[P[0]]); if(!miss.length){toast2("這位成員的姿勢底模都有了");return}
    if(!confirm(`要生成 ${miss.length} 張姿勢底模嗎?大約 US$${(miss.length*(OAI_PRICE[oai().quality]||.06)).toFixed(2)}。`)) return;
    for(const P of miss) await genPoseBase(s,P[0]) };
  B.querySelectorAll("[data-pbd]").forEach(b=>b.onclick=async()=>{ const w=WMETA.find(x=>x.id===slotOf(PB_MEM)); if(!w?.poses) return; if(!confirm("清除這張姿勢底模?")) return; delete w.poses[b.dataset.pbd]; await saveMetaCloud(); renderFacility() });
  B.querySelectorAll("[data-pbu]").forEach(b=>b.onclick=()=>{ const s=slotOf(PB_MEM), k=b.dataset.pbu, inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; try{ const bmp=await createImageBitmap(f), q=Math.min(1,1536/Math.max(bmp.width,bmp.height)), c=document.createElement("canvas");
      c.width=Math.round(bmp.width*q); c.height=Math.round(bmp.height*q); c.getContext("2d").drawImage(bmp,0,0,c.width,c.height); let u=c.toDataURL("image/webp",.92); if(!u.startsWith("data:image/webp")) u=c.toDataURL("image/png");
      const w=WMETA.find(x=>x.id===s); w.poses={...(w.poses||{}),[k]:u}; await saveMetaCloud(); toast2("已上傳姿勢底模"); renderFacility() }catch(e){toast2("讀不到這張圖")} }; inp.click() });
  B.querySelectorAll("[data-bup]").forEach(b=>b.onclick=()=>{ const s=b.dataset.bup, inp=document.createElement("input"); inp.type="file"; inp.accept="image/*";
    inp.onchange=async()=>{ const f=inp.files[0]; if(!f) return; try{ const bmp=await createImageBitmap(f), k=Math.min(1,1536/Math.max(bmp.width,bmp.height)), c=document.createElement("canvas");
      c.width=Math.round(bmp.width*k); c.height=Math.round(bmp.height*k); c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
      let url=c.toDataURL("image/webp",.92); if(!url.startsWith("data:image/webp")) url=c.toDataURL("image/png");
      let w=WMETA.find(x=>x.id===s); if(!w){w={id:s,name:byId(midOf(s)).n,en:"",gen:"",profile:"",current:""};WMETA.push(w)} w.gen=url;
      toast2("上傳中…"); const ok=await saveMetaCloud(); if(ok) toast2(`${byId(midOf(s)).n}的底模已更新,也同步到雲端了`); renderFacility() }catch(e){toast2("讀不到這張圖,請換一張")} }; inp.click() });
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
    <header class="fac-head"><div class="fac-title"><small>COMPANY ・ 1F ・ STYLING</small><b>造型室</b></div>
      <nav class="fac-tabs" role="tablist"><button data-ft="closet" role="tab">衣櫃</button><button data-ft="design" role="tab">委託設計</button><button data-ft="studio" role="tab">設計工作台<i id="fBadge"></i></button><button data-ft="bases" role="tab">成員底模</button></nav>
      <button class="fac-close" id="facClose">離開</button></header>
    <div class="fac-body" id="facBody"></div>
    <div class="fac-detail hide" id="facDetail"></div>`;
  $("#stage").appendChild(el);
  el.querySelectorAll("[data-ft]").forEach(b=>b.onclick=()=>{fTab=b.dataset.ft;renderFacility()});
  $("#facClose").onclick=closeFacility;
}
window.openFacility=async kind=>{ facShell(); FAC=kind; PENDING=await IDB.get("pending")||{}; setPause("fac",true);
  const el=$("#facility"); el.querySelector(".fac-bg").style.backgroundImage=`url(assets/bg/styling_${SLOTS[S.slot].light}.webp)`;
  void el.offsetWidth; el.classList.remove("hide"); renderFacility() };
function closeFacility(){ $("#facility").classList.add("hide"); $("#facDetail").classList.add("hide"); setPause("fac",false); FAC=null }

function chipRow(list,cur,attr){return list.map(([k,n,c])=>`<button class="fchip${k===cur?" on":""}" data-${attr}="${k}" ${c?`style="--mc:${c}"`:""}>${n}</button>`).join("")}
function cardHTML(lk,mid){
  const slot=mid?slotOf(mid):Object.keys(lk.members||{}).find(s=>lk.members[s]?.img&&midOf(s))||Object.keys(lk.members||{})[0];
  const m=byId(midOf(slot)), o=lk.members?.[slot]||{}, has=!!o.img;
  const sprite=Object.values(lk.members||{}).some(x=>x?.sprites);
  return `<button class="wcard" data-look="${esc(lk.code)}" data-slot="${slot}">
    <span class="wframe"></span><span class="wimg" data-ref="${has?esc(o.img):""}">${has?"":`<span class="wnone">尚未生圖</span>`}</span>
    ${m?`<span class="wwho" style="--mc:${m.c}">${lk.type==="group"?"全員":m.n}</span>`:""}
    ${o.model==="gpt-image-1.5"?`<span class="wmod">1.5</span>`:""}${Object.values(lk.members||{}).some(x=>x?.redo)?`<span class="wrev">改版待生圖</span>`:REPL_SET.has(lk.code)?`<span class="wrev wold">已有改版</span>`:""}<span class="wname">${esc(lk.name||lk.code)}</span><span class="wmeta">${esc(wIsDaily(lk.occasion)?lk.occasion.replace("日常・",""):lk.occasion||"")}${wSeasonText(lk.seasons)!=="四季"?"・"+wSeasonText(lk.seasons):""}${lk.pose&&lk.pose!=="stand"?"・"+poseOf(lk.pose)[1]:""}${sprite?"・可穿":""}</span></button>`}
function renderCloset(){
  const RL=replacedList(); REPL_SET=new Set(RL.map(x=>x.old));
  const mems=[["all","全員"],...M.map(m=>[m.id,m.n,m.c])];
  let list=wLooks().filter(l=>(fCat==="all"||wCatOf(l.occasion)===fCat)&&(fMem==="all"||Object.keys(l.members||{}).some(s=>midOf(s)===fMem)));
  list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)||String(b.code).localeCompare(String(a.code)));
  const have=list.filter(l=>Object.values(l.members||{}).some(o=>o?.img)).length;
  return `<div class="fbar"><div class="fchips">${chipRow(mems,fMem,"fm")}</div><div class="fchips">${chipRow(W_CATS,fCat,"fc")}</div></div>
    <div class="fsumrow"><p class="fsum">共 ${list.length} 套,已有圖 ${have} 套${wLooks().length?"":(syAuth()?"。還沒讀到造型:到選單按「立即同步」":"。還沒讀到造型:請先在選單登入雲端同步")}</p><span class="fbtns">${RL.length?`<button class="fbtn" id="fReplOld">刪除已被改版取代的舊造型(${RL.length})</button>`:""}${wLooks().length?`<button class="fbtn" id="fExport" title="衣櫃全部造型的清單(JSON),給服裝批次設計對話比對用">${isNative?"複製造型清單":"匯出造型清單"}</button>`:""}</span></div>
    <div class="wgrid">${list.map(l=>cardHTML(l,fMem==="all"?null:fMem)).join("")||`<p class="fempty">這個分類還沒有造型</p>`}</div>`}
function renderStudio(){
  const o=oai(), todo=todoList(), pend=Object.entries(PENDING), waiting=JOBS.filter(j=>j.state==="wait"||j.state==="run").length, errs=JOBS.filter(j=>j.state==="err");
  const cost=(todo.length*(OAI_PRICE[o.quality]||.06)).toFixed(2);
  return `<div class="fdesk">
    <div class="fpanel">
      <h3>待生圖</h3>
      <p class="big">${todo.length}<small> 張</small></p>
      ${noBaseCount()?`<p class="fnote" style="color:#9A3D47">另有 ${noBaseCount()} 張因為還沒設定該成員的「生圖底模」而略過</p>`:""}
      <p class="fnote">${o.key?`品質「${{low:"低",medium:"中",high:"高"}[o.quality]||o.quality}」,預估約 US$${cost}(以 OpenAI 帳單為準)`:"還沒設定 OpenAI 金鑰:選單 → AI 生圖"}</p>
      <div class="frow"><button class="fbtn pri" id="fStart" ${!o.key||(!todo.length&&!waiting)||RUNNING?"disabled":""}>${RUNNING?`生圖中…剩 ${waiting} 張`:"全部開始生圖"}</button>${RUNNING?`<button class="fbtn" id="fStop">暫停</button>`:""}</div>
      ${errs.length?`<div class="ferrs"><b>${errs.length} 張失敗</b>${errs.slice(0,6).map(j=>`<p>${esc(ITEMS[j.code]?.name||j.code)}・${byId(midOf(j.slot))?.n||""}:${esc(j.err||"")} <button class="flink" data-retry="${esc(j.id)}">重試</button></p>`).join("")}</div>`:""}
      <p class="fnote">生好的圖會放到右邊「待審」;收下後才會寫進衣櫃與雲端。日常服(練習、居家、外出、睡衣)收下時會自動去背、做好六種表情的換臉層,成員就會依地點換穿。要重做某張圖,到衣櫃的卡片詳情按「重新生圖」。</p>
    </div>
    <div class="fpanel wide"><div class="frow" style="justify-content:space-between;align-items:center;margin:0 0 .6cqw"><h3 style="margin:0">待審 <small>${pend.length} 張</small></h3>${pend.length>1?`<button class="fbtn pri" id="fOkAll" ${BULK?"disabled":""}>${BULK?"收下中…":`全部收下(${pend.length} 張)`}</button>`:""}</div>
      <div class="rgrid">${pend.map(([id,p])=>{const lk=ITEMS[p.code],m=byId(midOf(p.slot)),old=lk?.members?.[p.slot]?.img;return `<div class="rcard"><div class="rpair"><img src="${p.img}" alt="">${old?`<span class="rold" data-oldref="${esc(old)}"><i>原本的圖</i></span>`:""}</div>
        <div class="rinfo"><b>${esc(lk?.name||p.code)}</b><span style="color:${m?.c}">${m?.n||""}</span></div><div class="rmodel">${esc(p.model||"")}${p.quality?"・"+({low:"低",medium:"中",high:"高"}[p.quality]||p.quality):""}${old?"・收下會取代原本的圖(舊圖保留,可改回)":""}</div>
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
  body.querySelectorAll("[data-ok]").forEach(b=>b.onclick=()=>{ if(!BULK) approve(b.dataset.ok) });
  const oa=$("#fOkAll"); if(oa) oa.onclick=approveAll;
  const ex=$("#fExport"); if(ex) ex.onclick=exportLooks;
  const ro=$("#fReplOld"); if(ro) ro.onclick=openReplacedList;
  body.querySelectorAll("[data-retry]").forEach(b=>b.onclick=()=>retry(b.dataset.retry));
  body.querySelectorAll("[data-no]").forEach(b=>b.onclick=()=>discard(b.dataset.no));
  const st=$("#fStart"); if(st) st.onclick=()=>{ for(const t of todoList()){const id=jobId(t.code,t.slot); if(!JOBS.some(j=>j.id===id)) JOBS.push({id,...t,state:"wait"})} runQueue() };
  const sp=$("#fStop"); if(sp) sp.onclick=()=>{STOP=true; toast2("這張畫完就暫停")};
  for(const el of body.querySelectorAll(".rold[data-oldref]")) getThumb(el.dataset.oldref).then(t=>{ if(t) el.style.backgroundImage=`url(${t})` });
  // 縮圖:看得到的先做,已經做好的直接顯示
  lazyThumbs(body,".wimg[data-ref]","ref");
}
window.renderFacility=renderFacility;
async function openDetail(code,slot){
  const lk=ITEMS[code]; if(!lk) return; fDetail={code,slot};
  const slots=Object.keys(lk.members||{}).filter(s=>midOf(s)), o=lk.members[slot]||{}, m=byId(midOf(slot));
  const d=$("#facDetail");
  d.innerHTML=`<div class="dcard"><button class="fac-close dx" id="dClose">關閉</button><button class="fac-close dx2" id="dEdit">編輯</button>
    <div class="dimg" id="dImg">${o.img?"":`<span class="wnone">${o.outfit?"尚未生圖:到設計工作台按「全部開始生圖」":"沒有服裝描述"}</span>`}</div>
    <div class="dtext"><small>${esc(lk.code)}・${lk.type==="group"?"團體服":"個人造型"}</small><h2>${esc(lk.name||"")}</h2>
      <p class="dtags">${esc(lk.occasion||"")}・${wSeasonText(lk.seasons)}・${poseOf(lk.pose)[1]}</p>
      <div class="fchips">${slots.map(s=>{const mm=byId(midOf(s));return `<button class="fchip${s===slot?" on":""}" data-ds="${s}" style="--mc:${mm.c}">${mm.n}${lk.members[s]?.img?"":" ・未生圖"}</button>`}).join("")}</div>
      ${lk.concept?`<p class="dcon">${esc(lk.concept)}</p>`:""}
      ${reps(lk).filter(c=>ITEMS[c]).length?`<p class="dcon drev">改版自「${reps(lk).filter(c=>ITEMS[c]).map(c=>esc(ITEMS[c].name||c)).join("、")}」:${lk.type==="group"?"全員":""}新圖都收下${wIsDaily(lk.occasion)?"、遊戲立繪處理好":""}之後,舊的那套會自動刪除(雲端一起)。</p>`:""}
      ${(()=>{ const by=wLooks().filter(x=>reps(x).includes(lk.code)); return by.length?`<p class="dcon drev">這套已經有改版「${by.map(x=>esc(x.name||x.code)).join("、")}」(${esc(readyNote(by[0]))}),改版完成後會自動刪除。</p>`:"" })()}
      ${o.redo?`<p class="dcon drev">這套改版了:新的描述還沒生圖,遊戲裡先穿舊版。到「設計工作台」按「全部開始生圖」;收下新圖後舊圖會保留,可以改回。</p>`:""}
      ${o.img?`<div class="dsp"><b>生圖模型</b> <span id="dModel">${esc(o.model||"未記錄")}</span>
        <button class="fbtn" id="dRegen">重新生圖</button><button class="fbtn" id="dFull">全身照</button><button class="fbtn" id="dHalf">半身照</button>${o.prev?.img?`<button class="fbtn ghost" id="dRestore">改回舊圖${o.prev.model?`(${esc(o.prev.model)})`:""}</button>`:""}</div>`:""}
      ${wIsDaily(lk.occasion)&&o.img?`<div class="dsp"><b>遊戲立繪</b> ${o.sprites?`<span class="ok">已處理,遊戲裡會依地點換穿</span>`:`<span class="no">還沒處理</span>`}
        <button class="fbtn" id="dProc">${o.sprites?"重新處理":"處理成遊戲立繪"}</button><div class="dspr" id="dSpr"></div></div>`:""}
      ${o.twist?`<p class="dcon"><b style="color:${m?.c}">${m?.n} 的小巧思</b> ${esc(o.twist)}</p>`:""}
      <details><summary>服裝描述(英文)</summary><p class="dout">${esc(o.outfit||"")}</p></details></div></div>`;
  d.classList.remove("hide");
  $("#dClose").onclick=()=>d.classList.add("hide"); $("#dEdit").onclick=()=>editLook(code);
  d.querySelectorAll("[data-ds]").forEach(b=>b.onclick=()=>openDetail(code,b.dataset.ds));
  const rg=$("#dRegen"); if(rg) rg.onclick=()=>{ const id=jobId(code,slot); if(PENDING[id]){toast2("這張已經在待審了");return}
    if(!oai().key){toast2(OAI_ERR.no_key);return} JOBS=JOBS.filter(j=>j.id!==id); JOBS.push({id,code,slot,state:"wait"}); runQueue();
    toast2("已排進生圖,好了會出現在設計工作台的待審"); rg.disabled=true; rg.textContent="生圖中…" };
  const fname=`完美女團_${lk.name||code}_${byId(midOf(slot))?.n||slot}`;
  // 全身照、半身照:在純圖檢視裡下載(存的就是畫面上看到的那張)
  const view=mode=>async()=>{ const src=await getBlob(o.img); if(src) openPhoto(src,fname,{title:`${lk.name||""}・${byId(midOf(slot))?.n||""}`,mode}) };
  const fb=$("#dFull"); if(fb) fb.onclick=view("full"); const hb=$("#dHalf"); if(hb) hb.onclick=view("half");
  const di=$("#dImg"); if(di&&o.img){ di.style.cursor="zoom-in"; di.onclick=view("full") }
  const rs=$("#dRestore"); if(rs) rs.onclick=async()=>{ if(!confirm("改回舊圖?現在的圖會變成「舊圖」,之後還能再換回來。")) return;
    const lk2=JSON.parse(JSON.stringify(ITEMS[code])), m2=lk2.members[slot], pv=m2.prev;
    lk2.members[slot]={...m2,img:pv.img,model:pv.model||"",sprites:pv.sprites||undefined,...(pv.outfit?{outfit:pv.outfit}:{}),prev:{img:m2.img,model:m2.model||"",sprites:m2.sprites||null,outfit:m2.outfit||""}};
    if(!lk2.members[slot].sprites) delete lk2.members[slot].sprites; lk2.updatedAt=Date.now();
    delete (window.DYN||{})[code+"@"+midOf(slot)]; await saveDoc("items",lk2); ensureWear(true); toast2("已改回舊圖"); openDetail(code,slot); renderFacility() };
  const pb=$("#dProc"); if(pb) pb.onclick=async()=>{ pb.disabled=true; pb.textContent="處理中…(約幾秒)";
    try{ await processSprites(code,slot); const rd=await checkReplaces(code,true); toast2("已重新去背並做好換臉層"+(rd?`;被這套取代的 ${rd} 套舊造型已刪除`:"")); if(ITEMS[code]) openDetail(code,slot) }catch(e){ toast2("處理失敗:"+(e.message||"")); pb.disabled=false; pb.textContent="再試一次" } };
  const box=$("#dSpr"); if(box&&o.sprites){ const mid=midOf(slot); window.needDyn&&needDyn(code,mid);
    const show=()=>{const d=window.DYN?.[code+"@"+mid]; if(d) box.innerHTML=["neutral","smile","laugh","sad","angry","shy"].map(e=>`<img src="${d[e]}" alt="">`).join(""); else setTimeout(show,400)}; show() }
  if(o.img){ const src=await getBlob(o.img); if(src&&fDetail?.code===code&&fDetail?.slot===slot){ $("#dImg").style.backgroundImage=`url(${src})`;
    if(!o.model&&$("#dModel")){ const im=new Image(); im.onload=()=>{const c=document.createElement("canvas");c.width=8;c.height=8;const x=c.getContext("2d");x.drawImage(im,0,0,8,8);const a=x.getImageData(0,0,1,1).data[3];
      $("#dModel").textContent=a<20?"gpt-image-1.5(舊版透明背景)":"未記錄"}; im.src=src } } }
}

/* ---------- 匯出造型清單(2026-10-26):給「服裝批次設計」對話比對用,避免設計出重複或相近的造型 ----------
   匯出衣櫃全部造型(不管目前的篩選):代號、名稱、給誰、場合、季節、姿勢、概念、共用設計語彙、標籤、五軸,以及每位成員的 outfit 原文、巧思、
   有沒有圖、生圖模型、是否已做成遊戲立繪、有沒有保留舊圖。成員一律用代號 ys/tr/hy/he/hr(跟匯入格式相同)。
   網頁版下載 JSON 檔;APK 不能下載檔案,改成複製到剪貼簿(可以直接貼到對話裡)。 */
function lookListJSON(){
  const occI=o=>{ const i=W_OCC.indexOf(o==="日常"?"日常・外出":o); return i<0?99:i };
  const list=wLooks().slice().sort((a,b)=>occI(a.occasion)-occI(b.occasion)||String(a.code).localeCompare(String(b.code)));
  const items=list.map(l=>{ const ms={};
    for(const [slot,o] of Object.entries(l.members||{})){ const mid=midOf(slot)||slot;
      ms[mid]={outfit:o?.outfit||"",twist:o?.twist||"",img:!!o?.img,model:o?.img?(o.model||""):"",sprite:!!o?.sprites,prev:!!o?.prev?.img} }
    return {code:l.code,name:l.name||"",type:l.type||"solo",target:l.target?(midOf(l.target)||l.target):"",occasion:l.occasion||"",
      seasons:Array.isArray(l.seasons)?l.seasons:[],pose:l.pose||"stand",concept:l.concept||"",base:l.base||"",tags:Array.isArray(l.tags)?l.tags:[],
      attrs:l.attrs||{},source:l.source||"",replaces:reps(l),updated:l.updatedAt?new Date(l.updatedAt).toISOString().slice(0,10):"",members:ms} });
  const by={}; for(const it of items) by[it.occasion]=(by[it.occasion]||0)+1;
  return {app:"kpop-clothes-list",ver:1,game:"完美女團",exportedAt:new Date().toISOString(),count:items.length,byOccasion:by,
    note:"完美女團造型室的衣櫃清單(依場合排序)。members 用成員代號:ys 藝瑟、tr 泰梨、hy 日和、he 夏恩、hr 河嵐。img=已有圖,model=生圖模型,sprite=已做成遊戲立繪(日常類才有),prev=有保留的舊圖。",items} }
async function exportLooks(){
  const o=lookListJSON(); if(!o.count){ toast2("衣櫃裡還沒有造型"); return }
  const txt=JSON.stringify(o,null,1), d=new Date(), name=`完美女團_造型清單_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.json`;
  if(isNative){ toast2(await copyText(txt)?`已複製 ${o.count} 套造型的清單,可以直接貼到服裝對話`:"複製失敗:請改用網頁版的「匯出造型清單」"); return }
  const u=URL.createObjectURL(new Blob([txt],{type:"application/json"})), a=document.createElement("a");
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
  toast2(`已匯出 ${o.count} 套造型的清單(${name})`) }

/* ---------- 選單:AI 生圖設定 ---------- */
function oaiSettingsInit(){
  const box=$("#oaiBox"); if(!box) return; const o=oai();
  $("#oaiKey").value=o.key?"•••••••• 已設定":""; $("#oaiQ").value=o.quality||"medium";
  $("#oaiKey").onfocus=e=>{ if(e.target.value.startsWith("•")) e.target.value="" };
  $("#oaiSave").onclick=()=>{ const k=$("#oaiKey").value.trim(); const patch={model:"gpt-image-2",quality:$("#oaiQ").value};
    if(k&&!k.startsWith("•")){ if(!/^sk-/.test(k)){toast2("OpenAI 金鑰通常是 sk- 開頭,請再確認");return} patch.key=k }
    setOai(patch); oaiSettingsInit(); toast2("AI 生圖設定已儲存") };
  $("#oaiClear").onclick=()=>{ const x=oai(); delete x.key; localStorage.setItem(OAI_KEY,JSON.stringify(x)); oaiSettingsInit(); toast2("已清除 OpenAI 金鑰") };
}
$("#menuBtn").addEventListener("click",oaiSettingsInit);

/* ---------- 啟動 ---------- */
(async()=>{ for(let i=0;i<40&&!IDB.db;i++) await new Promise(r=>setTimeout(r,100)); PENDING=await IDB.get("pending")||{}; await takeImport() })();
