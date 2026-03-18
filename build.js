const fs = require('fs');
const path = require('path');

const gistId = (process.env.GIST_ID || '').trim();
const gistToken = (process.env.GIST_TOKEN || '').trim();

const appJsPath = path.join(__dirname, 'public', 'static', 'js', 'app.js');

let content = fs.readFileSync(appJsPath, 'utf8');

content = content.replace(/gistId: '.*?'/g, `gistId: '${gistId}'`);
content = content.replace(/token: '.*?'/g, `token: '${gistToken}'`);

fs.writeFileSync(appJsPath, content);

console.log('Build completed!');
console.log('GIST_ID:', gistId);
console.log('GIST_TOKEN set:', !!gistToken);
