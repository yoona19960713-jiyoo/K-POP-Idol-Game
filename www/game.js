"use strict";
/* =====================================================================
   K-POP Idol Game ・ 遊戲本體
   主畫面(公司地圖、時段、行動)+ 拜訪對話。讀取衣帽間工坊的日常衣櫃與劇本工坊的片段庫。
   ===================================================================== */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=n=>String(n).padStart(2,"0");
function toast2(t){const e=$("#toast2");e.textContent=t;e.classList.add("on");clearTimeout(toast2.t);toast2.t=setTimeout(()=>e.classList.remove("on"),2200)}

/* ---------- 成員 ---------- */
const M=[
  {id:"ys",f:"yeseul",n:"藝瑟",c:"#7B4FBF",cm:168,re:/藝瑟|Yeseul/i},
  {id:"tr",f:"taeri", n:"泰梨",c:"#C8102E",cm:167,re:/泰梨|Taeri/i},
  {id:"hy",f:"hiyori",n:"日和",c:"#C9A35E",cm:165,re:/日和|Hiyori/i},
  {id:"he",f:"haeun", n:"夏恩",c:"#E9746A",cm:163,re:/夏恩|Haeun/i},
  {id:"hr",f:"haram", n:"河嵐",c:"#7FAF2C",cm:160,re:/河嵐|Haram/i}];
const byId=id=>M.find(m=>m.id===id);
const EXPR=["neutral","smile","laugh","sad","angry","shy"];
/* 回應方式對每位成員的倍率(日常層規格) */
const PREF={ys:{安慰:1,鼓勵:1.2,嚴厲:.3,開玩笑:1,轉移話題:.5,陪著:1.3,出手幫忙:.5},tr:{安慰:.2,鼓勵:.6,嚴厲:1.1,開玩笑:1.3,轉移話題:.6,陪著:1.1,出手幫忙:-.3},
  hy:{安慰:.9,鼓勵:1.1,嚴厲:-.4,開玩笑:1,轉移話題:.6,陪著:.9,出手幫忙:1.1},he:{安慰:.7,鼓勵:.9,嚴厲:.9,開玩笑:1.2,轉移話題:.4,陪著:.8,出手幫忙:.7},
  hr:{安慰:1.2,鼓勵:1.3,嚴厲:-.7,開玩笑:.6,轉移話題:.3,陪著:.9,出手幫忙:1}};
const WARM=["安慰","鼓勵","陪著"];

/* ---------- 時段 ---------- */
const SLOTS=[
  {n:"清晨",light:"dawn",   from:6*60, to:9*60},
  {n:"上午",light:"day",    from:9*60, to:12*60},
  {n:"下午",light:"day",    from:12*60,to:18*60},
  {n:"晚上",light:"evening",from:18*60,to:22*60},
  {n:"深夜",light:"night",  from:22*60,to:26*60}];
const SLOT_SEC=144;               // 12 分鐘 ÷ 5 個時段
const START=new Date(2015,6,3);   // 2015.07.03
const WD=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
const dateOf=day=>{const d=new Date(START);d.setDate(d.getDate()+day);return d};
const seasonOf=d=>{const m=d.getMonth()+1;return m>=3&&m<=5?"春":m>=6&&m<=8?"夏":m>=9&&m<=11?"秋":"冬"};
const periodNow=()=>"練習生期";

/* ---------- 地點:sp = 劇本工坊的地點代號 ---------- */
const PLACES=[
  {id:"practice",g:"公司大樓",n:"練習室",   sp:"practice",open:[0,1,2,3,4]},
  {id:"studio",  g:"公司大樓",n:"錄音室",   sp:"studio",  open:[1,2,3]},
  {id:"office",  g:"公司大樓",n:"代表辦公室",sp:"office",  open:[1,2,3]},
  {id:"styling", g:"公司大樓",n:"造型室",   sp:"styling", open:[1,2,3]},
  {id:"living",  g:"宿舍",   n:"客廳",     sp:"dorm",    open:[0,3,4]},
  {id:"kitchen", g:"宿舍",   n:"廚房",     sp:"dorm",    open:[0,3,4]},
  {id:"bed_ys",  g:"宿舍",   n:"藝瑟的房間", sp:"dorm",    open:[0,3,4],base:"bedroom",owner:"ys"},
  {id:"bed_tr",  g:"宿舍",   n:"泰梨的房間", sp:"dorm",    open:[0,3,4],base:"bedroom",owner:"tr"},
  {id:"bed_hy",  g:"宿舍",   n:"日和的房間", sp:"dorm",    open:[0,3,4],base:"bedroom",owner:"hy"},
  {id:"bed_he",  g:"宿舍",   n:"夏恩的房間", sp:"dorm",    open:[0,3,4],base:"bedroom",owner:"he"},
  {id:"bed_hr",  g:"宿舍",   n:"河嵐的房間", sp:"dorm",    open:[0,3,4],base:"bedroom",owner:"hr"},
  {id:"store",   g:"外面",   n:"便利商店",  sp:"out",     open:[3,4]},
  {id:"river",   g:"外面",   n:"漢江邊",   sp:"out",     open:[3,4]}];
const PL=Object.fromEntries(PLACES.map(p=>[p.id,p]));
const baseOf=pid=>PL[pid]?.base||pid;
const openText=p=>p.open.length===5?"全天開放":p.open.map(i=>SLOTS[i].n).join("、")+"開放";
const WHERE={
  ys:[{practice:3,kitchen:2,living:1},{practice:4,styling:1},{practice:3,studio:2},{practice:3,living:2,kitchen:1},{practice:3,living:1,river:1,bedroom:1}],
  tr:[{bedroom:3,practice:1},{practice:3,studio:2},{studio:3,practice:2},{practice:2,bedroom:2,studio:1},{bedroom:2,store:2,practice:1}],
  hy:[{practice:3,kitchen:1},{practice:2,"外出:韓語課":2},{practice:4,styling:1},{practice:2,living:2},{living:1,bedroom:2,practice:1}],
  he:[{kitchen:3,bedroom:1},{practice:3,styling:1,"外出:個人拍攝":1},{practice:2,studio:1,styling:1,"外出:個人拍攝":1},{kitchen:3,living:1,practice:1},{living:2,bedroom:2}],
  hr:[{bedroom:3,kitchen:1},{practice:3,"外出:聲樂課":1},{practice:3,studio:1},{living:3,practice:1,store:1},{practice:2,store:1,bedroom:1}]};

/* ---------- 示範文字(劇本工坊沒有對應片段時才用) ---------- */
const SCN={practice:"鏡子前的音樂還在放,地板上散著毛巾和水瓶。",studio:"隔音門關上的瞬間,外面的聲音全部消失了。",office:"你的辦公室。桌上的企劃書疊得比昨天更高。",styling:["","上午的陽光從落地窗斜斜照進來,衣架上新到的打歌服還套著防塵袋,空氣裡有淡淡的熨斗蒸氣味。","下午的造型室最熱鬧:化妝鏡的燈泡一盞盞亮著,桌上攤著色票和飾品盒,試衣間的布簾拉開又拉上。","入夜後只剩衣架間的投射燈還亮著,鏡子裡映著一排排亮片與緞面,地上散著幾根被拆下的吊牌。",""],
  living:"客廳的電視開著,沙發上堆著抱枕和還沒摺的衣服。",kitchen:"廚房飄著味道,水槽裡泡著幾個碗。",bedroom:"你敲了敲寢室半開的門,裡面的燈還亮著。",
  store:"便利商店的自動門叮咚一聲打開,冷氣撲面而來。",river:"江風吹過來,對岸的燈一盞一盞亮著。"};
const EMPTY={practice:"這裡現在沒有人。鏡子上貼著一張寫滿走位的便條。",studio:"這裡現在沒有人。控制台上放著一張寫了一半的歌詞。",office:"辦公室只有你一個人。祕書留了一疊待簽的文件。",styling:["","造型室裡只有造型師在核對新到的衣服清單,一件件掛上衣架。","造型師把明天要用的配件排在絨布托盤上,現在沒有成員在這裡。","造型室已經沒有人了,只剩全身鏡旁的小燈還亮著,衣架上的打歌服靜靜垂著。",""],
  living:"客廳現在沒有人。遙控器被塞在沙發縫裡。",kitchen:"廚房現在沒有人。冰箱上貼著一張「不准偷吃」的紙條。",bedroom:"寢室裡沒有人,床鋪整理得比你想的還整齊。",
  store:"店裡只有店員在補貨,沒有認識的人。",river:"江邊只有慢跑的人和腳踏車,沒有認識的人。"};
const LINES={
  ys:[["代表來了啊~要不要一起看剛剛的練習影片?","smile"],["我在想下週的練習表,日和最近好像太累了。","neutral"],["沒事沒事,我只是在發呆而已。","smile"]],
  tr:[["……有事?","neutral"],["我在忙。……你可以坐那邊。","neutral"],["剛剛那段你有聽到嗎?不要說客套話。","neutral"]],
  hy:[["代表!今天學了一個新的韓文單字,好難懂喔。","smile"],["大丈夫です,我不累。","smile"],["跳舞的時候,腦袋最安靜。","neutral"]],
  he:[["代表吃飯了沒?我多做了一份喔~","smile"],["哎呀,被看到素顏了。","smile"],["今天被誇了……可是我想被誇的不是臉。","neutral"]],
  hr:[["代表!你聽你聽,我今天高音過了!","smile"],["濟州現在應該在下雨吧……","neutral"],["我沒有偷吃零食喔!這是、這是大家的!","smile"]]};
const ABSENT={practice:["{a}一個人留下來加練,鏡子上留著擦不掉的手印。","{a}和{b}為了走位吵了兩句,後來又一起去買飲料。"],studio:["{a}在錄音室待了很久,錄了一段沒給任何人聽的 demo。"],
  living:["{a}和{b}窩在沙發看綜藝,笑聲傳到走廊。","{a}在客廳睡著了,有人幫她蓋了毯子。"],kitchen:["{a}煮了一鍋湯,留了一碗在冰箱。","{a}和{b}搶最後一個布丁,最後一人一半。"],
  bedroom:["{a}一直待在房間裡,門關著,裡面傳出小小的歌聲。"],store:["{a}去便利商店買了大家份的冰。"],river:["{a}在漢江邊坐了很久,回來時鞋子上都是沙。"]};
