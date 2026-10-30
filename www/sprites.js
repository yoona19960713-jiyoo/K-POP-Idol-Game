"use strict";
/* =====================================================================
   日常服立繪自動處理(取代原本交給 Claude 跑 outfit_face.py 的步驟)
   1. 日常類跟舞台類一樣用 gpt-image-2、淺灰底;收下時由遊戲從邊緣去背
   2. 收下後自動做換臉層:找出表情組在新圖上的位置,把六種表情的臉疊上去、膚色對齊
   3. 裁成跟表情組完全相同的框、原生解析度(約 1480 高),存進造型資料(members[欄位].sprites),同步到雲端
   遊戲換穿時會直接讀這些立繪(DYN),不用再上傳檔案到 GitHub
   ===================================================================== */
(()=>{
const EXS=["neutral","smile","laugh","sad","angry","shy","tired","surprise","pout","moved","serious","wink"];
/* 表情組的裁切框(原圖座標)與臉部橢圓中心(裁切座標),與 outfit_face.py 相同 */
const CROP={yeseul:[480,1472],taeri:[450,1478],hiyori:[433,1461],haeun:[466,1486],haram:[460,1477]};
const FACE={yeseul:[258,133],taeri:[208,158],hiyori:[216,140],haeun:[235,151],haram:[200,168]};
const AXR=[56,50], FEATHER=14;
/* 臉的框(1 倍座標)與羽化遮罩:表情之間只有這一塊不同(省空間的頭部小圖就存這一塊,遊戲讀的時候疊回 neutral) */
function faceBox(f,cw,ch){ const [cx,cy]=FACE[f], ax=AXR[0], ay=AXR[1]; return {x0:Math.max(0,cx-ax-FEATHER),y0:Math.max(0,cy-ay-FEATHER),x1:Math.min(cw,cx+ax+FEATHER),y1:Math.min(ch,cy+ay+FEATHER)} }
function maskAt(f,x,y){ const [cx,cy]=FACE[f], ax=AXR[0], ay=AXR[1], dn=Math.hypot((x-cx)/ax,(y-cy)/ay), edge=(dn-1)*Math.min(ax,ay); return edge<=-FEATHER?1:edge>=FEATHER?0:.5-.5*Math.sin(Math.PI*edge/(2*FEATHER)) }
/* 從一張表情全身圖切出臉部小圖(透明度乘上羽化遮罩);K = 倍數、pad = 左右留邊(1 倍) */
function facePatch(img,f,K,pad){ const cw=CROP[f][0], ch=CROP[f][1], b=faceBox(f,cw,ch), X=(pad+b.x0)*K, Y=b.y0*K, W=(b.x1-b.x0)*K, H=(b.y1-b.y0)*K;
  const c=canvas(W,H), x=c.getContext("2d",{willReadFrequently:true}); x.drawImage(img,-X,-Y); const d=x.getImageData(0,0,W,H), D=d.data;
  for(let yy=0;yy<H;yy++) for(let xx=0;xx<W;xx++){ const a=maskAt(f,b.x0+xx/K,b.y0+yy/K); D[(yy*W+xx)*4+3]=Math.round(D[(yy*W+xx)*4+3]*a) }
  x.putImageData(d,0,0); let u=c.toDataURL("image/webp",.92); if(!u.startsWith("data:image/webp")) u=c.toDataURL("image/png"); return {u,at:[X,Y]} }

const loadImg=src=>new Promise((ok,no)=>{const i=new Image(); i.crossOrigin="anonymous"; i.onload=()=>ok(i); i.onerror=()=>no(new Error("圖片讀取失敗")); i.src=src});
function canvas(w,h){const c=document.createElement("canvas"); c.width=w; c.height=h; return c}
function gray(d,i){return d[i]*.299+d[i+1]*.587+d[i+2]*.114}

/* ---- 去背 v2(2026-10-24,取代舊版只從四邊填充的做法):灰底 → 透明 ----
   1. 從四邊做連通填充,先找出確定的底色
   2. 用確定的底色擬合一張平滑的「底色圖」B(x,y)(粗格平均+擴散補洞),人物背後、頭髮縫裡的底色也估得準
   3. 用 B(x,y) 重新填充;被頭髮或手臂包住、跟底色幾乎一樣而且很平的灰塊一併清掉
   4. 邊緣做摳像:用內側的前景色與 B 算出每個邊緣像素的透明度,並把灰色從顏色裡扣掉(去灰邊) */
function keyOut2(ctx,W,H){
  const im=ctx.getImageData(0,0,W,H), d=im.data, N=W*H;
  const at=(x,y)=>(y*W+x)*4;
  // ---- 1. 初始底色:每列左右邊緣的平均(上下平滑),跟舊版相同 ----
  const raw=new Float32Array(H*3);
  for(let y=0;y<H;y++){let r=0,g=0,b=0; for(const x of [2,5,8,W-3,W-6,W-9]){const i=at(x,y); r+=d[i];g+=d[i+1];b+=d[i+2]} raw[y*3]=r/6;raw[y*3+1]=g/6;raw[y*3+2]=b/6}
  const R0=new Float32Array(H*3); for(let y=0;y<H;y++) for(let c=0;c<3;c++){let s=0,n=0; for(let k=-6;k<=6;k++){const yy=Math.min(H-1,Math.max(0,y+k)); s+=raw[yy*3+c]; n++} R0[y*3+c]=s/n}
  let Bf=null; // 平滑底色圖(第 2 步之後才有)
  const bgc=(p,c)=>Bf?Bf[p*3+c]:R0[((p/W)|0)*3+c];
  const dist=p=>{const i=p*4; return Math.hypot(d[i]-bgc(p,0),d[i+1]-bgc(p,1),d[i+2]-bgc(p,2))};
  const ed=[]; for(let x=2;x<W-2;x+=8) for(const y of [2,H-3]){ed.push(dist(y*W+x))} for(let y=2;y<H-2;y+=8) for(const x of [2,W-3]){ed.push(dist(y*W+x))}
  ed.sort((a,b)=>a-b);
  const TOL=Math.max(12,Math.min(26,ed[Math.floor(ed.length*.9)]*1.6+8)), STEP=27;
  const step=(a,b)=>{const i=a*4,j=b*4; return Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2])};
  const FLOOR=Math.floor(H*.8);
  const shadow=n=>{ if(n<FLOOR*W) return false; const i=n*4; const L=(d[i]+d[i+1]+d[i+2])/3, bL=(bgc(n,0)+bgc(n,1)+bgc(n,2))/3;
    const ch=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]); return L<=bL+4&&L>bL-95&&ch<22 };
  const fill=(tol)=>{ const bg=new Uint8Array(N), q=new Int32Array(N); let qh=0,qt=0;
    const seed=p=>{if(!bg[p]&&dist(p)<tol){bg[p]=1;q[qt++]=p}};
    for(let x=0;x<W;x++){seed(x);seed((H-1)*W+x)} for(let y=0;y<H;y++){seed(y*W);seed(y*W+W-1)}
    while(qh<qt){const p=q[qh++],x=p%W; for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(n<0||n>=N||bg[n]) continue;
      if((dist(n)<tol||shadow(n))&&step(p,n)<STEP){bg[n]=1;q[qt++]=n} } }
    return bg };
  let bg=fill(TOL);
  // ---- 2. 平滑底色圖:粗格平均,沒有底色的格子用擴散補起來,再雙線性放大 ----
  const CS=24, GW=Math.ceil(W/CS), GH=Math.ceil(H/CS), G=new Float32Array(GW*GH*3), GN=new Float32Array(GW*GH);
  for(let y=0;y<H;y+=2) for(let x=0;x<W;x+=2){const p=y*W+x; if(!bg[p]) continue; const g=((y/CS)|0)*GW+((x/CS)|0), i=p*4; G[g*3]+=d[i];G[g*3+1]+=d[i+1];G[g*3+2]+=d[i+2];GN[g]++}
  const known=new Uint8Array(GW*GH); for(let g=0;g<GW*GH;g++) if(GN[g]>CS*CS/4*.25){for(let c=0;c<3;c++) G[g*3+c]/=GN[g]; known[g]=1} else {G[g*3]=G[g*3+1]=G[g*3+2]=0}
  // 未知格先填列平均,再反覆用鄰格平均擴散
  for(let gy=0;gy<GH;gy++) for(let gx=0;gx<GW;gx++){const g=gy*GW+gx; if(known[g]) continue; const y=Math.min(H-1,gy*CS+CS/2|0); for(let c=0;c<3;c++) G[g*3+c]=R0[y*3+c]}
  for(let it=0;it<160;it++) for(let gy=0;gy<GH;gy++) for(let gx=0;gx<GW;gx++){const g=gy*GW+gx; if(known[g]) continue;
    for(let c=0;c<3;c++){let s=0,n=0; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=gx+dx,yy=gy+dy; if(xx<0||yy<0||xx>=GW||yy>=GH) continue; s+=G[(yy*GW+xx)*3+c]; n++} G[g*3+c]=s/n}}
  Bf=new Float32Array(N*3);
  for(let y=0;y<H;y++){const fy=Math.min(GH-1.001,Math.max(0,y/CS-.5)), y0=fy|0, ty=fy-y0;
    for(let x=0;x<W;x++){const fx=Math.min(GW-1.001,Math.max(0,x/CS-.5)), x0=fx|0, tx=fx-x0, p=y*W+x;
      for(let c=0;c<3;c++){const a=G[(y0*GW+x0)*3+c],b=G[(y0*GW+x0+1)*3+c],e=G[((y0+1)*GW+x0)*3+c],f=G[((y0+1)*GW+x0+1)*3+c];
        Bf[p*3+c]=(a*(1-tx)+b*tx)*(1-ty)+(e*(1-tx)+f*tx)*ty}}}
  // ---- 3. 用新的底色圖重新填充,再清被包住的灰塊 ----
  bg=fill(TOL);
  const gradAt=p=>{const x=p%W; let s=0,n=0; for(const q of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(q<0||q>=N) continue; s+=step(p,q); n++} return n?s/n:0};
  const seen=new Uint8Array(N), SMALL=Math.round(N*.0016), BIG=Math.round(N*.04);
  for(let s0=0;s0<N;s0++){ if(bg[s0]||seen[s0]||dist(s0)>=TOL*.8) continue;
    const comp=[s0]; seen[s0]=1; let k=0, sum=0, gs=0;
    while(k<comp.length){const p=comp[k++],x=p%W; sum+=dist(p); gs+=gradAt(p); for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(n<0||n>=N||seen[n]||bg[n]) continue; if(dist(n)<TOL*.8){seen[n]=1;comp.push(n)} } }
    const avg=sum/comp.length, flat=gs/comp.length;
    if(comp.length<=SMALL&&avg<TOL*.6 || comp.length<=BIG&&avg<Math.min(9,TOL*.45)&&flat<7) for(const p of comp) bg[p]=1 }
  // ---- 3b. 輪廓附近(離外面的底色 36px 內)跟底色幾乎一樣、沒什麼彩度、很平的像素也是底色:頭髮縫、髮尾和脖子之間 ----
  for(let pass=0;pass<2;pass++){
    const dd=new Uint8Array(N).fill(255), qq=new Int32Array(N); let h0=0,t0=0;
    for(let p=0;p<N;p++) if(bg[p]){dd[p]=0;qq[t0++]=p}
    while(h0<t0){const p=qq[h0++],x=p%W; for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(n<0||n>=N||dd[n]!==255) continue; dd[n]=dd[p]+1; if(dd[n]<36) qq[t0++]=n } }
    let added=0;
    for(let p=0;p<N;p++){ if(bg[p]||dd[p]>36) continue; const i=p*4;
      const ch=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);
      if(dist(p)<TOL*.85&&ch<20&&gradAt(p)<12){bg[p]=1;added++} }
    if(!added) break }
  // ---- 4. 邊緣摳像:輪廓 36px 內、顏色介於底色與前景之間的像素(邊緣、髮絲之間透出的底色)
  //      用附近「確定是前景」的顏色 F 與底色 B 投影出透明度,並把灰色從顏色裡扣掉 ----
  const dt=new Uint8Array(N).fill(255), q=new Int32Array(N); let qh=0,qt=0;
  for(let p=0;p<N;p++) if(bg[p]){dt[p]=0;q[qt++]=p}
  while(qh<qt){const p=q[qh++],x=p%W; for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]){ if(n<0||n>=N||dt[n]!==255) continue; dt[n]=dt[p]+1; if(dt[n]<36) q[qt++]=n } }
  const out=new Uint8ClampedArray(d), SURE=Math.max(46,TOL*2.4);
  const sure=n=>!bg[n]&&dist(n)>SURE;
  for(let p=0;p<N;p++){ const i=p*4;
    if(bg[p]){ out[i+3]=0; continue }
    if(dt[p]>36) continue;
    const D=dist(p); if(D>=SURE) continue;
    const x=p%W, y=(p/W)|0; let fr=0,fg=0,fb=0,fn=0;
    for(let yy=Math.max(0,y-4);yy<=Math.min(H-1,y+4);yy++) for(let xx=Math.max(0,x-4);xx<=Math.min(W-1,x+4);xx++){const n=yy*W+xx; if(!sure(n)) continue; const j=n*4; fr+=d[j];fg+=d[j+1];fb+=d[j+2];fn++}
    const Br=bgc(p,0),Bg=bgc(p,1),Bb=bgc(p,2), cr=d[i]-Br,cg=d[i+1]-Bg,cb=d[i+2]-Bb;
    let a=1;
    if(fn){ const fR=fr/fn,fG=fg/fn,fB=fb/fn, Fr=fR-Br,Fg=fG-Bg,Fb=fB-Bb, ff=Fr*Fr+Fg*Fg+Fb*Fb;
      // 深處只處理「頭髮類」前景(深色或彩度高);白T、淺色衣服的陰影跟灰底在同一條線上,分不出來,只在緊貼底色的 3px 內處理
      const hairy=(fR*.299+fG*.587+fB*.114)<125||(Math.max(fR,fG,fB)-Math.min(fR,fG,fB))>70;
      if(dt[p]>3&&!hairy) continue;
      if(ff>400){ a=(cr*Fr+cg*Fg+cb*Fb)/ff;
        const rr=Math.hypot(cr-a*Fr,cg-a*Fg,cb-a*Fb); if(rr>28||a<-.1) a=dt[p]<=3?(D-TOL*.35)/(TOL*1.1):1 }   // 不在「底色↔前景」連線上:是前景本身的陰影,不是混色
      else if(dt[p]<=3) a=(D-TOL*.35)/(TOL*1.1) }
    else if(dt[p]<=3) a=(D-TOL*.35)/(TOL*1.1);
    a=Math.max(0,Math.min(1,a)); if(a<.06) a=0;
    if(a>0&&a<1){ out[i]=Br+cr/a; out[i+1]=Bg+cg/a; out[i+2]=Bb+cb/a }
    out[i+3]=Math.round(255*a) }
  // 底色那側緊貼前景的 1px:細髮絲常常只蓋住半格,也算一次
  for(let p=0;p<N;p++){ if(!bg[p]) continue; const i=p*4, x=p%W; let nb=false; for(const n of [x>0?p-1:-1,x<W-1?p+1:-1,p-W,p+W]) if(n>=0&&n<N&&!bg[n]&&dt[n]===1){nb=true;break}
    if(!nb) continue; const D=dist(p); if(D<TOL*.6) continue; const a=Math.min(.6,(D-TOL*.6)/(TOL*2)); if(a<.06) continue;
    const Br=bgc(p,0),Bg=bgc(p,1),Bb=bgc(p,2); out[i]=Br+(d[i]-Br)/a; out[i+1]=Bg+(d[i+1]-Bg)/a; out[i+2]=Bb+(d[i+2]-Bb)/a; out[i+3]=Math.round(255*a) }
  im.data.set(out); ctx.putImageData(im,0,0);
  return Bf;
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

