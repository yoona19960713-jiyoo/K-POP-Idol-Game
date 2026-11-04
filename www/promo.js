"use strict";
/* =====================================================================
   1.2 第 2 包(2026-11-04,第五個大腦):宣傳期的行程(使用者 11/04 確認樣張 參考圖/樣張_1.2第2包)
   - 作息:宣傳期(出道或回歸日的隔天起 28 天)不再照練習生作息。打歌日(週二~週日)06:30 坐保母車出發 → 07:30 彩排、化妝 →
     生放送(週二~四 18:00、週五 17:00、週六 15:30、週日 15:40)→ 晚上的行程(週二深夜廣播 22:00;週三 20:00、週五 19:30、
     週六 18:30 簽售會)→ 回宿舍;週一上午補眠 → 11:00 雜誌拍攝或綜藝錄影(隔週輪流)→ 16:00 練習 → 晚上自由。
     出道日、回歸日當天照原本的安排(Showcase);連假(春節)照連假(mile.js),打歌停播(stage.js)。
     game.js 的 blockAt 先問 window.promoBlocks(day);她們「外出」的時段,宿舍和公司找不到人。
   - 跟去:手機「行程」的今天的行程(window.promoItin)。打歌 = 去電視台(待機室,照舊 3 小時);
     簽售會、廣播 2 小時、週一的拍攝或綜藝 3 小時:看一段小場景(內容庫有 promo_* 的片段就先演,沒有用下面的內建版本),
     全員心情 +5、場景的主角跟你的關係 +1。沒跟去也沒有任何扣分。簽售會、待機室穿當天的打歌服(window.promoOutfit)。
   - 打歌失誤之後:stage.js 上台算完結果時呼叫 window.promoSetDown(破音 crack 優先,其次跳錯 slip;一場只算一個人),
     她的心情 −6(待機室自己的心情另外 −8,照舊)。你在電視台:結果畫面「下台以後」的卡 → 待機室的安慰場景;
     沒去:當天她的聊天就是安慰場景(game.js talk 的 window.promoTalk)。安慰:心情 +10、壓力 −5、待機室的心情 +12,
     三個選項都對(關係各 +2,反應不一樣);沒去安慰也不會更糟。
   資料:S.promoGo={day,done:{簽售會等的代號:1}}、S.pdown={id,kind,day,show,auto,done}(跟著存檔同步)
   ===================================================================== */
