const fs = require('fs');
let content = fs.readFileSync('src/tests/phase8Reports.test.ts', 'utf8');
content = content.replace("await db.curriculumVersions.add({ id: 'v1', name: 'Curriculum', isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });", "");
content = content.replace("await lessonRepository.save(lesson);", "await db.curriculumVersions.add({ id: 'v1', name: 'Curriculum', isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); await lessonRepository.create(lesson);");
fs.writeFileSync('src/tests/phase8Reports.test.ts', content);
