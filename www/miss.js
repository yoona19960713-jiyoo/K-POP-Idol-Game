"use strict";
/* =====================================================================
   冷落的心情(改版 1.1 第 1 輪,2026-10-30)
   連續幾天沒理某個人(她在宿舍、公司,但你一次都沒跟她互動),她的心情會慢慢往下,而且會用自己的方式說出來。
   輕微、沒有懲罰:不扣好感、不會倒退關係階段;你再去找她,心情就回來,她會說一句話。
   ・「有理她」= 她的好感有變動的任何互動(聊天、隨口互動、活動、深夜、回她訊息、成員之間的選項給她),在 growth.js 的 applyGain 呼叫 missSeen
   ・天數:每天結束時算(missOnDay),她回家過節的日子不算。A 段(戒備・信任)4、7、11 天;夥伴以上 3、5、8 天(DAILY.MISS)
   ・心情的基準點(slotEnd 每段往基準點走 1):平常 60 → 54 → 48 → 42
   ・她會說:互動面板的第一句(missGreet)、聊天的第一句(包在 lifeOpener 外面,一天一次)、到第二級時傳一則訊息
   ・重逢:心情 +6~10,互動面板裡她再說一句;其他地方用提示
   資料:S.miss = {last 最後一次理她的日子, n 連續幾天, said 今天說過了, sent 這一輪傳過訊息, ru 重逢待說}
   ===================================================================== */
