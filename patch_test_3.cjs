const fs = require('fs');
let content = fs.readFileSync('src/tests/phase8Reports.test.ts', 'utf8');
content = content.replace("recordedAt: new Date().toISOString(),", "date: new Date().toISOString().substring(0,10),");
fs.writeFileSync('src/tests/phase8Reports.test.ts', content);