const MSG={ys:[["代表今天也辛苦了~明天的行程我會再確認一次!",[3,4]],["練習室的冷氣好像怪怪的,可以請人來看一下嗎?",[0,1,2]]],tr:[["(一段 30 秒的錄音)",[3,4]],["明天的編舞,我有想法。",[2,3,4]]],
  hy:[["代表,不好意思這麼晚。韓文的「心很累」要怎麼說比較自然呢?",[4]],["今天的韓語課被老師稱讚了!",[2,3]]],he:[["代表吃飯了嗎~宿舍還有我煮的湯喔",[2,3]],["明天早上要拍照,我會早點睡的!",[3,4]]],
  hr:[["代表早安!!今天天氣超好 我要第一個到練習室!!",[0,1]],["濟州的橘子季要到了……",[2,3,4]]]};

/* 內建示範劇情(劇本工坊還沒有片段時才會出現) */
const BUILTIN=[
 {code:"demo-ys-1",type:"long",member:"ys",stage:"*",at:"practice",sl:[4],who:["ys"],w:5,cd:30,sc:"深夜的練習室只剩一盞燈,藝瑟坐在地上看手機,看到你立刻笑著把螢幕轉過來。",nodes:{
  start:{L:[["ys","代表~你看,這是我以前那個團的新聞,解散了耶。","smile"],["ys","那團比較慘啦哈哈。","laugh"]],C:[{t:"(陪著笑)「哈哈,是喔。」",s:"開玩笑",to:"ys",g:0,r:[["ys","對吧~好啦,我也該回去睡了!","smile"]]},{t:"「妳笑得好用力。」",s:"陪著",to:"ys",g:1,next:"b"},{t:"「……那時候,妳也在那個團吧?」",s:"安慰",to:"ys",g:1,next:"c"}]},
  b:{L:[["ys","……","sad"],["","(她的笑容停住了。)"],["ys","代表怎麼這樣啦。","sad"]],C:[{t:"坐到她旁邊,不說話。",s:"陪著",to:"ys",g:2,next:"d"},{t:"「不想說也沒關係。」",s:"安慰",to:"ys",g:1,r:[["ys","嗯……謝謝。","sad"]]}]},
  c:{L:[["ys","啊……代表知道啊。嗯,是我以前的團。","sad"]],C:[{t:"「想聊嗎?」",s:"陪著",to:"ys",g:1,next:"d"},{t:"「那是公司的錯,不是妳的。」",s:"安慰",to:"ys",g:1,r:[["ys","……我知道。只是有時候會忘記。","sad"]]}]},
  d:{L:[["ys","我那時候以為,只要再撐三個月就好了。","sad"],["ys","三個月後,公司說我們不用出道了。","sad"],["ys","……所以現在,我每天都有點怕。","sad"]],C:[{t:"「這次不會。」",s:"鼓勵",to:"ys",g:2,next:"e"},{t:"「怕也沒關係,我在。」",s:"陪著",to:"ys",g:2,next:"e"}]},
  e:{L:[["","(她終於真的笑了一下。)"],["ys","……那句是我的台詞耶。","smile"],["ys","代表呢?為什麼要開這間公司?你明明可以去做別的事。","neutral"]],C:[{t:"「因為我想做一個不會被丟下的團。」",s:"陪著",to:"ys",g:2,next:"g"},{t:"「錢太多,找點事做。」",s:"開玩笑",to:"ys",g:1,next:"f2"},{t:"「因為那天在練習室,聽到妳唱歌。」",s:"鼓勵",to:"ys",g:2,heart:1,next:"f3"}]},
  f2:{L:[["ys","噗——財閥的煩惱好奢侈喔!","laugh"],["ys","……不過,幸好你錢太多。因為這樣,我才有第二次機會。","smile"]],C:[{t:"「這次的機會,是妳自己贏來的。」",s:"鼓勵",to:"ys",g:2,next:"g"}]},
  f3:{L:[["ys","欸?!","shy"],["","(她拿起毛巾擋住臉。)"],["ys","代表突然說這個幹嘛啦!……那天我唱得很爛耶。","shy"]],C:[{t:"「我覺得很好。」",s:"鼓勵",to:"ys",g:1,next:"g"},{t:"「爛到我記住了。」",s:"開玩笑",to:"ys",g:1,next:"g"}]},
  g:{L:[["","(她從口袋拿出一罐草莓牛奶,遞給你。)"],["ys","給你,封口費。今天我說的話,不准跟成員講喔~","smile"],["ys","好啦,很晚了。隊長命令:代表也要回去睡覺!","laugh"]],C:[{t:"「晚安,隊長。」",s:"陪著",to:"ys",g:1,r:[["ys","晚安~","smile"]]}]}}},
 {code:"demo-tr-1",type:"encounter",member:"tr",stage:"*",at:"practice",sl:[1,2,3],who:["tr"],w:4,cd:20,sc:"你經過休息室,聽到幾個練習生在說泰梨每次都擺臉色、很難相處。轉角,泰梨站在那裡。",nodes:{
  start:{L:[["tr","……","neutral"]],C:[{t:"「要我去說他們嗎?」",s:"出手幫忙",to:"tr",g:1,r:[["tr","……不用。說了也沒用。","sad"]]},{t:"「妳剛剛,是在生氣嗎?」",s:"陪著",to:"tr",g:1,next:"b"},{t:"「妳在瞪我?」",s:"開玩笑",to:"tr",g:1,r:[["tr","……沒有。這是我平常的臉。","angry"],["tr","……好啦,有一點。","shy"]]}]},
  b:{L:[["tr","……不是。","sad"],["tr","我不是在生氣,我只是……不知道要說什麼。","shy"]],C:[{t:"「我懂。我第一次見投資人也是這樣。」",s:"開玩笑",to:"tr",g:2,next:"c"},{t:"「那就慢慢來,想到再說。」",s:"陪著",to:"tr",g:2,next:"c"}]},
  c:{L:[["tr","……代表也會緊張?看不出來。","smile"],["","(她的嘴角動了一下。)"],["tr","……為什麼電腦不會感冒?","neutral"],["tr","因為它有……防毒軟體。","smile"]],C:[{t:"笑出來。",s:"開玩笑",to:"tr",g:3,r:[["","(她看你在笑,自己也笑到停不下來。)"],["tr","……這個我想了三天。","laugh"]]},{t:"「……這個不好笑。」",s:"嚴厲",to:"tr",g:0,r:[["tr","我知道。下次會更好笑。","sad"]]}]}}},
 {code:"demo-he-1",type:"encounter",member:"he",stage:"*",at:"dorm",room:"kitchen",sl:[3,4],who:["he"],w:5,cd:20,sc:"晚上十一點,宿舍廚房的燈還亮著。夏恩背對門口,正要把泡麵放進鍋子,聽到腳步聲整個人僵住。",nodes:{
  start:{L:[["he","……代表?","shy"],["he","這、這不是我的,是河嵐的。","smile"]],C:[{t:"「河嵐在房間睡覺喔。」",s:"開玩笑",to:"he",g:1,next:"b"},{t:"「餓了就吃,沒關係。」",s:"陪著",to:"he",g:1,next:"c"}]},
  b:{L:[["he","……被抓到了。","laugh"],["he","拜託不要跟經紀人說,明天要拍形象照。","sad"]],C:[{t:"「我不說,但要分我一口。」",s:"開玩笑",to:"he",g:2,heart:1,next:"d"},{t:"「拍照前一晚還吃?」",s:"嚴厲",to:"he",g:0,next:"e"}]},
  c:{L:[["he","真的嗎?……大家都說我是門面,所以我連吃東西都要很小心。","sad"],["he","有時候覺得,我的工作好像就是『不要變胖』。","sad"]],C:[{t:"「妳的工作是站在中間,讓大家看見這個團。」",s:"鼓勵",to:"he",g:3,next:"d"},{t:"「門面也會餓。」",s:"陪著",to:"he",g:2,next:"d"}]},
  e:{L:[["he","……我知道啦。","angry"],["he","可是我今天只吃了一碗沙拉耶!代表你知道那有多難過嗎!","angry"]],C:[{t:"「……好,煮吧。半包。」",s:"陪著",to:"he",g:1,next:"d"}]},
  d:{L:[["he","那我煮兩包喔,代表一包。","smile"],["","(她熟練地打了一顆蛋進去,香味一下子飄滿整個廚房。)"],["he","吃完要一起洗碗喔,這是共犯的規定。","laugh"]],C:[{t:"「好,共犯。」",s:"陪著",to:"he",g:1,r:[["he","……謝謝你,代表。今天的泡麵特別好吃。","smile"]]}]}}},
 {code:"demo-hr-1",type:"encounter",member:"hr",stage:"*",at:"practice",sl:[3,4],who:["hr"],w:5,cd:20,sc:"河嵐一個人在練習室對著鏡子唱同一段高音,唱到一半停下來,用濟州話罵了自己一句。",nodes:{
  start:{L:[["hr","哎唷,怎麼又破……","angry"],["hr","代表?!你、你什麼時候來的!","shy"]],C:[{t:"「再唱一次,我聽。」",s:"鼓勵",to:"hr",g:2,next:"b"},{t:"「剛剛那句方言是什麼意思?」",s:"開玩笑",to:"hr",g:1,next:"c"}]},
  b:{L:[["","(她深吸一口氣,這次唱上去了。練習室安靜了好幾秒。)"],["hr","……剛剛那個,有過嗎?","neutral"]],C:[{t:"「有。很好聽。」",s:"鼓勵",to:"hr",g:3,next:"d"}]},
  c:{L:[["hr","沒、沒什麼!就是……笨蛋的意思啦。","shy"],["hr","大家都練了好幾年,我才兩個月。不練多一點,會被說是運氣好。","sad"]],C:[{t:"「妳的聲音不是運氣。」",s:"鼓勵",to:"hr",g:3,next:"d"}]},
  d:{L:[["hr","代表,我在濟州的時候,唱歌都是對著海唱的。海不會說我才練兩個月。","smile"],["hr","我唱一首外婆以前常唱的歌給你聽好不好!","laugh"]],C:[{t:"「好,我聽。」",s:"陪著",to:"hr",g:2,r:[["","(她小聲唱起一首聽不懂歌詞的民謠,溫柔又安靜。)"],["hr","……這首歌,是外婆在海邊等外公回來的時候唱的。","sad"],["hr","代表,如果我們去濟州辦演唱會,你會坐第一排嗎?","smile"]]}]}}}];

/* ---------- 存檔 ---------- */
const KEY="kpopGame.save";
function fresh(){return {v:1,day:0,slot:0,t:0,acts:5,visited:[],speed:1,
  m:{ys:{trust:30,heart:0,mood:60,stress:40},tr:{trust:10,heart:0,mood:55,stress:35},hy:{trust:25,heart:0,mood:50,stress:45},he:{trust:35,heart:0,mood:70,stress:30},hr:{trust:45,heart:0,mood:65,stress:35}},
  where:{},flags:{},seen:{},absent:[],msgs:[],unread:0,wear:null,lastWear:{},updatedAt:0}}
