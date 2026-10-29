"use strict";
/* =====================================================================
   製作者模式(由劇本工坊搬進遊戲)
   規格、提示詞、格式檢查與自動生產排程原封不動取自劇本工坊(另外加上台詞表情)
   資料是雲端的 users/{uid}/scripts(與劇本工坊共用);收入的片段會立刻進遊戲的內容庫
   ===================================================================== */
(()=>{
const KEY_K="kpopScripts.geminiKey", KEY_M="kpopScripts.model";
const apiKey=()=>localStorage.getItem(KEY_K)||"";
const DEFAULT_MODEL="gemini-flash-latest"; // 永遠指向 Google 最新的 Flash,模型汰換時不用改程式
const RETIRED=["gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash","gemini-2.0-flash-lite"];
let modelOverride=""; // 自動生產時,主模型的每日額度用完會暫時改用備用模型
const model=()=>{if(modelOverride) return modelOverride; const m=localStorage.getItem(KEY_M)||DEFAULT_MODEL; return RETIRED.includes(m)?DEFAULT_MODEL:m};


async function toJpegB64(file){
  const bmp=await createImageBitmap(file); const s=Math.min(1,1280/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas"); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height); return c.toDataURL("image/jpeg",0.85).split(",")[1];
}
async function aiJSON(prompt,files,signal,schema){
  const key=apiKey(); if(!key) throw {code:"no_key"};
  const parts=[{text:prompt}];
  for(const f of files||[]) parts.push({inline_data:{mime_type:"image/jpeg",data:await toJpegB64(f)}});
  let res;
  try{
    res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`,{method:"POST",signal,
      headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json",...(schema?{responseSchema:schema}:{}),temperature:1}})});
  }catch(e){ if(e?.name==="AbortError") throw {code:"cancelled"}; throw {code:"network"} }
  const j=await res.json().catch(()=>({}));
  if(!res.ok){
    const raw=JSON.stringify(j); const msg=j?.error?.message||"";
    if(res.status===429){
      // 依 Google 回傳的額度明細判斷是「每分鐘」還是「每天」超量,並讀取建議的等待秒數
      const det=j?.error?.details||[]; const ids=det.flatMap(d=>(d.violations||[]).map(v=>String(v.quotaId||v.quotaMetric||"")));
      const perMin=ids.some(x=>/PerMinute/i.test(x)), perDay=ids.some(x=>/PerDay/i.test(x));
      const rd=det.map(d=>d.retryDelay).find(Boolean); const wait=rd?Math.ceil(parseFloat(rd)):0;
      const day=perDay&&!perMin ? true : (!ids.length && /per ?day|daily/i.test(msg) && !/minute/i.test(msg));
      throw {code:day?"rate_day":"rate_minute",message:msg,wait};
    }
    if(res.status===401||res.status===403||/API key/i.test(msg)) throw {code:"bad_key",message:msg};
    if(res.status===404){
      if(modelOverride) throw {code:"bad_model",message:msg};   // 備用清單裡的模型名稱打錯或已停用:跳過它
      if(model()!==DEFAULT_MODEL){ localStorage.setItem(KEY_M,DEFAULT_MODEL); return aiJSON(prompt,files,signal,schema); } // 模型被停用時自動改回預設
      throw {code:"bad_model",message:msg};
    }
    if(res.status===400&&schema&&/schema|response_schema|responseSchema|Invalid JSON payload|not supported/i.test(msg)) return aiJSON(prompt,files,signal,null);   // 這個模型不支援 schema
    if(/location/i.test(msg)) throw {code:"region",message:msg};
    throw {code:"server",message:msg};
  }
  if(j.promptFeedback?.blockReason) throw {code:"blocked"};
  const c=j.candidates?.[0];
  if(!c||c.finishReason==="SAFETY"||c.finishReason==="PROHIBITED_CONTENT"||c.finishReason==="BLOCKLIST") throw {code:"blocked"};
  const text=(c.content?.parts||[]).map(p=>p.text||"").join("");
  try{return JSON.parse(text)}catch(e){const m=text.match(/[\[{][\s\S]*[\]}]/); if(m){try{return JSON.parse(m[0])}catch(_){window.logErr?.("scripts",_)}} throw {code:"invalid_json"}}
}

const ERR={no_key:"還沒設定 Gemini API 金鑰,請到右上角「設定」貼上。",bad_key:"金鑰無效或沒有權限,請到設定重新貼上並測試連線。",bad_model:"找不到這個模型名稱,請到設定改回推薦的模型。",rate_minute:"每分鐘次數到上限了,等一分鐘再試。",rate_day:"今天的免費額度用完了,台灣時間下午三、四點後會重置。",blocked:"這次的內容被 Gemini 的安全機制擋下,換張圖或改一下說明再試。",network:"連不上 Gemini,請確認網路。",region:"目前所在地區無法使用 Gemini API。",server:"Gemini 暫時出錯,稍後再試。",not_granted:"沒有允許這個頁面使用 Claude,分析功能無法使用。",sampling_disabled:"這個帳號目前無法使用 Claude。",rate_limited:"使用次數暫時太多,請稍後再試。",image_rejected:"有圖片無法讀取,請換一張(JPG、PNG、WebP)。",images_unavailable:"這個檢視無法傳送圖片。",refused:"這次的內容無法分析,換張圖或改一下說明再試。",invalid_json:"分析結果格式不完整,請再按一次。",prompt_too_large:"說明太長了,請縮短。",session_expired:"請重新登入後再試。"};
/* ---------- 劇本工坊:成員與規格 ---------- */
const MB=[
 {id:"ys",n:"藝瑟",en:"Yeseul",c:"#7B4FBF"},{id:"tr",n:"泰梨",en:"Taeri",c:"#C8102E"},{id:"hy",n:"日和",en:"Hiyori",c:"#C9A35E"},
 {id:"he",n:"夏恩",en:"Haeun",c:"#E9746A"},{id:"hr",n:"河嵐",en:"Haram",c:"#7FAF2C"}];
const mb=id=>MB.find(m=>m.id===id);
const VOICE={
 ys:"徐藝瑟,隊長、領唱、領舞(原型 Dreamcatcher JiU)。開朗愛笑的團媽,責任感很重;藏壓力的方式是笑著把焦點轉到別人身上(「我沒事啦~倒是妳們吃飯了沒?」)。驕傲時說「我是隊長嘛!」;真正脆弱時笑容會突然停住。初期對代表用敬語但語氣明亮,熟了尾音拉長「代表~」。安慰別人的口頭禪「慢慢來,我在」。私下愛粉紅色、追所有女團、酒量好。心結:2013 年出道前三個月被前公司撤銷出道,怕歷史重演。被反過來照顧會手足無措。",
 tr:"尹泰梨,主 Rapper、領舞(原型 aespa Karina)。長相冷豔完美被叫「AI」,其實害羞、不擅長開口,常被誤會成生氣。初期句子很短「……嗯。」「知道了。」,緊張時耳朵先紅;熟了會冒出冷笑話、奇怪的比喻,講完自己先笑;談舞蹈和歌詞時話變多;常夾英文;害羞時說「……算了,我來。」洛杉磯長大,出道前伴舞影片爆紅。心結:大家只看見那張臉;不喜歡被當商品,花錢和當眾安慰對她反效果。",
 hy:"早瀨日和,主舞、副唱,日籍(原型 LE SSERAFIM 中村一葉)。芭蕾出身、優雅但團裡最外向好奇。韓語不夠用,常比手畫腳、混日文英文,講錯先笑;會問「代表,這句韓語是什麼意思?」;用韓劇台詞學說話;對每個人都說「好喜歡~」;想讓人放心時說「大丈夫です!」。越重要的事越用笑容帶過。心結:舊傷的腳踝、說不出深一點的心事、怕永遠是外國人。暱稱天鵝。",
 he:"韓夏恩,門面、C 位、副 Rapper(原型 少女時代 潤娥)。國民初戀型,開朗隨和不做作,對每個人都好;宿舍廚房是她的地盤。被稱讚外表會笑著轉移話題;被當成普通人(例如被唸不吃午餐)反而特別開心;累的時候只會笑得更用力;對熟的人撒嬌,帶一點慶尚道口音;口頭禪「先吃飯再說啦」。大邱烤肉店長女,15 歲照片爆紅也收到惡評。心結:被看成只有臉的 C 位。稱讚她的臉會扣分,對她嚴厲反而有效。",
 hr:"姜河嵐,主唱、綜藝擔當、老么(原型 Apink 鄭恩地)。濟州出身,大嗓門、直率、有點男孩子氣,對誰都很快用半語,話多語速快愛用擬聲詞,緊張生氣時濟州方言更重;唱歌時完全變一個人。口頭禪「交給我!」。故事開始時才加入兩個月,被說插隊、運氣好。心結:練習時間最短、被注意身材、怕被包裝成不是自己。真正難過時會突然安靜,比哭還嚴重。需要被肯定,嚴厲會讓她受傷。"};
/* 招牌句庫(2026-10-28):每位成員依情緒的說話範例,給 Gemini 學口氣與用詞(不要照抄);每次隨機挑幾句放進人物介紹 */
const SIG={
 ys:{招牌:["我是隊長嘛!","慢慢來,我在。","我沒事啦~倒是妳們吃飯了沒?"],開心:["哇~今天的大家超棒的!晚上我請客!","嘿嘿,被誇了耶。代表再說一次嘛~","看到大家笑,我就放心了。"],
  害羞:["……欸?代表,你剛剛是在看我嗎?","不、不是啦,我是隊長,本來就該……嗯。","今天的我……有比較好看嗎?算了,當我沒問。"],不滿:["代表,這樣不行喔。大家很累了。","我可以笑著接受,但不代表我同意。","……我先去冷靜一下,等等再談。"],
  脆弱:["……如果這次又沒成功,怎麼辦?","我以為我已經不怕了。","別擔心我,真的。……好吧,一點點就好。"],親近:["代表~今天也辛苦了,給你一個隊長認證的擁抱。","被你照顧的感覺好奇怪……但不討厭。"],認真:["這段走位再對三次,我陪大家。","我會負責,這是隊長的工作。"]},
 tr:{招牌:["……嗯。","知道了。","……算了,我來。"],開心:["Not bad。……好啦,很好。","今天的拍子剛剛好。像泡麵的三分鐘。","(耳朵紅)……謝了。"],
  害羞:["……不要一直看我。耳朵會紅。","我不是在生氣,只是不知道要說什麼。","That's……嗯,沒事。"],不滿:["這段詞,不是我會說的話。","不要把我當成商品介紹。","……我先練。現在不想講話。"],
  脆弱:["大家只看到這張臉。","如果我不笑,是不是就沒人在乎了。"],親近:["……再待一下。不行嗎。","你在,我就不用一直裝酷。"],認真:["這個動作要再乾淨一點。One more time。","歌詞我改了三版,你聽聽看。"]},
 hy:{招牌:["大丈夫です!","好喜歡~!","代表,這句韓語是什麼意思?"],開心:["すごい!今天的轉圈,是我人生最好的一次!","哇~是韓劇裡的那句!我也想說一次!","嘿嘿,我又說錯了對不對?"],
  害羞:["代表……這裡,心臟,怎麼說……砰砰?","啊、不行,我的韓語突然不見了。","這個我還不會用韓語說。下次再告訴你。"],不滿:["我、我也有一點點生氣喔。一點點。","為什麼大家都用『外國人』看我?"],
  脆弱:["腳踝……沒事。大丈夫……大概。","我想說的話,總是比我會的韓語還要長。","有時候會想,我是不是永遠都是客人。"],親近:["代表,教我一句韓語。只對你說的那種。","好喜歡~……啊,我是說,這個天氣。"],認真:["芭蕾教我的:痛的時候,背更要挺直。","再一次。這次我要讓手指也在跳舞。"]},
 he:{招牌:["先吃飯再說啦!","哎唷,幹嘛啦~","今天也辛苦了嘛~"],開心:["代表今天有念我吃午餐耶,嘿嘿,我有乖乖吃喔!","今天的泡菜鍋,完美!","被你這樣管著,好像在家裡一樣。"],
  害羞:["你這樣看我,我會不知道手要放哪裡啦。","……今天的我,真的有比較好嗎?不是說臉喔,是舞台。","臉?哎唷,不說這個啦,你吃了沒?"],不滿:["大家都只說我漂亮……我也有在努力欸。","我生氣的時候不會大聲,我會一直煮東西。"],
  脆弱:["累的時候,我只會笑得更大聲。你發現了嗎?","那些留言,我其實都記得。"],親近:["代表~陪我去買宵夜嘛~就一下下!","你啊,真的是……好啦,原諒你。"],認真:["C 位不是站在中間就好,我要讓大家看到為什麼是我。","這段 rap 再給我一次,我知道哪裡不對了。"]},
 hr:{招牌:["交給我!","咻——搞定!","哎咕,好累好累好累!"],開心:["哈哈!代表你有沒有聽到?剛剛那個高音,咻——就上去了!","耶!今天要吃三碗飯!","我們濟州人開心的時候,講話會更大聲喔!"],
  害羞:["我、我哪有臉紅!是太熱了啦!","代表幹嘛突然這樣……很奇怪欸。"],不滿:["什麼插隊啦!我每天都練到最後一個走欸!","不要再講我的身材了好不好!"],
  脆弱:["……代表。我是不是不夠好。","(很小聲)今天,可以不要說話嗎。"],親近:["代表~我唱給你聽!只唱給你喔!","抱一下!就一下!充電!"],認真:["唱歌的時候,我才覺得我是我。","這句我要用氣音唱,你聽——"]}};
const sigOf=(id,stage)=>{ const S0=SIG[id]; if(!S0) return ""; const cats=Object.keys(S0).filter(c=>!(c==="親近"&&/戒備|信任/.test(stage||"")));
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  return "說話範例(只學口氣、節奏和用詞,不要照抄):"+cats.map(c=>`〔${c}〕「${pick(S0[c])}」`).join("") };
const PREF={ys:{安慰:1,鼓勵:1.2,嚴厲:.3,開玩笑:1,轉移話題:.5,陪著:1.3,出手幫忙:.5},tr:{安慰:.2,鼓勵:.6,嚴厲:1.1,開玩笑:1.3,轉移話題:.6,陪著:1.1,出手幫忙:-.3},
 hy:{安慰:.9,鼓勵:1.1,嚴厲:-.4,開玩笑:1,轉移話題:.6,陪著:.9,出手幫忙:1.1},he:{安慰:.7,鼓勵:.9,嚴厲:.9,開玩笑:1.2,轉移話題:.4,陪著:.8,出手幫忙:.7},
 hr:{安慰:1.2,鼓勵:1.3,嚴厲:-.7,開玩笑:.6,轉移話題:.3,陪著:.9,出手幫忙:1}};
const STYLES=Object.keys(PREF.ys);
const STAGES=["戒備","信任","夥伴","心動","戀人","親密","多人親密"];
const STAGE_DESC={戒備:"她對代表還有距離,禮貌或冷淡。",信任:"她開始相信代表是好老闆,會說一些工作上的心事。",夥伴:"她把代表當成可以依靠的夥伴,願意說私事。",心動:"她對代表有了心動的感覺,會有曖昧、欲言又止的時刻,但還沒說破。",戀人:"兩人已是戀人,私下親暱自然:牽手、擁抱、親吻、只對代表撒嬌的一面、怕被發現的地下戀情;表現以情感為主,不露骨。",
  親密:"兩人是有身體親密關係的戀人(雙方都是成年人)。可以寫親吻、擁抱、同床共枕、清晨在對方身邊醒來、浴袍、親密前的心跳與張力、事後的溫存與枕邊話;親密行為本身一律用淡出帶過(例如「她伸手關掉了燈」),不描寫性行為過程、裸露或身體部位的性描寫。",
  多人親密:"她和另一位同樣與代表是親密關係的成員彼此知情,接受三人以上的戀愛關係(全員成年)。寫三人之間醋意的化解、彼此的默契與照顧、一起約會、同房的曖昧與溫柔;另一位成員要一起出現在片段裡(who 放兩人)。親密場面同樣用淡出帶過,不寫露骨描寫。"};
const ROMANCE=["戀人","親密","多人親密"];
const PERIODS=["練習生期","出道與上升期","巔峰期","轉型期"];
const PERIOD_DESC={練習生期:"2016 年 1 月 13 日代表上任到 2017 年 1 月 13 日出道前的這一年,還沒出道,每天練習、月評、宿舍生活。",出道與上升期:"2017 年 1 月 13 日出道到 2017 年底,剛出道,打歌、綜藝、第一次一位、限韓令、西方市場打開。",巔峰期:"2018~2019,一線女團,頒獎典禮、海外巡演、個人活動機會。",轉型期:"2020 以後,疫情讓舞台消失,線上演唱會、續約與未來的選擇。"};
const PLACES={practice:"練習室",dorm:"宿舍",studio:"錄音室",office:"辦公室",styling:"造型室",out:"外面走走",phone:"手機"};
/* 地點細節:讓片段的旁白與台詞有具體的畫面 */
const PLACE_NOTE={styling:"造型室在公司 1F:金色滾輪衣架掛滿打歌服與日常服(多數還套著防塵袋、掛著吊牌)、整面鞋牆、玻璃配件櫃(髮飾、耳環、頭冠)、兩座燈泡化妝鏡、全身鏡、拉簾試衣間,桌上常攤著色票、布樣、別針與量尺。駐公司的造型師姓徐(三十多歲、講話直、很專業)與化妝師會出現在旁白裡。常見情境:試穿新打歌服、改尺寸、選配件、補妝、拍定裝照、偷偷試穿別的成員的衣服、對造型有意見、看到自己穿上新衣服的反應。上午與下午最忙,晚上只剩投射燈,深夜關閉(sl 只能是 1、2、3)。這一批裡最好有一個片段發生在造型室。"};
const SLOTS=["清晨","上午","下午","晚上","深夜"];
const TYPES={
 long:{n:"長對話",kind:"single",len:"8~10 個來回(玩家要做 8~10 次選擇),至少兩層分支,不同回應走向不同內容;用錯方式可能提早結束",places:["practice","dorm","studio","office","out","styling"],target:24,batch:2},
 encounter:{n:"撞見",kind:"single",len:"1~3 個來回",places:["practice","dorm","studio","out","styling"],target:30,batch:5},
 practice:{n:"練習中",kind:"single",len:"1~3 個來回",places:["practice","studio"],target:30,batch:5},
 chat:{n:"閒聊",kind:"single",len:"2~3 個來回",places:["office","dorm","practice","styling"],target:30,batch:5},
 request:{n:"請求",kind:"single",len:"1~3 個來回",places:["office","dorm","practice","styling"],target:30,batch:5},
 friction:{n:"小摩擦",kind:"single",len:"1~3 個來回,另一位成員一起出現",places:["practice","dorm","styling"],target:30,batch:5},
 surprise:{n:"驚喜",kind:"single",len:"1~3 個來回",places:["dorm","office","practice","styling"],target:30,batch:5},
 worry:{n:"心事",kind:"single",len:"2~4 個來回,她說出一點點真心話",places:["out","dorm","practice"],target:30,batch:5},
 social:{n:"社群",kind:"single",len:"1~2 個來回,她的貼文、直播或粉絲通訊與粉絲反應(依時期:2016 年直播平台 Spotlight Live 剛起步,2020 年後有粉絲通訊 App)",places:["phone"],target:30,batch:5},
 msg:{n:"訊息",kind:"single",len:"1~3 個來回的手機訊息",places:["phone"],target:44,batch:6},
 topic:{n:"再聊一下",kind:"single",len:"2~3 個來回的日常話題,接在其他對話後面",places:["practice","dorm","office","studio","out","styling"],target:20,batch:4},
 between:{n:"成員之間",kind:"pair",len:"2~4 個來回,主要是成員之間對話,代表在旁邊,最後才有選項",places:["practice","dorm","studio","styling"],target:40,batch:4},
 group:{n:"群組聊天",kind:"pair",len:"團體聊天室裡多人的訊息,1~2 次選擇",places:["phone"],target:30,batch:4},
 pairlong:{n:"雙人長對話",kind:"pair",len:"8~10 個來回(玩家要做 8~10 次選擇),兩位成員和代表一起,至少兩層分支,成員之間也會互相回應",places:["practice","dorm","studio","out","styling"],target:20,batch:2},
 away:{n:"你不在場時",kind:"pair",len:"一段兩三句的旁白,描述代表不在時發生的事,沒有選項",places:["practice","dorm","studio","styling"],target:30,batch:6}};
const PAIRS=[];for(let i=0;i<MB.length;i++)for(let j=i+1;j<MB.length;j++)PAIRS.push(MB[i].id+"-"+MB[j].id);PAIRS.push("all");
const pairName=p=>p==="all"?"全團":p.split("-").map(x=>mb(x).n).join("×");
const SINGLE_TYPES=Object.keys(TYPES).filter(k=>TYPES[k].kind==="single"), PAIR_TYPES=Object.keys(TYPES).filter(k=>TYPES[k].kind==="pair");
/* ---------- 劇本工坊 v3(2026-10-26):近況片段(出場條件 req)與事件劇本(ev);台詞裡的 {變數} 在遊戲裡換成真正的名稱 ---------- */
TYPES.situ={n:"近況",kind:"situ",len:"1~3 個來回,她跟代表聊最近發生的事",places:["practice","dorm","office","studio","out","styling"],target:3,batch:3};
TYPES.event={n:"事件",kind:"event",len:"依事件說明",places:["practice","dorm","office","studio"],target:6,batch:3};
const VARS_ALL=["最新主打","演唱會","場館","一位節目","一位歌曲"];
/* v3 ③:連續劇情(2~4 段、跨好幾天,前一段看過、隔一天以上才出下一段)、舞台指示(換背景、進場、離場、音效標記)、選項影響成員之間的默契 */
TYPES.arc={n:"連續劇情",kind:"arc",len:"分成 2~4 段、跨好幾天的連續劇情;每段 2~3 個來回",places:["practice","dorm","studio","office","out","styling"],target:1,batch:1};
const DIR_BG={practice:"練習室",studio:"錄音室",office:"辦公室",styling:"造型室",living:"宿舍客廳",kitchen:"宿舍廚房",river:"漢江",store:"便利商店",van:"保母車",backstage:"後台",
  vocal:"聲樂室",lobby:"製作中心大廳",photo:"攝影棚",roof:"宿舍頂樓",bed_ys:"藝瑟的房間",bed_tr:"泰梨的房間",bed_hy:"日和的房間",bed_he:"夏恩的房間",bed_hr:"河嵐的房間"};   // 2026-10-29 加製作中心、頂樓、五人的房間
const DIR_FX={"cam:close":"特寫","cam:wide":"鏡頭拉回","fx:shake":"輕震","fx:flash":"白光一閃","fx:pause":"沉默停頓","fx:slow":"下一句慢慢說","mood:memory":"回憶","mood:dim":"燈光變暗","mood:off":"恢復"};
const okDir=t=>{ const [k,v]=String(t||"").split(":"); return k==="bg"?!!DIR_BG[v]:(k==="enter"||k==="exit")?!!mb(v):k==="sfx"?/^[a-z_]{2,16}$/.test(v||""):!!DIR_FX[String(t)] };
const NO_DIR=["msg","social","group","away"];
const SITU={
  after_concert:{n:"演唱會後一週內",vars:["演唱會","場館"],per:["巔峰期","轉型期"],desc:"一週內才在{場館}辦完演唱會〈{演唱會}〉,她還沉浸在那天的餘韻裡:回味某個瞬間、累到全身痠痛、偷看粉絲的心得、捨不得結束。"},
  after_win:{n:"拿下一位後幾天內",vars:["一位節目","一位歌曲"],per:["出道與上升期","巔峰期","轉型期"],desc:"前幾天在《{一位節目}》用〈{一位歌曲}〉拿下一位,她到現在的反應:還不敢相信、偷偷重看影片、想再拿一次、想把功勞分給大家。"},
  promo:{n:"打歌期間",vars:["最新主打"],per:["出道與上升期","巔峰期","轉型期"],desc:"正在打歌〈{最新主打}〉:每天清晨化妝、電視台待機室、行程滿檔、睡眠不足,也有舞台上的小插曲。"},
  pre_comeback:{n:"回歸前兩週",vars:[],per:["出道與上升期","巔峰期","轉型期"],desc:"再兩週就要回歸,新歌練習與拍攝進入最後階段:緊張、期待、體重管理、熬夜。"},
  xmas:{n:"聖誕節前後",vars:[],per:PERIODS,desc:"聖誕節前後:宿舍或公司的聖誕裝飾、交換禮物、年末行程、想跟代表一起過節。"},
  newyear:{n:"跨年前後",vars:[],per:PERIODS,desc:"跨年前後:年末舞台的忙碌、倒數、新年願望、回顧這一年。"}};
const EVENTS={
  concert_backstage:{n:"演唱會結束後的後台",card:false,vars:["演唱會","場館"],desc:"演唱會〈{演唱會}〉剛在{場館}結束,五個人回到後台(花束、汗水、還聽得到粉絲在喊她們的名字),跟代表分享當下的心情。start 節點 5~8 句,每位成員至少一句;最後給代表 2 個選項(代表對她們說的話),每個選項用 reply 寫 1~2 位成員的反應。"},
  concert_rehearsal:{n:"演唱會彩排",card:false,vars:["演唱會","場館"],desc:"演唱會〈{演唱會}〉前的彩排空檔(在{場館}或練習室):有人緊張、有人出小狀況、有人互相打氣,代表來探班。start 節點 4~7 句;給代表 2 個選項,用 reply 寫反應。"},
  first_win:{n:"出道後第一個一位(事件卡)",card:true,vars:["一位節目","一位歌曲"],desc:"代表不在電視台的那天,她們在《{一位節目}》用〈{一位歌曲}〉拿下出道後第一個一位,一回到宿舍就衝過來抱住代表。"},
  debut:{n:"出道日(事件卡)",card:true,vars:["最新主打"],desc:"出道 Showcase 當天,出道曲是〈{最新主打}〉,五個人在後台對代表說的話。"},
  comeback:{n:"回歸日(事件卡)",card:true,vars:["最新主打"],desc:"回歸第一天,新歌是〈{最新主打}〉,五個人對代表說的話。"}};
const v3Block=p=>{ const o=p.type==="situ"?SITU[p.req]:p.type==="event"?EVENTS[p.ev]:null; if(!o) return "";
  return `【${p.type==="situ"?"情境":"事件"}】${o.n}:${o.desc}
${p.type==="situ"?"這種片段只會在這個情境成立時出現,所以可以直接提到這件事。":"這段會在遊戲裡發生這件事的當下演出,代表在場。"}
${o.vars.length?`可以用的變數:${o.vars.map(v=>`{${v}}`).join("、")}。照這樣原封不動寫在台詞或旁白裡(例如「〈{${o.vars[0]}}〉」),遊戲會換成真正的名稱;只能用這些變數,不要自己編歌名、節目名或場館名。`:"不要提到具體的歌名、節目名或場館名。"}
${o.card?"這是事件卡:每個片段只有 start 一個節點,lines 放 3~5 句成員台詞(不要 narr 旁白,不同成員各說一句),choices 留空陣列。":""}
` };
const v3Label=sn=>sn.ev?EVENTS[sn.ev]?.n||sn.ev:sn.req?SITU[sn.req]?.n||sn.req:"";

/* ---------- 世界設定(依《世界設定與時間軸》;只能用這些原創名稱) ---------- */
const WORLD_BASE="公司:星環娛樂(老牌大公司)、黑鑽(嘻哈 girl crush)、晨光(親民、選秀組團)、方舟音樂(粉絲經營崛起)、楓葉娛樂(藝瑟的前公司)。打歌節目:週二 SHOW PULSE、週三 CHAMPION LIVE、週四 COUNTDOWN M、週五 MUSIC VAULT、週六 CORE STAGE、週日 STAR GAYO。頒獎:NOTE AWARDS(12 月,海外舉辦)、旋律音樂獎(12 月)、金盤獎(1 月)、首爾歌謠大賞(1 月)。音源平台 Melodi,排行榜圓音榜,入口網站 Nexa(熱搜與留言),八卦媒體 D-Scope。頂級製作人團隊 Lighthouse。";
const WORLD_PERIOD={
 練習生期:window.DAILY.WORLD_2016,
 出道與上升期:"2017 年 1 月 13 日出道(冬天出道)。活躍的女團:GLOW、TWINKLE(2016 年最紅)、VELVET ROSE、HARMONY、PRISM 9(2016 年 5 月由選秀節目 SPOTLIGHT 99 選出的期間限定團)、NOXVEIL(黑鑽 2016 年 8 月出道,藝瑟的舊同伴是成員)。BLAZE、WONDER POP、SUNNY DAY 在 2016 底到 2017 年陸續解散。2016 年底起中國市場關閉(限韓令)。2017 年 NOVA 在美國頒獎典禮得獎,西方市場打開。",
 巔峰期:"活躍的女團:TWINKLE、VELVET ROSE、NOXVEIL、HARMONY、IRIS 12(2018 年 10 月韓日合作選秀)、ZEST(2019 年出道)。日本市場熱絡,2019 年起短影音平台 Clip 普及;2019 年有娛樂圈大型醜聞,輿論緊縮。",
 轉型期:"2020 年起新冠疫情,演唱會全停、打歌無觀眾錄影、線上演唱會;粉絲通訊 Pocket 上線、Clip 舞蹈挑戰是宣傳主力。NEOVERSE(2020 年 11 月)、2022 年 SERAPH、NEW DAY 出道。2022 年疫情解封、巡演回歸,也是第一份七年合約到期的時候。"};

/* ---------- 格式檢查 ---------- */
function analyse(sn){
  const w=[]; const N=sn.nodes||{}; if(!N.start&&!(sn.type==="overhear"&&sn.hear?.length)) return {depth:0,branch:0,warn:["沒有 start 節點"]};
  const ids=new Set(MB.map(m=>m.id));
  for(const [k,n] of Object.entries(N)){
    if(!Array.isArray(n.L)) w.push(`節點 ${k} 沒有台詞`);
    for(const l of n.L||[]) if(l[0]==="@"){ if(!okDir(l[1])) w.push(`節點 ${k} 有不認得的舞台指示 ${l[1]}`) } else if(l[0]!==""&&!ids.has(l[0])) w.push(`節點 ${k} 有不認得的說話者 ${l[0]}`);
    for(const c of n.C||[]){ if(!STYLES.includes(c.s)) w.push(`選項「${(c.t||"").slice(0,10)}」的回應方式不合法`);
      if(c.next&&!N[c.next]) w.push(`選項指向不存在的節點 ${c.next}`);
      if(c.to&&!ids.has(c.to)) w.push(`選項對象 ${c.to} 不存在`);
      if((c.g||0)>4||(c.g||0)<-2) w.push(`選項「${(c.t||"").slice(0,10)}」的影響強度 ${c.g} 超出 -2~4`); }
  }
  // 品質檢查:太長的台詞、解說情緒的套話、整句重複
  const CLICHE=["心裡暖暖的","謝謝你一直陪著我","其實我想說的是","你讓我覺得很溫暖","有你真好","我會一直陪在你身邊"], seenT=new Set();
  for(const [k,n] of Object.entries(N)) for(const l of [...(n.L||[]),...(n.C||[]).flatMap(c=>c.r||[])].filter(l=>l[0]!=="@")){ const t=String(l[1]||"");
    if(t.length>60) w.push(`節點 ${k} 有一句台詞超過 60 字`);
    const cl=CLICHE.find(x=>t.includes(x)); if(cl) w.push(`節點 ${k} 用了套話「${cl}」`);
    if(t.length>6&&seenT.has(t)) w.push(`節點 ${k} 有重複的台詞`); seenT.add(t) }
  const depth=(k,seen)=>{if(seen.has(k)||!N[k])return 0; seen.add(k); let m=0; for(const c of N[k].C||[]) m=Math.max(m,1+(c.next?depth(c.next,new Set(seen)):0)); return m};
  const d=N.start?depth("start",new Set()):0; const branch=Object.values(N).filter(n=>(n.C||[]).filter(c=>c.next).length>=2).length;
  if(sn.type==="long"||sn.type==="pairlong"){ if(d<8) w.push(`最長只有 ${d} 個來回,長對話要 8~10 個`); if(d>11) w.push(`最長 ${d} 個來回,超過 10 個`); if(branch<2) w.push(`只有 ${branch} 個分岔點,長對話至少要 2 個`) }
  if(sn.type==="away"&&(N.start.C||[]).length) w.push("你不在場時的片段不應該有選項");
  if(sn.dupOf) w.push(`和內容庫裡的「${String(sn.dupOf).slice(0,16)}」太像`);
  const badV=[...JSON.stringify([sn.sc||"",N]).matchAll(/\{([^{}\s"]{1,8})\}/g)].map(m=>m[1]).find(v=>!VARS_ALL.includes(v)); if(badV) w.push(`用了不認得的變數 {${badV}}`);
  if(sn.type==="event"&&EVENTS[sn.ev]?.card&&((N.start.C||[]).length||(N.start.L||[]).some(l=>!l[0]))) w.push("事件卡只能有成員台詞,不要旁白與選項");
  if(NEWK.has(sn.type)||sn.type==="event") analyse10(sn,w);   // 改版 1.0 的新種類與里程碑事件
  return {depth:d,branch,warn:w};
}

/* ---------- 劇本生成 v2(2026-10-25):更細緻的人物設定、寫作守則、範例,以及用 responseSchema 鎖住格式 ---------- */
/* 稱呼:年紀 藝瑟(96.8)>夏恩(96.10)>泰梨(96.12)>日和(97.2)>河嵐(97.5) */
const ADDR="稱呼規則:五人都叫玩家「代表」。藝瑟、夏恩、泰梨同年,互相直接叫名字;日和與河嵐叫三位姊姊「藝瑟歐尼」「夏恩歐尼」「泰梨歐尼」;河嵐叫日和「日和歐尼」;日和叫河嵐「河嵐醬」;藝瑟常叫河嵐「我們老么」。";
const SAMPLE={
 ys:["(還不熟時)「代表好!今天也辛苦了~啊,我先去看一下河嵐,她晚餐又沒吃。」","(熟了)「代表~你看你看,這是新出的周邊!……不准笑,這是情報收集。」","(撐不住時)「……我沒事啦。真的。只是,讓我在這裡坐一下就好。」"],
 tr:["(還不熟時)「……嗯。」「知道了。」","(熟了)「這段的拍子,就像等紅燈的時候突然想跳舞——……算了,當我沒說。」","(害羞時)「……算了,我來。」(耳朵先紅)"],
 hy:["「代表!這句韓語是什麼意思?『心裡癢癢的』……是生病嗎?」","「大丈夫です!……啊,就是『沒事』的意思。」","「好喜歡~這個,還有這個,還有代表今天的領帶!」"],
 he:["「先吃飯再說啦!今天的大醬湯我放了很多豆腐喔。」","(被稱讚臉)「哎呀,臉又不能吃~倒是你,午餐吃了沒?」","(累的時候,笑得更用力)「我很好啊!超級好!」"],
 hr:["「交給我!這段高音我唱給你聽——」","「欸欸欸代表你看!濟州寄來的橘子,一人一顆,不准跟我搶!」","(真的難過時)她突然安靜下來,把吉他抱得更緊,一句話也不說。"]};
const DETAIL={ys:"粉紅色小物、兔子玩偶、追女團的周邊收藏本、隊長筆記本、酒量好、被反過來照顧時手足無措",tr:"黑膠唱片、分一邊的耳機、便利商店泡麵、洛杉磯、冷笑話、講到舞蹈和歌詞話變多、夾英文",
 hy:"芭蕾把桿、玉子燒、圍巾、舊傷的腳踝、用韓劇台詞學韓語、日文英文混著說",he:"廚房是她的地盤、泡菜鍋、海鮮煎餅、大邱烤肉店、慶尚道口音、被當普通人對待會很開心",hr:"吉他、濟州的橘子、擬聲詞、大嗓門、半語、唱歌時像變了一個人、難過時突然安靜"};
const STAGE_VOICE={戒備:"用敬語、句子短、不太看代表的眼睛,說完正事就想走。",信任:"開始會多說一兩句工作上的煩惱,偶爾開個小玩笑,但不談私事。",
 夥伴:"會說私事、會抱怨、會撒一點嬌、會主動找代表;偶爾露出脆弱的一面再自己收回去。",心動:"欲言又止、偷看、話說到一半改口、被碰到會僵住;絕對不說破喜歡。",
 戀人:"私下語氣變軟、會撒嬌、會吃醋、會怕被別人發現;人前裝沒事,人後只對代表說真心話。",親密:"自然的親暱與默契,枕邊話、清晨的慵懶;親密場面一律淡出帶過。",多人親密:"三人之間有默契也有小小的醋意,彼此照顧;親密場面一律淡出帶過。"};
const CRAFT=`【寫作守則(最重要)】
1. 台詞要短:大多 25 字以內,最長不超過 45 字;一句只講一件事。真人說話會停頓(……)、說半句、改口、用語氣詞,不會一口氣講完整段道理。
2. 不說教、不解說情緒:不要寫「其實我想說的是」「你讓我覺得很溫暖」「謝謝你一直陪著我」這類把感覺直接講出來的台詞。用動作和小細節表現:旁白(who 用 narr)寫她的動作,例如(她把毛巾蓋在頭上)(耳朵紅了)。每個節點最多一兩句旁白。
3. 要具體:每個片段至少一個只屬於她的細節(物件、食物、歌、習慣、身體感覺、天氣),不要空泛的「好累」「好開心」。
4. 要有轉折:片段開頭和結尾,她的心情或兩人的距離要有一點不一樣。
5. 選項 2~3 個,語氣明顯不同、都是代表會自然說的話或做的動作;沒有一眼就看得出的標準答案。每個選項的回應都要有內容,不能只是一句「謝謝」。
6. 用錯方式時,她用自己的方式反應,不會直接說「你讓我不舒服」:泰梨會沉默或轉回去練舞,河嵐會突然安靜,日和會笑著帶過,夏恩會笑得更用力,藝瑟會把話題轉到別人身上。
7. 不要每段都用「代表,你來了」開頭;不要每段都在稱讚代表;不要每段都以擁抱或道謝收尾。
8. 時期要對:練習生期還沒出道,不能有打歌、粉絲見面會、一位;練習生的日常是月評、宵禁、體重管理、手機上繳、宿舍。
9. 表情要跟那一句的情緒一致:苦笑用 smile 或 sad,不要用 laugh;害羞用 shy;生悶氣用 angry。旁白的表情一律填 neutral。`;
const EX_SINGLE={at:"practice",sl:[4],who:["tr"],sc:"深夜十二點,練習室只亮著鏡子前那排燈。泰梨一個人對著鏡子,把同一段八拍重複了第十幾次。",w:3,cd:4,nodes:[
 {key:"start",lines:[{who:"narr",text:"(音樂停了。她在鏡子裡看到你,動作頓了一下。)",expr:"neutral"},{who:"tr",text:"……代表。這麼晚還沒走?",expr:"neutral"},{who:"tr",text:"再五分鐘就好。這個轉身,一直慢半拍。",expr:"sad"}],
  choices:[{text:"「我幫妳數拍子。」",style:"陪著",to:"tr",g:2,next:"b"},
   {text:"「轉身前,左肩先收一點試試?」",style:"出手幫忙",to:"tr",g:0,reply:[{who:"tr",text:"……我知道怎麼跳。",expr:"angry"},{who:"narr",text:"(她轉回鏡子,背對著你繼續練。)",expr:"neutral"}]},
   {text:"「五分鐘喔。我計時。」",style:"開玩笑",to:"tr",g:1,reply:[{who:"tr",text:"……那你要倒數得很慢。",expr:"smile"}]}]},
 {key:"b",lines:[{who:"narr",text:"(你在鏡子旁坐下,拍著手打拍子。五、六、七、八——)",expr:"neutral"},{who:"tr",text:"……成功了。",expr:"smile"},{who:"tr",text:"剛剛那拍,你拍得比節拍器還準。",expr:"smile"}],
  choices:[{text:"「明天也來幫妳數?」",style:"陪著",to:"tr",g:2,set:"trCountBeat",reply:[{who:"tr",text:"……隨便你。",expr:"shy"},{who:"narr",text:"(她轉身去拿水,耳朵紅了。)",expr:"neutral"}]},
   {text:"「是妳自己跳對的。」",style:"鼓勵",to:"tr",g:1,reply:[{who:"tr",text:"嗯。……但還是謝了。",expr:"smile"}]}]}]};
const EX_PAIR={at:"dorm",sl:[3,4],who:["hr","hy"],sc:"深夜的宿舍廚房,河嵐和日和蹲在冰箱前,為了最後一盒布丁小聲猜拳。",w:3,cd:4,nodes:[
 {key:"start",lines:[{who:"hr",text:"剪刀石頭——欸!日和歐尼妳慢出!",expr:"angry"},{who:"hy",text:"慢出?那是什麼?日本沒有這個規則喔~",expr:"laugh"},{who:"hr",text:"騙人!代表你評評理!",expr:"angry"}],
  choices:[{text:"「一人一半。」",style:"轉移話題",to:"hr",g:1,reply:[{who:"hr",text:"……好啦。但我要有焦糖的那半。",expr:"smile"},{who:"hy",text:"はい、河嵐醬先選~",expr:"smile"}]},
   {text:"(打開冰箱下層,拿出藏著的另一盒。)",style:"出手幫忙",to:"hr",g:2,reply:[{who:"hr",text:"哇——代表藏私房布丁!",expr:"laugh"},{who:"hy",text:"代表、すごい!好喜歡~",expr:"laugh"}]}]}]};
/* 回傳格式:用 Gemini 的 responseSchema 鎖住(選項、說話者、表情、地點都是固定的值),不會再有格式錯誤 */
function SCHEMA(places,who,ref){   // ref:AI 修訂一次送好幾個時,用來對回原本的片段
  const line={type:"OBJECT",properties:{who:{type:"STRING",enum:[...who,"narr"]},text:{type:"STRING"},expr:{type:"STRING",enum:EXPRS},dir:{type:"STRING"}},required:["who","text","expr"],propertyOrdering:["who","text","expr","dir"]};
  const choice={type:"OBJECT",properties:{text:{type:"STRING"},style:{type:"STRING",enum:STYLES},to:{type:"STRING",enum:who},g:{type:"INTEGER"},mood:{type:"INTEGER"},stress:{type:"INTEGER"},heart:{type:"INTEGER"},set:{type:"STRING"},bw:{type:"STRING",enum:who},bv:{type:"INTEGER"},next:{type:"STRING"},reply:{type:"ARRAY",items:line}},
    required:["text","style","to","g"],propertyOrdering:["text","style","to","g","mood","stress","heart","set","bw","bv","next","reply"]};
  const node={type:"OBJECT",properties:{key:{type:"STRING"},lines:{type:"ARRAY",items:line},choices:{type:"ARRAY",items:choice}},required:["key","lines"],propertyOrdering:["key","lines","choices"]};
  const sn={type:"OBJECT",properties:{at:{type:"STRING",enum:places},sl:{type:"ARRAY",items:{type:"INTEGER"}},who:{type:"ARRAY",items:{type:"STRING",enum:who}},sc:{type:"STRING"},w:{type:"INTEGER"},cd:{type:"INTEGER"},nodes:{type:"ARRAY",items:node}},
    required:["at","sl","who","sc","nodes"],propertyOrdering:["at","sl","who","sc","w","cd","nodes"]};
  if(ref){ sn.properties.ref={type:"STRING"}; sn.required.unshift("ref"); sn.propertyOrdering.unshift("ref") }
  return {type:"OBJECT",properties:{snippets:{type:"ARRAY",items:sn}},required:["snippets"]} }
/* 回傳 → 遊戲用的格式(nodes 物件、[說話者,台詞,表情] 陣列),順便修正常見的小錯 */
function toInternal(s0,main,stage){
  if(s0?.nodes&&!Array.isArray(s0.nodes)) return s0;      // 已經是舊格式
  const arr=Array.isArray(s0?.nodes)?s0.nodes:[]; if(!arr.length) return null;
  const ids=new Set(MB.map(m=>m.id)), clamp=(v,a,b)=>Math.max(a,Math.min(b,Math.round(+v||0)));
  const ln=l=>{ if(l?.dir){ const d=String(l.dir).trim(); return okDir(d)?["@",d]:null }   // 舞台指示
    const who=l?.who==="narr"?"":(ids.has(l?.who)?l.who:main), text=String(l?.text||"").trim(); if(!text) return null;
    return who?[who,text,EXPRS.includes(l?.expr)?l.expr:"neutral"]:["",text] };
  const keys=new Set(), N={}; arr.forEach((n,i)=>{ let k=String(n?.key||"").trim()||("n"+i); if(i===0&&!arr.some(x=>x?.key==="start")) k="start"; while(keys.has(k)) k+="_"; keys.add(k);
    N[k]={L:(n.lines||[]).map(ln).filter(Boolean),C:(n.choices||[]).map(c=>{ const o={t:String(c?.text||"").trim(),s:STYLES.includes(c?.style)?c.style:"陪著",to:ids.has(c?.to)?c.to:main,g:clamp(c?.g,-2,4)};
      if(c?.mood) o.mood=clamp(c.mood,-6,6); if(c?.stress) o.stress=clamp(c.stress,-6,6);
      if(c?.heart&&!["戒備"].includes(stage)) o.heart=clamp(c.heart,0,2); if(c?.set&&/^[a-zA-Z][a-zA-Z0-9]{1,30}$/.test(c.set)) o.set=c.set;
      if(c?.bw&&ids.has(c.bw)&&c.bw!==o.to&&c?.bv) o.bw=c.bw, o.bv=clamp(c.bv,-2,3);
      if(c?.next) o.next=String(c.next).trim(); const r=(c?.reply||[]).map(ln).filter(Boolean); if(r.length) o.r=r; return o }).filter(c=>c.t)} });
  for(const n of Object.values(N)) for(const c of n.C) if(c.next&&!N[c.next]) delete c.next;    // 指向不存在的節點 → 在這裡結束
  if(!N.start) return null;
  return {...s0,nodes:N} }
function parseSnippets(r,main,stage){ const arr=Array.isArray(r)?r:(r?.snippets||[]); return arr.map(s=>toInternal(s,main,stage)).filter(s=>s?.nodes?.start) }
/* 同一格(避免重複情境、算目前有幾個):事件看 ev;近況看情境與主角;其他照舊 */
function sameCell(x,p){ if(NEWK.has(p.type)) return sameCell10(x,p); const t=TYPES[p.type]; if(x.type!==p.type) return false;
  if(t.kind==="arc") return x.member===p.member&&x.stage===p.stage&&(!p.period||x.period===p.period);
  return t.kind==="event"?x.ev===p.ev:t.kind==="situ"?(x.req===p.req&&x.member===p.member&&(!p.period||x.period===p.period)):t.kind==="pair"?x.pair===p.pair:(x.member===p.member&&x.stage===p.stage) }
const mainOf=p=>{ if(NEWK.has(p.type)) return p.member==="all"?"ys":p.member; const t=TYPES[p.type]; return t.kind==="event"?"ys":t.kind==="arc"?p.member:t.kind==="pair"?(p.pair==="all"?"ys":p.pair.split("-")[0]):p.member };
function buildPrompt(p,existing){
  const t=TYPES[p.type]; const who=t.kind==="event"?MB.map(m=>m.id):t.kind==="pair"?(p.pair==="all"?MB.map(m=>m.id):p.pair.split("-")):[p.member];
  const romance=ROMANCE.includes(p.stage);
  const bio=id=>`【${mb(id).n}(id ${id})】${romance?VOICE[id].replace(/(原型[^)]*)/g,""):VOICE[id]} ${sigOf(id,p.stage)}
說話樣本(只學語氣,不要照抄):${SAMPLE[id].join(" ")}
可以用的具體細節:${DETAIL[id]}
她對代表的回應方式的反應倍率(負數是反效果):${Object.entries(PREF[id]).map(([k,v])=>k+v).join("、")}`;
  const ex=t.kind==="pair"||t.kind==="event"?EX_PAIR:EX_SINGLE;
  return `你是一款韓國女團養成戀愛遊戲的資深編劇,擅長寫有溫度、有生活感、角色辨識度很高的對話。玩家是財閥出身的娛樂公司代表(成員叫他/她「代表」,性別不指定),旗下五位女團成員都是成年人(故事開始時 18 歲)。請用台灣慣用的繁體中文寫遊戲的日常片段。

【這批要寫的】
種類:${t.n}(${t.len})
${t.kind==="event"?"出場:全員(五位成員都在)":t.kind==="pair"?`主角組合:${pairName(p.pair)}`:`主角:${mb(p.member).n}(id ${p.member})`}
${t.kind==="single"||t.kind==="arc"?`她對代表的關係階段:${p.stage}——${STAGE_DESC[p.stage]}\n這個階段的說話方式:${STAGE_VOICE[p.stage]||""}`:t.kind==="situ"?"她對代表的關係:不限定,這種片段會在信任到夥伴之間任何時候出現;語氣自然親近,不寫戀愛情節。":t.kind==="event"?"五位成員都在場,語氣依各自的個性;不寫戀愛情節(事件會在任何關係階段發生)。":`以成員之間的互動為主;代表在場時的語氣依一般信任階段。`}
${p.period?`時期:${p.period}——${PERIOD_DESC[p.period]}`:"時期:出道之後(可能在任何一年發生,不要寫特定年份的新聞)。"}${romance?"\n角色都是原創人物,不要提到或影射任何真實的人、團體或公司;戀情是祕密,出道後公開戀愛會被粉絲反彈,要有怕被拍到、被成員撞見的緊張感。":""}
${t.kind==="arc"?`段數:${p.count} 段(同一個故事,依序發生)。`:`數量:${p.count} 個,情境、地點、時段、情緒要明顯不同。`}
可用地點(at):${t.places.map(k=>`${k}=${PLACES[k]}`).join("、")}${t.places.filter(k=>PLACE_NOTE[k]).map(k=>`\n${PLACES[k]}的樣子:${PLACE_NOTE[k]}`).join("")}
時段(sl,數字,可以多個):0 清晨、1 上午、2 下午、3 晚上、4 深夜。
${p.hint?`玩家補充:${p.hint}\n`:""}${v3Block(p)}
【成員設定(必須嚴格遵守)】
${who.map(bio).join("\n\n")}
${ADDR}
其他成員 id:${MB.map(m=>`${m.id}=${m.n}`).join("、")}。

【世界設定(提到業界時只能用這些原創名稱)】
${WORLD_BASE}
${p.period?`這個時期:${WORLD_PERIOD[p.period]}`:"時期:出道之後的任何一年。"}
玩家團體的團名尚未決定,台詞裡用「我們」「我們團」。

${CRAFT}

【格式】
- 每個片段:at 地點、sl 時段、who 出場成員、sc 一句畫面旁白、w 權重 1~5、cd 冷卻天數 2~7、nodes 節點陣列。
- 第一個節點 key 是 start。每個節點有 lines(台詞)與 choices(代表的選項);選項用 next 指向另一個節點的 key,沒有 next 就在這裡結束,結束時用 reply 寫她最後的反應。
- 台詞 who 是說話的成員 id,旁白用 narr;expr 只能是 neutral 平常、smile 微笑、laugh 大笑、sad 難過、angry 生氣、shy 害羞、tired 累、surprise 驚訝、pout 嘟嘴撒嬌、moved 感動含淚、serious 認真堅定、wink 俏皮眨眼;依台詞的情緒選最貼切的,不要全部用 smile。
- 選項 style 只能是:${STYLES.join("、")};to 是這個選項影響的成員;g 是影響強度,整數 -2~4,依她對這種回應方式的倍率決定。mood、stress 可省略或填 -6~6;heart 只在特別心動的時刻填 1~2,而且只在信任以上的階段。set 可記一個英文小寫駝峰的旗標,讓之後的劇情記得。
- ${t.kind==="pair"||t.kind==="event"?"lines 裡多位成員輪流說話,成員之間要真的互相回應。":"lines 以主角為主,其他成員可以偶爾出現。"}${t.kind==="single"&&p.type!=="long"?"":""}
${p.type==="away"?"- 這種片段沒有選項:只有 start 一個節點,choices 留空陣列。":""}
${NO_DIR.includes(p.type)?"":`- 需要時可以在 lines 裡放舞台指示(不是台詞,一個片段最多 3 個,不要每段都用):{"who":"narr","text":"","expr":"neutral","dir":"bg:地點"} 中途換場景(地點只能是 ${Object.entries(DIR_BG).map(([k,v])=>k+"="+v).join("、")});dir:"enter:成員id" 讓一位成員進場、"exit:成員id" 讓她離場(進場的人要寫在 who 裡);dir:"sfx:音效英文小寫"(例如 door、rain、phone、knock,之後的聲音系統用)。
- 演出指令(讓情緒高點像電影,一個片段最多 2 個,只放在真正的高點,平常的對話不要用):"cam:close" 放在某人那句之前,鏡頭慢慢推近她(告白、心事、真心話);"cam:wide" 拉回;"fx:pause" 那句之前的沉默(說不出口、愣住);"fx:slow" 下一句慢慢說(鼓起勇氣的話);"fx:shake" 嚇到、生氣拍桌;"fx:flash" 突然想通、靈光一閃;"mood:memory" 開始回憶過去(回憶完用 "mood:off");"mood:dim" 低潮、難過的氣氛(結束用 "mood:off")。`}
${t.kind==="pair"||t.kind==="event"||t.kind==="arc"?"- 選項可以加 bw(另一位成員 id)與 bv(-2~3):這個選擇讓 to 和 bw 兩人之間的默契改變,例如幫兩人和好 +2、偏袒其中一方 -1;只在兩位成員都在場時用。":""}
${t.kind==="arc"?`- 這是連續劇情:snippets 依序是第 1 段、第 2 段……(共 ${p.count} 段),每段都是獨立的片段,發生在不同天(後一段至少隔一天);後一段要接著前一段的發展(例如起因 → 轉折 → 收尾),可以提到前一段發生的事。每段的 sc 開頭不用寫「第幾段」。`:""}
${existing.length?`- 這一格已經有以下情境,請避免重複:\n${existing.map(x=>"  · "+x).join("\n")}`:""}

【範例(只示範品質與格式,內容不要照抄)】
${JSON.stringify({snippets:[ex]})}

只回覆 JSON,格式同上。`;
}


/* =====================================================================
   改版 1.0 的新內容(2026-10-29):隨口互動 casual、深夜 night、日常活動 act;1.1 的 overhear、recall 先認得(不自動生產)
   定義在 daily.js(window.DAILY),格式說明《改版1.0_新內容格式.md》;規則和 pack_scripts.py 第三版一致
   ===================================================================== */
const DY=window.DAILY;
const NEWK=new Set(["casual","night","act","overhear","recall"]);
TYPES.casual={n:"隨口互動",kind:"casual",len:"1~3 句",places:["practice","dorm","studio","office","styling","out"],target:9,batch:6};
TYPES.night={n:"深夜",kind:"night",len:"8~16 句、2~4 個選擇點(訊息 3~8 句)",places:["dorm","out","phone"],target:4,batch:3};
TYPES.act={n:"日常活動",kind:"act",len:"三段、3~5 個選擇點、12~28 句",places:["practice","dorm","studio","office","styling","out"],target:2,batch:2};
TYPES.overhear={n:"成員之間(旁聽)",kind:"later",len:"",places:[],target:0,batch:0};
TYPES.recall={n:"記得你",kind:"later",len:"",places:[],target:0,batch:0};
const BAND_W={A:1,B:.85,C:.2};   // 自動生產的急迫度:新遊戲從戒備開始,C 段(戀人以上)要出道後才用得到
const bandTop=b=>DY.rank((DY.BANDS[b]||["戒備"]).slice(-1)[0]);
const hourTxt=h=>Array.isArray(h)?h.map(x=>{ const v=+x, hh=Math.floor(v)%24, mm=Math.round((v-Math.floor(v))*60); return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}` }).join("~"):"";
function normHour(h){ if(!Array.isArray(h)||h.length<2) return null; let a=+h[0], b=+h[1]; if(!isFinite(a)||!isFinite(b)) return null;
  if(a<6){ a+=24; if(b<=6) b+=24 } if(b<=a) b+=24; if(a<6||b>30||a>=b) return null; return [a,b] }
const slotsOfH=h=>DY.SLOT_H.map((s,i)=>h[0]<s[1]&&h[1]>s[0]?i:-1).filter(i=>i>=0);
const actOf=sn=>DY.ACTS[sn?.act];
const kindName10=sn=>sn.type==="act"?(actOf(sn)?.n||sn.act):sn.type==="casual"?(DY.CA[sn.ca]?.n||sn.ca):sn.type==="night"?(DY.NK[sn.nk]?.n||sn.nk):sn.type==="event"&&DY.MILESTONES[sn.ev]?DY.MILESTONES[sn.ev].n:"";
/* 每條路的(選擇點數, 句數):句數含節點台詞與選了之後的反應,不含舞台指示 */
function paths10(N){ const out=[], L=a=>(a||[]).filter(l=>l[0]!=="@").length;
  const go=(k,cp,ln,vis)=>{ if(out.length>2000) return; const n=N[k]; if(!n||vis.has(k)){ out.push([cp,ln]); return } ln+=L(n.L);
    if(!(n.C||[]).length){ out.push([cp,ln]); return } const v2=new Set(vis).add(k);
    for(const c of n.C){ const l2=ln+L(c.r); if(c.next&&N[c.next]) go(c.next,cp+1,l2,v2); else out.push([cp+1,l2]) } };
  if(N?.start) go("start",0,0,new Set()); return out.length?out:[[0,0]] }
function rangeWarn(w,what,ps,cp,ln,minCp,minLn){ const mx=i=>Math.max(...ps.map(p=>p[i])), mn=i=>Math.min(...ps.map(p=>p[i]));
  if(mx(0)<cp[0]||mx(0)>cp[1]) w.push(`${what}:最長的路有 ${mx(0)} 個選擇點(要 ${cp[0]}~${cp[1]})`);
  if(minCp!=null&&mn(0)<minCp) w.push(`${what}:有一條路只有 ${mn(0)} 個選擇點(至少 ${minCp})`);
  if(mx(1)>ln[1]) w.push(`${what}:有一條路有 ${mx(1)} 句(最多 ${ln[1]})`);
  if(mx(1)<ln[0]) w.push(`${what}:最長的路只有 ${mx(1)} 句(要 ${ln[0]}~${ln[1]})`);
  if(minLn!=null&&mn(1)<minLn) w.push(`${what}:有一條路只有 ${mn(1)} 句(至少 ${minLn})`) }
const dirCount=N=>{ let sc=0,fx=0; for(const n of Object.values(N||{})) for(const l of [...(n.L||[]),...(n.C||[]).flatMap(c=>c.r||[])]) if(l[0]==="@"){ if(DIR_FX[String(l[1])]) fx++; else sc++ } return {sc,fx} };
const FLAG_RE=/^(ys|tr|hy|he|hr|grp)[A-Z][A-Za-z0-9]{1,30}$/;
/* 新種類的格式與品質檢查(和 pack_scripts.py 第三版同一套規則) */
function analyse10(sn,w){ const N=sn.nodes||{}, ps=paths10(N), dc=dirCount(N), stR=sn.stage?DY.rank(sn.stage):DY.rank((DY.BANDS[sn.band]||["戒備"])[0]);
  if(["casual","night","act"].includes(sn.type)&&!(sn.band in DY.BANDS)&&!(sn.type==="act"&&sn.member==="all")) w.push("沒有關係段落 band");
  if(sn.stage&&sn.band&&DY.BANDS[sn.band]&&!DY.BANDS[sn.band].includes(sn.stage)) w.push(`stage ${sn.stage} 不在 ${sn.band} 段裡`);
  for(const n of Object.values(N)) for(const c of n.C||[]) if(c.set&&!FLAG_RE.test(c.set)) w.push(`旗標 ${c.set} 要用成員代號開頭的駝峰`);
  if(NEWK.has(sn.type)) for(const n of Object.values(N)) for(const l of [...(n.L||[]),...(n.C||[]).flatMap(c=>[[0,c.t],...(c.r||[])])]) if(l[0]!=="@"&&String(l[1]||"").length>45){ w.push("有一句超過 45 字"); break }
  if(sn.type==="casual"){ const L=N.start?.L||[];
    if(L.length<1||L.length>3) w.push(`隨口互動要 1~3 句(現在 ${L.length})`);
    if(L.filter(l=>l[0]==="").length>1) w.push("隨口互動的旁白最多 1 句");
    if(L.some(l=>l[0]==="@")||(N.start?.C||[]).length||Object.keys(N).length>1) w.push("隨口互動只有台詞,不能有選項或舞台指示");
    if(!L.some(l=>l[0]===sn.member)) w.push("她至少要說 1 句");
    const ca=DY.CA[sn.ca]; if(!ca) w.push(`不認得的動作 ${sn.ca}`); else if(stR<DY.rank(ca.gate)) w.push(`${ca.n}要${ca.gate}以上`);
    if(!["me","her"].includes(sn.by)) w.push("by 要是 me 或 her") }
  else if(sn.type==="night"){ if(!DY.NK[sn.nk]) w.push(`不認得的深夜種類 ${sn.nk}`);
    if(sn.hour&&+sn.hour[0]<23) w.push("深夜的時間要在 23 點以後");
    if(sn.nk==="msg"){ rangeWarn(w,"深夜訊息",ps,[1,2],[3,8]); if(Object.values(N).some(n=>(n.L||[]).some(l=>l[0]===""))) w.push("訊息不能有旁白"); if(dc.sc+dc.fx) w.push("訊息不能有舞台指示") }
    else { rangeWarn(w,"深夜",ps,[2,4],[8,16],1); if(dc.fx>1) w.push("深夜的演出指令最多 1 個"); if(dc.sc>2) w.push("深夜的換場景、進退場最多 2 個") } }
  else if(sn.type==="act"){ const a=actOf(sn); if(!a) w.push(`不認得的活動 ${sn.act}`);
    else { if(a.who&&sn.member!==a.who) w.push(`${a.n}是${mb(a.who).n}的專屬活動`);
      if(sn.band&&!DY.actBands(sn.act).includes(sn.band)) w.push(`${a.n}要${a.gate}以上,${sn.band} 段不用寫`);
      if(sn.room&&!a.rooms.includes(sn.room)) w.push(`${a.n}的地點是 ${a.rooms.map(r=>DY.ROOM_N[r]).join("、")}`);
      if(a.who&&!Object.values(N).some(n=>(n.C||[]).some(c=>c.set))) w.push("專屬活動每版至少要設一個旗標") }
    if(!String(sn.memo||"").trim()) w.push("活動要寫 memo(一句紀錄)"); else if(String(sn.memo).length>40) w.push("memo 超過 40 字");
    if((N.start?.C||[]).some(c=>!c.next||!N[c.next])) w.push("活動第一個節點的選項都要接下去");
    rangeWarn(w,"活動",ps,[3,5],[12,28],2,12); if(dc.fx>2) w.push("活動的演出指令最多 2 個"); if(dc.sc>3) w.push("活動的換場景、進退場最多 3 個") }
  else if(sn.type==="event"&&DY.MILESTONES[sn.ev]){ const ms=DY.MILESTONES[sn.ev];
    if(ms.card){ if(Object.keys(N).length>1||(N.start?.C||[]).length||(N.start?.L||[]).some(l=>!l[0])) w.push("事件卡只能有成員台詞,不要旁白與選項") }
    else rangeWarn(w,"里程碑事件",ps,[2,4],[8,30],1) }
  if(sn.room&&DY.ROOM_LATER.includes(sn.room)) w.push(`${DY.ROOM_N[sn.room]}的背景 1.1 才有`) }
function sameCell10(x,p){ if(x.type!==p.type) return false;
  if(p.type==="casual") return x.member===p.member&&x.ca===p.ca&&x.band===p.band&&(!p.grp||DY.grpOf(x.room)===p.grp);
  if(p.type==="night") return x.member===p.member&&x.nk===p.nk&&x.band===p.band;
  if(p.type==="act") return x.act===p.act&&x.member===p.member&&(x.band||"")===(p.band||"");
  return x.member===p.member&&(x.pair||"")===(p.pair||"") }
/* ---- Gemini 提示詞與回傳格式 ---- */
function bio10(id,stage){ const romance=ROMANCE.includes(stage);
  return `【${mb(id).n}(id ${id})】${romance?VOICE[id].replace(/(原型[^)]*)/g,""):VOICE[id]} ${sigOf(id,stage)}
說話樣本(只學語氣,不要照抄):${SAMPLE[id].join(" ")}
可以用的具體細節:${DETAIL[id]}
她對代表的回應方式的反應倍率(負數是反效果):${Object.entries(PREF[id]).map(([k,v])=>k+v).join("、")}` }
/* 示範轉成回傳的樣子(只留回傳格式有的欄位) */
const SHAPE10={casual:["room","sl","by","stage","state","season","wx","lines"],night:["room","hour","stage","state","season","wx","sc","nodes"],act:["room","hour","stage","season","wx","sc","memo","nodes"]};
function demoOf(p){ let L=DY.DEMO.filter(d=>d.type===p.type);
  if(p.type==="act"){ const ex=!!DY.ACTS[p.act]?.who; const f=L.filter(d=>!!DY.ACTS[d.act]?.who===ex); if(f.length) L=f }
  if(p.type==="night"){ const f=L.filter(d=>(d.nk==="msg")===(p.nk==="msg")); if(f.length) L=f }
  return L.slice(0,p.type==="casual"?3:1).map(d=>Object.fromEntries(SHAPE10[p.type].filter(k=>d[k]!=null).map(k=>[k,d[k]]))) }
function buildPrompt10(p,existing){
  const k=p.type, all=p.member==="all", who=all?MB.map(m=>m.id):[p.member], a=k==="act"?DY.ACTS[p.act]:null;
  const bandSt=DY.BANDS[p.band]||[], st=p.stage||"", voiceSt=st||bandSt[bandSt.length-1]||"信任";
  const rel=all?"五位成員都在,這是團體的日常;每個人和代表的關係不同,語氣依一般「信任」階段,不寫戀愛。"
    :st?`她對代表的關係階段:${st}——${STAGE_DESC[st]}\n這個階段的說話方式:${STAGE_VOICE[st]}`
    :`她對代表的關係:${p.band} 段(${bandSt.join("、")})。${bandSt.map(s=>`〔${s}〕${STAGE_DESC[s]}說話方式:${STAGE_VOICE[s]}`).join(" ")}\n語氣差很多時,在 stage 填 ${bandSt.join(" 或 ")},讓那個片段只在那個階段出現;整段都適用的填 any。`;
  const per=k==="act"&&p.band!=="C"?`時期:練習生期——${PERIOD_DESC["練習生期"]}\n這個時期的世界:${WORLD_PERIOD["練習生期"]}`
    :p.band==="C"?"時期:出道之後(戀人以上只會在出道後出現);不要寫特定年份的新聞。"
    :"時期:不限定。這種片段出道前後都可能出現,所以不要寫到只有練習生或只有出道後才有的事(月評、出道倒數、打歌、粉絲、簽售、新聞),只寫一直成立的日常;遊戲裡只有這五個人和代表。";
  const rooms=k==="casual"?DY.GRP[p.grp||"co"].rooms:k==="night"?DY.NK[p.nk].rooms:a.rooms;
  const roomTxt=rooms.length?rooms.map(r=>`${r}=${DY.ROOM_N[r]}`).join("、"):"(手機訊息,不用寫 room)";
  const spec=k==="casual"?`種類:隨口互動——${DY.CA[p.ca].n}(${DY.CA[p.ca].desc})。在房間裡遇到她時的一兩句話,遊戲裡只花 5 分鐘。
數量:${p.count} 個;情境、時段、她當下的狀態要明顯不同。by 填 me(代表主動,代表的動作寫在旁白裡,例如「(你把熱可可遞給她。)」)或 her(她主動:你走進房間時她先開口或先做什麼),這批兩種各一半。
規則:每個片段只有 lines,1~3 句:旁白(who 用 narr)最多 1 句、她至少說 1 句;沒有選項、沒有舞台指示。像真人隨口說的話:短、有一個具體的小細節(手上的東西、剛發生的事、天氣、身體感覺);不要每句都喊「代表」,不要每個都以道謝收尾。這種片段沒有選項,寫作守則第 4~6 條(轉折、選項)不適用:只要一個真實的小瞬間。
sl 是這件事可能發生的時段(0 清晨、1 上午、2 下午、3 晚上、4 深夜),要符合作息。state 填 normal(一般)、tired(累或壓力大)、after_practice(剛練完)、sleepy(深夜想睡)或 bright(心情特別好);season(春夏秋冬)與 wx(clear、rain、snow)只有寫到季節或天氣時才填,否則填 any。`
    :k==="night"?`種類:深夜——${DY.NK[p.nk].n}(${DY.NK[p.nk].desc})。只在 23:00~06:00 出現。
數量:${p.count} 個,情境要明顯不同。hour 是 [開始, 結束] 的小時,用 23~30(過午夜往上加:[24, 26] 是凌晨 0~2 點)。state、season、wx 不需要時填 normal / any。
${p.nk==="msg"?"這是手機訊息:lines 只有她傳來的訊息(3~8 句,沒有旁白、沒有舞台指示),choices 是代表回覆的訊息(1~2 個選擇點),reply 是她再傳來的訊息。不用寫 sc 與 room。":"最長的一條路 8~16 句、2~4 個選擇點;用錯方式可以提早結束(沒有懲罰,只是沒有收穫)。sc 是一句深夜的畫面(光線、聲音、溫度)。深夜的她比白天鬆、比較誠實;演出指令最多 1 個(fx:pause、mood:dim、mood:memory 適合深夜)。"}`
    :`種類:日常活動——${a.n}(${a.who?"她的專屬活動":"通用活動"})。代表在遊戲裡選「${a.menu}」開始,約 ${a.min} 分鐘;可以開始的時間:${a.t};效果:${a.eff}。
數量:${p.count} 個版本;每個版本的情境、她當天的狀態、發生的小事要真的不同,不是換句話說。${all?"這是全員版:五個人都在,4~6 人輪流說話、成員之間要互相回應;選項用 to 指定影響誰,可以用 bw/bv 改兩人默契。":"要用到她自己的細節。"}
結構:開場 → 過程 → 收尾三段(3 個以上節點);任何一條路都有 3~5 個選擇點、12~28 句(含選項後的反應)。第一個節點的每個選項都要用 next 接到下一段(活動不會一開始就結束);收尾可以分歧,用錯方式只是結尾比較淡。
memo:一句這次活動的紀錄,代表的視角,40 字以內(例如「晚上陪河嵐練舞,幫她把副歌的卡點對齊了。」)。hour 是 [開始, 結束] 的小時(24 小時制,過午夜往上加),要從可以開始的時間開始。season、wx 不需要時填 any。${a.who?"專屬活動每個版本至少一個選項設旗標 set。":""}`;
  return `你是一款韓國女團養成戀愛遊戲的資深編劇,擅長寫有溫度、有生活感、角色辨識度很高的對話。玩家是財閥出身的娛樂公司代表(成員叫他/她「代表」,性別不指定),旗下五位女團成員都是成年人。請用台灣慣用的繁體中文寫遊戲的日常片段。這款遊戲的目標是像真實的日常:她們有自己的作息、習慣、心事,也會記得代表做過的事。

【這批要寫的】
${spec}
${all?"出場:五位成員全員":`主角:${mb(p.member).n}(id ${p.member})`}
${rel}
${per}
地點(room,只能用這些):${roomTxt}
${DY.SCHED_TEXT}
${p.hint?`玩家補充:${p.hint}\n`:""}
【成員設定(必須嚴格遵守)】
${who.map(id=>bio10(id,voiceSt)).join("\n\n")}
${ADDR}
其他成員 id:${MB.map(m=>`${m.id}=${m.n}`).join("、")}。

【世界設定(提到業界時只能用這些原創名稱)】
${WORLD_BASE}
團名還沒決定,台詞用「我們」「我們團」。

${CRAFT}
10. 每句台詞、旁白、選項都在 45 字以內。

【格式】
- 台詞 who 是說話的成員 id,旁白用 narr;expr 只能是 neutral 平常、smile 微笑、laugh 大笑、sad 難過、angry 生氣、shy 害羞、tired 累、surprise 驚訝、pout 嘟嘴撒嬌、moved 感動含淚、serious 認真堅定、wink 俏皮眨眼;依那一句的情緒選最貼切的,不要全部用 smile;旁白一律 neutral。
${k==="casual"?"":`- 選項 style 只能是:${STYLES.join("、")};to 是這個選項影響的成員;g 是影響強度,整數 -2~4,依她對這種回應方式的倍率決定。${p.band==="A"?"這是 A 段,不要用 heart。":"heart 只在特別心動的時刻填 1~2。"} set 是旗標(成員代號開頭的駝峰,例如 hrPraisedVocal),只在之後值得被她回頭提起的選擇才設。
- 第一個節點 key 是 start;選項用 next 指向另一個節點的 key,沒有 next 就在這裡結束,結束時用 reply 寫她最後的反應。
${p.nk==="msg"?"":`- 需要時可以在 lines 放舞台指示(不是台詞):{"who":"narr","text":"","expr":"neutral","dir":"bg:地點"} 換場景(${Object.entries(DIR_BG).map(([k2,v])=>k2+"="+v).join("、")})、"enter:成員id"、"exit:成員id"、"sfx:英文小寫音效";演出指令 "cam:close"(下一句推近她)、"fx:pause"、"fx:slow"、"fx:shake"、"fx:flash"、"mood:memory" 或 "mood:dim"(結束用 "mood:off"),只放在真正的高點。`}`}
${existing.length?`- 這一格已經有以下內容,請避免重複:\n${existing.map(x=>"  · "+x).join("\n")}`:""}

【範例(只示範品質與格式,內容不要照抄)】
${JSON.stringify({snippets:demoOf(p)})}

只回覆 JSON,格式同上。` }
function SCHEMA10(p){ const k=p.type, all=p.member==="all", ids=MB.map(m=>m.id), E=a=>({type:"STRING",enum:a});
  const line={type:"OBJECT",properties:{who:E([...ids,"narr"]),text:{type:"STRING"},expr:E(EXPRS),dir:{type:"STRING"}},required:["who","text","expr"],propertyOrdering:["who","text","expr","dir"]};
  const choice={type:"OBJECT",properties:{text:{type:"STRING"},style:E(STYLES),to:E(ids),g:{type:"INTEGER"},mood:{type:"INTEGER"},stress:{type:"INTEGER"},heart:{type:"INTEGER"},set:{type:"STRING"},bw:E(ids),bv:{type:"INTEGER"},next:{type:"STRING"},reply:{type:"ARRAY",items:line}},
    required:["text","style","to","g"],propertyOrdering:["text","style","to","g","mood","stress","heart","set","bw","bv","next","reply"]};
  const node={type:"OBJECT",properties:{key:{type:"STRING"},lines:{type:"ARRAY",items:line},choices:{type:"ARRAY",items:choice}},required:["key","lines"],propertyOrdering:["key","lines","choices"]};
  const st=E(["any",...(DY.BANDS[p.band]||[])]), hour={type:"ARRAY",items:{type:"NUMBER"}}, seas=E(["any","春","夏","秋","冬"]), wx=E(["any","clear","rain","snow"]), state=E(["normal","tired","after_practice","sleepy","bright"]);
  let pr, req;
  if(k==="casual"){ pr={room:E(DY.GRP[p.grp||"co"].rooms),sl:{type:"ARRAY",items:{type:"INTEGER"}},by:E(["me","her"]),stage:st,state,season:seas,wx,lines:{type:"ARRAY",items:line}}; req=["room","sl","by","lines"] }
  else if(k==="night"){ pr=p.nk==="msg"?{hour,stage:st,state,season:seas,wx,nodes:{type:"ARRAY",items:node}}:{room:E(DY.NK[p.nk].rooms),hour,stage:st,state,season:seas,wx,sc:{type:"STRING"},nodes:{type:"ARRAY",items:node}}; req=p.nk==="msg"?["hour","nodes"]:["room","hour","sc","nodes"] }
  else { pr={room:E(DY.ACTS[p.act].rooms),hour,...(all?{}:{stage:st}),season:seas,wx,sc:{type:"STRING"},memo:{type:"STRING"},nodes:{type:"ARRAY",items:node}}; req=["room","hour","sc","memo","nodes"] }
  return {type:"OBJECT",properties:{snippets:{type:"ARRAY",items:{type:"OBJECT",properties:pr,required:req,propertyOrdering:Object.keys(pr)}}},required:["snippets"]} }
/* 回傳 → 遊戲格式 */
function build10(task,s0,ver){ const k=task.type, t=TYPES[k], all=task.member==="all", main=all?"ys":task.member, anyv=v=>["any","normal","",undefined,null].includes(v)?"":String(v);
  const ln=l=>{ if(l?.dir){ const d=String(l.dir).trim(); return okDir(d)?["@",d]:null } const who=l?.who==="narr"?"":(mb(l?.who)?l.who:main), text=String(l?.text||"").trim(); if(!text) return null; return who?[who,text,EXPRS.includes(l?.expr)?l.expr:"neutral"]:["",text] };
  let nodes;
  if(k==="casual") nodes={start:{L:(s0?.lines||[]).map(ln).filter(Boolean),C:[]}};
  else { const r=toInternal({nodes:s0?.nodes},main,task.band==="A"?"戒備":anyv(s0?.stage)||"夥伴"); if(!r) return null; nodes=r.nodes }
  const msg=k==="night"&&task.nk==="msg", def=k==="casual"?DY.GRP[task.grp||"co"].rooms:k==="night"?DY.NK[task.nk].rooms:DY.ACTS[task.act].rooms;
  const room=msg?"":(def.includes(s0?.room)?s0.room:def[0]);
  let hour=k==="casual"?null:normHour(s0?.hour); if(k==="night"&&(!hour||hour[0]<23)) hour=[23,26]; if(k==="act"&&!hour){ const w=DY.ACTS[task.act].w[0]; hour=[w[0],w[0]+DY.ACTS[task.act].min/60] }
  const sl=k==="casual"?[...new Set((Array.isArray(s0?.sl)?s0.sl:[2]).map(Number).filter(x=>x>=0&&x<=4))]:slotsOfH(hour);
  return {code:`${k}-${task.act||task.ca||task.nk}-${task.member}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`,type:k,k:t.n,member:task.member,pair:all?"all":"",
    band:task.band||"",stage:all?"":anyv(s0?.stage),period:task.period||"",
    ...(k==="casual"?{ca:task.ca,by:s0?.by==="her"?"her":"me"}:{}),...(k==="night"?{nk:task.nk}:{}),...(k==="act"?{act:task.act,ver,memo:String(s0?.memo||"").trim()}:{}),
    at:msg?"phone":DY.ROOM_AT[room],room,sl,...(hour?{hour}:{}),state:anyv(s0?.state),season:anyv(s0?.season),wx:anyv(s0?.wx),
    who:all?MB.map(m=>m.id):[task.member],sc:String(s0?.sc||""),w:3,cd:{casual:3,night:5,act:10}[k],nodes,rev:3,createdAt:Date.now(),params:{...task}} }
const existing10=task=>[...lib(),...reviewQ_()].filter(x=>sameCell(x,task)).slice(-25).map(x=>x.type==="casual"?(x.nodes?.start?.L||[]).map(l=>l[1]).join("").slice(0,30):String(x.sc||"").slice(0,40)).filter(Boolean);
async function fetch10(task,signal){
  const ex=[...lib(),...reviewQ_()].filter(x=>sameCell(x,task)).length;
  const r=await aiJSON(buildPrompt10(task,existing10(task)),[],signal,SCHEMA10(task));
  const arr=Array.isArray(r)?r:(r?.snippets||[]), news=[]; let vi=ex;
  for(const s0 of arr){ const sn=build10(task,s0,++vi); if(!sn?.nodes?.start) continue; markDup(sn,news); news.push(sn) }
  if(!news.length) throw {code:"invalid_json",message:"回傳裡沒有可用的片段"};
  return {news,total:arr.length} }
/* 下一個要補的新種類格子(nextTask 用):順序是隨口互動 → 1.0 的通用活動 → 深夜 → 其他通用活動 → 全員版;C 段排最後。專屬活動與里程碑由長對話寫,不自動生產 */
function offer10(offer,L2){ const cnt={}, inc=k=>cnt[k]=(cnt[k]||0)+1;
  for(const x of L2){ if(x.type==="casual") inc(`c|${x.member}|${x.ca}|${x.band}|${DY.grpOf(x.room)}`); else if(x.type==="night") inc(`n|${x.member}|${x.nk}|${x.band}`); else if(x.type==="act") inc(`a|${x.act}|${x.member}|${x.band||""}`) }
  for(const m of MB) for(const b of Object.keys(DY.BANDS)){ const bw=BAND_W[b];
    for(const ca of DY.CA_NOW){ if(bandTop(b)<DY.rank(DY.CA[ca].gate)) continue;
      for(const g of Object.keys(DY.GRP)){ const tgt=TYPES.casual.target, gap=tgt-(cnt[`c|${m.id}|${ca}|${b}|${g}`]||0);
        if(gap>0) offer(gap/tgt*1.6*bw,{type:"casual",member:m.id,band:b,ca,grp:g,pair:"",stage:"",period:"",count:Math.min(TYPES.casual.batch,gap),hint:""}) } }
    for(const nk of Object.keys(DY.NK)){ const tgt=TYPES.night.target, gap=tgt-(cnt[`n|${m.id}|${nk}|${b}`]||0);
      if(gap>0) offer(gap/tgt*1.2*bw,{type:"night",member:m.id,band:b,nk,pair:"",stage:"",period:b==="C"?"出道與上升期":"",count:Math.min(TYPES.night.batch,gap),hint:""}) }
    for(const [ak,a] of Object.entries(DY.ACTS)){ if(a.who||!DY.actBands(ak).includes(b)) continue; const tgt=TYPES.act.target, gap=tgt-(cnt[`a|${ak}|${m.id}|${b}`]||0);
      if(gap>0) offer(gap/tgt*(a.first?1.4:a.later?.3:.6)*bw,{type:"act",act:ak,member:m.id,band:b,pair:"",stage:"",period:b==="C"?"出道與上升期":"練習生期",count:Math.min(TYPES.act.batch,gap),hint:""}) } }
  for(const [ak,a] of Object.entries(DY.ACTS)){ if(a.who||!a.allv) continue; const gap=a.allv-(cnt[`a|${ak}|all|`]||0);
    if(gap>0) offer(gap/a.allv*(a.first?.9:a.later?.2:.4),{type:"act",act:ak,member:"all",band:"",pair:"all",stage:"",period:"練習生期",count:1,hint:""}) } }
const taskLabel10=x=>`${TYPES[x.type].n}・${kindName10(x)}・${x.member==="all"?"全員":mb(x.member)?.n||""}${x.band?"・"+x.band+" 段":""}${x.grp?"・"+DY.GRP[x.grp].n:""}`;

/* ---------- 自動生產:排程、速度與每日額度控管 ---------- */
const AK="kpopScripts.auto";
let A={rpm:4,day:200,autoAccept:true,fallback:true}; try{A={...A,...JSON.parse(localStorage.getItem(AK)||"{}")}}catch(e){window.logErr?.("scripts",e)}
const saveA=()=>{try{localStorage.setItem(AK,JSON.stringify(A))}catch(e){window.logErr?.("scripts",e)}};
const ptDate=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Los_Angeles"});
function usage(){let u={};try{u=JSON.parse(localStorage.getItem(AK+".use")||"{}")}catch(e){window.logErr?.("scripts",e)} if(u.d!==ptDate()) u={d:ptDate(),n:0,made:0,fail:0}; if(!u.why) u.why={}; return u}
function setUsage(u){try{localStorage.setItem(AK+".use",JSON.stringify(u))}catch(e){window.logErr?.("scripts",e)}}
/* 額度用完就換下一個模型(每個模型的免費額度分開算):主模型 → 設定裡的備用模型 → Flash-Lite */
const modelList=()=>{ const m=localStorage.getItem(KEY_M)||DEFAULT_MODEL, main=RETIRED.includes(m)?DEFAULT_MODEL:m;
  return [...new Set([main,...(A.fallback?String(A.extra||"").split(/[,,、\s]+/).map(x=>x.trim()).filter(Boolean):[]),...(A.fallback?["gemini-flash-lite-latest"]:[])])] };
function pickModel(u){ u.outM=u.outM||{}; const L=modelList(), m=L.find(x=>!u.outM[x]); modelOverride=m&&m!==L[0]?m:""; return m||"" }
function msToReset(){const now=new Date(); const pt=new Date(now.toLocaleString("en-US",{timeZone:"America/Los_Angeles"})); const nx=new Date(pt); nx.setHours(24,0,30,0); return nx-pt}
/* 各關係階段在各時期的比例(戒備多在早期,戀人多在後期) */
const PW={戒備:[.6,.3,.1,0],信任:[.4,.35,.15,.1],夥伴:[.2,.3,.3,.2],心動:[.1,.3,.35,.25],戀人:[0,.25,.4,.35],親密:[0,.15,.35,.35],多人親密:[0,.05,.25,.3],pair:[.3,.25,.25,.2]};
/* 長對話與雙人長對話改由 Claude 創作室負責,自動生產不再用 Gemini 產生 */
const TYPE_ORDER=["msg","encounter","practice","chat","request","friction","surprise","worry","topic","social"];
const PAIR_ORDER=["between","away","group"];
/* 下一個要補的格子(2026-10-27 改):以前照時期順序,練習生期全部補完才輪到出道後,而且同一時期先補低的關係階段,
   結果內容庫幾乎都是練習生期的戒備與信任。現在每一格算「缺多少(缺的比例)× 急迫度」,挑分數最高的:
   急迫度看玩家進度——目前的時期 1、下一個時期 0.8、更後面 0.45、已經過去 0.1;成員目前的關係階段 1、下一階段 0.9、再後面 0.35、已經過去 0.15。
   所以會先補玩家很快會用到的(下一個關係階段、出道後),同時其他格子也會輪到。事件仍然最優先。 */
function curPeriod(){ try{ if(typeof S==="undefined"||S==null) return 0; const dd=window.DEBUT_DAY??9e9; if(S.day<dd) return 0; const y=dateOf(S.day).getFullYear(); return y<=2017?1:y<=2019?2:3 }catch(e){ return 0 } }
const perUrg=pi=>{ const c=curPeriod(); return pi===c?1:pi===c+1?.8:pi>c?.45:.1 };
const stUrg=(id,st)=>{ const R=window.STAGE_RANK||STAGES, cur=R.indexOf(window.stageOfXp?.(id)||"戒備"), k=R.indexOf(st), d=k-Math.max(0,cur); return d===0?1:d===1?.9:d>1?.35:.15 };
function nextTask(){
  const L=lib(); const cnt={}; for(const x of L){const k=cellKey(x)+"|"+x.period; cnt[k]=(cnt[k]||0)+1}
  const rq=reviewQ_(); const pend={}; for(const x of rq){const k=cellKey(x)+"|"+x.period; pend[k]=(pend[k]||0)+1}
  for(const ev of Object.keys(EVENTS)){ const have=[...L,...rq].filter(x=>x.type==="event"&&x.ev===ev).length, g=TYPES.event.target-have;
    if(g>0) return {type:"event",ev,member:"",pair:"all",stage:"",period:"",count:Math.min(TYPES.event.batch,g),hint:""} }
  let best=null; const offer=(score,o)=>{ if(score>0&&(!best||score>best.score)) best={score,...o} };
  offer10(offer,[...L,...rq]);   // 改版 1.0 的新種類
  PERIODS.forEach((per,pi)=>{ const pu=perUrg(pi);
    STAGES.forEach(st=>TYPE_ORDER.forEach((ty,ti)=>MB.forEach(m=>{ const tgt=Math.round(TYPES[ty].target*PW[st][pi]); if(!tgt) return;
      const have=(cnt[ty+"|"+m.id+"|"+st+"|"+per]||0)+(pend[ty+"|"+m.id+"|"+st+"|"+per]||0), gap=tgt-have; if(gap<=0) return;
      offer(gap/tgt*pu*stUrg(m.id,st)*(1-ti*.015),{type:ty,member:m.id,pair:"",stage:st,period:per,count:Math.min(TYPES[ty].batch,gap),hint:""}) })));
    PAIR_ORDER.forEach((ty,ti)=>PAIRS.forEach(p=>{ const tgt=Math.round(TYPES[ty].target*(p==="all"?5:1)*PW.pair[pi]); if(!tgt) return;
      const have=(cnt[ty+"|"+p+"||"+per]||0)+(pend[ty+"|"+p+"||"+per]||0), gap=tgt-have; if(gap<=0) return;
      offer(gap/tgt*pu*.9*(1-ti*.015),{type:ty,member:"",pair:p,stage:"",period:per,count:Math.min(TYPES[ty].batch,gap),hint:""}) }));
    STAGES.forEach(st=>{ if(PW[st][pi]<.25) return; MB.forEach(m=>{ if([...L,...rq].some(x=>x.type==="arc"&&x.member===m.id&&x.stage===st&&x.period===per)) return;
      offer(pu*stUrg(m.id,st)*.85,{type:"arc",member:m.id,pair:"",stage:st,period:per,count:3,hint:""}) }) });
    Object.keys(SITU).forEach(k=>{ if(!SITU[k].per.includes(per)) return; MB.forEach(m=>{ const have=[...L,...rq].filter(x=>x.type==="situ"&&x.req===k&&x.member===m.id&&x.period===per).length, gap=TYPES.situ.target-have; if(gap<=0) return;
      offer(gap/TYPES.situ.target*pu*.8,{type:"situ",req:k,member:m.id,pair:"",stage:"",period:per,count:Math.min(TYPES.situ.batch,gap),hint:""}) }) });
  });
  if(!best) return null; const {score,...task}=best; return task;
}
let running=false, wakeLock=null, lastCalls=[], aState="", aWait=0, aTick=0;
const sleep=ms=>new Promise(r=>{const t0=Date.now(); aWait=Date.now()+ms; const iv=setInterval(()=>{ if(!running||Date.now()>=aWait){clearInterval(iv);r()} },500)});
async function produce(task){
  if(NEWK.has(task.type)){ const {news,total}=await fetch10(task); return judge(news,total,false) }
  const t=TYPES[task.type];
  const existing=lib().filter(x=>sameCell(x,task)).slice(-25).map(x=>x.sc);
  const r=await aiJSON(buildPrompt(task,existing),[],undefined,SCHEMA(t.places,MB.map(m=>m.id)));
  const arr=parseSnippets(r,mainOf(task),task.stage); let ok=0,bad=[];
  if(!arr.some(x=>x?.nodes?.start)) throw {code:"invalid_json",message:"回傳裡沒有可用的片段"};
  const news=[];
  const arcId=t.kind==="arc"?`arc-${task.member}-${Date.now().toString(36)}`:"", parts=arr.filter(x=>x?.nodes?.start).length; let part=0;
  for(const s0 of arr){ if(!s0?.nodes?.start) continue; part++;
    const sn={...(arcId?{arc:arcId,part,parts}:{}),code:`${task.type}-${task.ev||task.req||""}${task.ev||task.req?"-":""}${t.kind==="pair"?task.pair:task.member||"all"}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`,
      type:task.type,k:t.n,member:task.member,pair:task.pair,stage:task.stage,period:task.period,ev:task.ev||"",req:task.req||"",
      at:t.places.includes(s0.at)?s0.at:t.places[0],sl:(Array.isArray(s0.sl)?s0.sl:[2]).filter(x=>x>=0&&x<=4),who:t.kind==="event"?MB.map(m=>m.id):Array.isArray(s0.who)?s0.who.filter(x=>mb(x)):[task.member],
      sc:String(s0.sc||""),w:+s0.w||3,cd:+s0.cd||4,nodes:s0.nodes,createdAt:Date.now(),params:{...task}};
    markDup(sn,news); news.push(sn) }
  /* 2026-10-28 使用者要求嚴格把關品質:
     和內容庫太像 → 淘汰重寫(不管有沒有開評分);格式或品質檢查沒過(套話、太長、結構錯)→ 淘汰重寫;
     開了評分:7 分以上自動收下、6 分進待審、5 分以下淘汰重寫;評分失敗(沒有分數)→ 進待審,不直接收 */
  return judge(news,arr.length,t.kind==="arc");
}
async function judge(news,total,arc){
  const clean=news.filter(sn=>!analyse(sn).warn.length);
  if(A.score&&clean.length) await scoreSnips(clean);
  const acc=[], rev=[]; let drop=0;
  for(const sn of news){
    if(sn.dupOf||analyse(sn).warn.length){ drop++; continue }
    if(A.score){ if(sn.score==null) rev.push(sn); else if(sn.score>=7) (A.autoAccept?acc:rev).push(sn); else if(sn.score===6) rev.push(sn); else drop++ }
    else (A.autoAccept?acc:rev).push(sn) }
  return {acc,rev,drop,total,arc};
}
/* v3 ④:去重複(和同一格的內容庫比字詞重疊)與 AI 評分(多用一次額度,設定裡打開) */
const textOf=sn=>[...(sn.hear||[]),...Object.values(sn.nodes||{}).flatMap(n=>[...(n.L||[]),...(n.C||[]).flatMap(c=>[[0,c.t],...(c.r||[])])])].filter(l=>l[0]!=="@").map(l=>l[1]).join("").replace(/[\s,。!?、…「」『』~—,.!?]/g,"");
const grams=s=>{ const g=new Set(); for(let i=0;i<s.length-1;i++) g.add(s.slice(i,i+2)); return g };
function simOf(a,b){ const A1=grams(a),B1=grams(b); if(!A1.size||!B1.size) return 0; let n=0; for(const x of A1) if(B1.has(x)) n++; return n/(A1.size+B1.size-n) }
/* 和內容庫、待審裡同一格的片段比,字詞重疊超過一半就標重複 */
function markDup(sn,others=[]){ const me=textOf(sn), short=sn.type==="casual"||(sn.type==="night"&&sn.nk==="msg"); if(me.length<(short?6:20)) return;
  const cell=sn.params&&NEWK.has(sn.type)?sn.params:sn;   // 新種類用產生時的格子(隨口互動不分地點比)
  for(const x of [...lib(),...reviewQ_()].filter(x=>sameCell(x,{...cell,grp:""})).concat(others)){ if(x.code===sn.code||(sn.arc&&x.arc===sn.arc)) continue; if(simOf(me,textOf(x))>(short?.45:.5)){ sn.dupOf=x.sc||textOf(x).slice(0,16)||x.code; return } } }
async function scoreSnips(list){ try{ lastCalls.push(Date.now()); const u=usage(); u.n++; setUsage(u);
    const r=await aiJSON(`你是嚴格的韓國女團戀愛遊戲編劇審稿人。依下面的寫作守則替每個片段打 1~10 分:8 分以上是像本人、有畫面、有轉折、台詞自然;6 分以下是套話、說教、解說情緒、不像她、選項沒有差別。
${CRAFT}
【要評的片段】(i 是編號)
${JSON.stringify(list.map((sn,i)=>({i,主角:mb(sn.member)?.n||pairName(sn.pair||"all"),種類:TYPES[sn.type]?.n,sc:sn.sc,lines:Object.values(sn.nodes).flatMap(n=>(n.L||[]).filter(l=>l[0]!=="@").map(l=>(mb(l[0])?.n||"旁白")+":"+l[1])),選項:Object.values(sn.nodes).flatMap(n=>(n.C||[]).map(c=>c.t))})))}
只回覆 JSON:{"scores":[{"i":0,"score":7,"why":"一句理由"}]}`,[],undefined,{type:"OBJECT",properties:{scores:{type:"ARRAY",items:{type:"OBJECT",properties:{i:{type:"INTEGER"},score:{type:"INTEGER"},why:{type:"STRING"}},required:["i","score"]}}},required:["scores"]});
    for(const s of r?.scores||[]){ const sn=list[+s.i]; if(sn){ sn.score=Math.max(1,Math.min(10,Math.round(+s.score||0))); sn.why=String(s.why||"").slice(0,60) } } }
  catch(e){ if(e?.code==="rate_day"){ const u=usage(); (u.outM=u.outM||{})[model()]=true; setUsage(u) } }   // 評分失敗就只看格式,不浪費已經寫好的片段
}
async function autoLoop(){
  try{wakeLock=await navigator.wakeLock?.request?.("screen")}catch(e){window.logErr?.("scripts",e)}
  while(running){
    const u=usage();
    if(!pickModel(u)) u.out=true;
    if(u.n>=A.day||u.out){ aState=u.out?"Google 回報今天的免費額度用完了,等額度重置後自動繼續。":`今天的上限 ${A.day} 次用完了,等額度重置後自動繼續。`; await sleep(msToReset()); continue }
    const task=nextTask(); if(!task){ aState="目標全部完成了!"; running=false; break }
    const gap=60000/Math.max(1,A.rpm); lastCalls=lastCalls.filter(t=>Date.now()-t<60000);
    if(lastCalls.length>=A.rpm){ aState="控制速度中…"; await sleep(60000-(Date.now()-lastCalls[0])+500); continue }
    const last=lastCalls[lastCalls.length-1]||0; if(Date.now()-last<gap){ aState="控制速度中…"; await sleep(gap-(Date.now()-last)); continue }
    aState=(modelOverride?"(備用模型)":"")+"產生中:"+(NEWK.has(task.type)?taskLabel10(task):`${TYPES[task.type].n}${task.ev||task.req?"・"+v3Label(task):""}・${task.pair?pairName(task.pair):mb(task.member).n}${task.stage?"・"+task.stage:""}${task.period?"・"+task.period:""}`);
    lastCalls.push(Date.now()); u.n++; setUsage(u);
    try{
      const fix=r=>{ if(r.arc&&r.drop){ r.drop+=r.acc.length+r.rev.length; r.acc=[]; r.rev=[] } return r };   // 連續劇情要整組一起
      let res=fix(await produce(task)), tries=0, dropped=res.drop;
      while(res.drop&&tries<2&&running){ tries++; aState=`淘汰 ${res.drop} 個,重寫中(第 ${tries} 次)…`; lastCalls.push(Date.now()); const u2=usage(); u2.n++; setUsage(u2); await sleep(gap);
        const r2=fix(await produce({...task,count:res.arc?task.count:res.drop})); dropped+=r2.drop; res={acc:[...res.acc,...r2.acc],rev:[...res.rev,...r2.rev],drop:r2.drop,arc:res.arc} }
      for(const sn of res.acc){ sn.status="auto"; await saveItem(sn) }
      for(const sn of res.rev){ sn.status="review"; await saveItem(sn) }
      const u3=usage(); u3.made+=res.acc.length; u3.review=(u3.review||0)+res.rev.length; u3.drop=(u3.drop||0)+dropped; setUsage(u3);
    }catch(e){
      const u4=usage(); const why=WHY[e?.code]?e.code:"other"; if(why==="other"&&!e?.message&&e) e={message:String(e)}; u4.fail++; u4.why[why]=(u4.why[why]||0)+1;
      if(e?.code==="rate_minute"||e?.code==="rate_day") u4.n=Math.max(0,u4.n-1); // 被 Google 以超量拒絕的請求不消耗額度,不算進今天已用
      if(e?.code==="rate_day"){ if(!u4.outM) u4.outM={}; u4.outM[model()]=true }
      setUsage(u4);
      u4.last=`${new Date().toLocaleTimeString("zh-TW",{timeZone:"Asia/Taipei",hour:"2-digit",minute:"2-digit"})} ${WHY[why]||why}${e?.message?":"+String(e.message).slice(0,120):""}`; setUsage(u4);
      if(e?.code==="rate_minute"){ aState="每分鐘次數到上限,稍等一下…"; await sleep(Math.max(15,(e.wait||60)+5)*1000) }
      else if(e?.code==="rate_day"){ }
      else if(e?.code==="bad_model"&&modelOverride){ const u5=usage(); (u5.outM=u5.outM||{})[model()]=true; setUsage(u5) }   // 備用模型名稱不對:跳過換下一個
      else if(["no_key","bad_key","bad_model","region"].includes(e?.code)){ aState=ERR[e.code]; running=false }
      else { aState=(ERR[e?.code]||"這次失敗了")+" 30 秒後重試。"; await sleep(30000) }
    }
  }
  modelOverride=""; try{await wakeLock?.release?.()}catch(e){window.logErr?.("scripts",e)} wakeLock=null; renderAuto();
}
const WHY={rate_minute:"每分鐘超量",rate_day:"每日額度用完",blocked:"被安全機制擋下",invalid_json:"回傳格式不完整",server:"Gemini 暫時出錯",network:"網路中斷",other:"其他"};
function fmtMs(ms){ms=Math.max(0,ms);const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);return h?`${h} 小時 ${m} 分`:m?`${m} 分 ${s} 秒`:`${s} 秒`}

/* ---------- 在遊戲裡的資料:所有片段(含待審),與雲端 users/{uid}/scripts 同步 ---------- */
let items=[];
const lib=()=>items.filter(x=>x.status==="ok"||x.status==="auto");
const reviewQ_=()=>items.filter(x=>x.status==="review");
function cellKey(sn){return sn.type+"|"+(TYPES[sn.type]?.kind==="pair"?sn.pair:sn.member)+"|"+(TYPES[sn.type]?.kind==="pair"?"":sn.stage)}
const EXPRS=["neutral","smile","laugh","sad","angry","shy","tired","surprise","pout","moved","serious","wink"];
function cleanExpr(nodes){ for(const n of Object.values(nodes||{})){ for(const l of n.L||[]) if(l.length>2&&!EXPRS.includes(l[2])) l.length=2;
  for(const c of n.C||[]) for(const l of c.r||[]) if(l.length>2&&!EXPRS.includes(l[2])) l.length=2 } return nodes }
async function persist(){ const o={}; for(const x of items) o[x.code]=x; await IDB.set("scriptsAll",o) }
/* 遊戲玩的時候用的精簡內容庫(2026-10-29 加上改版 1.0 的欄位) */
const SLIM_S=["type","member","pair","stage","period","room","wx","ev","req","arc","at","sc","band","act","ca","by","nk","season","state","memo"];
function slimSn(sn){ const o={code:sn.code}; for(const f of SLIM_S) o[f]=sn[f]||""; o.part=+sn.part||0; o.parts=+sn.parts||0; o.sl=sn.sl||[]; o.who=sn.who||[]; o.w=+sn.w||3; o.cd=+sn.cd||4; o.nodes=sn.nodes||{};
  for(const f of ["ver","hour","date","hear","need","wait"]) if(sn[f]!=null&&sn[f]!=="") o[f]=sn[f]; return o }
window.slimSnip=slimSn;
function toGame(sn){ if(sn.status==="ok"||sn.status==="auto") SCRIPTS[sn.code]=slimSn(sn); else delete SCRIPTS[sn.code] }
async function saveItem(it,checkDup){ const body={...it,updatedAt:Date.now()}; if(body.nodes) cleanExpr(body.nodes); if(checkDup) markDup(body);
  const i=items.findIndex(x=>x.code===body.code); if(i>=0) items[i]=body; else items.push(body);
  await persist(); toGame(body); await IDB.set("scripts",SCRIPTS); spPut(body); renderAll() }
async function removeItem(code){ items=items.filter(x=>x.code!==code); await persist(); delete SCRIPTS[code]; await IDB.set("scripts",SCRIPTS);
  const now=Date.now(); await spIdx(); SPI.tomb[code]=now; spSaveSoon(); spPut({code,deleted:true,updatedAt:now}); renderAll() }
/* 一次收很多個:本機一次寫完,雲端在背景逐個上傳(沒登入就排進待上傳區) */
let BULK=false;
async function okMany(list,label){
  if(BULK||!list.length) return; BULK=true; const now=Date.now(), idx=new Map(items.map((x,i)=>[x.code,i])), done=[];
  for(const sn of list){ const body={...sn,status:"ok",updatedAt:now}; if(body.nodes) cleanExpr(body.nodes);
    const i=idx.get(body.code); if(i===undefined) continue; items[i]=body; toGame(body); done.push(body) }
  await persist(); await IDB.set("scripts",SCRIPTS); BULK=false; renderAll(); toast2(`${label} ${done.length} 個,正在同步到雲端…`);
  let off=0; for(const b of done){ try{ if(!(await spPut(b))) off++ }catch(e){off++} }
  toast2(`${label} ${done.length} 個`+(off?`(${off} 個還沒同步,登入後會自動上傳)`:",已同步到雲端"));
}
/* =====================================================================
   劇情打包同步(2026-10-29,改版 1.0 第 1 輪)
   以前每段一個雲端文件(scripts/{code}):新裝置第一次同步要讀上萬次(Firestore 免費額度每天讀取 5 萬次),而且遊戲與製作者模式各讀一遍。
   現在:scriptpacks/{p0001…}(每包約 600 KB、好幾百段)+ scripts2/{code}(新寫的散件;累積 150 個或放超過 3 天就併進包裡、刪掉散件)。
   新裝置第一次同步:meta 1 次 + 包數(約 20~40 次)+ 散件(最多約 150 次)。遊戲用的內容庫(SCRIPTS)也從這裡來,不再另外讀一遍。
   合併一律「每段比 updatedAt,新的贏」;刪除留墓碑(包裡的 del,90 天後清掉)。寫包時要求雲端還是讀到的那一版(updateTime),
   兩台同時改就重讀、合併再寫。舊的逐段文件(scripts/)保留給舊版封存;新版每次同步增量看一下有沒有還沒更新的裝置寫進去的(有就收進包裡)。
   遷移:網頁版(APK 不做)登入後第一次同步時做一次;先在 meta 掛「遷移中」的鎖(15 分鐘),全部的包寫完才標記完成
   ===================================================================== */
const SP_PCOL="scriptpacks", SP_LCOL="scripts2", SP_META="meta/scriptPacks", SP_CAP=600000, SP_HARD=900000, SP_LOOSE_MAX=150, SP_LOOSE_AGE=3*864e5, SP_TOMB_KEEP=90*864e5;
const SPK={mode:"kpopGame.sp.mode",pc:"kpopGame.sp.packCur",lc:"kpopGame.sp.looseCur",gc:"kpopGame.pull.scriptsAll"};
const spMode=()=>localStorage.getItem(SPK.mode)||"legacy";
const TE=new TextEncoder(), u8=s=>TE.encode(s).length;
const devId=()=>{ let d=localStorage.getItem("kpopGame.devId"); if(!d){ d=Math.random().toString(36).slice(2,10); localStorage.setItem("kpopGame.devId",d) } return d };
const isApk=()=>!!window.Capacitor?.isNativePlatform?.();
let SPI=null, spSaveT=0;
async function spIdx(){ if(!SPI){ SPI=await IDB.get("spIdx")||{} } SPI.packs=SPI.packs||{}; SPI.loose=SPI.loose||{}; SPI.adopt=SPI.adopt||[]; SPI.tomb=SPI.tomb||{}; return SPI }
const spSave=()=>SPI?IDB.set("spIdx",SPI):Promise.resolve();
const spSaveSoon=()=>{ clearTimeout(spSaveT); spSaveT=setTimeout(spSave,1500) };
const isPre=e=>/FAILED_PRECONDITION|ALREADY_EXISTS|ABORTED/.test(String(e?.st||"")+String(e?.code||""))||e?.status===409||e?.status===412;
async function spPatch(path,fields,pre){ const t=await syToken(), q=pre?.ut?`?currentDocument.updateTime=${encodeURIComponent(pre.ut)}`:pre?.create?"?currentDocument.exists=false":"";
  return syJSON(syBase()+"/"+path+q,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify({fields})}) }
