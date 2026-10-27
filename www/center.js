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
  const el=document.createElement("section"); el.id=id; el.className="fac-wrap th-office one-room";
  el.innerHTML=`<div class="fac-bg" style="background-image:url(assets/bg/${bg}_${light()}.webp)"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small>${sub}</small><b>${title}</b></div><button class="fac-close">離開</button></header><div class="fac-body"></div>`;
  $("#stage").appendChild(el); setPause(pause,true);
  el.querySelector(".fac-close").onclick=()=>{ el.remove(); setPause(pause,false) };
  return el.querySelector(".fac-body") }
const fd=d=>{ const x=dateOf(d); return `${x.getFullYear()}.${x.getMonth()+1}.${x.getDate()}` };
const VN={hall:"星環 Live Hall",arena:"漢江體育館",dome:"首爾巨蛋"};
window.openRecords=()=>{ const B=room("recRoom",{title:"大廳・獎盃牆",sub:"PRODUCTION CENTER ・ 1F ・ LOBBY",bg:"lobby",pause:"records"});
  const st=S.stats||{fans:0,wins:0,winsByYear:{},awards:[]}, dd=window.DEBUT_DAY??741, debuted=S.day>=dd;
  const yrs=Object.entries(st.winsByYear||{}).sort((a,b)=>a[0]-b[0]), aw=(st.awards||[]).filter(a=>a.got?.length), cs=S.concerts||[], R=window.SONGS_API?.R;
  B.innerHTML=`<div class="rec-grid">
    <div class="rec-card"><h4>完美女團</h4><p class="rec-big">${debuted?`出道第 ${S.day-dd+1} 天`:`出道倒數 ${dd-S.day} 天`}</p><p>出道日 ${fd(dd)}${st.fans?`・粉絲指數 ${Math.round(st.fans)}`:""}</p></div>
    <div class="rec-card"><h4>音樂節目一位</h4><p class="rec-big">${st.wins||0}<small> 次</small></p>${yrs.length?`<ul>${yrs.map(([y,n])=>`<li>${y} 年 <b>${n}</b> 次</li>`).join("")}</ul>`:`<p class="rec-empty">${debuted?"第一個一位還在等著。":"出道後的打歌期開始計算。"}</p>`}</div>
    <div class="rec-card"><h4>得獎</h4>${aw.length?`<ul>${aw.map(a=>`<li><b>${a.y}</b>・${a.got.map(esc).join("、")}</li>`).join("")}</ul>`:`<p class="rec-empty">年底的頒獎典禮之後,獎盃會放在這裡。</p>`}</div>
    <div class="rec-card"><h4>演唱會</h4>${cs.length?`<ul>${cs.map(c=>`<li>〈${esc(c.title||"演唱會")}〉${c.day!=null?`・${fd(c.day)}`:""}${c.venue?`・${esc(VN[c.venue]||c.venue)}`:""}</li>`).join("")}</ul>`:`<p class="rec-empty">還沒有開過演唱會。</p>`}</div>
    <div class="rec-card"><h4>這次的發行</h4>${R?.tracks?.length?`<p>${esc(R.name||"")}</p><ul>${R.tracks.map((t,i)=>`<li>${String(i+1).padStart(2,"0")} ${esc(t.name||"未命名")}${t.id===R.title?"・主打":""}</li>`).join("")}</ul>`:`<p class="rec-empty">企劃室還沒有發行企劃。</p>`}</div>
  </div>` };
window.openMVRoom=async()=>{ const B=room("mvRoom",{title:"攝影棚・MV 試映",sub:"PRODUCTION CENTER ・ 1F ・ PHOTO STUDIO",bg:"photo",pause:"mvroom"}); const R=window.SONGS_API?.R;
  if(!R?.tracks?.length){ B.innerHTML=`<p class="rec-empty">企劃室還沒有歌。</p>`; return }
  B.innerHTML=`<div class="mv-list">${R.tracks.map((t,i)=>`<div class="mv-row"><div><b>${String(i+1).padStart(2,"0")} ${esc(t.name||"未命名")}${t.id===R.title?"<i>主打</i>":""}</b><small>代號 ${esc(t.id)}・<span data-kind="${esc(t.id)}">檢查中…</span></small></div><button class="pbtn pri" data-mv="${esc(t.id)}">播放 MV</button></div>`).join("")}</div>
    <p class="rec-empty">AI 影片 MV 由 MV 製作對話剪好,檔名用上面的代號,放進 www/assets/mv/ 上傳 GitHub 就會播;沒有的歌播遊戲內的動態 MV。</p>`;
  B.querySelectorAll("[data-mv]").forEach(b=>b.onclick=()=>{ const T=R.tracks.find(x=>x.id===b.dataset.mv); window.openMV?.(T) });
  for(const t of R.tracks){ const u=await window.mvFileOf?.(t); const e=B.querySelector(`[data-kind="${CSS.escape(t.id)}"]`); if(e) e.textContent=u?"AI 影片 MV":"動態 MV" } };
})();
