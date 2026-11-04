"use strict";
/* =====================================================================
   1.2 第 5 包(2026-11-04,第五個大腦):製作者模式的「試玩存檔」
   使用者還沒開始玩新遊戲,1.2 的打歌轉播、宣傳期的行程、加演、春節停播都要到出道宣傳期才看得到;
   正式遊戲照舊不能快轉,所以另外開一份試玩用的存檔,可以跳到任何一天。
   做法:這個檔在所有遊戲程式之前載入。
   - 開始試玩(window.sandboxEnter):把這台裝置上所有 kpop… 開頭的本機資料複製一份到「sbx:」開頭的位置(雲端登入 kpopSync.* 不複製),
     在試玩那份裡記下要跳到哪一天(sbx:kpopGame.sandboxMeta),打開試玩旗標(kpopGame.sandbox = 1),重新載入。
   - 試玩中:Storage 的讀寫遇到 kpop… 開頭的鍵,一律改讀寫「sbx:」那一份——正式存檔在試玩期間一個字都不會被動到;
     game.js 的雲端(syToken、syncAll、pushSave)與 IndexedDB 的存檔備份在試玩中都停掉;game.js 開機時呼叫 window.sandboxApply 跳日。
     畫面上方一直有「試玩存檔中」的標籤和「結束試玩」。
   - 結束試玩(window.sandboxExit):刪掉所有「sbx:」、關掉旗標、重新載入,回到正式存檔。
   只隔開「遊戲進度」(本機資料);在衣櫃、製作者模式改的內容(IndexedDB 的衣櫃、片段庫)會留下來。
   ===================================================================== */
(()=>{
const F="kpopGame.sandbox", P="sbx:", ST=Storage.prototype, get=ST.getItem, set=ST.setItem, rem=ST.removeItem, key=ST.key;
const on=(()=>{ try{ return get.call(localStorage,F)==="1" }catch(e){ return false } })();
window.SANDBOX=on;
const allKeys=()=>{ const L=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=key.call(localStorage,i); if(k!=null) L.push(k) } }catch(e){} return L };
const clearSbx=()=>allKeys().filter(k=>k.startsWith(P)).forEach(k=>rem.call(localStorage,k));
window.sandboxEnter=(day,label)=>{ if(on) return {ok:false,msg:"已經在試玩中了"};
  try{ clearSbx(); const ks=allKeys();
    for(const k of ks) if(/^kpop/.test(k)&&!/^kpopSync\./.test(k)&&k!==F) set.call(localStorage,P+k,get.call(localStorage,k));
    set.call(localStorage,P+"kpopGame.sandboxMeta",JSON.stringify({pending:true,to:Math.max(0,Math.round(+day||0)),label:label||"",at:Date.now()}));
    set.call(localStorage,F,"1"); setTimeout(()=>location.reload(),60); return {ok:true} }
  catch(e){ try{ clearSbx(); rem.call(localStorage,F) }catch(e2){} return {ok:false,msg:"這台裝置的本機空間不夠,沒辦法複製試玩存檔"} } };
window.sandboxExit=ask=>{ if(!on) return; if(ask&&!confirm("結束試玩?試玩的進度會全部刪掉,回到正式存檔。")) return;
  try{ clearSbx(); rem.call(localStorage,F) }catch(e){} location.reload() };
window.sandboxInfo=()=>{ if(!on) return null; try{ return JSON.parse(get.call(localStorage,P+"kpopGame.sandboxMeta")||"null") }catch(e){ return null } };
if(!on){ try{ clearSbx() }catch(e){} return }   // 沒在試玩:結束試玩那一刻關頁前寫進去的殘留一併清掉
const mine=k=>typeof k==="string"&&k!==F&&!k.startsWith(P)&&/^kpop/.test(k);
ST.getItem=function(k){ return get.call(this,this===localStorage&&mine(k)?P+k:k) };
ST.setItem=function(k,v){ return set.call(this,this===localStorage&&mine(k)?P+k:k,v) };
ST.removeItem=function(k){ return rem.call(this,this===localStorage&&mine(k)?P+k:k) };
/* 試玩中的標籤:畫面左右有黑邊(A55 橫放比 16:9 寬)就放在左邊的黑邊裡,不蓋到遊戲;沒有黑邊時放在上方 HUD 的下面 */
const bar=()=>{ if(document.getElementById("sbxBar")) return; const st=document.createElement("style");
  st.textContent=`#sbxBar{position:fixed;z-index:2147483000;display:flex;align-items:center;gap:6px;padding:3px 4px 3px 10px;border-radius:999px;
    background:rgba(28,14,34,.88);border:1px solid rgba(232,196,112,.75);box-shadow:0 2px 10px rgba(0,0,0,.35);font:600 10px/1.2 var(--sans,sans-serif);color:#FFE3A0;letter-spacing:.04em;pointer-events:auto;
    left:50%;transform:translateX(-50%);top:46px}
    #sbxBar.side{flex-direction:column;gap:5px;padding:8px 4px;border-radius:14px;transform:translateY(-50%);top:50%;width:54px;text-align:center}
    #sbxBar.side span{writing-mode:horizontal-tb;font-size:9.5px;line-height:1.35}
    #sbxBar i{width:7px;height:7px;flex:none;border-radius:50%;background:#FFB13B;box-shadow:0 0 6px #FFB13B}
    #sbxBar button{min-height:28px;padding:0 7px;border-radius:999px;border:1px solid rgba(232,196,112,.75);background:rgba(232,196,112,.16);color:#FFF3D6;font:700 10px/1 var(--sans,sans-serif);cursor:pointer;white-space:nowrap}`;
  document.head.appendChild(st); const b=document.createElement("div"); b.id="sbxBar";
  b.innerHTML=`<i></i><span>試玩存檔中</span><button type="button">結束試玩</button>`;
  b.querySelector("button").onclick=e=>{ e.stopPropagation(); window.sandboxExit(true) }; document.body.appendChild(b);
  const place=()=>{ const r=document.getElementById("stage")?.getBoundingClientRect(); if(!r) return;
    if(r.left>=60){ b.classList.add("side"); b.style.left=Math.max(3,(r.left-54)/2)+"px"; b.style.top="" }
    else { b.classList.remove("side"); b.style.left=""; b.style.top=Math.round(r.top+46)+"px" } };
  place(); addEventListener("resize",place); setTimeout(place,800) };
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bar,{once:true}); else bar();
})();
