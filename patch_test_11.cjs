const fs = require('fs');
let content = fs.readFileSync('src/tests/phase8Reports.test.ts', 'utf8');

content = content.replace(
  "await db.curriculumVersions.add({ id: 'v1', name: 'Curriculum', isArchived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });",
  "await db.curriculumVersions.add({ id: 'v1', code: 'V1', title: 'Curriculum V1', status: 'active', isOfficial: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });"
);

content = content.replace(
  "const att: AttendanceRecord = {\n      id: 'att-1',\n      lessonId: lessonId,\n      studentEnrollmentId: enrollmentId,\n      status: 'Absent',\n      date: new Date().toISOString().substring(0,10),\n    };",
  "const att: AttendanceRecord = {\n      id: 'att-1',\n      lessonId: lessonId,\n      studentEnrollmentId: enrollmentId,\n      classId: classId,\n      status: 'Absent',\n      date: new Date().toISOString().substring(0,10),\n      createdAt: new Date().toISOString(),\n      updatedAt: new Date().toISOString(),\n    };"
);

fs.writeFileSync('src/tests/phase8Reports.test.ts', content);
