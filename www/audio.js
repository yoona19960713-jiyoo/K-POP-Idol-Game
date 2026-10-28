/* =====================================================================
   聲音系統(2026-10-26,參考 audio-design 技能)
   - 三條匯流排:音樂、音效、語音 → 總音量;滑桿 0~100 依人耳感受換算(平方曲線)
   - 背景音樂依「目前畫面」自動切換:標題、地圖(白天/夜晚)、各設施、拜訪地點、事件、回憶(CG)、演唱會
     換場景時 1.5 秒淡入淡出;同一個場景有好幾首時輪流放、不連續重複同一首
   - 語音播放時音樂自動壓低(之後的角色語音用);音效每次播放音高隨機 ±4%,不會像機關槍
   - 曲目清單:assets/bgm/list.json({"場景代號":["檔名.m4a",…]});沒有清單就安靜,不影響遊戲
   ===================================================================== */
(()=>{
const KEY="kpopGame.audio", FADE=1.5;
const cfg={master:90,music:70,sfx:80,voice:100}; try{ Object.assign(cfg,JSON.parse(localStorage.getItem(KEY)||"{}")) }catch(e){window.logErr?.("audio",e)}
let AC=null, unlocked=false, LIST=null, curScene="", want="";
const bus={};
const gainOf=v=>{ const x=Math.max(0,Math.min(100,+v||0))/100; return x*x };
function ctx(){ if(AC) return AC;
  AC=new (window.AudioContext||window.webkitAudioContext)();
  bus.master=AC.createGain(); bus.master.connect(AC.destination);
  for(const k of ["music","sfx","voice"]){ bus[k]=AC.createGain(); bus[k].connect(bus.master) }
  bus.duck=AC.createGain(); bus.duck.connect(bus.music);   // 語音播放時壓低音樂
  apply(); return AC }
function apply(){ if(!AC) return; const t=AC.currentTime; bus.master.gain.setTargetAtTime(gainOf(cfg.master),t,.05);
  for(const k of ["music","sfx","voice"]) bus[k].gain.setTargetAtTime(gainOf(cfg[k]),t,.05) }
window.audioCtx=()=>{ try{ ctx(); return {ctx:AC,sfx:bus.sfx} }catch(e){ return null } };

/* ---------- 背景音樂:兩個播放器交替淡入淡出 ---------- */
const P=[0,1].map(()=>{ const a=new Audio(); a.preload="auto"; return {a,g:null} });
let cur=0, curTrack="";
function wire(p){ if(p.g) return; const s=AC.createMediaElementSource(p.a); p.g=AC.createGain(); p.g.gain.value=0; s.connect(p.g); p.g.connect(bus.duck);
  p.a.onended=()=>{ if(P[cur]===p) nextTrack() } }
const FALL={practice:"map_day",recording:"practice",office:"map_day",wardrobe:"office",stage:"event",dorm:"map_night",outside:"map_day",event:"map_day",memory:"dorm",concert:"event",title:"map_day",map_night:"map_day",map_day:"title"};
function pool(k){ const seen=new Set(); while(k&&!seen.has(k)){ seen.add(k); const L=LIST?.[k]; if(L?.length) return L; k=FALL[k] } return [] }
function pick(L){ const c=L.filter(f=>f!==curTrack); return (c.length?c:L)[Math.floor(Math.random()*(c.length?c.length:L.length))] }
function play(file){ ctx(); const nx=P[1-cur], old=P[cur]; wire(nx); wire(old);
  nx.a.src="assets/bgm/"+file; nx.a.currentTime=0; nx.a.play().catch(()=>{});
  const t=AC.currentTime; nx.g.gain.cancelScheduledValues(t); nx.g.gain.setValueAtTime(0,t); nx.g.gain.linearRampToValueAtTime(1,t+FADE);
  old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value,t); old.g.gain.linearRampToValueAtTime(0,t+FADE);
  setTimeout(()=>{ if(P[cur]!==old) old.a.pause() },FADE*1000+150); cur=1-cur; curTrack=file }
function silence(){ if(!AC) return; const p=P[cur]; if(!p.g) return; const t=AC.currentTime; p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value,t); p.g.gain.linearRampToValueAtTime(0,t+FADE);
  setTimeout(()=>{ if(!curTrack) p.a.pause() },FADE*1000+150); curTrack="" }