async function spDelete(path,ut){ const t=await syToken();
  return syJSON(syBase()+"/"+path+(ut?`?currentDocument.updateTime=${encodeURIComponent(ut)}`:""),{method:"DELETE",headers:{Authorization:"Bearer "+t}}) }
const docFields=b=>b.deleted?{json:{stringValue:"{}"},updatedAt:{integerValue:String(Math.round(b.updatedAt||Date.now()))},deleted:{booleanValue:true}}
  :{json:{stringValue:JSON.stringify(b)},updatedAt:{integerValue:String(Math.round(b.updatedAt||Date.now()))},deleted:{booleanValue:false}};
/* 合併進來的片段(每段比 updatedAt),dels 是墓碑 {code: 時間};回傳有變動的代號 */
function spMergeAll(list,dels){ const at=new Map(items.map((x,i)=>[x.code,i])), ch=[];
  for(const it of list){ if(!it?.code) continue; const tb=SPI.tomb[it.code]; if(tb&&tb>=(it.updatedAt||0)) continue;
    const i=at.get(it.code); if(i==null){ at.set(it.code,items.length); items.push(it); ch.push(it.code) } else if((it.updatedAt||0)>(items[i].updatedAt||0)){ items[i]=it; ch.push(it.code) } }
  let rm=false; for(const [code,ts] of Object.entries(dels||{})){ if(!(SPI.tomb[code]>=ts)) SPI.tomb[code]=ts; const i=at.get(code); if(i!=null&&items[i]&&(items[i].updatedAt||0)<=ts){ items[i]=null; ch.push(code); rm=true } }
  if(rm) items=items.filter(Boolean);
  return ch }