/* ---- 用「沒換衣服的底模」的精準去背當基準(2026-10-24) ----
   造型圖是從姿勢底模改出來的:頭、頭髮、手腳的位置與畫法都一樣,只有衣服不同。
   底模已經先用專門的動畫去背模型(isnet-anime)做好遮罩:站姿用表情組本身,其他姿勢用 assets/pose/cut/成員_姿勢.webp。
   每個像素比對造型圖與底模:顏色一樣 → 同一張畫,用底模的透明度(髮絲、手臂邊緣都乾淨);
   顏色不同 → 衣服變了,用遊戲自己的去背;底模那裡沒有人、造型圖又是灰底或影子 → 清掉 */
async function fuseWithPrior(B,rawD,Bf,W,H,pos,cw,ch,f,face,pose,nD){
  let P=nD;   // 站姿:表情組(與造型圖同一個裁切框)
  if(pose&&pose!=="stand"&&POSE_CUT(f,pose)){
    try{ const [pi,mi]=await Promise.all([loadImg(`assets/pose/${f}_${pose}.webp`),loadImg(`assets/pose/cut/${f}_${pose}.webp`)]);
      const w=pi.naturalWidth,h=pi.naturalHeight, c=canvas(w,h), x=c.getContext("2d",{willReadFrequently:true});
      x.drawImage(mi,0,0); const md=x.getImageData(0,0,w,h).data; x.drawImage(pi,0,0); const id=x.getImageData(0,0,w,h);
      for(let i=0;i<md.length;i+=4) id.data[i+3]=md[i]; x.putImageData(id,0,0);
      const pp=locate(id.data,w,h,nD,cw,ch,face), c2=canvas(cw,ch), x2=c2.getContext("2d",{willReadFrequently:true});
      x2.drawImage(c,-pp.x,-pp.y); P=x2.getImageData(0,0,cw,ch).data }catch(e){ P=nD } }
  for(let y=0;y<ch;y++){ const Y=y+pos.y; for(let x=0;x<cw;x++){ const X=x+pos.x, i=(y*cw+x)*4;
    if(X<0||Y<0||X>=W||Y>=H){B[i+3]=0;continue}
    const q=Y*W+X, j=q*4, r=rawD[j],g=rawD[j+1],b=rawD[j+2], br=Bf[q*3],bg=Bf[q*3+1],bb=Bf[q*3+2];
    const db=Math.hypot(r-br,g-bg,b-bb), chr=Math.max(r,g,b)-Math.min(r,g,b), L=(r+g+b)/3, bL=(br+bg+bb)/3;
    const bgLike=(db<30&&chr<18)||(chr<14&&L<bL+6&&L>bL-70);          // 灰底或灰色影子
    const Pa=P[i+3], diff=Math.abs(r-P[i])+Math.abs(g-P[i+1])+Math.abs(b-P[i+2]);
    let a, cr=B[i],cg=B[i+1],cb=B[i+2];
    if(Pa>=8&&diff<45){ a=Pa; cr=r;cg=g;cb=b;                        // 同一張畫:用底模的透明度,並扣掉邊緣的灰
      if(a<250){const k=a/255; cr=br+(r-br)/k; cg=bg+(g-bg)/k; cb=bb+(b-bb)/k} }
    else if(Pa>=8){ a=bgLike?0:(B[i+3]>0?B[i+3]:(db>40?255:0)); if(a===255&&B[i+3]===0){cr=r;cg=g;cb=b} }   // 衣服變了
    else a=bgLike?0:B[i+3];                                            // 底模這裡沒有人:造型多出來的部分(裙擺等)
    B[i]=Math.max(0,Math.min(255,cr)); B[i+1]=Math.max(0,Math.min(255,cg)); B[i+2]=Math.max(0,Math.min(255,cb)); B[i+3]=a } }
}
const POSE_CUT=(f,pose)=>!!(window.POSE_ASSETS||{})[f+"_"+pose];

