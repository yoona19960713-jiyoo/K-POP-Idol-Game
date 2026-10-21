# K-POP Idol Game

遊戲本體。目前包含主畫面(公司地圖、時段、行動)、拜訪與對話畫面,並讀取其他工具的資料:

- 衣帽間工坊:日常衣櫃(練習服、居家、外出、睡衣與季節),依地點換穿
- 劇本工坊:日常片段庫(依地點、時段、成員、關係階段抽片段)
- 遊戲存檔:users/{uid}/game/state,手機與電腦接著玩

立繪素材在 www/assets/chara,已處理的衣服清單在 www/assets/outfits.js。

- 網頁版:推送到 main 後,由 GitHub Actions 發布到 GitHub Pages
- 安裝版:同一次流程打包 APK(KPOP-Game.apk),放在 Releases 與網頁版
- 簽章使用 KEYSTORE_B64 Secret(沿用衣帽間工坊那段金鑰文字)
- 雲端同步沿用同一個 Firebase 專案與帳號
