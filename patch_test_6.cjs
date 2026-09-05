const fs = require('fs');
let content = fs.readFileSync('src/tests/phase8Reports.test.ts', 'utf8');
content = content.replace("await db.curriculumVersions.add", "await db.curriculumVersions.put");
fs.writeFileSync('src/tests/phase8Reports.test.ts', content);