const docCode=d=>decodeURIComponent(d.name.split("/").pop());
async function spPullPacks(){ const since=+localStorage.getItem(SPK.pc)||0, rows=await syQuery(SP_PCOL,since); let max=since; const list=[], dels={};
  for(const r of rows){ const d=r.document; if(!d?.fields?.json) continue; const pk=docCode(d), up=+d.fields.updatedAt?.integerValue||0; max=Math.max(max,up);
    if(SPI.packs[pk]?.ut===d.updateTime) continue;   // 重疊的時間裡重讀到沒變的包
    let o; try{ o=JSON.parse(d.fields.json.stringValue) }catch(e){ continue }
    const its=o.items||{}; SPI.packs[pk]={ut:d.updateTime,u:up,codes:Object.keys(its),bytes:u8(d.fields.json.stringValue),del:o.del||{}};
    for(const it of Object.values(its)){ list.push(it); const l=SPI.loose[it.code]; if(l&&l.u<=(it.updatedAt||0)) delete SPI.loose[it.code] }   // 已經併進包的散件不用再管
    for(const [c,ts] of Object.entries(o.del||{})){ dels[c]=Math.max(dels[c]||0,ts); const l=SPI.loose[c]; if(l&&l.u<=ts) delete SPI.loose[c] } }
  localStorage.setItem(SPK.pc,String(max)); return spMergeAll(list,dels) }
