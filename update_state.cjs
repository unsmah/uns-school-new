const fs = require('fs');
let features = fs.readFileSync('FEATURES.md', 'utf8');
features = features.replace('- [ ] Phase 8: Document export', '- [x] Phase 8: Document export');
fs.writeFileSync('FEATURES.md', features);

let state = fs.readFileSync('PROJECT_STATE.md', 'utf8');
state = state.replace('Phase 7 — Workflow Extras & Teacher Dashboard', 'Phase 8 — Official Documents, Printing & Export');
fs.writeFileSync('PROJECT_STATE.md', state);