function nextTrack(){ const L=pool(curScene); if(L.length) play(pick(L)); else silence() }
function setScene(k){ if(k===curScene) return; const was=pool(curScene), now=pool(k); curScene=k; window.BGM_SCENE=k;
  if(!LIST||!unlocked) return;
  if(now.length&&was.length&&now===was&&curTrack) return;   // 同一組曲目(例如設施沒有自己的歌、退回地圖曲)就繼續放
  now.length?play(pick(now)):silence() }
window.bgm=setScene;
/* 目前畫面 → 場景代號 */
const ROOM={practice:"practice",studio:"recording",office:"office",styling:"wardrobe",living:"dorm",kitchen:"dorm",bedroom:"dorm",out:"outside",river:"outside",store:"outside"};
function resolve(){ const on=s=>{ const e=document.querySelector(s); return !!(e&&e.offsetParent!==null) };
  if(document.querySelector("#exitv")) return "exit";   // 離開遊戲的動畫:音樂淡出(沒有這個場景的曲目)
  if(document.querySelector("#title:not(.out):not(.leaving)")) return "title";
  if(document.querySelector("#cnView")) return "concert";
  if(document.querySelector("#cgView")) return "memory";
  if(document.querySelector(".bigev:not(.out)")) return "event";
  if(document.querySelector("#songFac:not(.hide)")) return document.querySelector("#songFac.th-studio")?"recording":"office";
  if(document.querySelector("#facility:not(.hide)")) return "wardrobe";
  if(document.querySelector("#stageFac:not(.hide)")) return "stage";
  const v=typeof V!=="undefined"?V:null;   // game.js 的全域變數(不在 window 上)
  if(document.querySelector("#visit.on")) return ROOM[v?.room]||(String(v?.room||"").startsWith("bed")?"dorm":"map_day");
  const light=typeof SLOTS!=="undefined"&&typeof S!=="undefined"?SLOTS[S.slot]?.light:"day"; return light==="night"||light==="dawn"?"map_night":"map_day" }
every(1000,()=>{ try{ setScene(resolve()) }catch(e){window.logErr?.("audio",e)} });
/* 第一次觸碰才能出聲(瀏覽器與 Android 的自動播放限制) */
const unlock=()=>{ if(unlocked) return; unlocked=true; try{ ctx(); AC.resume?.() }catch(e){window.logErr?.("audio",e)} const k=curScene; curScene=""; if(k) setScene(k) };
document.addEventListener("pointerdown",unlock,{once:false,passive:true});
/* App 切到背景時暫停音樂 */
document.addEventListener("visibilitychange",()=>{ if(!AC) return; const p=P[cur];
  if(document.hidden){ p.a.pause(); AC.suspend?.() } else { AC.resume?.(); if(curTrack) p.a.play().catch(()=>{}) } });