async function spPullDocs(col,key,onDoc){ const since=+localStorage.getItem(key)||0, rows=await syQuery(col,since); let max=since; const list=[], dels={};
  for(const r of rows){ const d=r.document; if(!d?.fields) continue; const code=docCode(d), up=+d.fields.updatedAt?.integerValue||0; max=Math.max(max,up); onDoc?.(code,up,d);
    if(d.fields.deleted?.booleanValue){ dels[code]=Math.max(dels[code]||0,up); continue }
    try{ list.push(JSON.parse(d.fields.json.stringValue)) }catch(e){} }
  localStorage.setItem(key,String(max)); return spMergeAll(list,dels) }
const spPullLoose=()=>spPullDocs(SP_LCOL,SPK.lc,(code,up,d)=>{ SPI.loose[code]={u:up,ut:d.updateTime} });
async function spPullLegacy(bridge){ const ch=await spPullDocs("scripts",SPK.gc);
  if(bridge) for(const c of ch) if(!SPI.adopt.includes(c)) SPI.adopt.push(c);   // 還沒更新的裝置寫進舊位置的:下次併包時收進來
  return ch }
/* 寫一段到雲端:打包模式寫散件,舊模式照原本逐段寫;沒登入或失敗就排隊,下次同步再送 */
async function spUp(b){ const f=docFields(b);
  if(spMode()!=="packs"){ if(b.deleted){ await syPatchPath(`scripts/${encodeURIComponent(b.code)}`,f) } else { if(!(await saveDoc("scripts",b))) throw {code:"queued"} } return }
  const r=await spPatch(`${SP_LCOL}/${encodeURIComponent(b.code)}`,f); await spIdx(); SPI.loose[b.code]={u:+f.updatedAt.integerValue,ut:r?.updateTime||""}; spSaveSoon() }
