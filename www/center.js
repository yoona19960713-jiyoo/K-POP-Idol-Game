"use strict";
/* =====================================================================
   製作中心的設施(2026-10-27 公司重新規畫)
   ・1F 大廳「獎盃牆」(openRecords):出道、粉絲、音樂節目一位(各年)、得獎、演唱會、目前的發行
   ・1F 攝影棚「MV 試映」(openMVRoom):這次發行的每首歌,有 AI MV 檔案(www/assets/mv/<代號>.mp4)就播影片,沒有就播動態 MV;
     列出每首歌的代號,MV 製作對話剪好的檔案要用這個代號命名。
   其他房間:3F 企劃室(songs.js planning)、3F 會議室(演唱會企劃)、2F 設計工作室(wardrobe.js design)、2F 聲樂室(拜訪)。
   ===================================================================== */
(()=>{
const light=()=>SLOTS[S.slot].light;
function room(id,{title,sub,bg,pause}){ document.getElementById(id)?.remove();
  const el=document.createElement("section"); el.id=id; el.className="fac-wrap th-office one-room hide";
  el.innerHTML=`<div class="fac-bg" style="background-image:url(assets/bg/${bg}_${light()}.webp)"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small>${sub}</small><b>${title}</b></div><button class="fac-close">離開</button></header><div class="fac-body"></div>`;
  $("#stage").appendChild(el); setPause(pause,true);
  el.querySelector(".fac-close").onclick=()=>{ el.remove(); setPause(pause,false) };
  window.facShow?facShow(el,`assets/bg/${bg}_${light()}.webp`):el.classList.remove("hide");   // 呼叫端同步填好內容後,下一格才淡入
  return el.querySelector(".fac-body") }
const fd=d=>{ const x=dateOf(d); return `${x.getFullYear()}.${x.getMonth()+1}.${x.getDate()}` };
const VN={hall:"星環 Live Hall",arena:"漢江體育館",dome:"首爾巨蛋"};
/* 2026-10-28 改版:大廳是胡桃木獎盃牆(黃銅名牌、一位的獎盃一座一座排上去、演唱會票根、這次發行做成專輯),攝影棚是電影海報式的 MV 清單 */
const CUP=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3.2a5 5 0 0 1-10 0z"/><path d="M7 4.6H4.6a2.4 2.4 0 0 0 2.6 3.8M17 4.6h2.4a2.4 2.4 0 0 1-2.6 3.8"/><path d="M12 11.2v3.6M8.6 20.6h6.8l-.8-3.2H9.4z"/></svg>`;
window.openRecords=()=>{ const B=room("recRoom",{title:"大廳・獎盃牆",sub:"PRODUCTION CENTER ・ 1F ・ LOBBY",bg:"lobby",pause:"records"});
  const st=S.stats||{fans:0,wins:0,winsByYear:{},awards:[]}, dd=window.DEBUT_DAY??366, debuted=S.day>=dd;
  const yrs=Object.entries(st.winsByYear||{}).sort((a,b)=>a[0]-b[0]), aw=(st.awards||[]).filter(a=>a.got?.length), cs=S.concerts||[], R=window.SONGS_API?.R;
  const wins=st.wins||0, shown=Math.min(wins,12);
  const cups=wins?Array.from({length:shown},(_,i)=>`<i class="tw-cup" style="--d:${i*60}ms">${CUP}</i>`).join("")+(wins>12?`<i class="tw-more">+${wins-12}</i>`:""):Array.from({length:3},()=>`<i class="tw-cup ghost">${CUP}</i>`).join("");
  B.innerHTML=`<div class="tw">
    <div class="tw-plq tw-hero"><small>PERFECT GIRL GROUP</small><b class="tw-num">${debuted?S.day-dd+1:dd-S.day}</b><span>${debuted?"出道第幾天":"出道倒數(天)"}</span><em>出道日 ${fd(dd)}${st.fans?`・粉絲指數 ${Math.round(st.fans)}`:""}</em></div>
    <div class="tw-plq tw-wins"><h4>音樂節目一位</h4><div class="tw-cups">${cups}</div><p class="tw-cnt"><b>${wins}</b> 次</p>${yrs.length?`<p class="tw-yrs">${yrs.map(([y,n])=>`<span>${y}<b>${n}</b></span>`).join("")}</p>`:`<p class="tw-empty">${debuted?"第一座一位獎盃,還空著位置。":"出道後的打歌期開始計算。"}</p>`}</div>
    <div class="tw-plq tw-aw"><h4>得獎</h4>${aw.length?aw.map(a=>`<div class="tw-award">${CUP}<b>${a.y}</b><span>${a.got.map(esc).join("、")}</span></div>`).join(""):`<p class="tw-empty">年底的頒獎典禮之後,獎盃會放在這裡。</p>`}</div>
    <div class="tw-plq tw-cn"><h4>演唱會</h4>${cs.length?cs.map(c=>`<div class="tw-ticket"><b>〈${esc(c.title||"演唱會")}〉</b><span>${c.day!=null?fd(c.day):""}${c.venue?`・${esc(VN[c.venue]||c.venue)}`:""}</span></div>`).join(""):`<p class="tw-empty">還沒有開過演唱會。</p>`}</div>
    <div class="tw-plq tw-rel"><h4>這次的發行</h4>${R?.tracks?.length?`<div class="tw-cd"><div class="tw-disc"></div><div><b>${esc(R.name||"")}</b><ol>${R.tracks.map(t=>`<li>${esc(t.name||"未命名")}${t.id===R.title?"<i>TITLE</i>":""}</li>`).join("")}</ol></div></div>`:`<p class="tw-empty">企劃室還沒有發行企劃。</p>`}</div>
  </div>` };
/* MV 海報的配色:依歌名挑一組,同一首歌每次都一樣 */
const PAL=[["#7A1430","#2A0A18","#E9CF8F"],["#3B1F6B","#120A26","#D9B8FF"],["#0F3B5C","#081626","#9FD8FF"],["#5E1B3E","#1C0814","#FFB3C8"],["#6A4A12","#1E1406","#FFE3A3"],["#1E4D3A","#08180F","#B8F0D0"]];
const palOf=s=>{ let h=0; for(const c of String(s)) h=(h*31+c.codePointAt(0))>>>0; return PAL[h%PAL.length] };
/* ---------- MV 素材包(2026-10-28):選歌、選造型 → ZIP(製作單 JSON、每人全身與半身照、說明) ---------- */
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0 } return t })();
const crc32=u=>{ let c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=CRC[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0 };
function makeZip(files){ const enc=new TextEncoder(), parts=[], cen=[]; let off=0;
  const d=new Date(), dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const f of files){ const nm=enc.encode(f.name), data=f.data, c=crc32(data);
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,dt,true); h.setUint16(12,dd,true);
    h.setUint32(14,c,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nm,data);
    const e=new DataView(new ArrayBuffer(46)); e.setUint32(0,0x02014b50,true); e.setUint16(4,20,true); e.setUint16(6,20,true); e.setUint16(8,0x0800,true); e.setUint16(10,0,true); e.setUint16(12,dt,true); e.setUint16(14,dd,true);
    e.setUint32(16,c,true); e.setUint32(20,data.length,true); e.setUint32(24,data.length,true); e.setUint16(28,nm.length,true); e.setUint32(42,off,true);
    cen.push(new Uint8Array(e.buffer),nm); off+=30+nm.length+data.length }
  const cs=cen.reduce((a,b)=>a+b.length,0), end=new DataView(new ArrayBuffer(22)); end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,cs,true); end.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(end.buffer)],{type:"application/zip"}) }