/* ---- 高品質去背(2026-10-29,免費):Hugging Face 的動漫人物去背模型 skytnt/anime-seg(ISNet,Apache-2.0,176 MB),
   在瀏覽器裡用 onnxruntime-web 跑(不送到任何伺服器、不花錢)。第一次會下載模型,存在瀏覽器的快取裡,之後不用再下載。
   模型給乾淨的人物輪廓(頭髮邊緣不會有碎點),邊緣的顏色再用灰底去背算出的底色場把灰色扣掉(不會有灰邊)。
   預設只在電腦上用(手機記憶體不夠、也比較慢);選單裡可以改。失敗就自動退回原本的去背 ---- */
const HQ_URL=window.HQ_TEST?.model||"https://huggingface.co/skytnt/anime-seg/resolve/main/isnetis.onnx", ORT_VER="1.20.1", ORT_CDN=window.HQ_TEST?.ort||`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VER}/dist/`;   // HQ_TEST:測試時改用本機檔案
const hqMode=()=>{ try{ return localStorage.getItem("kpopGame.hqcut")||"auto" }catch(e){ return "auto" } };
window.hqCutOn=()=>{ const m=hqMode(); if(m==="on") return true; if(m==="off") return false; return !window.isNative&&!/Android|iPhone|iPad/i.test(navigator.userAgent)&&(navigator.deviceMemory||8)>=4 };
let HQ_SESS=null, HQ_LOAD=null;
function loadScript(src){ return new Promise((ok,no)=>{ const s=document.createElement("script"); s.src=src; s.onload=ok; s.onerror=()=>no(new Error("載入失敗:"+src)); document.head.appendChild(s) }) }
async function hqSession(onProg){ if(HQ_SESS) return HQ_SESS; if(HQ_LOAD) return HQ_LOAD;
  HQ_LOAD=(async()=>{ if(!window.ort) await loadScript(ORT_CDN+"ort.min.js"); ort.env.wasm.wasmPaths=ORT_CDN; ort.env.wasm.numThreads=Math.min(4,navigator.hardwareConcurrency||2);
    let buf=null, cache=null; try{ cache=await caches.open("kpop-models"); const hit=await cache.match(HQ_URL); if(hit) buf=await hit.arrayBuffer() }catch(e){}
    if(!buf){ const r=await fetch(HQ_URL); if(!r.ok) throw new Error("模型下載失敗 "+r.status); const total=+r.headers.get("content-length")||176e6, rd=r.body.getReader(), parts=[]; let got=0;
      for(;;){ const {done,value}=await rd.read(); if(done) break; parts.push(value); got+=value.length; onProg?.(got/total) }
      const all=new Uint8Array(got); let o=0; for(const p of parts){ all.set(p,o); o+=p.length } buf=all.buffer;
      try{ await cache?.put(HQ_URL,new Response(all.slice(0),{headers:{"Content-Type":"application/octet-stream"}})) }catch(e){} }
    HQ_SESS=await ort.InferenceSession.create(buf,{executionProviders:["wasm"],graphOptimizationLevel:"all"}); return HQ_SESS })();
  try{ return await HQ_LOAD }catch(e){ HQ_LOAD=null; throw e } }