async function spPut(b){ if(!syAuth()||!syCfg()){ await spQueue(b); return false }
  try{ await spUp(b); return true }catch(e){ if(e?.code!=="queued"){ window.logErr?.("劇情上傳",e); await spQueue(b) } return false } }
async function spQueue(b){ const q=await IDB.get("spOut")||{}; q[b.code]=b; await IDB.set("spOut",q) }
async function spFlush(){ const q=await IDB.get("spOut")||{}, ks=Object.keys(q); if(!ks.length) return; const left={};
  for(const k of ks){ try{ await spUp(q[k]) }catch(e){ if(e?.code!=="queued") left[k]=q[k] } } await IDB.set("spOut",left) }
async function legacyTombs(){ const t=await IDB.get("scriptsTombs")||[]; if(!t.length) return; const left=[];   // 舊版留下、還沒送出的刪除
  for(const code of t){ try{ await spUp({code,deleted:true,updatedAt:Date.now()}) }catch(e){ left.push(code) } } await IDB.set("scriptsTombs",left) }
async function spMeta(){ const d=await syGet(SP_META); if(!d) return null; let m={}; try{ m=JSON.parse(d.fields.json.stringValue) }catch(e){} return {...m,_ut:d.updateTime} }
/* 把全部片段裝成包(依建立時間排,每包到 600 KB 為止) */
function spPackUp(list,tombs){ const packs=[]; let cur={v:1,items:{},del:{}}, bytes=24;
  for(const it of list){ const b=u8(JSON.stringify(it))+u8(JSON.stringify(it.code))+2;
    if(bytes+b>SP_CAP&&Object.keys(cur.items).length){ packs.push(cur); cur={v:1,items:{},del:{}}; bytes=24 } cur.items[it.code]=it; bytes+=b }
  Object.assign(cur.del,tombs||{}); packs.push(cur); return packs }
async function spWritePack(pk,o,pre){ const json=JSON.stringify(o), up=Date.now();
  const r=await spPatch(`${SP_PCOL}/${pk}`,{json:{stringValue:json},updatedAt:{integerValue:String(up)},n:{integerValue:String(Object.keys(o.items).length)}},pre);
  SPI.packs[pk]={ut:r?.updateTime||"",u:up,codes:Object.keys(o.items),bytes:u8(json),del:o.del||{}}; return up }
const pkName=n=>"p"+String(n).padStart(4,"0");
async function spMigrate(meta){ if(isApk()) return false;   // 手機 App 不做(一次要上傳十幾 MB),等網頁版做
  const now=Date.now(); if(meta?.state==="migrating"&&now-(meta.at||0)<15*60e3&&meta.by!==devId()) return false;
  try{ await spPatch(SP_META,{json:{stringValue:JSON.stringify({state:"migrating",by:devId(),at:now})},updatedAt:{integerValue:String(now)}},meta?{ut:meta._ut}:{create:true}) }
  catch(e){ if(isPre(e)) return false; throw e }
  const list=[...items].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||String(a.code).localeCompare(String(b.code)));
  const packs=spPackUp(list,Object.fromEntries(Object.entries(SPI.tomb).filter(([,ts])=>now-ts<SP_TOMB_KEEP))); let maxU=0;
  for(let i=0;i<packs.length;i++){ const pk=pkName(i+1);
    try{ maxU=Math.max(maxU,await spWritePack(pk,packs[i],{create:true})) }
    catch(e){ if(!isPre(e)) throw e; const d=await syGet(`${SP_PCOL}/${pk}`); maxU=Math.max(maxU,await spWritePack(pk,packs[i],d?{ut:d.updateTime}:{create:true})) } }   // 之前沒做完留下的包:覆蓋
  await spPatch(SP_META,{json:{stringValue:JSON.stringify({state:"done",by:devId(),at:now,packs:packs.length})},updatedAt:{integerValue:String(Date.now())}});
  localStorage.setItem(SPK.mode,"packs"); localStorage.setItem(SPK.pc,String(maxU)); localStorage.setItem(SPK.lc,"0"); SPI.adopt=[]; SPI.loose={}; await spSave();
  window.logErr?.("劇情打包",{message:`遷移完成:${list.length} 段裝成 ${packs.length} 包`}); return true }
/* 併包:散件(與舊位置收來的)寫進包裡,寫好再刪散件。回傳 "retry" = 雲端的包被別台改過,要重讀再做 */
async function spCompact(force){ const now=Date.now(), loose=Object.entries(SPI.loose);
  const oldest=loose.reduce((m,[,l])=>Math.min(m,l.u||now),now);
  if(!force&&loose.length<SP_LOOSE_MAX&&now-oldest<SP_LOOSE_AGE&&!SPI.adopt.length) return 0;
  const codes=[...new Set([...loose.map(([c])=>c),...SPI.adopt])]; if(!codes.length) return 0;
  const byCode=new Map(items.map(x=>[x.code,x])), where={}; for(const [pk,p] of Object.entries(SPI.packs)) for(const c of p.codes) where[c]=pk;
  const pks=Object.keys(SPI.packs).sort(); let open=pks[pks.length-1]||pkName(1), nextN=pks.length?+pks[pks.length-1].slice(1)+1:2, openBytes=SPI.packs[open]?.bytes||24;
  const draft={}, isNew={};
  const D=pk=>{ if(draft[pk]) return draft[pk]; const p=SPI.packs[pk], o={v:1,items:{},del:{}};
    for(const [c,ts] of Object.entries(p?.del||{})) if(now-ts<SP_TOMB_KEEP) o.del[c]=ts;
    for(const c of p?.codes||[]){ const it=byCode.get(c); if(it) o.items[c]=it; else if(SPI.tomb[c]) o.del[c]=SPI.tomb[c]; else throw {code:"spMissing",message:`本機少了 ${c},先不併包`} }   // 安全:不會因為本機少了什麼就把雲端的弄丟
    if(!p) isNew[pk]=1; return draft[pk]=o };
  for(const c of codes){ const it=byCode.get(c), tb=SPI.tomb[c];
    if(it){ if(where[c]) D(where[c]).items[c]=it;
      else { const b=u8(JSON.stringify(it))+u8(c)+4; if(openBytes+b>SP_CAP&&Object.keys(D(open).items).length){ open=pkName(nextN++); openBytes=24 } D(open).items[c]=it; openBytes+=b } }
    else if(tb){ if(where[c]){ delete D(where[c]).items[c]; D(where[c]).del[c]=tb } else D(open).del[c]=tb } }
  // 改過的舊段把包撐太大(很少見):把這次的段移到新的包
  for(const pk of Object.keys(draft)){ if(u8(JSON.stringify(draft[pk]))<=SP_HARD) continue;
    const mv=codes.filter(c=>draft[pk].items[c]); const np=pkName(nextN++); for(const c of mv){ D(np).items[c]=draft[pk].items[c]; delete draft[pk].items[c] } }
  for(const pk of Object.keys(draft).sort()){ try{ await spWritePack(pk,draft[pk],isNew[pk]?{create:true}:{ut:SPI.packs[pk].ut}) }catch(e){ if(isPre(e)) return "retry"; throw e } }
  let del=0; for(const c of codes){ const l=SPI.loose[c]; if(!l) continue;
    try{ await spDelete(`${SP_LCOL}/${encodeURIComponent(c)}`,l.ut||""); delete SPI.loose[c]; del++ }
    catch(e){ if(e?.status===404||e?.st==="NOT_FOUND"){ delete SPI.loose[c] } else if(!isPre(e)) window.logErr?.("刪除散件",e) } }   // 刪之前被別台改過:留著,下次再併
  SPI.adopt=SPI.adopt.filter(c=>!codes.includes(c));
  for(const [c,ts] of Object.entries(SPI.tomb)) if(now-ts>SP_TOMB_KEEP) delete SPI.tomb[c];
  return codes.length }