(()=>{
const DY=window.DAILY;
/* 互動面板與聊天的第一句:[A 段, B 段以上] × 三級 */
const G={
  ys:{A:[["代表,好久不見~最近很忙吧?要記得吃飯喔。","smile"],["啊,代表!……還以為你忘記我們了。開玩笑的啦~","smile"],["代表……我沒事啦。真的,大家都很好喔。","sad"]],
      B:[["代表~你這幾天都去哪了?隊長很寂寞欸。","pout"],["……你終於來了。我巡房的時候,都會看一眼你的辦公室。","shy"],["我沒事啦~倒是你,吃飯了沒?……嗯,看到你就好了。","sad"]]},
  tr:{A:[["……代表。好幾天沒看到你。","neutral"],["……你很忙。我知道。不是在抱怨。","neutral"],["……嗯。你來了。","sad"]],
      B:[["……三天。我是說,沒什麼。","pout"],["……demo 寫了兩首。沒人聽。","pout"],["……我以為你不會來了。","sad"]]},
  hy:{A:[["代表!好久不見!……韓語是這樣說的,對吧?","smile"],["代表……我是不是做錯了什麼?……開玩笑的!大丈夫です!","smile"],["啊……代表。大丈夫です。……大概。","sad"]],
      B:[["代表~我學了一句新的韓語:「想你了」。用得對嗎?","shy"],["代表好忙喔……我每天都在練習室等,您都沒來。","pout"],["……代表。好多話想說,可是韓語都不見了。","sad"]]},
  he:{A:[["代表~好幾天沒看到你,有好好吃飯嗎?","smile"],["哎唷,代表終於出現了!還以為你搬家了~","laugh"],["我很好啊!超級好!……你呢?","smile"]],
      B:[["你這幾天都沒來廚房欸。我煮的份量都算錯了。","pout"],["哎唷,我才沒有在等你。……泡菜鍋熱了三次而已。","pout"],["冰箱裡的小菜,我做了三天份。……都是你愛吃的。","sad"]]},
  hr:{A:[["代表!你跑去哪了啦!好幾天都沒看到!","pout"],["代表……你是不是忘記我了?我是河嵐!主唱!","pout"],["……代表。嗯,我很好。","sad"]],
      B:[["代表~!充電器不見三天了!我快沒電了!","pout"],["代表是不是……不想聽我唱歌了?","sad"],["……你來了喔。","sad"]]}};
/* 到第二級時傳來的訊息 */
const MSG={
  ys:{A:["代表,最近很忙吧?別忘了吃飯喔。大家都很好~","smile"],B:["代表~今天也很忙嗎?……隊長有點想你了。一點點。","shy"]},
  tr:{A:["……最近沒看到你。","neutral"],B:["……新的 demo。等你來聽。","neutral"]},
  hy:{A:["代表,今天學的韓語是「好久不見」。……我們真的好久不見了。","smile"],B:["代表,我今天學會「想念」這個詞了。……這樣用,對嗎?","shy"]},
  he:{A:["代表~有好好吃飯嗎?我多做了一份小菜,放在冰箱喔。","smile"],B:["你再不來,冰箱裡你那份我就要自己吃掉囉~","pout"]},
  hr:{A:["代表!!你在哪!!好幾天沒看到你了!","pout"],B:["代表~我今天高音上去了。……本來想唱給你聽的。","sad"]}};
/* 重逢:你再去找她之後,她說的那一句 */
const RU={
  ys:{A:["嘿嘿,看到代表就放心了。","smile"],B:["……下次不要那麼久喔。隊長命令。","wink"]},
  tr:{A:["……嗯。這樣就好。","smile"],B:["……下次,早一點來。","shy"]},
  hy:{A:["代表來了,我就大丈夫了!真的!","laugh"],B:["代表在,心臟這裡……就安靜了。","shy"]},
  he:{A:["好啦,看在你來的份上,原諒你~","laugh"],B:["……哼。今天你那碗,我會多盛一點。","shy"]},
  hr:{A:["耶!代表回來了!充電完成!","laugh"],B:["代表~明天也要來喔!說好了!","laugh"]}};
function MS(){ const o=S.miss=S.miss||{last:{},n:{},said:{},sent:{},ru:{}}; for(const k of ["last","n","said","sent","ru"]) o[k]=o[k]||{};
  for(const m of M) if(o.last[m.id]==null){ o.last[m.id]=S.day; o.n[m.id]=0 } return o }
const bandOf=id=>DY.bandOf(stageOf(id));
const AB=id=>bandOf(id)==="A"?"A":"B";
const lv=id=>{ const n=MS().n[id]||0, t=DY.MISS[bandOf(id)]||DY.MISS.A; return n>=t[2]?3:n>=t[1]?2:n>=t[0]?1:0 };
const testing=()=>typeof V!=="undefined"&&!!V?.test;
window.missLevel=id=>byId(id)?lv(id):0;
window.moodBase=id=>DY.MISS.base[byId(id)?lv(id):0]??60;
/* 她不在(過節回家)的日子不算 */
const away=(id,day)=>id!=="hy"&&!!window.mileHoliday?.(day);
/* 每天結束(game.js 的 slotEnd 換日時) */
window.missOnDay=day=>{ try{ const o=MS();
  for(const m of M){ const id=m.id; if(o.last[id]===day){ o.n[id]=0; continue } if(away(id,day)) continue;
    o.n[id]=(o.n[id]||0)+1;
    if(lv(id)>=2&&!o.sent[id]){ o.sent[id]=1; const t=MSG[id][AB(id)]; window.phoneSay?.(id,[[id,t[0],t[1]]]) } } }catch(e){ window.logErr?.("冷落的心情",e) } };
/* 有理她(applyGain、互動面板、聊天) */
window.missSeen=id=>{ try{ if(!byId(id)||testing()) return; const o=MS(), L=lv(id); o.last[id]=S.day;
  if(L>0){ const s=S.m[id]; s.mood=clamp(s.mood+4+2*L,0,100); o.ru[id]=1 } o.n[id]=0; o.sent[id]=0 }catch(e){ window.logErr?.("冷落的心情",e) } };
/* 互動面板的第一句(冷落時才有) */
window.missGreet=id=>{ const L=byId(id)?lv(id):0; if(!L) return null; MS().said[id]=S.day; return G[id][AB(id)][L-1] };
/* 重逢的那一句(拿了就清掉) */
window.missTake=id=>{ const o=MS(); if(!o.ru[id]) return null; delete o.ru[id]; return RU[id][AB(id)] };
/* 沒有互動面板可以說的時候(聊天、活動、深夜之後離開房間):用提示 */
window.missFlush=()=>{ const o=MS(); for(const id of Object.keys(o.ru)){ const t=window.missTake(id); if(t){ toast2(`${byId(id).n}的心情好起來了 ——「${t[0]}」`); break } } };
/* 聊天的第一句:包在真人化的開場外面(冷落時優先,一天一次) */
const lo=window.lifeOpener;
window.lifeOpener=(id,sn)=>{ try{ const o=MS(), L=byId(id)&&!testing()?lv(id):0;
  if(L&&sn&&o.said[id]!==S.day&&!["event","arc","long","cg","story","situ"].includes(sn.type)){ o.said[id]=S.day; const g=G[id][AB(id)][L-1]; return {t:g[0],e:g[1],k:"miss"} } }catch(e){}
  return lo?.(id,sn)??null };
})();
