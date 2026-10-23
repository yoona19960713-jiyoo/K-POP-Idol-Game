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
async function aiJSON(prompt,files,signal){
  const key=apiKey(); if(!key) throw {code:"no_key"};
  const parts=[{text:prompt}];
  for(const f of files||[]) parts.push({inline_data:{mime_type:"image/jpeg",data:await toJpegB64(f)}});
  let res;
  try{
    res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`,{method:"POST",signal,
      headers:{"Content-Type":"application/json","x-goog-api-key":key},
      body:JSON.stringify({contents:[{role:"user",parts}],generationConfig:{responseMimeType:"application/json"}})});
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
      if(model()!==DEFAULT_MODEL){ localStorage.setItem(KEY_M,DEFAULT_MODEL); return aiJSON(prompt,files,signal); } // 模型被停用時自動改回預設
      throw {code:"bad_model",message:msg};
    }
    if(/location/i.test(msg)) throw {code:"region",message:msg};
    throw {code:"server",message:msg};
  }
  if(j.promptFeedback?.blockReason) throw {code:"blocked"};
  const c=j.candidates?.[0];
  if(!c||c.finishReason==="SAFETY"||c.finishReason==="PROHIBITED_CONTENT"||c.finishReason==="BLOCKLIST") throw {code:"blocked"};
  const text=(c.content?.parts||[]).map(p=>p.text||"").join("");
  try{return JSON.parse(text)}catch(e){const m=text.match(/[\[{][\s\S]*[\]}]/); if(m){try{return JSON.parse(m[0])}catch(_){}} throw {code:"invalid_json"}}
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
const PREF={ys:{安慰:1,鼓勵:1.2,嚴厲:.3,開玩笑:1,轉移話題:.5,陪著:1.3,出手幫忙:.5},tr:{安慰:.2,鼓勵:.6,嚴厲:1.1,開玩笑:1.3,轉移話題:.6,陪著:1.1,出手幫忙:-.3},
 hy:{安慰:.9,鼓勵:1.1,嚴厲:-.4,開玩笑:1,轉移話題:.6,陪著:.9,出手幫忙:1.1},he:{安慰:.7,鼓勵:.9,嚴厲:.9,開玩笑:1.2,轉移話題:.4,陪著:.8,出手幫忙:.7},
 hr:{安慰:1.2,鼓勵:1.3,嚴厲:-.7,開玩笑:.6,轉移話題:.3,陪著:.9,出手幫忙:1}};
const STYLES=Object.keys(PREF.ys);
const STAGES=["戒備","信任","夥伴","心動","戀人"];
const STAGE_DESC={戒備:"她對代表還有距離,禮貌或冷淡。",信任:"她開始相信代表是好老闆,會說一些工作上的心事。",夥伴:"她把代表當成可以依靠的夥伴,願意說私事。",心動:"她對代表有了心動的感覺,會有曖昧、欲言又止的時刻,但還沒說破。",戀人:"兩人已是戀人,私下親暱自然;表現以情感為主,不露骨。"};
const PERIODS=["練習生期","出道與上升期","巔峰期","轉型期"];
const PERIOD_DESC={練習生期:"2015 下半年,還沒出道,每天練習、月評、宿舍生活。",出道與上升期:"2016~2017,剛出道,打歌、綜藝、第一次一位、限韓令、西方市場打開。",巔峰期:"2018~2019,一線女團,頒獎典禮、海外巡演、個人活動機會。",轉型期:"2020 以後,疫情讓舞台消失,線上演唱會、續約與未來的選擇。"};
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
 social:{n:"社群",kind:"single",len:"1~2 個來回,她的貼文、直播或粉絲通訊與粉絲反應(依時期:2015 年是直播平台剛起步,2020 年後有粉絲通訊 App)",places:["phone"],target:30,batch:5},
 msg:{n:"訊息",kind:"single",len:"1~3 個來回的手機訊息",places:["phone"],target:44,batch:6},
 topic:{n:"再聊一下",kind:"single",len:"2~3 個來回的日常話題,接在其他對話後面",places:["practice","dorm","office","studio","out","styling"],target:20,batch:4},
 between:{n:"成員之間",kind:"pair",len:"2~4 個來回,主要是成員之間對話,代表在旁邊,最後才有選項",places:["practice","dorm","studio","styling"],target:40,batch:4},
 group:{n:"群組聊天",kind:"pair",len:"團體聊天室裡多人的訊息,1~2 次選擇",places:["phone"],target:30,batch:4},
 pairlong:{n:"雙人長對話",kind:"pair",len:"8~10 個來回(玩家要做 8~10 次選擇),兩位成員和代表一起,至少兩層分支,成員之間也會互相回應",places:["practice","dorm","studio","out","styling"],target:20,batch:2},
 away:{n:"你不在場時",kind:"pair",len:"一段兩三句的旁白,描述代表不在時發生的事,沒有選項",places:["practice","dorm","studio","styling"],target:30,batch:6}};
const PAIRS=[];for(let i=0;i<MB.length;i++)for(let j=i+1;j<MB.length;j++)PAIRS.push(MB[i].id+"-"+MB[j].id);PAIRS.push("all");
const pairName=p=>p==="all"?"全團":p.split("-").map(x=>mb(x).n).join("×");
const SINGLE_TYPES=Object.keys(TYPES).filter(k=>TYPES[k].kind==="single"), PAIR_TYPES=Object.keys(TYPES).filter(k=>TYPES[k].kind==="pair");

/* ---------- 世界設定(依《世界設定與時間軸》;只能用這些原創名稱) ---------- */
const WORLD_BASE="公司:星環娛樂(老牌大公司)、黑鑽(嘻哈 girl crush)、晨光(親民、選秀組團)、方舟音樂(粉絲經營崛起)、楓葉娛樂(藝瑟的前公司)。打歌節目:週二 SHOW PULSE、週三 CHAMPION LIVE、週四 COUNTDOWN M、週五 MUSIC VAULT、週六 CORE STAGE、週日 STAR GAYO。頒獎:NOTE AWARDS(12 月,海外舉辦)、旋律音樂獎(12 月)、金盤獎(1 月)、首爾歌謠大賞(1 月)。音源平台 Melodi,排行榜圓音榜,入口網站 Nexa(熱搜與留言),八卦媒體 D-Scope。頂級製作人團隊 Lighthouse。";
const WORLD_PERIOD={
 練習生期:"這時還沒出道。活躍的女團:RADIANT 9(國民女團)、BLAZE、WONDER POP、SUNNY DAY、PEACH、HARMONY、VELVET ROSE、GLOW(2015 夏天正爆紅)、TWINKLE(2015 年 10 月經選秀出道)。男團 EXON、NOVA。直播平台 Spotlight Live 剛上線。2015 年夏天有中東呼吸症候群疫情。",
 出道與上升期:"活躍的女團:GLOW、TWINKLE(2016 年最紅)、VELVET ROSE、HARMONY、PRISM 9(2016 年 5 月由選秀節目 SPOTLIGHT 99 選出的期間限定團)、LUMIÈRE(黑鑽 2016 年 8 月出道,藝瑟的舊同伴是成員)。BLAZE、WONDER POP、SUNNY DAY 在 2016 底到 2017 年陸續解散。2016 年底起中國市場關閉(限韓令)。2017 年 NOVA 在美國頒獎典禮得獎,西方市場打開。",
 巔峰期:"活躍的女團:TWINKLE、VELVET ROSE、LUMIÈRE、HARMONY、IRIS 12(2018 年 10 月韓日合作選秀)、ZEST(2019 年出道)。日本市場熱絡,2019 年起短影音平台 Clip 普及;2019 年有娛樂圈大型醜聞,輿論緊縮。",
 轉型期:"2020 年起新冠疫情,演唱會全停、打歌無觀眾錄影、線上演唱會;粉絲通訊 Pocket 上線、Clip 舞蹈挑戰是宣傳主力。NEOVERSE(2020 年 11 月)、2022 年 SERAPH、NEW DAY 出道。2022 年疫情解封、巡演回歸,也是第一份七年合約到期的時候。"};

/* ---------- 格式檢查 ---------- */
function analyse(sn){
  const w=[]; const N=sn.nodes||{}; if(!N.start) return {depth:0,branch:0,warn:["沒有 start 節點"]};
  const ids=new Set(MB.map(m=>m.id));
  for(const [k,n] of Object.entries(N)){
    if(!Array.isArray(n.L)) w.push(`節點 ${k} 沒有台詞`);
    for(const l of n.L||[]) if(!ids.has(l[0])) w.push(`節點 ${k} 有不認得的說話者 ${l[0]}`);
    for(const c of n.C||[]){ if(!STYLES.includes(c.s)) w.push(`選項「${(c.t||"").slice(0,10)}」的回應方式不合法`);
      if(c.next&&!N[c.next]) w.push(`選項指向不存在的節點 ${c.next}`);
      if(c.to&&!ids.has(c.to)) w.push(`選項對象 ${c.to} 不存在`);
      if((c.g||0)>4||(c.g||0)<-2) w.push(`選項「${(c.t||"").slice(0,10)}」的影響強度 ${c.g} 超出 -2~4`); }
  }
  const memo={}; const depth=(k,seen)=>{if(seen.has(k)||!N[k])return 0; seen.add(k); let m=0; for(const c of N[k].C||[]) m=Math.max(m,1+(c.next?depth(c.next,new Set(seen)):0)); return m};
  const d=depth("start",new Set()); const branch=Object.values(N).filter(n=>(n.C||[]).filter(c=>c.next).length>=2).length;
  if(sn.type==="long"||sn.type==="pairlong"){ if(d<8) w.push(`最長只有 ${d} 個來回,長對話要 8~10 個`); if(d>11) w.push(`最長 ${d} 個來回,超過 10 個`); if(branch<2) w.push(`只有 ${branch} 個分岔點,長對話至少要 2 個`) }
  if(sn.type==="away"&&(N.start.C||[]).length) w.push("你不在場時的片段不應該有選項");
  return {depth:d,branch,warn:w};
}

/* ---------- 生成提示詞 ---------- */
function buildPrompt(p,existing){
  const t=TYPES[p.type]; const who=t.kind==="pair"?(p.pair==="all"?MB.map(m=>m.id):p.pair.split("-")):[p.member];
  const voices=who.map(id=>`【${id}】${VOICE[id]}\n她對回應方式的反應倍率(負數是反效果):${Object.entries(PREF[id]).map(([k,v])=>k+v).join("、")}`).join("\n\n");
  return `你是一款韓國女團養成遊戲的編劇。玩家是一位財閥出身的娛樂公司代表(成員叫他/她「代表」,性別不指定),旗下五位女團成員都是成年人(故事開始時 18 歲)。請用繁體中文寫遊戲的日常片段。

【這批要寫的】
種類:${t.n}(${t.len})
${t.kind==="pair"?`主角組合:${pairName(p.pair)}`:`主角:${mb(p.member).n}(id ${p.member})`}
${t.kind==="single"?`她對代表的關係階段:${p.stage}——${STAGE_DESC[p.stage]}`:`成員之間的互動為主;代表在場時的語氣依一般信任階段。`}
時期:${p.period}——${PERIOD_DESC[p.period]}
數量:${p.count} 個,彼此情境要明顯不同。
可用地點(at):${t.places.map(k=>`${k}=${PLACES[k]}`).join("、")};${t.places.filter(k=>PLACE_NOTE[k]).map(k=>`\n${PLACES[k]}的樣子:${PLACE_NOTE[k]}`).join("")}
時段(sl,數字):0 清晨、1 上午、2 下午、3 晚上、4 深夜。
${p.hint?`玩家補充:${p.hint}\n`:""}
【成員設定與口吻,必須嚴格遵守】
${voices}

其他成員 id:${MB.map(m=>`${m.id}=${m.n}`).join("、")}。

【世界設定,提到業界時只能用這些原創名稱】
${WORLD_BASE}
這個時期的狀況:${WORLD_PERIOD[p.period]}
玩家團體的團名尚未決定,台詞裡用「我們」「我們團」稱呼,不要自己取團名。

【寫作規則】
- 口吻要像她本人,會因關係階段改變語氣;每句台詞自然、口語、有生活感,不要說教。
- 選項是代表說的話或做的動作(用「」包住說的話,或寫動作),每個選項標一種回應方式 s,只能是:${STYLES.join("、")}。
- 每個選項的她的回應 r 要反映她對這種回應方式的真實反應(依上面的倍率,負數就寫成她不舒服或拉開距離)。
- 影響強度 g 是整數 -2~4;心情 mood、壓力 stress 可省略或填 -6~6 的整數;只有特別心動的時刻才填 heart 1~2,而且只在信任、夥伴以上階段。
- 可以用 set 記下一個英文小寫駝峰的記憶旗標(例如 hyAnkleAsk),讓之後的劇情記得這件事。
- 每句台詞的格式是 [說話者 id, 台詞, 表情];表情只能是 neutral(平常)、smile(微笑)、laugh(大笑)、sad(難過)、angry(生氣)、shy(害羞),要符合那一句的情緒;選項的 r 裡的台詞也一樣有表情。
- 多輪對話用 nodes 樹狀結構:每個節點有 L(台詞陣列)和 C(選項陣列),選項用 next 指向下一個節點的鍵名,沒有 next 就結束,結束時可以用 r 寫她最後的反應。
- ${t.kind==="pair"?"L 裡可以有多位成員輪流說話。":"L 裡以主角為主,其他成員可以偶爾出現。"}
- 以情感為主,不寫露骨內容;不要出現真實的人名、團名、公司名或節目名,一律用上面的原創名稱。
${existing.length?`- 這一格已經有以下情境,請避免重複:\n${existing.map(x=>"  · "+x).join("\n")}`:""}

【只回覆 JSON】
{"snippets":[{"at":"practice","sl":[3,4],"who":["${who[0]}"],"sc":"一句描述畫面的旁白","w":3,"cd":4,"nodes":{"start":{"L":[["${who[0]}","台詞","neutral"]],"C":[{"t":"「代表說的話」","s":"陪著","to":"${who[0]}","g":2,"next":"b"},{"t":"(動作)","s":"開玩笑","to":"${who[0]}","g":1,"r":[["${who[0]}","她的反應","smile"]]}]},"b":{"L":[["${who[0]}","台詞","neutral"]],"C":[{"t":"「……」","s":"鼓勵","to":"${who[0]}","g":3,"set":"someFlag","r":[["${who[0]}","她最後的反應","shy"]]}]}}}]}`;
}


/* ---------- 自動生產:排程、速度與每日額度控管 ---------- */
const AK="kpopScripts.auto";
let A={rpm:4,day:200,autoAccept:true,fallback:true}; try{A={...A,...JSON.parse(localStorage.getItem(AK)||"{}")}}catch(e){}
const saveA=()=>{try{localStorage.setItem(AK,JSON.stringify(A))}catch(e){}};
const ptDate=()=>new Date().toLocaleDateString("en-CA",{timeZone:"America/Los_Angeles"});
function usage(){let u={};try{u=JSON.parse(localStorage.getItem(AK+".use")||"{}")}catch(e){} if(u.d!==ptDate()) u={d:ptDate(),n:0,made:0,fail:0}; if(!u.why) u.why={}; return u}
function setUsage(u){try{localStorage.setItem(AK+".use",JSON.stringify(u))}catch(e){}}
function msToReset(){const now=new Date(); const pt=new Date(now.toLocaleString("en-US",{timeZone:"America/Los_Angeles"})); const nx=new Date(pt); nx.setHours(24,0,30,0); return nx-pt}
/* 各關係階段在各時期的比例(戒備多在早期,戀人多在後期) */
const PW={戒備:[.6,.3,.1,0],信任:[.4,.35,.15,.1],夥伴:[.2,.3,.3,.2],心動:[.1,.3,.35,.25],戀人:[0,.25,.4,.35],pair:[.3,.25,.25,.2]};
/* 長對話與雙人長對話改由 Claude 創作室負責,自動生產不再用 Gemini 產生 */
const TYPE_ORDER=["msg","encounter","practice","chat","request","friction","surprise","worry","topic","social"];
const PAIR_ORDER=["between","away","group"];
function nextTask(){
  const L=lib(); const cnt={}; for(const x of L){const k=cellKey(x)+"|"+x.period; cnt[k]=(cnt[k]||0)+1}
  const pend={}; for(const x of reviewQ_()){const k=cellKey(x)+"|"+x.period; pend[k]=(pend[k]||0)+1}
  for(let pi=0;pi<PERIODS.length;pi++){ const per=PERIODS[pi];
    for(const st of STAGES){ for(const ty of TYPE_ORDER){
      // 五位成員輪流:先找缺最多的那位
      let best=null,gap=0;
      for(const m of MB){const tgt=Math.round(TYPES[ty].target*PW[st][pi]); const have=(cnt[ty+"|"+m.id+"|"+st+"|"+per]||0)+(pend[ty+"|"+m.id+"|"+st+"|"+per]||0); if(tgt-have>gap){gap=tgt-have;best=m.id}}
      if(best) return {type:ty,member:best,pair:"",stage:st,period:per,count:Math.min(TYPES[ty].batch,gap),hint:""};
    }}
    for(const ty of PAIR_ORDER){ let best=null,gap=0;
      for(const p of PAIRS){const tgt=Math.round(TYPES[ty].target*(p==="all"?5:1)*PW.pair[pi]); const have=(cnt[ty+"|"+p+"||"+per]||0)+(pend[ty+"|"+p+"||"+per]||0); if(tgt-have>gap){gap=tgt-have;best=p}}
      if(best) return {type:ty,member:"",pair:best,stage:"",period:per,count:Math.min(TYPES[ty].batch,gap),hint:""};
    }
  }
  return null;
}
let running=false, wakeLock=null, lastCalls=[], aState="", aWait=0, aTick=0;
const sleep=ms=>new Promise(r=>{const t0=Date.now(); aWait=Date.now()+ms; const iv=setInterval(()=>{ if(!running||Date.now()>=aWait){clearInterval(iv);r()} },500)});
async function produce(task){
  const t=TYPES[task.type];
  const existing=lib().filter(x=>x.type===task.type&&(t.kind==="pair"?x.pair===task.pair:(x.member===task.member&&x.stage===task.stage))).slice(-25).map(x=>x.sc);
  const r=await aiJSON(buildPrompt(task,existing),[]);
  const arr=Array.isArray(r)?r:(r.snippets||[]); let ok=0,bad=[];
  if(!arr.some(x=>x?.nodes?.start)) throw {code:"invalid_json",message:"回傳裡沒有可用的片段"};
  for(const s0 of arr){ if(!s0?.nodes?.start) continue;
    const sn={code:`${task.type}-${t.kind==="pair"?task.pair:task.member}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`,
      type:task.type,k:t.n,member:task.member,pair:task.pair,stage:task.stage,period:task.period,
      at:t.places.includes(s0.at)?s0.at:t.places[0],sl:(Array.isArray(s0.sl)?s0.sl:[2]).filter(x=>x>=0&&x<=4),who:Array.isArray(s0.who)?s0.who.filter(x=>mb(x)):[task.member],
      sc:String(s0.sc||""),w:+s0.w||3,cd:+s0.cd||4,nodes:s0.nodes,createdAt:Date.now(),params:{...task}};
    const pass=!analyse(sn).warn.length;
    if(pass&&A.autoAccept){sn.status="auto"; await saveItem(sn); ok++} else bad.push(sn) }
  return {ok,bad,total:arr.length};
}
async function autoLoop(){
  try{wakeLock=await navigator.wakeLock?.request?.("screen")}catch(e){}
  while(running){
    const u=usage();
    const main=(()=>{const m=localStorage.getItem(KEY_M)||DEFAULT_MODEL; return RETIRED.includes(m)?DEFAULT_MODEL:m})(), FB="gemini-flash-lite-latest";
    if(!u.outM) u.outM={};
    modelOverride = !u.outM[main] ? "" : (A.fallback&&main!==FB&&!u.outM[FB] ? FB : "");
    if(u.outM[main]&&!(A.fallback&&main!==FB&&!u.outM[FB])) u.out=true;
    if(u.n>=A.day||u.out){ aState=u.out?"Google 回報今天的免費額度用完了,等額度重置後自動繼續。":`今天的上限 ${A.day} 次用完了,等額度重置後自動繼續。`; await sleep(msToReset()); continue }
    const task=nextTask(); if(!task){ aState="目標全部完成了!"; running=false; break }
    const gap=60000/Math.max(1,A.rpm); lastCalls=lastCalls.filter(t=>Date.now()-t<60000);
    if(lastCalls.length>=A.rpm){ aState="控制速度中…"; await sleep(60000-(Date.now()-lastCalls[0])+500); continue }
    const last=lastCalls[lastCalls.length-1]||0; if(Date.now()-last<gap){ aState="控制速度中…"; await sleep(gap-(Date.now()-last)); continue }
    aState=(modelOverride?"(備用模型)":"")+`產生中:${TYPES[task.type].n}・${task.pair?pairName(task.pair):mb(task.member).n}${task.stage?"・"+task.stage:""}・${task.period}`;
    lastCalls.push(Date.now()); u.n++; setUsage(u);
    try{
      let res=await produce(task); let tries=0;
      while(res.bad.length&&tries<1&&running){ tries++; lastCalls.push(Date.now()); const u2=usage(); u2.n++; setUsage(u2); await sleep(gap);
        const r2=await produce({...task,count:res.bad.length}); res={ok:res.ok+r2.ok,bad:r2.bad,total:res.total} }
      for(const sn of res.bad){ sn.status="review"; await saveItem(sn) }
      const u3=usage(); u3.made+=res.ok; u3.review=(u3.review||0)+res.bad.length; setUsage(u3);
    }catch(e){
      const u4=usage(); const why=WHY[e?.code]?e.code:"other"; if(why==="other"&&!e?.message&&e) e={message:String(e)}; u4.fail++; u4.why[why]=(u4.why[why]||0)+1;
      if(e?.code==="rate_minute"||e?.code==="rate_day") u4.n=Math.max(0,u4.n-1); // 被 Google 以超量拒絕的請求不消耗額度,不算進今天已用
      if(e?.code==="rate_day"){ if(!u4.outM) u4.outM={}; u4.outM[model()]=true }
      setUsage(u4);
      u4.last=`${new Date().toLocaleTimeString("zh-TW",{timeZone:"Asia/Taipei",hour:"2-digit",minute:"2-digit"})} ${WHY[why]||why}${e?.message?":"+String(e.message).slice(0,120):""}`; setUsage(u4);
      if(e?.code==="rate_minute"){ aState="每分鐘次數到上限,稍等一下…"; await sleep(Math.max(15,(e.wait||60)+5)*1000) }
      else if(e?.code==="rate_day"){ }
      else if(["no_key","bad_key","bad_model","region"].includes(e?.code)){ aState=ERR[e.code]; running=false }
      else { aState=(ERR[e?.code]||"這次失敗了")+" 30 秒後重試。"; await sleep(30000) }
    }
  }
  modelOverride=""; try{await wakeLock?.release?.()}catch(e){} wakeLock=null; renderAuto();
}
const WHY={rate_minute:"每分鐘超量",rate_day:"每日額度用完",blocked:"被安全機制擋下",invalid_json:"回傳格式不完整",server:"Gemini 暫時出錯",network:"網路中斷",other:"其他"};
function fmtMs(ms){ms=Math.max(0,ms);const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);return h?`${h} 小時 ${m} 分`:m?`${m} 分 ${s} 秒`:`${s} 秒`}

/* ---------- 在遊戲裡的資料:所有片段(含待審),與雲端 users/{uid}/scripts 同步 ---------- */
let items=[];
const lib=()=>items.filter(x=>x.status==="ok"||x.status==="auto");
const reviewQ_=()=>items.filter(x=>x.status==="review");
function cellKey(sn){return sn.type+"|"+(TYPES[sn.type]?.kind==="pair"?sn.pair:sn.member)+"|"+(TYPES[sn.type]?.kind==="pair"?"":sn.stage)}
const EXPRS=["neutral","smile","laugh","sad","angry","shy"];
function cleanExpr(nodes){ for(const n of Object.values(nodes||{})){ for(const l of n.L||[]) if(l.length>2&&!EXPRS.includes(l[2])) l.length=2;
  for(const c of n.C||[]) for(const l of c.r||[]) if(l.length>2&&!EXPRS.includes(l[2])) l.length=2 } return nodes }
async function persist(){ const o={}; for(const x of items) o[x.code]=x; await IDB.set("scriptsAll",o) }
function toGame(sn){ // 遊戲玩的時候用的精簡內容庫
  if(sn.status==="ok"||sn.status==="auto") SCRIPTS[sn.code]={code:sn.code,type:sn.type,member:sn.member||"",pair:sn.pair||"",stage:sn.stage||"",period:sn.period||"",at:sn.at,sl:sn.sl||[],who:sn.who||[],sc:sn.sc||"",w:+sn.w||3,cd:+sn.cd||4,nodes:sn.nodes||{}};
  else delete SCRIPTS[sn.code] }
async function saveItem(it){ const body={...it,updatedAt:Date.now()}; if(body.nodes) cleanExpr(body.nodes);
  const i=items.findIndex(x=>x.code===body.code); if(i>=0) items[i]=body; else items.push(body);
  await persist(); toGame(body); await IDB.set("scripts",SCRIPTS); saveDoc("scripts",body); renderAll() }
async function removeItem(code){ items=items.filter(x=>x.code!==code); await persist(); delete SCRIPTS[code]; await IDB.set("scripts",SCRIPTS);
  let done=false; if(syAuth()&&syCfg()){ try{ await syPatchPath(`scripts/${encodeURIComponent(code)}`,{json:{stringValue:"{}"},updatedAt:{integerValue:String(Date.now())},deleted:{booleanValue:true}}); done=true }catch(e){} }
  if(!done){ const t=await IDB.get("scriptsTombs")||[]; t.push(code); await IDB.set("scriptsTombs",t) } renderAll() }
async function sync(){
  if(!syAuth()||!syCfg()) return;
  const t=await IDB.get("scriptsTombs")||[]; const left=[];
  for(const code of t){ try{ await syPatchPath(`scripts/${encodeURIComponent(code)}`,{json:{stringValue:"{}"},updatedAt:{integerValue:String(Date.now())},deleted:{booleanValue:true}}) }catch(e){left.push(code)} }
  await IDB.set("scriptsTombs",left);
  const K="kpopGame.pull.scriptsAll", since=+(localStorage.getItem(K)||0); let max=since, ch=0;
  const rows=await syQuery("scripts",since);
  for(const r of rows){ const d=r.document; if(!d) continue; const code=decodeURIComponent(d.name.split("/").pop()), up=+d.fields.updatedAt?.integerValue||0; max=Math.max(max,up);
    const i=items.findIndex(x=>x.code===code);
    if(d.fields.deleted?.booleanValue){ if(i>=0){items.splice(i,1);ch++} continue }
    let it; try{it=JSON.parse(d.fields.json.stringValue)}catch(e){continue}
    if(i<0) items.push(it); else if((it.updatedAt||0)>=(items[i].updatedAt||0)) items[i]=it; ch++ }
  localStorage.setItem(K,String(max)); if(ch){ await persist(); if(OPEN) renderAll() }
}
(window.SYNC_HOOKS=window.SYNC_HOOKS||[]).push(sync);

/* =====================================================================
   畫面:製作者模式(編輯部的稿紙桌)
   ===================================================================== */
let OPEN=false, tab="auto", P={type:"encounter",member:"ys",pair:"ys-tr",stage:"戒備",period:"練習生期",count:5,hint:""}, ctl=null, mStatus="", mErr=false;
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
async function open(){ shell(); if(!items.length) items=Object.values(await IDB.get("scriptsAll")||{}); OPEN=true; setPause("maker",true);
  void $("#makerFac").offsetWidth; $("#makerFac").classList.remove("hide"); $("#makerFac").querySelector(".fac-bg").style.backgroundImage=`url(assets/bg/office_night.webp)`; renderAll() }
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
    <p class="mnote">依覆蓋率由最常用的開始補:練習生期優先、關係階段由淺到深、五位成員輪流。會自己控管每分鐘次數與每日上限,碰到上限就等待,額度重置後自動繼續。製作者模式關掉後仍會在背景繼續,但遊戲要保持開著。長對話改由 Claude 創作室負責。</p>
    <div class="mrow"><label>每分鐘最多<input type="number" id="aRpm" min="1" max="60" value="${A.rpm}">次</label><label>每天最多<input type="number" id="aDay" min="1" max="10000" value="${A.day}">次</label></div>
    <label class="mck"><input type="checkbox" id="aFb" ${A.fallback?"checked":""}> 主模型今天額度用完時,改用 Flash-Lite 繼續</label>
    <label class="mck"><input type="checkbox" id="aAuto" ${A.autoAccept?"checked":""}> 格式通過的直接收進內容庫(標為「未審」);沒通過的重試,仍不行才放進待審</label>
    <button class="mbtn ${running?"danger":"pri"} big" id="mkAuto">${running?"停止自動生產":"開始自動生產"}</button></div>
    <div class="msheet log"><h3>生產紀錄</h3>
    <p>狀態:<b>${running?(aState||"準備中…"):"未啟動"}</b>${running&&aWait>Date.now()?`(${fmtMs(aWait-Date.now())})`:""}</p>
    <p>使用模型:${model()}${u.outM&&Object.keys(u.outM).length?`(今天額度已用完:${Object.keys(u.outM).join("、")})`:""}</p>
    <p>今天已用 <b>${u.n}</b> / ${A.day} 次・自動收入 <b>${u.made}</b> 個・送審 ${u.review||0} 個</p><p>額度約在台灣時間 ${resetAt} 重置</p>
    ${u.last?`<p class="mnote">最近一次失敗:${esc(u.last)}</p>`:""}
    <p>失敗 ${u.fail} 次${u.fail?":"+Object.entries(u.why).map(([k,v])=>`${WHY[k]||k} ${v}`).join("、"):""}</p>
    <p>下一個要補的格子:${nx?`${TYPES[nx.type].n}・${nx.pair?pairName(nx.pair):mb(nx.member).n}${nx.stage?"・"+nx.stage:""}・${nx.period}`:"全部完成"}</p></div></div>`;
}
/* 手動產生 */
function makeHTML(){ const t=TYPES[P.type];
  const have=lib().filter(x=>x.type===P.type&&(t.kind==="pair"?x.pair===P.pair:(x.member===P.member&&x.stage===P.stage))).length;
  return `<div class="msheet"><h3>手動產生一批</h3>
    <h4>種類</h4><div class="mchips">${chipsH(Object.keys(TYPES),P.type,"ty",k=>TYPES[k].n)}</div>
    ${t.kind==="single"?`<h4>主角</h4><div class="mchips">${chipsH(MB.map(m=>m.id),P.member,"mm",id=>mb(id).n)}</div>
      <h4>她對代表的關係階段</h4><div class="mchips">${chipsH(STAGES,P.stage,"st")}</div>`:`<h4>組合</h4><div class="mchips">${chipsH(PAIRS,P.pair,"pp",pairName)}</div>`}
    <h4>時期</h4><div class="mchips">${chipsH(PERIODS,P.period,"pe")}</div>
    <div class="mrow"><label>數量<input type="number" id="tCount" min="1" max="8" value="${P.count}"></label><label class="grow">補充說明<input type="text" id="tHint" value="${esc(P.hint)}" placeholder="例如:月評前一晚、下雨天、她剛被老師罵"></label></div>
    <p class="mnote">這一格目前有 ${have} 個,目標 ${t.target} 個。</p>
    <div class="mrow"><button class="mbtn pri" id="go" ${ctl?"disabled":""}>產生</button>${ctl?`<button class="mbtn" id="stop">停止</button>`:""}</div>
    <p class="mstat${mErr?" err":""}">${esc(mStatus)}</p></div>`;
}
async function generate(params){
  if(!apiKey()){tab="key";renderAll();toast2("先設定 Gemini API 金鑰");return}
  const t=TYPES[params.type];
  const existing=lib().filter(x=>x.type===params.type&&(t.kind==="pair"?x.pair===params.pair:(x.member===params.member&&x.stage===params.stage))).slice(-25).map(x=>x.sc);
  ctl=new AbortController(); mErr=false; mStatus=`生成中…${t.n}通常需要${params.type==="long"?"半分鐘到一分鐘":"十幾秒"}。`; renderAll();
  try{ const r=await aiJSON(buildPrompt(params,existing),[],ctl.signal); const arr=Array.isArray(r)?r:(r.snippets||[]); let n=0;
    for(const s0 of arr){ if(!s0?.nodes?.start) continue;
      await saveItem({code:`${params.type}-${t.kind==="pair"?params.pair:params.member}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`,
        type:params.type,k:t.n,member:t.kind==="single"?params.member:"",pair:t.kind==="pair"?params.pair:"",stage:t.kind==="single"?params.stage:"",period:params.period,
        at:t.places.includes(s0.at)?s0.at:t.places[0],sl:(Array.isArray(s0.sl)?s0.sl:[2]).filter(x=>x>=0&&x<=4),who:Array.isArray(s0.who)?s0.who.filter(x=>mb(x)):[params.member],
        sc:String(s0.sc||""),w:+s0.w||3,cd:+s0.cd||4,nodes:s0.nodes,status:"review",createdAt:Date.now(),params:{...params}}); n++ }
    mStatus=n?`產生了 ${n} 個,請到「待審」看。`:"這次沒有產生可用的片段,請再試一次。";
  }catch(e){ if(e?.code==="cancelled") mStatus="已停止。"; else {mStatus=ERR[e?.code]||"生成失敗,請再試一次。"; mErr=true} }
  finally{ ctl=null; renderAll() }
}
/* 卡片與對話樹 */
function treeHTML(sn){ const N=sn.nodes||{}; const order=["start",...Object.keys(N).filter(k=>k!=="start")];
  const ln=(l,cls="")=>`<div class="tln ${cls}"><b style="color:${mb(l[0])?.c||"inherit"}">${esc(mb(l[0])?.n||l[0])}</b>${esc(l[1])}${l[2]?`<i class="ex">${{neutral:"平常",smile:"微笑",laugh:"大笑",sad:"難過",angry:"生氣",shy:"害羞"}[l[2]]||""}</i>`:""}</div>`;
  return order.filter(k=>N[k]).map(k=>{const n=N[k]; return `<div class="tnode"><div class="tk">${k==="start"?"開始":esc(k)}</div>${(n.L||[]).map(l=>ln(l)).join("")}
    ${(n.C||[]).map(c=>`<div class="topt"><span class="sty">${esc(c.s)}${c.to&&mb(c.to)?"→"+mb(c.to).n:""}・${c.g>0?"+":""}${c.g||0}${c.heart?"・心動+"+c.heart:""}${c.set?"・旗標 "+esc(c.set):""}</span>${esc(c.t)}
      ${c.next?`<span class="nx">→ ${esc(c.next)}</span>`:(c.r||[]).map(l=>ln(l,"r")).join("")||`<span class="nx">結束</span>`}</div>`).join("")}</div>`}).join("") }
function cardHTML(sn,mode){ const a=analyse(sn), who=sn.pair?pairName(sn.pair):mb(sn.member)?.n;
  return `<div class="mcardx" data-code="${esc(sn.code)}"><div class="mch"><div><b>${esc(TYPES[sn.type]?.n||sn.type)}・${esc(who||"")}${sn.stage?"・"+esc(sn.stage):""}・${esc(sn.period||"")}</b>
    <small>${esc(PLACES[sn.at]||sn.at)}・${(sn.sl||[]).map(x=>SLOTS[x]).join("、")}・最長 ${a.depth} 個來回・${a.branch} 個分岔點</small></div>
    <span class="vs ${a.warn.length?"bad":"ok"}">${a.warn.length?"有 "+a.warn.length+" 個提醒":(sn.status==="auto"?"未審・格式通過":"格式通過")}</span></div>
    <p class="mscene">${esc(sn.sc)}</p>${a.warn.length?`<ul class="mwarn">${a.warn.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
    <details ${mode==="review"?"open":""}><summary>展開對話樹</summary><div class="tree">${treeHTML(sn)}</div></details>
    <div class="mrow">${mode==="review"?`<button class="mbtn pri" data-ok>收入內容庫</button><button class="mbtn" data-regen>這格再生一個</button>`:(sn.status==="auto"?`<button class="mbtn pri" data-ok>標為審過</button>`:"")}
      <button class="mbtn" data-play>試玩</button><button class="mbtn" data-edit>編輯</button><button class="mbtn ghost" data-drop>${mode==="review"?"丟掉":"刪除"}</button></div></div>` }
function reviewHTML(){ const Q=reviewQ_(), pass=Q.filter(x=>!analyse(x).warn.length).length;
  return `<div class="mrow" style="justify-content:space-between"><p class="mnote">每個片段都可以展開對話樹、試玩、編輯;確認後才會收進內容庫,遊戲才會抽到。</p>${pass?`<button class="mbtn pri" id="okAll">格式通過的 ${pass} 個全部收入</button>`:""}</div>
    ${Q.length?Q.slice(0,30).map(sn=>cardHTML(sn,"review")).join("")+(Q.length>30?`<p class="mnote">還有 ${Q.length-30} 個,先處理上面的。</p>`:""):`<p class="mempty">還沒有待審的片段。</p>`}` }
function libHTML(){ const list=lib().filter(x=>(!fM||x.member===fM||(x.pair||"").includes(fM))&&(!fT||x.type===fT)&&(!fS||(fS==="__auto"?x.status==="auto":x.stage===fS))&&(!fQ||JSON.stringify(x.nodes).includes(fQ)||String(x.sc).includes(fQ))).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  return `<div class="mrow"><select id="fM"><option value="">全部成員</option>${MB.map(m=>`<option value="${m.id}" ${fM===m.id?"selected":""}>${m.n}</option>`).join("")}</select>
    <select id="fT"><option value="">全部種類</option>${Object.entries(TYPES).map(([k,t])=>`<option value="${k}" ${fT===k?"selected":""}>${t.n}</option>`).join("")}</select>
    <select id="fS"><option value="">全部階段</option>${STAGES.map(s=>`<option ${fS===s?"selected":""}>${s}</option>`).join("")}<option value="__auto" ${fS==="__auto"?"selected":""}>只看未審</option></select>
    <input type="text" id="fQ" value="${esc(fQ)}" placeholder="搜尋台詞" class="grow"></div>
    <p class="mnote">內容庫共 ${lib().length} 個,符合條件 ${list.length} 個${list.length>40?",只顯示最新 40 個":""}。</p>
    ${list.slice(0,40).map(sn=>cardHTML(sn,"lib")).join("")||`<p class="mempty">還沒有內容。</p>`}` }
function heat(n,t){const r=Math.min(1,n/t);return `--h:${Math.round(r*100)}%`}
function coverHTML(){ const L=lib(), cnt={}; for(const x of L){const k=cellKey(x); cnt[k]=(cnt[k]||0)+1} let total=0,done=0;
  let h=`<h3>單人片段(成員 × 關係階段 × 種類)</h3><div class="mtbl"><table><thead><tr><th>成員</th><th>階段</th>${SINGLE_TYPES.map(k=>`<th>${TYPES[k].n}</th>`).join("")}</tr></thead><tbody>`;
  for(const m of MB) for(const s of STAGES){ h+=`<tr><td style="color:${m.c}">${m.n}</td><td>${s}</td>`+SINGLE_TYPES.map(k=>{const n=cnt[k+"|"+m.id+"|"+s]||0,t=TYPES[k].target; total+=t; done+=Math.min(n,t);
      return `<td><button class="cell" style="${heat(n,t)}" data-cell="${k}|${m.id}|${s}">${n}/${t}</button></td>`}).join("")+`</tr>` }
  h+=`</tbody></table></div><h3>雙人與全團</h3><div class="mtbl"><table><thead><tr><th>組合</th>${PAIR_TYPES.map(k=>`<th>${TYPES[k].n}</th>`).join("")}</tr></thead><tbody>`;
  for(const p of PAIRS){ h+=`<tr><td>${pairName(p)}</td>`+PAIR_TYPES.map(k=>{const n=cnt[k+"|"+p+"|"]||0,t=p==="all"?TYPES[k].target*5:TYPES[k].target; total+=t; done+=Math.min(n,t);
      return `<td><button class="cell" style="${heat(n,t)}" data-pcell="${k}|${p}">${n}/${t}</button></td>`}).join("")+`</tr>` }
  return `<p class="mnote">整體進度 ${done}/${total}(${Math.round(done/total*100)}%)。點任一格可以直接到「手動產生」那一格。</p>`+h+`</tbody></table></div>` }
function keyHTML(){ const m=model(), known=["gemini-flash-latest","gemini-flash-lite-latest"].includes(m);
  return `<div class="msheet"><h3>Gemini API 金鑰</h3><p class="mnote">金鑰只存在這台裝置,不會上傳。網頁版如果在同一個瀏覽器用過劇本工坊,會自動沿用同一把。</p>
    <div class="mrow"><input type="password" id="keyIn" class="grow" value="${esc(apiKey())}" placeholder="貼上金鑰" autocomplete="off"><button class="mbtn" id="keyShow">顯示</button></div>
    <div class="mrow"><label>使用的模型<select id="modelIn"><option value="gemini-flash-latest" ${m==="gemini-flash-latest"?"selected":""}>最新 Flash(推薦)</option><option value="gemini-flash-lite-latest" ${m==="gemini-flash-lite-latest"?"selected":""}>最新 Flash-Lite(較快,每日次數較多)</option><option value="custom" ${known?"":"selected"}>自行輸入…</option></select></label>
      <input type="text" id="modelCustom" class="grow${known?" hidden":""}" value="${known?"":esc(m)}" placeholder="例如 gemini-3.6-flash"></div>
    <div class="mrow"><button class="mbtn pri" id="keySave">儲存</button><button class="mbtn" id="keyTest">測試連線</button><button class="mbtn ghost" id="keyDel">清除金鑰</button></div>
    <p class="mstat" id="keyStatus"></p>
    <details><summary>怎麼取得金鑰?</summary><ol class="mnote"><li>用 Google 帳號登入 aistudio.google.com</li><li>左側點「Get API key」</li><li>按「Create API key」,複製那串文字</li><li>貼到上面,按儲存,再按測試連線</li></ol></details></div>` }
function bind(B){
  const q=s=>B.querySelector(s);
  if(q("#mkAuto")){ q("#mkAuto").onclick=()=>{ running=!running; if(running){aState="";autoLoop()} renderAll() };
    q("#aRpm").onchange=e=>{A.rpm=Math.max(1,Math.min(60,+e.target.value||1));saveA()}; q("#aDay").onchange=e=>{A.day=Math.max(1,+e.target.value||1);saveA()};
    q("#aAuto").onchange=e=>{A.autoAccept=e.target.checked;saveA()}; q("#aFb").onchange=e=>{A.fallback=e.target.checked;saveA()} }
  B.querySelectorAll("[data-ty]").forEach(b=>b.onclick=()=>{P.type=b.dataset.ty;P.count=TYPES[P.type].batch;renderAll()});
  B.querySelectorAll("[data-mm]").forEach(b=>b.onclick=()=>{P.member=b.dataset.mm;renderAll()});
  B.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>{P.pair=b.dataset.pp;renderAll()});
  B.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{P.stage=b.dataset.st;renderAll()});
  B.querySelectorAll("[data-pe]").forEach(b=>b.onclick=()=>{P.period=b.dataset.pe;renderAll()});
  if(q("#tCount")){ q("#tCount").onchange=e=>P.count=Math.max(1,Math.min(8,+e.target.value||1)); q("#tHint").oninput=e=>P.hint=e.target.value }
  if(q("#go")) q("#go").onclick=()=>generate({...P}); if(q("#stop")) q("#stop").onclick=()=>ctl?.abort();
  if(q("#okAll")) q("#okAll").onclick=async()=>{const pass=reviewQ_().filter(x=>!analyse(x).warn.length); for(const sn of pass) await saveItem({...sn,status:"ok"}); toast2(`收入 ${pass.length} 個`)};
  B.querySelectorAll(".mcardx").forEach(card=>{ const code=card.dataset.code, get=()=>items.find(x=>x.code===code);
    const ok=card.querySelector("[data-ok]"); if(ok) ok.onclick=async()=>{const sn=get(),was=sn.status; await saveItem({...sn,status:"ok"}); toast2(was==="auto"?"已標為審過":"已收入內容庫,遊戲同步後就會抽到")};
    const rg=card.querySelector("[data-regen]"); if(rg) rg.onclick=()=>{tab="make";generate({...get().params,count:1})};
    card.querySelector("[data-play]").onclick=()=>{ $("#makerFac").classList.add("hide"); testPlay(get(),()=>$("#makerFac").classList.remove("hide")) };
    card.querySelector("[data-edit]").onclick=()=>edit(get());
    card.querySelector("[data-drop]").onclick=async()=>{ if(!confirm("確定刪除這個片段?")) return; await removeItem(code); toast2("已刪除") } });
  ["fM","fT","fS"].forEach(id=>{const e=q("#"+id); if(e) e.onchange=()=>{({fM,fT,fS}={fM:q("#fM").value,fT:q("#fT").value,fS:q("#fS").value}); renderAll()}});
  if(q("#fQ")){ q("#fQ").onchange=e=>{fQ=e.target.value.trim();renderAll()} }
  B.querySelectorAll("[data-cell]").forEach(b=>b.onclick=()=>{const [k,m,s]=b.dataset.cell.split("|");P={...P,type:k,member:m,stage:s,count:TYPES[k].batch};tab="make";renderAll()});
  B.querySelectorAll("[data-pcell]").forEach(b=>b.onclick=()=>{const [k,p]=b.dataset.pcell.split("|");P={...P,type:k,pair:p,count:TYPES[k].batch};tab="make";renderAll()});
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
(async()=>{ for(let i=0;i<40&&!IDB.db;i++) await new Promise(r=>setTimeout(r,100)); items=Object.values(await IDB.get("scriptsAll")||{}) })();

})();