async function applyChanges(ch){ if(!ch.length) return; const map=new Map(items.map(x=>[x.code,x]));
  for(const c of new Set(ch)){ const it=map.get(c); if(it) toGame(it); else delete SCRIPTS[c] }
  await persist(); await IDB.set("scripts",SCRIPTS); await renameOld(); if(OPEN) renderAll() }
async function spPullMain(){ if(!syAuth()||!syCfg()) return 0; await itemsReady; await spIdx();
  await spFlush(); await legacyTombs();
  let mode=spMode(); const ch=[];
  if(mode!=="packs"){ const m=await spMeta();
    if(m?.state==="done"){ localStorage.setItem(SPK.mode,"packs"); mode="packs"; if((+localStorage.getItem(SPK.gc)||0)<m.at) localStorage.setItem(SPK.gc,String(m.at)) }   // 別台已經遷移好:舊位置只看遷移之後的
    else { ch.push(...await spPullLegacy(false)); await applyChanges(ch);
      if(items.length&&await spMigrate(m).catch(e=>{ window.logErr?.("劇情打包遷移",e); return false })){ await spSave(); return new Set(ch).size } } }   // 剛遷移完:全部都在本機了,這次不用再讀
  if(mode==="packs"){ ch.push(...await spPullPacks(),...await spPullLoose(),...await spPullLegacy(true)); await applyChanges(ch); await spSave();
    try{ let r=await spCompact(); if(r==="retry"){ const c2=[...await spPullPacks(),...await spPullLoose()]; ch.push(...c2); await applyChanges(c2); r=await spCompact(true) } }
    catch(e){ window.logErr?.("劇情併包",e) } }
  await spSave(); return new Set(ch).size }
let PULLING=null;
window.scriptsPull=()=>PULLING||(PULLING=spPullMain().finally(()=>{ PULLING=null }));
/* 雲端用量用:劇情佔多少 */
window.scriptsUsage=async()=>{ await itemsReady; await spIdx(); const packs=Object.values(SPI.packs), byCode=new Map(items.map(x=>[x.code,x]));
  const looseB=Object.keys(SPI.loose).reduce((s,c)=>s+(byCode.get(c)?u8(JSON.stringify(byCode.get(c))):60)+120,0);
  const legacyB=items.reduce((s,x)=>s+u8(JSON.stringify(x))+120,0);
  return {mode:spMode(),items:items.length,packs:packs.length,packBytes:packs.reduce((s,p)=>s+(p.bytes||0)+200,0),loose:Object.keys(SPI.loose).length,looseBytes:looseB,legacyBytes:legacyB} };
window.scriptsRemove=code=>removeItem(code);
window.scriptsCompactNow=async()=>{ if(spMode()!=="packs") return 0; await spIdx(); let r=await spCompact(true); if(r==="retry"){ await applyChanges([...await spPullPacks(),...await spPullLoose()]); r=await spCompact(true) } await spSave(); return r };
/* 匯入連結(#import)送來的劇本:直接收進本機(待審馬上看得到),雲端照上面的方式寫 */
window.scriptsImport=async list=>{ await itemsReady; let n=0, off=0;
  for(const it of list){ if(!it?.code) continue; const body={...it,status:it.status||"review",updatedAt:Date.now()}; if(body.nodes) cleanExpr(body.nodes);
    const i=items.findIndex(x=>x.code===body.code); if(i>=0) items[i]=body; else items.push(body); toGame(body); if(!(await spPut(body))) off++; n++ }
  await persist(); await IDB.set("scripts",SCRIPTS); if(OPEN) renderAll(); return {n,off} };


/* =====================================================================
   畫面:製作者模式(編輯部的稿紙桌)
   ===================================================================== */
let OPEN=false, tab="auto", P={type:"encounter",member:"ys",pair:"ys-tr",stage:"戒備",period:"練習生期",count:5,hint:"",ev:"concert_backstage",req:"after_concert",band:"A",ca:"hello",grp:"co",nk:"insomnia",act:"dance"}, ctl=null, mStatus="", mErr=false;
let fM="",fT="",fS="",fQ="";
function shell(){
  if($("#makerFac")) return;
  const el=document.createElement("section"); el.id="makerFac"; el.className="fac-wrap th-writer hide";
  el.innerHTML=`<div class="fac-bg"></div><div class="fac-veil"></div>
    <header class="fac-head"><div class="fac-title"><small>PRODUCER MODE ・ SCRIPTS</small><b>製作者模式</b></div>
      <nav class="fac-tabs" id="mkTabs"></nav><button class="fac-close" id="mkClose">回到遊戲</button></header>
    <div class="fac-body" id="mkBody"></div><div class="mk-dlg hide" id="mkDlg"></div>`;
  $("#stage").appendChild(el); $("#mkClose").onclick=close;
}
async function open(){ shell(); await itemsReady; OPEN=true; setPause("maker",true);
  $("#makerFac").querySelector(".fac-bg").style.backgroundImage=`url(assets/bg/office_night.webp)`; renderAll();
  window.facShow?facShow($("#makerFac"),"assets/bg/office_night.webp"):$("#makerFac").classList.remove("hide") }   // 內容排好、背景解好才淡入
function close(){ $("#makerFac").classList.add("hide"); setPause("maker",false); OPEN=false }
window.openMaker=open;
const TABS=[["auto","自動生產"],["make","手動產生"],["review","待審"],["lib","內容庫"],["cover","覆蓋率"],["key","金鑰"]];
function renderAll(){ if(!OPEN) return;
  $("#mkTabs").innerHTML=TABS.map(([k,n])=>`<button data-mt="${k}" aria-selected="${k===tab}">${n}${k==="review"&&reviewQ_().length?`<i>${reviewQ_().length}</i>`:""}</button>`).join("");
  $("#mkTabs").querySelectorAll("[data-mt]").forEach(b=>b.onclick=()=>{tab=b.dataset.mt;renderAll()});
  const L=lib(); const stats=`<div class="mstats"><span><b>${L.length}</b>內容庫</span><span><b>${L.filter(x=>x.status==="auto").length}</b>未審</span><span><b>${reviewQ_().length}</b>待審</span><span><b>${L.filter(x=>x.type==="long"||x.type==="pairlong").length}</b>長對話</span>${apiKey()?"":`<span class="warn">還沒設定 Gemini 金鑰</span>`}</div>`;
  const B=$("#mkBody"); B.innerHTML=stats+(tab==="auto"?autoHTML():tab==="make"?makeHTML():tab==="review"?reviewHTML():tab==="lib"?libHTML():tab==="cover"?coverHTML():keyHTML());
  bind(B);
}
const chipsH=(list,cur,key,label)=>list.map(v=>`<button class="mchip${v===cur?" on":""}" data-${key}="${v}">${label?label(v):v}</button>`).join("");

/* 自動生產 */
function autoHTML(){
  const u=usage(), nx=nextTask(); const resetAt=new Date(Date.now()+msToReset()).toLocaleTimeString("zh-TW",{timeZone:"Asia/Taipei",hour:"2-digit",minute:"2-digit"});
  return `<div class="mgrid2"><div class="msheet">
    <h3>自動生產</h3>
    <p class="mnote">依覆蓋率由最常用的開始補:改版 1.0 的新種類優先(隨口互動 → 1.0 的通用活動 → 深夜),再來是原本的片段;關係由淺到深、五位成員輪流。專屬活動與里程碑事件由長對話劇本對話寫,這裡不自動產生。會自己控管每分鐘次數與每日上限,碰到上限就等待,額度重置後自動繼續。製作者模式關掉後仍會在背景繼續,但遊戲要保持開著。長對話改由 Claude 創作室負責。</p>
    <div class="mrow"><label>每分鐘最多<input type="number" id="aRpm" min="1" max="60" value="${A.rpm}">次</label><label>每天最多<input type="number" id="aDay" min="1" max="10000" value="${A.day}">次</label></div>
    <label class="mck"><input type="checkbox" id="aFb" ${A.fallback?"checked":""}> 今天額度用完時自動換模型繼續(主模型 → 備用模型 → Flash-Lite;每個模型的免費額度分開算)</label>
    <div class="mrow"><span class="mnote">備用模型</span><input id="aExtra" class="grow" value="${esc(A.extra||"")}" placeholder="例如 gemini-2.5-flash, gemini-2.5-flash-lite(用逗號分隔)"></div>
    <label class="mck"><input type="checkbox" id="aAuto" ${A.autoAccept?"checked":""}> 通過的直接收進內容庫(標為「未審」);和內容庫太像、格式或品質檢查沒過的一律淘汰重寫(每格最多重寫兩次,不會進待審)</label>
    <label class="mck"><input type="checkbox" id="aScore" ${A.score?"checked":""}> 寫完再請 Gemini 照守則評分(每批多用一次額度):7 分以上自動收下、6 分進待審、5 分以下淘汰重寫</label>
    <button class="mbtn ${running?"danger":"pri"} big" id="mkAuto">${running?"停止自動生產":"開始自動生產"}</button></div>
    <div class="msheet log"><h3>生產紀錄</h3>
    <p>狀態:<b>${running?(aState||"準備中…"):"未啟動"}</b>${running&&aWait>Date.now()?`(${fmtMs(aWait-Date.now())})`:""}</p>
    <p>使用模型:${model()}${u.outM&&Object.keys(u.outM).length?`(今天額度已用完:${Object.keys(u.outM).join("、")})`:""}</p>
    <p>今天已用 <b>${u.n}</b> / ${A.day} 次・自動收入 <b>${u.made}</b> 個・送審 ${u.review||0} 個・淘汰重寫 ${u.drop||0} 個</p><p>額度約在台灣時間 ${resetAt} 重置</p>
    ${u.last?`<p class="mnote">最近一次失敗:${esc(u.last)}</p>`:""}
    <p>失敗 ${u.fail} 次${u.fail?":"+Object.entries(u.why).map(([k,v])=>`${WHY[k]||k} ${v}`).join("、"):""}</p>
    <p>下一個要補的格子:${nx?(NEWK.has(nx.type)?taskLabel10(nx):`${TYPES[nx.type].n}・${nx.pair?pairName(nx.pair):mb(nx.member).n}${nx.stage?"・"+nx.stage:""}・${nx.period}`):"全部完成"}</p></div></div>`;
}
/* 手動產生 */
function fixP10(){ if(P.type==="act"){ const a=DY.ACTS[P.act]||DY.ACTS.dance; if(!DY.ACTS[P.act]) P.act="dance"; if(a.who) P.member=a.who; else if(P.member!=="all"&&!mb(P.member)) P.member="ys";
    const bs=DY.actBands(P.act); if(P.member==="all") P.band=""; else if(!bs.includes(P.band)) P.band=bs[0] }
  else { if(!mb(P.member)) P.member="ys"; if(!DY.BANDS[P.band]) P.band="A"; if(P.type==="casual"&&bandTop(P.band)<DY.rank(DY.CA[P.ca]?.gate||"戒備")) P.ca="hello" } }
function make10HTML(){ fixP10(); const t=TYPES[P.type], a=DY.ACTS[P.act];
  const have=lib().filter(x=>sameCell(x,P)).length, tgt=P.type==="act"?(P.member==="all"?a.allv||1:a.who?4:t.target):t.target;
  const bandChips=(P.type==="act"?DY.actBands(P.act):Object.keys(DY.BANDS)).map(b=>`<button class="mchip${b===P.band?" on":""}" data-band="${b}">${b} 段・${DY.BAND_N[b]}</button>`).join("");
  return `<div class="msheet"><h3>手動產生一批</h3>
    <h4>種類</h4><div class="mchips">${chipsH(Object.keys(TYPES).filter(k=>TYPES[k].kind!=="later"),P.type,"ty",k=>TYPES[k].n)}</div>
    ${P.type==="act"?`<h4>活動 <small>★ 是 1.0 第一批;專屬活動通常由長對話劇本對話寫</small></h4><div class="mchips">${Object.entries(DY.ACTS).map(([k,x])=>`<button class="mchip${k===P.act?" on":""}${x.later?" dim":""}" data-act="${k}">${x.first?"★":""}${esc(x.n)}${x.who?"・"+mb(x.who).n:""}</button>`).join("")}</div>`:""}
    ${P.type==="act"&&a.who?"":`<h4>主角</h4><div class="mchips">${chipsH([...MB.map(m=>m.id),...(P.type==="act"&&a.allv?["all"]:[])],P.member,"mm",id=>id==="all"?"全員版":mb(id).n)}</div>`}
    ${P.member==="all"?"":`<h4>關係段落</h4><div class="mchips">${bandChips}</div>`}
    ${P.type==="casual"?`<h4>動作</h4><div class="mchips">${DY.CA_NOW.map(k=>`<button class="mchip${k===P.ca?" on":""}" data-ca="${k}" ${bandTop(P.band)<DY.rank(DY.CA[k].gate)?"disabled":""}>${DY.CA[k].n}</button>`).join("")}</div>
      <h4>地點</h4><div class="mchips">${Object.keys(DY.GRP).map(g=>`<button class="mchip${g===P.grp?" on":""}" data-grp="${g}">${DY.GRP[g].n}</button>`).join("")}</div>`:""}
    ${P.type==="night"?`<h4>深夜的種類</h4><div class="mchips">${Object.keys(DY.NK).map(k=>`<button class="mchip${k===P.nk?" on":""}" data-nk="${k}">${DY.NK[k].n}</button>`).join("")}</div>`:""}
    <div class="mrow"><label>數量<input type="number" id="tCount" min="1" max="8" value="${P.count}"></label><label class="grow">補充說明<input type="text" id="tHint" value="${esc(P.hint)}" placeholder="例如:下雨天、月評前一晚、她剛被老師稱讚"></label></div>
    <p class="mnote">這一格目前有 ${have} 個,目標 ${tgt} 個。${P.type==="act"?`地點:${a.rooms.map(r=>DY.ROOM_N[r]).join("、")};可以開始:${esc(a.t)};約 ${a.min} 分鐘。`:""}</p>
    <div class="mrow"><button class="mbtn pri" id="go" ${ctl?"disabled":""}>產生</button>${ctl?`<button class="mbtn" id="stop">停止</button>`:""}</div>
    <p class="mstat${mErr?" err":""}">${esc(mStatus)}</p></div>` }
function makeHTML(){ const t=TYPES[P.type]; if(NEWK.has(P.type)) return make10HTML();
  const have=lib().filter(x=>sameCell(x,P)).length;
  return `<div class="msheet"><h3>手動產生一批</h3>
    <h4>種類</h4><div class="mchips">${chipsH(Object.keys(TYPES).filter(k=>TYPES[k].kind!=="later"),P.type,"ty",k=>TYPES[k].n)}</div>
    ${t.kind==="arc"?`<h4>主角</h4><div class="mchips">${chipsH(MB.map(m=>m.id),P.member,"mm",id=>mb(id).n)}</div><h4>她對代表的關係階段</h4><div class="mchips">${chipsH(STAGES,P.stage,"st")}</div><p class="mnote">數量是這段連續劇情要分成幾段(2~4)。</p>`
      :t.kind==="event"?`<h4>事件</h4><div class="mchips">${chipsH(Object.keys(EVENTS),P.ev,"ev",k=>EVENTS[k].n)}</div>`
      :t.kind==="situ"?`<h4>情境</h4><div class="mchips">${chipsH(Object.keys(SITU),P.req,"sq",k=>SITU[k].n)}</div><h4>主角</h4><div class="mchips">${chipsH(MB.map(m=>m.id),P.member,"mm",id=>mb(id).n)}</div>`
      :t.kind==="single"?`<h4>主角</h4><div class="mchips">${chipsH(MB.map(m=>m.id),P.member,"mm",id=>mb(id).n)}</div>
      <h4>她對代表的關係階段</h4><div class="mchips">${chipsH(STAGES,P.stage,"st")}</div>`:`<h4>組合</h4><div class="mchips">${chipsH(PAIRS,P.pair,"pp",pairName)}</div>`}
    ${t.kind==="event"?"":`<h4>時期</h4><div class="mchips">${chipsH(t.kind==="situ"?SITU[P.req].per:PERIODS,P.period,"pe")}</div>`}
    <div class="mrow"><label>數量<input type="number" id="tCount" min="1" max="8" value="${P.count}"></label><label class="grow">補充說明<input type="text" id="tHint" value="${esc(P.hint)}" placeholder="例如:月評前一晚、下雨天、她剛被老師罵"></label></div>
    <p class="mnote">這一格目前有 ${have} 個,目標 ${t.target} 個。</p>
    <div class="mrow"><button class="mbtn pri" id="go" ${ctl?"disabled":""}>產生</button>${ctl?`<button class="mbtn" id="stop">停止</button>`:""}</div>
    <p class="mstat${mErr?" err":""}">${esc(mStatus)}</p></div>`;
}
async function generate(params){
  if(!apiKey()){tab="key";renderAll();toast2("先設定 Gemini API 金鑰");return}
  const t=TYPES[params.type];
  if(NEWK.has(params.type)){ ctl=new AbortController(); mErr=false; mStatus=`生成中…${t.n}通常需要${params.type==="act"?"半分鐘左右":"十幾秒"}。`; renderAll();
    try{ const {news}=await fetch10({...params,count:Math.max(1,Math.min(8,+params.count||1))},ctl.signal); for(const sn of news) await saveItem({...sn,status:"review"},true);
      mStatus=`產生了 ${news.length} 個,請到「待審」看。` }
    catch(e){ if(e?.code==="cancelled") mStatus="已停止。"; else {mStatus=ERR[e?.code]||"生成失敗,請再試一次。"; mErr=true} }
    finally{ ctl=null; renderAll() } return }
  if(t.kind==="event") params={...params,member:"",pair:"all",stage:"",period:""}; else if(t.kind==="situ") params={...params,pair:"",stage:""};
  const existing=lib().filter(x=>sameCell(x,params)).slice(-25).map(x=>x.sc);
  ctl=new AbortController(); mErr=false; mStatus=`生成中…${t.n}通常需要${params.type==="long"?"半分鐘到一分鐘":"十幾秒"}。`; renderAll();
  try{ const r=await aiJSON(buildPrompt(params,existing),[],ctl.signal,SCHEMA(t.places,MB.map(m=>m.id))); const arr=parseSnippets(r,mainOf(params),params.stage); let n=0;
    const arcId=t.kind==="arc"?`arc-${params.member}-${Date.now().toString(36)}`:"", parts=arr.filter(x=>x?.nodes?.start).length; let part=0;
    for(const s0 of arr){ if(!s0?.nodes?.start) continue;
      await saveItem({code:`${params.type}-${t.kind==="event"?params.ev+"-all":t.kind==="situ"?params.req+"-"+params.member:t.kind==="pair"?params.pair:params.member}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`,
        type:params.type,k:t.n,member:t.kind==="single"||t.kind==="situ"||t.kind==="arc"?params.member:"",pair:t.kind==="pair"||t.kind==="event"?params.pair:"",stage:t.kind==="single"||t.kind==="arc"?params.stage:"",period:params.period,
        ev:t.kind==="event"?params.ev:"",req:t.kind==="situ"?params.req:"",
        at:t.places.includes(s0.at)?s0.at:t.places[0],sl:(Array.isArray(s0.sl)?s0.sl:[2]).filter(x=>x>=0&&x<=4),who:t.kind==="event"?MB.map(m=>m.id):Array.isArray(s0.who)?s0.who.filter(x=>mb(x)):[params.member],
        sc:String(s0.sc||""),w:+s0.w||3,cd:+s0.cd||4,nodes:s0.nodes,status:"review",createdAt:Date.now(),params:{...params},...(arcId?{arc:arcId,part:++part,parts}:{})},true); n++ }
    mStatus=n?`產生了 ${n} 個,請到「待審」看。`:"這次沒有產生可用的片段,請再試一次。";
  }catch(e){ if(e?.code==="cancelled") mStatus="已停止。"; else {mStatus=ERR[e?.code]||"生成失敗,請再試一次。"; mErr=true} }
  finally{ ctl=null; renderAll() }
}
/* 卡片與對話樹 */
function treeHTML(sn){ const N=sn.nodes||{}; const order=["start",...Object.keys(N).filter(k=>k!=="start")];
  const ln=(l,cls="")=>l[0]==="@"?(DIR_FX[String(l[1])]?`<div class="tln dir">〔演出:${esc(DIR_FX[String(l[1])])}〕</div>`:`<div class="tln dir">〔${esc({bg:"換場景",enter:"進場",exit:"離場",sfx:"音效"}[String(l[1]).split(":")[0]]||"指示")}:${esc(DIR_BG[String(l[1]).split(":")[1]]||mb(String(l[1]).split(":")[1])?.n||String(l[1]).split(":")[1])}〕</div>`):`<div class="tln ${cls}"><b style="color:${mb(l[0])?.c||"inherit"}">${esc(mb(l[0])?.n||l[0])}</b>${esc(l[1])}${l[2]?`<i class="ex">${{neutral:"平常",smile:"微笑",laugh:"大笑",sad:"難過",angry:"生氣",shy:"害羞"}[l[2]]||""}</i>`:""}</div>`;
  return order.filter(k=>N[k]).map(k=>{const n=N[k]; return `<div class="tnode"><div class="tk">${k==="start"?"開始":esc(k)}</div>${(n.L||[]).map(l=>ln(l)).join("")}
    ${(n.C||[]).map(c=>`<div class="topt"><span class="sty">${esc(c.s)}${c.to&&mb(c.to)?"→"+mb(c.to).n:""}・${c.g>0?"+":""}${c.g||0}${c.heart?"・心動+"+c.heart:""}${c.set?"・旗標 "+esc(c.set):""}${c.bw?`・${mb(c.to)?.n||""}×${mb(c.bw)?.n||""} 默契${c.bv>0?"+":""}${c.bv}`:""}</span>${esc(c.t)}
      ${c.next?`<span class="nx">→ ${esc(c.next)}</span>`:(c.r||[]).map(l=>ln(l,"r")).join("")||`<span class="nx">結束</span>`}</div>`).join("")}</div>`}).join("") }
