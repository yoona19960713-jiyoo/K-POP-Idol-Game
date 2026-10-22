"use strict";
/* =====================================================================
   日常服立繪自動處理(取代原本交給 Claude 跑 outfit_face.py 的步驟)
   1. 日常類(練習、居家、外出、睡衣)生圖時請 OpenAI 直接給透明背景
      (萬一沒有透明,這裡用灰底挖除當備援)
   2. 收下後自動做換臉層:找出表情組在新圖上的位置,把六種表情的臉疊上去、膚色對齊
   3. 裁成跟表情組完全相同的框、高 1300,存進造型資料(members[欄位].sprites),同步到雲端
   遊戲換穿時會直接讀這些立繪(DYN),不用再上傳檔案到 GitHub
   ===================================================================== */
(()=>{
const EXS=["neutral","smile","laugh","sad","angry","shy"];
/* 表情組的裁切框(原圖座標)與臉部橢圓中心(裁切座標),與 outfit_face.py 相同 */
const CROP={yeseul:[480,1472],taeri:[450,1478],hiyori:[433,1461],haeun:[466,1486],haram:[460,1477]};
const FACE={yeseul:[258,133],taeri:[208,158],hiyori:[216,140],haeun:[235,151],haram:[200,168]};
const GUESS={haeun:[278,9],taeri:[289,9]};
const AXR=[56,50], FEATHER=14;

const loadImg=src=>new Promise((ok,no)=>{const i=new Image(); i.crossOrigin="anonymous"; i.onload=()=>ok(i); i.onerror=()=>no(new Error("圖片讀取失敗")); i.src=src});
function canvas(w,h){const c=document.createElement("canvas"); c.width=w; c.height=h; return c}
function gray(d,i){return d[i]*.299+d[i+1]*.587+d[i+2]*.114}

/* ---- 沒有透明背景時:從四邊開始把接近灰底的顏色挖掉 ---- */
function keyOut(ctx,W,H){
  const im=ctx.getImageData(0,0,W,H), d=im.data;
  const avg=pts=>{let r=0,g=0,b=0; for(const [x,y] of pts){const i=(y*W+x)*4; r+=d[i];g+=d[i+1];b+=d[i+2]} return [r/pts.length,g/pts.length,b/pts.length]};
  const T=avg([[4,4],[W-5,4],[W>>1,4],[4,H>>2],[W-5,H>>2]]), B=avg([[4,H-5],[W-5,H-5],[W>>1,H-5],[4,H-H/6|0],[W-5,H-H/6|0]]);  // 上方牆面與下方地面顏色不同
  const dist=i=>Math.min(Math.hypot(d[i]-T[0],d[i+1]-T[1],d[i+2]-T[2]),Math.hypot(d[i]-B[0],d[i+1]-B[1],d[i+2]-B[2]));
  const seen=new Uint8Array(W*H), q=new Int32Array(W*H); let qh=0,qt=0;
  const push=p=>{if(!seen[p]&&dist(p*4)<34){seen[p]=1;q[qt++]=p}};
  for(let x=0;x<W;x++){push(x);push((H-1)*W+x)} for(let y=0;y<H;y++){push(y*W);push(y*W+W-1)}
  while(qh<qt){const p=q[qh++],x=p%W,y=(p/W)|0; if(x>0)push(p-1); if(x<W-1)push(p+1); if(y>0)push(p-W); if(y<H-1)push(p+W)}
  const pocketY=H*.38|0;  // 頭髮縫隙裡被包住的底色(洪水填不到)也挖掉
  for(let p=0;p<W*H;p++){ const i=p*4; if(seen[p]){d[i+3]=0;continue} if(p<pocketY*W&&dist(i)<20){d[i+3]=0;continue}
    const t=dist(i); if(t<60){ // 邊緣半透明,減少灰邊
      let near=false; const x=p%W; if((x>0&&seen[p-1])||(x<W-1&&seen[p+1])||(p>=W&&seen[p-W])||(p<W*H-W&&seen[p+W])) near=true;
      if(near) d[i+3]=Math.round(255*Math.min(1,(t-34)/26)) } }
  ctx.putImageData(im,0,0);
}
function hasAlpha(ctx,W,H){const d=ctx.getImageData(0,0,W,8).data; let z=0; for(let i=3;i<d.length;i+=4) if(d[i]<20) z++; return z>W*2}

/* ---- 找出表情組裁切框在新圖上的位置(以臉附近的灰階比對) ---- */
function locate(oD,W,H,nD,cw,ch,face){
  const [fx,fy]=face, rx0=Math.max(0,fx-90), ry0=Math.max(0,fy-100), rx1=Math.min(cw,fx+90), ry1=Math.min(ch,fy+110);
  const pts=[]; for(let y=ry0;y<ry1;y+=3) for(let x=rx0;x<rx1;x+=3){const i=(y*cw+x)*4; if(nD[i+3]>200) pts.push([x,y,gray(nD,i)])}
  const ssd=(ox,oy,step)=>{let s=0,n=0; for(let k=0;k<pts.length;k+=step){const [x,y,g]=pts[k], X=x+ox, Y=y+oy; if(X<0||Y<0||X>=W||Y>=H) {s+=4000;n++;continue}
    const i=(Y*W+X)*4; const a=oD[i+3]; const v=a<128?255:gray(oD,i); s+=(v-g)*(v-g); n++} return s/Math.max(1,n)};
  let best=[0,0],bv=1e18; const cx=Math.round((W-cw)/2);
  for(let oy=-30;oy<=70;oy+=4) for(let ox=cx-160;ox<=cx+160;ox+=4){const v=ssd(ox,oy,4); if(v<bv){bv=v;best=[ox,oy]}}
  let [bx,by]=best; bv=1e18;
  for(let oy=by-5;oy<=by+5;oy++) for(let ox=bx-5;ox<=bx+5;ox++){const v=ssd(ox,oy,1); if(v<bv){bv=v;best=[ox,oy]}}
  return {x:best[0],y:best[1],err:bv};
}

/* ---- 主流程:一張造型圖 → 六張表情立繪 ---- */
async function makeSprites(mid,imgURL){
  const m=byId(mid), f=m.f, [cw,ch]=CROP[f], face=FACE[f];
  const oi=await loadImg(imgURL), W=oi.naturalWidth, H=oi.naturalHeight;
  const oc=canvas(W,H), ox=oc.getContext("2d",{willReadFrequently:true}); ox.drawImage(oi,0,0);
  let keyed=false; if(!hasAlpha(ox,W,H)){ keyOut(ox,W,H); keyed=true }
  const oD=ox.getImageData(0,0,W,H).data;
  // 表情組放大回原圖比例
  const ex={}; for(const e of EXS){ const im=await loadImg(`assets/chara/${f}_${e}.webp`); const c=canvas(cw,ch); c.getContext("2d").drawImage(im,0,0,cw,ch); ex[e]=c }
  const nD=ex.neutral.getContext("2d",{willReadFrequently:true}).getImageData(0,0,cw,ch).data;
  const pos=locate(oD,W,H,nD,cw,ch,face);
  // 羽化橢圓遮罩
  const [cx,cy]=face, ax=AXR[0], ay=AXR[1], mask=new Float32Array(cw*ch);
  for(let y=Math.max(0,cy-ay-FEATHER);y<Math.min(ch,cy+ay+FEATHER);y++) for(let x=Math.max(0,cx-ax-FEATHER);x<Math.min(cw,cx+ax+FEATHER);x++){
    const dn=Math.hypot((x-cx)/ax,(y-cy)/ay), edge=(dn-1)*Math.min(ax,ay); mask[y*cw+x]=edge<=-FEATHER?1:edge>=FEATHER?0:.5-.5*Math.sin(Math.PI*edge/(2*FEATHER)) }
  // 造型圖裁成表情組的框
  const base=canvas(cw,ch), bx=base.getContext("2d",{willReadFrequently:true}); bx.drawImage(oc,-pos.x,-pos.y);
  const bD=bx.getImageData(0,0,cw,ch);
  // 膚色對齊用:遮罩中心區、夠亮的像素
  const skin=(D)=>{let r=0,g=0,b=0,n=0; for(let p=0;p<cw*ch;p++){ if(mask[p]<.8) continue; const i=p*4; if(D[i+3]<200) continue; const L=gray(D,i); if(L<150) continue; r+=D[i];g+=D[i+1];b+=D[i+2];n++} return n?[r/n,g/n,b/n]:null};
  const sB=skin(bD.data), out={};
  const H2=1300, W2=Math.round(cw*H2/ch);
  for(const e of EXS){
    const eD=ex[e].getContext("2d",{willReadFrequently:true}).getImageData(0,0,cw,ch).data, sE=skin(eD), sh=sB&&sE?[sB[0]-sE[0],sB[1]-sE[1],sB[2]-sE[2]]:[0,0,0];
    const res=new ImageData(new Uint8ClampedArray(bD.data),cw,ch), R=res.data;
    for(let p=0;p<cw*ch;p++){ const a=mask[p]; if(!a) continue; const i=p*4; if(eD[i+3]<10) continue; const k=a*eD[i+3]/255;
      for(let c=0;c<3;c++) R[i+c]=R[i+c]*(1-k)+Math.max(0,Math.min(255,eD[i+c]+sh[c]))*k }
    const c1=canvas(cw,ch); c1.getContext("2d").putImageData(res,0,0);
    const c2=canvas(W2,H2), x2=c2.getContext("2d"); x2.imageSmoothingQuality="high"; x2.drawImage(c1,0,0,W2,H2);
    let u=c2.toDataURL("image/webp",.86); if(!u.startsWith("data:image/webp")) u=c2.toDataURL("image/png"); out[e]=u }
  return {sprites:out,pos,keyed,err:pos.err};
}

/* ---- 遊戲讀取:DYN[code@mid][表情] = 物件網址 ---- */
const DYN={}, LOADING=new Set(); window.DYN=DYN;
function toBlobURL(u){const [h,b]=u.split(","),mime=h.match(/:(.*?);/)[1],bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([a],{type:mime}))}
let rT=0; const rerender=()=>{clearTimeout(rT); rT=setTimeout(()=>{try{renderAll()}catch(e){}},300)};
window.needDyn=(code,mid)=>{ const k=code+"@"+mid; if(DYN[k]||LOADING.has(k)) return; LOADING.add(k);
  (async()=>{ const slot=Object.keys(WMEM).find(s=>WMEM[s]===mid); const sp=ITEMS[code]?.members?.[slot]?.sprites; if(!sp) return;
    const o={}; for(const e of EXS){ const u=await getBlob(sp[e]); if(u) o[e]=toBlobURL(u) } if(o.neutral){DYN[k]=o; rerender()} })().finally(()=>LOADING.delete(k)) };

/* ---- 造型室用:處理一套的某位成員 ---- */
window.processSprites=async(code,slot,opts={})=>{
  const lk=JSON.parse(JSON.stringify(ITEMS[code]||{})), mid=WMEM[slot]; if(!lk.code||!mid) throw new Error("找不到這套造型");
  const src=await getBlob(lk.members?.[slot]?.img); if(!src) throw new Error("這位成員還沒有圖");
  const r=await makeSprites(mid,src);
  lk.members[slot].sprites=r.sprites; lk.members[slot].spriteAt=Date.now(); lk.updatedAt=Date.now();
  const k=code+"@"+mid; DYN[k]=Object.fromEntries(Object.entries(r.sprites).map(([e,u])=>[e,toBlobURL(u)]));
  const ok=await saveDoc("items",lk); ensureWear(true); rerender();
  return {...r,ok};
};
window.SPRITE_FACE=FACE;
})();
