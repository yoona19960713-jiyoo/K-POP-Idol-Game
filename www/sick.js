"use strict";
/* =====================================================================
   1.1 第 3 輪第 2 包(2026-11-03):藝瑟累倒或感冒 → 「反過來照顧她」(ys_care)
   什麼時候會發生(新的一天開始時決定,用日期當種子,重新整理也一樣):
     ① 累倒(fever):前一天白天壓力到 85 以上 → 隔天早上微燒(離上次生病至少 10 天)
     ② 感冒(cold):換季後 20 天內每天 2.5%,冬天整季每天再 0.8%,下雨下雪的日子 ×1.5;每季最多一次,離上次生病至少 20 天
     她要到「信任」以上。這些日子不會生病:剛上任的第一週、里程碑當天與前一天、連假、月評、宣傳期、回歸與演唱會前後、
     出道前後三天、她的生日、1/13。
   那一天(沒有懲罰、能力不扣):
     - 她整天在自己房間休息(蓋過作息表、深夜事件、邀約),穿睡衣,剖面圖上是累的表情,名牌寫「在休息」;壓力每段往下降。
     - 早上:夏恩在群組說,其他人各回一句;她私訊你說自己沒事(依累倒或感冒、關係段落)。
     - 走進她房間:這個時段第一次進來,看到大家照顧她的痕跡(夏恩的粥、泰梨的便利貼、日和的圍巾、河嵐在門外唱歌、小夜燈)。
       「你不在場時」也看得到這些事。其他四人那天跟你說的第一句話會提到她。
     - 她的打招呼、隨口互動、聊天(早、午、晚三段;同一段第二次來時她已經睡著了)都是生病那天的版本;
       「邀她做…」只有「照顧她」(act.js 的內建版本,內容庫有 ys_care 就先演),那天沒有全員活動。
     - 深夜 23:30 以後:照顧過她的話,她私訊說謝謝;沒有的話,夏恩在群組說她退燒了。
   隔天:恢復,心情回升(照顧過 +15,沒有 +8)、壓力降到 30 以下,群組報平安,她跟你說的第一句話是昨天的事。
   資料:S.sick={id,day,kind,cared,caredAt,rec,msg,seen}、S.sickHi(白天壓力到 85 的那天)、S.sickSeason{年季:那天}(跟著存檔同步)
   ===================================================================== */
