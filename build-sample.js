import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distAssets = path.join(__dirname, 'dist', 'assets');
const files = fs.readdirSync(distAssets);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

const cssContent = fs.readFileSync(path.join(distAssets, cssFile), 'utf-8');
const jsContent = fs.readFileSync(path.join(distAssets, jsFile), 'utf-8');

const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ボタン選択テキスト生成ツール</title>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
${jsContent}
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'sample.html'), htmlContent, 'utf-8');
console.log('sample.html updated with complete React application!');