fetch("assets/bgm/list.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{ LIST=j&&typeof j==="object"?j:null; note(); const k=curScene; curScene=""; if(k) setScene(k) }).catch(()=>{ LIST=null; note() });

/* ---------- 語音(之後的角色語音):播放時音樂壓低到 35% ---------- */
window.voice=url=>{ try{ ctx(); const a=new Audio(url), s=AC.createMediaElementSource(a); s.connect(bus.voice);
  const t=AC.currentTime; bus.duck.gain.setTargetAtTime(.35,t,.08);
  a.onended=a.onerror=()=>{ bus.duck.gain.setTargetAtTime(1,AC.currentTime,.25) }; a.play().catch(()=>{ bus.duck.gain.setTargetAtTime(1,AC.currentTime,.25) }); return a }catch(e){ return null } };
/* ---------- 音效(2026-10-27)----------
   還沒有音效檔:先用程式即時合成(柔和的鈴聲、木琴、空氣聲,音量偏小、不刺耳),跟著「音效」音量。
   之後有檔案時:放 assets/sfx/名稱.m4a,並在 assets/sfx/list.json 寫 ["名稱",…],有列的就改播檔案(沒列的不去抓,不會一直 404)。
   名稱:tap 一般按鈕、tab 分頁、on/off 開關、open/close 打開關閉畫面、select 對話選項、notify 手機新訊息、
         chime 中等好事(關係升階等)、sparkle 大事(解鎖回憶、出道、拿一位、演唱會)、shutter 拍照、error 不能做、
         start 標題按開始、welcome 成員迎接、bye 晚安字卡 */
const BUF={}; let SFXL=null, lastSfx=0;
fetch("assets/sfx/list.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{ SFXL=Array.isArray(j)?new Set(j):null }).catch(()=>{});
let REV=null;
function reverb(){ if(REV) return REV; const len=Math.floor(AC.sampleRate*1.3), b=AC.createBuffer(2,len,AC.sampleRate);
  for(let c=0;c<2;c++){ const d=b.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.4) }
  const cv=AC.createConvolver(); cv.buffer=b; const g=AC.createGain(); g.gain.value=.2; cv.connect(g); g.connect(bus.sfx); return REV=cv }
function tone(out,{f,type="sine",t=0,a=.004,d=.25,g=.1,f2,rev=0}){ const now=AC.currentTime+t, o=AC.createOscillator(), v=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,now); if(f2) o.frequency.exponentialRampToValueAtTime(f2,now+d*.8);
  v.gain.setValueAtTime(0,now); v.gain.linearRampToValueAtTime(g,now+a); v.gain.exponentialRampToValueAtTime(.0001,now+a+d);
  o.connect(v); v.connect(out); if(rev){ const r=AC.createGain(); r.gain.value=rev; v.connect(r); r.connect(reverb()) } o.start(now); o.stop(now+a+d+.05) }
const bell=(o,f,t,g,d)=>{ tone(o,{f,t,g,d,rev:.7}); tone(o,{f:f*2.01,t,g:g*.32,d:d*.55,rev:.6}); tone(o,{f:f*3.03,t,g:g*.1,d:d*.3,rev:.4}) };
let NB=null;
function noise(out,{t=0,d=.15,g=.06,type="highpass",f=2000,f2,q=.8,lp=12000}){ const now=AC.currentTime+t;
  if(!NB){ const len=AC.sampleRate; NB=AC.createBuffer(1,len,AC.sampleRate); const x=NB.getChannelData(0); for(let i=0;i<len;i++) x[i]=Math.random()*2-1 }
  const s=AC.createBufferSource(); s.buffer=NB; s.loop=true; const fl=AC.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,now); fl.Q.value=q;
  if(f2) fl.frequency.exponentialRampToValueAtTime(f2,now+d); const l=AC.createBiquadFilter(); l.type="lowpass"; l.frequency.value=lp;
  const v=AC.createGain(); v.gain.setValueAtTime(0,now); v.gain.linearRampToValueAtTime(g,now+.01); v.gain.exponentialRampToValueAtTime(.0001,now+d);
  s.connect(fl); fl.connect(l); l.connect(v); v.connect(out); s.start(now,Math.random()*.5); s.stop(now+d+.05) }
