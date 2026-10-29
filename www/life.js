"use strict";
/* =====================================================================
   真人化第三批(2026-10-27)
   ① 近況開場:她第一句會提到最近的事(拿到一位、演唱會、宣傳期開始、主打的記憶點舞步)
   ② 記得你的選擇:你在對話裡回得很好的那次,過 2~10 天她會主動提起後續
   ③ 成員之間的小對話泡泡:兩人待在同一個房間時,剖面圖上偶爾冒出一句,點了看完整對話(默契 +0.3)
   ④ 身體狀態:壓力大、深夜、剛練完舞、心情特別好時,第一句話跟著變
   ⑤ 主動約你:到「夥伴」之後,偶爾傳訊息約你晚上去漢江、便利商店,或深夜在廚房;去了會有專屬片段,沒去也不會怎樣
   ⑥ 台詞帶動作:說話時表情一變(大笑、害羞、生氣、難過),立繪跟著做小動作
   ⑦ 紀念日:成員生日、認識週年與出道週年(都在 1/13)——群組訊息、當天第一句話、生日那天陪她聊天有額外好感
   頻率:每位成員每天最多一次開場;生日與週年當天必出;身體狀態 25~60%;近況與回憶各 30~45% 而且每件事只提一次。
   資料存在 S.life(跟著存檔同步)。
   ===================================================================== */
