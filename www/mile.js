"use strict";
/* =====================================================================
   里程碑(改版 1.0 第 5 輪;2026-10-29 使用者定案的行事曆,DAILY.MILESTONES)
   那天清晨群組先通知(藝瑟傳);到了時間(at)時鐘一走就自動演,不會錯過(對話、設施開著時等關掉):
     ① 有過場的先播過場(cine.js)② 要你決定的先決定(6/17 團名)③ 到那個地點演小劇情(內容庫的 event,
     沒有就用下面的內建版本)或事件卡 ④ 扣那件事的時間、記下來(S.mile)。
   中秋 9/14~16:其他四人回家(外出),作息照週日(放假);只有日和留下。
   {團名}(6/17 之後)、{出道曲}(8/19 之後)、{粉絲名}(2017/02/14 之後,直接是 DAILY.FAN_NAME)給台詞用。
   ===================================================================== */
(()=>{
const DY=window.DAILY, MS=DY.MILESTONES;
const dayOfDate=s=>{ const [y,m,d]=s.split("-").map(Number); return Math.round((new Date(y,m-1,d)-dateOf(0))/864e5) };
const DAYS={}; for(const [k,v] of Object.entries(MS)) DAYS[k]=dayOfDate(v.date);
const done=k=>S.mile?.[k]!=null;
const todayMile=()=>Object.keys(MS).find(k=>DAYS[k]<=S.day&&S.day<=DAYS[k]+1&&!done(k));   // 錯過了(跨過午夜)隔天補
let RUNNING=false, NOTIFIED=null;
/* 團名、出道曲 */
window.groupName=()=>S.groupName||"完美女團";
window.mileVar={粉絲名:()=>S.day>=DAYS.fan_name?DY.FAN_NAME:null,團名:()=>S.groupName||null,出道曲:()=>S.day>=DAYS.debut_song?(window.albumList?.().find(a=>a.n===1)?.title||window.songSummary?.()?.title?.name||null):null};
/* 中秋:9/14~16 其他人回家、照假日作息 */
const away=()=>{ const a=MS.chuseok.away; return a?[dayOfDate(a[0]),dayOfDate(a[1])]:null };
window.mileHoliday=day=>{ const a=away(); return !!a&&day>=a[0]&&day<=a[1] };
window.mileWhere=()=>{ if(!window.mileHoliday(S.day)) return; for(const m of M) if(!MS.chuseok.who.includes(m.id)){ S.where[m.id]="外出:回家"; if(S.doing) S.doing[m.id]="中秋回家" } };
/* 清晨的通知(群組,藝瑟傳) */
const NOTE={first_eval:"大家!今天下午三點是月評!代表也會來看喔,加油!",showcase_in:"今天下午兩點,公司內部展示。大家吃飽一點,不要緊張~",group_name:"今天下午兩點在會議室開會……聽說要決定團名了!",
  debut_song:"今天下午兩點,錄音室!出道曲要開始錄了!",chuseok:"中秋快樂~我們回家囉!日和,宿舍就交給你了,記得吃飯!",concept_shoot:"今天早上十點攝影棚,概念照!大家昨晚有好好睡覺吧?",
  debut_announce:"中午十二點,公司要公布出道日了……我好緊張。",final_eval:"今年最後一次評估,下午三點。大家,最後一次了!",rehearsal:"下午三點,Showcase 場地彩排。兩天後就是出道了。",
  fan_name:"今天晚上八點 Spotlight Live!要公布粉絲名了,大家記得準時上線~"};
function notify(){ const k=Object.keys(MS).find(x=>DAYS[x]===S.day&&!done(x)); if(!k||NOTIFIED===S.day+k||k==="first_day") return; NOTIFIED=S.day+k;
  if(NOTE[k]) window.phoneSay?.("group",[["ys",NOTE[k]]]); toast2(`今天 ${hm(MS[k].at)}:${MS[k].n}`) }
/* ---------- 內建版本(內容庫還沒有里程碑劇情時;品質照正式內容) ---------- */
const N=t=>["",t], C=(t,s,to,g,r)=>({t,s,to,g,next:"b",...(r?{r}:{})});
const FB={
  first_day:{start:{L:[N("(練習室的門一開,五個人同時轉過頭來。)"),["ys","代表好!我是隊長徐藝瑟。我們一直在等您。","smile"],["tr","……尹泰梨。","neutral"],["hy","早瀨日和です!啊、不對……我是早瀨日和!請多指教!","laugh"],["he","韓夏恩!代表吃過早餐了嗎?我多做了一份喔。","smile"],["hr","姜河嵐!我、我才來兩個月,可是我唱歌很大聲!","serious"]],
    C:[C("「一年後,我們一起出道。」","鼓勵","ys",3,[["ys","……是!","laugh"]]),C("「先吃早餐吧,夏恩做的。」","轉移話題","he",3,[["he","代表果然懂我!","laugh"]]),C("「我會記住你們每一個人。」","陪著","tr",2,[["tr","……說到做到。","neutral"]])]},
    b:{L:[N("(五個人笑成一團。窗外的雪停了。)"),["hr","代表!以後請多指教!","laugh"]],C:[]}},
  first_eval:{start:{L:[N("(評審席坐著公司的老師們。五個人站成一排,鏡子映出她們繃緊的背。)"),["ys","大家,跟平常一樣就好。","serious"],["hr","我、我的腿在抖……","shy"],["tr","……抖也要站好。","neutral"],["hy","代表在看。……我們可以的。","smile"],["he","河嵐,手給我。……好,一起。","smile"]],
    C:[C("(對她們點點頭,比了一個大拇指。)","鼓勵","hr",3),C("「不用完美,讓我看見你們這一個月。」","陪著","ys",3),C("「河嵐,深呼吸。三、二、一。」","出手幫忙","hr",3,[["hr","……呼——好!","laugh"]])]},
    b:{L:[N("(音樂停下時,沒有人說話。老師在評分表上寫了很久。)"),["he","……結束了?我們、我們跳完了!","laugh"],["ys","謝謝代表。下個月,我們會更好。","smile"]],C:[]}},
  showcase_in:{start:{L:[N("(練習室後面擺滿了折疊椅,坐著公司的高層、經紀組、宣傳組。)"),["he","好多人……第一次被這麼多人看。","shy"],["tr","……看就看。我們練了一百天。","serious"],["hy","代表,最後一個八拍,請看我們。","smile"],["hr","我會唱得很大聲的!","serious"],["ys","大家——上吧。","serious"]],
    C:[C("(站在最後一排,讓她們看得到你。)","陪著","ys",3),C("「讓他們記住你們。」","鼓勵","tr",3,[["tr","……好。","smile"]]),C("「哪裡出錯都沒關係,我負責。」","安慰","he",3,[["he","代表這樣說,我就不怕了。","smile"]])]},
    b:{L:[N("(最後的定格之後,後排有人先鼓了掌,接著整間練習室都響起掌聲。)"),["hr","代表!他們、他們在拍手耶!","laugh"],["ys","……這是我們的第一個掌聲。","moved"]],C:[]}},
  group_name:{start:{L:[N("(會議室的白板上寫滿了被劃掉的名字,最後只剩下一個。)"),["ys","{團名}……我們的名字。","moved"],["he","念起來好好聽!{團名}、{團名}~","laugh"],["tr","……還不錯。我會讓這個名字被記住。","smile"],["hy","{團名}。我要把它寫在日記的第一頁。","smile"],["hr","我要打電話給外婆!說我們有名字了!","laugh"]],
    C:[C("「從今天起,你們就是{團名}。」","鼓勵","ys",3),C("「這個名字,是你們一起掙來的。」","陪著","tr",3),C("「河嵐,外婆一定會很高興。」","陪著","hr",3,[["hr","嗯!她會第一個學會怎麼念!","laugh"]])]},
    b:{L:[N("(會議結束,五個人在走廊上一遍又一遍地念著那個名字。)"),["ys","代表,謝謝您。我們會配得上它的。","smile"]],C:[]}},
  debut_song:{start:{L:[N("(錄音室的螢幕上,是出道曲〈{出道曲}〉的分軌。)"),["hr","是這首……我們的出道曲。","moved"],["tr","副歌的那段 rap,我改了三十幾次。","serious"],["hy","聽第一次就想跳。這首歌很適合我們。","smile"],["he","我可以先錄嗎?我太想唱了!","laugh"],["ys","大家,錄完之前誰都不准哭喔。","laugh"]],
    C:[C("「河嵐先來。用你最大的聲音。」","鼓勵","hr",3,[["hr","交給我!","laugh"]]),C("「泰梨,改了三十幾次的那段,讓我聽聽。」","陪著","tr",3,[["tr","……只放一次。","shy"]]),C("「慢慢錄,今天錄到滿意為止。」","安慰","ys",2)]},
    b:{L:[N("(錄到最後一句時,控制室裡沒有人說話。然後,所有人一起看向你。)"),["ys","代表……這就是我們要唱給大家聽的歌。","smile"]],C:[]}},
  chuseok:{start:{L:[N("(宿舍頂樓,月亮大得像要掉下來。)"),["hy","代表……今天是中秋節呢。韓國的中秋,大家都回家了。","smile"],["hy","日本的中秋叫「お月見」。小時候,媽媽會做月見糰子。","smile"],["hy","……今年,只有我一個人沒回家。","shy"]],
    C:[C("「今年有我陪你賞月。」","陪著","hy",4,[["hy","……嗯。這樣就夠了。","shy"]]),C("「打個視訊給媽媽吧,我幫你拍月亮。」","出手幫忙","hy",3,[["hy","……代表好溫柔。","smile"]]),C("「明年,我們一起回大阪過。」","鼓勵","hy",3,[["hy","說好了喔?……我記住了。","laugh"]])]},
    b:{L:[N("(她把盒子裡的松片分成兩半,大的那一半遞給你。)"),["hy","韓國的中秋要吃這個,對吧?","smile"],["hy","……代表,月亮好漂亮。今天,我一點都不寂寞。","shy"]],C:[]}},
  concept_shoot:{start:{L:[N("(攝影棚的閃光燈一下一下亮起。五個人穿著出道概念的造型,站在白色背景前。)"),["he","這套……穿起來好像換了一個人。","shy"],["tr","攝影師叫我不要笑。……我本來就沒在笑。","neutral"],["hy","代表,這個角度可以嗎?","smile"],["hr","我第一次化這麼濃的妝……是我嗎?","surprise"],["ys","大家,看鏡頭——這是我們的第一張照片。","serious"]],
    C:[C("「很好看。這就是出道的你們。」","鼓勵","he",3),C("「河嵐,是你沒錯。很漂亮。」","安慰","hr",3,[["hr","……代表這樣說,我會當真喔。","shy"]]),C("(在攝影師後面,幫她們舉著反光板。)","出手幫忙","ys",2,[["ys","代表也太認真了吧!","laugh"]])]},
    b:{L:[N("(最後一張是五個人的合照。快門響起的時候,不知道誰先笑了出來。)"),["ys","……就用這張吧。大家都在笑的這張。","smile"]],C:[]}},
  final_eval:{start:{L:[N("(出道前最後一次評估。評審席坐滿了人,連社長都來了。)"),["ys","今年最後一次站在這裡了。","serious"],["tr","……兩週後,換成真的舞台。","serious"],["hy","代表,今年謝謝您。","smile"],["he","評估完我們去吃烤肉好不好?我請客!","laugh"],["hr","我、我不會哭的!結束之前不會!","shy"]],
    C:[C("「這一年,你們的每一天我都看著。」","陪著","ys",3),C("「最後一次只跳給我們看了。」","鼓勵","tr",3),C("「烤肉我請。跳完就去。」","開玩笑","he",3,[["he","代表萬歲!","laugh"]])]},
    b:{L:[N("(社長站起來,第一個鼓掌。)"),["hr","……我說不哭的。","moved"],["ys","代表,我們準備好了。","smile"]],C:[]}},
  rehearsal:{start:{L:[N("(Showcase 場地的後台,工作人員來來去去,舞台上的燈一盞一盞試亮。)"),["ys","最後一次彩排。兩天後,台下會坐滿人。","serious"],["tr","耳返的音量,再調一次。","serious"],["hy","代表……我的手有點冰。","shy"],["he","大家,看我!深呼吸——呼——","laugh"],["hr","我不緊張!……騙人的,我好緊張。","shy"]],
    C:[C("(握一下日和冰冷的手。)","安慰","hy",4,[["hy","……暖和了。謝謝代表。","shy"]]),C("「這一年,你們比任何人都努力。」","鼓勵","ys",3),C("「河嵐,緊張就看我。我會在第一排。」","陪著","hr",3,[["hr","說好了!第一排!","laugh"]])]},
    b:{L:[N("(彩排結束,五個人站在空蕩蕩的舞台上,看著台下一排一排的空位。)"),["ys","代表,兩天後見。在這裡。","smile"]],C:[]}},
  /* 2026-10-31:粉絲名公布(Spotlight Live) */
  fan_name:{start:{L:[N("(練習室的鏡子前架好了手機和補光燈。直播一開,留言就一行一行往上跑。)"),["ys","大家好,我們是{團名}!今天有一件很重要的事要說。","smile"],["he","我們想了好久、吵了好久……終於決定了!","laugh"],
      ["hr","我數三聲!三、二、一——","laugh"],["ys","我們的粉絲名是——{粉絲名}!","moved"],["tr","……法文,「光」的意思。","smile"],["hy","因為大家是照亮我們舞台的光。……這句是我想的!","shy"],
      N("(留言一下子被同一個詞洗滿了。直播結束,補光燈一關,五個人一起轉過來看你。)")],
    C:[C("「{粉絲名},取得很好。」","鼓勵","ys",3,[["ys","嘿嘿……其實是大家一起想的。","shy"]]),C("「從今天起,你們不是只有自己了。」","陪著","hy",3,[["hy","……嗯。多了好多好多光。","moved"]]),C("「河嵐,剛剛倒數的聲音最大。」","開玩笑","hr",3,[["hr","那是因為太開心了嘛!","laugh"]])]},
    b:{L:[["he","從明天開始,每天都要跟{粉絲名}說晚安了~","smile"],["tr","……應援色的事,下次再吵。","smile"]],C:[]}}};
const CARD={debut_announce:()=>({tag:`2016.11.21 ・ D-${(window.DEBUT_DAY||366)-S.day}`,bg:"assets/bg/office_day.webp",title:"出道日公開",
  lead:`公司的官方帳號公開了出道日:2017 年 1 月 13 日。${S.groupName?`「${esc(S.groupName)}」`:"她們"}的名字,第一次出現在這麼多人面前。`,
  lines:[["ys","大家……我們的名字在網路上了。","moved"],["he","留言好多!有人說會等我們!","laugh"],["tr","……五十三天。夠了。","serious"],["hr","我要截圖!全部截圖!","laugh"]],ok:"倒數開始",cols:true})};
const fbSnip=k=>FB[k]?{code:"fbmile-"+k,type:"event",ev:k,member:(MS[k].who||["ys"])[0],who:MS[k].who||M.map(m=>m.id),cd:0,nodes:FB[k]}:null;
/* ---------- 過場要用的造型與變數 ---------- */
async function cineVars(k){ const v={name:S.groupName||"",song:window.mileVar.出道曲()||window.songSummary?.()?.title?.name||""};
  const wear=(code,mid)=>code&&window.lookWearable?.(code,mid)?code:undefined;
  if(k==="concept_shoot"){ const code=window.findLook?.({occ:"寫真",album:"a1"}); if(code){ const im=await window.lookImages(code); if(Object.keys(im).length){ v.imgs=im; v.group=ITEMS[code]?.type==="group"?im.ys||Object.values(im)[0]:null } v.look=M.every(m=>wear(code,m.id))?code:undefined } }
  if(k==="rehearsal"){ const code=window.findLook?.({occ:"打歌舞台",album:"a1"}); v.look=code&&M.every(m=>wear(code,m.id))?code:undefined }
  if(k==="chuseok"){ const code=window.findLook?.({occ:"節日",name:"韓服",mid:"hy"}); v.hyLook=wear(code,"hy") }
  return v }
/* ---------- 團名(6/17) ---------- */
function askName(done){ const el=document.createElement("div"); el.className="bigev mname"; el.innerHTML=`<div class="bg-veil"></div><div class="bigcard"><small>2016.06.17 ・ 會議室</small><h2>團名</h2>
  <p class="lead">白板上寫滿了被劃掉的名字。五個人都看著你——最後的決定,在代表手上。<br><small>之後的台詞、打歌畫面、社群都會用這個名字;取了就不能改。</small></p>
  <input id="mnIn" maxlength="14" placeholder="輸入團名" autocomplete="off"><p class="mnErr" id="mnErr"></p><button class="fbtn pri cardOk" id="mnOk">就是這個名字</button></div>`;
  $("#stage").appendChild(el); setPause("card",true); const ip=el.querySelector("#mnIn"); setTimeout(()=>ip.focus(),300);
  el.querySelector("#mnOk").onclick=()=>{ const v=ip.value.trim(); if(!v){ el.querySelector("#mnErr").textContent="請輸入團名"; return }
    if(!confirm(`團名就是「${v}」?之後不能改。`)) return; S.groupName=v; save(true); el.classList.add("out"); setTimeout(()=>el.remove(),600); setPause("card",false); done() } }
/* ---------- 演出 ---------- */
async function run(k){ if(RUNNING) return; RUNNING=true; const m=MS[k];
  try{
    const after=()=>{ if(m.card&&CARD[k]){ const o=CARD[k](); const L=window.eventLines?.(k,null); if(L) o.lines=L; window.showCard({...o,after:()=>finish(k)}); return }
      const who=m.who||M.map(x=>x.id); for(const id of who) S.where[id]=m.room;
      window.visitMile?.(m.room,k,who) };
    const next=()=>m.ask==="團名"&&!S.groupName?askName(after):after();
    if(k==="first_day") S.flags.day1Card=1;
    if(m.cine&&window.CINE?.[k]&&window.cinePlay){ const v=await cineVars(k); window.cinePlay(window.CINE[k](v),next) } else next();
  }catch(e){ window.logErr?.("里程碑",e); RUNNING=false } }
function finish(k){ (S.mile=S.mile||{})[k]=S.day; RUNNING=false; window.spendTime?.(MS[k].dur||60,MS[k].n); save(true) }
window.milePlay=(k,pid)=>{ const sn=window.eventSnip?.(k,null)||fbSnip(k); if(!sn){ finish(k); menu(); return }
  S.seen[sn.code]=S.day; play(fillVars(sn),()=>{ finish(k); menu() }) };
window.mileTick=()=>{ notify(); if(RUNNING||V||D||window.cineBusy?.()||document.querySelector(".bigev:not(.out),#cgView,#meet")) return; const k=todayMile(); if(!k) return;
  if(S.day>DAYS[k]||S.min>=MS[k].at) run(k) };
window.mileDays=DAYS; window.mileRun=run;
})();
