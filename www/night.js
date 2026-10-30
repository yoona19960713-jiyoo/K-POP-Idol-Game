"use strict";
/* =====================================================================
   深夜(改版 1.0 第 4 輪後半)
   每天晚上先決定今晚會發生什麼(用日期當種子,重新整理也一樣):
     失眠 insomnia:00:30~02:30,某個人睡不著,在客廳或廚房(日和想家、藝瑟壓力最常見)
     宵夜 snack  :23:10~00:40,某個人偷偷在廚房煮泡麵、或在便利商店(泰梨、夏恩、河嵐最常見)
     頂樓 roof   :23:00~01:00,某個人在頂樓吹風
     訊息 msg    :23:30~01:30 之間,某個人傳一則深夜訊息
   那段時間她會在那個地方(蓋過作息表);你走進那裡(或從互動面板按聊天)就演深夜的小劇情,
   內容先找內容庫的 night(種類、成員、關係段落、地點、時間),沒有就用內建版本。演完扣時間(15~20 分)
   ===================================================================== */
(()=>{
const DY=window.DAILY;
const WIN={insomnia:[1470,1590],snack:[1390,1480],roof:[1380,1500]};
const P={insomnia:{hy:3,ys:2,hr:1.5,he:1,tr:.3},snack:{tr:3,he:2,hr:2,ys:1,hy:1},roof:{tr:2,hy:2,ys:2,he:1,hr:1},msg:{ys:1,tr:1,hy:1,he:1,hr:1}};
const CH={insomnia:.35,snack:.3,roof:.25,msg:.45};
const DOING={insomnia:"睡不著",snack:"偷吃宵夜",roof:"在頂樓吹風"};
function plan(){ if(S.night?.day===S.day) return S.night; const r=rng(seedOf(S.day,"night")), used=new Set(), ev=[];
  const pick=w=>{ const ok=Object.fromEntries(Object.entries(w).filter(([id])=>!used.has(id))); const id=pickKey(ok,r); used.add(id); return id };
  for(const k of ["roof","snack","insomnia"]) if(r()<CH[k]){ const id=pick(P[k]), room=k==="roof"?"roof":k==="snack"?(r()<.7?"kitchen":"store"):(r()<.6?"living":"kitchen");
    ev.push({k,id,room,from:WIN[k][0],to:WIN[k][1],done:0}) }
  const msg=r()<CH.msg?{id:pick(P.msg),at:1410+Math.floor(r()*12)*10,sent:0}:null;
  return S.night={day:S.day,ev,msg} }
const live=e=>!e.done&&S.min>=e.from&&S.min<e.to;
window.nightWhere=()=>{ for(const e of plan().ev) if(live(e)){ S.where[e.id]=e.room; if(S.doing) S.doing[e.id]=DOING[e.k] } };
window.nightKey=()=>plan().ev.filter(live).map(e=>e.k+e.id).join(",");
/* 深夜訊息:時間到了就傳(有選項的內容庫版本可以回) */
window.nightTick=()=>{ const m=plan().msg; if(!m||m.sent||S.min<m.at||S.min>=m.at+120) return; m.sent=1;
  const sn=fromLib("msg",m.id,""); if(sn&&window.phoneSnip?.(m.id,sn)){ save(true); return }
  const L=MSG_FB[m.id]; if(L) window.phoneSay?.(m.id,L.map(t=>[m.id,t])); save(true) };
/* ---------- 內建版本 ---------- */
const N=t=>["",t];
const FB={
  insomnia:{sc:{living:"深夜的宿舍只剩冰箱的嗡嗡聲。客廳只開了一盞小燈,沙發上縮著一個人影。",kitchen:"大家都睡了,廚房的燈卻還亮著,水壺剛燒開,冒著白白的蒸氣。"},
    in:"(她抱著膝蓋,看到你時愣了一下。)",out:"(過了一陣子,她的眼皮慢慢變重,打了一個小小的呵欠。)",
    C:[["(坐到她旁邊,陪她一起發呆。)","陪著",3],["「要不要喝杯溫牛奶?我去熱。」","出手幫忙",3],["「睡不著也沒關係,我陪你聊到想睡。」","安慰",2]],
    s:{ys:["……代表也還沒睡?我在想明天的練習表,想著想著就睡不著了。","shy"],tr:["……睡不著。在想歌詞。","neutral"],hy:["……代表。我睡不著。……有點想家。","shy"],
       he:["哎唷,被抓到了~肚子餓又睡不著。","pout"],hr:["代表?我、我睡不著……腦袋裡一直在唱明天的歌。","shy"]},
    e:{ys:["……謝謝代表。我好像可以睡了。晚安。","smile"],tr:["……嗯。去睡了。你也是。","shy"],hy:["代表在旁邊,好像就沒那麼想家了。おやすみなさい。","smile"],
       he:["晚安~明天早餐我多煎一顆蛋給你。","smile"],hr:["晚安代表!……嘿嘿,今天的事是秘密喔。","wink"]}},
  snack:{sc:{kitchen:"深夜的廚房只開了抽油煙機的燈,鍋裡的水正要滾。",store:"深夜的便利商店,收銀台旁的關東煮冒著熱氣。"},
    in:"(她回頭,手上還拿著一包泡麵,像被抓到的小偷。)",out:"(兩個人頭靠著頭吃完了宵夜,湯都喝光了。)",
    C:[["(拿兩雙筷子,坐下來一起吃。)","陪著",3],["「一包就好,我幫你把風。」","開玩笑",2],["「多加一顆蛋吧,我來打。」","出手幫忙",3]],
    s:{ys:["……我是隊長,所以這是在試吃。對吧?","pout"],tr:["……噓。一包而已。","neutral"],hy:["日本的泡麵……我好想吃。代表不會說出去吧?","shy"],
       he:["代表!要不要一起吃?我多煮一份!","laugh"],hr:["代、代表!這是明天的早餐……騙你的。","surprise"]},
    e:{ys:["這是我們的秘密。晚安,代表。","wink"],tr:["……共犯。不准說出去。","smile"],hy:["好好吃……謝謝代表。おやすみなさい。","smile"],
       he:["深夜的泡麵果然最好吃~明天一起跑步喔!","laugh"],hr:["好幸福……明天我會多跑兩圈的!真的!","laugh"]}},
  roof:{sc:{roof:"深夜的頂樓,小燈泡在風裡輕輕晃。遠處的城市還沒睡。"},
    in:"(她靠在欄杆上,聽到門的聲音回過頭。)",out:"(風把她的頭髮吹亂了。你們在頂樓待了一陣子,才一起下樓。)",
    C:[["(站到她旁邊,不說話,一起看城市。)","陪著",3],["「一定會出道的。我看過你們每天練習的樣子。」","鼓勵",3],["「冷嗎?外套借你。」","出手幫忙",3]],
    s:{ys:["代表……我有時候會想,我們真的出道得了嗎?","serious"],tr:["……這裡風比較大。腦袋會清楚一點。","neutral"],hy:["在日本的家人,現在也睡了吧。","smile"],
       he:["代表也睡不著嗎?來,這裡看得到漢江。","smile"],hr:["代表!你看,今天看得到星星耶!","laugh"]},
    e:{ys:["……說出來就好多了。謝謝你聽我說。","smile"],tr:["……下次睡不著,我會在這裡。","shy"],hy:["代表在的話,半夜的頂樓一點都不冷。","shy"],
       he:["回去睡吧~明天見,代表。","smile"],hr:["今天的星星,我會記得的!晚安代表!","laugh"]}}};
const MSG_FB={ys:["代表還醒著嗎?今天謝謝你。早點睡喔。"],tr:["……還沒睡?","沒事。晚安。"],hy:["代表,おやすみなさい。今天也辛苦了。"],
  he:["代表~睡前記得喝水!晚安晚安~"],hr:["代表!我剛剛夢到我們出道了!……啊,我還沒睡著。晚安!"]};
function fallback(k,id,room){ const F=FB[k]; if(!F||!F.s[id]) return null;
  return {code:`fbnight-${k}-${id}`,type:"night",nk:k,member:id,who:[id],cd:0,sc:F.sc[room]||Object.values(F.sc)[0],
    nodes:{start:{L:[N(F.in),[id,...F.s[id]]],C:F.C.map(([t,s,g])=>({t,s,to:id,g,next:"b"}))},b:{L:[N(F.out),[id,...F.e[id]]],C:[]}}} }
function fromLib(k,id,room){ const band=DY.bandOf(stageOf(id)), h=S.min/60;
  const L=snips().filter(sn=>sn.type==="night"&&sn.nk===k&&(sn.member===id||sn.who?.[0]===id)&&(!sn.band||sn.band===band)&&(!sn.room||!room||sn.room===room)
    &&(!sn.hour||(h>=sn.hour[0]&&h<sn.hour[1]))&&dateOk(sn)&&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||5))&&sn.nodes?.start);
  return L.length?fillVars(pickW(L)):null }
/* 走進那個房間(或從互動面板按聊天)時:有她的深夜事件就演 */
window.nightScene=(pid,only)=>{ const e=plan().ev.find(x=>live(x)&&x.room===pid&&S.where[x.id]===pid&&(!only||x.id===only)); if(!e) return null;
  const sn=fromLib(e.k,e.id,pid)||fallback(e.k,e.id,pid); if(!sn) return null;
  return {sn,id:e.id,done:()=>{ e.done=1; S.where[e.id]=e.room; window.spendTime?.(DY.NK[e.k]?.min||15,"深夜"); save(true) }} };
})();