window.hqCutPrepare=hqSession;
/* 模型的人物遮罩(0~1),大小跟原圖一樣 */
async function hqMask(srcCanvas,W,H){ const sess=await hqSession(); const S=1024, c=canvas(S,S), x=c.getContext("2d",{willReadFrequently:true}); x.imageSmoothingQuality="high"; x.drawImage(srcCanvas,0,0,S,S);
  const d=x.getImageData(0,0,S,S).data, inp=new Float32Array(3*S*S), M=[.485,.456,.406];
  for(let i=0,p=0;p<S*S;p++,i+=4){ inp[p]=d[i]/255-M[0]; inp[S*S+p]=d[i+1]/255-M[1]; inp[2*S*S+p]=d[i+2]/255-M[2] }
  const out=await sess.run({[sess.inputNames[0]]:new ort.Tensor("float32",inp,[1,3,S,S])}), y=out[sess.outputNames[0]].data;
  let mn=Infinity,mx=-Infinity; for(let i=0;i<S*S;i++){ const v=y[i]; if(v<mn) mn=v; if(v>mx) mx=v }
  const mc=canvas(S,S), mx2=mc.getContext("2d",{willReadFrequently:true}), md=mx2.createImageData(S,S);
  for(let i=0;i<S*S;i++){ const v=(y[i]-mn)/(mx-mn+1e-8)*255; md.data[i*4]=md.data[i*4+1]=md.data[i*4+2]=255; md.data[i*4+3]=v }
  mx2.putImageData(md,0,0); const big=canvas(W,H), bx=big.getContext("2d",{willReadFrequently:true}); bx.imageSmoothingQuality="high"; bx.drawImage(mc,0,0,W,H);
  const bd=bx.getImageData(0,0,W,H).data, m=new Float32Array(W*H); for(let p=0;p<W*H;p++) m[p]=bd[p*4+3]/255; return m }