const N={C5:523.25,E5:659.25,G5:783.99,A5:880,C6:1046.5,D6:1174.66,E6:1318.51,G6:1567.98,A6:1760,B6:1975.53,C7:2093,E7:2637};
const SYN={
  tap:o=>{ tone(o,{f:1500,f2:1100,d:.04,g:.045}); noise(o,{d:.018,g:.012,f:3500}) },
  tab:o=>{ tone(o,{f:1760,f2:1480,type:"triangle",d:.055,g:.04}) },
  on:o=>{ tone(o,{f:880,d:.06,g:.045}); tone(o,{f:1320,t:.055,d:.08,g:.045}) },
  off:o=>{ tone(o,{f:1320,d:.06,g:.04}); tone(o,{f:880,t:.055,d:.08,g:.04}) },
  open:o=>{ noise(o,{type:"bandpass",f:700,f2:3200,d:.22,g:.035,q:1.1}); bell(o,N.E6,.03,.045,.45); bell(o,N.B6,.1,.035,.55) },
  close:o=>{ noise(o,{type:"bandpass",f:2600,f2:700,d:.18,g:.028,q:1.1}); bell(o,N.E6,.02,.03,.32) },
  select:o=>{ tone(o,{f:N.E5,type:"triangle",d:.2,g:.06,rev:.3}); tone(o,{f:N.E6,d:.12,g:.025,rev:.3}) },
  notify:o=>{ bell(o,N.G6,0,.05,.5); bell(o,N.C7,.12,.05,.7) },
  chime:o=>{ bell(o,N.C6,0,.045,.6); bell(o,N.E6,.09,.045,.6); bell(o,N.G6,.18,.045,.9) },
  sparkle:o=>{ [N.C6,N.E6,N.G6,N.C7,N.E7].forEach((f,i)=>bell(o,f,i*.07,.042,1.0)); noise(o,{t:.05,d:.7,g:.012,f:6500}) },
  shutter:o=>{ noise(o,{d:.04,g:.11,f:1800}); noise(o,{t:.065,d:.08,g:.07,f:3000}); tone(o,{f:190,d:.03,g:.04,type:"square"}) },
  error:o=>{ tone(o,{f:330,f2:290,type:"triangle",d:.12,g:.05}); tone(o,{f:262,t:.11,d:.16,g:.045,type:"triangle"}) },
  start:o=>{ noise(o,{type:"bandpass",f:500,f2:5200,d:.5,g:.04,q:.9}); bell(o,N.G5,.05,.045,.9); bell(o,N.D6,.13,.04,.9); bell(o,N.G6,.21,.04,1.2) },
  welcome:o=>{ bell(o,N.C6,0,.04,.7); bell(o,N.E6,.13,.04,.7); bell(o,N.A6,.26,.038,1.1) },
  bye:o=>{ bell(o,N.G5,0,.035,1.1); bell(o,N.E5,.22,.032,1.2); bell(o,N.C5,.44,.03,1.6) },
};
window.sfx=async(name,vol=1)=>{ try{ ctx(); if(AC.state==="suspended") AC.resume?.(); if(name!=="tap") lastSfx=performance.now();
    if(SFXL?.has(name)){ if(!(name in BUF)) BUF[name]=fetch("assets/sfx/"+name+".m4a").then(r=>r.ok?r.arrayBuffer():null).then(b=>b?AC.decodeAudioData(b):null).catch(()=>null);
      const b=await BUF[name]; if(!b) return; const s=AC.createBufferSource(), g=AC.createGain(); s.buffer=b; s.playbackRate.value=.96+Math.random()*.08; g.gain.value=vol; s.connect(g); g.connect(bus.sfx); s.start(); return }
    const f=SYN[name]; if(!f) return; let o=bus.sfx; if(vol!==1){ o=AC.createGain(); o.gain.value=vol; o.connect(bus.sfx) } f(o) }catch(e){window.logErr?.("audio",e)} };
/* 一般按鈕的輕點聲:同一下點擊如果已經有更具體的音效(打開、關閉、選項…)就不再響 */
window.sfxTap=(ts=performance.now())=>{ setTimeout(()=>{ if(lastSfx<ts-2) window.sfx("tap") },0) };

/* ---------- 選單裡的音量 ---------- */
function note(){ const n=$("#bgmNote"); if(!n) return; const c=LIST?Object.values(LIST).reduce((a,L)=>a+(L?.length||0),0):0;
  n.textContent=c?`背景音樂:已放入 ${c} 首,依畫面自動切換。`:"背景音樂:還沒有曲目(照「音樂生成清單」生成後放進 assets/bgm)。" }
for(const [id,k] of [["volMaster","master"],["volMusic","music"],["volSfx","sfx"],["volVoice","voice"]]){ const el=document.getElementById(id); if(!el) continue;
  el.value=cfg[k]; el.oninput=()=>{ cfg[k]=+el.value; try{ ctx() }catch(e){window.logErr?.("audio",e)} apply(); localStorage.setItem(KEY,JSON.stringify(cfg)) } }
note();
})();