let S; try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.m) S=fresh();
/* updatedAt 只在有進度時更新(換時段、拜訪、做選擇),用來判斷雲端與本機哪份較新;時間流動只存本機 */
function save(progress){if(progress) S.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ---------- 本機快取(IndexedDB):片段庫與衣櫃 ---------- */
const IDB={db:null,
  open(){return new Promise(ok=>{try{const r=indexedDB.open("kpopGame",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>{this.db=r.result;ok()};r.onerror=()=>ok()}catch(e){ok()}})},
  get(k){return new Promise(ok=>{if(!this.db) return ok(null);const q=this.db.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>ok(q.result??null);q.onerror=()=>ok(null)})},
  set(k,v){return new Promise(ok=>{if(!this.db) return ok();const t=this.db.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=()=>ok();t.onerror=()=>ok()})}};
let SCRIPTS={};   // code → 片段(只留已收錄的)
let ITEMS={};     // code → 衣帽間造型(精簡)
let WMEM={};      // 衣帽間成員欄位 m1..m5 → ys..hr
let WMETA=[];     // 衣帽間成員資料(含生圖底模 gen 的 blob 參照)

/* ---------- 雲端(Firestore REST,跟其他工具同一套) ---------- */
const SY_CFG="kpopSync.cfg",SY_AUTH="kpopSync.auth";
const syCfg=()=>{try{return JSON.parse(localStorage.getItem(SY_CFG)||"null")}catch(e){return null}};
const syAuth=()=>{try{return JSON.parse(localStorage.getItem(SY_AUTH)||"null")}catch(e){return null}};
let syTok=null,syBusy=false,syLastPush=0,pushT=0;
const SY_ERR={INVALID_LOGIN_CREDENTIALS:"Email 或密碼錯誤。",INVALID_PASSWORD:"Email 或密碼錯誤。",EMAIL_NOT_FOUND:"Email 或密碼錯誤。",INVALID_EMAIL:"Email 格式不對。",
  API_KEY_INVALID:"Firebase 設定的 apiKey 不正確。",PERMISSION_DENIED:"Firestore 安全規則擋住了,請確認規則已發布。",NOT_FOUND:"找不到 Firestore 資料庫。",TOKEN_EXPIRED:"登入已過期,請重新登入。",network:"連不上雲端,請確認網路。"};
const syMsg=e=>{const c=String(e?.code||e||"");for(const k in SY_ERR) if(c.includes(k)) return SY_ERR[k];return "同步失敗:"+c.slice(0,80)};
async function syJSON(url,opt){let r;try{r=await fetch(url,opt)}catch(e){throw {code:"network"}}
  const j=await r.json().catch(()=>({})); if(!r.ok) throw {code:String(j?.error?.message||j?.error?.status||"HTTP "+r.status),status:r.status}; return j}
async function syToken(){const a=syAuth(),c=syCfg(); if(!a||!c) throw {code:"未登入"}; if(syTok&&syTok.exp>Date.now()) return syTok.id;
  const j=await syJSON(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(c.apiKey)}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(a.refreshToken)});
  a.refreshToken=j.refresh_token; localStorage.setItem(SY_AUTH,JSON.stringify(a)); syTok={id:j.id_token,exp:Date.now()+(+j.expires_in-60)*1000}; return syTok.id}