(()=>{
const DY=window.DAILY, WHO="ys";
const N=t=>["",t];
const dayOfDate=s=>{ const [y,m,d]=s.split("-").map(Number); return Math.round((new Date(y,m-1,d)-dateOf(0))/864e5) };
const MILE_DAYS=Object.values(DY.MILESTONES||{}).map(v=>dayOfDate(v.date));
const rankOf=id=>DY.rank(stageOf(id));
const isB=id=>DY.bandOf(stageOf(id))!=="A";
const wx=()=>typeof wxNow==="function"?wxNow():"clear";
const cur=()=>S.sick&&S.sick.day===S.day?S.sick:null;
const yest=()=>S.sick&&S.sick.day===S.day-1?S.sick:null;
window.sickIs=id=>{ const c=cur(); return !!c&&c.id===id };
window.sickKind=id=>{ const c=cur(); return c&&c.id===id?c.kind:null };

/* ---------- 什麼時候會生病 ---------- */
const SEA_M={春:3,夏:6,秋:9,冬:12};
function seaInfo(day){ const d=dateOf(day), s=seasonOf(d), y=d.getFullYear()-(s==="冬"&&d.getMonth()<2?1:0);
  return {s,key:y+s,since:Math.floor((d-new Date(y,SEA_M[s]-1,1))/864e5)} }
function busy(day){ const d=dateOf(day), md=(d.getMonth()+1)*100+d.getDate();
  if(day<7) return "剛上任";
  if(MILE_DAYS.some(x=>day===x||day===x-1)) return "里程碑";
  if(window.mileHoliday?.(day)) return "連假";
  if(window.isEvalDay?.(d)) return "月評";
  if(S.promo&&day>=S.promo.start-1&&day<S.promo.start+28) return "宣傳期";
  if(S.comeback!=null&&Math.abs(day-S.comeback)<=1) return "回歸";
  const cn=S.concertNext?.day; if(cn!=null&&Math.abs(day-cn)<=2) return "演唱會";
  const DD=window.DEBUT_DAY; if(DD!=null&&Math.abs(day-DD)<=3) return "出道";
  if(md===814||md===113) return "紀念日";
  return "" }
function decide(){ const day=S.day; if(S.sick?.day===day) return;
  if(busy(day)||rankOf(WHO)<DY.rank("信任")) return;
  const last=S.sick?.day??-99, r=rng(seedOf(day,"sick")); let kind=null;
  if(S.sickHi===day-1&&day-last>=10) kind="fever";
  else if(day-last>=20){ const si=seaInfo(day); if(!(S.sickSeason||{})[si.key]){
    let p=(si.since<20?.025:0)+(si.s==="冬"?.008:0); if(["rain","snow"].includes(wx())) p*=1.5; if(r()<p) kind="cold" } }
  if(!kind) return;
  S.sick={id:WHO,day,kind,cared:0,rec:0,msg:"",seen:{}};
  if(kind==="cold") (S.sickSeason=S.sickSeason||{})[seaInfo(day).key]=day;
  const s=S.m[WHO]; s.stress=Math.min(s.stress,70);
  morning() }
/* 白天(清晨到晚上)每段結束時,壓力到 85 以上就記下來(game.js 的 slotEnd,壓力更新之後) */
window.sickOnSlotEnd=()=>{ try{ if(S.slot<=3&&(S.m[WHO]?.stress||0)>=85&&!window.sickIs(WHO)) S.sickHi=S.day }catch(e){} };
function recover(){ const y=yest(); if(!y||y.rec) return; y.rec=1; const s=S.m[y.id];
  s.mood=clamp(s.mood+(y.cared?15:8),0,100); s.stress=Math.min(s.stress,30);
  window.phoneSay?.("group",y.cared?REC.cared:REC.plain) }
/* 新的一天(game.js 的 slotEnd,跨日之後、排作息之前) */
window.sickOnDay=()=>{ try{ recover(); decide() }catch(e){ window.logErr?.("生病",e) } };
/* 作息:她整天在自己房間(game.js 的 assign,連假之後) */
window.sickWhere=()=>{ const c=cur(); if(!c) return; S.where[c.id]="bed_"+c.id; if(S.doing) S.doing[c.id]=c.kind==="cold"?"感冒在休息":"發燒在休息" };
/* 照顧過她(act.js 的 ys_care 結束時) */
window.sickCare=id=>{ const c=cur(); if(c&&c.id===id){ c.cared=1; c.caredAt=S.min; save(true) } };

/* ---------- 群組與私訊 ---------- */
const G={fever:[["he","大家!藝瑟發燒了,三十七度八。今天她請假休息,誰都不准吵她。","angry"],["ys","我沒事啦~只是有一點點熱。練習表放在客廳桌上,大家照著練喔。","smile"],
    ["tr","……練習表我收走了。妳睡。","neutral"],["hy","歐尼,大丈夫ですか?中午我幫妳拿藥上去。","sad"],["hr","藝瑟歐尼!!我今天會很小聲的!!(這已經是小聲了)","laugh"]],
  cold:[["he","藝瑟感冒了,喉嚨啞掉。今天練習她請假,粥我來煮。","smile"],["ys","……聲音變成鴨子了。大家離我遠一點,不要被傳染喔。","shy"],
    ["hy","日本感冒的時候要喝生薑湯!我來做!","smile"],["tr","……練習我會盯著。妳不准看手機。","neutral"],["hr","歐尼的鴨子聲我想聽!……開玩笑的啦,快點好起來!","laugh"]]};
const PM={fever:{A:"代表,對不起……今天可能沒辦法去練習了。我沒事的,只是有一點點熱。",B:"代表~隊長今天要請假一天。不要擔心喔,睡一下就好了。……真的只要一下下。"},
  cold:{A:"代表早安……聲音啞了,今天先請假一天。大家就拜託您了。",B:"代表……我感冒了。不准笑我的聲音。今天練習就拜託你了。"}};
const REC={cared:[["ys","大家早安~我好了!!今天開始照常練習!","laugh"],["he","先吃早餐再說啦!今天換成蛋粥。","smile"],["tr","……今天只准跳一半。練習表照我排的走。","neutral"],["ys","……還有,昨天謝謝代表。","shy"]],
  plain:[["ys","大家早安~我好了!!今天開始照常練習!","laugh"],["he","先吃早餐再說啦!今天換成蛋粥。","smile"],["hr","藝瑟歐尼復活了!!我可以大聲講話了嗎!","laugh"],["hy","おかえりなさい!……啊,是「歡迎回來」的意思~","laugh"]]};
function morning(){ const c=S.sick, B=isB(c.id)?"B":"A";
  window.phoneSay?.("group",G[c.kind]); window.phoneSay?.(c.id,[[c.id,PM[c.kind][B],"shy"]]);
  setTimeout(()=>toast2(`${byId(c.id).n}今天${c.kind==="cold"?"感冒":"發燒"}了,整天在房間休息`),1600) }
/* 深夜(23:30 以後):照顧過她 → 她私訊說謝謝(照顧完至少 30 分鐘後);沒有 → 夏恩在群組說她退燒了 */
window.sickTick=()=>{ const c=cur(); if(!c||S.min<1410) return;
  if(c.cared&&c.msg!=="p"&&S.min>=(c.caredAt||0)+30){ c.msg="p";
    const B=isB(c.id), L=B?[[c.id,"代表~還醒著嗎?"],[c.id,`粥、${c.kind==="cold"?"薑茶":"退熱貼"},還有你坐在那裡的那一個小時。我都記住了。晚安。`]]:[[c.id,"代表,還沒睡吧?今天謝謝您。"],[c.id,"明天,我一定會好起來的。晚安。"]];
    window.phoneSay?.(c.id,L); save(true); return }
  if(!c.cared&&!c.msg){ c.msg="g"; window.phoneSay?.("group",[["he",c.kind==="cold"?"報告!藝瑟的聲音回來一半了,粥也吃完了。大家晚安~":"報告!藝瑟退燒了,粥也吃完了。大家晚安~","smile"],[c.id,"……夏恩真的有檢查。晚安~","laugh"]]); save(true) } };

/* ---------- 你不在場時(她房間裡發生的事;game.js 的 slotEnd,換段之前) ---------- */
const AWAY=["夏恩端著托盤上樓,托盤上是一碗白粥和一顆剝好的濟州橘子。","泰梨在藝瑟的房門上貼了一張便利貼:「隊長:今天休息。練習交給我。」",
  "日和把自己的圍巾留在藝瑟床邊,說在日本生病的時候,一定要圍住脖子。","河嵐抱著吉他坐在走廊上,隔著門小聲唱了一首濟州的搖籃曲。","藝瑟的房間很早就關燈了。門縫底下,只剩一點小夜燈的光。"];
window.sickAbsent=list=>{ try{ const c=cur(); if(!c||!Array.isArray(list)||S.entered?.includes("bed_"+c.id)) return; const t=AWAY[S.slot]; if(!t) return;
  list.unshift(`<b>${esc(PL["bed_"+c.id]?.n||"")}</b>:${esc(t)}`); if(list.length>3) list.length=3 }catch(e){} };

/* ---------- 走進她房間(這個時段第一次進來) ---------- */
const ENTRY=[c=>[N("(門開著一條縫。夏恩端著空托盤走出來,對你比了比裡面,用嘴型說:「在休息。」)"),
    N(c.kind==="cold"?"(藝瑟縮在被子裡,床頭的面紙已經用掉半盒。看到你,她立刻想坐起來。)":"(藝瑟躺在床上,額頭貼著退熱貼。看到你,她立刻想坐起來。)"),["ys","代、代表?你怎麼來了……我沒事啦,真的。","surprise"]],
  ()=>[N("(房門上貼著一張便利貼,是泰梨的字:「隊長:今天休息。練習交給我。」)"),["ys","……泰梨貼的。我傳訊息叫她拿下來,她說拿下來就再貼十張。","laugh"],["ys","代表,練習那邊……沒問題吧?","tired"]],
  ()=>[N("(書桌上的粥只剩一半。床邊多了一條香檳色的圍巾,摺得整整齊齊。)"),["ys","日和說,在日本生病的時候,一定要把脖子圍起來。","smile"],["ys","……那是她最喜歡的圍巾耶。","moved"]],
  ()=>[N("(走廊上傳來很小聲的吉他。河嵐坐在房門外對著門唱歌,看到你,比了一個噓,抱著吉他跑走了。)"),["ys","……河嵐在門外唱了半個小時。她以為我睡著了。","moved"],["ys","濟州的搖籃曲。奶奶教她的那首。","smile"]],
  ()=>[N("(房間只開著小夜燈。她半睡半醒,手裡還握著隊長筆記本,筆蓋沒有蓋上。)"),["ys","嗯……代表?……我只是在記,今天大家……都有好好吃飯……","tired"]]];
const sn=(code,L,C=[])=>({code,type:"chat",member:WHO,who:[WHO],cd:0,nodes:{start:{L,C}}});
function entryLines(c){ const k="e"+S.slot; if(c.seen[k]) return []; c.seen[k]=1; return ENTRY[S.slot]?.(c)||[] }
window.sickEntry=pid=>{ const c=cur(); if(!c||pid!=="bed_"+c.id||S.where[c.id]!==pid) return null; const L=entryLines(c); return L.length?sn(`sick-entry-${S.slot}`,L):null };

/* ---------- 聊天(早 0~1、午 2、晚 3~4 段各一次;同一段再來,她已經睡著了) ---------- */
const TALK={
  m:c=>({L:[["ys","代表……練習已經開始了吧?我躺在這裡,總覺得少做了什麼。","tired"],["ys","我去看一下就回來,一下下就好……","smile"],N("(她掀開被子,腳才碰到地板,整個人就晃了一下。)")],
    C:[{t:"「躺回去。今天練習室沒有隊長,也不會塌。」",s:"嚴厲",to:"ys",g:3,r:[["ys","……代表好兇。","pout"],N("(她嘴上抱怨,還是乖乖把被子拉回下巴。)")]},
      {t:"(扶住她,把她輕輕按回枕頭上。)",s:"出手幫忙",to:"ys",g:3,r:[["ys","欸、欸……代表,我自己可以……","shy"],N("(她的手不知道該放哪裡,最後抓住了被角。)")]},
      {t:"「泰梨在帶大家暖身。妳排的練習表,她一行都沒改。」",s:"安慰",to:"ys",g:2,r:[["ys","……那孩子。","moved"],["ys","那我再睡一下下。真的只有一下下喔。","smile"]]}]}),
  a:c=>({L:[N("(她靠在床頭,手機亮著,是群組裡大家傳來的練習室照片。)"),["ys","你看,河嵐今天第一次沒有跳錯那個八拍。……在我不在的時候。","smile"],["ys","是不是我不在,大家反而比較好啊。開玩笑的~","laugh"]],
    C:[{t:"「她是想讓妳回來的時候嚇一跳。」",s:"鼓勵",to:"ys",g:3,r:[["ys","……嚇一跳?","surprise"],["ys","那我明天一定要很誇張地被嚇到給她看。","laugh"]]},
      {t:"(把她的手機拿走,放到書桌上。)",s:"嚴厲",to:"ys",g:2,r:[["ys","啊——我的情報!","pout"],N("(她伸手抓了兩下,抓不到,只好把臉埋進枕頭裡笑。)")]},
      {t:"「這種玩笑,今天不准開。」",s:"安慰",to:"ys",g:3,r:[N("(她的笑容停了一下。)"),["ys","……嗯。知道了。","shy"]]}]}),
  e:c=>({L:[["ys",isB(c.id)?"代表~這麼晚了還來看我……會被傳染的喔。":"代表,這麼晚了還來……會被傳染的。","tired"],N("(她把被子拉到鼻子,只露出一雙眼睛。)"),["ys","生病的時候好奇怪,會想起很久以前的事。","sad"]],
    C:[{t:"「想起什麼?」",s:"安慰",to:"ys",g:3,r:[["ys","……2013 年。那時候也是這樣躺著,等一通電話。","sad"],["ys","……不說了。今天的電話,只有大家傳來的「快點好」。","smile"]]},
      {t:"(把床頭的燈調暗一點,在旁邊坐下。)",s:"陪著",to:"ys",g:3,r:[["ys","……代表坐在那裡,我會睡不著啦。","shy"],N("(說完不到五分鐘,她的呼吸就慢了下來。)")]},
      {t:"「那就想今天的事。今天大家都很想妳。」",s:"鼓勵",to:"ys",g:2,r:[["ys","……真的?連泰梨也是?","surprise"],["ys","她貼在門上的那張紙,我要收進筆記本裡。","laugh"]]}]})};
const REST=[N("(她已經睡著了。呼吸很慢,眉頭總算鬆開了。)"),N("(你幫她把被子拉到肩膀,關掉桌燈,輕輕帶上門。)")];
window.sickTalk=(id,pid)=>{ const c=cur(); if(!c||c.id!==id) return null; const b=S.slot<=1?"m":S.slot===2?"a":"e", pre=entryLines(c);
  if(c.seen["t"+b]) return sn(`sick-rest-${b}`,[...pre,...REST]);
  c.seen["t"+b]=1; const T=TALK[b](c); return sn(`sick-talk-${b}`,[...pre,...T.L],T.C) };

/* ---------- 互動面板:打招呼、隨口互動、「邀她做…」打開時的一句(meet.js) ---------- */
const GREET={A:[["代表……?我沒事啦,只是躺一下。","tired"],["代表好……不要靠太近喔,會傳染的。","tired"]],B:[["代表~今天的隊長是病號,請多包涵。","tired"],["你來了……我剛剛還在想,你會不會來。","shy"]]};
window.sickGreet=id=>{ if(!window.sickIs(id)) return null; const L=GREET[isB(id)?"B":"A"], r=rng(seedOf(S.day,S.slot,"sickg")); return L[Math.floor(r()*L.length)] };
const CAS={hello:[N("(她從被子裡伸出一隻手,有氣無力地揮了揮。)"),["ys","代表好……今天的隊長,電量只剩百分之二十。","tired"]],
  drink:[N("(你把一杯溫溫的蜂蜜柚子茶放在她床頭。)"),["ys","柚子茶……我最喜歡的。代表怎麼知道?……是夏恩說的吧。","smile"]],
  notice:[N("(你注意到隊長筆記本被藏在枕頭底下,只露出一角。)"),["ys","沒、沒有在寫喔!只是放在那裡……比較安心。","shy"]],
  scroll:[N("(她把手機轉過來給你看,是大家在練習室對著鏡頭比的愛心。)"),["ys","你看,四個愛心。這個歪掉的是河嵐。","laugh"]],
  five:[N("(你舉起手。她從被子裡伸出手指,輕輕碰了一下。)"),["ys","今天只能這樣擊掌。等我好了,再用力的。","smile"]],
  pat:[N("(你把手放在她額頭上試溫度,順手摸了摸她的頭。)"),["ys","……還有一點燙吧。手……可以再放一下嗎?","shy"]]};
window.sickCasual=(id,ca)=>window.sickIs(id)&&CAS[ca]?{L:CAS[ca].slice(),code:""}:null;
window.sickAsk=id=>window.sickIs(id)?(isB(id)?["……真的要照顧我?那、那就一下下。","shy"]:["欸?照顧我?不用啦,代表去忙……","shy"]):null;

/* ---------- 第一句話(life.js 的 lifeOpener):那天其他人會提到她;隔天她自己說昨天的事 ---------- */
const OTHER={he:["代表,藝瑟的粥我放在她桌上了。你去的時候,幫我看她有沒有吃完。","smile"],tr:["……隊長的練習我盯著。她要是想下床,你就說是我說的。","neutral"],
  hy:["代表,藝瑟歐尼……大丈夫ですか?我怕吵醒她,不敢進去。","sad"],hr:["代表!我今天一整天都小聲講話喔!……你聽,這已經是最小聲了!","laugh"]};
const AFTER={cared:{A:["昨天……謝謝您。隊長在代表面前躺了一整天,好丟臉。","shy"],B:["昨天的事,可以當作沒發生嗎?……好啦,不行也沒關係。謝謝你。","shy"]},
  plain:["我好了!一天沒練,今天要補回來~……啊,我會先吃早餐的。","laugh"]};
window.sickOpener=id=>{ try{
  const c=cur(); if(c&&c.id!==id&&OTHER[id]&&rng(seedOf(S.day,id,"sickop"))()<.85) return {t:OTHER[id][0],e:OTHER[id][1],k:"sick"};
  const y=yest(); if(y&&y.id===id){ const v=y.cared?AFTER.cared[isB(id)?"B":"A"]:AFTER.plain; return {t:v[0],e:v[1],k:"sick"} }
  return null }catch(e){ return null } };

/* 測試用 */
window.sickBusy=busy; window.sickSeason=seaInfo;
window.sickForce=kind=>{ S.sick={id:WHO,day:S.day,kind:kind||"fever",cared:0,rec:0,msg:"",seen:{}}; morning() };
window.sickDebug=()=>({sick:S.sick?{...S.sick,seen:{...S.sick.seen}}:null,hi:S.sickHi??null,season:{...(S.sickSeason||{})},busy:busy(S.day)});
})();