/* 用模型的遮罩重新合成:輪廓用模型的,邊緣的顏色扣掉灰底(底色場 Bf) */
function hqCompose(ox,W,H,rawD,Bf,m){ const im=ox.getImageData(0,0,W,H), o=im.data;
  for(let p=0;p<W*H;p++){ const i=p*4; let a=(m[p]-.12)/.76; a=a<0?0:a>1?1:a;
    if(a>=.999){ o[i]=rawD[i]; o[i+1]=rawD[i+1]; o[i+2]=rawD[i+2]; o[i+3]=255; continue }
    if(a<=0){ o[i+3]=0; continue } const k=Math.max(a,.05);
    for(let c=0;c<3;c++){ const B=Bf?Bf[p*3+c]:rawD[i+c]; o[i+c]=Math.max(0,Math.min(255,(rawD[i+c]-(1-a)*B)/k)) } o[i+3]=Math.round(a*255) }
  ox.putImageData(im,0,0) }

/* ---- 主流程:一張造型圖 → 六張表情立繪 ---- */
async function makeSprites(mid,imgURL,pose){
  const m=byId(mid), f=m.f, [cw,ch]=CROP[f], face=FACE[f];
  const oi=await loadImg(imgURL), W=oi.naturalWidth, H=oi.naturalHeight;
  const oc=canvas(W,H), ox=oc.getContext("2d",{willReadFrequently:true}); ox.drawImage(oi,0,0);
  const rawD=ox.getImageData(0,0,W,H).data.slice();       // 去背前的原色(邊緣用)
  let keyed=false, Bf=null, hq=false; if(!hasAlpha(ox,W,H)){ Bf=keyOut2(ox,W,H); keyed=true;
    if(window.hqCutOn()){ try{ const src=canvas(W,H); src.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(rawD),W,H),0,0); const m=await hqMask(src,W,H); hqCompose(ox,W,H,rawD,Bf,m); hq=true }catch(e){ window.logErr?.("高品質去背",e) } } }
  const oD=ox.getImageData(0,0,W,H).data;
  // 表情組放大回原圖比例
  const ex={}, exI={}; for(const e of EXS){ const im=await loadImg(`assets/chara/${f}_${e}.webp`); exI[e]=im; const c=canvas(cw,ch); c.getContext("2d").drawImage(im,0,0,cw,ch); ex[e]=c }
  const K=Math.max(1,Math.min(2,Math.round(exI.neutral.naturalHeight/ch)));   // 表情組是 2 倍高清時,換衣立繪也輸出 2 倍
  const nD=ex.neutral.getContext("2d",{willReadFrequently:true}).getImageData(0,0,cw,ch).data;
  const pos=locate(oD,W,H,nD,cw,ch,face);
  /* 手伸出表情組的框時(揮手、比手勢):左右各多留一樣寬的透明邊,把手完整留下來(2026-10-29 使用者回報手被切掉)。
     兩邊留一樣寬,立繪的中心不變,眨眼層、殘影層照原本的位置對得上;沒有伸出去的就跟以前一樣寬 */
  const PAD=(()=>{ const y0=Math.max(0,pos.y), y1=Math.min(H,pos.y+ch), cnt=new Uint16Array(W);
    for(let y=y0;y<y1;y+=2) for(let x=0;x<W;x++) if(oD[(y*W+x)*4+3]>60) cnt[x]++;
    let mn=-1,mx=-1; for(let x=0;x<W;x++) if(cnt[x]>=4){ if(mn<0) mn=x; mx=x }
    if(mn<0) return 0; const over=Math.max(pos.x-mn,(mx+1)-(pos.x+cw)); return over>4?Math.min(Math.round(cw*.8),over+12):0 })();
  // 羽化橢圓遮罩
  const [cx,cy]=face, ax=AXR[0], ay=AXR[1], mask=new Float32Array(cw*ch);
  for(let y=Math.max(0,cy-ay-FEATHER);y<Math.min(ch,cy+ay+FEATHER);y++) for(let x=Math.max(0,cx-ax-FEATHER);x<Math.min(cw,cx+ax+FEATHER);x++){
    const dn=Math.hypot((x-cx)/ax,(y-cy)/ay), edge=(dn-1)*Math.min(ax,ay); mask[y*cw+x]=edge<=-FEATHER?1:edge>=FEATHER?0:.5-.5*Math.sin(Math.PI*edge/(2*FEATHER)) }
  // 造型圖裁成表情組的框
  const base=canvas(cw,ch), bx=base.getContext("2d",{willReadFrequently:true}); bx.drawImage(oc,-pos.x,-pos.y);
  const bD=bx.getImageData(0,0,cw,ch);
  if(keyed) await fuseWithPrior(bD.data,rawD,Bf,W,H,pos,cw,ch,f,face,pose,nD);
  // 膚色對齊用:遮罩中心區、夠亮的像素
  const skin=(D)=>{let r=0,g=0,b=0,n=0; for(let p=0;p<cw*ch;p++){ if(mask[p]<.8) continue; const i=p*4; if(D[i+3]<200) continue; const L=gray(D,i); if(L<150) continue; r+=D[i];g+=D[i+1];b+=D[i+2];n++} return n?[r/n,g/n,b/n]:null};
  const sB=skin(bD.data), out={}, faces={}; let fat=null;
  /* 省雲端空間(2026-10-30):表情之間只有臉不同,其他表情只存臉的那一塊(羽化邊),遊戲讀的時候疊回 neutral;頭髮一律用 neutral 的(換表情時頭髮不會跳動) */
  const H2=ch*K, W2=cw*K;   // 2 倍:身體由造型圖平滑放大,臉再用高清表情組重疊一次,臉部跟白 T 立繪一樣清楚
  const fy0=Math.max(0,cy-ay-FEATHER), fy1=Math.min(ch,cy+ay+FEATHER), fx0=Math.max(0,cx-ax-FEATHER), fx1=Math.min(cw,cx+ax+FEATHER);
  for(const e of EXS){
    const eD=ex[e].getContext("2d",{willReadFrequently:true}).getImageData(0,0,cw,ch).data, sE=skin(eD), sh=sB&&sE?[sB[0]-sE[0],sB[1]-sE[1],sB[2]-sE[2]]:[0,0,0];
    const res=new ImageData(new Uint8ClampedArray(bD.data),cw,ch), R=res.data;
    // 頭部(頭髮)邊緣:姿勢底模的頭完全不動,跟表情組是同一張畫;顏色一致的像素直接用表情組的顏色與透明度(去背品質最好),
    // 顏色不一樣的(耳環、髮飾等造型自己的東西,或對位差一點)保留造型圖。往下 40px 漸變回造型圖自己的去背
    const HY=face[1]+150;
    for(let y=0;y<Math.min(ch,HY+20);y++){ const w=y<HY-20?1:(HY+20-y)/40; for(let x=0;x<cw;x++){ const p=y*cw+x, i=p*4;
      if(mask[p]>=.999) continue; const ea=eD[i+3], ba=R[i+3]; if(ea<8&&ba<8) continue;
      const diff=Math.abs(R[i]-eD[i])+Math.abs(R[i+1]-eD[i+1])+Math.abs(R[i+2]-eD[i+2]);
      if(ba>=250&&ea>=250&&diff>=60) continue;            // 兩邊都是實心但顏色不同:造型自己的東西
      if(ba>=250&&ea<250&&diff>=90) continue;             // 造型圖在這裡有東西(例如耳環),表情組是空的:保留
      for(let c=0;c<3;c++) R[i+c]=R[i+c]*(1-w)+eD[i+c]*w; R[i+3]=Math.round(ba*(1-w)+ea*w) } }
    for(let p=0;p<cw*ch;p++){ const a=mask[p]; if(!a) continue; const i=p*4; if(eD[i+3]<10) continue; const k=a*eD[i+3]/255;
      for(let c=0;c<3;c++) R[i+c]=R[i+c]*(1-k)+Math.max(0,Math.min(255,eD[i+c]+sh[c]))*k }
    const c1=canvas(cw,ch); c1.getContext("2d").putImageData(res,0,0);
    const c2=canvas(W2,H2), x2=c2.getContext("2d",{willReadFrequently:true}); x2.imageSmoothingQuality="high"; x2.drawImage(c1,0,0,W2,H2);
    if(K>1){ const e2=canvas(W2,H2), ex2=e2.getContext("2d",{willReadFrequently:true}); ex2.drawImage(exI[e],0,0,W2,H2);
      const bx0=fx0*K, by0=fy0*K, bw=(fx1-fx0)*K, bh=(fy1-fy0)*K, E2=ex2.getImageData(bx0,by0,bw,bh).data, Dd=x2.getImageData(bx0,by0,bw,bh), D2=Dd.data;
      for(let y=0;y<bh;y++) for(let x=0;x<bw;x++){ const a=mask[((fy0+(y/K))|0)*cw+((fx0+(x/K))|0)]; if(!a) continue; const i=(y*bw+x)*4; if(E2[i+3]<10) continue; const k=a*E2[i+3]/255;
        for(let c=0;c<3;c++) D2[i+c]=D2[i+c]*(1-k)+Math.max(0,Math.min(255,E2[i+c]+sh[c]))*k }
      x2.putImageData(Dd,bx0,by0);
      // 頭髮也用高清表情組:頭部那一段(臉中心往下 150px 以上,再 40px 漸變),顏色一致的像素換成 2 倍表情組
      const HY=face[1]+150, hb=Math.min(H2,(HY+20)*K), HE=ex2.getImageData(0,0,W2,hb).data, Hd=x2.getImageData(0,0,W2,hb), HD=Hd.data;
      for(let y=0;y<hb;y++){ const y1=y/K, w=y1<HY-20?1:(HY+20-y1)/40; if(w<=0) continue;
        for(let x=0;x<W2;x++){ const i=(y*W2+x)*4; if(mask[((y1)|0)*cw+((x/K)|0)]>=.999) continue;
          const ea=HE[i+3], ba=HD[i+3]; if(ea<8&&ba<8) continue;
          const diff=Math.abs(HD[i]-HE[i])+Math.abs(HD[i+1]-HE[i+1])+Math.abs(HD[i+2]-HE[i+2]);
          if(diff>=45&&ba>=200) continue;                       // 造型自己的東西(耳環、髮飾)保留
          for(let c=0;c<3;c++) HD[i+c]=HD[i+c]*(1-w)+HE[i+c]*w; HD[i+3]=Math.round(ba*(1-w)+ea*w) } }
      x2.putImageData(Hd,0,0) }
    let fin=c2; if(PAD){ const pw=PAD*K, c3=canvas(W2+2*pw,H2), x3=c3.getContext("2d"); x3.imageSmoothingQuality="high";
      x3.drawImage(oc,pos.x-PAD,pos.y,PAD,ch,0,0,pw,H2); x3.drawImage(oc,pos.x+cw,pos.y,PAD,ch,pw+W2,0,pw,H2); x3.drawImage(c2,pw,0); fin=c3 }   // 左右兩條直接用去背後的造型圖
    if(e==="neutral"){ let u=fin.toDataURL("image/webp",.86); if(!u.startsWith("data:image/webp")) u=fin.toDataURL("image/png"); out[e]=u }
    else{ const fp=facePatch(fin,f,K,PAD); faces[e]=fp.u; fat=fp.at } }
  return {sprites:out,faces,fat,pos,keyed,err:pos.err,pad:PAD,hq};
}