const syBase=()=>{const c=syCfg(),a=syAuth();return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(c.projectId)}/databases/(default)/documents/users/${a.uid}`};
async function syGet(path){const t=await syToken();try{return await syJSON(syBase()+"/"+path,{headers:{Authorization:"Bearer "+t}})}catch(e){if(e.status===404) return null;throw e}}
async function syPatch(path,fields){const t=await syToken();return syJSON(syBase()+"/"+path,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({fields})})}
async function syQuery(col,since){const t=await syToken();return syJSON(syBase()+":runQuery",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},
  body:JSON.stringify({structuredQuery:{from:[{collectionId:col}],where:{fieldFilter:{field:{fieldPath:"updatedAt"},op:"GREATER_THAN",value:{integerValue:String(since||0)}}}}})})}
function syStatus(t,err){const e=$("#syStatus");if(e){e.textContent=t;e.classList.toggle("err",!!err)} $("#syncDot").textContent=err?"同步失敗":t.startsWith("同步中")?"同步中…":""}

/* 從衣帽間與劇本工坊拉新資料(只拉上次之後有變動的) */
async function pullCollection(col,store,keep,slim){
  const k="kpopGame.pull."+col, since=+(localStorage.getItem(k)||0); let max=since, n=0;
  const rows=await syQuery(col,since);
  for(const r of rows){const d=r.document; if(!d) continue; const code=decodeURIComponent(d.name.split("/").pop()), up=+d.fields.updatedAt?.integerValue||0; max=Math.max(max,up);
    if(d.fields.deleted?.booleanValue){ if(store[code]){delete store[code];n++} continue }
    let it; try{it=JSON.parse(d.fields.json.stringValue)}catch(e){continue}
    if(keep(it)){store[code]=slim(it,code);n++} else if(store[code]){delete store[code];n++} }
  localStorage.setItem(k,String(max)); return n}
async function pullContent(){
  // 衣帽間成員欄位對應
  try{const meta=await syGet("meta/state"); const raw=meta?JSON.parse(meta.fields.json.stringValue):null; const mm=raw?.members||[];
    if(raw){ await IDB.set("wmetaRaw",raw); window.WMETA_AT=+meta.fields.updatedAt.integerValue }
    const map={}; for(const m of mm){const hit=M.find(x=>x.re.test((m.name||"")+" "+(m.en||""))); if(hit) map[m.id]=hit.id} if(Object.keys(map).length){WMEM=map;await IDB.set("wmem",WMEM)}
    if(mm.length){WMETA=mm; await IDB.set("wmeta",WMETA)}}catch(e){}
  // 舊版只存了精簡資料(沒有服裝描述),第一次換新版時整批重新下載
  if(localStorage.getItem("kpopGame.itemsFmt")!=="2"){ITEMS={}; localStorage.removeItem("kpopGame.pull.items")}
  const a=await pullCollection("items",ITEMS,it=>it.kind==="look",(it,code)=>({...it,code,seasons:Array.isArray(it.seasons)?it.seasons:[]}));
  await IDB.set("items",ITEMS); localStorage.setItem("kpopGame.itemsFmt","2");
  const b=await pullCollection("scripts",SCRIPTS,it=>it.status==="ok"||it.status==="auto",(it,code)=>({code,type:it.type,member:it.member||"",pair:it.pair||"",stage:it.stage||"",period:it.period||"",
    at:it.at,sl:it.sl||[],who:it.who||[],sc:it.sc||"",w:+it.w||3,cd:+it.cd||4,nodes:it.nodes||{}}));
  await IDB.set("scripts",SCRIPTS); localStorage.setItem("kpopGame.pulledOnce","1");
  return a+b}
/* 遊戲存檔:啟動時取較新的那份;遊戲中只上傳 */
async function pullSave(){const d=await syGet("game/state"); if(!d) return false; const at=+d.fields.updatedAt.integerValue;
  if(at>(S.updatedAt||0)){const o=JSON.parse(d.fields.json.stringValue); if(o&&o.m){S=o; try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){} return true}} return false}
async function pushSave(){if(!syAuth()||!syCfg()||!S.updatedAt) return; try{syLastPush=Date.now(); save(); await syPatch("game/state",{json:{stringValue:JSON.stringify(S)},updatedAt:{integerValue:String(S.updatedAt)}}); syStatus("已同步 "+new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"}))}catch(e){syStatus(syMsg(e),true)}}
function schedulePush(){if(!syAuth()) return; clearTimeout(pushT); pushT=setTimeout(pushSave,Math.max(3000,20000-(Date.now()-syLastPush)))}
async function syncAll(manual,atStart){
  if(!syAuth()||!syCfg()){ if(manual) toast2("請先登入雲端同步"); renderSources(); return }
  if(syBusy) return; syBusy=true; syStatus("同步中…");
  try{ if(window.pushOutbox) await pushOutbox(); const n=await pullContent(); let adopted=false;
    for(const h of window.SYNC_HOOKS||[]){ try{ await h() }catch(e){} }
    if(atStart||manual){ adopted=await pullSave() }
    if(!adopted) await pushSave();
    syStatus("已同步 "+new Date().toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"}));
    if(adopted){ensureWear(); renderAll(); toast2("已讀取雲端存檔")} else if(n){ensureWear(true); renderAll()}
    if(manual) toast2(n?`同步完成,更新了 ${n} 筆資料`:"同步完成"); }
  catch(e){syStatus(syMsg(e),true); if(manual) toast2(syMsg(e))}
  finally{syBusy=false; renderSources()}
}

/* ---------- 劇本片段 ---------- */
const cloudSnips=()=>Object.values(SCRIPTS);
const snips=()=>{const c=cloudSnips(); return c.length?c:BUILTIN};
const ENTRY=["encounter","practice","request","friction","surprise","worry","between","pairlong","long","chat"];
const TALK=["topic","chat","worry","request","encounter"];
const OFFICE=["chat","request","surprise","long","worry"];
const PAIR_TYPES=["between","group","pairlong","away"];
function stageOk(sn){if(PAIR_TYPES.includes(sn.type)) return true; if(!sn.stage||sn.stage==="*") return true; const id=sn.member||sn.who[0], cur=stageOf(id);
  const R=window.STAGE_RANK||[], deep=R.indexOf("戀人");
  if(sn.stage==="多人親密") return cur==="多人親密"&&(sn.who||[]).filter(x=>x!==id).every(x=>(window.multiPartners?.(id)||[]).includes(x));
  if(R.indexOf(sn.stage)>=deep&&R.indexOf(cur)>=R.indexOf(sn.stage)) return true;
  return sn.stage===cur}
function pool({sp,room,slot,present,types,member}){
  return snips().filter(sn=>sn.at===sp&&(!sn.room||sn.room===room)&&types.includes(sn.type)&&(!sn.sl?.length||sn.sl.includes(slot))&&sn.who?.length
    &&sn.who.every(id=>present.includes(id))&&(!member||(sn.member||sn.who[0])===member)&&stageOk(sn)&&(!sn.period||sn.period===periodNow())
    &&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||4))&&sn.nodes?.start)}
function pickW(list,r=Math.random){if(!list.length) return null; const w=list.map(sn=>(sn.w||3)*(S.seen[sn.code]==null?2:1)); let x=r()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<list.length;i++){x-=w[i];if(x<=0) return list[i]} return list[list.length-1]}

/* ---------- 衣櫃 ---------- */
const CAT={練習:"練習",居家:"日常・居家",外出:"日常・外出",睡衣:"日常・睡衣"};
const wardLoaded=()=>!!localStorage.getItem("kpopGame.pulledOnce")&&Object.keys(ITEMS).length>0;
function lookFor(code,mid){const lk=ITEMS[code]; if(!lk) return null; const slot=Object.keys(WMEM).find(k=>WMEM[k]===mid); return slot&&lk.members[slot]?lk:null}
function wardrobe(mid){
  const slot=Object.keys(WMEM).find(k=>WMEM[k]===mid), stat=new Set((window.OUTFIT_SPRITES||[]).filter(o=>o.m===mid).map(o=>o.look).filter(Boolean));
  const dyn=Object.values(ITEMS).filter(l=>l&&!l.deleted&&slot&&l.members?.[slot]?.sprites&&!stat.has(l.code))
    .map(l=>({m:mid,id:l.code,look:l.code,name:l.name,occ:l.occasion,seasons:l.seasons||[]}));
  return dyn.concat((window.OUTFIT_SPRITES||[]).filter(o=>o.m===mid).map(o=>{
    if(o.look&&wardLoaded()){const lk=lookFor(o.look,mid); if(!lk) return null;
      // 衣帽間舊分類「日常」還沒改成居家/外出/睡衣時,沿用這裡登記的分類
      const occ=lk.occasion&&lk.occasion!=="日常"?lk.occasion:o.occ;
      return {...o,occ,seasons:(lk.seasons&&lk.seasons.length)?lk.seasons:(o.seasons||[]),name:lk.name||o.name}}
    return {...o,seasons:o.seasons||[]}}).filter(Boolean))}
function ensureWear(force){
  if(S.wear&&S.wear.day===S.day&&!force) return;
  const season=seasonOf(dateOf(S.day)), r=rng(seedOf(S.day,"wear")), w={day:S.day,m:{}};
  for(const m of M){w.m[m.id]={}; const ward=wardrobe(m.id);
    for(const [k,occ] of Object.entries(CAT)){let c=ward.filter(o=>o.occ===occ&&(!o.seasons.length||o.seasons.includes(season)));
      const last=S.lastWear?.[m.id]?.[k]; if(c.length>1) c=c.filter(o=>o.id!==last);
      w.m[m.id][k]=c.length?c[Math.floor(r()*c.length)].id:null}}
  if(S.wear&&S.wear.day!==S.day) S.lastWear=S.wear.m;
  S.wear=w}
function outfitAt(mid,room,slot){ensureWear(); const g=PL[room]?.g, wm=S.wear.m[mid]||{};
  if(g==="公司大樓") return wm.練習||null; if(g==="宿舍") return (slot===4&&wm.睡衣)||wm.居家||null; return wm.外出||null}
const outfitName=(mid,id)=>id?((window.OUTFIT_SPRITES||[]).find(o=>o.m===mid&&o.id===id)?.name||ITEMS[id]?.name||id):"白 T(基本服裝)";
function spr(mid,outfit,e){const f=byId(mid).f, ex=EXPR.includes(e)?e:"neutral";
  if(outfit&&outfit.startsWith("LOOK-")&&!(window.OUTFIT_SPRITES||[]).some(o=>o.m===mid&&o.id===outfit)){ // 遊戲裡處理好的立繪
    const d=window.DYN?.[outfit+"@"+mid]; if(d) return d[ex]||d.neutral; window.needDyn&&needDyn(outfit,mid); outfit=null }
  return `assets/chara/${f}_${outfit?outfit+"_":""}${ex}.webp`}
function preload(mid,outfit){for(const e of EXPR){const i=new Image();i.src=spr(mid,outfit,e)}}

/* 劇本沒有標表情時,從台詞推測 */
function guessExpr(t){t=String(t||"");
  if(/哈哈|噗|笑到|笑出聲|笑翻|嘻嘻|呵呵|大笑|笑得停不/.test(t)) return "laugh";
  if(/(臉|耳朵|耳根|臉頰).{0,3}紅|害羞|捂住臉|擋住臉|結巴|欸[??][!!]|([^\s、,,。])、\2/.test(t)) return "shy";
  if(/閉嘴|煩死|生氣|可惡|吵死|不要管我|你才|哼/.test(t)) return "angry";
  if(/對不起|抱歉|嗚|難過|想哭|哭了|眼眶|算了……|……我知道|沒事的……/.test(t)) return "sad";
  if(/笑|~|!$|!$|謝謝|太好了|好耶|開心/.test(t)) return "smile";
  return "neutral"}

/* ---------- 亂數 ---------- */
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const seedOf=(...xs)=>xs.reduce((h,x)=>Math.imul(h^(typeof x==="string"?[...x].reduce((a,c)=>a*31+c.charCodeAt(0)|0,7):x),2654435761)>>>0,2166136261);
function pickKey(w,r){const ks=Object.keys(w);let x=r()*ks.reduce((s,k)=>s+w[k],0);for(const k of ks){x-=w[k];if(x<=0)return k}return ks[ks.length-1]}
function assign(){S.where={};for(const m of M){const w=WHERE[m.id][S.slot],r=rng(seedOf(S.day,S.slot,m.id));
  const ok=Object.fromEntries(Object.entries(w).filter(([k])=>k.startsWith("外出")||PL[k==="bedroom"?"bed_"+m.id:k].open.includes(S.slot)));
  let w2=pickKey(Object.keys(ok).length?ok:{practice:1},r); if(w2==="bedroom") w2="bed_"+m.id; S.where[m.id]=w2}}

const stageOf=id=>window.stageOfXp?stageOfXp(id):"戒備";
const STAGE_C={戒備:"#8C7E92",信任:"#C99A2E",夥伴:"#3E9B6B",心動:"#D4537E",戀人:"#C2185B",親密:"#9C1B4A",多人親密:"#6A1B9A"};
const who=pid=>M.filter(m=>S.where[m.id]===pid);

/* ---------- 主畫面:主地圖與建築剖面 ---------- */
const pausers=new Set(); const paused=()=>pausers.size>0||document.hidden;
function setPause(k,on){on?pausers.add(k):pausers.delete(k);$("#stage").classList.toggle("paused",paused())}
function hm(){const s=SLOTS[S.slot],mins=s.from+(s.to-s.from)*Math.min(S.t,SLOT_SEC)/SLOT_SEC,h=Math.floor(mins/60)%24,mm=Math.floor(mins%60/10)*10;return `${pad(h)}:${pad(mm)}`}
/* 座標都是畫面百分比(插畫 1600×900) */
const SPOTS=[
  {id:"company",n:"公司大樓",kind:"building",rect:[11.8,10.3,35.4,50.2],pin:[29.5,40],rooms:["practice","studio","office","styling"]},
  {id:"tv",n:"電視台",kind:"locked",rect:[53,10.5,17.5,10.5],pin:[62.5,14],note:"出道後的打歌期開放"},
  {id:"dorm",n:"宿舍",kind:"building",rect:[67.3,27,21.4,33.5],pin:[77.8,28],rooms:["living","kitchen","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"]},
  {id:"store",n:"便利商店",kind:"place",rect:[47.4,52,17.6,19],pin:[56.2,51.5]},
  {id:"river",n:"漢江公園",kind:"place",rect:[44,74,56,26],pin:[76,79]}];
/* 剖面圖的房間:r=[左,上,寬,高],feet=腳底高度,h=168 公分的人在畫面上的高度(%) */
const INSIDE={
  company:{n:"公司大樓",sub:"選擇要去的樓層",rooms:[
    {pid:"practice",fl:"4F",n:"練習室",r:[6.4,7.8,88.8,24.4],feet:30.8,h:15.5},
    {pid:"studio",fl:"3F",n:"錄音室",r:[6.4,35.6,86.8,20.4],feet:55.4,h:15.5,xr:[22,60],fac:"recording"},
    {pid:"office",fl:"2F",n:"代表辦公室",r:[6.4,59.4,88.8,17.2],feet:75.6,h:15.5,xr:[40,80],fac:"planning"},
    {pid:"styling",fl:"1F",n:"造型室",r:[6.4,78.4,88.8,17.8],feet:93.6,h:15.5,lp:"r",xr:[42,78],fac:"wardrobe"}]},
  dorm:{n:"宿舍",sub:"選擇要去的房間",rooms:[
    {pid:"bed_ys",fl:"2F",n:"藝瑟",r:[5.25,11.1,17.5,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_tr",fl:"2F",n:"泰梨",r:[24.1,11.1,16.5,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_hy",fl:"2F",n:"日和",r:[41.9,11.1,17.6,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_he",fl:"2F",n:"夏恩",r:[61,11.1,16.2,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"bed_hr",fl:"2F",n:"河嵐",r:[78.6,11.1,16.2,34.1],feet:43.6,h:22,xr:[66,80]},
    {pid:"living",fl:"1F",n:"客廳",r:[5,49.4,48.8,39.6],feet:85,h:22,xr:[30,85]},
    {pid:"kitchen",fl:"1F",n:"廚房",r:[54.4,49.4,40.6,39.6],feet:85,h:22,xr:[15,60]}]}};
let view="map";                 // map | company | dorm
const spotOf=pid=>SPOTS.find(s=>s.rooms?.includes(pid))?.id||pid;
const inSpot=sp=>M.filter(m=>{const w=S.where[m.id];return !w.startsWith("外出")&&(spotOf(w)===sp)});
const facesHTML=ms=>!ms.length?"":`<div class="avs">${ms.map(m=>`<span class="face" title="${m.n}" style="--c:${m.c};background-image:url(${spr(m.id,null,"neutral")})"></span>`).join("")}</div>`;
const L=()=>SLOTS[S.slot].light;
/* 季節版場景:春 3–5 月、秋 9–11 月、冬 12–2 月有專屬圖,夏季與還沒有圖的時段用原圖 */
const SEASON_ART={map:["dawn","day","evening","night"],river:["dawn","day","evening","night"]};
function seasonKey(){const m=dateOf(S.day).getMonth()+1;return m>=3&&m<=5?"spring":m>=9&&m<=11?"autumn":(m===12||m<=2)?"winter":""}
function seasonArt(dir,name,light){const s=seasonKey();return `assets/${dir}/${name}_${light}${s&&(SEASON_ART[name]||[]).includes(light)?"_"+s:""}.webp`}
window.seasonKey=seasonKey;
function setArt(id,url){const a=$("#"+id),b=$("#"+id+"2"),cur=a.dataset.u;if(cur===url) return;
  if(!cur){a.style.backgroundImage=`url(${url})`;a.dataset.u=url;return}
  b.style.backgroundImage=`url(${url})`;b.classList.remove("next");setTimeout(()=>{a.style.backgroundImage=`url(${url})`;a.dataset.u=url;b.classList.add("next")},1250)}

/* 場景圖預先解碼:進建築、進房間時不會先黑一下(手機上解碼大圖較慢)。閒置時逐張處理,這個時段和下一個時段都先備好 */
const WARMED=new Set(); let warmQ=[], warming=false, warmKey="";
function warmArt(){ const key=S.day+"|"+S.slot; if(key===warmKey) return; warmKey=key;
  const lights=[SLOTS[S.slot].light, SLOTS[Math.min(S.slot+1,SLOTS.length-1)].light];
  const rooms=["practice","studio","office","styling","living","kitchen","store","river","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"];
  for(const l of lights){ warmQ.push(seasonArt("scene","map",l),seasonArt("scene","company",l),seasonArt("scene","dorm",l)); for(const r of rooms) warmQ.push(seasonArt("bg",r,l)) }
  warmQ=warmQ.filter(u=>!WARMED.has(u)); if(!warming) warmNext() }
function warmNext(){ const u=warmQ.shift(); if(!u){warming=false;return} warming=true; WARMED.add(u);
  const go=()=>{ const i=new Image(); i.src=u; (i.decode?i.decode():Promise.resolve()).catch(()=>{}).finally(()=>setTimeout(warmNext,120)) };
  window.requestIdleCallback?requestIdleCallback(go,{timeout:2000}):setTimeout(go,200) }
/* 頂部列每一格畫面都會呼叫:只在數值真的改變時才寫進畫面(每格都重寫會讓玻璃面板一直重畫,手機很耗電、很卡) */
const HUDC={};
function hudSet(id,v,prop="textContent"){ const k=id+prop; if(HUDC[k]===v) return; HUDC[k]=v; const e=document.getElementById(id); if(e) e[prop]=v }
function renderHud(){const d=dateOf(S.day); warmArt();
  hudSet("date",`${pad(d.getMonth()+1)}.${pad(d.getDate())}`); hudSet("wday",`${d.getFullYear()}・${WD[d.getDay()]}`); hudSet("dayN",window.debutText?debutText():`第 ${S.day+1} 天`);
  hudSet("slotName",SLOTS[S.slot].n); hudSet("hm",hm());
  const pct=Math.round(200*Math.min(S.t,SLOT_SEC)/SLOT_SEC)/2, segKey=S.slot+"|"+pct;
  if(HUDC.seg!==segKey){ HUDC.seg=segKey; [...$("#segs").children].forEach((e,i)=>{const c=i<S.slot?"done":i===S.slot?"on":""; if(e.className!==c) e.className=c; e.firstChild.style.width=i===S.slot?pct+"%":"0"}) }
  const apKey=S.acts; if(HUDC.ap!==apKey){ HUDC.ap=apKey; [...$("#ap").children].forEach((e,i)=>e.classList.toggle("used",i>=S.acts)) }
  hudSet("actN",String(S.acts)); hudSet("badge",String(S.unread||""))}

function renderWorld(){
  setArt("worldArt",seasonArt("scene","map",L()));
  $("#worldHot").innerHTML=SPOTS.map(sp=>{
    const [x,y,w,h]=sp.rect, ppl=sp.kind==="locked"?[]:sp.kind==="place"?who(sp.id):inSpot(sp.id);
    const open=sp.kind==="building"?sp.rooms.some(r=>PL[r].open.includes(S.slot)):sp.kind==="place"?PL[sp.id].open.includes(S.slot):false;
    const done=sp.kind==="place"&&S.visited.includes(sp.id);
    const sub=sp.kind==="locked"?(sp.id==="tv"&&window.promoActive?.()?`<span class="sub">打歌期進行中</span>`:`<span class="lock">🔒 ${sp.id==="tv"&&S.day>=(window.DEBUT_DAY||1e9)?"宣傳期外":sp.note}</span>`):sp.kind==="place"?(!open?openText(PL[sp.id]):done?"這個時段已來過":ppl.length?`${ppl.length} 人在這裡`:"沒有認識的人")
      :(!open?"現在沒有開放的房間":ppl.length?`${ppl.length} 人在裡面`:"沒有人");
    const dis=sp.kind==="place"&&(!open||done||S.acts<=0);
    const label=`${sp.n},${sub.replace(/<[^>]+>/g,"")}`;
    return `<button class="hot" data-spot="${sp.id}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" ${dis?"disabled":""} aria-label="${label}"></button>
      <button class="pin${sp.kind==="locked"?" locked":""}${done?" done":""}" data-spot="${sp.id}" style="left:${sp.pin[0]}%;top:${sp.pin[1]}%" ${dis?"disabled":""} tabindex="-1" aria-hidden="true">
        <span class="plate"><b>${sp.n}</b><small>${sub}</small>${sp.kind==="locked"?"":facesHTML(ppl)}</span></button>`}).join("");
  $("#worldHot").querySelectorAll("[data-spot]").forEach(b=>{const id=b.dataset.spot,pair=$("#worldHot").querySelectorAll(`[data-spot="${id}"]`);
    b.onmouseenter=()=>pair.forEach(x=>x.classList.add("lit")); b.onmouseleave=()=>pair.forEach(x=>x.classList.remove("lit"));
    b.onclick=()=>openSpot(id)})}
function openSpot(id){const sp=SPOTS.find(s=>s.id===id); if(!sp) return;
  if(sp.kind==="locked"){ if(sp.id==="tv"){ if(window.promoActive?.()) openStageRoom(); else tvChooser(); return} toast2(`${sp.n}:${sp.note}`);return}
  if(sp.kind==="place"){visit(sp.id);return}
  enter(sp.id)}
function enter(b){const sp=SPOTS.find(s=>s.id===b);
  const w=$("#world"); w.style.transformOrigin=`${sp.rect[0]+sp.rect[2]/2}% ${sp.rect[1]+sp.rect[3]/2}%`; w.classList.add("zoom");
  view=b; renderInside(); renderNews(); const i=$("#inside"); i.classList.add("enter"); i.classList.remove("hide"); requestAnimationFrame(()=>requestAnimationFrame(()=>i.classList.remove("enter")));
  renderWhere()}
function exitToMap(){const i=$("#inside"); i.classList.add("enter"); setTimeout(()=>{i.classList.add("hide");i.classList.remove("enter")},350);
  view="map"; renderWorld(); $("#world").classList.remove("zoom"); renderWhere(); renderNews()}
function renderInside(){if(view==="map") return; const B=INSIDE[view];
  setArt("insideArt",`assets/scene/${view}_${L()}.webp`);
  $("#rooms").innerHTML=B.rooms.map((rm,ri)=>{
    if(rm.fac&&!PL[rm.pid]){const [x,y,w,h]=rm.r; return `<button class="room fac" data-fac="${rm.fac}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" aria-label="${rm.fl} ${rm.n},設施,不花行動">
      <span class="hl"></span><span class="rp${rm.lp==="r"?" r":""}"><span class="fl">${rm.fl}</span><span><span class="rn">${rm.n}</span><br><span class="rs">設施・不花行動</span></span></span></button>`}
    const p=PL[rm.pid], deco=!!rm.deco, open=!deco&&p.open.includes(S.slot), vis=!deco&&S.visited.includes(rm.pid);
    const ppl=open?who(rm.pid):[];
    const dis=deco||!open||vis||S.acts<=0, [x,y,w,h]=rm.r;
    const own=p?.owner, st=deco?"之後開放":!open?openText(p):vis?"這個時段已來過":own?(ppl.some(m=>m.id===own)?(ppl.length>1?ppl.map(m=>m.n).join("、"):"在房間"):ppl.length?ppl.map(m=>m.n).join("、")+"在這裡":"不在"):ppl.length?ppl.map(m=>m.n).join("、"):"沒有人";
    const xr=rm.xr||[18,82], n=ppl.length, r=rng(seedOf(S.day,S.slot,view,ri));
    const figs=ppl.map((m,i)=>{const fx=n===1?(xr[0]+xr[1])/2+(r()-.5)*(xr[1]-xr[0])*.5:xr[0]+(xr[1]-xr[0])*i/(n-1);
      const X=x+w*fx/100, H=rm.h*m.cm/168, of=outfitAt(m.id,rm.pid,S.slot);
      return `<span class="shadowfoot" style="left:${X}%;top:${rm.feet}%;width:${H*.32}cqw"></span><img class="fig" alt="${m.n}" src="${spr(m.id,of,"neutral")}" style="left:${X}%;top:${rm.feet-H}%;height:${H}%">`}).join("");
    return `${figs}<button class="room${!open&&!deco?" closed":""}${vis?" visited":""}${rm.fac?" hasfac":""}" data-pid="${rm.pid}" ${rm.fac?`data-both="${rm.fac}"`:""} style="left:${x}%;top:${y}%;width:${w}%;height:${h}%" ${dis&&!rm.fac?"disabled":""} aria-label="${rm.fl} ${rm.n},${st}${rm.fac?",也可以使用設施":""}">
      <span class="hl"></span><span class="rp${rm.lp==="r"?" r":""}${rm.r[1]<15?" b":""}"><span class="fl">${rm.fl}</span><span><span class="rn">${rm.n}</span><br><span class="rs">${st}</span></span></span>
      ${!open&&!deco?`<span class="lockc">${openText(p)}</span>`:""}</button>`}).join("");
  $("#rooms").querySelectorAll(".room").forEach(b=>b.onclick=()=>{ if(b.dataset.fac){window.openFacility&&openFacility(b.dataset.fac);return}
    if(b.dataset.both){chooser(b.dataset.pid,b.dataset.both);return} const pid=b.dataset.pid; if(PL[pid]) visit(pid)})}
/* 電視台:出道後的打歌期才正式開放,先留一個測試入口 */
function tvChooser(){
  let el=$("#chooser"); if(!el){el=document.createElement("div");el.id="chooser";el.className="chooser";$("#stage").appendChild(el)}
  const after=S.day>=(window.DEBUT_DAY||1e9);
  el.innerHTML=`<div class="chbox"><h3>電視台</h3><p class="chnote">${after?"現在不是宣傳期。到 2F 企劃室決定下一次的回歸日。":`出道後的打歌期才會正式開放(${window.debutText?debutText():""})。`}</p>
    <button class="chbtn pri" data-ch="tv"><b>練習模式:進入待機室</b><small>模擬打歌,不影響正式宣傳期・不花行動,時間暫停</small></button>
    <button class="chx" data-ch="x">取消</button></div>`;
  el.classList.add("on"); el.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{el.classList.remove("on"); if(b.dataset.ch==="tv") window.openStageRoom&&openStageRoom()});
  el.onclick=e=>{if(e.target===el) el.classList.remove("on")};
}
/* 有設施又能拜訪的房間:先問要做什麼 */
const FACN={planning:["企劃桌","歌曲企劃、發行計畫"],recording:["錄音台","逐句分配、錄音評分"],wardrobe:["造型室","衣櫃、委託設計、生圖、成員底模"]};
function chooser(pid,fac){
  let el=$("#chooser"); if(!el){el=document.createElement("div");el.id="chooser";el.className="chooser";$("#stage").appendChild(el)}
  const p=PL[pid], open=p.open.includes(S.slot), vis=S.visited.includes(pid), ppl=who(pid), canVisit=open&&!vis&&S.acts>0;
  el.innerHTML=`<div class="chbox"><h3>${p.n}</h3>
    <button class="chbtn pri" data-ch="fac"><b>使用${FACN[fac][0]}</b><small>${FACN[fac][1]}・不花行動,時間暫停</small></button>
    <button class="chbtn" data-ch="visit" ${canVisit?"":"disabled"}><b>${pid==="office"?"在辦公室找成員":"跟在場的成員聊天"}</b><small>${!open?openText(p):vis?"這個時段已來過":S.acts<=0?"沒有行動次數了":pid==="office"?"花 1 次行動,可以請在公司的成員過來":ppl.length?`花 1 次行動・${ppl.map(m=>m.n).join("、")}在這裡`:"花 1 次行動・現在沒有人"}</small></button>
    <button class="chx" data-ch="x">取消</button></div>`;
  el.classList.add("on");
  el.querySelectorAll("[data-ch]").forEach(b=>b.onclick=()=>{el.classList.remove("on"); const c=b.dataset.ch;
    if(c==="fac"){ if(fac==="wardrobe") window.openFacility&&openFacility("wardrobe"); else window.openSongFacility&&openSongFacility(fac) } else if(c==="visit") visit(pid)});
  el.onclick=e=>{if(e.target===el) el.classList.remove("on")};
}
function renderWhere(){
  $("#where").innerHTML=view==="map"?"":`<button class="back" id="backBtn"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>地圖</button><div class="btitle"><b>${INSIDE[view].n}</b><span>${INSIDE[view].sub}</span></div>`;
  $("#backBtn")&&($("#backBtn").onclick=exitToMap)}
function renderNews(){const n=$("#news");
  if(view!=="map"||!S.absent.length||S.newsSeen===S.day*5+S.slot){n.classList.add("hide");return}
  n.innerHTML=`<h3>你不在場時<button id="newsX">知道了</button></h3>${S.absent.map(a=>`<p>${a}</p>`).join("")}`; n.classList.remove("hide");
  $("#newsX").onclick=()=>{S.newsSeen=S.day*5+S.slot;save();n.classList.add("hide")}}
function locText(m){const w=S.where[m.id];return w.startsWith("外出")?`外出中<b>(${w.slice(3)})</b>`:`在<b>${spotOf(w)==="company"?"公司・":spotOf(w)==="dorm"?"宿舍・":""}${PL[w].n}</b>`}
function renderDrawer(){
  $("#drawerBody").innerHTML=M.map(m=>{const s=S.m[m.id],st=stageOf(m.id),w=S.where[m.id],of=w.startsWith("外出")?outfitAt(m.id,"store",S.slot):outfitAt(m.id,w,S.slot);
    return `<div class="mcard" style="--c:${m.c}"><span class="face" style="background-image:url(${spr(m.id,null,"neutral")})"></span>
      <div><div class="top"><span class="n">${m.n}</span><span class="st" style="--sc:${STAGE_C[st]}">${st}</span></div>
      <div class="loc">${locText(m)}</div><div class="wear">穿著:${esc(outfitName(m.id,of))}</div>
      <div class="bars"><span>心情</span><div class="bar"><i style="--v:${s.mood}%;--bc:#E8A13C"></i></div><span>壓力</span><div class="bar"><i style="--v:${s.stress}%;--bc:#8C6FD0"></i></div></div>
      ${(()=>{const nx=window.nextStageInfo?.(m.id); return nx?`<div class="rel"><span>距離「${nx.name}」</span><div class="bar"><i style="--v:${Math.round(nx.p*100)}%;--bc:${STAGE_C[nx.name]||m.c}"></i></div>${nx.extra?`<small>${nx.extra}</small>`:""}</div>`:`<div class="rel"><span>關係已經到最深了</span></div>`})()}
      ${S.skill?`<div class="skl">${Object.entries(SKILL_NAMES).filter(([k])=>!(k==="kor"&&S.skill[m.id].kor>=100)).map(([k,n])=>`<span>${n}<b>${Math.round(S.skill[m.id][k])}</b></span>`).join("")}</div>`:""}
      ${S.bond?`<div class="bond">${M.filter(o=>o.id!==m.id).map(o=>({o,v:bondOf(m.id,o.id)})).sort((a,b)=>b.v-a.v).slice(0,2).map(({o,v})=>`<span style="--c:${o.c}">和${o.n}默契 ${Math.round(v)}</span>`).join("")}</div>`:""}</div></div>`}).join("")
    +`<h4>你不在場時</h4>${S.absent.length?S.absent.map(a=>`<p class="ab">${a}</p>`).join(""):`<p class="ab" style="opacity:.7">上個時段沒有特別的事。</p>`}`}
$("#memBtn").onclick=()=>{renderDrawer();$("#drawer").classList.add("on");setPause("drawer",true)};
$("#drawerX").onclick=()=>{$("#drawer").classList.remove("on");setPause("drawer",false)};
function renderAll(){$("#stage").dataset.time=L(); ensureWear(); renderHud(); renderWorld(); renderInside(); renderWhere(); renderNews();
  if($("#drawer").classList.contains("on")) renderDrawer(); save()}
function toast(t,s){const e=$("#toast");$("#toastT").textContent=t;$("#toastS").textContent=s;e.classList.remove("show");void e.offsetWidth;e.classList.add("show")}

/* ---------- 時間 ---------- */
let last=performance.now();
function tick(now){const dt=Math.min(1,(now-last)/1000);last=now;
  if(!paused()){S.t+=dt*(S.speed||1); if(S.t>=SLOT_SEC) endSlot("time"); else renderHud()}
  requestAnimationFrame(tick)}
setInterval(()=>{if(!paused()) save()},3000);
document.addEventListener("visibilitychange",()=>{$("#stage").classList.toggle("paused",paused()); save(); if(document.hidden) pushSave()});

function absentReports(r){const out=[];
  for(const p of PLACES){if(S.visited.includes(p.id)) continue; const ppl=who(p.id); if(!ppl.length||r()>.45) continue;
    const ids=ppl.map(m=>m.id), cs=snips().filter(sn=>sn.type==="away"&&sn.at===p.sp&&(!sn.sl?.length||sn.sl.includes(S.slot))&&sn.who?.length&&sn.who.every(id=>ids.includes(id))&&(S.seen[sn.code]==null||S.day-S.seen[sn.code]>=(sn.cd||4)));
    const sn=pickW(cs,r);
    if(sn){S.seen[sn.code]=S.day; const txt=[sn.sc,...(sn.nodes?.start?.L||[]).map(l=>l[0]?`${byId(l[0])?.n||""}:「${l[1]}」`:l[1])].filter(Boolean).join(" ");
      out.push(`<b>${p.n}</b>:${esc(txt)}`); continue}
    const pool=(ABSENT[baseOf(p.id)]||[]).filter(t=>!t.includes("{b}")||ppl.length>=2); if(!pool.length) continue;
    const t=pool[Math.floor(r()*pool.length)],a=ppl[0],b=ppl[1];
    out.push(`<b>${p.n}</b>:`+esc(t).replace("{a}",`<b style="color:${a.c}">${a.n}</b>`).replace("{b}",b?`<b style="color:${b.c}">${b.n}</b>`:""))}
  return out.slice(0,3)}
function newMessage(r){if(window.phoneIncoming){phoneIncoming(r);return} if(r()>=.55) return; const m=M[Math.floor(r()*5)];
  const cs=snips().filter(sn=>sn.type==="msg"&&(sn.member||sn.who?.[0])===m.id&&(!sn.sl?.length||sn.sl.includes(S.slot))&&stageOk(sn));
  const sn=pickW(cs,r); let t=null;
  if(sn){t=sn.nodes?.start?.L?.find(l=>l[0]===m.id)?.[1]; S.seen[sn.code]=S.day}
  if(!t){const p=MSG[m.id].filter(x=>x[1].includes(S.slot)); if(p.length) t=p[Math.floor(r()*p.length)][0]}
  if(!t) return; S.msgs.unshift({id:m.id,t,code:sn?.code||"",when:`第 ${S.day+1} 天${SLOTS[S.slot].n}`}); S.msgs=S.msgs.slice(0,20); S.unread++}
function endSlot(reason){
  const r=rng(seedOf(S.day,S.slot,"end"));
  S.absent=absentReports(r);
  for(const m of M){const s=S.m[m.id];s.stress=clamp(s.stress+(S.slot<=2?2:S.slot===4?-6:-1),0,100);s.mood=clamp(s.mood+Math.sign(60-s.mood),0,100)}
  if(window.growthOnSlotEnd) growthOnSlotEnd();
  S.slot++; if(S.slot>4){S.slot=0;S.day++}
  S.t=0; S.acts=5; S.visited=[]; assign(); ensureWear(); newMessage(r);
  renderAll(); save(true); pushSave();
  toast(SLOTS[S.slot].n,reason==="time"?"時間到了,進入下一個時段":reason==="acts"?"行動用完了,進入下一個時段":"你結束了這個時段")}
$("#endBtn").onclick=()=>endSlot("manual");

/* =====================================================================
   拜訪與對話
   ===================================================================== */
let V=null, D=null, typing=null, auto=false, autoT=0, logLines=[];
function visit(pid){
  const p=PL[pid]; if(!p.open.includes(S.slot)||S.acts<=0||S.visited.includes(pid)||V) return;
  S.acts--; S.visited.push(pid); save(true); setPause("visit",true);
  const ppl=pid==="office"?[]:who(pid).map(m=>m.id);
  V={pid,room:pid,present:ppl,talked:new Set(),summoned:null}; logLines=[];
  $("#vbg").style.backgroundImage=`url(${seasonArt("bg",pid,SLOTS[S.slot].light)})`;
  $("#vtitle").textContent=p.n; $("#vsub").textContent=`${SLOTS[S.slot].n}・${hm()}・剩 ${S.acts} 次行動`;
  drawPeople(); $("#visit").classList.add("on"); $("#vopts").innerHTML="";
  if(pid==="office"){narr(SCN.office); menu(); return}
  const byTime=v=>Array.isArray(v)?(v[S.slot]||v.find(Boolean)):v;
  if(!ppl.length){narr(PL[pid].owner?`${byId(PL[pid].owner).n}不在房間裡。${EMPTY.bedroom.replace("寢室裡沒有人,","")}`:byTime(EMPTY[pid])); menu(); return}
  const sn=pickW(pool({sp:p.sp,room:pid,slot:S.slot,present:ppl,types:ENTRY}));
  if(sn) play(sn,menu); else {narr((PL[pid].owner?`你敲了敲${byId(PL[pid].owner).n}房間的門。`:byTime(SCN[baseOf(pid)]))+(ppl.length===1?`${byId(ppl[0]).n}在這裡。`:`${ppl.map(id=>byId(id).n).join("、")}都在這裡。`)); menu()}
}
function drawPeople(){
  const ids=[...V.present,...(V.summoned?[V.summoned]:[])], n=ids.length, ch=n<=1?120:n===2?104:n===3?92:82;
  const xs=n<=1?[30]:ids.map((_,i)=>(n<=3?17:13)+(n===2?26:n===3?36:46)*i/(n-1));
  $("#vppl").innerHTML=ids.map((id,i)=>{const m=byId(id),of=outfitAt(id,V.room,S.slot); preload(id,of);
    return `<img alt="${m.n}" data-id="${id}" data-of="${of||""}" src="${spr(id,of,"neutral")}" style="--ch:${ch}cqw;--ty:-1cqw;--h:${(m.cm/168).toFixed(3)};--x:${xs[i]}%">`}).join("")}
function setExpr(id,e){$("#vppl").querySelectorAll("img").forEach(img=>{const me=img.dataset.id===id; img.classList.toggle("dim",!!id&&!me); img.classList.toggle("on",me);
  if(me) swapExpr(img,spr(id,img.dataset.of||null,e))})}
function swapExpr(img,src){ // 舊表情留一層殘影淡出,新表情解碼好才換,不會閃一下
  if(img.getAttribute("src")===src) return;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){img.src=src;return}
  const g=img.cloneNode(); g.classList.add("ghost"); g.removeAttribute("data-id"); g.alt=""; const cs=getComputedStyle(img); g.style.animationDuration=cs.animationDuration; g.style.animationDelay=cs.animationDelay; img.parentNode.appendChild(g);
  const a=img.getAnimations()[0], b=g.getAnimations()[0]; if(a&&b) b.currentTime=a.currentTime;
  const pre=new Image(); pre.src=src;
  (pre.decode?pre.decode():Promise.resolve()).catch(()=>{}).then(()=>{img.src=src;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{g.style.opacity=0; setTimeout(()=>g.remove(),280)}))})}
function narr(t){showText("",t,true)}
function menu(){
  D=null; $("#vbox").classList.add("locked"); $("#vbox").classList.remove("wait");
  const opts=[];
  for(const id of V.present) if(!V.talked.has(id)) opts.push(`<button class="vopt" data-talk="${id}">跟${byId(id).n}聊聊<small>不花行動</small></button>`);
  if(V.pid==="office"&&!V.summoned){const inCo=M.filter(m=>["practice","studio"].includes(S.where[m.id]));
    for(const m of inCo) opts.push(`<button class="vopt" data-sum="${m.id}">請${m.n}到辦公室<small>她在${PL[S.where[m.id]].n}</small></button>`)}
  opts.push(`<button class="vopt" id="leave">離開<small>${S.acts>0?"回到主畫面":"行動用完,進入下一個時段"}</small></button>`);
  $("#vopts").innerHTML=opts.join("");
  $("#vopts").querySelectorAll("[data-talk]").forEach(b=>b.onclick=()=>talk(b.dataset.talk));
  $("#vopts").querySelectorAll("[data-sum]").forEach(b=>b.onclick=()=>summon(b.dataset.sum));
  $("#leave").onclick=leave; $("#vopts button")?.focus({preventScroll:true})}
function demoSnip(id){const pool=LINES[id],[t,e]=pool[Math.floor(Math.random()*pool.length)];
  return {code:"demo-line-"+id,type:"topic",who:[id],member:id,nodes:{start:{L:[[id,t,e]],C:[]}},demoLine:true}}
function talk(id){V.talked.add(id); const p=PL[V.pid];
  const sn=pickW(pool({sp:p.sp,room:V.pid,slot:S.slot,present:[...V.present,...(V.summoned?[V.summoned]:[])],types:TALK,member:id}))||demoSnip(id);
  if(sn.demoLine){const s=S.m[id];s.trust=clamp(s.trust+1,0,100);s.mood=clamp(s.mood+2,0,100);fx(id,"信任 +1")}
  play(sn,menu)}
function summon(id){V.summoned=id; V.talked.add(id); drawPeople();
  const sn=pickW(pool({sp:"office",room:"office",slot:S.slot,present:[id],types:OFFICE,member:id}))||demoSnip(id);
  if(sn.demoLine){const s=S.m[id];s.trust=clamp(s.trust+1,0,100);fx(id,"信任 +1")}
  play(sn,menu)}
function leave(){if(D) return; $("#visit").classList.remove("on"); $("#vlog").classList.remove("on"); setPause("visit",false); V=null; stopAuto();
  if(S.acts<=0) endSlot("acts"); else {renderAll(); schedulePush()}}

/* ---- 試玩(製作者模式用):不花行動、不改存檔 ---- */
window.testPlay=function(sn,onDone){
  if(V) return; const backup=JSON.stringify({m:S.m,flags:S.flags,seen:S.seen});
  const roomOf={practice:"practice",dorm:"living",studio:"studio",office:"office",styling:"styling",out:"store",phone:"bed_"+((sn.who||[])[0]||"ys")};
  const room=roomOf[sn.at]||"practice";
  V={pid:room,room,present:(sn.who||[]).filter(id=>byId(id)),talked:new Set(),summoned:null,test:true}; logLines=[];
  $("#vbg").style.backgroundImage=`url(${seasonArt("bg",room,SLOTS[S.slot].light)})`; $("#vtitle").textContent="試玩"; $("#vsub").textContent="不花行動,也不會影響存檔";
  drawPeople(); $("#visit").classList.add("on"); setPause("visit",true); $("#vopts").innerHTML="";
  play({...sn,code:"test"},()=>{ const o=JSON.parse(backup); S.m=o.m; S.flags=o.flags; S.seen=o.seen; save();
    $("#vopts").innerHTML=`<button class="vopt" id="testEnd">試玩結束<small>回到製作者模式</small></button>`;
    $("#testEnd").onclick=()=>{ $("#visit").classList.remove("on"); $("#vlog").classList.remove("on"); setPause("visit",false); V=null; stopAuto(); onDone&&onDone() } });
};
/* ---- 對話引擎:劇本工坊的節點格式 {start:{L:[[說話者,台詞,表情?]],C:[{t,s,to,g,next,r,set,mood,stress,heart}]}} ---- */
function play(sn,onEnd){
  if(window.addBond&&!V?.test&&(sn.who||[]).length>1) addBond(sn.who,sn.type==="friction"?2.5:1.5);
  if(!sn.demoLine&&!String(sn.code).startsWith("demo-line")) S.seen[sn.code]=S.day;
  D={sn,onEnd,q:[],main:sn.member||sn.who?.[0]};
  $("#vopts").innerHTML=""; $("#vbox").classList.remove("locked");
  if(sn.sc) D.q.push({k:"line",id:"",text:sn.sc});
  D.q.push({k:"node",key:"start"}); step()}
function step(){
  if(!D) return; const it=D.q.shift();
  if(!it){const f=D.onEnd;D=null;setExpr(null);f&&f();return}
  if(it.k==="node"){const n=D.sn.nodes[it.key]; if(!n){step();return}
    for(const l of n.L||[]) D.q.push({k:"line",id:l[0]||"",text:l[1],e:l[2]});
    if((n.C||[]).length) D.q.push({k:"choices",C:n.C}); step(); return}
  if(it.k==="line"){showText(it.id,it.text,false,it.e);return}
  if(it.k==="choices"){showChoices(it.C);return}}
function showText(id,text,still,e){
  const m=byId(id), me=id==="me";
  $("#vname").textContent=me?"代表":m?m.n:"旁白"; $("#vname").style.setProperty("--nc",me?"var(--acc)":m?m.c:"#9b8aa0");
  if(m&&$("#vppl").querySelector(`[data-id="${id}"]`)) setExpr(id,EXPR.includes(e)?e:guessExpr(text)); else if(!m) setExpr(null);
  logLines.push([me?"代表":m?m.n:"",text]);
  const el=$("#vtext"); el.className="vtext"+(me?" me":""); clearInterval(typing); $("#vbox").classList.remove("wait");
  if(still){el.textContent=text; typing=null; return}
  let i=0; const chars=[...String(text)]; el.textContent="";
  typing=setInterval(()=>{i+=2; el.textContent=chars.slice(0,i).join(""); if(i>=chars.length){clearInterval(typing);typing=null;$("#vbox").classList.add("wait");queueAuto()}},40)}
function advance(){if(!D||$("#vopts .choice")) return;
  if(typing){clearInterval(typing);typing=null;const it=logLines[logLines.length-1];$("#vtext").textContent=it?it[1]:"";$("#vbox").classList.add("wait");queueAuto();return}
  clearTimeout(autoT); step()}
$("#vbox").onclick=e=>{if(e.target.closest(".dia")) return; advance()};
document.addEventListener("keydown",e=>{if(!V) return; if(e.key===" "||e.key==="Enter"){if(document.activeElement?.closest?.("#vopts")) return; e.preventDefault(); advance()}
  if(e.key==="Escape"){if($("#vlog").classList.contains("on")) $("#vlog").classList.remove("on"); else if(!D) leave()}});
function showChoices(C){$("#vbox").classList.remove("wait"); stopAutoTimer();
  $("#vopts").innerHTML=C.map((c,i)=>`<button class="vopt choice" data-c="${i}">${esc(c.t)}${c.s?`<small>${esc(c.s)}</small>`:""}</button>`).join("");
  $("#vopts").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>choose(C[+b.dataset.c])); $("#vopts button")?.focus({preventScroll:true})}
function choose(c){
  $("#vopts").innerHTML=""; applyChoice(c);
  D.q=[{k:"line",id:"me",text:c.t}];
  for(const l of c.r||[]) D.q.push({k:"line",id:l[0]||"",text:l[1],e:l[2]});
  if(c.next) D.q.push({k:"node",key:c.next});
  step()}
function applyChoice(c){
  const id=c.to||D?.main; if(!S.m[id]) return;
  const xp=applyGain(id,c,(i,t)=>fx(i,t));
  if(xp>0&&V&&(V.room==="practice"||V.room==="studio")) coachGrowth(id,V.room);
  save(!V?.test)}
function fx(id,t){const m=byId(id),e=document.createElement("span");e.style.setProperty("--c",m?.c||"#E85C8A");e.textContent=`${m?.n||""} ${t}`;$("#fx").appendChild(e);setTimeout(()=>e.remove(),2700)}
/* Auto 與 Log */
function queueAuto(){if(!auto||!D) return; clearTimeout(autoT); const n=($("#vtext").textContent||"").length; autoT=setTimeout(()=>{if(auto&&D&&!$("#vopts .choice")) step()},1100+n*45)}
function stopAutoTimer(){clearTimeout(autoT)}
function stopAuto(){auto=false;$("#autoBtn").setAttribute("aria-pressed","false");clearTimeout(autoT)}
$("#autoBtn").onclick=()=>{auto=!auto;$("#autoBtn").setAttribute("aria-pressed",String(auto)); if(auto&&!typing&&D) queueAuto()};
$("#logBtn").onclick=()=>{const L=$("#vlog");L.innerHTML=`<button class="x" id="logX">關閉</button>`+logLines.map(([n,t])=>`<p>${n?`<b>${esc(n)}</b>`:""}${esc(t)}</p>`).join("");L.classList.add("on");L.scrollTop=L.scrollHeight;$("#logX").onclick=()=>L.classList.remove("on")};

/* ---------- 手機 ---------- */
function openSheet(id){}
/* 不可捲動的區塊(舞台、面板)不允許被捲走:焦點移到畫面外的按鈕時,瀏覽器會把它捲動,整片畫面就偏掉 */
document.addEventListener("scroll",e=>{ const t=e.target; if(!t||t.nodeType!==1) return; const cs=getComputedStyle(t);
  if(t.scrollLeft&&(cs.overflowX==="hidden"||cs.overflowX==="clip")) t.scrollLeft=0;
  if(t.scrollTop&&(cs.overflowY==="hidden"||cs.overflowY==="clip")) t.scrollTop=0 },true);
$("#phoneBtn").onclick=()=>{ if(window.openPhone) openPhone() };
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>openSheet(null));

/* ---------- 選單 ---------- */
const setDlg=$("#setDlg");
$("#menuBtn").onclick=()=>{renderSet(); setPause("menu",true); setDlg.showModal()};
$("#setClose").onclick=()=>setDlg.close();
setDlg.addEventListener("close",()=>setPause("menu",false));
function renderSet(){const c=syCfg(),a=syAuth();
  $("#cfgInfo").textContent=c?`已設定專案:${c.projectId}`:""; $("#cfgBox").classList.toggle("hidden",!!a);
  $("#inBox").classList.toggle("hidden",!!a); $("#outBox").classList.toggle("hidden",!a); $("#who").textContent=a?`已登入:${a.email}`:"";
  document.querySelectorAll("[data-speed]").forEach(b=>b.setAttribute("aria-pressed",String((S.speed||1)==+b.dataset.speed)));
  $("#verNote").textContent="版本 "+(window.APP_VERSION||"開發版"); renderSources()}
function renderSources(){if(!$("#srcList")) return;
  const sc=cloudSnips(), lib=sc.length, byType={}; sc.forEach(s=>byType[s.type]=(byType[s.type]||0)+1);
  const items=Object.values(ITEMS), daily=items.filter(l=>l.occasion==="練習"||String(l.occasion).startsWith("日常"));
  $("#srcList").innerHTML=(syAuth()?"":`<li>還沒登入,目前用內建的示範劇情與立繪。</li>`)
    +`<li>劇本工坊:${lib?`已收錄 ${lib} 個片段(${Object.entries(byType).map(([k,v])=>k+" "+v).join("、")})`:"還沒有讀到已收錄的片段,先用內建示範劇情"}</li>`
    +`<li>衣帽間工坊:${items.length?`${items.length} 套造型,其中練習與日常類 ${daily.length} 套`:"還沒有讀到造型"}</li>`;
  const sprites=window.OUTFIT_SPRITES||[], done=new Set(sprites.filter(o=>o.look).map(o=>o.look+"@"+o.m));
  const todo=[]; for(const l of daily) for(const [slot,o] of Object.entries(l.members||{})){const mid=WMEM[slot]; if(mid&&o.img&&!done.has(l.code+"@"+mid)) todo.push(`${byId(mid).n}:${l.name}(${l.code},${l.occasion}${l.seasons?.length&&l.seasons.length<4?"・"+l.seasons.join(""):""})`)}
  const season=seasonOf(dateOf(S.day));
  $("#wardList").innerHTML=M.map(m=>{const w=wardrobe(m.id);return `<li><b style="color:${m.c}">${m.n}</b>:${Object.entries(CAT).map(([k,occ])=>{const n=w.filter(o=>o.occ===occ).length,ns=w.filter(o=>o.occ===occ&&(!o.seasons.length||o.seasons.includes(season))).length;return `${k} ${n}${n?`(${season}天可穿 ${ns})`:""}`}).join("・")}</li>`}).join("")
    +(todo.length?`<li>衣帽間已生圖、還沒處理成遊戲立繪的(把這些圖交給 Claude 處理):<br>${todo.map(esc).join("<br>")}</li>`:"")}
$("#cfgSave").onclick=()=>{const t=$("#cfgIn").value; const k=t.match(/apiKey["'\s:]+["']([^"']+)["']/),p=t.match(/projectId["'\s:]+["']([^"']+)["']/);
  if(!k||!p){toast2("找不到 apiKey 或 projectId,請貼上整段 firebaseConfig");return}
  localStorage.setItem(SY_CFG,JSON.stringify({apiKey:k[1],projectId:p[1]})); $("#cfgIn").value=""; renderSet(); toast2("Firebase 設定已儲存")};
$("#signIn").onclick=async()=>{const c=syCfg(); if(!c){toast2("先貼上 Firebase 設定");return} syStatus("登入中…");
  try{const j=await syJSON(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(c.apiKey)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("#syEmail").value.trim(),password:$("#syPw").value,returnSecureToken:true})});
    localStorage.setItem(SY_AUTH,JSON.stringify({uid:j.localId,email:j.email,refreshToken:j.refreshToken})); syTok={id:j.idToken,exp:Date.now()+(+j.expiresIn-60)*1000};
    $("#syPw").value=""; renderSet(); syncAll(true,true)}catch(e){syStatus(syMsg(e),true)}};
$("#makerBtn").onclick=()=>{setDlg.close(); window.openMaker&&openMaker()};
$("#signOut").onclick=()=>{localStorage.removeItem(SY_AUTH);syTok=null;renderSet();syStatus("");toast2("已登出,本機進度保留")};
$("#syncBtn").onclick=()=>syncAll(true,false);
document.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>{S.speed=+b.dataset.speed;save();renderSet()});
$("#resetBtn").onclick=()=>{if(!confirm("確定從第一天重新開始?目前的進度會清掉(雲端存檔也會被覆蓋)。"))return;const sp=S.speed;S=fresh();S.speed=sp;assign();ensureWear();setDlg.close();renderAll();save(true);pushSave();toast("清晨","第 1 天開始")};

/* ---------- 版本更新(跟其他工具相同) ---------- */
const isNative=!!window.Capacitor?.isNativePlatform?.();
let updLatest=null,updLastCheck=0,updDismissed=0;
async function checkUpdate(manual){updLastCheck=Date.now();
  if(!window.PAGES_URL||typeof window.APP_BUILD!=="number"){ if(manual) toast2("開發版不檢查更新"); return }
  try{const r=await fetch(window.PAGES_URL+"version.json?t="+Date.now(),{cache:"no-store"}); if(!r.ok) throw 0; const v=await r.json();
    if(+v.build>window.APP_BUILD){updLatest=v; if(manual||updDismissed!==+v.build) showUpdate(v)} else if(manual) toast2("已經是最新版本")}catch(e){ if(manual) toast2("檢查更新失敗,請確認網路") }}
function showUpdate(v){$("#updInfo").textContent=`目前 ${window.APP_VERSION},最新 ${v.version}。`;$("#updNotes").textContent=v.notes?("更新內容:"+String(v.notes).trim().slice(0,400)):"";
  $("#updHow").textContent=isNative?"按下後會用瀏覽器下載新的安裝檔,下載完點開安裝,進度會保留。":"按下後會重新載入成新版,進度會保留。";$("#updGo").textContent=isNative?"下載新版":"立即更新";
  setPause("upd",true); const d=$("#updDlg");if(!d.open) d.showModal()}
$("#updDlg").addEventListener("close",()=>setPause("upd",false));
$("#updLater").onclick=()=>{updDismissed=+(updLatest?.build||0);$("#updDlg").close()};
$("#updGo").onclick=async()=>{save(); await pushSave();
  if(isNative){const url=window.PAGES_URL+"KPOP-Game.apk?v="+(updLatest?.build||Date.now());const w=window.open(url,"_blank");if(!w) location.href=url;return}
  $("#updGo").disabled=true;$("#updGo").textContent="更新中…";try{await Promise.all(["index.html","game.js","wardrobe.js","songs.js","scripts.js","stage.js","sprites.js","phone.js","growth.js","cg.js","assets/poses.js","version.js","assets/outfits.js","manifest.webmanifest"].map(u=>fetch(u,{cache:"reload"}).catch(()=>{})))}catch(e){}location.reload()};
$("#updCheck").onclick=()=>checkUpdate(true);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Date.now()-updLastCheck>30*60*1000) checkUpdate(false)});

/* ---------- 啟動 ---------- */
(async()=>{
  await IDB.open(); SCRIPTS=await IDB.get("scripts")||{}; ITEMS=await IDB.get("items")||{}; WMEM=await IDB.get("wmem")||{}; WMETA=await IDB.get("wmeta")||[];
  if(window.growthInit) growthInit();
  if(!Object.keys(S.where).length||Object.values(S.where).includes("bedroom")) assign();
  ensureWear(true); renderAll();
  $("#boot").classList.add("done");
  requestAnimationFrame(t=>{last=t;tick(t)});
  setTimeout(()=>checkUpdate(false),3000);
  titleReady();
})();
/* ---- 標題畫面(兼讀取畫面):讀完本機資料就能開始,雲端同步在背景進行 ---- */
function titleReady(){
  const el=$("#title"); if(!el) {syncAll(false,true); return}
  setPause("title",true);
  const btn=$("#ttStart"), msg=$("#ttMsg"), sy=$("#ttSync");
  btn.disabled=false; msg.textContent="點擊畫面開始";
  if(syAuth()&&syCfg()){ sy.textContent="正在同步雲端…"; syncAll(false,true).then(()=>{sy.textContent="雲端同步完成"}).catch(()=>{sy.textContent="雲端同步失敗,可稍後在選單重試"}) }
  else sy.textContent="離線遊玩・可在選單登入雲端同步";
  const go=()=>{ el.classList.add("out"); setPause("title",false); setTimeout(()=>el.remove(),900) };
  el.onclick=go; btn.onclick=e=>{e.stopPropagation();go()};
}