(()=>{
const L=()=>{ S.life=S.life||{used:{},mem:{},inv:null,invLast:{},open:{},bub:{day:-1,used:[]},bdSeen:{}}; return S.life };
const r01=k=>rng(seedOf(S.day,S.slot,"life",k))();
const nm=id=>byId(id)?.n||"";
const ymd=()=>{ const d=dateOf(S.day); return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()} };
const BD={ys:[8,14],tr:[12,21],hy:[2,9],he:[10,3],hr:[5,27]};
const isBd=id=>{ const t=ymd(); return BD[id][0]===t.m&&BD[id][1]===t.d };
/* 改版 1.0:上任(2016/1/13)和出道(2017/1/13)都在 1/13。2017/1/13 當天以出道為主,之後每年 1/13 一起過「相識 N 週年・出道 N−1 週年」 */
const meetYears=()=>{ const t=ymd(); return t.m===1&&t.d===13&&t.y>2017?t.y-2016:0 };
const debutYears=()=>{ const t=ymd(); return t.m===1&&t.d===13&&t.y>2017?t.y-2017:0 };
const rank=id=>(window.STAGE_RANK||[]).indexOf(window.stageOfXp?.(id)||"戒備");
const fill=(t,o)=>t.replace(/\{(\w+)\}/g,(_,k)=>o[k]??"");

/* ---------- 各成員的台詞 ---------- */
const T={
 tired:{ys:["啊,代表……抱歉,今天有點累。不過看到你就好多了。","tired"],tr:["……累死了。別問,讓我坐一下就好。","tired"],hy:["代表……對不起,今天身體有點重……不過我還可以的。","tired"],he:["嘿嘿,被你看到我累成這樣了……可以借我靠一下下嗎?","tired"],hr:["代表~我的電量剩百分之三了……需要代表充電!","tired"]},
 sleepy:{ys:["這麼晚了還沒睡?……其實我也睡不著。","tired"],tr:["你也還醒著?……那就陪我一下。","tired"],hy:["啊,代表……這麼晚了,您也還沒休息嗎?","surprise"],he:["深夜的代表看起來特別溫柔耶,是我的錯覺嗎?","shy"],hr:["噓——大家都睡了,我們小聲一點講話!","laugh"]},
 bright:{ys:["今天狀態超好!代表要不要看我新練的那段?","laugh"],tr:["今天心情不錯。……你運氣好。","smile"],hy:["今天練習很順利……所以心情特別好。","smile"],he:["代表!今天天氣好、心情好,看到你更好~","laugh"],hr:["代表代表!今天我高音一次就上去了,快誇我!","laugh"]},
 prac:{ys:["剛練完舞,滿身汗……別靠太近喔。","shy"],tr:["剛跳完。腿還在抖,不准笑。","neutral"],hy:["剛剛把副歌的動作又對了一次……還差一點點。","smile"],he:["練完了~我剛剛那個轉身,是不是很漂亮?","smile"],hr:["呼——剛練完!我覺得我今天可以去參加舞蹈比賽了!","laugh"]},
 bdSelf:{ys:["代表記得今天是我生日嗎?……記得的話,我會很開心的。","shy"],tr:["……今天是我生日。沒什麼,只是告訴你一下。","shy"],hy:["今天是我的生日……在韓國跟大家一起過生日,感覺好不可思議。","smile"],he:["今天是夏恩的生日~代表準備了什麼驚喜?沒有也沒關係,陪我就好!","laugh"],hr:["代表!今天是全世界最重要的日子——我的生日!","laugh"]},
 bdOther:{ys:["今天是{X}的生日,我們晚上偷偷準備了蛋糕,代表也來吧?","smile"],tr:["今天{X}生日。蛋糕是我挑的,別說出去。","smile"],hy:["今天是{X}的生日……我做了小卡片,不知道她會不會喜歡。","smile"],he:["{X}今天生日!代表要記得跟她說生日快樂喔~","laugh"],hr:["今天{X}生日!我負責唱生日快樂歌,高音版的!","laugh"]},
 meet:{ys:["代表,今天是我們認識 {N} 週年了。謝謝你一直相信我們。","smile"],tr:["……{N} 年了。時間過得真快。","smile"],hy:["從第一次見到代表,已經 {N} 年了……您一直都很照顧我。","shy"],he:["今天是我們認識 {N} 週年紀念日!要一起慶祝嗎?","laugh"],hr:["代表!{N} 週年快樂!我們要一直一直在一起喔!","laugh"]},
 debutAnn:{ys:["出道 {N} 週年了……每次想起那天的舞台,還是會心跳加速。","smile"],tr:["出道 {N} 年。……還好有你在。","shy"],hy:["出道已經 {N} 年了……謝謝代表帶我們走到這裡。","smile"],he:["出道 {N} 週年!今天我要對每個粉絲都笑得最漂亮~","laugh"],hr:["{N} 週年!我要把那天的舞台再唱一百次!","laugh"]},
 win:{ys:["那天拿到一位的時候,我其實哭得比誰都慘……代表有看到嗎?","shy"],tr:["一位。……我到現在還不太敢相信。","smile"],hy:["我們拿到一位了……我打電話告訴媽媽,她也哭了。","smile"],he:["一位耶!代表,我們真的做到了!","laugh"],hr:["一位!一位!我到現在還會在夢裡講得獎感言!","laugh"]},
 concert:{ys:["〈{title}〉結束好幾天了,我還常常想起那片手燈海。","smile"],tr:["演唱會那天……謝謝你在台下。","shy"],hy:["演唱會那天的歡呼聲,我一直都記得。","smile"],he:["演唱會的照片我存了好多張,代表要看嗎?","laugh"],hr:["〈{title}〉的安可我是不是破音了?……沒有?太好了!","laugh"]},
 promo:{ys:["這次的宣傳期,我們一定會讓大家看到最好的舞台。","smile"],tr:["打歌期開始了。這次不會輸。","neutral"],hy:["宣傳期開始了……動作我都背熟了,不會出錯的。","smile"],he:["打歌期開始了~我每天都會漂漂亮亮地上台!","laugh"],hr:["宣傳期開跑!我已經準備好每天被拍得很好看了!","laugh"]},
 hook:{ys:["副歌那個「{hook}」,我在宿舍刷牙的時候都在比。","laugh"],tr:["「{hook}」那個動作……我承認,有點洗腦。","smile"],hy:["「{hook}」的角度,我還想再修一下。","neutral"],he:["粉絲好像都在學「{hook}」耶,好開心!","laugh"],hr:["「{hook}」!我連吃飯都忍不住在比!","laugh"]},
 m_worry:{ys:["上次跟你說的煩惱……後來好多了,謝謝你那時候陪我。","smile"],tr:["上次那件事……你說的我有在想。","shy"],hy:["上次您聽我說那些話……我後來好好睡了一覺。","smile"],he:["上次在你面前哭,好丟臉……不過謝謝你。","shy"],hr:["上次代表說的話,我抄在手機備忘錄裡了!","laugh"]},
 m_request:{ys:["上次你答應我的事,我可還記得喔。","smile"],tr:["上次說好的,別忘了。","neutral"],hy:["上次拜託您的事……真的很謝謝您。","smile"],he:["上次的約定~代表沒有忘記吧?","laugh"],hr:["上次代表答應我的!要算數喔!","laugh"]},
 m_practice:{ys:["上次你陪我練的那段,我今天終於跳順了。","laugh"],tr:["上次你說我那個動作太急……我改了。","smile"],hy:["上次您給的建議,我今天試了,感覺好多了。","smile"],he:["上次你說我轉圈很漂亮,我今天又多練了十次!","laugh"],hr:["上次代表陪我練的高音,今天一次就上去了!","laugh"]},
 m_chat:{ys:["上次跟你聊完之後,心情一直很好。","smile"],tr:["……上次聊得還不錯。","smile"],hy:["上次和您聊天,很開心。","shy"],he:["上次聊的那個,我後來又想到好多想跟你說的~","laugh"],hr:["上次聊到一半就被叫走了,今天要聊個夠!","laugh"]},
};
const MEMK=ty=>ty==="worry"||ty==="friction"?"m_worry":ty==="request"?"m_request":ty==="practice"?"m_practice":"m_chat";
const NO_OPEN=new Set(["event","arc","long","cg","story","situ"]);

/* ---------- ①②④⑦ 開場 ---------- */
function used(id,k){ const u=L().used[id]=L().used[id]||{}; return u[k]!=null }
function use(id,k){ const u=L().used[id]=L().used[id]||{}; u[k]=S.day; const ks=Object.keys(u); if(ks.length>80) for(const x of ks.slice(0,ks.length-80)) delete u[x] }
function line(k,id,o={}){ const v=T[k]?.[id]; return v?{t:fill(v[0],o),e:v[1],k}:null }
window.lifeOpener=(id,sn)=>{ try{
  if(!byId(id)||!sn||NO_OPEN.has(sn.type)||V?.test) return null; const lf=L();
  if(lf.open[id]===S.day) return null;                                  // 每位每天最多一次
  const pick=(o)=>{ if(o){ lf.open[id]=S.day } return o };
  // ⑦ 紀念日:必出
  if(isBd(id)&&!used(id,"bd"+S.day)){ use(id,"bd"+S.day); return pick(line("bdSelf",id)) }
  const N=meetYears(); if(N&&rank(id)>=1&&!used(id,"meet"+N)){ use(id,"meet"+N); return pick(line("meet",id,{N})) }
  const ND=debutYears(); if(ND&&!used(id,"deb"+ND)){ use(id,"deb"+ND); return pick(line("debutAnn",id,{N:ND})) }
  const other=M.find(m=>m.id!==id&&isBd(m.id)); if(other&&!used(id,"bdo"+S.day)&&r01(id+"bdo")<.5){ use(id,"bdo"+S.day); return pick(line("bdOther",id,{X:other.n})) }
  // ④ 身體狀態
  const st=S.m[id];
  if(st.stress>=70&&r01(id+"t")<.6) return pick(line("tired",id));
  if(S.slot===4&&r01(id+"s")<.4) return pick(line("sleepy",id));
  if((S.lastPrac===S.day||S.where[id]==="practice")&&S.slot>=1&&r01(id+"p")<.5) return pick(line("prac",id));
  if(st.mood>=85&&r01(id+"b")<.25) return pick(line("bright",id));
  // ① 近況
  const ev=(S.evLog||[]).filter(e=>S.day-e.day<=4).reverse();
  for(const e of ev){ const key=e.k+e.day; if(used(id,key)||r01(id+key)>=.45) continue;
    if(e.k==="win"){ use(id,key); return pick(line("win",id)) }
    if(e.k==="concert"){ use(id,key); return pick(line("concert",id,{title:e.d?.title||"演唱會"})) }
    if(e.k==="promo"){ use(id,key); return pick(line("promo",id)) } }
  const hk=window.songSummary?.()?.title?.dance; if(hk?.has&&hk.hookName&&window.promoActive?.()&&!used(id,"hook"+hk.hookName)&&r01(id+"hk")<.35){ use(id,"hook"+hk.hookName); return pick(line("hook",id,{hook:hk.hookName})) }
  // ② 回憶
  const mem=(lf.mem[id]||[]).find(x=>!x.u&&S.day-x.day>=2&&S.day-x.day<=10);
  if(mem&&r01(id+"m")<.3){ mem.u=1; return pick(line(MEMK(mem.ty),id)) }
  return null }catch(e){ window.logErr?.("life 開場",e); return null } };
/* ② 記住回得很好的那次對話 */
window.lifeRemember=(id,c,sn,xp)=>{ try{ if(!sn||!byId(id)||(xp||0)<15||String(sn.code||"").startsWith("life-")) return; const lf=L(), a=lf.mem[id]=lf.mem[id]||[];
  if(a.some(x=>x.day===S.day)) return; a.push({day:S.day,ty:sn.type||"chat"}); if(a.length>8) a.splice(0,a.length-8) }catch(e){} };
/* ⑦ 生日那天陪她聊天:額外好感(一次) */
window.lifeAfterTalk=id=>{ try{ if(isBd(id)&&!used(id,"bdgift"+S.day)){ use(id,"bdgift"+S.day); const s=S.m[id]; s.xp=(s.xp||0)+80; s.heart=Math.min(100,(s.heart||0)+(rank(id)>=2?2:0)); s.mood=Math.min(100,s.mood+10); toast2(`陪${nm(id)}過生日:好感 +80${rank(id)>=2?"、心動 +2":""}`) } }catch(e){} };

/* ---------- ⑥ 台詞帶動作 ---------- */
const lastE={};
window.lifeLineMotion=(id,e)=>{ try{ if(!byId(id)||RM.matches) return; const prev=lastE[id]; lastE[id]=e; if(!prev||prev===e) return;
  const im=imgOf(id); if(!im?.animate) return; const r=Math.random();
  const K={laugh:[[{translate:"0 0"},{translate:"0 -1.4%"},{translate:"0 0"}],380],shy:[[{translate:"0 0",rotate:"0deg"},{translate:"0 .7%",rotate:"-.8deg"},{translate:"0 0",rotate:"0deg"}],650],
    angry:[[{rotate:"0deg"},{rotate:".8deg"},{rotate:"-.8deg"},{rotate:"0deg"}],360],sad:[[{translate:"0 0"},{translate:"0 1%"},{translate:"0 0"}],950],
    tired:[[{translate:"0 0",rotate:"0deg"},{translate:"0 1.1%",rotate:".5deg"},{translate:"0 0",rotate:"0deg"}],1300],surprise:[[{translate:"0 0"},{translate:"0 -.9%"},{translate:"0 .2%"},{translate:"0 0"}],300],smile:[[{translate:"0 0"},{translate:"0 -.5%"},{translate:"0 0"}],320],
    pout:[[{rotate:"0deg"},{rotate:"-1deg"},{rotate:".4deg"},{rotate:"0deg"}],720],moved:[[{translate:"0 0"},{translate:"0 .7%"},{translate:"0 .2%"}],1200],wink:[[{translate:"0 0",rotate:"0deg"},{translate:"0 -.6%",rotate:".6deg"},{translate:"0 0",rotate:"0deg"}],420]}[e];
  if(!K||(e==="smile"&&r>.35)||r>.8) return; im.animate(K[0],{duration:K[1],easing:"ease-out",composite:"add"}) }catch(e){} };

/* ---------- ⑦ 換時段時:群組的生日與週年訊息;⑤ 邀約 ---------- */
const BD_GROUP={ys:[["hr","藝瑟歐尼生日快樂!!蛋糕我先偷吃一口了!","laugh"],["he","生日快樂~今天妳是主角!","smile"],["ys","謝謝大家……我好幸福。","shy"]],
  tr:[["hr","泰梨歐尼生日快樂!今天可以不要對我那麼兇嗎?","laugh"],["ys","生日快樂,泰梨。今天好好休息。","smile"],["tr","……謝謝。蛋糕要巧克力的。","shy"]],
  hy:[["ys","日和生日快樂!想家的話今天就打電話回家吧。","smile"],["hr","日和歐尼お誕生日おめでとう!我練了好久!","laugh"],["hy","大家……謝謝,我好開心。","shy"]],
  he:[["tr","生日快樂。……今天妳最漂亮。","smile"],["hy","夏恩歐尼生日快樂,我做了小卡片。","smile"],["he","哇~愛你們!今天我請客!","laugh"]],
  hr:[["he","我們家老么生日快樂~","laugh"],["tr","生日快樂。今天高音隨便妳唱。","smile"],["hr","耶!!今天我是壽星,大家都要聽我的!","laugh"]]};
const INV={
  river:{slots:[3,4],need:2,msg:{ys:"今晚有空嗎?想去漢江走走,吹吹風。",tr:"晚上漢江。……來不來隨你。",hy:"代表,今晚可以陪我去漢江散步嗎?",he:"今晚去漢江嘛~我想跟代表一起看夜景!",hr:"代表代表!今晚漢江!我請你吃泡麵!"},
    sc:"漢江邊的風帶著水氣,對岸的燈一盞一盞亮著。她已經在長椅上等你了。",
    a:{ys:["你真的來了。……我還在想,如果你沒來要怎麼辦。","shy"],tr:["……慢死了。坐吧。","smile"],hy:["代表!……您真的來了,太好了。","smile"],he:["來了來了~我就知道你不會放我鴿子!","laugh"],hr:["代表!泡麵已經泡好了,快來!","laugh"]},
    b:{ys:["跟你在一起的時候,好像什麼壓力都不見了。","smile"],tr:["這裡很安靜。……我喜歡。","smile"],hy:["在日本的時候,也常常這樣看著河發呆……現在旁邊有代表在。","shy"],he:["你看,那邊的燈像不像我們舞台的燈?","laugh"],hr:["漢江的泡麵是全世界最好吃的,代表同意嗎?","laugh"]}},
  store:{slots:[3,4],need:2,msg:{ys:"晚上要不要一起去便利商店?我想吃冰。",tr:"晚上便利商店,陪我買宵夜。",hy:"代表……晚上可以陪我去便利商店嗎?我想買家鄉的零食。",he:"今晚便利商店約會~誰先到誰請客!",hr:"代表!晚上去便利商店,我們來比誰挑的零食比較好吃!"},
    sc:"便利商店的燈很亮,冰櫃嗡嗡地響。她拿著購物籃,朝你揮了揮手。",
    a:{ys:["這裡這裡!我挑了兩支冰,一支是你的。","laugh"],tr:["……你也想吃這個?那就買兩個。","smile"],hy:["代表!您看,這裡竟然有日本的零食……","laugh"],he:["你遲到了~所以今天你請客!","laugh"],hr:["代表看!這個新口味!我們一起試!","laugh"]},
    b:{ys:["半夜吃冰好像有點罪惡……不過跟你一起就沒關係。","shy"],tr:["這種時間跟你在這裡……感覺不太真實。","shy"],hy:["這個味道……好懷念。謝謝您陪我來。","smile"],he:["坐在窗邊吃泡麵,好像在拍偶像劇喔~","laugh"],hr:["這個口味好難吃!……代表你吃吃看!","laugh"]}},
  kitchen:{slots:[4],need:2,msg:{ys:"深夜睡不著……要不要來廚房,我煮點東西給你吃?",tr:"肚子餓。深夜廚房,來不來?",hy:"代表,深夜可以來廚房嗎?我想試做日式茶泡飯給您吃。",he:"深夜食堂開張~代表要來嗎?",hr:"代表!深夜廚房!我學會煎蛋了!"},
    sc:"宿舍的廚房只開著一盞小燈,鍋子裡冒著熱氣。她穿著睡衣,回頭對你笑了一下。",
    a:{ys:["你來啦。坐,馬上就好。","smile"],tr:["……我只會煮泡麵。別期待。","shy"],hy:["代表,請坐……快好了。","smile"],he:["歡迎光臨深夜食堂~今天的特餐是愛心炒飯!","laugh"],hr:["代表看!這個煎蛋是不是很圓!","laugh"]},
    b:{ys:["大家都睡了,只有我們兩個……有點像秘密。","shy"],tr:["……好吃嗎?好吃就多吃一點。","shy"],hy:["這是我媽媽以前常做的……希望您喜歡。","smile"],he:["半夜吃東西會胖……不過今天例外!","laugh"],hr:["下次換代表煮給我吃,說好了喔!","laugh"]}}};
const INV_C=[{t:"「謝謝妳約我。」",s:"陪著",g:3,heart:1,r:"smile"},{t:"「下次換我約妳。」",s:"鼓勵",g:3,heart:1,r:"shy"},{t:"「妳今天也很努力了。」",s:"安慰",g:2,r:"smile"}];
const INV_R={ys:["……嗯,我等你。","你這樣說我會害羞的。","謝謝你一直看著我們。"],tr:["……說好了。","哼,我記住了。","……謝謝。"],hy:["……能被代表約,我很開心。","好……我會等的。","代表也是,辛苦了。"],he:["好啊~我等你約我!","那我要選一個超浪漫的地方!","你也是呀,今天謝謝你~"],hr:["耶!說好了喔!","代表要約我去遊樂園!","嘿嘿,被誇了!"]};
function inviteScene(inv){ const P=INV[inv.pid], id=inv.id, a=P.a[id], b=P.b[id];
  return {code:`life-inv-${inv.pid}-${id}-${inv.day}`,member:id,who:[id],type:"chat",sc:P.sc,
    nodes:{start:{L:[[id,a[0],a[1]],[id,b[0],b[1]]],C:INV_C.map((c,i)=>({t:c.t,s:c.s,g:c.g,to:id,...(c.heart&&rank(id)>=2?{heart:c.heart}:{}),r:[[id,INV_R[id][i],c.r]]}))}}} }
window.lifeInviteScene=(id,pid)=>{ const inv=L().inv; if(!inv||inv.done||inv.id!==id||inv.pid!==pid||inv.day!==S.day||inv.slot!==S.slot) return null; inv.done=1; save(true); return inviteScene(inv) };
window.lifeOnSlot=()=>{ try{ const lf=L();
  if(S.slot===0){
    // ⑦ 群組:生日、出道週年
    for(const m of M) if(isBd(m.id)&&lf.bdSeen[m.id]!==S.day){ lf.bdSeen[m.id]=S.day; window.phoneSay?.("group",BD_GROUP[m.id]); S.m[m.id].mood=Math.min(100,S.m[m.id].mood+10) }
    const ND=debutYears(); if(ND&&lf.bdSeen.debut!==S.day){ lf.bdSeen.debut=S.day; window.phoneSay?.("group",[["ys",`出道 ${ND} 週年!謝謝大家一路走到這裡。`,"smile"],["hr","週年快樂!!今天要吃大餐!","laugh"],["tr","……週年快樂。","smile"]]) }
    const N=meetYears(); if(N&&lf.bdSeen.meet!==S.day){ lf.bdSeen.meet=S.day; for(const m of M) if(rank(m.id)>=2) window.phoneSay?.(m.id,[[m.id,fill(T.meet[m.id][0],{N}),T.meet[m.id][1]]]) }
    // 沒赴約:隔天一句不在意的話(沒有任何懲罰)
    if(lf.inv&&!lf.inv.done&&lf.inv.day<S.day){ const id=lf.inv.id; window.phoneSay?.(id,[[id,{ys:"昨天沒等到你也沒關係,你一定很忙吧。下次再約喔。",tr:"昨天……算了。下次再約。",hy:"昨天的事不用在意……下次再一起去吧。",he:"昨天放我鴿子~下次要補償我喔!",hr:"代表昨天沒來!下次要請我吃兩碗泡麵!"}[id],"smile"]]) ; lf.inv=null }
    if(lf.inv?.done&&lf.inv.day<S.day) lf.inv=null;
    // ⑤ 新的邀約:大約 4~5 天一次,只約到「夥伴」以上、6 天內沒約過的成員
    if(!lf.inv&&r01("inv")<.22){ const cand=M.filter(m=>rank(m.id)>=2&&S.day-(lf.invLast[m.id]??-99)>=6); if(cand.length){
      const m=cand[Math.floor(r01("invm")*cand.length)], keys=Object.keys(INV), pid=keys[Math.floor(r01("invp")*keys.length)], P=INV[pid], slot=P.slots[Math.floor(r01("invs")*P.slots.length)];
      if(PL[pid]?.open.includes(slot)){ lf.inv={id:m.id,pid,day:S.day,slot}; lf.invLast[m.id]=S.day; window.phoneSay?.(m.id,[[m.id,P.msg[m.id],"smile"]]) } } } }
  // 到了約好的時段:她會在那裡等你
  const inv=lf.inv; if(inv&&!inv.done&&inv.day===S.day&&inv.slot===S.slot) S.where[inv.id]=inv.pid;
  }catch(e){ window.logErr?.("life 換時段",e) } };

/* ---------- ③ 成員之間的小對話泡泡 ---------- */
const BUB={
  practice:[["剛剛那個走位,我們再對一次?","好,這次我數拍子。"],["你的手臂角度好漂亮,教我。","先吃飯再說,我餓了。"],["鏡子裡的我們,好像真的是一個團了。","本來就是啊,笨蛋。"]],
  studio:[["我剛剛那句的換氣聽得出來嗎?","聽不出來,很完美。"],["和聲那裡我們換一下聲部?","可以,你的音色比較適合上面。"]],
  styling:[["這件你穿一定很好看。","真的嗎?那你幫我拍一張。"],["這雙鞋好高……我會不會在台上跌倒?","跌倒了我扶你。"]],
  living:[["這部劇的男主角是不是有點像代表?","……哪裡像?"],["遙控器又不見了。","在你屁股下面。"],["休假的話要不要一起去逛街?","好啊,不過要早點回來練習。"]],
  kitchen:[["這是我做的泡菜鍋,試試看。","……好吃!再給我一碗。"],["偷吃宵夜被代表發現怎麼辦?","那就分他一口。"],["冰箱裡的布丁是誰的?","……是你的嗎?對不起。"]],
  bed:[["今天可以睡你這邊嗎?我房間好冷。","……只有今天喔。"],["你在寫什麼?","秘密日記。不准看。"]],
  store:[["這個新口味要不要試?","你先吃,我看你的表情再決定。"]],river:[["風好舒服……","嗯,好想一直待在這裡。"]]};
const PAIR={"ys-hr":["hr","歐尼最好了~幫我吹頭髮!","ys","頭髮沒吹乾就跑出來,會感冒的。"],"hy-tr":["tr","剛剛的 wave 我們再對一次。","hy","好,這次我跟著你的呼吸。"],"he-hr":["hr","夏恩歐尼,我們來拍挑戰影片!","he","好啊,不過我要站中間~"],
  "tr-ys":["tr","……隊長,今天辛苦了。","ys","你也是,泰梨。"],"he-hy":["he","日和,教我日文的「我愛你」怎麼說!","hy","……是「愛してる」。不要突然問這個。"],"he-ys":["he","歐尼,這個妝適合我嗎?","ys","你畫什麼都好看啦。"],
  "hr-tr":["hr","泰梨歐尼教我 Rap!","tr","……先把舌頭打直。"],"hy-ys":["ys","日和,想家的話隨時跟我說。","hy","……謝謝歐尼。"],"he-tr":["he","泰梨,你笑起來很好看耶,多笑一點嘛。","tr","……不要。"],"hr-hy":["hr","日和歐尼,你的腿怎麼那麼軟!","hy","每天拉筋……你也可以的。"]};
const pk=(a,b)=>[a,b].sort().join("-");
let bubAt=0, bubEl=null;
function bubbleTick(){ if(bubEl&&!bubEl.isConnected) bubEl=null; if(typeof view==="undefined"||view==="map"||paused()||document.hidden||$("#inside")?.classList.contains("hide")) return;
  const now=performance.now(); if(bubEl||now<bubAt) return; bubAt=now+25000+Math.random()*20000;
  const lf=L(); if(lf.bub.day!==S.day) lf.bub={day:S.day,used:[]};
  const rooms=INSIDE[view]?.rooms||[], cand=[];
  for(const rm of rooms){ const p=PL[rm.pid]; if(!p?.open.includes(S.slot)) continue; const ppl=who(rm.pid); if(ppl.length>=2) cand.push([rm,ppl]) }
  if(!cand.length) return; const [rm,ppl]=cand[Math.floor(Math.random()*cand.length)];
  const a=ppl[Math.floor(Math.random()*ppl.length)], b=ppl.filter(x=>x!==a)[Math.floor(Math.random()*(ppl.length-1))];
  let ex=null, key=pk(a.id,b.id);
  if(PAIR[key]&&!lf.bub.used.includes(key)&&Math.random()<.5){ const P=PAIR[key]; ex={k:key,l:[[P[0],P[1]],[P[2],P[3]]]} }
  else { const base=rm.pid.startsWith("bed_")?"bed":rm.pid, pool=(BUB[base]||BUB.living).map((x,i)=>({x,k:base+i})).filter(o=>!lf.bub.used.includes(o.k)); if(!pool.length) return;
    const o=pool[Math.floor(Math.random()*pool.length)]; ex={k:o.k,l:[[a.id,o.x[0]],[b.id,o.x[1]]]} }
  lf.bub.used.push(ex.k);
  const fig=[...document.querySelectorAll("#rooms img.fig")].find(f=>f.alt===byId(ex.l[0][0]).n); if(!fig) return;
  const el=document.createElement("button"); el.className="lbub"; el.style.setProperty("--c",byId(ex.l[0][0]).c);
  el.style.left=fig.style.left; el.style.top=`calc(${fig.style.top} - 1%)`; const t=ex.l[0][1]; el.textContent=t.length>14?t.slice(0,13)+"…":t;
  el.setAttribute("aria-label",`${byId(ex.l[0][0]).n}:${t}(點開看)`);
  el.onclick=ev=>{ ev.stopPropagation(); el.remove(); bubEl=null; window.addBond?.([ex.l[0][0],ex.l[1][0]],.3);
    const card=document.createElement("div"); card.className="lbcard"; card.innerHTML=`<div class="lbin">${ex.l.map(([id,tx])=>`<p style="--c:${byId(id).c}"><b>${byId(id).n}</b>${esc(tx)}</p>`).join("")}<small>點一下關閉</small></div>`;
    card.onclick=()=>card.remove(); $("#stage").appendChild(card); setTimeout(()=>card.remove(),9000) };
  $("#rooms").appendChild(el); bubEl=el; setTimeout(()=>{ if(bubEl===el){ el.classList.add("out"); setTimeout(()=>{ el.remove(); if(bubEl===el) bubEl=null },400) } },9000) }
every(1000,bubbleTick);
})();