window.__makeSprites=makeSprites; window.__keyOut2=keyOut2;   // 測試用(r5_sprite.py、去背比較)
/* ---- 遊戲讀取:DYN[code@mid][表情] = 物件網址 ---- */
const DYN={}, LOADING=new Set(); window.DYN=DYN;
function toBlobURL(u){const [h,b]=u.split(","),mime=h.match(/:(.*?);/)[1],bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([a],{type:mime}))}
let rT=0; const rerender=()=>{clearTimeout(rT); rT=setTimeout(()=>{try{renderAll()}catch(e){window.logErr?.("sprites",e)}},300)};
const ORDER_EX=["smile","laugh","shy","serious","surprise","sad","pout","moved","wink","tired","angry"];
let CW=null; const cwWait=new Map(); let cwId=0;
function composer(){ if(CW!==null) return CW; try{ if(typeof OffscreenCanvas==="undefined") throw 0;
    const src=`const B=new Map();self.onmessage=async e=>{const m=e.data;if(m.free){B.get(m.free)?.close?.();B.delete(m.free);return}try{if(m.base)B.set(m.bid,await createImageBitmap(m.base));const base=B.get(m.bid);
      const p=await createImageBitmap(m.patch),c=new OffscreenCanvas(base.width,base.height),x=c.getContext("2d");x.drawImage(base,0,0);x.drawImage(p,m.at[0],m.at[1]);
      const b=await c.convertToBlob({type:"image/webp",quality:.9});self.postMessage({id:m.id,blob:b})}catch(err){self.postMessage({id:m.id,err:String(err)})}}`;
    CW=new Worker(URL.createObjectURL(new Blob([src],{type:"text/javascript"}))); CW.onmessage=e=>{ const f=cwWait.get(e.data.id); cwWait.delete(e.data.id); f?.(e.data) } }catch(e){ CW=false } return CW }
