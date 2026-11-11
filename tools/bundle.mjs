// 啟動加速(2026-11-12 全面審視):GitHub Actions 打包時跑。把 www/index.html 載入的每個程式檔各自壓縮(去掉空白與註解、區域變數改短名),
// 並把 <script> 改成 defer(不擋畫面先出來)、加上版本號(更新後不會讀到舊檔)。倉庫裡的原始檔不變,只改這次打包用的那一份。
// 每個檔還是各自一個 script、順序不變:檔案之間共用的全域名稱不會被改,"use strict" 也照各檔原本的樣子。
// 用法:node tools/bundle.mjs [www 資料夾] [版本號]
import { transform } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const dir = process.argv[2] || "www", ver = process.argv[3] || String(Date.now());
const htmlPath = path.join(dir, "index.html");
let html = await readFile(htmlPath, "utf8");
const tags = [...html.matchAll(/<script src="([^"?]+)"><\/script>/g)];
if (!tags.length) { console.error("找不到 <script src>:index.html 的格式可能變了"); process.exit(1); }
let before = 0, after = 0;
for (const [, src] of tags) {
  const p = path.join(dir, src), code = await readFile(p, "utf8");
  const out = await transform(code, { minify: true, charset: "utf8", legalComments: "none", sourcefile: src });
  for (const w of out.warnings) console.warn(src, w.text);
  await writeFile(p, out.code); before += Buffer.byteLength(code); after += Buffer.byteLength(out.code);
}
html = html.replace(/<script src="([^"?]+)"><\/script>/g, (m, src) => `<script defer src="${src}?v=${ver}"></script>`);
await writeFile(htmlPath, html);
console.log(`壓縮 ${tags.length} 個程式檔:${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB;已改成 defer、加上版本號 ${ver}`);
