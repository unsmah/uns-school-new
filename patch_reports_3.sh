#!/bin/bash
sed -i "s/lessonRepository.save/lessonRepository.create/g" src/tests/phase8Reports.test.ts
sed -i "s/'absent'/'Absent'/g" src/tests/phase8Reports.test.ts
sed -i "s/status: 'Absent'/status: 'Absent'/g" src/tests/phase8Reports.test.ts