const dataBlob=u=>{ const [h,b]=u.split(","),mime=h.match(/:(.*?);/)[1],bin=atob(b),a=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return new Blob([a],{type:mime}) };
async function composeMain(baseU,patchU,at){ const ld=s=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=s}); const [b,p]=await Promise.all([ld(baseU),ld(patchU)]);
  const c=canvas(b.naturalWidth,b.naturalHeight),x=c.getContext("2d"); x.drawImage(b,0,0); x.drawImage(p,at[0],at[1]); return await new Promise(r=>c.toBlob(r,"image/webp",.9)) }
window.needDyn=(code,mid)=>{ const k=code+"@"+mid; if(DYN[k]||LOADING.has(k)) return; LOADING.add(k);
  (async()=>{ const slot=Object.keys(WMEM).find(s=>WMEM[s]===mid), mm=ITEMS[code]?.members?.[slot], sp=mm?.sprites; if(!sp) return;
    if(!mm.faces){ const o={}; for(const e of EXS){ const u=await getBlob(sp[e]); if(u) o[e]=toBlobURL(u) } if(o.neutral){DYN[k]=o; rerender()} return }   // 舊的格式:12 張全身
    const nu=await getBlob(sp.neutral); if(!nu) return; const o={neutral:toBlobURL(nu)}; DYN[k]=o; rerender();
    const W=composer(), bid=++cwId; let first=true;
    for(const e of ORDER_EX){ const pu=mm.faces[e]&&await getBlob(mm.faces[e]); if(!pu) continue;
      try{ let blob;
        if(W){ const id=++cwId; blob=await new Promise(r=>{ cwWait.set(id,d=>r(d.blob||null)); W.postMessage({id,bid,at:mm.fat,patch:dataBlob(pu),...(first?{base:dataBlob(nu)}:{})}) }); first=false }
        else blob=await composeMain(nu,pu,mm.fat);
        if(blob) o[e]=URL.createObjectURL(blob) }catch(err){ window.logErr?.("立繪合成",err) } }
    if(W) W.postMessage({free:bid}) })().finally(()=>LOADING.delete(k)) };   // 每一套各自一個 bid,同時載好幾套也不會拿錯底圖

/* ---- 立繪瘦身(2026-10-30,省雲端空間):舊格式是 12 張全身,改成 1 張全身+11 張頭部那一段;直接從現有的立繪裁,不用原圖、不重新去背 ---- */
const refsOf=o=>new Set((JSON.stringify(o||{}).match(/blob:[0-9a-f]{8,}/g)||[]).map(x=>x.slice(5)));
window.slimList=()=>{ const L=[]; for(const lk of Object.values(ITEMS)){ if(!lk||lk.deleted) continue; for(const [slot,m] of Object.entries(lk.members||{})) if(m?.sprites&&!m.faces&&Object.keys(m.sprites).length>1&&WMEM[slot]) L.push([lk.code,slot]) } return L };
window.slimOne=async(code,slot)=>{ const lk=JSON.parse(JSON.stringify(ITEMS[code]||{})), m=lk.members?.[slot], mid=WMEM[slot]; if(!m?.sprites||m.faces||!mid) return 0;
  const f=byId(mid).f, nu=await getBlob(m.sprites.neutral); if(!nu) throw new Error("讀不到 neutral");
  const nim=await loadImg(nu), K=Math.max(1,Math.round(nim.naturalHeight/CROP[f][1])), pad=Math.max(0,Math.round((nim.naturalWidth/K-CROP[f][0])/2)), faces={}; let fat=null;
  for(const e of EXS){ if(e==="neutral"||!m.sprites[e]) continue; const u=await getBlob(m.sprites[e]); if(!u) throw new Error("讀不到 "+e);
    const fp=facePatch(await loadImg(u),f,K,pad); faces[e]=fp.u; fat=fp.at }
  const old=refsOf(Object.fromEntries(Object.entries(m.sprites).filter(([e])=>e!=="neutral")));
  m.sprites={neutral:m.sprites.neutral}; m.faces=faces; m.fat=fat; lk.updatedAt=Date.now();
  await saveDoc("items",lk); delete DYN[code+"@"+mid]; await window.dropUnusedBlobs?.(old); return old.size };
