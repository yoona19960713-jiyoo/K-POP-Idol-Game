"use strict";
/* =====================================================================
   日常服立繪自動處理(取代原本交給 Claude 跑 outfit_face.py 的步驟)
   1. 日常類跟舞台類一樣用 gpt-image-2、淺灰底;收下時由遊戲從邊緣去背
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

/* ---- 去背:gpt-image-2 只能給淺灰底,由遊戲從四邊往內做連通填充 ----
   只挖跟外框相連的灰底(不對全圖做顏色鍵,白色或淺灰的衣服不會被挖掉);
   底色依上下邊緣取樣做漸層;填充只能沿著平滑的顏色前進,碰到線稿或衣服邊緣就停;
   被頭髮或身體包住、面積小、顏色很接近底色的灰塊做第二輪清除;邊緣 1~2 px 半透明並去灰邊 */
function keyOut(ctx,W,H){
  const im=ctx.getImageData(0,0,W,H), d=im.data;
  const px=(x,y)=>{const i=(y*W+x)*4; return [d[i],d[i+1],d[i+2]]};
  const mean=a=>{const s=[0,0,0]; for(const c of a){s[0]+=c[0];s[1]+=c[1];s[2]+=c[2]} return s.map(v=>v/a.length)};
  const top=[],bot=[]; for(let x=2;x<W-2;x+=8){top.push(px(x,2)); bot.push(px(x,H-3))}
  for(let y=2;y<H*.5;y+=8){top.push(px(2,y),px(W-3,y))} for(let y=Math.floor(H*.8);y<H-2;y+=8){bot.push(px(2,y),px(W-3,y))}
  const T=mean(top), B=mean(bot);
  // 每一列的底色:取該列左右兩側邊緣的平均(上下 ±6 列平滑),牆面到地面的漸層也跟得上
  const raw=[]; for(let y=0;y<H;y++){ const a=[]; for(const x of [2,5,8,W-3,W-6,W-9]) a.push(px(x,y)); raw.push(mean(a)) }
  const ROW=raw.map((_,y)=>{const a=[]; for(let k=-6;k<=6;k++){const yy=Math.min(H-1,Math.max(0,y+k)); a.push(raw[yy])} return mean(a)});
  const dist=p=>{const i=p*4,b=ROW[(p/W)|0]; return Math.hypot(d[i]-b[0],d[i+1]-b[1],d[i+2]-b[2])};
  // 容許度依邊緣雜訊決定
  const ed=[...top.map(c=>Math.hypot(c[0]-T[0],c[1]-T[1],c[2]-T[2])),...bot.map(c=>Math.hypot(c[0]-B[0],c[1]-B[1],c[2]-B[2]))].sort((a,b)=>a-b);
  const TOL=Math.max(12,Math.min(26,ed[Math.floor(ed.length*.9)]*1.6+8)), STEP=9;
  const bg=new Uint8Array(W*H), q=new Int32Array(W*H); let qh=0,qt=0;
  const step=(a,b)=>{const i=a*4,j=b*4; return Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2])};
  for(let x=0;x<W;x++) for(const p of [x,(H-1)*W+x]) if(!bg[p]&&dist(p)<TOL){bg[p]=1;q[qt++]=p}
  for(let y=0;y<H;y++) for(const p of [y*W,y*W+W-1]) if(!bg[p]&&dist(p)<TOL){bg[p]=1;q[qt++]=p}
  // 腳下的影子:地面區域裡、比底色暗一些、幾乎沒有彩度的灰,沿著平滑的顏色一起挖掉
  const FLOOR=Math.floor(H*.8);
  const shadow=n=>{ if(n<FLOOR*W) return false; const i=n*4,b=ROW[(n/W)|0]; const L=(d[i]+d[i+1]+d[i+2])/3, bL=(b[0]+b[1]+b[2])/3;
    const ch=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]); return L<=bL+4&&L>bL-95&&ch<22 };
  while(qh<qt){const p=q[qh++],x=p%W; for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(n<0||n>=W*H||bg[n]) continue;
    if((dist(n)<TOL||shadow(n))&&step(p,n)<STEP*3){bg[n]=1;q[qt++]=n} } }
  // 第二輪:被包住的小灰塊
  // 小塊直接清;大一點的(例如兩腿之間)要整塊都跟底色幾乎一樣才清,避免挖到淺灰的衣服
  const seen=new Uint8Array(W*H); const SMALL=Math.round(W*H*.0016), BIG=Math.round(W*H*.03);
  for(let s0=0;s0<W*H;s0++){ if(bg[s0]||seen[s0]||dist(s0)>=TOL*.75) continue;
    const comp=[s0]; seen[s0]=1; let k=0, sum=0;
    while(k<comp.length){const p=comp[k++],x=p%W; sum+=dist(p); for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(n<0||n>=W*H||seen[n]||bg[n]) continue; if(dist(n)<TOL*.75){seen[n]=1;comp.push(n)} } }
    const avg=sum/comp.length;
    if(comp.length<=SMALL||(comp.length<=BIG&&avg<TOL*.4)) for(const p of comp) bg[p]=1 }
  // 邊緣:半透明過渡與去灰邊
  for(let p=0;p<W*H;p++){ const i=p*4; if(bg[p]){d[i+3]=0;continue}
    const x=p%W; let edge=0; for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W,x>1?p-2:-1,x<W-2?p+2:-1,p-2*W,p+2*W]) if(n>=0&&n<W*H&&bg[n]){edge++}
    if(!edge) continue;
    const t=dist(p), a=Math.max(.15,Math.min(1,(t-TOL*.5)/(TOL*1.5)));
    const b=ROW[(p/W)|0]; for(let c=0;c<3;c++) d[i+c]=Math.max(0,Math.min(255,(d[i+c]-(1-a)*b[c])/a));
    d[i+3]=Math.round(255*a) }
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
window.SPRITE_FACE=FACE; window.__keyOut=keyOut;
})();
