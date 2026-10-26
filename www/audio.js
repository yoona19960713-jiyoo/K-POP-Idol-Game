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
  if(document.querySelector("#title:not(.out)")) return "title";
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
/* ---------- 音效:assets/sfx/名稱.m4a,快取後播放,音高隨機 ±4% ---------- */
const BUF={};
window.sfx=async(name,vol=1)=>{ try{ ctx(); if(!(name in BUF)) BUF[name]=fetch("assets/sfx/"+name+".m4a").then(r=>r.ok?r.arrayBuffer():null).then(b=>b?AC.decodeAudioData(b):null).catch(()=>null);
  const b=await BUF[name]; if(!b) return; const s=AC.createBufferSource(), g=AC.createGain(); s.buffer=b; s.playbackRate.value=.96+Math.random()*.08; g.gain.value=vol; s.connect(g); g.connect(bus.sfx); s.start() }catch(e){window.logErr?.("audio",e)} };

/* ---------- 選單裡的音量 ---------- */
function note(){ const n=$("#bgmNote"); if(!n) return; const c=LIST?Object.values(LIST).reduce((a,L)=>a+(L?.length||0),0):0;
  n.textContent=c?`背景音樂:已放入 ${c} 首,依畫面自動切換。`:"背景音樂:還沒有曲目(照「音樂生成清單」生成後放進 assets/bgm)。" }
for(const [id,k] of [["volMaster","master"],["volMusic","music"],["volSfx","sfx"],["volVoice","voice"]]){ const el=document.getElementById(id); if(!el) continue;
  el.value=cfg[k]; el.oninput=()=>{ cfg[k]=+el.value; try{ ctx() }catch(e){window.logErr?.("audio",e)} apply(); localStorage.setItem(KEY,JSON.stringify(cfg)) } }
note();
})();