/* ---- 上一版備份(重新生圖時留下的舊圖與舊立繪,可以按「回到上一版」)---- */
window.prevList=()=>{ const L=[]; for(const lk of Object.values(ITEMS)){ if(!lk||lk.deleted) continue; for(const [slot,m] of Object.entries(lk.members||{})) if(m?.prev&&(m.prev.img||m.prev.sprites)) L.push([lk.code,slot]) } return L };
window.prevDrop=async(code,slot)=>{ const lk=JSON.parse(JSON.stringify(ITEMS[code]||{})), m=lk.members?.[slot]; if(!m?.prev) return 0; const old=refsOf(m.prev);
  delete m.prev; lk.updatedAt=Date.now(); await saveDoc("items",lk); await window.dropUnusedBlobs?.(old); return old.size };
window.refsOf=refsOf;

/* ---- 造型室用:處理一套的某位成員 ---- */
/* ---- 立繪處理版本(2026-10-27):目前是第 4 版(精準遮罩去背+2 倍輸出、臉用高清表情組)。
   新處理的會記 spriteV;以前處理、沒記版本的,看立繪高度判斷:2 倍輸出高約 2900px,舊版約 1480px。
   判斷只讀圖檔開頭的尺寸欄位(不解碼整張圖),結果記在這台裝置(kpopGame.sprOK),選單只在真的有舊版時才出現更新鍵 ---- */
const SPRITE_V=5; window.SPRITE_V=SPRITE_V;   /* 5(2026-10-29):手伸出表情組的框時左右留邊,手不會被切掉 */
function imgSize(u){ try{ const b64=String(u).split(",")[1]||""; const bin=atob(b64.slice(0,80)), b=[...bin].map(c=>c.charCodeAt(0)), str=(i,n)=>String.fromCharCode(...b.slice(i,i+n));
  if(str(1,3)==="PNG") return {w:(b[16]<<24|b[17]<<16|b[18]<<8|b[19])>>>0,h:(b[20]<<24|b[21]<<16|b[22]<<8|b[23])>>>0};
  if(str(0,4)==="RIFF"&&str(8,4)==="WEBP"){ const k=str(12,4);
    if(k==="VP8 ") return {w:(b[26]|b[27]<<8)&0x3fff,h:(b[28]|b[29]<<8)&0x3fff};
    if(k==="VP8L") return {w:1+(((b[22]&0x3f)<<8)|b[21]),h:1+(((b[24]&0xf)<<10)|(b[23]<<2)|((b[22]&0xc0)>>6))};
    if(k==="VP8X") return {w:1+(b[24]|b[25]<<8|b[26]<<16),h:1+(b[27]|b[28]<<8|b[29]<<16)} } }catch(e){} return null }
const SOK_K="kpopGame.sprOK"; let SOK=null;
const sokGet=()=>SOK||(SOK=new Set((()=>{try{return JSON.parse(localStorage.getItem(SOK_K)||"[]")}catch(e){return []}})()));
window.spriteOutdated=async(o,lk)=>{ if(!o?.sprites) return false; if((o.spriteV||0)>=SPRITE_V) return false;
  if(lk?.pose&&lk.pose!=="stand") return true;   // 不是自然站姿的(揮手、比手勢…):舊的處理會把伸出去的手切掉,要重新處理
  const ref=o.sprites.neutral||Object.values(o.sprites)[0]; if(!ref) return false; const ok=sokGet(); if(ok.has(ref)) return false;
  const u=await getBlob(ref); if(!u) return false;   // 圖還沒下載到這台:先不算舊版,免得誤報
  const sz=imgSize(u); if(sz&&sz.h>=2000){ ok.add(ref); try{ localStorage.setItem(SOK_K,JSON.stringify([...ok].slice(-2000))) }catch(e){} return false }
  return !!sz };
window.processSprites=async(code,slot,opts={})=>{
  const lk=JSON.parse(JSON.stringify(ITEMS[code]||{})), mid=WMEM[slot]; if(!lk.code||!mid) throw new Error("找不到這套造型");
  const oldRefs=new Set((JSON.stringify([lk.members?.[slot]?.sprites||{},lk.members?.[slot]?.faces||{}]).match(/blob:[0-9a-f]{8,}/g)||[]).map(x=>x.slice(5)));   // 被換掉的舊立繪(存完後刪,雲端不會越積越多)
  const src=await getBlob(lk.members?.[slot]?.img); if(!src) throw new Error("這位成員還沒有圖");
  const r=await makeSprites(mid,src,lk.pose);
  lk.members[slot].sprites=r.sprites; lk.members[slot].faces=r.faces; lk.members[slot].fat=r.fat; lk.members[slot].spriteAt=Date.now(); lk.members[slot].spriteV=SPRITE_V; lk.updatedAt=Date.now();
  const k=code+"@"+mid; delete DYN[k]; window.needDyn(code,mid);
  const ok=await saveDoc("items",lk); ensureWear(true); rerender();
  if(oldRefs.size) window.dropUnusedBlobs?.(oldRefs).catch(e=>window.logErr?.("刪除舊立繪",e));
  return {...r,ok};
};
})();