const toBytes=async src=>{ if(!src) return null; const r=await fetch(src); return new Uint8Array(await r.arrayBuffer()) };
/* 半身照:取上面 58%(臉到腰),跟卡片詳情的「半身照」一樣的感覺 */
const halfOf=async src=>{ const im=new Image(); im.src=src; await im.decode(); const w=im.naturalWidth, h=Math.round(im.naturalHeight*.58), c=document.createElement("canvas"); c.width=w; c.height=h;
  c.getContext("2d").drawImage(im,0,0,w,h,0,0,w,h); return new Uint8Array(await (await new Promise(r=>c.toBlob(r,"image/webp",.95))).arrayBuffer()) };
function mvPackDialog(R){ document.getElementById("mvPackDlg")?.remove(); const isNative=!!window.Capacitor?.isNativePlatform?.();
  const looks=(typeof wLooks==="function"?wLooks():[]).filter(l=>Object.values(l.members||{}).some(o=>o?.img));
  const stageFirst=looks.sort((a,b)=>(/打歌|舞台|演唱|頒獎/.test(b.occasion||"")?1:0)-(/打歌|舞台|演唱|頒獎/.test(a.occasion||"")?1:0)||(b.type==="group")-(a.type==="group"));
  const el=document.createElement("div"); el.id="mvPackDlg"; el.className="fac-detail";
  el.innerHTML=`<div class="mvpk"><h3>匯出 MV 素材包</h3>
    <label>歌曲<select id="mpSong">${R.tracks.map(t=>`<option value="${esc(t.id)}"${t.id===R.title?" selected":""}>${esc(t.name||"未命名")}${t.id===R.title?"(主打)":""}</option>`).join("")}</select></label>
    <label>造型<select id="mpLook">${stageFirst.map(l=>`<option value="${esc(l.code)}">${esc(l.name||l.code)}・${l.type==="group"?"團體服":"個人"}・${esc(l.occasion||"")}</option>`).join("")||`<option value="">衣櫃裡還沒有有圖的造型</option>`}</select></label>
    <p class="fnote">ZIP 裡有:製作單(JSON)、這套造型每位成員的全身照與半身照、說明。MV 剪好後檔名用歌曲代號。${isNative?"<br><b>手機 App 不能存 ZIP,請在電腦版或網頁版匯出。</b>":""}</p>
    <div class="frow"><button class="pbtn pri" id="mpGo"${isNative?" disabled":""}>匯出</button><button class="pbtn" id="mpX">取消</button></div></div>`;
  document.getElementById("stage").appendChild(el);
  el.querySelector("#mpX").onclick=()=>el.remove();
  el.querySelector("#mpGo").onclick=async()=>{ const b=el.querySelector("#mpGo"); b.disabled=true; b.textContent="打包中…";
    try{ const T=R.tracks.find(t=>t.id===el.querySelector("#mpSong").value), lk=ITEMS[el.querySelector("#mpLook").value];
      const files=[], enc=new TextEncoder(), clean=x=>String(x||"").replace(/[\\/:*?"<>|]/g,"");
      const sheet=window.SONGS_API?.sheetOf?.(T); if(sheet) files.push({name:`製作單_${clean(T.name)}.json`,data:enc.encode(JSON.stringify(sheet,null,1))});
      let n=0;
      if(lk) for(const [slot,o] of Object.entries(lk.members||{})){ const m=byId(midOf(slot)); if(!m||!o?.img) continue; const src=await getBlob(o.img); const full=await toBytes(src); if(!full) continue;
        files.push({name:`${m.n}_全身.webp`,data:full}); try{ files.push({name:`${m.n}_半身.webp`,data:await halfOf(src)}) }catch(e){} n++ }
      files.push({name:"說明.txt",data:enc.encode(`完美女團 MV 素材包\n歌曲:${T.name}(代號 ${T.id})\n造型:${lk?.name||"無"}(${lk?.code||""})\n\n・製作單:段落、秒數、逐句分配、歌詞、killing part、編舞強弱。\n・每位成員的全身照與半身照:分鏡與影片工具的參考圖。\n・剪好的 MV 檔名請用「${T.id}.mp4」(22 MB 以內),放進 www/assets/mv/ 上傳 GitHub,攝影棚就會播。\n`)});
      const blob=makeZip(files), name=`完美女團_MV素材包_${clean(T.name)}.zip`, u=URL.createObjectURL(blob), a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),8000);
      toast2(`已匯出 MV 素材包(${n} 位成員,${(blob.size/1048576).toFixed(1)} MB)`); el.remove() }
    catch(e){ window.logErr?.("center",e); toast2("匯出失敗"); b.disabled=false; b.textContent="匯出" } } }
