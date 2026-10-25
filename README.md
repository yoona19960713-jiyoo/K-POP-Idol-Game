# 完美女團(K-POP Idol Game)

遊戲本體(網頁版 + Android APK,橫向)。原本的四支工具(衣帽間工坊、歌曲企劃室、打歌準備室、劇本工坊)都已搬進遊戲:

- 造型室(公司 1F):衣櫃、委託設計、設計工作台(OpenAI gpt-image-2 生圖)、成員底模與姿勢底模
- 企劃室(2F)、錄音室(3F):歌曲企劃、逐句分配、回歸日
- 待機室(電視台):宣傳期打歌;其他時間是練習模式
- 製作者模式(選單):用 Gemini 產生日常劇情片段、審稿、內容庫
- 手機:訊息、群組、行程、STARLOG、相簿(戀愛紀念 CG)

程式在 www/:index.html(畫面與樣式;樣式與 body 由交接包的「建置來源」重建)、game.js(核心)與各模組。

- 網頁版:推送到 main 後,由 GitHub Actions 發布到 GitHub Pages
- 安裝版:同一次流程打包 APK(KPOP-Game.apk),放在 Releases 與網頁版
- 簽章:KEYSTORE_B64 Secret
- 雲端同步:Firebase(Email 登入),資料在 users/{uid}/
