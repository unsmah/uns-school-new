const fs = require('fs');
let content = fs.readFileSync('src/tests/phase8Reports.test.ts', 'utf8');
content = content.replace("await db.curriculumVersions.add({ id: 'v1', name: 'Curriculum', isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });\n", "");
content = content.replace("await lessonRepository.create(lesson);", "await db.curriculumVersions.add({ id: 'v1', name: 'Curriculum', isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });\n    await lessonRepository.create(lesson);");
fs.writeFileSync('src/tests/phase8Reports.test.ts', content);