window.openMVRoom=async()=>{ const B=room("mvRoom",{title:"攝影棚・MV 試映",sub:"PRODUCTION CENTER ・ 1F ・ PHOTO STUDIO",bg:"photo",pause:"mvroom"}); const R=window.SONGS_API?.R;
  if(!R?.tracks?.length){ B.innerHTML=`<p class="rec-empty">企劃室還沒有歌。</p>`; return }
  B.innerHTML=`<div class="pst-grid">${R.tracks.map((t,i)=>{ const [c1,c2,c3]=palOf(t.name||t.id); return `<button class="pst" data-mv="${esc(t.id)}" style="--c1:${c1};--c2:${c2};--c3:${c3}">
      <span class="pst-art"></span><span class="pst-film"></span>
      <span class="pst-top"><span class="pst-no">${String(i+1).padStart(2,"0")}</span>${t.id===R.title?`<i class="pst-badge">TITLE TRACK</i>`:""}</span>
      <b class="pst-t">${esc(t.name||"未命名")}</b><span class="pst-g">PERFECT GIRL GROUP</span>
      <small class="pst-k">代號 ${esc(t.id)}・<span data-kind="${esc(t.id)}">檢查中…</span></small><span class="pst-play">▶ 播放</span></button>` }).join("")}</div>
    <div class="pst-pack"><b>MV 素材包</b><span>製作單+每人造型的全身照與半身照,打包成一個 ZIP 交給 MV 製作對話</span><button class="pbtn pri" id="mvPack">匯出素材包…</button></div>
    <p class="rec-empty pst-note">AI 影片 MV 由 MV 製作對話剪好,檔名用上面的代號,放進 www/assets/mv/ 上傳 GitHub 就會播;沒有的歌播遊戲內的動態 MV。</p>`;
  B.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{ const T=R.tracks.find(x=>x.id===b.dataset.mv); window.openMV?.(T) });
  B.querySelector("#mvPack").onclick=()=>mvPackDialog(R);
  for(const t of R.tracks){ const u=await window.mvFileOf?.(t); const e=B.querySelector(`[data-kind="${CSS.escape(t.id)}"]`); if(e) e.textContent=u?"AI 影片 MV":"動態 MV";
    if(u){ const art=B.querySelector(`[data-mv="${CSS.escape(t.id)}"] .pst-art`); if(art){ const v=document.createElement("video"); v.muted=true; v.playsInline=true; v.preload="metadata"; v.src=u+"#t=2"; art.appendChild(v); art.classList.add("has") } } } };
})();
