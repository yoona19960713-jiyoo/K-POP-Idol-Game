"use strict";
/* =====================================================================
   第二輪全面檢視(2026-10-28)的介面細節
   ・分頁列(.fac-tabs):放不下時才淡出邊緣,依捲動位置淡出左邊、右邊或兩邊;選中的分頁自動捲進畫面
   ===================================================================== */
(()=>{
const fitTabs=t=>{ const ov=t.scrollWidth>t.clientWidth+2, l=t.scrollLeft>2, r=t.scrollLeft+t.clientWidth<t.scrollWidth-2;
  t.dataset.ovl=ov?(l&&r?"lr":l?"l":r?"r":""):"" };
const showSel=t=>{ const b=t.querySelector('[aria-selected="true"],.on'); if(b&&t.scrollWidth>t.clientWidth+2){ const L=b.offsetLeft-t.offsetLeft, R=L+b.offsetWidth;
    if(L<t.scrollLeft+8) t.scrollLeft=Math.max(0,L-24); else if(R>t.scrollLeft+t.clientWidth-8) t.scrollLeft=R-t.clientWidth+24 } fitTabs(t) };
document.addEventListener("scroll",e=>{ if(e.target?.classList?.contains("fac-tabs")) fitTabs(e.target) },true);
document.addEventListener("click",e=>{ const t=e.target?.closest?.(".fac-tabs"); if(t) requestAnimationFrame(()=>showSel(t)) });
let q=false; const scan=()=>{ q=false; document.querySelectorAll(".fac-tabs").forEach(t=>{ if(t.offsetParent!==null) showSel(t) }) };
new MutationObserver(ms=>{ if(q) return; for(const m of ms){ if(m.target?.classList?.contains("fac-tabs")&&m.addedNodes.length){ q=true; requestAnimationFrame(scan); return }
    for(const n of m.addedNodes) if(n.nodeType===1&&(n.classList?.contains("fac-tabs")||n.querySelector?.(".fac-tabs"))){ q=true; requestAnimationFrame(scan); return } } })
  .observe(document.body,{childList:true,subtree:true});
addEventListener("resize",()=>requestAnimationFrame(scan));
})();
