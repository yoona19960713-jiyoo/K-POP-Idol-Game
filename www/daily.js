"use strict";
/* =====================================================================
   改版 1.0「更真實的日常」的共用定義(2026-10-29)
   一天的時段、作息、互動扣的時間、地點、關係段落、隨口互動的動作、深夜的種類、36 種日常活動、里程碑事件,
   以及新內容的示範(長對話與 Gemini 的品質基準)。程式與《改版1.0_新內容格式.md》共用同一份定義:改了要兩邊一起改
   ===================================================================== */
(()=>{
const D={};
/* 一天的五段:遊戲時間(24 小時制,過午夜往上加)與現實分鐘數(一天 36 分鐘) */
D.SLOT_H=[[6,9],[9,12],[12,18],[18,23],[23,30]];
D.SLOT_MIN=[6,7,9,9,5];
D.START="2016-01-13"; D.DEBUT="2017-01-13";
/* 關係段落:A 戒備・信任、B 夥伴・心動、C 戀人以上(出道後) */
D.BANDS={A:["戒備","信任"],B:["夥伴","心動"],C:["戀人","親密","多人親密"]};
D.BAND_N={A:"戒備・信任",B:"夥伴・心動",C:"戀人以上"};
D.bandOf=st=>Object.keys(D.BANDS).find(k=>D.BANDS[k].includes(st))||"A";
D.STAGES=["戒備","信任","夥伴","心動","戀人","親密","多人親密"];
D.rank=st=>D.STAGES.indexOf(st);
/* 房間 → 劇本的地點群(at);1.1 才有背景的地點 */
D.ROOM_AT={practice:"practice",lobby:"practice",studio:"studio",vocal:"studio",office:"office",styling:"styling",photo:"styling",
  living:"dorm",kitchen:"dorm",roof:"dorm",bed_ys:"dorm",bed_tr:"dorm",bed_hy:"dorm",bed_he:"dorm",bed_hr:"dorm",store:"out",river:"out",
  cafe:"out",market:"out",street:"out",mart:"out",court:"out",karaoke:"out"};
D.ROOM_N={practice:"練習室",lobby:"大廳",studio:"錄音室",vocal:"聲樂室",office:"代表辦公室",styling:"造型室",photo:"攝影棚",living:"宿舍客廳",kitchen:"宿舍廚房",roof:"宿舍頂樓",
  bed_ys:"藝瑟的房間",bed_tr:"泰梨的房間",bed_hy:"日和的房間",bed_he:"夏恩的房間",bed_hr:"河嵐的房間",store:"便利商店",river:"漢江邊",
  cafe:"咖啡廳",market:"市場與路邊攤",street:"街道",mart:"超市",court:"球場",karaoke:"卡拉 OK"};
D.ROOM_LATER=["cafe","market","street","mart","court","karaoke"];
/* 隨口互動用的地點分組 */
D.GRP={co:{n:"公司",rooms:["practice","studio","vocal","lobby","styling","photo","office"]},dorm:{n:"宿舍",rooms:["living","kitchen","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"]},out:{n:"外面",rooms:["store","river"]}};
D.grpOf=room=>Object.keys(D.GRP).find(k=>D.GRP[k].rooms.includes(room))||"";
/* 隨口互動的動作 */
D.CA={hello:{n:"打招呼",gate:"戒備",desc:"今天第一次見到她時的招呼"},drink:{n:"遞飲料或零食",gate:"戒備",desc:"你遞飲料、零食給她(或她遞給你)"},
  notice:{n:"注意到她的變化",gate:"戒備",desc:"注意到她換了新衣服、髮型、新東西"},scroll:{n:"一起滑手機",gate:"信任",desc:"湊在一起看她的手機(影片、照片、粉絲留言、好笑的貼文)"},
  five:{n:"擊掌",gate:"信任",desc:"練習完、好消息時擊掌"},pat:{n:"摸頭",gate:"夥伴",desc:"摸摸她的頭"},
  hand:{n:"牽手",gate:"戀人",desc:"牽手(出道後)"},hug:{n:"抱一下",gate:"戀人",desc:"抱一下(出道後)"}};
D.CA_NOW=["hello","drink","notice","scroll","five","pat"];
/* 深夜 */
D.NK={insomnia:{n:"失眠",min:15,rooms:["living","kitchen","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"],desc:"她睡不著,你在客廳、廚房或她房門口遇到她"},
  snack:{n:"宵夜",min:20,rooms:["kitchen","store"],desc:"深夜偷偷煮東西、去便利商店買宵夜"},
  roof:{n:"頂樓談心",min:20,rooms:["roof"],desc:"宿舍頂樓,看著夜景說心裡話"},
  msg:{n:"深夜訊息",min:5,rooms:[],desc:"手機訊息,她深夜傳來的幾句話"}};
D.STATES={tired:"累或壓力大",after_practice:"剛練完",sleepy:"深夜想睡",bright:"心情特別好"};
/* 互動扣的遊戲時間(分) */
D.COST={casual:5,chat:[15,20,30],long:50,night:{insomnia:15,snack:20,roof:20,msg:5},overhear:[0,10],work:{record:120,plan:60,fitting:30}};
/* 36 種日常活動:who 專屬成員(null = 通用)、gate 門檻、rooms 地點、t 可以開始的時間(平日;sun 週日、sat 週六)、min 時長、first 1.0 第一批、later 要 1.1 的背景或狀態、eff 效果、allv 全員版目標 */
const A=(n,menu,who,gate,rooms,t,min,o={})=>({n,menu,who,gate,rooms,t,min,...o});
D.ACTS={
  ys_fangirl:A("追星時間","一起看女團舞台","ys","戒備",["bed_ys","living"],"21~24;週日 14~24",60,{w:[[21,24],[14,24]],eff:"心情"}),
  ys_notebook:A("隊長筆記本","看她的隊長筆記本","ys","戒備",["living","office"],"22~24",60,{w:[[22,24]],first:1,eff:"默契"}),
  ys_drink:A("小酌談心","陪她喝一杯","ys","夥伴",["roof","living"],"週六 23~26",90,{w:[[23,26]],eff:"壓力下降"}),
  ys_care:A("反過來照顧她","照顧她","ys","信任",["bed_ys"],"她累倒或感冒時",60,{w:[[6,30]],later:1,eff:"心情"}),
  tr_earphone:A("分一邊耳機","陪她聽歌","tr","戒備",["studio","bed_tr"],"21~26",60,{w:[[21,26]],first:1,eff:"心情"}),
  tr_rap:A("一起改 rap 詞","一起改詞","tr","信任",["studio","bed_tr"],"20~26",90,{w:[[20,26]],eff:"Rap"}),
  tr_ramen:A("深夜泡麵評鑑","宵夜吃泡麵","tr","戒備",["kitchen","store"],"23~26",60,{w:[[23,26]],eff:"心情"}),
  hy_ballet:A("芭蕾伸展","跟她一起伸展","hy","戒備",["practice"],"06~07",60,{w:[[6,7]],first:1,eff:"舞蹈、表情"}),
  hy_lang:A("語言交換","教她韓語","hy","戒備",["living","lobby"],"20~23;週日 14~22",60,{w:[[20,23],[14,22]],eff:"韓語"}),
  hy_okonomi:A("大阪燒之夜","一起做大阪燒","hy","信任",["kitchen"],"週六 18~21",120,{w:[[18,21]],eff:"默契"}),
  hy_drama:A("一起看韓劇學台詞","陪她看韓劇","hy","戒備",["living"],"21~25;週日 14~24",90,{w:[[21,25],[14,24]],eff:"韓語"}),
  he_kitchen:A("夏恩的廚房","去廚房找她","he","戒備",["kitchen"],"06~07、18~19",60,{w:[[6,7],[18,19]],first:1,eff:"心情"}),
  he_market:A("變裝當普通人","變裝出門","he","信任",["market"],"週日 13~20",120,{w:[[13,20]],later:1,eff:"心情"}),
  he_skincare:A("保養之夜","保養之夜","he","心動",["bed_he"],"22~24",60,{w:[[22,24]],eff:"壓力下降"}),
  he_call:A("打電話給家人","陪她打電話回家","he","夥伴",["bed_he","roof"],"21~23",60,{w:[[21,23]],eff:"心情"}),
  hr_guitar:A("吉他自彈自唱","聽她彈吉他","hr","戒備",["bed_hr","vocal"],"19~24",60,{w:[[19,24]],first:1,eff:"唱功"}),
  hr_sports:A("打球流汗","一起打球","hr","戒備",["court"],"06:30~07:30;週日 14~18",90,{w:[[6.5,7.5],[14,18]],later:1,eff:"壓力下降"}),
  hr_karaoke:A("卡拉 OK 對決","卡拉 OK","hr","信任",["karaoke"],"週六 21~25;週日 14~22",120,{w:[[21,25],[14,22]],later:1,eff:"唱功"}),
  dance:A("一起練舞","陪她練舞",null,"戒備",["practice"],"19~21、06~07",120,{w:[[19,21],[6,7]],first:1,eff:"舞蹈",allv:3}),
  vocal:A("陪練唱","陪她練唱",null,"戒備",["studio","vocal"],"19~21",90,{w:[[19,21]],first:1,eff:"唱功",allv:2}),
  review:A("看練習影片檢討","一起看練習影片",null,"戒備",["practice"],"18~19、21~22",60,{w:[[18,19],[21,22]],eff:"表情",allv:2}),
  outfit:A("幫忙挑衣服","幫她挑衣服",null,"戒備",["styling"],"12~13、18~20",60,{w:[[12,13],[18,20]],eff:"心情",allv:1}),
  starlog:A("拍 STARLOG 照片","幫她拍照",null,"信任",["photo","roof","river"],"9~22",60,{w:[[9,22]],eff:"心情",allv:2}),
  cook:A("一起下廚","一起下廚",null,"戒備",["kitchen"],"18~20;週日 11~20",90,{w:[[18,20],[11,20]],eff:"心情",allv:3}),
  drama:A("客廳追劇","一起追劇",null,"戒備",["living"],"21~25;週日 14~24",90,{w:[[21,25],[14,24]],first:1,eff:"心情",allv:3}),
  movie:A("電影之夜","電影之夜",null,"戒備",["living"],"週六 21~25",120,{w:[[21,25]],eff:"默契",allv:5}),
  boardgame:A("桌遊之夜","玩桌遊",null,"戒備",["living"],"20~24;週日 14~24",90,{w:[[20,24],[14,24]],eff:"默契",allv:5}),
  game:A("打電動","一起打電動",null,"戒備",["living"],"20~25",60,{w:[[20,25]],eff:"心情",allv:2}),
  chores:A("大掃除與洗衣","一起打掃",null,"戒備",["living","kitchen"],"週日 10~13",90,{w:[[10,13]],eff:"默契",allv:5}),
  river:A("漢江散步","去漢江走走",null,"戒備",["river"],"19~23;週日 14~23",60,{w:[[19,23],[14,23]],first:1,eff:"壓力下降",allv:3}),
  store:A("便利商店宵夜","去便利商店",null,"戒備",["store"],"22~26",60,{w:[[22,26]],first:1,eff:"心情",allv:2}),
  cafe:A("咖啡廳","去咖啡廳",null,"戒備",["cafe"],"12~13;週日 13~20",60,{w:[[12,13],[13,20]],later:1,eff:"心情",allv:2}),
  shopping:A("變裝逛街","變裝逛街",null,"信任",["street"],"週日 13~19",120,{w:[[13,19]],later:1,eff:"心情",allv:2}),
  mart:A("超市採買","去超市",null,"戒備",["mart"],"週六 19~22;週日 10~20",60,{w:[[19,22],[10,20]],later:1,eff:"心情",allv:2}),
  run:A("晨跑或健身","一起晨跑",null,"戒備",["river"],"06:30~07:30",60,{w:[[6.5,7.5]],first:1,eff:"舞蹈、壓力下降",allv:3}),
  roof:A("看夜景和星星","去頂樓看夜景",null,"戒備",["roof"],"20~27",60,{w:[[20,27]],first:1,eff:"心情",allv:3})};
D.actBands=k=>{ const a=D.ACTS[k]; if(!a) return []; return Object.keys(D.BANDS).filter(b=>D.rank(D.BANDS[b][D.BANDS[b].length-1])>=D.rank(a.gate)) };
/* 里程碑事件(沿用 event 格式,新的 ev;長對話寫,遊戲沒有內容時用內建的簡短版本) */
D.MILESTONES={   /* 2026-10-29 使用者定案;at = 遊戲分鐘;cine = 前面有過場動畫(cine.js);dur = 花的遊戲時間(分) */
  first_day:{n:"上任第一天",date:"2016-01-13",at:360,room:"practice",cine:1,dur:30},
  first_eval:{n:"第一次月評",date:"2016-01-30",at:900,room:"practice",cine:1,dur:120},
  showcase_in:{n:"第一次公司內部展示",date:"2016-04-22",at:840,room:"practice",cine:1,dur:120},
  group_name:{n:"團名與出道概念確定",date:"2016-06-17",at:840,room:"meeting",cine:0,dur:120,ask:"團名"},
  debut_song:{n:"出道曲定案與錄音",date:"2016-08-19",at:840,room:"studio",cine:1,dur:120},
  chuseok:{n:"中秋夜",date:"2016-09-15",at:1200,room:"roof",cine:1,dur:60,who:["hy"],away:["2016-09-14","2016-09-16"]},
  concept_shoot:{n:"概念照與 MV 拍攝",date:"2016-10-21",at:600,room:"photo",cine:1,dur:240},
  debut_announce:{n:"公布出道日",date:"2016-11-21",at:720,room:"office",cine:1,dur:60,card:1},
  final_eval:{n:"出道前最終評估",date:"2016-12-30",at:900,room:"practice",cine:0,dur:120},
  rehearsal:{n:"Showcase 彩排",date:"2017-01-11",at:900,room:"backstage",cine:1,dur:180}};
/* 作息(給提示詞) */
D.SCHED_TEXT="練習生作息(週一到週六):06:00 起床(夏恩 6 點先起來做早餐;日和 6 點一個人在練習室做芭蕾伸展)→ 07:00 晨間體能(漢江或健身房)→ 08:00 早餐(宿舍)→ 09:00~12:00 個人課,各自分開(日和週一三五外出上韓語課、河嵐外出上聲樂課或在聲樂室、泰梨在錄音室練 Rap、夏恩在攝影棚或造型室、藝瑟在練習室或聲樂室)→ 12:00 午餐(公司)→ 13:00~18:00 團體練習(練習室;週二聲樂、週四錄音、週五評估;每月最後一個週六下午月評)→ 18:00 晚餐 → 19:00~22:00 自主練習、錄音、自由(河嵐留在錄音室練高音到最晚)→ 22:00 後宿舍時間(藝瑟 23:30 左右巡房)→ 0:00~1:00 睡覺(泰梨在房間寫詞到兩三點)。週日上午補眠、下午放假、晚上回宿舍。";
/* 練習生期(2016/01/13~2017/01/13)的世界 */
D.WORLD_2016="這時還沒出道。故事從 2016 年 1 月 13 日代表上任開始,2017 年 1 月 13 日出道,片段可能在這一年裡的任何一天出現,所以只寫一直成立的事;有日期的新聞要等那件事發生之後才能提(遊戲會用 date 條件控制)。2016 年:TWINKLE 是最紅的女團;5 月選秀節目 SPOTLIGHT 99 選出期間限定團 PRISM 9;8 月 NOXVEIL(黑鑽)出道,成員裡有藝瑟以前的同伴;年底起中國市場關閉(限韓令),BLAZE、WONDER POP、SUNNY DAY 從年底開始陸續解散。其他活躍的女團:RADIANT 9、HARMONY、VELVET ROSE、GLOW、PEACH;男團 EXON、NOVA;直播平台 Spotlight Live。2015 年的事(GLOW 爆紅、TWINKLE 選秀出道、中東呼吸症候群)都已經是過去式。遊戲裡只有這五個人和代表,不寫出道組名單或其他練習生。";
/* 作息表(第 3 輪):一天分成好幾段,成員每段在哪裡、在做什麼。
   at 是遊戲分鐘(6:00=360、隔天 0:00=1440);w 是每人可能的地點與權重(all = 五人共用);
   wd 依星期幾換掉 w(0 日 … 6 六);only 是只在某幾天才有的外出課;doing 是每人的事(沒寫就用這段的名稱)。
   位置在這一段裡固定(用日期、段、成員當種子),下雨下雪不去漢江。 */
D.SCHED={
  wk:[
    {at:360,n:"起床",w:{ys:{bedroom:2,kitchen:1},tr:{bedroom:3},hy:{practice:3},he:{kitchen:3},hr:{bedroom:2,kitchen:1}},doing:{hy:"晨間拉筋",he:"做早餐"}},
    {at:420,n:"晨間體能",w:{all:{river:1}},wet:{all:{lobby:1}}},
    {at:480,n:"早餐",w:{all:{kitchen:2,living:1},he:{kitchen:3}}},
    {at:540,n:"個人課",w:{ys:{practice:2,vocal:2},tr:{studio:3,practice:1},hy:{practice:2,"外出:韓語課":3},he:{photo:2,styling:1,"外出:個人拍攝":1},hr:{vocal:2,"外出:聲樂課":3}},
      only:{"外出:韓語課":[1,3,5],"外出:聲樂課":[2,4,6]},doing:{ys:"個人練習",tr:"寫歌、錄 demo",hy:"個人練習",he:"個人課",hr:"練聲"}},
    {at:720,n:"午餐",w:{all:{lobby:2,practice:1}}},
    {at:780,n:"團體練習",w:{all:{practice:1}},wd:{2:{all:{vocal:1}},4:{all:{studio:1}}},wdn:{1:"團體練習・舞蹈",2:"團體練習・聲樂",3:"團體練習・舞蹈",4:"錄音",5:"評估",6:"補強練習"}},
    {at:1080,n:"晚餐",w:{all:{kitchen:2,living:1},he:{kitchen:3}}},
    {at:1140,n:"自主練習",w:{ys:{practice:2,living:1},tr:{studio:2,bedroom:1},hy:{practice:2,living:1},he:{kitchen:1,living:2,styling:1},hr:{vocal:2,studio:1,practice:1}},
      doing:{tr:"寫詞",he:"休息",hr:"練高音"}},
    {at:1320,n:"宿舍時間",w:{ys:{living:2,bedroom:1},tr:{bedroom:2,store:1,roof:1},hy:{living:1,bedroom:2},he:{living:2,kitchen:1},hr:{living:2,store:1,kitchen:1,roof:.6}},doing:{ys:"巡房前的休息"}},
    {at:1440,n:"睡覺",w:{all:{bedroom:1}},doing:{tr:"還在寫詞"}}],
  sun:[
    {at:360,n:"補眠",w:{all:{bedroom:1}},doing:{he:"睡到自然醒"}},
    {at:630,n:"早午餐",w:{all:{kitchen:2,living:2}}},
    {at:720,n:"休假",w:{ys:{living:2,"外出:逛街":1,river:1,roof:.6},tr:{bedroom:2,store:1,"外出:唱片行":1},hy:{living:1,river:1,"外出:咖啡廳":1},he:{kitchen:1,living:1,"外出:逛街":2},hr:{living:1,river:2,store:1}}},
    {at:1080,n:"晚餐",w:{all:{kitchen:2,living:1}}},
    {at:1140,n:"宿舍時間",w:{ys:{living:2,bedroom:1},tr:{bedroom:2,studio:1},hy:{living:2,bedroom:1},he:{living:2,kitchen:1},hr:{living:2,store:1}}},
    {at:1440,n:"睡覺",w:{all:{bedroom:1}},doing:{tr:"還在寫詞"}}]};
/* 互動面板打開時她說的第一句(第 3 輪;A 段 = 戒備・信任,B 段以上 = 夥伴以後) */
D.GREET={
  ys:{A:[["代表好!要找我嗎?","smile"],["啊,代表。今天也辛苦了~","smile"],["代表?……是要說練習的事嗎?","neutral"]],
      B:[["代表~你來啦!","laugh"],["嗯?代表在找我呀?","smile"],["剛好,我也有話想跟你說~","wink"]]},
  tr:{A:[["……代表。","neutral"],["……有事?","neutral"],["嗯。","neutral"]],
      B:[["……你來了。","smile"],["剛好。……我是說,坐。","shy"],["代表。這個拍子,你聽聽看。","neutral"]]},
  hy:{A:[["代表!今天也請多多指教!","laugh"],["啊,代表。有什麼事嗎?","surprise"],["代表……您好。我在聽喔。","smile"]],
      B:[["代表~!好喜歡你今天的外套!","laugh"],["代表,教我一句韓語好不好?","pout"],["啊,是代表。大丈夫です,我不累喔。","smile"]]},
  he:{A:[["代表吃過了嗎?","smile"],["哎唷,代表怎麼來了~","smile"],["代表好~有什麼需要幫忙的嗎?","smile"]],
      B:[["代表~我剛好在想你有沒有吃飯!","laugh"],["哎唷,幹嘛一直看我啦~","shy"],["來得剛好,幫我試吃一口!","wink"]]},
  hr:{A:[["代表!你來啦!","laugh"],["啊,代表!我、我有在認真練喔!","surprise"],["代表好!要聽我唱歌嗎?","laugh"]],
      B:[["代表~!等你好久了!","laugh"],["欸欸代表,你聽我說!","laugh"],["充電時間!代表來得剛好!","wink"]]}};
/* 隨口互動的內建備用(內容庫還沒有那一格時才用;品質照正式內容) */
D.CASUAL_FB={
  ys:{hello:{by:"her",L:[["","(她從筆記本上抬起頭,朝你揮了揮筆。)"],["ys","代表好~練習表我排好了,要看嗎?","smile"]]},
      drink:{by:"me",L:[["","(你遞過去一瓶溫的大麥茶。)"],["ys","欸?給我的?……謝謝。我先分河嵐一半喔。","smile"]]},
      notice:{by:"me",L:[["","(你注意到她的手機殼換成了粉紅色。)"],["ys","被發現了~這是新出的周邊,限量的喔!","laugh"],["ys","……不准笑,這是情報收集。","pout"]]},
      scroll:{by:"her",L:[["","(她把手機轉過來給你看,是一段女團的練習室影片。)"],["ys","你看這裡的換位,好乾淨。我們也做得到。","serious"]]},
      five:{by:"her",L:[["ys","代表!剛剛那遍有對齊吧?","laugh"],["","(她舉起手等你。啪的一聲,她笑得眼睛都瞇起來。)"]]},
      pat:{by:"me",L:[["","(你摸了摸她的頭。她愣住,手上的筆掉到地上。)"],["ys","不、不是啦,我是隊長,應該是我摸大家才對……","shy"]]}},
  tr:{hello:{by:"her",L:[["","(她拿下一邊耳機,看了你一眼。)"],["tr","……嗯。","neutral"],["","(耳機又戴回去了,但音樂好像轉小聲了一點。)"]]},
      drink:{by:"me",L:[["","(你把冰美式放在她手邊。)"],["tr","……你怎麼知道我喝這個。","surprise"],["tr","……謝了。","shy"]]},
      notice:{by:"me",L:[["","(你注意到她換了一副新的耳機。)"],["tr","……二手的。音質比外表好。","neutral"],["tr","跟某人一樣。……開玩笑的。","smile"]]},
      scroll:{by:"her",L:[["","(她把手機推過來,螢幕上是一支洛杉磯街舞的影片。)"],["tr","這個人的 groove,看三秒就知道。","serious"]]},
      five:{by:"me",L:[["","(她看著你舉起的手,停了一秒,才輕輕拍上來。)"],["tr","……Nice。","smile"]]},
      pat:{by:"me",L:[["tr","……幹嘛。","shy"],["","(她嘴上這樣說,頭卻往你手心靠了一點點。)"]]}},
  hy:{hello:{by:"her",L:[["hy","代表!今天的我,也請多多指教!","laugh"]]},
      drink:{by:"me",L:[["","(你遞給她一罐桃子汽水。)"],["hy","哇,這個!日本也有一樣的!好喜歡~","laugh"]]},
      notice:{by:"me",L:[["","(你注意到她圍著一條新的格紋圍巾。)"],["hy","媽媽從大阪寄來的!……代表也想要嗎?","smile"]]},
      scroll:{by:"her",L:[["","(她把手機遞給你,是一部韓劇的截圖。)"],["hy","這句台詞是什麼意思?「你是我的……」後面聽不懂。","pout"]]},
      five:{by:"her",L:[["hy","代表、ハイタッチ!啊,就是擊掌!","laugh"],["","(她踮起腳拍了你的手,轉了半圈才站穩。)"]]},
      pat:{by:"me",L:[["","(你摸了摸她的頭。她眨了眨眼,慢慢低下頭。)"],["hy","……這個,日文叫「よしよし」。我、我很喜歡。","shy"]]}},
  he:{hello:{by:"her",L:[["he","代表~吃飯了沒?沒吃的話我這裡有飯糰!","smile"]]},
      drink:{by:"me",L:[["","(你遞過去一瓶香蕉牛奶。)"],["he","哇,是我小時候最愛的!你怎麼知道~","laugh"]]},
      notice:{by:"me",L:[["","(你注意到她把頭髮紮成了低馬尾。)"],["he","哎唷,看得出來喔?今天懶得吹頭髮啦~","shy"],["he","倒是你,午餐吃了沒?","smile"]]},
      scroll:{by:"her",L:[["","(她把手機轉過來,是媽媽傳來的烤肉店照片。)"],["he","你看,我們家的五花肉!下次帶你去~","laugh"]]},
      five:{by:"her",L:[["he","代表,舉手!……耶~今天的 rap 一次就過了!","laugh"]]},
      pat:{by:"me",L:[["","(你摸了摸她的頭,她瞇起眼睛笑。)"],["he","哎唷……這樣我會想撒嬌欸。","pout"]]}},
  hr:{hello:{by:"her",L:[["hr","代表!你來得剛好,我剛剛高音上去了!","laugh"]]},
      drink:{by:"me",L:[["","(你遞給她一瓶運動飲料。)"],["hr","咕嘟咕嘟——哈!活過來了!謝啦代表!","laugh"]]},
      notice:{by:"me",L:[["","(你注意到她耳朵上換了一個橘子造型的小耳環。)"],["hr","濟州的橘子!外婆送的,很可愛吧?","laugh"]]},
      scroll:{by:"her",L:[["","(她把手機塞到你面前,是一支狗狗跟著唱歌的影片。)"],["hr","牠跟我一樣是高音派的!哈哈哈!","laugh"]]},
      five:{by:"her",L:[["hr","代表!擊掌!用力一點!","laugh"],["","(啪!她甩著手,笑得比誰都大聲。)"]]},
      pat:{by:"me",L:[["","(你摸了摸她亂亂的頭髮。)"],["hr","欸?……再、再一下下。充電中。","shy"]]}}};
/* ---------- 改版 1.1 第 1 輪(2026-10-30):成員之間(旁聽)與冷落的心情 ---------- */
/* 十組兩人(代號照字母排,和 pk() 一樣) */
D.PAIRS=["he-hr","he-hy","he-tr","he-ys","hr-hy","hr-tr","hr-ys","hy-tr","hy-ys","tr-ys"];
/* 兩人之間的關係(Gemini 寫成員之間的對話時用;長對話也照這份) */
D.PAIR_DYN={
  "tr-ys":"同年。藝瑟想照顧所有人,泰梨是最不會接受照顧的那個;泰梨用很短的話回應,卻會默默替隊長分擔(幫她排走位、關練習室的燈)。談工作很有默契,私下藝瑟會逗她、她會耳朵紅。",
  "he-ys":"同年。一個管大家練習、一個管大家吃飯,像宿舍的兩個媽媽;會互相叮嚀對方先休息,私下一起吐槽、一起擔心老么。夏恩看得出藝瑟在硬撐,藝瑟記得夏恩累的時候會笑更大聲。",
  "hy-ys":"藝瑟像姊姊,特別在意日和想家、腳踝的舊傷;日和在藝瑟面前最誠實,會問她韓語單字、偶爾說出「其實不是大丈夫」。",
  "hr-ys":"藝瑟寵老么也管老么(幫她吹頭髮、唸她不吃飯),叫她「我們老么」;河嵐愛撒嬌、愛搶話,被說教會乖乖聽,在藝瑟面前敢說出「是不是插隊」的不安。",
  "he-tr":"同年。夏恩愛逗泰梨笑、愛餵她吃東西;泰梨嘴上嫌煩,最後都會吃完。兩人是 rap 搭檔:泰梨教換氣與拍點,夏恩學得快、也會反過來吐槽她。",
  "hy-tr":"兩個舞者,也都在國外長大(洛杉磯、大阪)。泰梨話少、日和話多,跳舞時靠呼吸和眼神就對得上;日和會問泰梨英文,兩人偶爾聊「在韓國是不是客人」。",
  "hr-tr":"河嵐想學 rap,常纏著泰梨問發音、拍子;泰梨嫌吵,卻每次都教。泰梨的冷笑話和比喻,只有河嵐會大笑;泰梨被她逗到會耳朵紅。",
  "he-hy":"夏恩教日和韓國家常菜和韓劇裡的話是什麼意思,日和教夏恩日文、拉筋;兩人一起追劇。夏恩用慶尚道口音逗日和,日和學得很認真。",
  "he-hr":"吃貨組合。河嵐跟夏恩搶東西吃、找她拍挑戰影片;夏恩把她當妹妹餵,也會叫她去擺碗筷。兩個人一起時最吵、最好笑。",
  "hr-hy":"年紀最小的兩人。日和溫柔、河嵐大聲;河嵐羨慕日和的柔軟度和轉圈,日和羨慕河嵐的直率;兩個都離家(濟州、大阪),想家時會偷偷互相陪。日和叫她「河嵐醬」。"};
/* 成員之間可以發生的房間(依地點分組) */
D.OVH_GRP={co:{n:"公司",rooms:["practice","studio","vocal","lobby","styling","photo"]},dorm:{n:"宿舍",rooms:["living","kitchen","roof","bed_ys","bed_tr","bed_hy","bed_he","bed_hr"]},out:{n:"外面",rooms:["store","river"]}};
D.ovhGrp=room=>Object.keys(D.OVH_GRP).find(k=>D.OVH_GRP[k].rooms.includes(room))||"";
D.OVH_T={co:10,dorm:12,out:4};   // 每組兩人在每個地點群的目標數量(Gemini 自動產;長對話也可以寫)
/* 冷落的心情:連續幾天沒理她(她不在宿舍的假日不算)會分三級;A 段 = 戒備・信任,B/C 段 = 夥伴以上。base 是她心情慢慢回到的基準點 */
D.MISS={A:[4,7,11],B:[3,5,8],C:[3,5,8],base:[60,54,48,42]};
/* 名牌前的徽記:每人一種動物(參考原型給人的印象與她自己的設定) */
D.ANIMAL={ys:"兔子",tr:"貓",hy:"天鵝",he:"小鹿",hr:"小狗"};
/* 示範(好寫的格式;《改版1.0_新內容格式.md》的示範_新內容.json) */
D.DEMO=[{"type":"casual","member":"hr","ca":"drink","by":"me","band":"A","at":"practice","room":"practice","sl":[2],"state":"after_practice","lines":[{"who":"narr","text":"(你把冰過的運動飲料遞過去。她愣了一下才接。)","expr":"neutral"},{"who":"hr","text":"欸?給我的?……謝、謝謝代表!","expr":"surprise"},{"who":"hr","text":"咕嘟咕嘟——哈!活過來了!","expr":"laugh"}],"code":"demo10-casual-drink-hr"},{"type":"casual","member":"he","ca":"hello","by":"her","band":"B","at":"dorm","room":"kitchen","sl":[0],"lines":[{"who":"narr","text":"(她從平底鍋前回頭,鍋鏟還舉在半空。)","expr":"neutral"},{"who":"he","text":"代表早~蛋要全熟還是半熟?過了這秒就只剩全熟喔。","expr":"laugh"}],"code":"demo10-casual-hello-he"},{"type":"casual","member":"tr","ca":"pat","by":"me","band":"B","stage":"心動","at":"dorm","room":"bed_tr","sl":[4],"state":"sleepy","lines":[{"who":"narr","text":"(你的手才碰到她的頭髮,她寫詞的筆就停在半空。)","expr":"neutral"},{"who":"tr","text":"……我不是小狗。","expr":"shy"},{"who":"tr","text":"……手不要拿開。我是說,隨便你。","expr":"shy"}],"code":"demo10-casual-pat-tr"},{"type":"casual","member":"hy","ca":"notice","by":"me","band":"A","stage":"信任","at":"practice","room":"practice","sl":[1,2],"lines":[{"who":"narr","text":"(你指了指她瀏海上的小髮夾。)","expr":"neutral"},{"who":"hy","text":"欸?代表發現了?這是昨天在文具店買的!","expr":"surprise"},{"who":"hy","text":"才三千韓元喔。日本要賣兩倍呢。好喜歡~","expr":"laugh"}],"code":"demo10-casual-notice-hy"},{"type":"casual","member":"ys","ca":"five","by":"her","band":"B","stage":"夥伴","at":"practice","room":"practice","sl":[2],"state":"after_practice","lines":[{"who":"ys","text":"代表!剛剛那遍全員對齊了,你有看到嗎?","expr":"laugh"},{"who":"narr","text":"(她舉起手等你,汗濕的瀏海貼在額頭上。)","expr":"neutral"},{"who":"ys","text":"來,隊長認證的擊掌——耶!","expr":"laugh"}],"code":"demo10-casual-five-ys"},{"type":"night","nk":"insomnia","member":"hy","who":["hy"],"band":"A","stage":"信任","at":"dorm","room":"living","hour":[24,27],"season":"冬","sc":"凌晨一點,客廳只亮著電視的待機燈。日和裹著圍巾縮在沙發一角,膝上攤著寫滿韓文的筆記本。","nodes":[{"key":"start","lines":[{"who":"hy","text":"啊……代表。吵醒您了嗎?","expr":"surprise"},{"who":"hy","text":"明天的韓語小考,單字一直背不進去……","expr":"tired"},{"who":"hy","text":"在房間背會一直想睡。這裡比較冷,比較清醒。","expr":"neutral"}],"choices":[{"text":"「考哪一課?我抽考妳。」","style":"出手幫忙","to":"hy","g":3,"next":"quiz"},{"text":"「睡不著的時候,背也背不進去。」","style":"安慰","to":"hy","g":1,"reply":[{"who":"hy","text":"……說得也是。大丈夫です,再五分鐘就去睡。","expr":"smile"}]}]},{"key":"quiz","lines":[{"who":"narr","text":"(她把筆記本推過來,手指停在一個被圈了三次的單字上。)","expr":"neutral"},{"who":"hy","text":"這個字,字典寫『心裡癢癢的』。","expr":"neutral"},{"who":"hy","text":"可是心裡要怎麼癢?我一直想不通。","expr":"pout"}],"choices":[{"text":"「很期待一件事、期待到睡不著的感覺。」","style":"陪著","to":"hy","g":2,"set":"hyWordItchy","reply":[{"who":"hy","text":"……啊。那我現在也是嗎?因為明天要考試?","expr":"surprise"},{"who":"narr","text":"(她自己說完先笑出聲,又趕緊摀住嘴,怕吵醒大家。)","expr":"neutral"}]},{"text":"「韓劇裡常用。妳上次看的那部,告白前那句。」","style":"開玩笑","to":"hy","g":3,"set":"hyWordItchy","reply":[{"who":"hy","text":"啊——是那句!所以是……喜歡一個人的那種癢?","expr":"shy"},{"who":"hy","text":"我、我去睡了!晚安!","expr":"shy"}]}]}],"code":"demo10-night-insomnia-hy"},{"type":"night","nk":"snack","member":"hr","who":["hr"],"band":"B","stage":"夥伴","period":"練習生期","at":"dorm","room":"kitchen","hour":[24.5,26],"sc":"半夜十二點半,廚房只開著抽油煙機的小燈。河嵐踮著腳站在瓦斯爐前,鍋裡的水剛滾。","nodes":[{"key":"start","lines":[{"who":"hr","text":"噓——!代表你什麼都沒看到!","expr":"surprise"},{"who":"hr","text":"……好啦,我煮兩包。分你一半,你就是共犯了。","expr":"wink"}],"choices":[{"text":"「蛋我來打。」","style":"出手幫忙","to":"hr","g":3,"next":"egg","reply":[{"who":"hr","text":"哇,代表會煮泡麵?看不出來耶!","expr":"surprise"}]},{"text":"「我也餓了。兩包不夠吧?」","style":"開玩笑","to":"hr","g":2,"next":"egg","reply":[{"who":"hr","text":"哈!我就知道代表是自己人!","expr":"laugh"}]},{"text":"「下週就月評了,還吃?」","style":"嚴厲","to":"hr","g":0,"reply":[{"who":"narr","text":"(她拿著湯匙的手停住,安靜了兩秒。)","expr":"neutral"},{"who":"hr","text":"……一半就好。我明天多跑一圈。","expr":"sad"}]}]},{"key":"egg","lines":[{"who":"narr","text":"(你們擠在瓦斯爐前。她從口袋掏出一顆橘子,放在鍋子旁邊。)","expr":"neutral"},{"who":"hr","text":"濟州的。飯後甜點,不准跟藝瑟歐尼說。","expr":"smile"},{"who":"hr","text":"……代表,今天練唱的時候,老師第一次說我不錯。","expr":"shy"}],"choices":[{"text":"「難怪今天要偷煮泡麵慶祝。」","style":"開玩笑","to":"hr","g":2,"reply":[{"who":"hr","text":"對!這是慶功宴!小小的那種!","expr":"laugh"}]},{"text":"「我知道。走廊上都聽得到。」","style":"鼓勵","to":"hr","g":4,"heart":1,"set":"hrPraisedVocal","reply":[{"who":"hr","text":"……真的?你有聽到?","expr":"moved"},{"who":"narr","text":"(她低頭攪著鍋子,攪了好久都沒說話,嘴角一直往上。)","expr":"neutral"}]}]}],"code":"demo10-night-snack-hr"},{"type":"night","nk":"msg","member":"he","who":["he"],"band":"B","stage":"夥伴","hour":[23,25],"nodes":[{"key":"start","lines":[{"who":"he","text":"代表還沒睡嗎?","expr":"smile"},{"who":"he","text":"剛剛跟媽媽視訊,被唸說我瘦了。","expr":"pout"},{"who":"he","text":"……我明明每餐都有吃啊。","expr":"pout"}],"choices":[{"text":"「媽媽說得對。明天中午我盯妳吃。」","style":"嚴厲","to":"he","g":3,"set":"heLunchWatch","reply":[{"who":"he","text":"哎唷~被代表管了。好啦,我會乖乖吃。","expr":"laugh"}]},{"text":"「大邱的媽媽都這樣嗎?」","style":"開玩笑","to":"he","g":3,"reply":[{"who":"he","text":"對!店裡的客人也都被她餵過!","expr":"laugh"},{"who":"he","text":"……下次放假,帶你去吃我家的烤肉。","expr":"smile"}]},{"text":"「早點睡,不要想太多。」","style":"安慰","to":"he","g":1,"reply":[{"who":"he","text":"嗯~晚安,代表。","expr":"smile"}]}]}],"code":"demo10-night-msg-he"},{"type":"act","act":"tr_earphone","member":"tr","who":["tr"],"band":"A","stage":"信任","ver":1,"at":"studio","room":"studio","hour":[21,26],"sc":"晚上十點的錄音室,只有控制台的小燈亮著。泰梨戴著耳機坐在地上,背靠隔音牆,膝上攤著塗改滿滿的歌詞本。","memo":"在錄音室跟泰梨分了一邊耳機,聽她還沒給任何人聽過的 demo。","nodes":[{"key":"start","lines":[{"who":"narr","text":"(她看到你,拿下一邊耳機,沒有起身。)","expr":"neutral"},{"who":"tr","text":"……代表。這裡現在沒人用。","expr":"neutral"},{"who":"tr","text":"我只是……在聽一個東西。","expr":"neutral"}],"choices":[{"text":"(在她旁邊坐下,不說話。)","style":"陪著","to":"tr","g":3,"next":"share"},{"text":"「新歌?可以讓我聽嗎?」","style":"鼓勵","to":"tr","g":1,"next":"share","reply":[{"who":"tr","text":"……還沒好。很爛。","expr":"shy"}]},{"text":"「一個人在這裡開演唱會?」","style":"開玩笑","to":"tr","g":2,"next":"share","reply":[{"who":"tr","text":"……觀眾只有一個。坐吧。","expr":"smile"}]}]},{"key":"share","lines":[{"who":"narr","text":"(她把左邊的耳機遞過來。線很短,只夠兩個人肩膀靠著肩膀。)","expr":"neutral"},{"who":"tr","text":"只聽副歌。聽完不准笑。","expr":"serious"},{"who":"narr","text":"(鼓點很乾,中間有一段她自己哼的旋律,還錄到了翻紙的聲音。)","expr":"neutral"},{"who":"narr","text":"(副歌結束。她一直盯著自己的鞋尖,等你開口。)","expr":"neutral"}],"choices":[{"text":"「副歌第二句,詞是不是改過?」","style":"嚴厲","to":"tr","g":3,"next":"bus","reply":[{"who":"tr","text":"……你聽得出來?改了四次。","expr":"surprise"}]},{"text":"「這個鼓點,跟妳走路的速度好像。」","style":"開玩笑","to":"tr","g":3,"next":"bus","reply":[{"who":"tr","text":"……你平常都在看我走路?","expr":"pout"}]},{"text":"「很好聽,一點都不爛。」","style":"鼓勵","to":"tr","g":1,"next":"bus","reply":[{"who":"tr","text":"……你每一首都會這樣說吧。","expr":"neutral"}]}]},{"key":"bus","lines":[{"who":"tr","text":"在洛杉磯,去舞蹈教室的公車要坐一個小時。","expr":"neutral"},{"who":"tr","text":"副歌都是在公車上寫的。","expr":"neutral"},{"who":"tr","text":"窗外的棕櫚樹,一棵一棵往後跑。","expr":"smile"},{"who":"narr","text":"(她說完才發現自己說太多,視線落回歌詞本。)","expr":"neutral"}],"choices":[{"text":"「所以這首的鼓,是公車的節奏?」","style":"開玩笑","to":"tr","g":3,"reply":[{"who":"tr","text":"……閉嘴。","expr":"laugh"},{"who":"narr","text":"(她的肩膀在抖,是在忍笑。)","expr":"neutral"}]},{"text":"「下一首寫好,也分我一邊。」","style":"陪著","to":"tr","g":3,"set":"trEarNextSong","reply":[{"who":"tr","text":"……看心情。","expr":"shy"},{"who":"narr","text":"(耳機線被她捲在指尖,捲了又放開。)","expr":"neutral"}]}]}],"code":"demo10-act-tr_earphone-tr"},{"type":"act","act":"hy_ballet","member":"hy","who":["hy"],"band":"A","stage":"戒備","ver":1,"at":"practice","room":"practice","hour":[6,7],"season":"冬","sc":"清晨六點,練習室的燈只開了一排。日和扶著把桿,一條腿高高架在上面,呼出的氣在鏡子上起了一小片霧。","memo":"清晨在練習室看日和做芭蕾伸展,她教了你第一個動作。","nodes":[{"key":"start","lines":[{"who":"narr","text":"(她從鏡子裡看到你,腿一下子放了下來。)","expr":"neutral"},{"who":"hy","text":"啊,代表!早、早安!這麼早……您要用練習室嗎?","expr":"surprise"},{"who":"hy","text":"我馬上收好,不會打擾您。","expr":"smile"}],"choices":[{"text":"「不用收。我只是來看看。」","style":"陪著","to":"hy","g":2,"next":"plie","reply":[{"who":"hy","text":"……看我?啊,好的。那、那我繼續了。","expr":"shy"}]},{"text":"「每天都這麼早起來練?很厲害。」","style":"鼓勵","to":"hy","g":3,"next":"plie","reply":[{"who":"hy","text":"芭蕾的習慣……不練的話,身體會生氣。","expr":"smile"}]},{"text":"「我可以一起嗎?雖然腿大概抬不到那裡。」","style":"開玩笑","to":"hy","g":3,"next":"plie","reply":[{"who":"hy","text":"えっ?代表要一起?……好、好啊!","expr":"surprise"}]}]},{"key":"plie","lines":[{"who":"narr","text":"(她示範最基本的動作:手扶把桿,腳尖往外打開,膝蓋慢慢彎下去。)","expr":"neutral"},{"who":"hy","text":"這個叫 plié。韓語的話……嗯,「蹲」?","expr":"neutral"},{"who":"hy","text":"背要像有一條線,從頭頂往上拉。","expr":"serious"},{"who":"narr","text":"(你照著做。她看了一眼,沒忍住笑出聲,又馬上摀住嘴。)","expr":"neutral"}],"choices":[{"text":"「笑出來沒關係。我自己也知道很醜。」","style":"開玩笑","to":"hy","g":3,"next":"ankle","reply":[{"who":"hy","text":"不、不醜!只是……很像剛出生的長頸鹿。","expr":"laugh"}]},{"text":"「哪裡不對?教我。」","style":"出手幫忙","to":"hy","g":3,"next":"ankle","reply":[{"who":"narr","text":"(她走過來,隔著一點距離,用指尖點了點你的肩膀。)","expr":"neutral"},{"who":"hy","text":"這裡,放下來。……對,就是這樣。","expr":"smile"}]},{"text":"「我還是看妳做就好。」","style":"陪著","to":"hy","g":1,"next":"ankle","reply":[{"who":"hy","text":"……好的。","expr":"smile"}]}]},{"key":"ankle","lines":[{"who":"narr","text":"(換到左腳時,她的動作慢了一拍,很輕地皺了一下眉。)","expr":"neutral"},{"who":"hy","text":"啊……沒事的。大丈夫です。","expr":"smile"},{"who":"hy","text":"天氣冷的時候,這裡會比較緊而已。","expr":"neutral"}],"choices":[{"text":"「那今天就伸展到這裡吧。」","style":"安慰","to":"hy","g":2,"set":"hyAnkleNoticed","reply":[{"who":"narr","text":"(她看著自己的腳踝,沉默了一下,才把腳慢慢放下。)","expr":"neutral"},{"who":"hy","text":"……好。明天,我也會在這裡。","expr":"shy"}]},{"text":"「我去拿暖暖包。」","style":"出手幫忙","to":"hy","g":3,"set":"hyAnkleNoticed","reply":[{"who":"hy","text":"……謝謝您。","expr":"shy"},{"who":"narr","text":"(她把暖暖包貼在腳踝上,看著鏡子裡的你們兩個,小聲笑了。)","expr":"neutral"}]},{"text":"「『比較緊』用得很對,韓語進步了。」","style":"轉移話題","to":"hy","g":1,"reply":[{"who":"hy","text":"真的嗎?……嘿嘿,昨天在韓劇學的。","expr":"laugh"}]}]}],"code":"demo10-act-hy_ballet-hy"},{"type":"act","act":"dance","member":"hr","who":["hr"],"band":"A","stage":"信任","ver":1,"at":"practice","room":"practice","hour":[19,22],"sc":"晚上八點,團體練習結束後的練習室。其他人都回宿舍了,河嵐一個人對著鏡子,把副歌那段舞跳了一遍又一遍。","memo":"晚上陪河嵐練舞,幫她把副歌那段的卡點對齊了。","nodes":[{"key":"start","lines":[{"who":"hr","text":"代表!你來得剛好!","expr":"laugh"},{"who":"hr","text":"這段我一直慢半拍。歐尼們說看不出來,可是我自己知道!","expr":"pout"},{"who":"narr","text":"(手機架在水瓶上錄影。畫面裡的她,頭髮全黏在臉上。)","expr":"neutral"}],"choices":[{"text":"「我幫妳數拍。」","style":"出手幫忙","to":"hr","g":3,"next":"count","reply":[{"who":"hr","text":"好!大聲一點喔,我耳朵還在嗡嗡叫!","expr":"laugh"}]},{"text":"「先喝水。妳已經跳多久了?」","style":"安慰","to":"hr","g":3,"next":"count","reply":[{"who":"hr","text":"……一個小時?兩個?哎咕,不知道啦!","expr":"tired"},{"who":"narr","text":"(她一口氣灌了半瓶水,又跳回鏡子前。)","expr":"neutral"}]},{"text":"「歐尼們看不出來,就不算慢。」","style":"轉移話題","to":"hr","g":0,"next":"count","reply":[{"who":"hr","text":"才不是!我要跳到連我自己都看不出來!","expr":"angry"}]}]},{"key":"count","lines":[{"who":"narr","text":"(你拍手打拍子。五、六、七、八——她轉身、定格,汗珠甩到鏡子上。)","expr":"neutral"},{"who":"hr","text":"欸?剛剛那次……是不是對了?","expr":"surprise"},{"who":"hr","text":"再一次!這次你不要拍,我自己來!","expr":"serious"}],"choices":[{"text":"「好。我只看,不出聲。」","style":"陪著","to":"hr","g":2,"next":"last","reply":[{"who":"hr","text":"……嗯!","expr":"serious"}]},{"text":"「剛剛對了。不信妳看影片。」","style":"鼓勵","to":"hr","g":3,"next":"last","reply":[{"who":"hr","text":"真的?……真的耶!咻——!","expr":"laugh"}]}]},{"key":"last","lines":[{"who":"narr","text":"(最後一遍,她跳完整段沒有停。音樂一結束,她直接躺在地板上。)","expr":"neutral"},{"who":"hr","text":"哈……哈……代表,我今天可以吃三碗飯。","expr":"laugh"},{"who":"hr","text":"……謝啦。明天團練,我要讓藝瑟歐尼嚇一跳。","expr":"smile"}],"choices":[{"text":"「三碗太多了,兩碗。」","style":"開玩笑","to":"hr","g":2,"reply":[{"who":"hr","text":"兩碗半!不能再少了!","expr":"laugh"}]},{"text":"「妳本來就跳得很好,只是自己不知道。」","style":"鼓勵","to":"hr","g":3,"reply":[{"who":"narr","text":"(她用手臂遮住眼睛,嘴角卻藏不住。)","expr":"neutral"},{"who":"hr","text":"……幹嘛突然這樣說啦。","expr":"shy"}]}]}],"code":"demo10-act-dance-hr"},{"type":"event","ev":"first_day","pair":"all","who":["ys","tr","hy","he","hr"],"stage":"","period":"練習生期","at":"practice","room":"practice","hour":[13,18],"sc":"2016 年 1 月 13 日,下午一點。你第一次推開四樓練習室的門,音樂正好停下,鏡子前的五個人同時轉過頭來。","nodes":[{"key":"start","lines":[{"who":"ys","text":"啊——是代表!大家,快、快集合!","expr":"surprise"},{"who":"narr","text":"(五個人很快排成一排。藝瑟站在最前面,其他人站得有點參差。)","expr":"neutral"},{"who":"ys","text":"代表好!我是隊長徐藝瑟。我們一直在等您。","expr":"smile"},{"who":"tr","text":"……尹泰梨。","expr":"neutral"},{"who":"hy","text":"早瀨日和です!啊、不對,我是早瀨日和!請多指教!","expr":"laugh"},{"who":"he","text":"韓夏恩!代表吃過午餐了嗎?","expr":"smile"},{"who":"hr","text":"姜河嵐!我、我才來兩個月,可是我唱歌很大聲!","expr":"serious"},{"who":"narr","text":"(夏恩在後面輕輕拉了一下河嵐的袖子。)","expr":"neutral"}],"choices":[{"text":"「從今天起,我陪妳們走到出道。」","style":"鼓勵","to":"ys","g":2,"set":"ysFirstDayPromise","next":"talk","reply":[{"who":"narr","text":"(藝瑟的笑容停了半秒,又馬上回來。)","expr":"neutral"},{"who":"ys","text":"……是!我們會努力的!","expr":"smile"}]},{"text":"「先不用排隊。剛剛那段,能再跳一次嗎?」","style":"嚴厲","to":"tr","g":2,"next":"dance","reply":[{"who":"tr","text":"……現在?","expr":"surprise"},{"who":"ys","text":"好!大家,從副歌開始!","expr":"laugh"}]},{"text":"「河嵐,唱歌很大聲是好事。」","style":"鼓勵","to":"hr","g":3,"next":"talk","reply":[{"who":"narr","text":"(河嵐的臉一下子亮了起來。夏恩在她後面偷偷比了個讚。)","expr":"neutral"}]}]},{"key":"dance","lines":[{"who":"narr","text":"(音樂重新響起。第一個八拍,五個人整齊得不像練習生。)","expr":"neutral"},{"who":"narr","text":"(只有轉身那一下,日和慢了一點點。她自己咬了一下嘴唇。)","expr":"neutral"},{"who":"ys","text":"……就是這樣!代表覺得呢?","expr":"smile"}],"choices":[{"text":"「轉身那裡,日和不用急。大家會等妳。」","style":"鼓勵","to":"hy","g":3,"set":"hyFirstDayTurn","reply":[{"who":"hy","text":"……はい。謝謝您。","expr":"shy"},{"who":"narr","text":"(泰梨看了日和一眼,沒說話,把自己的位置往後挪了半步。)","expr":"neutral"}]},{"text":"「整齊得不像練習生。」","style":"鼓勵","to":"ys","g":2,"reply":[{"who":"ys","text":"嘿嘿,我是隊長嘛!","expr":"laugh"},{"who":"he","text":"明明昨天還被老師唸到快哭的人……","expr":"wink"},{"who":"ys","text":"夏恩!","expr":"shy"}]}]},{"key":"talk","lines":[{"who":"he","text":"那……我們以後就叫您代表,可以嗎?","expr":"smile"},{"who":"tr","text":"……本來就叫代表。","expr":"neutral"},{"who":"hr","text":"代表!代表!叫起來好像在演電視劇耶!","expr":"laugh"},{"who":"narr","text":"(泰梨用手肘輕輕撞了她一下。)","expr":"neutral"}],"choices":[{"text":"「叫什麼都好。妳們想成為什麼樣的團?」","style":"鼓勵","to":"ys","g":3,"set":"grpFirstDayDream","reply":[{"who":"narr","text":"(五個人互看了一眼。)","expr":"neutral"},{"who":"ys","text":"……讓人記住名字的團。","expr":"serious"},{"who":"tr","text":"不是只看臉的團。","expr":"serious"},{"who":"hr","text":"每天都有人在聽我們的歌的團!","expr":"laugh"}]},{"text":"「先去吃飯吧。今天我請。」","style":"出手幫忙","to":"he","g":2,"reply":[{"who":"he","text":"哇~代表最好了!先吃飯再說!","expr":"laugh"},{"who":"hr","text":"耶!三碗!","expr":"laugh"}]}]}],"code":"demo10-event-first_day-all"},{"type": "overhear", "code": "demo10-overhear-he-hr", "pair": "he-hr", "who": ["he", "hr"], "room": "kitchen", "hour": [18, 23], "sc": "(還沒走近,就聽見夏恩和河嵐的聲音,還有鍋鏟碰到平底鍋的聲響。)", "lines": [{"who": "hr", "text": "夏恩歐尼,一口就好。真的只要一口。", "expr": "pout"}, {"who": "he", "text": "妳剛剛也說一口,結果一整片煎餅不見了。", "expr": "laugh"}, {"who": "hr", "text": "那是試味道!主唱的舌頭也要暖身啊!", "expr": "laugh"}, {"who": "he", "text": "哪有這種暖身。……好啦,張嘴。", "expr": "smile"}, {"who": "hr", "text": "啊——燙燙燙!好吃!歐尼是天才!", "expr": "laugh"}, {"who": "he", "text": "我知道~所以妳去擺碗筷,快點。", "expr": "wink"}], "join": {"nodes": [{"key": "start", "lines": [{"who": "hr", "text": "代表!你來得剛好,夏恩歐尼在煎海鮮煎餅!", "expr": "laugh"}, {"who": "he", "text": "哎唷,被看到了~代表吃過了嗎?", "expr": "smile"}], "choices": [{"text": "「我也來試味道,一口就好。」", "style": "開玩笑", "to": "he", "g": 3, "next": "b", "reply": [{"who": "he", "text": "你們兩個都一樣啦!……坐下,我切給你。", "expr": "laugh"}]}, {"text": "(幫河嵐把碗筷擺好。)", "style": "出手幫忙", "to": "hr", "g": 2, "bw": "he", "bv": 1, "next": "b", "reply": [{"who": "hr", "text": "代表幫我!這樣歐尼就不能唸我了!", "expr": "laugh"}]}, {"text": "「河嵐,剛剛偷吃了幾片?」", "style": "開玩笑", "to": "hr", "g": 1, "next": "b", "reply": [{"who": "hr", "text": "……一片半。半片是歐尼餵的,不算!", "expr": "pout"}]}]}, {"key": "b", "lines": [{"who": "he", "text": "剛好最後一片,邊邊最脆的給你。", "expr": "smile"}, {"who": "hr", "text": "欸?最脆的不是說好給我嗎?", "expr": "surprise"}], "choices": [{"text": "(把最脆的邊撕一半給河嵐。)", "style": "陪著", "to": "hr", "g": 3, "bw": "he", "bv": 1, "reply": [{"who": "hr", "text": "代表最好了!……歐尼是第二好!", "expr": "laugh"}, {"who": "he", "text": "什麼第二好啦!", "expr": "laugh"}]}, {"text": "「做菜的人先吃。夏恩先。」", "style": "鼓勵", "to": "he", "g": 3, "reply": [{"who": "he", "text": "……被這樣說,有點不好意思欸。", "expr": "shy"}, {"who": "hr", "text": "好啦,歐尼先。下一片是我的!", "expr": "smile"}]}]}]}}];
window.DAILY=D;
})();
