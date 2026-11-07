/* 2.0 第六個大腦:遊戲風格的選單(取代手機原生的下拉選單,少一點網頁感)
   #stage 裡的 <select> 不直接打開(CSS pointer-events:none);點到它的位置時開遊戲自己的選單卡,選好寫回 select.value、觸發 input/change,
   各功能原本的程式照舊。返回鍵先關這張卡(game.js 的 steps)。 */
(()=>{
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let CUR=null;
function labelOf(sel){ const a=sel.getAttribute("aria-label")||sel.title; if(a) return a;
  const l=sel.id?document.querySelector(`label[for="${sel.id}"]`):null; if(l&&l.textContent.trim()) return l.textContent.trim();
  for(let p=sel.previousElementSibling,i=0;p&&i<3;p=p.previousElementSibling,i++){ if(p.matches("select,input,button,textarea")) continue; const t=p.textContent.trim(); if(t&&t.length<=14) return t }
  const own=sel.parentElement&&[...sel.parentElement.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join("").trim();
  return own&&own.length<=14?own:"選擇" }
function close(){ if(!CUR) return; const el=CUR.el; CUR=null; el.classList.add("out"); setTimeout(()=>el.remove(),170) }
function open(sel){ close(); const st=document.querySelector("#stage"); if(!st) return;
  const items=[]; for(const ch of sel.children){ if(ch.tagName==="OPTGROUP"){ items.push({g:ch.label}); for(const o of ch.children) items.push({o}) } else if(ch.tagName==="OPTION") items.push({o:ch}) }
  const n=items.filter(x=>x.o&&!x.o.hidden).length, cols=n>16?3:n>6?2:1;
  const el=document.createElement("div"); el.className="gpk";
  el.innerHTML=`<div class="gpk-card" style="--cols:${cols}"><div class="gpk-hd"><b>${esc(labelOf(sel))}</b><button class="gpk-x" aria-label="關閉">✕</button></div>
    <div class="gpk-list" role="listbox">${items.map((x,i)=>x.g!=null?`<h5>${esc(x.g)}</h5>`:x.o.hidden?"":`<button class="gpk-o${x.o.selected?" on":""}" role="option" data-i="${i}"${x.o.disabled?" disabled":""}>${esc(x.o.textContent.trim())}</button>`).join("")}</div></div>`;
  st.appendChild(el); CUR={el,sel}; window.sfx?.("tap");
  el.addEventListener("click",e=>{ e.stopPropagation(); const b=e.target.closest(".gpk-o");
    if(b&&!b.disabled){ const o=items[+b.dataset.i].o; window.feedback?.("s"); if(sel.value!==o.value){ sel.value=o.value; sel.dispatchEvent(new Event("input",{bubbles:true})); sel.dispatchEvent(new Event("change",{bubbles:true})) } close(); return }
    if(e.target===el||e.target.closest(".gpk-x")) close() });
  requestAnimationFrame(()=>{ const on=el.querySelector(".gpk-o.on"); if(on){ const L=el.querySelector(".gpk-list"); L.scrollTop=on.offsetTop-L.clientHeight/2+on.offsetHeight/2 } }) }
document.addEventListener("click",e=>{ if(CUR) return; const st=document.querySelector("#stage"); if(!st||!st.contains(e.target)) return;
  const x=e.clientX,y=e.clientY;
  for(const s of st.querySelectorAll("select")){ if(s.disabled||!s.offsetParent) continue; const r=s.getBoundingClientRect();
    if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){ e.preventDefault(); e.stopPropagation(); open(s); return } } },true);
document.addEventListener("keydown",e=>{ const s=e.target; if(!CUR&&s?.tagName==="SELECT"&&s.closest("#stage")&&(e.key==="Enter"||e.key===" ")){ e.preventDefault(); open(s) } });
window.gpkBusy=()=>!!CUR&&!CUR.el.classList.contains('out'); window.gpkClose=()=>{ if(!CUR) return false; close(); return true }; window.gpkOpen=open;
})();