function cardHTML(sn,mode){ const a=analyse(sn), who=sn.pair?pairName(sn.pair):mb(sn.member)?.n;
  return `<div class="mcardx" data-code="${esc(sn.code)}"><div class="mch"><div><b>${esc(TYPES[sn.type]?.n||sn.type)}${kindName10(sn)?"・"+esc(kindName10(sn)):""}${sn.band?"・"+sn.band+" 段":""}${sn.ver?"・第 "+sn.ver+" 版":""}${sn.by?(sn.by==="her"?"・她主動":"・你主動"):""}${sn.arc?`(第 ${sn.part}/${sn.parts} 段)`:""}${v3Label(sn)&&!kindName10(sn)?"・"+esc(v3Label(sn)):""}${sn.score!=null?`・評分 ${sn.score}`:""}・${esc(who||(sn.type==="event"?"全團":""))}${sn.stage?"・"+esc(sn.stage):""}${sn.period?"・"+esc(sn.period):""}</b>
    <small>${esc(DY.ROOM_N[sn.room]||PLACES[sn.at]||sn.at)}・${sn.hour?hourTxt(sn.hour):(sn.sl||[]).map(x=>SLOTS[x]).join("、")}${sn.state?"・"+(DY.STATES[sn.state]||sn.state):""}${sn.season?"・"+sn.season:""}${sn.wx?"・"+({clear:"晴",rain:"雨",snow:"雪"}[sn.wx]||sn.wx):""}・最長 ${a.depth} 個來回・${a.branch} 個分岔點</small></div>
    <span class="vs ${a.warn.length?"bad":"ok"}">${a.warn.length?"有 "+a.warn.length+" 個提醒":(sn.status==="auto"?"未審・格式通過":"格式通過")}</span></div>
    ${sn.sc?`<p class="mscene">${esc(sn.sc)}</p>`:""}${sn.memo?`<p class="mnote">紀錄:${esc(sn.memo)}</p>`:""}${sn.holdWhy?`<p class="mnote">停用原因:${esc(sn.holdWhy)}(修好再收入)</p>`:""}${a.warn.length?`<ul class="mwarn">${a.warn.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    <details ${mode==="review"?"open":""}><summary>展開對話樹</summary><div class="tree">${treeHTML(sn)}</div></details>
    <div class="mrow">${mode==="review"?`<button class="mbtn pri" data-ok>收入內容庫</button><button class="mbtn" data-regen>這格再生一個</button>`:(sn.status==="auto"?`<button class="mbtn pri" data-ok>標為審過</button>`:"")}
      <button class="mbtn" data-play>試玩</button><button class="mbtn" data-edit>編輯</button><button class="mbtn ghost" data-drop>${mode==="review"?"丟掉":"刪除"}</button></div></div>` }
function reviewHTML(){ const Q=reviewQ_(), pass=Q.filter(x=>!analyse(x).warn.length).length, bad=Q.length-pass;
  return `<div class="mrow" style="justify-content:space-between"><p class="mnote">每個片段都可以展開對話樹、試玩、編輯;確認後才會收進內容庫,遊戲才會抽到。${pass&&bad?`有提醒的 ${bad} 個不會一起收入(格式有問題,遊戲可能播不完),請個別編輯或丟掉。`:""}</p>${pass?`<button class="mbtn pri" id="okAll" ${BULK?"disabled":""}>一鍵通過:格式通過的 ${pass} 個全部收入</button>`:""}</div>
    ${Q.length?Q.slice(0,30).map(sn=>cardHTML(sn,"review")).join("")+(Q.length>30?`<p class="mnote">還有 ${Q.length-30} 個,先處理上面的。</p>`:""):`<p class="mempty">還沒有待審的片段。</p>`}` }
let LIBLIST=[];

/* ---------- AI 修訂(2026-10-25):用新的人物設定與寫作守則,請 Gemini 逐一改寫內容庫裡的舊片段 ----------
   結構不動(節點、選項數量與順序、回應方式、影響強度、next 都一樣),只改台詞、旁白與選項的措辭;改完標 rev=3 */
function toSchemaShape(sn){ return {at:sn.at,sl:sn.sl||[],who:sn.who||[],sc:sn.sc||"",w:+sn.w||3,cd:+sn.cd||4,
  nodes:Object.entries(sn.nodes||{}).map(([key,n])=>({key,lines:(n.L||[]).map(l=>({who:l[0]||"narr",text:l[1],expr:l[2]||"neutral"})),
    choices:(n.C||[]).map(c=>({text:c.t,style:c.s,to:c.to||sn.member||"ys",g:+c.g||0,...(c.next?{next:c.next}:{}),...(c.r?{reply:c.r.map(l=>({who:l[0]||"narr",text:l[1],expr:l[2]||"neutral"}))}:{})}))}))} }
function revisePrompt(list){
  const sn=list[0], id=sn.member||(sn.who||[])[0]||"ys", romance=ROMANCE.includes(sn.stage), who=[...new Set(list.flatMap(x=>[x.member||(x.who||[])[0]||"ys",...(x.who||[])]))].filter(x=>mb(x));
  return `你是一款韓國女團養成戀愛遊戲的資深編劇。下面有 ${list.length} 個遊戲裡的舊片段,寫得不夠細緻、不夠像本人。請依照人物設定與寫作守則,逐一改寫。
主角:${mb(id).n};關係階段:${sn.stage||""}——${STAGE_DESC[sn.stage]||""} ${STAGE_VOICE[sn.stage]||""};時期:${sn.period||"練習生期"}——${PERIOD_DESC[sn.period]||""}
${list.map((x,i)=>`第 ${i+1} 個的種類:${TYPES[x.type]?.n||x.type}`).join("\n")}
${who.map(x=>`【${mb(x).n}(id ${x})】${romance?VOICE[x].replace(/(原型[^)]*)/g,""):VOICE[x]}
說話樣本(只學語氣):${SAMPLE[x].join(" ")} ${sigOf(x,sn.stage)}
具體細節:${DETAIL[x]}`).join("\n\n")}
${ADDR}
${CRAFT}

【改寫規則】
- 回覆的 snippets 要剛好 ${list.length} 個,順序跟原本一樣,一個改寫一個;每個片段的 ref 照原樣保留;不要合併、省略或多寫。
- 結構完全不變:節點的 key 與順序、每個節點的選項數量與順序、每個選項的 style、to、g、next 都照原樣;只改 sc、台詞、旁白(who 用 narr)與選項的 text。
- 每個節點 1~5 句;太長的台詞拆短、說教或解說情緒的改成動作與細節;日和只夾一兩個簡單的日文詞(例如 大丈夫です、はい、すごい),不要整句日文或韓文。
- 選項 text 可以潤飾得更自然,但意思和態度不變;reply 是她對那個選項的反應,要符合她對那種回應方式的感受。
- 劇情內容、發生的事、地點與時段都保留,不要換成別的故事;不同片段之間不要寫成一樣的句子。${list.some(x=>x.tlFix)?`
- 【時間線】故事的時間線改了:2016 年 1 月 13 日代表上任,2017 年 1 月 13 日(冬天)出道,練習生期只有這一年。把舊時間線的說法改掉:2015 年的事、七月或夏天出道、練了兩年、出道還要一年半、中東呼吸症候群這類,改成符合新時間線的說法(例如「還有幾個月就出道」「冬天出道」),其他內容不要動。`:""}

【原本的片段】
${JSON.stringify({snippets:list.map((x,i)=>({ref:"r"+(i+1),...toSchemaShape(x)}))})}

只回覆改寫後的 JSON,格式同上。` }
function sameShape(a,b){ const ka=Object.keys(a.nodes), kb=Object.keys(b.nodes); if(ka.join()!==kb.join()) return false;
  return ka.every(k=>{ const ca=a.nodes[k].C||[], cb=b.nodes[k].C||[]; return ca.length===cb.length&&ca.every((c,i)=>c.s===cb[i].s&&(c.next||"")===(cb[i].next||"")) }) }
let revRunning=false, revState="", revGen=0;
const revTodo=()=>{ const L=lib().filter(x=>x.nodes?.start&&(x.tlFix||((+x.rev||0)<3&&!NEWK.has(x.type)))); return [...L.filter(x=>x.tlFix),...L.filter(x=>!x.tlFix)] };   // 時間線要改的先做
/* 一批:同一位主角、同一個關係階段與時期(人物設定只送一次),最多 A.revN 個、原文合計約 1.6 萬字;改失敗過的單獨送 */
function revBatch(todo){ const a=todo.find(x=>!(+x.revTry))||todo[0]; if(+a.revTry) return [a];
  const key=x=>[x.member||(x.who||[])[0]||"ys",x.stage||"",x.period||"",x.tlFix?1:0].join("|"), k=key(a), out=[]; let len=0;
  for(const x of todo){ if(+x.revTry||key(x)!==k) continue; const l=JSON.stringify(toSchemaShape(x)).length; if(out.length&&(out.length>=(+A.revN||8)||len+l>16000)) break; out.push(x); len+=l }
  return out }
async function failRev(sn,msg){ const t=(+sn.revTry||0)+1; const {tlFix,...b}=sn; await saveItem(t>=2?{...b,rev:3,revTry:t,revFail:msg,...(tlFix?{tlFail:1}:{})}:{...sn,revTry:t}) }   // 時間線修訂失敗兩次:留在內容庫,時間線檢查會再列出來   // 失敗兩次才跳過、保留原文
async function reviseBatch(list){
  const sn0=list[0], r=await aiJSON(revisePrompt(list),[],undefined,SCHEMA([...new Set(list.map(x=>x.at||"practice"))],MB.map(m=>m.id),true));
  const raw=Array.isArray(r)?r:(r?.snippets||[]), outs=raw.map(s=>{ try{ return toInternal(s,sn0.member||(sn0.who||[])[0]||"ys",sn0.stage) }catch(e){ return null } });
  let ok=0;
  for(let i=0;i<list.length;i++){ const sn=list[i];
    const free=o=>o&&!o._used&&o.nodes?.start, byRef=outs.find(o=>free(o)&&o.ref==="r"+(i+1));
    let out=byRef?(sameShape(sn,byRef)?byRef:null):(free(outs[i])&&!outs[i].ref&&sameShape(sn,outs[i])?outs[i]:null);   // 先用 ref 對回原片段;沒有 ref 才看順序
    if(!out){ await failRev(sn,"結構跟原本不同"); continue } out._used=true;
    for(const [k,n] of Object.entries(out.nodes)) n.C.forEach((c,j)=>{ const o=sn.nodes[k].C[j]; c.to=o.to; c.g=o.g; ["mood","stress","heart","set"].forEach(f=>{ if(o[f]!=null) c[f]=o[f]; else delete c[f] }) });
    const w=analyse({...sn,nodes:out.nodes}).warn.filter(x=>!/超過 60 字|重複/.test(x)); if(w.length){ await failRev(sn,w[0]); continue }
    const {revTry,revFail,tlFix,...base}=sn; await saveItem({...base,sc:out.sc||sn.sc,nodes:out.nodes,rev:3,revisedAt:Date.now(),...(tlFix?{tlDone:Date.now()}:{})}); ok++ }
  return ok }
async function reviseLoop(){
  const my=++revGen; try{wakeLock=await navigator.wakeLock?.request?.("screen")}catch(e){window.logErr?.("scripts",e)}
  while(revRunning&&my===revGen){
    const u=usage(), m=pickModel(u);
    if(!m||u.n>=A.day){ const at=new Date(Date.now()+msToReset()).toLocaleTimeString("zh-TW",{timeZone:"Asia/Taipei",hour:"2-digit",minute:"2-digit"});
      revState=`${m?`今天的上限 ${A.day} 次`:"今天每個模型的免費額度"}都用完了,台灣時間 ${at} 重置後自動繼續(這個畫面要開著)。今天修好 ${u.rev||0} 個。`; renderAll(); await sleep(msToReset()); continue }
    const todo=revTodo(); if(!todo.length){ revState="全部修訂完成!"; revRunning=false; break }
    const batch=revBatch(todo), gap=60000/Math.max(1,A.rpm); lastCalls=lastCalls.filter(t=>Date.now()-t<60000);
    if(lastCalls.length>=A.rpm){ revState="控制速度中…"; await sleep(60000-(Date.now()-lastCalls[0])+500); continue }
    revState=`修訂中(${model()}${modelOverride?",備用":""}):${mb(batch[0].member)?.n||""}・一次 ${batch.length} 個(還剩 ${todo.length} 個,今天修好 ${u.rev||0} 個)`; renderAll();
    lastCalls.push(Date.now()); u.n++; setUsage(u);
    try{ const ok=await reviseBatch(batch); const u2=usage(); u2.rev=(u2.rev||0)+ok; setUsage(u2) }
    catch(e){ const u3=usage();
      if(e?.code==="rate_minute"){ u3.n=Math.max(0,u3.n-1); setUsage(u3); revState="每分鐘次數到上限,稍等一下…"; renderAll(); await sleep(Math.max(15,(e.wait||60)+5)*1000); continue }
      if(e?.code==="rate_day"||(e?.code==="bad_model"&&modelOverride)){ u3.n=Math.max(0,u3.n-1); (u3.outM=u3.outM||{})[model()]=true; setUsage(u3); continue }   // 這個模型今天用完(或名稱不對),換下一個
      if(["no_key","bad_key","bad_model","region"].includes(e?.code)){ revState=ERR[e.code]; revRunning=false; break }
      if(e?.code==="network"||e?.code==="server"){ revState=(ERR[e.code]||"")+" 30 秒後重試。"; renderAll(); await sleep(30000); continue }
      for(const sn of batch) await failRev(sn,String(e?.message||e?.code||"")) }   // 整批壞掉(格式不完整、被擋):各記一次,下次單獨送
    await sleep(gap) }
  if(my===revGen){ modelOverride=""; try{await wakeLock?.release?.()}catch(e){window.logErr?.("scripts",e)} wakeLock=null }
  renderAll() }

function libIO(){ return `<div class="mrow"><button class="mbtn" id="mkExport">匯出全部片段(JSON)</button><button class="mbtn" id="mkImport">匯入修訂後的片段</button><input type="file" id="mkImportF" accept=".json,application/json" hidden><span class="mnote">匯出請用電腦版;修訂好的檔案匯入後會覆蓋同代號的片段並同步到雲端。</span></div>
  <div class="mrow"><button class="mbtn ${revRunning?"danger":""}" id="mkRevise">${revRunning?"停止 AI 修訂":"用新守則請 Gemini 逐一修訂"}</button><span class="mnote">還沒修訂的 ${revTodo().length} 個;${revState?esc(revState):"一次送同一位成員的好幾個片段(最多 8 個),額度用完自動換模型;速度與備用模型沿用自動生產的設定。結構不動,只改台詞與措辭。"}</span></div>` }
/* 全庫檢查(參考 dialogue-systems 技能「走過每一條分支」):格式檢查之外,再找走不到的節點、繞不出去的節點、缺段的連續劇情 */
function walkIssues(sn){ const N=sn.nodes||{}, keys=Object.keys(N), out=[]; if(!N.start) return ["沒有 start 節點"];
  const seen=new Set(), q=["start"]; while(q.length){ const k=q.shift(); if(seen.has(k)||!N[k]) continue; seen.add(k); for(const c of N[k].C||[]) if(c.next) q.push(c.next) }
  const un=keys.filter(k=>!seen.has(k)); if(un.length) out.push(`走不到的節點:${un.join("、")}`);
  const ok=new Set(keys.filter(k=>!(N[k].C||[]).length||(N[k].C||[]).some(c=>!c.next||!N[c.next]))); let ch=true;
  while(ch){ ch=false; for(const k of keys) if(!ok.has(k)&&(N[k].C||[]).some(c=>ok.has(c.next))){ ok.add(k); ch=true } }
  const loop=[...seen].filter(k=>!ok.has(k)); if(loop.length) out.push(`繞不出去的節點(永遠走不到結尾):${loop.join("、")}`);
  return out }
let CHK=null, TLC=null;
/* 時間線檢查(2026-10-29 改版):故事改成 2016/01/13 上任、2017/01/13 出道;列出寫到舊時間線的片段,可以送 AI 修訂或先停用(移回待審) */
const TL_RE=[[/2015/,"2015 年"],[/七月出道|7 ?月 ?(13 ?[日號] ?)?出道|夏天出道|明年夏天|七月十三/,"七月/夏天出道"],[/兩年(多)?的?練習|練(了)?兩年|當了?兩年(的)?練習生|兩年的?練習生/,"練習兩年"],[/一年半/,"一年半"],[/中東呼吸|MERS/,"中東呼吸症候群"],[/2017 ?年 ?7 ?月|2017\.07|2017\/7/,"2017 年 7 月"]];
function tlCheck(){ const rows=[]; for(const sn of [...lib(),...reviewQ_()]){ if(NEWK.has(sn.type)) continue; const s=String(sn.sc||"")+textOf(sn);
    const hit=TL_RE.filter(([re])=>re.test(s)).map(([,n])=>n); if(hit.length) rows.push([sn,hit]) } return {rows,at:Date.now()} }
function tlHTML(){ if(!TLC) return ""; const {rows}=TLC, inLib=rows.filter(([sn])=>sn.status==="ok"||sn.status==="auto");
  return `<div class="mcard chk"><div class="mrow" style="justify-content:space-between"><b>時間線檢查:${rows.length} 個片段寫到舊時間線</b><button class="mbtn" id="tlX">收起</button></div>
    ${rows.length?`<p class="mnote">故事改成 2016/01/13 上任、2017/01/13 出道。「送 AI 修訂」會排進下面的 AI 修訂(優先處理,只改時間線的說法);「停用」會先移回待審,遊戲不會抽到。</p>
    <div class="mrow"><button class="mbtn pri" id="tlFixAll" ${inLib.length?"":"disabled"}>全部送 AI 修訂(${inLib.length})</button><button class="mbtn" id="tlHoldAll" ${inLib.length?"":"disabled"}>全部停用</button></div>
    <ul class="chkl">${rows.slice(0,60).map(([sn,hit])=>`<li><button class="mbtn" data-tlfix="${esc(sn.code)}">送修</button><button class="mbtn ghost" data-tlhold="${esc(sn.code)}">停用</button><b>${esc(TYPES[sn.type]?.n||sn.type)}・${esc(mb(sn.member)?.n||pairName(sn.pair||"all"))}${sn.status==="review"?"(待審)":""}${sn.tlFix?"(排隊修訂中)":""}</b> ${esc(String(sn.sc||"").slice(0,24))}<br><small>${hit.map(esc).join("、")}</small></li>`).join("")}</ul>
    ${rows.length>60?`<p class="mnote">只列出前 60 個。</p>`:""}`:`<p class="mnote">沒有寫到舊時間線的片段。</p>`}</div>` }
async function tlMark(list,how){ if(BULK||!list.length) return; BULK=true; const now=Date.now(), idx=new Map(items.map((x,i)=>[x.code,i])), done=[];
  for(const sn of list){ const i=idx.get(sn.code); if(i==null) continue; const body=how==="fix"?{...items[i],tlFix:1,revTry:0,updatedAt:now}:{...items[i],status:"review",holdWhy:"舊時間線",updatedAt:now};
    items[i]=body; toGame(body); done.push(body) }
  await persist(); await IDB.set("scripts",SCRIPTS); BULK=false; TLC=tlCheck(); renderAll();
  toast2(how==="fix"?`${done.length} 個排進 AI 修訂,到內容庫按「用新守則請 Gemini 逐一修訂」開始`:`已停用 ${done.length} 個(移回待審)`);
  for(const b of done){ try{ await spPut(b) }catch(e){} } }
function libCheck(){ const L=lib(), rows=[], arcs={};
  for(const sn of L){ const w=[...analyse(sn).warn.filter(x=>!/超過 60 字/.test(x)),...walkIssues(sn)]; if(sn.arc) (arcs[sn.arc]=arcs[sn.arc]||[]).push(sn); if(w.length) rows.push([sn,w]) }
  for(const ps of Object.values(arcs)){ const n=Math.max(...ps.map(x=>+x.parts||0)), have=new Set(ps.map(x=>+x.part)); for(let i=1;i<=n;i++) if(!have.has(i)){ rows.push([ps[0],[`連續劇情缺第 ${i} 段(被刪掉或還在待審)`]]); break } }
  const by={}; for(const [,w] of rows) for(const x of w){ const k=x.replace(/[「〈(:].*$/,"").replace(/節點 \S+ /,"節點 ").replace(/\d+/g,"N").trim().slice(0,18); by[k]=(by[k]||0)+1 }
  return {rows,by,total:L.length,at:Date.now()} }
function chkHTML(){ if(!CHK) return ""; const {rows,by,total}=CHK;
  return `<div class="mcard chk"><div class="mrow" style="justify-content:space-between"><b>全庫檢查:${total} 個片段,${rows.length} 個有問題</b><button class="mbtn" id="chkX">收起</button></div>
    ${rows.length?`<p class="mnote">${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${esc(k)} ${v}`).join("・")}</p>
    <ul class="chkl">${rows.slice(0,60).map(([sn,w])=>`<li><button class="mbtn" data-chk="${esc(sn.code)}">看這段</button><b>${esc(TYPES[sn.type]?.n||sn.type)}・${esc(mb(sn.member)?.n||pairName(sn.pair||"all"))}</b> ${esc(String(sn.sc||"").slice(0,24))}<br><small>${w.map(esc).join(";")}</small></li>`).join("")}</ul>
    ${rows.length>60?`<p class="mnote">只列出前 60 個。</p>`:""}`:`<p class="mnote">全部沒問題。</p>`}</div>` }
function libHTML(){ const list=LIBLIST=lib().filter(x=>(!fM||x.member===fM||(x.pair||"").includes(fM))&&(!fT||x.type===fT)&&(!fS||(fS==="__auto"?x.status==="auto":x.stage===fS))&&(!fQ||JSON.stringify(x.nodes).includes(fQ)||String(x.sc).includes(fQ))).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  return libIO()+`<div class="mrow"><button class="mbtn" id="mkCheck">全庫檢查</button><span class="mnote">AI 修訂或大量產生之後,掃一遍整個內容庫的格式與分支。</span></div>${chkHTML()}<div class="mrow"><button class="mbtn" id="mkTl">時間線檢查</button><span class="mnote">找出寫到舊時間線(2015 年開始、2017 年 7 月出道)的片段。</span></div>${tlHTML()}<div class="mrow"><select id="fM"><option value="">全部成員</option>${MB.map(m=>`<option value="${m.id}" ${fM===m.id?"selected":""}>${m.n}</option>`).join("")}</select>
    <select id="fT"><option value="">全部種類</option>${Object.entries(TYPES).map(([k,t])=>`<option value="${k}" ${fT===k?"selected":""}>${t.n}</option>`).join("")}</select>
    <select id="fS"><option value="">全部階段</option>${STAGES.map(s=>`<option ${fS===s?"selected":""}>${s}</option>`).join("")}<option value="__auto" ${fS==="__auto"?"selected":""}>只看未審</option></select>
    <input type="text" id="fQ" value="${esc(fQ)}" placeholder="搜尋台詞" class="grow"></div>
    <div class="mrow" style="justify-content:space-between"><p class="mnote">內容庫共 ${lib().length} 個,符合條件 ${list.length} 個${list.length>40?",只顯示最新 40 個":""}。</p>${(()=>{const u=list.filter(x=>x.status==="auto").length; return u?`<button class="mbtn pri" id="okAuto" ${BULK?"disabled":""}>一鍵通過:${fM||fT||fS&&fS!=="__auto"||fQ?"符合條件的":""}未審 ${u} 個全部標為審過</button>`:""})()}</div>
    ${list.slice(0,40).map(sn=>cardHTML(sn,"lib")).join("")||`<p class="mempty">還沒有內容。</p>`}` }
function heat(n,t){const r=Math.min(1,n/t);return `--h:${Math.round(r*100)}%`}
let CP="";   // 覆蓋率看哪個時期("" = 全部)
const tgtOf=(k,st,pal)=>{ if(!CP) return pal?TYPES[k].target*(pal==="all"?5:1):TYPES[k].target; const pi=PERIODS.indexOf(CP); return Math.round(TYPES[k].target*(pal?(pal==="all"?5:1)*PW.pair[pi]:PW[st][pi])) };
/* 覆蓋率:改版 1.0 的新種類(活動、隨口、深夜、里程碑) */
function cover10(L){ let h="", tot=0, done=0; const add=(n,tg)=>{ tot+=tg; done+=Math.min(n,tg) };
  const by={}; for(const x of L){ const k=x.type==="act"?`a|${x.act}|${x.member}|${x.band||""}`:x.type==="casual"?`c|${x.member}|${x.ca}|${x.band}`:x.type==="night"?`n|${x.member}|${x.nk}|${x.band}`:x.type==="event"?`e|${x.ev}`:""; if(k) by[k]=(by[k]||0)+1 }
  const cell=(n,tg,attr)=>`<td><button class="cell" style="${heat(n,tg)}" ${attr}>${n}/${tg}</button></td>`, na=`<td class="na">—</td>`;
  h+=`<h3>日常活動(活動 × 成員 × 關係段落;★ 1.0 第一批,灰色要等 1.1 的背景)</h3><p class="mnote">專屬活動每格 4 版、由長對話劇本對話寫;通用活動每格 2 版、Gemini 自動產生;全員版另外算。</p><div class="mtbl"><table class="t10"><thead><tr><th rowspan="2">活動</th>${MB.map(m=>`<th colspan="3" style="color:${m.c}">${m.n}</th>`).join("")}<th rowspan="2">全員</th></tr><tr>${MB.map(()=>"<th>A</th><th>B</th><th>C</th>").join("")}</tr></thead><tbody>`;
  for(const [ak,a] of Object.entries(DY.ACTS)){ h+=`<tr class="${a.later?"later":""}"><td class="nm">${a.first?"★ ":""}${esc(a.n)}${a.who?`<small>${mb(a.who).n}專屬</small>`:""}</td>`;
    for(const m of MB) for(const b of ["A","B","C"]){ if((a.who&&a.who!==m.id)||!DY.actBands(ak).includes(b)){ h+=na; continue } const n=by[`a|${ak}|${m.id}|${b}`]||0, tg=a.who?4:TYPES.act.target; add(n,tg); h+=cell(n,tg,`data-acell="${ak}|${m.id}|${b}"`) }
    if(a.who||!a.allv) h+=na; else { const n=by[`a|${ak}|all|`]||0; add(n,a.allv); h+=cell(n,a.allv,`data-acell="${ak}|all|"`) }
    h+="</tr>" }
  h+=`</tbody></table></div><h3>隨口互動(成員 × 動作 × 關係段落;公司、宿舍、外面合計)</h3><div class="mtbl"><table><thead><tr><th>成員</th><th>動作</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>`;
  for(const m of MB) for(const ca of DY.CA_NOW){ h+=`<tr><td style="color:${m.c}">${m.n}</td><td>${DY.CA[ca].n}</td>`+["A","B","C"].map(b=>{ if(bandTop(b)<DY.rank(DY.CA[ca].gate)) return na;
      const n=by[`c|${m.id}|${ca}|${b}`]||0, tg=TYPES.casual.target*3; add(n,tg); return cell(n,tg,`data-ccell="${m.id}|${ca}|${b}"`) }).join("")+"</tr>" }
  h+=`</tbody></table></div><h3>深夜(成員 × 種類 × 關係段落)</h3><div class="mtbl"><table><thead><tr><th>成員</th><th>種類</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>`;
  for(const m of MB) for(const nk of Object.keys(DY.NK)){ h+=`<tr><td style="color:${m.c}">${m.n}</td><td>${DY.NK[nk].n}</td>`+["A","B","C"].map(b=>{ const n=by[`n|${m.id}|${nk}|${b}`]||0, tg=TYPES.night.target; add(n,tg); return cell(n,tg,`data-ncell="${m.id}|${nk}|${b}"`) }).join("")+"</tr>" }
  h+=`</tbody></table></div><h3>里程碑事件(長對話劇本對話寫)</h3><div class="mtbl"><table><thead><tr><th>事件</th><th>時間</th><th>版本</th></tr></thead><tbody>`
    +Object.entries(DY.MILESTONES).map(([k,x])=>{ const n=by[`e|${k}`]||0; add(n,1); return `<tr><td>${esc(x.n)}</td><td>${x.date}</td><td><span class="cell" style="${heat(n,1)}">${n}/1</span></td></tr>` }).join("")+`</tbody></table></div>`;
  return {h,tot,done} }
