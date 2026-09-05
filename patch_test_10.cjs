const fs = require('fs');
let content = fs.readFileSync('src/tests/phase8Reports.test.ts', 'utf8');
content = content.replace("await db.curriculumVersions.add({ id: 'v1'", "await db.sessionRubrics.add({ id: 'rubric-1', curriculumVersionId: 'v1', code: 'test', name: 'Test', pedagogicalStage: 'Presentation', defaultDurationMinutes: 45, order: 1 });\n    await db.curriculumVersions.add({ id: 'v1'");
fs.writeFileSync('src/tests/phase8Reports.test.ts', content);