(()=>{
const LEN=28;
const LIVE={2:1080,3:1080,4:1080,5:1020,6:930,0:940};
const EXTRA={2:{k:"radio",at:1320,dur:120,n:"深夜廣播",place:"〈深夜收音機〉・五人來賓",room:"radio",out:"廣播電台"},
  3:{k:"fansign",at:1200,dur:120,n:"簽售會",place:"新村・晚上場",room:"fansign",out:"簽售會"},
  5:{k:"fansign",at:1170,dur:120,n:"簽售會",place:"永登浦・晚上場",room:"fansign",out:"簽售會"},
  6:{k:"fansign",at:1110,dur:120,n:"簽售會",place:"江南・晚上場",room:"fansign",out:"簽售會"}};
const MON=[{k:"magazine",at:660,dur:180,n:"雜誌拍攝",place:"時尚雜誌・五人內頁",room:"photo",out:"雜誌拍攝"},
  {k:"variety",at:660,dur:180,n:"綜藝錄影",place:"偶像綜藝・新人特輯",room:"tvroom",out:"綜藝錄影"}];
const IDS=["ys","tr","hy","he","hr"];
const DORM={ys:{living:2,bedroom:1},tr:{bedroom:2,roof:1},hy:{living:1,bedroom:2},he:{living:2,kitchen:1,bedroom:1},hr:{living:2,kitchen:1,bedroom:1}};
const P0=day=>{ const P=S.promo; return P&&day>=P.start&&day<P.start+LEN?P:null };
const weekN=(day,P)=>Math.floor((day-P.start)/7)+1;
const hol=day=>!!window.mileHoliday?.(day);
const on=day=>{ const P=P0(day); return P&&day!==P.start&&!hol(day)?P:null };
const allW=place=>({all:{[place]:1}});
const extraOn=day=>{ const P=on(day); if(!P) return null; const wd=dateOf(day).getDay(); return wd===1?{...MON[(weekN(day,P)+1)%2],mon:1}:EXTRA[wd]||null };
window.promoExtraOn=extraOn;
window.promoHoliday=day=>!!(P0(day)&&hol(day));
window.promoBlocks=day=>{ const P=on(day); if(!P) return null; const wd=dateOf(day).getDay(), ex=extraOn(day);
  if(wd===1) return [
    {at:360,n:"補眠",w:{all:{bedroom:1}},doing:{he:"睡到自然醒",tr:"補眠"}},
    {at:600,n:"早午餐",w:{all:{kitchen:2,living:1}},doing:{he:"煮早午餐"}},
    {at:ex.at,n:ex.n,w:allW("外出:"+ex.out),pdo:ex.n},
    {at:960,n:"練習",w:{all:{practice:1}},doing:{}},
    {at:1080,n:"晚餐",w:{all:{kitchen:2,living:1},he:{kitchen:3}}},
    {at:1140,n:"自由時間",w:DORM},
    {at:1440,n:"睡覺",w:{all:{bedroom:1}},doing:{tr:"還在寫詞"}}];
  const live=LIVE[wd], show=window.promoShowOn?.(day)||"音樂節目";
  const B=[{at:330,n:"起床",w:{ys:{bedroom:2,kitchen:1},tr:{bedroom:3},hy:{bedroom:2,kitchen:1},he:{kitchen:3},hr:{bedroom:3}},doing:{he:"做早餐",tr:"還沒睡醒",hr:"還沒睡醒"}},
    {at:390,n:"出發",w:allW("外出:保母車"),pdo:"往電視台"},
    {at:450,n:"彩排、化妝",w:allW("外出:電視台"),pdo:"彩排、化妝"},
    {at:live-60,n:"等待上台",w:allW("外出:電視台"),pdo:"在待機室等上台"},
    {at:live,n:"生放送",w:allW("外出:電視台"),pdo:show+" 生放送"}];
  let back=live+150;
  if(ex){ B.push({at:live+75,n:"移動・晚餐",w:allW("外出:保母車"),pdo:"在車上吃晚餐"},{at:ex.at,n:ex.n,w:allW("外出:"+ex.out),pdo:ex.n}); back=ex.at+ex.dur+30 }
  B.push({at:back,n:"宿舍時間",w:DORM,doing:{ys:"卸妝、休息",he:"卸妝、休息"}},{at:Math.max(1440,back+60),n:"睡覺",w:{all:{bedroom:1}},doing:{tr:"還在寫詞"}});
  return B };
/* ---------- 手機「行程」:今天的行程 ---------- */
const done=k=>S.promoGo?.day===S.day&&!!S.promoGo.done?.[k];
const hm2=m=>{ m=((m%1440)+1440)%1440; return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}` };
window.promoItin=()=>{ const day=S.day, P=P0(day); if(!P) return null;
  const wk=weekN(day,P), head=`${P.kind==="debut"?"出道":"回歸"}宣傳期・第 ${wk} 週`;
  if(hol(day)){ const h=window.mileHolidayOf?.(day); return {head,rows:[{t:"",n:`${h?.n||"連假"}・停播`,sub:"各台播節日特輯,今天沒有行程",st:"now"}]} }
  if(day===P.start) return {head,rows:[{t:"",n:P.kind==="debut"?"出道日":"回歸日",sub:"Showcase 與第一次打歌,照公司公告",st:"now"}]};
  const B=window.promoBlocks(day), ex=extraOn(day), now=S.min, wd=dateOf(day).getDay(), rows=[];
  const st=(a,b)=>now>=b?"done":now>=a?"now":"";
  if(wd===1){ rows.push({t:hm2(360),n:"補眠、早午餐",sub:"宿舍",st:st(360,ex.at)});
    rows.push({t:hm2(ex.at),n:ex.n,sub:ex.place,st:st(ex.at,ex.at+ex.dur),go:ex.k});
    rows.push({t:hm2(960),n:"練習",sub:"公司・練習室",st:st(960,1080)}); rows.push({t:hm2(1140),n:"自由時間",sub:"宿舍",st:st(1140,1800)}) }
  else { const live=LIVE[wd], show=window.promoShowOn?.(day)||"", i=window.promoToday?.()?.idx;
    rows.push({t:hm2(390),n:"出發",sub:"保母車・往電視台",st:st(390,450)});
    rows.push({t:hm2(450),n:"彩排、化妝",sub:`${show}・待機室`,st:st(450,live),go:"tv"});
    rows.push({t:hm2(live),n:"生放送",sub:`${show}${i!=null?`・〈${esc(P.title||"")}〉第 ${i-(window.promoFirstIdx?.(P)||0)+1} 場`:""}`,st:st(live,live+75),go:"tv"});
    if(ex) rows.push({t:hm2(ex.at),n:ex.n,sub:ex.place,st:st(ex.at,ex.at+ex.dur),go:ex.k});
    const back=B[B.length-2].at; rows.push({t:hm2(back),n:"回宿舍",sub:wd===0?"明天休息一下":"明天 "+(window.promoShowOn?.(day+1)||"休息"),st:st(back,1800)}) }
  for(const r of rows){ if(!r.go) continue;
    if(r.go==="tv"){ const tdone=window.stageDoneToday?.(); r.btn=tdone?{t:"打歌結束",off:1}:r.st==="done"?null:{t:"去電視台"}; continue }
    const e=ex; if(done(r.go)) r.btn={t:"跟去了",off:1}; else if(now>=e.at+e.dur) r.btn=null; else if(now>=e.at-30) r.btn={t:"跟去"}; else r.btn={t:`${hm2(e.at-30)} 起`,off:1} }
  return {head,rows} };
window.promoWeekText=day=>{ const P=P0(day); if(!P) return null; const hn=esc(window.mileHolidayOf?.(day)?.n||"連假");
  if(hol(day)) return window.promoShowOn?.(day)?{html:`<em>停播</em>・節日特輯(${hn})`,stop:1}:{html:`${hn}・休假`,stop:1};
  const ex=extraOn(day); if(!ex) return null; if(ex.mon) return {html:`${ex.n}・下午練習`};
  const show=window.promoShowOn?.(day); return show?{html:`<em>打歌</em>・${esc(show)} <i>+ ${ex.n}</i>`}:null };
/* ---------- 跟去:小場景 ---------- */
const N=t=>["",t];
const SC={
 fansign:{
  ys:[N("(簽售會進行到一半。藝瑟每一張專輯都寫得特別久,她面前的隊伍比旁邊慢了一截。)"),["ys","啊,妳是 Showcase 那天坐第一排的……對吧?我記得妳的髮夾!","laugh"],N("(粉絲摀著嘴說不出話。工作人員在旁邊比了「快一點」的手勢。)"),["ys","(小聲)代表,再給我十秒就好。她們是我們最早的那一批人耶。","wink"]],
  tr:[N("(輪到泰梨。對面的粉絲緊張到把準備好的韓文全忘了,最後用英文說了一長串。)"),["tr","……Thank you. Really.","smile"],N("(她在專輯上多畫了一個小小的音符。等粉絲走了,她才轉頭看你。)"),["tr","……她說我那段 rap,陪她撐過了考試。","shy"],["tr","……不准笑。","pout"]],
  hy:[N("(一位從大阪飛來的粉絲,一開口就是關西腔。日和愣了一秒,眼睛馬上紅了。)"),["hy","えっ、大阪から?……ほんまに?","surprise"],["hy","代表,她說她是看了 Showcase 的影片才來的……我、我不能哭,妝會花掉……","moved"],N("(你遞過去一張面紙。她吸了吸鼻子,對粉絲比了一個大大的愛心。)")],
  he:[N("(夏恩面前已經堆了三盒手作餅乾。下一位粉絲還沒坐下,她就先開口了。)"),["he","吃過晚餐了嗎?沒吃不行喔,等一下回家路上要吃點熱的~","smile"],N("(粉絲笑到說不出話。夏恩趁空檔把一盒餅乾塞進你手裡。)"),["he","代表先幫我保管。……一片都不准偷吃喔。","wink"]],
  hr:[N("(長桌前排著長長的隊伍。你站在舞台側邊,懷裡抱著粉絲送的禮物袋。)"),["hr","代表!你看你看,有人做了橘子造型的應援扇!","laugh"],["ys","河嵐,手不要停,後面還有一百多位喔。","smile"],["ys","……不過真的很可愛。等一下拍下來,傳給我。","wink"]]},
 radio:{
  ys:[N("(深夜的錄音間只亮著桌燈。DJ 問藝瑟,當隊長最難的是什麼時候。)"),["ys","嗯……大家都睡了,只有我還醒著的時候吧。不過那種時候,通常會有人傳訊息來說「隊長快睡」。","smile"],N("(下了節目,走廊上只剩你們。她把耳機線一圈一圈繞好。)"),["ys","……剛剛那個「有人」,你知道是誰吧。","shy"]],
  tr:[N("(DJ 臨時要泰梨來一段即興 rap。她看了你一眼,拿起耳機戴好。)"),N("(八小節。錄音間安靜到只剩她的聲音。控制室裡的工作人員全都抬起頭。)"),["tr","……好了。沒有準備,所以只有這樣。","neutral"],["tr","(下了節目)……你剛剛在玻璃後面點頭了。我有看到。","smile"]],
  hy:[N("(DJ 念了一則聽眾來信,裡面有一句日文,念得有點怪。日和忍住笑舉手。)"),["hy","那個……不是「すみません」,是「すきです」喔。意思差很多!","laugh"],N("(DJ 跟著重念一次,節目的留言板一下子刷滿了愛心。)"),["hy","代表,我剛剛在廣播裡教了韓國人日文耶!我是不是很厲害?","laugh"]],
  he:[N("(聽眾留言點名要夏恩用大邱腔撒嬌。她摀住臉,在椅子上轉了半圈。)"),["he","真的要嗎……?好啦,只有一次喔。……オッパ,밥 먹었나?","shy"],N("(錄音間裡的笑聲停不下來。夏恩紅著臉瞪向玻璃後面的你。)"),["he","代表笑最大聲!回去不給你宵夜!","pout"]],
  hr:[N("(DJ 請河嵐清唱一段。她深吸一口氣,把麥克風拉近一點。)"),N("(副歌最後那個高音,穩穩地上去了。DJ 鼓了好久的掌。)"),["hr","上去了!代表,你有聽到嗎?今天上去了!","laugh"],["hr","……下次在打歌的時候也要這樣。我會的。","serious"]]},
 magazine:{
  ys:[N("(雜誌的內頁拍攝。攝影師要藝瑟「更冷一點」。她試了三次,每次都忍不住笑出來。)"),["ys","對不起!我一想到要裝酷就……代表,你不要在那邊看啦!","laugh"],N("(第四次,她看著鏡頭外的你,慢慢收起笑容。快門聲連著響了好幾下。)")],
  tr:[N("(個人照的時候,攝影師讓泰梨自由擺姿勢。她什麼都沒做,只是把耳機掛到脖子上。)"),["tr","……這樣就好。我平常就這樣。","neutral"],N("(那張最後成了內頁的第一張。)"),["tr","……你覺得好看?……嗯。那就好。","shy"]],
  hy:[N("(攝影棚放了一張芭蕾把桿當道具。日和一看到,腳尖就自己踮起來了。)"),["hy","代表,我可以在這裡做一個 arabesque 嗎?只要一下下!","laugh"],N("(她單腳站穩,另一隻腳往後伸直。攝影師連喊了三聲「好」。)")],
  he:[N("(拍攝空檔,夏恩在休息區把大家的便當一個一個打開、擺好。)"),["he","先吃再拍!肚子餓的臉,拍起來會兇喔~","smile"],["he","代表也是。這個是你的,我特別多夾了一塊肉。","wink"]],
  hr:[N("(五人的團體照拍了快一個小時。河嵐站在最前面,腳已經開始偷偷抖了。)"),["hr","代表……我的臉笑到抽筋了……可是這張好像很好看,再撐一下!","laugh"],N("(最後一張,她偷偷比了一個很小的 V。)")]},
 variety:{
  ys:[N("(綜藝的新人特輯,第一關是「隊長的反應力測驗」。藝瑟被丟了三顆氣球,接到兩顆。)"),["ys","第三顆是河嵐丟的對不對!我看到了!","laugh"],["hr","不是我!是夏恩歐尼!","laugh"]],
  tr:[N("(主持人要每個人表演一個隱藏才藝。輪到泰梨,她沉默了三秒。)"),["tr","……我可以模仿冰箱的聲音。","neutral"],N("(她真的模仿了。現場安靜了一秒,然後笑翻了。)"),["tr","……(下了節目)那個,不要剪進預告。拜託。","shy"]],
  hy:[N("(柔軟度挑戰。其他四個人的手都碰不到腳尖,日和直接把整個人摺成一半。)"),["hy","這個……很簡單喔?大家要我教嗎?","smile"],["he","不要!我們會壞掉的!","laugh"]],
  he:[N("(料理單元。夏恩十分鐘做出一鍋大醬湯,主持人喝了一口就不說話了。)"),["he","怎麼了?太鹹嗎?……還是太好喝?","wink"],N("(主持人默默又舀了一碗。)")],
  hr:[N("(高音接力。最後一棒是河嵐,她一口氣把音拉到比原曲還高。)"),["hr","哈!還可以再高喔!","laugh"],["ys","可以了可以了,玻璃要破了!","laugh"]]}};
/* 內容庫有那一格(type promo,ev = fansign / radio / magazine / variety)就先演 */
const fromLib=(k,id)=>{ try{ const L=window.scriptsPool?.({types:["promo"],ev:k,member:id})||[]; return L.length?L[Math.floor(Math.random()*L.length)]:null }catch(e){ return null } };
const focusOf=(k,day)=>IDS[Math.abs((day*7+({fansign:1,radio:3,magazine:5,variety:2}[k]||0)))%5];
const bgOK={};
function bgFor(room,light){ const pick={fansign:{dawn:"day",day:"day",evening:"evening",night:"evening"},radio:{dawn:"day",day:"day",evening:"night",night:"night"}}[room];
  if(!pick) return null; const u=`assets/bg/${room}_${pick[light]||"day"}.webp`; return u }
const FALLBACK={fansign:"assets/bg/ev_showcase.webp",radio:"assets/bg/studio_night.webp"};
const probe=u=>new Promise(ok=>{ if(bgOK[u]!=null) return ok(bgOK[u]); const im=new Image(); im.onload=()=>{ bgOK[u]=true; ok(true) }; im.onerror=()=>{ bgOK[u]=false; ok(false) }; im.src=u });
window.promoGo=async k=>{ const ex=extraOn(S.day); if(!ex||ex.k!==k||done(k)) { toast2("現在沒有這個行程"); return }
  const now=S.min, end=ex.at+ex.dur; if(now>=end){ toast2(`${ex.n}已經結束了`); return } if(now<ex.at-30){ toast2(`${hm2(ex.at-30)} 以後才能跟去`); return }
  window.closePhone?.();
  const who=M.map(m=>m.id).filter(id=>!window.sickIs?.(id)), id=who.includes(focusOf(k,S.day))?focusOf(k,S.day):who[0];
  const lib=fromLib(k,id), L=lib?null:SC[k]?.[id]||[N(`(你跟著她們去了${ex.n}。)`)];
  const sn=lib||{code:`promo-${k}-${id}`,type:"promo",who:[id],member:id,nodes:{start:{L,C:[]}}};
  let bg=null; const light=SLOTS[S.slot]?.light||"day";
  if(ex.room==="fansign"||ex.room==="radio"){ const u=bgFor(ex.room,light); bg=await probe(u)?u:FALLBACK[ex.room] }
  const stay=Math.max(30,end-Math.max(now,ex.at)), wait=Math.max(0,ex.at-now);
  (S.promoGo&&S.promoGo.day===S.day?S.promoGo:(S.promoGo={day:S.day,done:{}})).done[k]=1; save(true);
  const spk=[...new Set((sn.nodes?.start?.L||[]).map(l=>l[0]).filter(x=>who.includes(x)))], show=spk.length?spk:[id];   // 畫面上只站有台詞的人(五個人都站會太擠),效果算全員
  window.visitScene?.(ex.room,{sn,who:show,n:ex.n,sub:ex.place,bg,done:()=>{
    for(const x of who){ const s=S.m[x]; if(!s) continue; s.mood=clamp(s.mood+5,0,100) } who.forEach((x,j)=>setTimeout(()=>fx(x,"心情 +5"),j*200));
    window.applyGain?.(id,{s:"陪著",g:1,to:id},()=>{});
    const used=window.spendTime?.(wait+stay,ex.n)||0; if(used) toast2(`「${ex.n}」・花了 ${fmtMin(used)}`); save(true) }}) };
/* 簽售會、待機室、綜藝穿當天的打歌服(待機室準備單上的那套);雜誌拍攝、廣播穿平常的外出服 */
window.promoOutfit=(mid,room)=>{ if(room!=="fansign"&&room!=="tvroom") return undefined; if(!P0(S.day)) return undefined;
  const L=window.stagePlanLooks?.()||{}, c=String(L[mid]||"").split("@")[0]; return c&&typeof ITEMS!=="undefined"&&ITEMS[c]?c:undefined };
/* ---------- 打歌失誤之後:去安慰她 ---------- */
const KIND={crack:"破音",slip:"跳錯"};
window.promoSetDown=(id,kind,info={})=>{ if(!byId(id)||!KIND[kind]) return; const s=S.m[id]; if(s) s.mood=clamp(s.mood-6,0,100);
  S.pdown={id,kind,day:info.day??S.day,show:info.show||"",auto:!!info.auto,done:0}; save(true) };
const downNow=()=>{ const d=S.pdown; return d&&!d.done&&(d.day===S.day||(d.auto&&d.day===S.day-1))?d:null };   // 沒去的那場:當天或隔天找她聊都可以
const CF={
 crack:{
  ys:{L:[N("(待機室的角落,藝瑟坐在化妝檯前,一直盯著鏡子裡的自己。)"),["ys","……代表。你聽到了吧,那個高音。隊長自己唱破了。","sad"],["ys","明明跟大家說要穩穩的……","sad"]],
     C:[["(在她旁邊坐下,遞上一杯溫水)","陪著",[["ys","……溫的。你連這個都記得。","moved"],["ys","好。喝完這杯,我就是隊長了。","smile"]]],["「隊長也可以有破音的一天。」","鼓勵",[["ys","……嗯。那今天就讓我當一下普通的藝瑟吧。","shy"]]],["「明天開始,我陪妳把那一句練到睡著也唱得上去。」","出手幫忙",[["ys","說好了喔。我會很嚴格的,連你一起。","laugh"]]]]},
  tr:{L:[N("(泰梨戴著耳機,一動也不動地坐在走廊盡頭的椅子上。)"),["tr","……不用說了。我知道那個音沒有上去。","neutral"],["tr","我自己寫的歌,我自己唱壞了。","sad"]],
     C:[["(什麼都不說,在她旁邊坐下)","陪著",[["tr","……你很安靜。……嗯。這樣剛好。","shy"]]],["「那一句的情緒,其實很對。」","鼓勵",[["tr","……你真的這樣覺得?……那我明天再唱一次給你聽。","smile"]]],["「回去以後,我們一起把那一句的換氣改掉。」","出手幫忙",[["tr","……換氣。對,問題在那裡。你什麼時候這麼懂了。","surprise"]]]]},
  hy:{L:[N("(日和一下台就跑進待機室,把臉埋在毛巾裡。)"),["hy","代表……對不起。我的聲音,在最重要的地方……","sad"],["hy","大丈夫です。……不對,一點都不大丈夫。","sad"]],
     C:[["(輕輕拍拍她的背,等她哭完)","陪著",[["hy","……謝謝。代表的手,好溫暖。","moved"]]],["「說『不大丈夫』的日和,很勇敢。」","鼓勵",[["hy","……代表。這句話,我會記很久很久。","shy"]]],["「下一場,我們先在待機室開好嗓再上。」","出手幫忙",[["hy","嗯!代表要陪我,開嗓的時候不准笑我喔。","smile"]]]]},
  he:{L:[N("(夏恩在待機室裡笑著幫大家拿便當,笑得比平常更大聲。)"),["he","哎唷,破音而已啦~大家快吃,冷掉就不好吃了!","smile"],N("(等其他人都出去了,她的笑容才慢慢收起來。)"),["he","……代表,你不要那樣看我。我會想哭的。","sad"]],
     C:[["(把她手上的便當接過來,讓她先坐下)","陪著",[["he","……每次都是我照顧大家。今天換你,好不習慣。","moved"]]],["「今天不用笑也沒關係。」","鼓勵",[["he","……嗯。那我哭一下下就好。一下下。","sad"],["he","……好了。代表,謝謝你。","smile"]]],["「明天我陪妳去聲樂室,練到妳自己都滿意。」","出手幫忙",[["he","好啊。練完你要請我吃烤肉喔,這是條件。","wink"]]]]},
  hr:{L:[N("(河嵐抱著膝蓋坐在化妝檯旁邊,手機螢幕亮了又暗。)"),["hr","……代表。你都聽到了吧。最後那個高音。","sad"],["hr","明明練習的時候都上得去的……","sad"]],
     C:[["(在她旁邊坐下,把她的手機輕輕蓋起來)","陪著",[["hr","……不看了。代表說不看,我就不看。","shy"]]],["「上不去的那一次,也是妳的一部分。」","鼓勵",[["hr","……嗯。下一次上去的時候,代表要第一個聽到喔。","smile"]]],["「明天開始,我陪妳把那個音練到閉著眼也上得去。」","出手幫忙",[["hr","說好了!代表不可以先睡!","laugh"]]]]}},
 slip:{
  ys:{L:[N("(待機室的角落,藝瑟一個人坐在化妝檯前,手機上一直重播著那段慢了半拍的影片。)"),["ys","……代表。你看到了吧。隊長自己慢了半拍。","sad"],["ys","明天大家都會在網路上看到這一段……","sad"]],
     C:[["(在她旁邊坐下,把她的手機輕輕蓋起來)","陪著",[["ys","……嗯。不看了。今天就到這裡。","shy"]]],["「慢半拍的藝瑟,也很好看。」","鼓勵",[["ys","……你喔。這種話不要說得那麼認真啦。","shy"],["ys","……謝謝。","smile"]]],["「明天開始,我陪妳把那八拍練到閉著眼也能跳。」","出手幫忙",[["ys","好。那你要負責數拍子,數錯一次請大家喝飲料。","laugh"]]]]},
  tr:{L:[N("(泰梨對著待機室的鏡子,把剛剛跳錯的那四拍一遍一遍重跳。)"),["tr","……這裡。換腳的時候慢了。","serious"],["tr","LA 的老師說過,台上錯一次,台下要跳一百次。","neutral"]],
     C:[["(在旁邊幫她數拍子)","陪著",[["tr","……五、六、七、八。……你數得比我們編舞老師還準。","smile"]]],["「一百次以前,先休息一下。」","鼓勵",[["tr","……好。就十分鐘。……你也坐。","shy"]]],["「回去我把那段的影片放慢,我們一起看。」","出手幫忙",[["tr","……放慢到 0.5 倍。……你真的很適合當代表。","smile"]]]]},
  hy:{L:[N("(日和坐在地上,揉著那隻有舊傷的腳踝。)"),["hy","轉圈的時候,腳踝突然沒有力氣……代表,我不是故意的。","sad"],["hy","大家的隊形都被我弄亂了……","sad"]],
     C:[["(蹲下來,幫她把冰敷袋按好)","陪著",[["hy","……冰冰的。可是心裡暖暖的。","moved"]]],["「妳的腳比隊形重要。」","鼓勵",[["hy","……代表。這句話,不准收回喔。","shy"]]],["「明天先讓物理治療師看看,我陪妳去。」","出手幫忙",[["hy","嗯……代表陪我的話,我就不怕了。","smile"]]]]},
  he:{L:[N("(夏恩在待機室的沙發上,用毛巾蓋住了臉。)"),["he","……換位的時候我站錯邊了。河嵐差點撞到我。","sad"],["he","我平常還一直念她要看地上的記號……","sad"]],
     C:[["(在她旁邊坐下,遞過去一罐香蕉牛奶)","陪著",[["he","……你又知道我想喝這個了。","moved"]]],["「站錯邊的夏恩,還是笑得最好看的那個。」","鼓勵",[["he","哎唷……代表怎麼這時候說這種話啦。","shy"]]],["「明天練習室,我幫妳們把記號貼得更清楚。」","出手幫忙",[["he","好。那我負責做點心,你負責貼記號。成交~","wink"]]]]},
  hr:{L:[N("(河嵐坐在待機室門口的台階上,鞋帶散了也沒綁。)"),["hr","代表……我那段舞步整個忘了。腦袋一片空白。","sad"],["hr","泰梨歐尼教了我好多次的……","sad"]],
     C:[["(蹲下來,幫她把鞋帶綁好)","陪著",[["hr","……代表綁的蝴蝶結,好醜。可是我喜歡。","laugh"]]],["「忘記一次,下次就記得更牢。」","鼓勵",[["hr","嗯!下一場我一定一次都不會錯!","laugh"]]],["「回去我請泰梨再教一次,我在旁邊幫妳錄影。」","出手幫忙",[["hr","好!代表要錄我最帥的角度喔!","laugh"]]]]}}};
const comfortSn=d=>{ const c=CF[d.kind]?.[d.id]; if(!c) return null;
  const lib=(()=>{ try{ const L=window.scriptsPool?.({types:["promo"],ev:"comfort_"+d.kind,member:d.id})||[]; return L.length?L[0]:null }catch(e){ return null } })(); if(lib) return lib;
  return {code:`promo-comfort-${d.kind}-${d.id}`,type:"promo",who:[d.id],member:d.id,nodes:{start:{L:c.L,C:c.C.map(([t,s,r])=>({t,s,to:d.id,g:2,r}))}}} };
const boost=d=>{ const s=S.m[d.id]; if(s){ s.mood=clamp(s.mood+10,0,100); s.stress=clamp((s.stress||0)-5,0,100) } window.stageMoodAdd?.(d.id,12); d.done=1; save(true);
  setTimeout(()=>fx(d.id,"心情 +10"),400) };
/* 結果畫面的卡(你在電視台的時候) */
window.promoDownCard=()=>{ const d=downNow(); if(!d||d.auto) return ""; const m=byId(d.id);
  const t=d.kind==="crack"?`${m.n}在${esc(d.show||"台上")}的高音破了。下台後她一直低著頭,沒有跟大家說話。`:`${m.n}那段跳錯的地方,已經被剪成影片。下台後她一個人坐在角落,一直重播那一段。`;
  return `<div class="tcomf" style="--c:${m.c}"><span class="f" style="--c:${m.c};background-image:url(${spr(d.id,null,"sad")})"></span><div><small>下台以後</small><p>${t}</p></div><button id="tvComfort">去待機室找她</button></div>` };
window.promoComfortNow=()=>{ const d=downNow(); if(!d) return; const sn=comfortSn(d); if(!sn) return;
  window.visitScene?.("tvroom",{sn,who:[d.id],n:"電視台・待機室",sub:`${d.show||""} 生放送之後`,bg:`assets/bg/backstage_${SLOTS[S.slot]?.light==="night"?"night":"evening"}.webp`,done:()=>boost(d)}) };
/* 沒去的那天:當天跟她聊天就是安慰場景(game.js talk) */
window.promoTalk=(id,pid)=>{ const d=downNow(); if(!d||d.id!==id) return null; const sn=comfortSn(d); if(!sn) return null;
  const when=d.day<S.day?"昨天":"今天", pre=d.auto?[N(d.kind==="crack"?`(${when}的${d.show||"打歌"}你沒去。聽說她的高音破了。)`:`(${when}的${d.show||"打歌"}你沒去。聽說她跳錯了一段,已經被剪成影片。)`)]:[];
  boost(d); return {...sn,nodes:{start:{L:[...pre,...sn.nodes.start.L],C:sn.nodes.start.C}}} };
window.promoDownOf=id=>{ const d=downNow(); return d&&d.id===id?d:null };
})();