function coverHTML(){ const L=lib().filter(x=>!CP||x.period===CP), cnt={}; for(const x of L){const k=cellKey(x); cnt[k]=(cnt[k]||0)+1} let total=0,done=0;
  let h=`<div class="mchips">${["",...PERIODS].map(p=>`<button class="mchip${CP===p?" on":""}" data-cp="${p}">${p||"全部時期"}</button>`).join("")}</div><h3>單人片段(成員 × 關係階段 × 種類${CP?"・"+CP:""})</h3><div class="mtbl"><table><thead><tr><th>成員</th><th>階段</th>${SINGLE_TYPES.map(k=>`<th>${TYPES[k].n}</th>`).join("")}</tr></thead><tbody>`;
  for(const m of MB) for(const s of STAGES){ h+=`<tr><td style="color:${m.c}">${m.n}</td><td>${s}</td>`+SINGLE_TYPES.map(k=>{const n=cnt[k+"|"+m.id+"|"+s]||0,t=tgtOf(k,s); total+=t; done+=Math.min(n,t);
      return `<td><button class="cell" style="${heat(n,t)}" data-cell="${k}|${m.id}|${s}">${n}/${t}</button></td>`}).join("")+`</tr>` }
  h+=`</tbody></table></div><h3>雙人與全團</h3><div class="mtbl"><table><thead><tr><th>組合</th>${PAIR_TYPES.map(k=>`<th>${TYPES[k].n}</th>`).join("")}</tr></thead><tbody>`;
  for(const p of PAIRS){ h+=`<tr><td>${pairName(p)}</td>`+PAIR_TYPES.map(k=>{const n=cnt[k+"|"+p+"|"]||0,t=tgtOf(k,"",p); total+=t; done+=Math.min(n,t);
      return `<td><button class="cell" style="${heat(n,t)}" data-pcell="${k}|${p}">${n}/${t}</button></td>`}).join("")+`</tr>` }
  h+=`</tbody></table></div><h3>事件劇本(各事件的版本數)</h3><div class="mtbl"><table><thead><tr><th>事件</th><th>版本</th></tr></thead><tbody>`
    +Object.keys(EVENTS).map(k=>{ const n=L.filter(x=>x.type==="event"&&x.ev===k).length,t=TYPES.event.target; total+=t; done+=Math.min(n,t);
      return `<tr><td>${EVENTS[k].n}</td><td><button class="cell" style="${heat(n,t)}" data-ecell="${k}">${n}/${t}</button></td></tr>` }).join("")
    +`</tbody></table></div><h3>連續劇情(成員 × 關係階段,以第 1 段計)</h3><div class="mtbl"><table><thead><tr><th>階段</th>${MB.map(m=>`<th style="color:${m.c}">${m.n}</th>`).join("")}</tr></thead><tbody>`
    +STAGES.map(st=>`<tr><td>${st}</td>`+MB.map(m=>{ const n=L.filter(x=>x.type==="arc"&&x.member===m.id&&x.stage===st&&+x.part===1).length; return `<td>${n}</td>` }).join("")+`</tr>`).join("")
    +`</tbody></table></div><h3>近況(情境 × 成員,各時期合計)</h3><div class="mtbl"><table><thead><tr><th>情境</th>${MB.map(m=>`<th style="color:${m.c}">${m.n}</th>`).join("")}</tr></thead><tbody>`
    +Object.keys(SITU).map(k=>`<tr><td>${SITU[k].n}</td>`+MB.map(m=>{ const n=L.filter(x=>x.type==="situ"&&x.req===k&&x.member===m.id).length,t=TYPES.situ.target*SITU[k].per.length; total+=t; done+=Math.min(n,t);
      return `<td><button class="cell" style="${heat(n,t)}" data-scell="${k}|${m.id}">${n}/${t}</button></td>` }).join("")+`</tr>`).join("");
  const c10=cover10(lib()); total+=c10.tot; done+=c10.done;
  return `<div class="mgap"><p class="mnote">整體進度 ${done}/${total}(${Math.round(done/total*100)}%)。改版 1.0 的新種類在最上面;點任一格可以直接到「手動產生」那一格。</p><button class="mbtn pri" onclick="window.mkGapCopy?.()">複製缺口摘要</button></div>`+c10.h+`<h3 class="msep">原本的片段</h3>`+h+`</tbody></table></div>` }
/* 缺口摘要(2026-10-28):給長對話劇本對話看「最缺哪些格」,不用每次匯出整份內容庫 JSON */
window.mkGapCopy=async()=>{ const L=lib(), cnt={}; for(const x of L){const k=cellKey(x); cnt[k]=(cnt[k]||0)+1}
  const cells=[]; let total=0,done=0; const add=(label,n,t)=>{ total+=t; done+=Math.min(n,t); if(n<t) cells.push({label,n,t,gap:t-n,r:(t-n)/t}) };
  for(const m of MB) for(const st of STAGES) for(const k of SINGLE_TYPES) add(`單人・${TYPES[k].n}・${m.n}・${st}`,cnt[k+"|"+m.id+"|"+st]||0,tgtOf(k,st));
  for(const p of PAIRS) for(const k of PAIR_TYPES) add(p==="all"?`全團・${TYPES[k].n}`:`雙人・${TYPES[k].n}・${pairName(p)}`,cnt[k+"|"+p+"|"]||0,tgtOf(k,"",p));
  for(const k of Object.keys(EVENTS)) add(`事件・${EVENTS[k].n}`,L.filter(x=>x.type==="event"&&x.ev===k).length,TYPES.event.target);
  for(const k of Object.keys(SITU)) for(const m of MB) add(`近況・${SITU[k].n}・${m.n}`,L.filter(x=>x.type==="situ"&&x.req===k&&x.member===m.id).length,TYPES.situ.target*SITU[k].per.length);
  cells.sort((a,b)=>b.r-a.r||b.gap-a.gap);
  // 改版 1.0:專屬活動與里程碑(長對話負責)、新種類的進度(Gemini)
  const ex=[]; for(const [ak,a] of Object.entries(DY.ACTS)){ if(!a.who) continue; for(const b of DY.actBands(ak)){ const n=L.filter(x=>x.type==="act"&&x.act===ak&&x.band===b).length; if(n<4) ex.push({label:`${a.first?"★ ":""}${a.n}・${mb(a.who).n}・${b} 段`,n,o:(b==="C"?4:0)+(a.first?0:2)+(a.later?1:0)}) } }
  ex.sort((a,b)=>a.o-b.o);
  const ms=Object.entries(DY.MILESTONES).map(([k,x])=>`${x.n} ${L.filter(y=>y.type==="event"&&y.ev===k).length}/1`).join("、");
  const g10=k=>L.filter(x=>x.type===k).length;
  const arcs=MB.map(m=>`${m.n}:`+STAGES.map(st=>`${st} ${L.filter(x=>x.type==="arc"&&x.member===m.id&&x.stage===st&&+x.part===1).length}`).join("、")).join("\n");
  const d=new Date(), txt=`完美女團 內容庫缺口摘要(${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()})\n內容庫 ${L.length} 個片段;整體進度 ${done}/${total}(${Math.round(done/total*100)}%)\n\n最缺的 30 格(現有/目標):\n`
    +cells.slice(0,30).map(c=>`- ${c.label}:${c.n}/${c.t}`).join("\n")+`\n\n連續劇情(各成員 × 關係階段的第 1 段數量):\n${arcs}\n`
    +`\n【改版 1.0】專屬活動還缺的格子(每格 4 版;★ 是 1.0 第一批):\n${ex.length?ex.map(c=>`- ${c.label}:${c.n}/4`).join("\n"):"全部完成"}\n里程碑事件:${ms}\n新種類目前數量(Gemini 產):隨口互動 ${g10("casual")}、深夜 ${g10("night")}、日常活動 ${L.filter(x=>x.type==="act"&&!DY.ACTS[x.act]?.who).length}(通用)\n`;
  const ok=await (window.copyText?copyText(txt):navigator.clipboard?.writeText(txt).then(()=>true,()=>false));
  toast2(ok?"已複製缺口摘要,可以直接貼給長對話劇本對話":"複製失敗") };
function keyHTML(){ const m=model(), known=["gemini-flash-latest","gemini-flash-lite-latest"].includes(m);
  return `<div class="msheet"><h3>Gemini API 金鑰</h3><p class="mnote">金鑰只存在這台裝置,不會上傳。</p>
    <div class="mrow"><input type="password" id="keyIn" class="grow" value="${esc(apiKey())}" placeholder="貼上金鑰" autocomplete="off"><button class="mbtn" id="keyShow">顯示</button></div>
    <div class="mrow"><label>使用的模型<select id="modelIn"><option value="gemini-flash-latest" ${m==="gemini-flash-latest"?"selected":""}>最新 Flash(推薦)</option><option value="gemini-flash-lite-latest" ${m==="gemini-flash-lite-latest"?"selected":""}>最新 Flash-Lite(較快,每日次數較多)</option><option value="custom" ${known?"":"selected"}>自行輸入…</option></select></label>
      <input type="text" id="modelCustom" class="grow${known?" hidden":""}" value="${known?"":esc(m)}" placeholder="例如 gemini-3.6-flash"></div>
    <div class="mrow"><button class="mbtn pri" id="keySave">儲存</button><button class="mbtn" id="keyTest">測試連線</button><button class="mbtn ghost" id="keyDel">清除金鑰</button></div>
    <p class="mstat" id="keyStatus"></p>
    <details><summary>怎麼取得金鑰?</summary><ol class="mnote"><li>用 Google 帳號登入 aistudio.google.com</li><li>左側點「Get API key」</li><li>按「Create API key」,複製那串文字</li><li>貼到上面,按儲存,再按測試連線</li></ol></details></div>` }
function bind(B){
  const q=s=>B.querySelector(s);
  if(q("#mkExport")){ q("#mkExport").onclick=()=>{ const d=new Date(), name=`完美女團_劇本內容庫_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
      const blob=new Blob([JSON.stringify({app:"kpop-scripts",version:2,exportedAt:Date.now(),items},null,1)],{type:"application/json"}), u=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); toast2(`已匯出 ${items.length} 個片段`) };
    q("#mkImport").onclick=()=>q("#mkImportF").click();
    q("#mkRevise").onclick=()=>{ if(!apiKey()){ toast2("先設定 Gemini API 金鑰"); return } revRunning=!revRunning; if(revRunning){ revState=""; reviseLoop() } else revGen++; renderAll() };
    q("#mkImportF").onchange=async e=>{ const f=e.target.files?.[0]; if(!f) return; let o; try{ o=JSON.parse(await f.text()) }catch(_){ toast2("檔案不是正確的 JSON"); return }
      const list=(Array.isArray(o)?o:o.items||[]).filter(x=>x?.code&&x?.nodes?.start); if(!list.length){ toast2("檔案裡沒有可用的片段"); return }
      if(!confirm(`匯入 ${list.length} 個片段?同代號的會被覆蓋。`)) return; let n=0;
      for(const it of list){ const old=items.find(x=>x.code===it.code); await saveItem({...(old||{}),...it,status:it.status||old?.status||"ok"}); n++ }
      toast2(`已匯入 ${n} 個片段`) } }
  if(q("#mkAuto")){ q("#mkAuto").onclick=()=>{ running=!running; if(running){aState="";autoLoop()} renderAll() };
    q("#aRpm").onchange=e=>{A.rpm=Math.max(1,Math.min(60,+e.target.value||1));saveA()}; q("#aDay").onchange=e=>{A.day=Math.max(1,+e.target.value||1);saveA()};
    q("#aAuto").onchange=e=>{A.autoAccept=e.target.checked;saveA()}; q("#aFb").onchange=e=>{A.fallback=e.target.checked;saveA()}; q("#aExtra").onchange=e=>{A.extra=e.target.value.trim();saveA()}; q("#aScore").onchange=e=>{A.score=e.target.checked;saveA()} }
  B.querySelectorAll("[data-ty]").forEach(b=>b.onclick=()=>{P.type=b.dataset.ty;P.count=P.type==="arc"?3:TYPES[P.type].batch;renderAll()});
  B.querySelectorAll("[data-band]").forEach(b=>b.onclick=()=>{P.band=b.dataset.band;renderAll()});
  B.querySelectorAll("[data-ca]").forEach(b=>b.onclick=()=>{P.ca=b.dataset.ca;renderAll()});
  B.querySelectorAll("[data-grp]").forEach(b=>b.onclick=()=>{P.grp=b.dataset.grp;renderAll()});
  B.querySelectorAll("[data-nk]").forEach(b=>b.onclick=()=>{P.nk=b.dataset.nk;renderAll()});
  B.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{P.act=b.dataset.act; const a=DY.ACTS[P.act]; if(a.who) P.member=a.who; else if(P.member==="all"&&!a.allv) P.member="ys"; renderAll()});
  B.querySelectorAll("[data-mm]").forEach(b=>b.onclick=()=>{P.member=b.dataset.mm;renderAll()});
  B.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>{P.pair=b.dataset.pp;renderAll()});
  B.querySelectorAll("[data-ev]").forEach(b=>b.onclick=()=>{P.ev=b.dataset.ev;renderAll()});
  B.querySelectorAll("[data-sq]").forEach(b=>b.onclick=()=>{P.req=b.dataset.sq; if(!SITU[P.req].per.includes(P.period)) P.period=SITU[P.req].per[0]; renderAll()});
  B.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{P.stage=b.dataset.st;renderAll()});
  B.querySelectorAll("[data-pe]").forEach(b=>b.onclick=()=>{P.period=b.dataset.pe;renderAll()});
  if(q("#tCount")){ q("#tCount").onchange=e=>P.count=Math.max(1,Math.min(8,+e.target.value||1)); q("#tHint").oninput=e=>P.hint=e.target.value }
  if(q("#go")) q("#go").onclick=()=>generate({...P}); if(q("#stop")) q("#stop").onclick=()=>ctl?.abort();
  if(q("#okAll")) q("#okAll").onclick=()=>okMany(reviewQ_().filter(x=>!analyse(x).warn.length),"已收入內容庫");
  if(q("#okAuto")) q("#okAuto").onclick=()=>{ const u=LIBLIST.filter(x=>x.status==="auto"); if(u.length>20&&!confirm(`把 ${u.length} 個未審片段全部標為審過?`)) return; okMany(u,"已標為審過") };
  B.querySelectorAll(".mcardx").forEach(card=>{ const code=card.dataset.code, get=()=>items.find(x=>x.code===code);
    const ok=card.querySelector("[data-ok]"); if(ok) ok.onclick=async()=>{const sn=get(),was=sn.status; await saveItem({...sn,status:"ok"}); toast2(was==="auto"?"已標為審過":"已收入內容庫,遊戲同步後就會抽到")};
    const rg=card.querySelector("[data-regen]"); if(rg) rg.onclick=()=>{tab="make";generate({...get().params,count:1})};
    card.querySelector("[data-play]").onclick=()=>{ $("#makerFac").classList.add("hide"); testPlay(get(),()=>$("#makerFac").classList.remove("hide")) };
    card.querySelector("[data-edit]").onclick=()=>edit(get());
    card.querySelector("[data-drop]").onclick=async()=>{ if(!confirm("確定刪除這個片段?")) return; await removeItem(code); toast2("已刪除") } });
  ["fM","fT","fS"].forEach(id=>{const e=q("#"+id); if(e) e.onchange=()=>{({fM,fT,fS}={fM:q("#fM").value,fT:q("#fT").value,fS:q("#fS").value}); renderAll()}});
  if(q("#fQ")){ q("#fQ").onchange=e=>{fQ=e.target.value.trim();renderAll()} }
  if(q("#mkCheck")) q("#mkCheck").onclick=()=>{ CHK=libCheck(); renderAll() };
  if(q("#chkX")) q("#chkX").onclick=()=>{ CHK=null; renderAll() };
  if(q("#mkTl")) q("#mkTl").onclick=()=>{ TLC=tlCheck(); renderAll() };
  if(q("#tlX")) q("#tlX").onclick=()=>{ TLC=null; renderAll() };
  const tlLib=()=>(TLC?.rows||[]).map(([sn])=>sn).filter(sn=>sn.status==="ok"||sn.status==="auto");
  if(q("#tlFixAll")) q("#tlFixAll").onclick=()=>tlMark(tlLib(),"fix");
  if(q("#tlHoldAll")) q("#tlHoldAll").onclick=()=>{ if(confirm(`停用 ${tlLib().length} 個片段(移回待審)?`)) tlMark(tlLib(),"hold") };
  B.querySelectorAll("[data-tlfix]").forEach(b=>b.onclick=()=>{ const sn=items.find(x=>x.code===b.dataset.tlfix); if(!sn) return; if(sn.status==="review"){ toast2("待審的片段請直接編輯或丟掉"); return } tlMark([sn],"fix") });
  B.querySelectorAll("[data-tlhold]").forEach(b=>b.onclick=()=>{ const sn=items.find(x=>x.code===b.dataset.tlhold); if(sn) tlMark([sn],"hold") });
  B.querySelectorAll("[data-chk]").forEach(b=>b.onclick=()=>{ const sn=lib().find(x=>x.code===b.dataset.chk); if(!sn) return; fM="";fT="";fS=""; fQ=String(sn.sc||"").slice(0,14); renderAll() });
  B.querySelectorAll("[data-cell]").forEach(b=>b.onclick=()=>{const [k,m,s]=b.dataset.cell.split("|");P={...P,type:k,member:m,stage:s,count:TYPES[k].batch};tab="make";renderAll()});
  B.querySelectorAll("[data-pcell]").forEach(b=>b.onclick=()=>{const [k,p]=b.dataset.pcell.split("|");P={...P,type:k,pair:p,count:TYPES[k].batch};tab="make";renderAll()});
  B.querySelectorAll("[data-cp]").forEach(b=>b.onclick=()=>{CP=b.dataset.cp;renderAll()});
  B.querySelectorAll("[data-acell]").forEach(b=>b.onclick=()=>{const [k,m,bd]=b.dataset.acell.split("|");P={...P,type:"act",act:k,member:m,band:bd,count:m==="all"?1:TYPES.act.batch};tab="make";renderAll()});
  B.querySelectorAll("[data-ccell]").forEach(b=>b.onclick=()=>{const [m,ca,bd]=b.dataset.ccell.split("|");P={...P,type:"casual",member:m,ca,band:bd,count:TYPES.casual.batch};tab="make";renderAll()});
  B.querySelectorAll("[data-ncell]").forEach(b=>b.onclick=()=>{const [m,nk,bd]=b.dataset.ncell.split("|");P={...P,type:"night",member:m,nk,band:bd,count:TYPES.night.batch};tab="make";renderAll()});
  B.querySelectorAll("[data-ecell]").forEach(b=>b.onclick=()=>{P={...P,type:"event",ev:b.dataset.ecell,count:TYPES.event.batch};tab="make";renderAll()});
  B.querySelectorAll("[data-scell]").forEach(b=>b.onclick=()=>{const [k,m]=b.dataset.scell.split("|");P={...P,type:"situ",req:k,member:m,period:SITU[k].per.includes(P.period)?P.period:SITU[k].per[0],count:TYPES.situ.batch};tab="make";renderAll()});
  if(q("#keySave")){ const saveK=()=>{const k=q("#keyIn").value.trim(); if(k) localStorage.setItem(KEY_K,k); const m=q("#modelIn").value==="custom"?q("#modelCustom").value.trim():q("#modelIn").value; if(m) localStorage.setItem(KEY_M,m)};
    q("#modelIn").onchange=()=>q("#modelCustom").classList.toggle("hidden",q("#modelIn").value!=="custom");
    q("#keyShow").onclick=()=>{const k=q("#keyIn");k.type=k.type==="password"?"text":"password"};
    q("#keySave").onclick=()=>{saveK();q("#keyStatus").textContent="已儲存。"};
    q("#keyDel").onclick=()=>{localStorage.removeItem(KEY_K);renderAll();toast2("金鑰已清除")};
    q("#keyTest").onclick=async()=>{saveK(); const st=q("#keyStatus"); st.textContent="測試中…"; try{const r=await aiJSON('只回覆 JSON:{"ok":true}',[]); st.textContent=r?.ok?`連線成功,使用 ${model()}。`:"有回應,但格式不如預期,仍可試用。"}catch(e){st.textContent=ERR[e?.code]||"測試失敗。"}} }
}
function edit(sn){ const {nodes,sc,at,sl,who,w,cd}=sn; const d=$("#mkDlg");
  d.innerHTML=`<div class="mdlg"><h3>編輯片段</h3><p class="mnote">直接修改台詞、選項或節點,存檔前會檢查格式。台詞格式是 [說話者, 台詞, 表情]。</p>
    <textarea id="ej">${esc(JSON.stringify({sc,at,sl,who,w,cd,nodes},null,2))}</textarea>
    <div class="mrow" style="justify-content:flex-end"><button class="mbtn" id="ejc">取消</button><button class="mbtn pri" id="ejs">儲存</button></div></div>`;
  d.classList.remove("hide"); $("#ejc").onclick=()=>d.classList.add("hide");
  $("#ejs").onclick=async()=>{try{const o=JSON.parse($("#ej").value); await saveItem({...sn,...o}); d.classList.add("hide"); toast2("已更新")}catch(e){toast2("JSON 格式有誤,請檢查逗號與括號")}} }
function renderAuto(){ if(OPEN&&tab==="auto") renderAll() }
setInterval(()=>{ if(OPEN&&tab==="auto"&&!document.querySelector("#makerFac input:focus")) renderAll() },1000);
/* 2026-10-25 對手女團改名 LUMIÈRE → NOXVEIL:內容庫裡提到舊名字的片段一起換掉並同步到雲端(沒有就什麼都不做) */
const RENAMES=[[/LUMI[ÈE]RE|Lumi[èe]re/g,"NOXVEIL"]];
async function renameOld(){ for(const it of [...items]){ const s=JSON.stringify(it); let t=s; for(const [re,to] of RENAMES) t=t.replace(re,to); if(t!==s) await saveItem(JSON.parse(t)) } }
const itemsReady=(async()=>{ for(let i=0;i<40&&!IDB.db;i++) await new Promise(r=>setTimeout(r,100)); items=Object.values(await IDB.get("scriptsAll")||{}); await renameOld() })();

})();
