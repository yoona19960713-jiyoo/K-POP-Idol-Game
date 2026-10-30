"use strict";
/* =====================================================================
   日常活動(改版 1.0 第 4 輪)
   互動面板的「邀她做…」:列出「現在」能跟她一起做的活動(她的關係到門檻、時間在活動的時段內、
   地點開著、今天還沒跟她做過這件事;1.0 第一批 12 種一定列,其他種類要內容庫有她的版本才列)。
   選了 → 兩個人一起到活動的地點(visitAct)→ 演活動的劇情(內容庫的 act,同版本先演沒看過的;
   沒有就用下面的內建版本)→ 結束時扣活動時長、套效果(心情、壓力、技能)、記一筆活動紀錄(S.actLog)
   ===================================================================== */
(()=>{
const DY=window.DAILY;
const WD=["日","一","二","三","四","五","六"];
/* 活動可以開始的時間:「21~24;週日 14~24」→ [{days,from,to}](遊戲分鐘,過午夜往上加) */
const WIN={};
function windows(k){ if(WIN[k]) return WIN[k]; const a=DY.ACTS[k]; const out=[];
  for(let seg of String(a.t||"").split(";")){ seg=seg.trim(); if(!seg) continue; let days=null; const m=seg.match(/^週([日一二三四五六])\s*/); if(m){ days=[WD.indexOf(m[1])]; seg=seg.slice(m[0].length) }
    for(const r of seg.split("、")){ const p=r.split("~").map(x=>{ const [h,mm]=x.trim().split(":").map(Number); return h*60+(mm||0) }); if(p.length!==2||p.some(isNaN)) continue;
      let f=p[0]<360?p[0]+1440:p[0], t=p[1]; while(t<=f) t+=1440; out.push({days,from:f,to:t}) } }
  return WIN[k]=out }
const rank=st=>DY.rank?DY.rank(st):(window.STAGE_RANK||[]).indexOf(st);
const hasLib=(k,id)=>snips().some(sn=>sn.type==="act"&&sn.act===k&&(sn.member===id||sn.who?.[0]===id));
const doneKey=(k,id)=>S.day+"|"+k+"|"+id;
window.actsFor=id=>{ const st=stageOf(id), wd=dateOf(S.day).getDay(), out=[];
  for(const [k,a] of Object.entries(DY.ACTS)){ if(a.later||(a.who&&a.who!==id)||rank(st)<rank(a.gate)) continue;
    if(!a.first&&!hasLib(k,id)) continue;
    if(!windows(k).some(w=>(!w.days||w.days.includes(wd))&&S.min>=w.from&&S.min<w.to)) continue;
    if(S.actDone?.[doneKey(k,id)]) continue;
    const ok=x=>PL[x]?.open.includes(S.slot)&&!(x.startsWith("bed_")&&x!=="bed_"+id);
    const room=a.rooms.find(x=>x===S.where[id]&&ok(x))||a.rooms.find(ok); if(!room) continue;
    out.push({k,a,room}) }
  return out.sort((x,y)=>(y.a.who?1:0)-(x.a.who?1:0)) };   // 她專屬的排前面
/* ---------- 內建版本(內容庫還沒有時用;品質照正式內容) ---------- */
const N=(t)=>["",t];
const EXC={
  ys_notebook:{sc:"晚上十點的客廳,其他人都回房了。藝瑟盤腿坐在沙發上,膝上攤著一本貼滿便利貼的筆記本。",memo:"深夜在客廳看了藝瑟的隊長筆記本,每個人都有一頁,只有她自己沒有。",
    nodes:{start:{L:[N("(她看到你,下意識把筆記本闔起來,又慢慢打開。)"),["ys","代表……要看嗎?這是我的隊長筆記本。","shy"],["ys","每個人今天練得怎樣、誰心情不好,我都會記下來。","smile"]],
      C:[{t:"(坐到她旁邊,一頁一頁慢慢看。)",s:"陪著",to:"ys",g:3,next:"b"},{t:"「這麼多……你自己的那頁呢?」",s:"安慰",to:"ys",g:3,next:"b",r:[["ys","……我的?我沒有寫自己耶。","surprise"]]},
        {t:"「隊長的情報網,比公司還厲害。」",s:"開玩笑",to:"ys",g:2,next:"b",r:[["ys","那當然~這可是機密文件。","wink"]]}]},
      b:{L:[N("(日和那一頁寫著:「想家。週日記得問她要不要視訊。」)"),["ys","大家都很努力。我只是……不想讓她們一個人撐著。","smile"],["ys","今天謝謝你陪我看。下次……我也幫代表記一頁好了。","laugh"]],C:[]}}},
  tr_earphone:{sc:"深夜的錄音室只剩控制台的小燈。泰梨戴著耳機坐在地上,膝上攤著寫滿塗改的歌詞本。",memo:"深夜在錄音室跟泰梨分了一邊耳機,聽她改編媽媽常哼的歌。",
    nodes:{start:{L:[N("(她看到你,拿下一邊耳機,沒有起身。)"),["tr","……代表。我在聽一個東西。","neutral"]],
      C:[{t:"(在她旁邊坐下,不說話。)",s:"陪著",to:"tr",g:3,next:"b"},{t:"「新歌?可以讓我聽嗎?」",s:"鼓勵",to:"tr",g:2,next:"b",r:[["tr","……還沒好。很爛。","shy"]]},
        {t:"「一個人在這裡開演唱會?」",s:"開玩笑",to:"tr",g:2,next:"b",r:[["tr","……觀眾只有一個。坐吧。","smile"]]}]},
      b:{L:[N("(她把左邊的耳機遞過來。線很短,只夠兩個人肩膀靠著肩膀。)"),["tr","只聽副歌。聽完不准笑。","serious"],N("(耳機裡是一段很安靜的旋律,跟她平常寫的 rap 完全不一樣。)"),["tr","……我媽以前常哼的歌。我把它改了一下。","shy"]],C:[]}}},
  hy_ballet:{sc:"清晨六點的練習室,窗外天還灰灰的。日和扶著把桿,腳尖輕輕點地。",memo:"清晨六點陪日和做芭蕾伸展,她說那是跟自己說話的時間。",
    nodes:{start:{L:[N("(她從鏡子裡看到你,有點驚訝地轉過身。)"),["hy","代表?這麼早……啊,おはようございます!","surprise"],["hy","我每天早上都會做芭蕾伸展。代表要一起嗎?","smile"]],
      C:[{t:"(在她旁邊扶著把桿,跟著做。)",s:"陪著",to:"hy",g:3,next:"b",r:[["hy","代表的腿……好硬喔。慢慢來就好。","laugh"]]},{t:"「你的線條好漂亮,教我。」",s:"鼓勵",to:"hy",g:2,next:"b",r:[["hy","真的嗎?那、那我教你第一個動作。","shy"]]},
        {t:"「每天這麼早,不累嗎?」",s:"安慰",to:"hy",g:2,next:"b",r:[["hy","累……可是這是我跟自己的約定。","smile"]]}]},
      b:{L:[N("(她教你最基本的一位手,自己做了一整組慢板。動作安靜得像在水裡。)"),["hy","小時候老師說,芭蕾是跟自己說話的時間。","smile"],["hy","今天……第一次有人一起。謝謝代表。","shy"]],C:[]}}},
  he_kitchen:{sc:"宿舍廚房飄著麻油和白飯的香味。夏恩綁著圍裙,在瓦斯爐前忙來忙去。",memo:"在宿舍廚房幫夏恩做飯,她說代表的份永遠會多留一碗。",
    nodes:{start:{L:[N("(她回頭,手上還拿著鍋鏟。)"),["he","代表!來得剛好,幫我試吃!","laugh"],["he","這是我媽媽的拌飯醬,我照記憶做的……不知道像不像。","smile"]],
      C:[{t:"(嚐一口,認真地說好吃。)",s:"鼓勵",to:"he",g:3,next:"b",r:[["he","真的?!太好了……跟我媽做的一樣嗎?","laugh"]]},{t:"(捲起袖子,幫她洗菜。)",s:"出手幫忙",to:"he",g:3,next:"b",r:[["he","哎唷,代表還會洗菜喔?加分加分~","wink"]]},
        {t:"「你每天這樣照顧大家,誰照顧你?」",s:"安慰",to:"he",g:2,next:"b",r:[["he","……幹嘛突然這樣說啦。","shy"]]}]},
      b:{L:[N("(五個人的飯和小菜擺滿了餐桌。她把最大的那碗推到你面前。)"),["he","在家的時候都是媽媽煮給我吃。現在換我煮給大家。","smile"],["he","代表的份,我永遠會多留一碗喔。","wink"]],C:[]}}},
  hr_guitar:{sc:"河嵐的房間門半開著,裡面傳來有點走音的吉他聲。床上散著寫滿和弦的筆記。",memo:"在河嵐房間聽她彈唱外婆教的濟州老歌,第一次從頭唱到尾。",
    nodes:{start:{L:[N("(她看到你,吉他差點掉下來。)"),["hr","代、代表!你什麼時候來的!","surprise"],["hr","我在練一首濟州的老歌……外婆教我的。要聽嗎?","shy"]],
      C:[{t:"(坐在地板上,安靜聽她彈唱。)",s:"陪著",to:"hr",g:3,next:"b"},{t:"「彈錯也沒關係,我想聽完整的。」",s:"鼓勵",to:"hr",g:3,next:"b",r:[["hr","……那、那我從頭來一次!","laugh"]]},
        {t:"「這首歌有什麼故事嗎?」",s:"安慰",to:"hr",g:2,next:"b",r:[["hr","外婆說,想家的時候就唱這首。","smile"]]}]},
      b:{L:[N("(她唱得很大聲,第三段還是彈錯了一個和弦,但她笑著唱完了。)"),["hr","嘿嘿……今天第一次從頭唱到尾!","laugh"],["hr","下次換代表學!我教你,用外婆教我的那種教法!","laugh"]],C:[]}}}};
/* 通用活動:場景、開頭、三個選項、結尾是共用的,她說的話每人一句(開頭、結尾) */
const GEN={
  dance:{sc:"晚上的練習室只剩鏡子前一盞燈,音響還在循環同一段副歌。",in:"(她看到你,把音樂調小了一點。)",out:"(兩個小時過去,鏡子上全是霧氣。她癱坐在地板上,笑著喘氣。)",memo:"陪{名}在練習室練了兩小時的舞。",
    C:[["(站在鏡子旁,幫她數拍子。)","陪著",3],["「最後那個停頓很漂亮,再來一次。」","鼓勵",2],["「手再收一點,線條會更乾淨。」","嚴厲",2]],
    s:{ys:["代表來得剛好,幫我看一下這段走位!","laugh"],tr:["……副歌第二個八拍,你看我的手。","serious"],hy:["代表!這個轉圈,我想再乾淨一點。","smile"],he:["哎唷,被看到我在偷懶了~來一起跳!","laugh"],hr:["代表你看!我今天腳終於沒打結了!","laugh"]},
    e:{ys:["有你在旁邊數拍,好像比較不會亂掉。謝謝~","smile"],tr:["……今天跳得還可以。是你數拍數得準。","smile"],hy:["謝謝代表。明天我會更好的。","smile"],he:["累死了~可是好開心!代表明天也要來喔!","laugh"],hr:["我今天一次都沒撞到人!代表有看到嗎!","laugh"]}},
  vocal:{sc:"小燈亮著,琴鍵上放著一瓶溫水。",in:"(她試了幾個音,回頭看你。)",out:"(一個半小時後,她的聲音有點啞,眼睛卻是亮的。)",memo:"陪{名}練了一個半小時的歌。",
    C:[["(閉上眼睛,安靜地聽她唱完。)","陪著",3],["「這句很好,情緒再多一點就完美了。」","鼓勵",2],["「第三句的音有點飄,再一次。」","嚴厲",2]],
    s:{ys:["代表要聽我練唱嗎?不准笑喔~","smile"],tr:["……幫我聽一下這句的換氣。","neutral"],hy:["韓語的發音……代表可以幫我聽嗎?","shy"],he:["這首我想唱得更溫柔一點,代表聽聽看?","smile"],hr:["代表!你聽我這個高音!","laugh"]},
    e:{ys:["唱給一個人聽,比唱給鏡子聽緊張多了……可是很開心。","shy"],tr:["……剛剛那遍,存起來。我要聽。","smile"],hy:["我的韓語,有比較好一點了嗎?……真的嗎?太好了。","laugh"],he:["下次換代表唱給我聽~不准逃!","wink"],hr:["嗓子有點啞了……可是最後那個音超讚的對吧!","laugh"]}},
  drama:{sc:"客廳只開了一盞落地燈,電視正演到最新一集,桌上有一包拆開的洋芋片。",in:"(她往旁邊挪了一點,拍拍沙發。)",out:"(片尾曲響起時,已經過了一個半小時。洋芋片只剩碎屑。)",memo:"跟{名}在客廳追了一集劇。",
    C:[["(坐下來,跟她一起安靜地看。)","陪著",3],["「這個反派等一下一定會反轉。」","開玩笑",2],["(她看哭的時候,遞一張衛生紙過去。)","安慰",3]],
    s:{ys:["代表也一起看嘛,這集超重要的!","laugh"],tr:["……坐。不要劇透。","neutral"],hy:["代表,這個男主角說的話……我只聽懂一半。","pout"],he:["快快快,要開始了!洋芋片分你~","laugh"],hr:["代表看過這部嗎?女主角超帥的!","laugh"]},
    e:{ys:["好好哭……代表不准跟別人說我哭了喔。","shy"],tr:["……結局還行。下一集一起看?","smile"],hy:["今天聽懂了好多句!代表是最好的老師!","laugh"],he:["下一集明天播!代表要再來喔,說好了!","wink"],hr:["那個打鬥超帥!我也想學!……代表別笑啦!","laugh"]}},
  river:{sc:"漢江邊的風帶著水氣,對岸的燈一盞一盞亮起來。",in:"(你們沿著河岸慢慢走。)",out:"(走了一個小時,你們坐在長椅上看了一會兒河。)",memo:"跟{名}去漢江散了一個小時的步。",
    C:[["(配合她的步伐,慢慢走。)","陪著",3],["「最近練習還好嗎?」","安慰",2],["「等你們出道,這裡會有你們的廣告看板。」","鼓勵",2]],
    s:{ys:["好久沒有這樣什麼都不想,只是走路了。","smile"],tr:["……這裡比宿舍安靜。","neutral"],hy:["在大阪的時候,我也常常去河邊散步。","smile"],he:["代表你看,那邊的橋在變顏色耶!","laugh"],hr:["代表!我們比賽走到那個路燈!……開玩笑的啦!","laugh"]},
    e:{ys:["跟代表散步,壓力好像都被風吹走了。","smile"],tr:["……下次還來。我是說,如果你有空。","shy"],hy:["今天的河,比大阪的還漂亮。因為……沒什麼。","shy"],he:["回去的路上買杯熱可可好不好?我請客~","laugh"],hr:["好舒服喔~明天練習我一定精神百倍!","laugh"]}},
  store:{sc:"便利商店的燈在深夜特別亮,收銀台旁的關東煮冒著熱氣。",in:"(她在零食架前猶豫了很久。)",out:"(你們坐在店外的小桌子,一起吃完了宵夜。)",memo:"深夜跟{名}去便利商店吃宵夜。",
    C:[["「今天練得很辛苦,吃一個沒關係。」","鼓勵",3],["「就一個,明天晨跑多跑一圈。」","開玩笑",2],["(拿起她猶豫最久的那個,放進籃子。)","出手幫忙",3]],
    s:{ys:["代表,一個就好……經紀人不會發現吧?","pout"],tr:["……這個口味的泡麵,還沒吃過。","neutral"],hy:["這是日本的零食!在韓國也買得到耶!","laugh"],he:["宵夜就要吃熱熱的~代表要關東煮嗎?","smile"],hr:["代表!我們買兩個,吃一半一半!","laugh"]},
    e:{ys:["這是我們的秘密喔。……謝謝代表。","wink"],tr:["……評分:七分。下次換你選。","smile"],hy:["好懷念的味道……謝謝代表。","smile"],he:["吃飽了好幸福~代表果然最懂我!","laugh"],hr:["好吃!明天、明天我會多跑一圈的!","laugh"]}},
  run:{sc:"清晨的漢江邊,天才剛亮,空氣冷得看得見呼吸。",in:"(她邊熱身邊回頭看你。)",out:"(跑完一圈,太陽剛好從對岸的大樓後面升起來。)",memo:"清晨跟{名}在漢江邊晨跑。",
    C:[["(跟在她旁邊,配合她的呼吸。)","陪著",3],["「最後一段,衝刺!」","鼓勵",2],["(她慢下來時,把水遞給她。)","出手幫忙",2]],
    s:{ys:["代表也要跑嗎?那我配合你的速度~","smile"],tr:["……跟得上嗎?","neutral"],hy:["早晨的空氣好舒服!","laugh"],he:["哈——好冷!跑完要一起吃早餐喔!","laugh"],hr:["代表!比賽!輸的人請喝香蕉牛奶!","laugh"]},
    e:{ys:["早上跟代表一起跑步,一整天都會很順利吧。","smile"],tr:["……你喘成這樣還敢跑。明天繼續。","smile"],hy:["日出好美……今天也要加油!","laugh"],he:["回去我煮早餐,代表的份多煎一顆蛋!","laugh"],hr:["我贏了!香蕉牛奶!……好啦,下次再比!","laugh"]}},
  roof:{sc:"宿舍頂樓的小燈泡亮著,遠處的城市像一片發光的海。",in:"(她靠著欄杆,抬頭看天空。)",out:"(風有點涼。你們在頂樓待了快一個小時,誰都沒有急著下樓。)",memo:"跟{名}在宿舍頂樓看了一個小時的夜景。",
    C:[["(站在她旁邊,一起看夜景。)","陪著",3],["「想家嗎?」","安慰",3],["「總有一天,那些燈裡會有你們的看板。」","鼓勵",2]],
    s:{ys:["首爾的星星好少喔……可是燈好多。","smile"],tr:["……這裡是我發現的。你是第二個知道的人。","neutral"],hy:["代表,日本也看得到同一個月亮呢。","smile"],he:["好安靜~在這裡什麼都不用想。","smile"],hr:["代表你看!那顆最亮的是星星?還是飛機?","laugh"]},
    e:{ys:["跟代表在這裡,好像什麼煩惱都變小了。","smile"],tr:["……下次想來,就來。我不會趕你。","shy"],hy:["今天的月亮,我會記得的。","smile"],he:["冷了吧?下去我泡熱可可給你~","smile"],hr:["我以後出道了,也要常常上來看!跟代表一起!","laugh"]}}};
function fallback(k,id){ const base={code:"fbact-"+k+"-"+id,type:"act",act:k,member:id,who:[id],cd:0};
  if(EXC[k]) return {...base,...EXC[k]};
  const G=GEN[k]; if(!G||!G.s[id]) return null; const m=byId(id);
  return {...base,sc:G.sc,memo:G.memo.replace("{名}",m.n),nodes:{start:{L:[N(G.in),[id,...G.s[id]]],C:G.C.map(([t,s,g])=>({t,s,to:id,g,next:"b"}))},b:{L:[N(G.out),[id,...G.e[id]]],C:[]}}} }
/* 內容庫:她的版本、關係段落對、地點對(有寫的話),沒看過的版本優先 */
function fromLib(k,id,room){ const band=DY.bandOf(stageOf(id)), st=stageOf(id);
  const L=snips().filter(sn=>sn.type==="act"&&sn.act===k&&(sn.member===id||sn.who?.[0]===id)&&(!sn.band||sn.band===band)&&(!sn.stage||rank(st)>=rank(sn.stage))&&(!sn.room||sn.room===room)&&dateOk(sn)&&sn.nodes?.start);
  if(!L.length) return null; const fresh=L.filter(sn=>S.seen[sn.code]==null); return fillVars(pickW(fresh.length?fresh:L)) }
const SKM={舞蹈:"dance",唱功:"vocal",Rap:"rap",表情:"expr",韓語:"kor"};
window.actPlay=(k,id,room)=>{ const a=DY.ACTS[k]; if(!a){ menu(); return } const sn=fromLib(k,id,room)||fallback(k,id);
  if(!sn){ narr(`你和${byId(id).n}一起${a.menu}。`); finish(k,id,null); menu(); return }
  play(sn,()=>{ finish(k,id,sn); menu() }) };
function finish(k,id,sn){ const a=DY.ACTS[k], s=S.m[id], e=a.eff||"", got=[];
  (S.actDone=S.actDone||{})[doneKey(k,id)]=1; for(const key of Object.keys(S.actDone)) if(+key.split("|")[0]<S.day-1) delete S.actDone[key];
  if(e.includes("心情")){ s.mood=clamp(s.mood+8,0,100); got.push("心情 +8") }
  if(e.includes("壓力下降")){ s.stress=clamp(s.stress-12,0,100); got.push("壓力 −12") }
  for(const [n,sk] of Object.entries(SKM)) if(e.includes(n)&&S.skill?.[id]){ S.skill[id][sk]=Math.min(100,(S.skill[id][sk]||0)+.6); got.push(n+" ↑") }
  if(e.includes("默契")) window.applyGain?.(id,{s:"陪著",g:1,to:id},()=>{});
  got.forEach((t,i)=>setTimeout(()=>window.fx?.(id,t),i*350));
  (S.actLog=S.actLog||[]).push({d:S.day,k,id,m:sn?.memo||`和${byId(id).n}一起${a.menu}。`}); if(S.actLog.length>300) S.actLog.splice(0,S.actLog.length-300);
  const used=window.spendTime?.(a.min,"活動")||0; if(used) toast2(`「${a.n}」・花了 ${fmtMin(used)}`); save(true) }
window.actWindows=windows;
/* 從互動面板開始:她跟你一起過去(作息表的位置先蓋掉,到下一段才回作息) */
window.actStart=(id,k)=>{ const it=window.actsFor(id).find(x=>x.k===k); if(!it){ toast2("現在不能做這件事了"); return } S.where[id]=it.room; if(S.doing) S.doing[id]=it.a.n; window.visitAct(it.room,id,k) };
})();
