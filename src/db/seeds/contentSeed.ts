/**
 * UNS SCHOOL — Starter Teaching Resources & Lesson Plan Templates Seed
 * Provides high-quality, original teacher templates, worksheets, and calendar events.
 *
 * PROVENANCE GUARANTEE:
 * - Every record explicitly declares provenance ('teacher_template' | 'sample' | 'reference').
 * - NO record is falsely claimed to be an official Algerian Ministry document.
 * - Idempotent execution: only seeds if resources/academicYears table is empty or missing data.
 */

import type { UnsSchoolDatabase } from '../database';
import type { LocalResource, LessonTemplatePayload, CalendarEvent, AcademicYear, School } from '../../types';
import { computeSHA256ForText } from '../../services/backup/checksumService';

export async function seedContentData(db: UnsSchoolDatabase): Promise<void> {
  const now = new Date().toISOString();

  // 1. Seed Starter Teaching Resources & Lesson Plan Templates using per-record idempotency
  const starterResources: LocalResource[] = [];

    // Helper to create a LocalResource with text content & computed hash
    const buildTextResource = async (
      id: string,
      title: string,
      description: string,
      category: LocalResource['category'],
      levelCode: string,
      tags: string[],
      textContent: string,
      provenance: LocalResource['provenance'] = 'teacher_template',
      sourceReference = 'UNS SCHOOL Teacher Community Template',
      templatePayload?: LessonTemplatePayload,
      sequenceNumber?: number
    ): Promise<LocalResource> => {
      const sha256 = await computeSHA256ForText(textContent);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(textContent);
      const blob = new Blob([bytes], { type: 'text/markdown;charset=utf-8' });

      return {
        id,
        title,
        description,
        category,
        levelCode,
        sequenceNumber,
        fileName: `${id}.md`,
        fileMimeType: 'text/markdown',
        fileSizeBytes: bytes.byteLength,
        fileHashSHA256: sha256,
        fileBlob: blob,
        tags,
        provenance,
        isOfficial: provenance === 'official_verified',
        sourceReference,
        templatePayload,
        createdAt: now,
        updatedAt: now,
      };
    };

    // -------------------------------------------------------------
    // A. GENERAL TEACHING RESOURCES (12 Starter Items)
    // -------------------------------------------------------------

    starterResources.push(
      await buildTextResource(
        'res-tpl-planning-chk',
        'Lesson Planning Checklist & Session Preparation Guide',
        'A comprehensive step-by-step checklist for Algerian middle school English teachers before starting any pedagogical sequence.',
        'Teacher Templates',
        'ALL',
        ['planning', 'checklist', 'pedagogy', 'cahier-journal'],
        `# Lesson Planning Checklist & Session Preparation Guide

**Status**: Teacher Template / Reference (Not official Ministry document)
**Target Level**: All Middle School Levels (1AM – 4AM)

## Pre-Session Preparation
- [ ] Review target sequence communicative objectives from the official syllabus.
- [ ] Align session rubric with pedagogical stage (Presentation, Practice, Production, Integration, Remediation).
- [ ] Prepare required visual/audio aids (flashcards, realia, reading handouts).
- [ ] Check time allocation for each lesson activity step (Warm-up, Presentation, Controlled Practice, Free Production).
- [ ] Antidote/Differentiation plan for struggling or advanced pupils.

## Classroom Execution
- [ ] Display lesson title, sequence number, and key learning objective on the board.
- [ ] Record pupil attendance in Cahier Journal.
- [ ] Ensure clear transition between teacher-centered explanation and pupil pair/group work.
- [ ] Conduct formative check for understanding before moving to independent practice.

## Post-Session Reflection
- [ ] Note common pronunciation or grammatical hurdles in teacher reflection log.
- [ ] Update pupil observation notes for students requiring targeted remediation.
- [ ] Prepare follow-up homework or consolidation task.`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-act-1am-pairs',
        '1MS Oral Interaction Pair-Work Speaking Cards',
        'Printable pair-work dialogue prompts for 1AM learners practicing greetings, age, and hometown exchanges.',
        'Classroom Activities',
        '1MS',
        ['speaking', '1AM', 'pair-work', 'greetings'],
        `# 1MS Pair-Work Speaking Activity Cards

**Category**: Classroom Activity / Speaking
**Target Level**: 1MS (1AM) — Sequence 1: Me and My Friends

### Activity Structure
- **Format**: Pupil A & Pupil B Role-Play Cards
- **Interaction**: Pupil-Pupil
- **Duration**: 10–15 Minutes

---

#### Card A (Pupil A)
> You meet a new classmate in the school courtyard.
> 1. Greet your partner (Hello / Good morning).
> 2. Ask for their name (*What is your name?*).
> 3. Ask for their age (*How old are you?*).
> 4. Ask where they live (*Where do you live?*).
> 5. Say goodbye politely (*Nice to meet you / Goodbye*).

---

#### Card B (Pupil B)
> Answer your partner's questions using your real or imaginary identity card.
> - Name: Amina / Youssef
> - Age: 11 years old
> - Town: Algiers / Oran / Constantine / Batna
> - School: Middle School Pupil`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-act-2am-shop',
        '2MS Flea Market & Shopping Role-Play Cards',
        'Interactive shopping conversation cards for 2MS pupils inquiring about clothes, prices, and quantities.',
        'Classroom Activities',
        '2MS',
        ['speaking', '2AM', 'shopping', 'prices', 'vocabulary'],
        `# 2MS Shopping Role-Play Cards

**Category**: Classroom Activity / Speaking
**Target Level**: 2MS (2AM) — Sequence 2: Me and My Shopping

### Role 1: Shopkeeper (Pupil A)
- Welcome customer: *"Can I help you, sir/madam?"*
- State prices: *"The blue T-shirt is 1,200 DA." / "The shoes are 3,500 DA."*
- Ask size/color: *"What size do you wear?" / "What color do you prefer?"*

### Role 2: Customer (Pupil B)
- Ask for items: *"I'm looking for a pair of trousers / a jacket."*
- Ask for prices: *"How much is this sweater?" / "How much are these jeans?"*
- Express decision: *"I'll take the blue one, please." / "It's too expensive."*`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-ws-3am-can',
        '3MS Diagnostic Speaking Rubric: Abilities & Interests (Can/Can\'t)',
        'Formative evaluation rubric for 3MS students expressing talents, hobbies, and physical abilities.',
        'Assessment Templates',
        '3MS',
        ['assessment', '3AM', 'can-cant', 'hobbies', 'rubric'],
        `# 3MS Diagnostic Speaking Rubric: Abilities & Hobbies

**Category**: Assessment Template / Speaking Evaluation
**Target Level**: 3MS (3AM) — Sequence 1

| Criterion | Excellent (4 pts) | Good (3 pts) | Fair (2 pts) | Needs Work (1 pt) |
|---|---|---|---|---|
| **Pronunciation of Can/Can't** | Clear weak /kən/ and strong /kɑːnt/ distinction | Minor stress errors | Monotone, no contrast | Unclear utterance |
| **Fluency & Confidence** | Speaks smoothly with natural pauses | Occasional hesitation | Frequent long pauses | Unable to finish |
| **Grammar Accuracy** | Bare infinitive used correctly after modal | 1–2 verb form errors | Multiple structural mistakes | Incorrect word order |
| **Vocabulary Usage** | Rich hobby/talent lexis (chess, coding, swimming) | Adequate basic vocabulary | Repetitive words | Insufficient vocabulary |`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-ws-4am-monuments',
        '4MS Algerian Monuments Reading Comprehension Worksheet',
        'Reading passage and comprehension exercises on Tipaza Royal Mausoleum and Casbah of Algiers for 4MS learners.',
        'Worksheets',
        '4MS',
        ['4AM', 'reading', 'monuments', 'heritage', 'BEM'],
        `# 4MS Reading Comprehension: Algerian World Heritage Sites

**Category**: Worksheet / Reading & Discover
**Target Level**: 4MS (4AM) — Sequence 1: Landmarks & Historical Figures

## Reading Text: Tipaza and the Casbah
> Algeria is rich in historical landmarks and cultural heritage sites recognized worldwide by UNESCO. 
> The ancient Roman ruins of **Tipaza**, situated along the Mediterranean coast, were built between the 6th century BC and the 2nd century AD. 
> In Algiers, the historic **Casbah** stands as an architectural masterpiece representing traditional Algerian urban design, citadel fortresses, and Ottoman palaces. 
> Preserving these monuments is our collective responsibility to honor past generations and inspire future youth.

## Comprehension Questions
1. Where are the ancient Roman ruins of Tipaza located?
2. When were the ruins built?
3. What makes the Casbah of Algiers an architectural masterpiece?
4. **Grammar Practice**: Rewrite in Passive Voice:
   * *UNESCO recognized Tipaza as a World Heritage Site.*
   * -> *Tipaza ...*`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-gram-phonology',
        'Middle School Phonology Guide: Silent Letters & Stress Patterns',
        'Quick reference guide for English teachers on silent letters (/b/, /k/, /w/, /t/) and word stress in middle school English.',
        'Grammar',
        'ALL',
        ['phonology', 'pronunciation', 'silent-letters', 'stress'],
        `# Middle School Phonology Guide

**Category**: Grammar / Phonology Reference
**Target Level**: All Middle School Levels

### 1. Silent Letter Rules
- **Silent 'b'**: After 'm' at end of words (*climb, comb, lamb, thumb*).
- **Silent 'k'**: Before 'n' at start of words (*know, knee, knife, knock*).
- **Silent 'w'**: Before 'r' (*write, wrong, wrist*) or in *who, answer, two*.
- **Silent 't'**: In words like *listen, fasten, castle, often*.

### 2. Final "-ed" Pronunciation
- **/t/**: After voiceless sounds (/p/, /k/, /f/, /s/, /ʃ/, /tʃ/) -> *walked, washed, laughed*.
- **/d/**: After voiced sounds (/b/, /g/, /v/, /z/, vowels) -> *cleaned, played, lived*.
- **/ɪd/**: After /t/ or /d/ sounds -> *wanted, needed, visited*.`,
        'sample'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-writ-peer-review',
        'Think & Write Formative Peer-Review Checklist',
        'Student-facing peer assessment grid for written paragraphs and guided compositions.',
        'Teacher Templates',
        'ALL',
        ['writing', 'peer-review', 'formative', 'checklist'],
        `# Think & Write Formative Peer-Review Checklist

**Category**: Writing / Self & Peer Assessment
**Target Level**: 2MS – 4MS

**Peer Reviewer Name**: ___________________  
**Author Name**: ___________________  

| Checkpoint | Yes (✓) | Needs Work (?) | Reviewer Notes |
|---|---|---|---|
| Does the paragraph start with a clear topic sentence? | | | |
| Are capital letters used at the start of sentences and for proper names? | | | |
| Are full stops and commas placed correctly? | | | |
| Is subject-verb agreement correct (e.g. *he plays* / *they play*)? | | | |
| Are target vocabulary words from the sequence utilized? | | | |
| Is the handwriting legible and neatly spaced? | | | |`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-rem-plan-sheet',
        'Remediation Session Planning & Student Gap Tracking Template',
        'A structured template for planning support sessions following diagnostic or trimester assessment results.',
        'Remediation',
        'ALL',
        ['remediation', 'pedagogy', 'gap-analysis', 'tracking'],
        `# Remediation Session Planning Sheet

**Category**: Remediation / Pedagogical Support
**Target Level**: All Levels

## Session Overview
- **Class**: ___________________
- **Date**: ____ / ____ / ________
- **Sequence Context**: ___________________

## Identified Learning Gaps
1. **Linguistic Gap**: (e.g., Confusion between Past Simple and Present Perfect / Incorrect auxiliary usage)
2. **Communicative Gap**: (e.g., Inability to formulate WH-questions orally)

## Targeted Students
- Pupil A: ___________________
- Pupil B: ___________________
- Pupil C: ___________________

## Remedial Activities Plan
- **Step 1 (10 min)**: Diagnostic mini-quiz to pinpoint root misconception.
- **Step 2 (20 min)**: Simplified visual rule breakdown with teacher modelling.
- **Step 3 (20 min)**: Differentiated micro-tasks in pairs with immediate peer feedback.
- **Step 4 (10 min)**: Exit check verifying gap resolution.`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-bem-strategy',
        '4MS BEM Examination Strategy & Time Management Guide',
        'Practical guide for 4AM candidates on tackling the BEM English examination paper efficiently.',
        'BEM Preparation',
        '4MS',
        ['4AM', 'BEM', 'exam-prep', 'strategy'],
        `# 4MS BEM Examination Strategy Guide

**Category**: BEM Prep / Exam Strategy
**Target Level**: 4MS (4AM)

### Exam Structure Breakdown (Total: 20 Marks)
1. **Part One (14 Marks)**
   - **Section A: Reading Comprehension (7 Marks)**
     - Read the passage twice before looking at questions.
     - Pay close attention to synonym and antonym tasks (match parts of speech).
   - **Section B: Mastery of Language (7 Marks)**
     - Grammar, mechanics, spelling, punctuation, and phonology.
     - Verify passive voice transformations and connector usage (*because, so, although*).
2. **Part Two: Written Production (6 Marks)**
   - **Situation of Integration**
     - Respect text length (8–12 lines).
     - Follow the layout (e.g. formal letter, blog post, descriptive essay).
     - Allocate 5 minutes for drafting, 15 minutes for writing, and 5 minutes for proofreading.`,
        'sample'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-mgmt-phrases',
        'Classroom English Phrases & Teacher Commands Reference',
        'Essential English expressions for daily classroom management, instruction, and student interaction.',
        'Classroom Management',
        'ALL',
        ['classroom-management', 'teacher-phrases', 'instructions'],
        `# Classroom English Phrases & Commands

**Category**: Classroom Management
**Target Level**: All Middle School Levels

### 1. Opening the Lesson
- *"Good morning / Good afternoon, everyone. Please take your seats."*
- *"Who is absent today?"*
- *"Open your text books to page..."*

### 2. Giving Instructions
- *"Listen carefully to the audio recording."*
- *"Work in pairs / groups of three."*
- *"Raise your hand if you have a question."*
- *"Compare your answers with your neighbor."*

### 3. Giving Praise & Encouragement
- *"Excellent pronunciation!"*
- *"Well done! Very creative written text."*
- *"Good effort! Keep trying."*

### 4. Closing the Lesson
- *"Copy the homework instructions into your copybook."*
- *"Pack up your items. Have a great weekend!"*`,
        'sample'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-asst-exit-ticket',
        'Universal Exit Ticket Template for Formative Checks',
        'Quick 5-minute end-of-lesson evaluation slips for verifying student grasp before dismissal.',
        'Assessment Templates',
        'ALL',
        ['exit-ticket', 'assessment', 'formative', 'check-for-understanding'],
        `# Universal Formative Exit Ticket

**Category**: Assessment Template / Check for Understanding
**Target Level**: All Levels

---
### Exit Ticket (البطاقة الختامية)
**Name**: ___________________________ **Class**: ________ **Date**: __________

1. **One key thing I learned today**:
   ____________________________________________________________________

2. **One question I still have**:
   ____________________________________________________________________

3. **Rate my understanding today**:
   [ ] 😃 I understood everything completely!
   [ ] 🙂 I understood most of it, but need a bit of practice.
   [ ] 😟 I found this session difficult and need extra help.
---`,
        'teacher_template'
      )
    );

    starterResources.push(
      await buildTextResource(
        'res-vocab-log-sheet',
        'Learner Vocabulary Log & Word Bank Sheet',
        'A structured student vocabulary logging sheet for collecting new lexical items, definitions, and example sentences.',
        'Vocabulary',
        'ALL',
        ['vocabulary', 'word-bank', 'lexis', 'student-tool'],
        `# Learner Vocabulary Log Sheet

**Category**: Vocabulary / Student Tool
**Target Level**: All Levels

**Student Name**: ___________________ **Class**: ________  

| New Word / Phrase | Arabic Equivalent | Synonym / Antonym | My Example Sentence |
|---|---|---|---|
| **Landmark** | معلم تاريخي | Monument / Site | *The Eiffel Tower is a famous landmark.* |
| **Generous** | كريم | Kind / Unselfish | *My uncle is a very generous man.* |
| **Recycle** | يعيد تدوير | Reuse | *We must recycle plastic bottles.* |
| **Purchase** | يشتري | Buy | *I want to purchase a new book.* |`,
        'teacher_template'
      )
    );

    // -------------------------------------------------------------
    // B. STARTER LESSON PLAN TEMPLATES (10 High-Quality Templates)
    // -------------------------------------------------------------

    // 1. 1MS Seq 1: Greeting & Self-Introduction (Listen and Do)
    const tpl1MS1: LessonTemplatePayload = {
      title: '1MS Seq 1: Greeting People & Introducing Oneself',
      levelCode: '1MS',
      sequenceNumber: 1,
      rubricCode: 'listen_and_do',
      pedagogicalStage: 'Presentation',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Greet classmates, ask for and give basic personal details (name, age, country).',
      specificObjectives: [
        'Recognize oral greetings (Hello, Good morning, Hi) in spoken exchanges.',
        'Ask and answer personal identity questions using "What is your name?" and "How old are you?".',
        'Pronounce basic personal pronouns accurately.',
      ],
      targetedCompetencies: ['C1', 'C2'],
      materialsAndAids: ['Board', 'Visual Flashcards of Pupils', 'Audio / Dialogue Script', 'Pupil Copybooks'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Warm-up / Lead-in',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Teacher greets class cheerfully ("Hello everyone! Good morning!"). Uses gestures to elicit greetings from pupils.',
          studentRoleAndTasks: 'Pupils respond chorally ("Good morning, teacher!") and observe teacher actions.',
          interactionPattern: 'Teacher-Pupil',
          materialsAndAids: 'Visual gestures',
        },
        {
          stepNumber: 2,
          phaseName: 'Presentation (Listen and Do)',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Teacher models short introductory dialogue with a puppet or flashcard: "Hello! My name is Razika. I am 11 years old. I live in Algiers."',
          studentRoleAndTasks: 'Pupils listen attentively, repeat key phrases, and identify greeting words.',
          interactionPattern: 'Plenary',
          materialsAndAids: 'Character flashcards',
        },
        {
          stepNumber: 3,
          phaseName: 'Controlled Practice',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Teacher guides pair drills. Prompts Pupil A to ask "What is your name?" and Pupil B to reply "My name is...". Monitors pronunciation.',
          studentRoleAndTasks: 'Pupils practice short exchange in pairs using their real names.',
          interactionPattern: 'Pupil-Pupil',
          materialsAndAids: 'Prompt cards',
        },
        {
          stepNumber: 4,
          phaseName: 'Free Production & Wrap-up',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Invites 3–4 volunteer pairs to present their introductory dialogue in front of the class. Summarizes lesson goals.',
          studentRoleAndTasks: 'Volunteer pairs perform in front of peers. Class listens and applauds.',
          interactionPattern: 'Plenary',
          materialsAndAids: 'Board summary',
        },
      ],
      homeworkTitle: 'Fill in My Identity Card',
      homeworkInstructions: 'Complete the ID card on page 14 of your textbook with your Name, Age, Town, and School.',
      differentiationNotes: 'Provide sentence starters ("My name is...") on the board for lower-level learners.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-1ms-greetings',
        'Suggested Lesson Plan: 1MS Greeting & Self-Introduction (Listen & Do)',
        'Complete 60-minute lesson plan template for 1AM teachers introducing basic greetings and personal identity questions.',
        'Lesson Plan',
        '1MS',
        ['lesson-plan', '1AM', 'greetings', 'identity', 'listen-and-do'],
        JSON.stringify(tpl1MS1, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl1MS1,
        1
      )
    );

    // 2. 1MS Seq 1: Personal Pronouns & Verb To Be (I Practise)
    const tpl1MS2: LessonTemplatePayload = {
      title: '1MS Seq 1: Personal Pronouns & Auxiliary "To Be" in Present Simple',
      levelCode: '1MS',
      sequenceNumber: 1,
      rubricCode: 'practise',
      pedagogicalStage: 'Practice',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Use personal pronouns (I, you, he, she, it) and present tense of "to be" correctly in short sentences.',
      specificObjectives: [
        'Differentiate between masculine (he) and feminine (she) personal pronouns.',
        'Conjugate verb "to be" (am / is / are) in affirmative and negative forms.',
      ],
      targetedCompetencies: ['C2', 'C3'],
      materialsAndAids: ['Board Grammar Grid', 'Substitution Cards', 'Worksheet Slips'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Warm-up / Review',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Reviews identity vocabulary by asking individual pupils: "Who is he?" (pointing to a boy pupil) and "Who is she?" (pointing to a girl pupil).',
          studentRoleAndTasks: 'Pupils answer: "He is Omar." / "She is Meriem."',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Presentation & Isolation',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Writes target sentences on the board. Highlights pronouns and verbs in colored chalk: I am / He is / She is / They are.',
          studentRoleAndTasks: 'Pupils copy grammar chart into copybooks and deduce rule with teacher assistance.',
          interactionPattern: 'Plenary',
        },
        {
          stepNumber: 3,
          phaseName: 'Controlled Practice',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Distributes fill-in-the-blank practice items: "Amina ___ 11 years old." / "Omar and Youssef ___ brothers."',
          studentRoleAndTasks: 'Pupils complete exercises individually in copybooks then compare answers in pairs.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 4,
          phaseName: 'Consolidation & Assessment',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Conducts quick exit check on board. Corrects mistakes collectively.',
          studentRoleAndTasks: 'Pupils correct their work on the board.',
          interactionPattern: 'Plenary',
        },
      ],
      homeworkTitle: 'Grammar Exercise 3 Page 18',
      homeworkInstructions: 'Complete sentences 1 to 5 using "am", "is", or "are".',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-1ms-grammar-tobe',
        'Suggested Lesson Plan: 1MS Auxiliary "To Be" & Pronouns (I Practise)',
        'Structured 60-minute grammar lesson template focusing on pronoun substitution and auxiliary "to be".',
        'Lesson Plan',
        '1MS',
        ['lesson-plan', '1AM', 'grammar', 'to-be', 'practise'],
        JSON.stringify(tpl1MS2, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl1MS2,
        1
      )
    );

    // 3. 1MS Seq 2: Introducing Family Members (Think & Write)
    const tpl1MS3: LessonTemplatePayload = {
      title: '1MS Seq 2: My Family Tree Paragraph (Think & Write)',
      levelCode: '1MS',
      sequenceNumber: 2,
      rubricCode: 'think_and_write',
      pedagogicalStage: 'Production',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Write a short descriptive paragraph introducing family members, their names, and occupations.',
      specificObjectives: [
        'Use possessive adjectives (my, his, her) in guided written text.',
        'Draft a 4–5 sentence paragraph describing one\'s family.',
      ],
      targetedCompetencies: ['C3'],
      materialsAndAids: ['Sample Family Tree Poster', 'Guided Writing Template Grid'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Pre-Writing (Warm-up)',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Displays sample family poster on board. Brainstorms family vocabulary (father, mother, brother, sister, doctor, teacher).',
          studentRoleAndTasks: 'Pupils name family members and state their occupations.',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Drafting (Guided Writing)',
          allocatedMinutes: 25,
          teacherRoleAndInstructions: 'Provides guided fill-in layout: "Hello! My name is ___. This is my family. My father\'s name is ___. He is a ___."',
          studentRoleAndTasks: 'Pupils write their initial draft individually in copybooks.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 3,
          phaseName: 'Peer Review & Editing',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Guides pupils to exchange copybooks with neighbor and check spelling and capitalization.',
          studentRoleAndTasks: 'Pupils review neighbor\'s paragraph using writing checklist.',
          interactionPattern: 'Pupil-Pupil',
        },
        {
          stepNumber: 4,
          phaseName: 'Final Production',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Selects 2 pupils to read their finalized paragraph to the class.',
          studentRoleAndTasks: 'Pupils listen and provide positive encouragement.',
          interactionPattern: 'Plenary',
        },
      ],
      homeworkTitle: 'Draw & Label Family Tree',
      homeworkInstructions: 'Draw your family tree in your project copybook and label each person.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-1ms-family-writing',
        'Suggested Lesson Plan: 1MS Family Paragraph Writing (Think & Write)',
        'Guided writing lesson template for 1AM students creating a short family presentation paragraph.',
        'Lesson Plan',
        '1MS',
        ['lesson-plan', '1AM', 'writing', 'family', 'think-and-write'],
        JSON.stringify(tpl1MS3, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl1MS3,
        2
      )
    );

    // 4. 2MS Seq 1: Describing Physical Appearance (Listen & Do)
    const tpl2MS1: LessonTemplatePayload = {
      title: '2MS Seq 1: Describing Physical Appearance & Clothing',
      levelCode: '2MS',
      sequenceNumber: 1,
      rubricCode: 'listen_and_do',
      pedagogicalStage: 'Presentation',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Interpret audio/spoken descriptions of physical appearance (hair, eyes, height) and identify persons.',
      specificObjectives: [
        'Identify physical adjectives: tall, short, slim, fair hair, dark eyes.',
        'Match spoken description with correct character flashcard.',
      ],
      targetedCompetencies: ['C1', 'C2'],
      materialsAndAids: ['Audio / Teacher Read Script', 'Character Flashcards A, B, C, D'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Pre-Listening',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Shows 4 character flashcards on board. Elicits known physical traits.',
          studentRoleAndTasks: 'Pupils describe hair color, eyes, and clothing in simple words.',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'While-Listening (1st Listening)',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Reads description script at natural speed: "My friend Karima is tall and slim. She has long brown hair and green eyes..."',
          studentRoleAndTasks: 'Pupils listen for overall gist and select matching character card.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 3,
          phaseName: 'While-Listening (2nd Listening)',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Reads script a second time with pauses. Asks pupils to complete descriptive table (Height, Hair, Eyes, Outfit).',
          studentRoleAndTasks: 'Pupils complete information table in copybooks.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 4,
          phaseName: 'Post-Listening (Spoken Pair Work)',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Asks pupils to describe a mystery classmate to their partner.',
          studentRoleAndTasks: 'Partner guesses who the described classmate is.',
          interactionPattern: 'Pupil-Pupil',
        },
      ],
      homeworkTitle: 'Describe Best Friend',
      homeworkInstructions: 'Write 4 sentences describing your best friend\'s physical appearance in your copybook.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-2ms-appearance',
        'Suggested Lesson Plan: 2MS Physical Appearance Description (Listen & Do)',
        'Listening comprehension lesson plan template for 2AM pupils interpreting physical trait descriptions.',
        'Lesson Plan',
        '2MS',
        ['lesson-plan', '2AM', 'appearance', 'listening', 'listen-and-do'],
        JSON.stringify(tpl2MS1, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl2MS1,
        1
      )
    );

    // 5. 2MS Seq 2: Shopping & Price Inquiries (I Practise)
    const tpl2MS2: LessonTemplatePayload = {
      title: '2MS Seq 2: Inquiring About Prices & Quantities (How Much / How Many)',
      levelCode: '2MS',
      sequenceNumber: 2,
      rubricCode: 'practise',
      pedagogicalStage: 'Practice',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Formulate questions using "How much" (uncountable/prices) and "How many" (countable items) in shopping contexts.',
      specificObjectives: [
        'Differentiate between countable (apples, shirts) and uncountable (milk, money) nouns.',
        'Ask about prices accurately in Algerian Dinars (DA).',
      ],
      targetedCompetencies: ['C1', 'C3'],
      materialsAndAids: ['Market Visual Price List', 'Classroom Currency Props / Board Chart'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Warm-up / Elicitation',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Displays grocery price list on board. Asks: "How much is a kilo of oranges?"',
          studentRoleAndTasks: 'Pupils respond using price list: "It is 250 DA."',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Rule Discovery & Practice',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Highlights "How much" vs "How many" rule on board. Guides drill with various food items.',
          studentRoleAndTasks: 'Pupils categorize items into countable vs uncountable columns.',
          interactionPattern: 'Plenary',
        },
        {
          stepNumber: 3,
          phaseName: 'Pair Role-Play Drill',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Distributes shopping item cards with price tags. Assigns buyer/seller roles.',
          studentRoleAndTasks: 'Pupils conduct mini shopping conversations inquiring about prices and purchasing items.',
          interactionPattern: 'Pupil-Pupil',
        },
        {
          stepNumber: 4,
          phaseName: 'Wrap-up & Exit Check',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Conducts 2-minute oral check asking individual pupils price questions.',
          studentRoleAndTasks: 'Pupils respond orally.',
          interactionPattern: 'Teacher-Pupil',
        },
      ],
      homeworkTitle: 'Shopping List Price Exercise',
      homeworkInstructions: 'Write 4 questions asking about prices of items in your kitchen.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-2ms-shopping-grammar',
        'Suggested Lesson Plan: 2MS Price Inquiries & Quantities (I Practise)',
        'Communicative grammar lesson plan template for 2AM teachers focusing on How much / How many.',
        'Lesson Plan',
        '2MS',
        ['lesson-plan', '2AM', 'shopping', 'prices', 'practise'],
        JSON.stringify(tpl2MS2, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl2MS2,
        2
      )
    );

    // 6. 3MS Seq 1: Abilities & Hobbies with Can/Can't (I Practise)
    const tpl3MS1: LessonTemplatePayload = {
      title: '3MS Seq 1: Expressing Abilities, Disabilities & Hobbies (Can / Can\'t)',
      levelCode: '3MS',
      sequenceNumber: 1,
      rubricCode: 'practise',
      pedagogicalStage: 'Practice',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Express what one can or cannot do and discuss personal talents and leisure activities.',
      specificObjectives: [
        'Master the pronunciation of strong /kɑːnt/ and weak /kən/ forms.',
        'Use modal auxiliary "can / cannot" with bare infinitive verbs.',
      ],
      targetedCompetencies: ['C1', 'C2', 'C3'],
      materialsAndAids: ['Talent Action Flashcards (swim, play chess, speak German, code)', 'Audio Drill'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Warm-up',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Mimes playing chess and swimming. Asks: "Can I swim?" Pupils respond: "Yes, you can!"',
          studentRoleAndTasks: 'Pupils guess action verbs and respond chorally.',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Pronunciation & Structure Isolation',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Models oral pronunciation contrast: "I can /kən/ play football, but I can\'t /kɑːnt/ speak Japanese." Writes rule on board.',
          studentRoleAndTasks: 'Pupils repeat sentences individually focusing on stress and vowel reduction.',
          interactionPattern: 'Plenary',
        },
        {
          stepNumber: 3,
          phaseName: 'Find Someone Who... Survey Activity',
          allocatedMinutes: 25,
          teacherRoleAndInstructions: 'Distributes class survey grid. Instructs pupils to stand up and ask classmates: "Can you play chess?" / "Can you swim?"',
          studentRoleAndTasks: 'Pupils move around classroom, ask questions, and write names in survey grid.',
          interactionPattern: 'Group',
        },
        {
          stepNumber: 4,
          phaseName: 'Report Findings',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Asks 3 pupils to report survey findings: "Amina can play chess, but she can\'t drive a car."',
          studentRoleAndTasks: 'Pupils report findings orally.',
          interactionPattern: 'Plenary',
        },
      ],
      homeworkTitle: 'My Talent Profile Paragraph',
      homeworkInstructions: 'Write 5 sentences detailing 3 things you can do and 2 things you cannot do.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-3ms-abilities',
        'Suggested Lesson Plan: 3MS Expressing Abilities with Can/Can\'t (I Practise)',
        'Interactive survey lesson template for 3AM teachers developing oral fluency regarding talents and abilities.',
        'Lesson Plan',
        '3MS',
        ['lesson-plan', '3AM', 'abilities', 'can-cant', 'practise'],
        JSON.stringify(tpl3MS1, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl3MS1,
        1
      )
    );

    // 7. 3MS Seq 2: Eco-Charter & Environment (Read & Discover)
    const tpl3MS2: LessonTemplatePayload = {
      title: '3MS Seq 2: Green School Eco-Charter & Environmental Protection',
      levelCode: '3MS',
      sequenceNumber: 2,
      rubricCode: 'read_and_discover',
      pedagogicalStage: 'Presentation',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Read and analyze an environmental charter text regarding eco-friendly habits and wildlife conservation.',
      specificObjectives: [
        'Scan text for specific environmental imperatives (must / must not / should).',
        'Identify cause and effect relationships in ecological problems.',
      ],
      targetedCompetencies: ['C2', 'C3'],
      materialsAndAids: ['Reading Text Handout: "Our Eco-Friendly School"', 'Glossary Poster'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Pre-Reading',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Displays images of polluted vs clean natural landscapes in Algeria. Brainstorms: "What can we do to protect our environment?"',
          studentRoleAndTasks: 'Pupils contribute ideas (plant trees, reduce plastic, save water).',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Skimming for Main Idea',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Asks pupils to read text silently for 2 minutes and choose the best title.',
          studentRoleAndTasks: 'Pupils skim text and identify main topic.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 3,
          phaseName: 'Scanning for Details',
          allocatedMinutes: 25,
          teacherRoleAndInstructions: 'Guides pupils through true/false questions and vocabulary matching (e.g., *recycle = reuse materials*).',
          studentRoleAndTasks: 'Pupils scan text, highlight answers, and complete exercises.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 4,
          phaseName: 'Post-Reading Discussion',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Initiates short group discussion: "What 3 green rules should our middle school adopt?"',
          studentRoleAndTasks: 'Pupils propose eco-rules in groups and share with class.',
          interactionPattern: 'Group',
        },
      ],
      homeworkTitle: 'Write 3 Eco-Rules',
      homeworkInstructions: 'Write 3 rules for keeping your school courtyard clean using "We must..." and "We must not...".',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-3ms-eco-reading',
        'Suggested Lesson Plan: 3MS Eco-Charter Reading Comprehension (Read & Discover)',
        'Reading comprehension lesson template for 3AM students analyzing environmental protection charters.',
        'Lesson Plan',
        '3MS',
        ['lesson-plan', '3AM', 'environment', 'reading', 'read-and-discover'],
        JSON.stringify(tpl3MS2, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl3MS2,
        2
      )
    );

    // 8. 4MS Seq 1: Algerian Heritage & Landmarks (Read & Discover)
    const tpl4MS1: LessonTemplatePayload = {
      title: '4MS Seq 1: Famous Algerian Landmarks & World Heritage (Tipaza & Casbah)',
      levelCode: '4MS',
      sequenceNumber: 1,
      rubricCode: 'read_and_discover',
      pedagogicalStage: 'Presentation',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Interpret an informative text about Algerian UNESCO heritage sites and historical landmarks.',
      specificObjectives: [
        'Extract key historical facts: dates of construction, location, architectural characteristics.',
        'Infer meanings of descriptive heritage vocabulary from context.',
      ],
      targetedCompetencies: ['C2'],
      materialsAndAids: ['Reading Text: Tipaza and Casbah', 'Map of Algeria with Heritage Pins', 'Comprehension Sheet'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Pre-Reading (Map & Image Lead-in)',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Shows map of Algeria and photos of Tipaza Roman ruins and Casbah of Algiers. Elicits names of famous landmarks.',
          studentRoleAndTasks: 'Pupils locate sites on map and share personal visits.',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Skimming & Fact-File Completion',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Distributes reading text. Instructs pupils to complete Fact File: Site Name, Location, Historical Era, Key Features.',
          studentRoleAndTasks: 'Pupils read silently and fill in fact file.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 3,
          phaseName: 'Intensive Reading & Vocabulary Search',
          allocatedMinutes: 20,
          teacherRoleAndInstructions: 'Guides pupils to find synonyms for *famous* (renowned), *ancient* (old), and *preserve* (protect) in the text.',
          studentRoleAndTasks: 'Pupils locate synonyms and answer detailed comprehension questions.',
          interactionPattern: 'Pupil-Pupil',
        },
        {
          stepNumber: 4,
          phaseName: 'Post-Reading Reflection',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Asks: "Why is it important for Algerian youth to preserve our monuments?"',
          studentRoleAndTasks: 'Pupils express opinions orally.',
          interactionPattern: 'Plenary',
        },
      ],
      homeworkTitle: 'Landmark Fact File',
      homeworkInstructions: 'Select another Algerian landmark (e.g., Timgad, Mansourah Tower) and create a 4-line fact file.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-4ms-landmarks-reading',
        'Suggested Lesson Plan: 4MS Algerian Heritage & Landmarks (Read & Discover)',
        'Extensive reading lesson plan template for 4AM students exploring Algerian UNESCO heritage sites.',
        'Lesson Plan',
        '4MS',
        ['lesson-plan', '4AM', 'landmarks', 'heritage', 'read-and-discover', 'BEM'],
        JSON.stringify(tpl4MS1, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl4MS1,
        1
      )
    );

    // 9. 4MS Seq 1: Passive Voice in Past Simple (I Practise)
    const tpl4MS2: LessonTemplatePayload = {
      title: '4MS Seq 1: Passive Voice in Past Simple for Historical Landmarks',
      levelCode: '4MS',
      sequenceNumber: 1,
      rubricCode: 'practise',
      pedagogicalStage: 'Practice',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Transform active sentences into passive voice in past simple when describing historical facts and monuments.',
      specificObjectives: [
        'Identify subject, verb in past simple, and object in active sentence.',
        'Construct passive structure: Object + was/were + Past Participle + (by + Agent).',
      ],
      targetedCompetencies: ['C2', 'C3'],
      materialsAndAids: ['Grammar Transformation Chart', 'Irregular Past Participle Reference Sheet'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Warm-up / Elicitation',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Writes two sentences on board: A) "The Romans built Timgad in 100 AD." B) "Timgad was built by the Romans in 100 AD." Asks pupils to compare emphasis.',
          studentRoleAndTasks: 'Pupils note that Sentence B focuses on the monument (object) rather than the builders.',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Rule Formulating & Board Work',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Formulates rule on board: Active: S + V(past) + O -> Passive: O + was/were + V(past participle) + by S. Clarifies singular (was) vs plural (were).',
          studentRoleAndTasks: 'Pupils copy grammar rule and past participle list.',
          interactionPattern: 'Plenary',
        },
        {
          stepNumber: 3,
          phaseName: 'Controlled Practice Drill',
          allocatedMinutes: 25,
          teacherRoleAndInstructions: 'Provides 5 active sentences for transformation: 1. "UNESCO protected the Casbah." 2. "The architect designed the monument."',
          studentRoleAndTasks: 'Pupils transform sentences individually in copybooks.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 4,
          phaseName: 'Correction & BEM Exam Style Check',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Corrects exercise on board with pupil participation. Points out common BEM examination pitfalls.',
          studentRoleAndTasks: 'Pupils check their answers and take notes.',
          interactionPattern: 'Plenary',
        },
      ],
      homeworkTitle: 'Passive Voice Transformation Sheet',
      homeworkInstructions: 'Complete exercise 2 page 34 in textbook (rewrite 5 sentences in passive voice).',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-4ms-passive-grammar',
        'Suggested Lesson Plan: 4MS Passive Voice in Past Simple (I Practise)',
        'BEM-focused grammar lesson plan template on passive voice transformations for 4AM teachers.',
        'Lesson Plan',
        '4MS',
        ['lesson-plan', '4AM', 'passive-voice', 'grammar', 'practise', 'BEM'],
        JSON.stringify(tpl4MS2, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl4MS2,
        1
      )
    );

    // 10. 4MS Seq 2: Childhood Memories & Role Models (Think & Write)
    const tpl4MS3: LessonTemplatePayload = {
      title: '4MS Seq 2: Writing a Narrative Article on Childhood Memories & Role Models',
      levelCode: '4MS',
      sequenceNumber: 2,
      rubricCode: 'think_and_write',
      pedagogicalStage: 'Production',
      estimatedDurationMinutes: 60,
      communicativeObjective: 'Produce a structured 8–10 line narrative paragraph recounting a memorable childhood experience or influential role model.',
      specificObjectives: [
        'Use past simple and past continuous correctly to express past events.',
        'Apply chronological connectors (first, then, suddenly, finally) in written narrative.',
      ],
      targetedCompetencies: ['C3'],
      materialsAndAids: ['Sample BEM Narrative Model Text', 'Connector Reference Board Chart'],
      activitySteps: [
        {
          stepNumber: 1,
          phaseName: 'Pre-Writing (Model Text Analysis)',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Distributes short model narrative text ("My Childhood Teacher"). Highlights time connectors and past verbs.',
          studentRoleAndTasks: 'Pupils identify time connectors and main events in model text.',
          interactionPattern: 'Teacher-Pupil',
        },
        {
          stepNumber: 2,
          phaseName: 'Outline & Brainstorming',
          allocatedMinutes: 15,
          teacherRoleAndInstructions: 'Provides outline guide: Paragraph 1: Introduction (Who/When/Where), Paragraph 2: Key Memory/Event, Paragraph 3: Reflection & Impact.',
          studentRoleAndTasks: 'Pupils outline their personal story ideas in graphic organizer.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 3,
          phaseName: 'Individual Drafting',
          allocatedMinutes: 25,
          teacherRoleAndInstructions: 'Circulates classroom offering individual guidance on verb tenses and spelling during drafting.',
          studentRoleAndTasks: 'Pupils write draft narrative in copybooks.',
          interactionPattern: 'Individual',
        },
        {
          stepNumber: 4,
          phaseName: 'Peer Proofreading & Wrap-up',
          allocatedMinutes: 10,
          teacherRoleAndInstructions: 'Instructs pupils to swap drafts and check tenses and connectors.',
          studentRoleAndTasks: 'Pupils review peer drafts using editing checklist.',
          interactionPattern: 'Pupil-Pupil',
        },
      ],
      homeworkTitle: 'Final Narrative Composition',
      homeworkInstructions: 'Write the final polished version of your childhood memory story on clean paper for evaluation.',
    };

    starterResources.push(
      await buildTextResource(
        'tpl-plan-4ms-narrative-writing',
        'Suggested Lesson Plan: 4MS Childhood Memories Narrative (Think & Write)',
        'Guided narrative writing lesson template for 4AM candidates practicing BEM-style story compositions.',
        'Lesson Plan',
        '4MS',
        ['lesson-plan', '4AM', 'narrative', 'writing', 'think-and-write', 'BEM'],
        JSON.stringify(tpl4MS3, null, 2),
        'teacher_template',
        'UNS SCHOOL Suggested Plan Library',
        tpl4MS3,
        2
      )
    );

    // 1. Write starter resources using deterministic per-record idempotency
    await db.transaction('rw', db.resources, async () => {
      for (const res of starterResources) {
        const existing = await db.resources.get(res.id);
        if (!existing) {
          await db.resources.add(res);
        }
      }
    });

  // 2. Ensure a default AcademicYear exists if academicYears table is completely empty
  const yearCount = await db.academicYears.count();
  if (yearCount === 0) {
    const schools = await db.schools.toArray();
    let school = schools[0];
    if (!school) {
      school = {
        id: 'sch-default-cem',
        name: 'CEM Frères Bouchami',
        nameArabic: 'متوسطة الإخوة بوشامي',
        commune: 'Algiers',
        wilaya: 'Algiers',
        createdAt: now,
        updatedAt: now,
      };
      await db.schools.add(school);
    }

    const defaultYear: AcademicYear = {
      id: 'ay-2026-2027',
      schoolId: school.id,
      label: '2026-2027',
      startDate: '2026-09-06',
      endDate: '2027-07-01',
      isCurrent: true,
      isArchived: false,
      activeCurriculumVersionId: 'curr-dz-ms-en-gen2',
      activeGradingSchemeId: 'scheme-dz-ms-official',
      terms: [
        {
          id: 'term-1-2026',
          termNumber: 1,
          name: '1st Trimester (الفصل الأول)',
          startDate: '2026-09-06',
          endDate: '2026-12-17',
          examinationStartDate: '2026-11-29',
          examinationEndDate: '2026-12-03',
        },
        {
          id: 'term-2-2027',
          termNumber: 2,
          name: '2nd Trimester (الفصل الثاني)',
          startDate: '2027-01-03',
          endDate: '2027-03-18',
          examinationStartDate: '2027-03-07',
          examinationEndDate: '2027-03-11',
        },
        {
          id: 'term-3-2027',
          termNumber: 3,
          name: '3rd Trimester (الفصل الثالث)',
          startDate: '2027-04-04',
          endDate: '2027-07-01',
          examinationStartDate: '2027-05-30',
          examinationEndDate: '2027-06-03',
        },
      ],
      calendarEvents: [
        {
          id: 'evt-ay-2026-2027-rentree',
          title: 'Start of 1st Trimester (Rentrée scolaire)',
          startDate: '2026-09-06',
          eventType: 'term_border',
          description: 'Official start date of the 2026–2027 academic year for pupils (Ministry of National Education announcement, July 30, 2026).',
          status: 'official_verified',
          isOfficial: true,
        },
        {
          id: 'evt-ay-2026-2027-t1-exams',
          title: '1st Trimester Examinations Period',
          startDate: '2026-11-29',
          endDate: '2026-12-03',
          eventType: 'exam_period',
          description: 'Sample planning date — verify against the latest official Ministry calendar.',
          status: 'sample',
          isOfficial: false,
        },
        {
          id: 'evt-ay-2026-2027-winter-vacation',
          title: 'Winter Vacation (Vacances d\'hiver)',
          startDate: '2026-12-17',
          endDate: '2027-01-03',
          eventType: 'holiday',
          description: 'Sample planning date — verify against the latest official Ministry calendar.',
          status: 'sample',
          isOfficial: false,
        },
        {
          id: 'evt-ay-2026-2027-spring-vacation',
          title: 'Spring Vacation (Vacances de printemps)',
          startDate: '2027-03-18',
          endDate: '2027-04-04',
          eventType: 'holiday',
          description: 'Sample planning date — verify against the latest official Ministry calendar.',
          status: 'sample',
          isOfficial: false,
        },
        {
          id: 'evt-ay-2026-2027-bem-exam',
          title: 'BEM National Examination Period (4MS Candidates)',
          startDate: '2027-06-06',
          endDate: '2027-06-08',
          eventType: 'exam_period',
          description: 'Sample planning date — verify against the latest official Ministry calendar.',
          status: 'sample',
          isOfficial: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await db.academicYears.add(defaultYear);
  }

  // 3. Merge starter Calendar Events into Academic Years safely using per-record idempotency
  const academicYears = await db.academicYears.toArray();
  for (const year of academicYears) {
    const is2026 = year.id === 'ay-2026-2027' || year.label === '2026-2027';
    const startYearNum = parseInt((year.startDate || '2026-09-06').split('-')[0], 10) || 2026;
    const endYearNum = startYearNum + 1;

    const sampleEvents: CalendarEvent[] = is2026
      ? [
          {
            id: `evt-${year.id}-term1-start`,
            title: 'Start of 1st Trimester (Rentrée scolaire)',
            startDate: '2026-09-06',
            eventType: 'term_border',
            description: 'Official start date of the 2026–2027 academic year for pupils (Ministry of National Education announcement, July 30, 2026).',
            status: 'official_verified',
            isOfficial: true,
          },
          {
            id: `evt-${year.id}-term1-exams`,
            title: '1st Trimester Examinations Period',
            startDate: '2026-11-29',
            endDate: '2026-12-03',
            eventType: 'exam_period',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-winter-vacation`,
            title: 'Winter Vacation (Vacances d\'hiver)',
            startDate: '2026-12-17',
            endDate: '2027-01-03',
            eventType: 'holiday',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term2-start`,
            title: 'Start of 2nd Trimester',
            startDate: '2027-01-03',
            eventType: 'term_border',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term2-exams`,
            title: '2nd Trimester Examinations Period',
            startDate: '2027-03-07',
            endDate: '2027-03-11',
            eventType: 'exam_period',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-spring-vacation`,
            title: 'Spring Vacation (Vacances de printemps)',
            startDate: '2027-03-18',
            endDate: '2027-04-04',
            eventType: 'holiday',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term3-start`,
            title: 'Start of 3rd Trimester',
            startDate: '2027-04-04',
            eventType: 'term_border',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-bem-exam`,
            title: 'BEM National Examination Period (4MS Candidates)',
            startDate: '2027-06-06',
            endDate: '2027-06-08',
            eventType: 'exam_period',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-summer-vacation`,
            title: 'End of Academic Year & Summer Break',
            startDate: year.endDate || '2027-07-01',
            eventType: 'holiday',
            description: 'Sample planning date — verify against the latest official Ministry calendar.',
            status: 'sample',
            isOfficial: false,
          },
        ]
      : [
          {
            id: `evt-${year.id}-term1-start`,
            title: 'Start of 1st Trimester (Rentrée scolaire)',
            startDate: year.startDate || `${startYearNum}-09-06`,
            eventType: 'term_border',
            description: `Sample start date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term1-exams`,
            title: '1st Trimester Examinations Period',
            startDate: `${startYearNum}-11-29`,
            endDate: `${startYearNum}-12-03`,
            eventType: 'exam_period',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-winter-vacation`,
            title: 'Winter Vacation (Vacances d\'hiver)',
            startDate: `${startYearNum}-12-17`,
            endDate: `${endYearNum}-01-03`,
            eventType: 'holiday',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term2-start`,
            title: 'Start of 2nd Trimester',
            startDate: `${endYearNum}-01-03`,
            eventType: 'term_border',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term2-exams`,
            title: '2nd Trimester Examinations Period',
            startDate: `${endYearNum}-03-07`,
            endDate: `${endYearNum}-03-11`,
            eventType: 'exam_period',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-spring-vacation`,
            title: 'Spring Vacation (Vacances de printemps)',
            startDate: `${endYearNum}-03-18`,
            endDate: `${endYearNum}-04-04`,
            eventType: 'holiday',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-term3-start`,
            title: 'Start of 3rd Trimester',
            startDate: `${endYearNum}-04-04`,
            eventType: 'term_border',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-bem-exam`,
            title: 'BEM National Examination Period (4MS Candidates)',
            startDate: `${endYearNum}-06-06`,
            endDate: `${endYearNum}-06-08`,
            eventType: 'exam_period',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
          {
            id: `evt-${year.id}-summer-vacation`,
            title: 'End of Academic Year & Summer Break',
            startDate: year.endDate || `${endYearNum}-07-01`,
            eventType: 'holiday',
            description: `Sample planning date for academic year ${year.label} — verify against official Ministry calendar.`,
            status: 'sample',
            isOfficial: false,
          },
        ];

    const existingEvents = year.calendarEvents || [];
    const mergedEvents = [...existingEvents];
    let updated = false;

    for (const sampleEvt of sampleEvents) {
      const idx = mergedEvents.findIndex((e) => e.id === sampleEvt.id);
      if (idx === -1) {
        mergedEvents.push(sampleEvt);
        updated = true;
      } else {
        // Ensure start date for term 1 start event is updated to official date
        if (sampleEvt.status === 'official_verified' && mergedEvents[idx].status !== 'user_created') {
          mergedEvents[idx] = sampleEvt;
          updated = true;
        }
      }
    }

    if (updated || year.startDate === '2026-09-20') {
      await db.academicYears.update(year.id, {
        startDate: year.id === 'ay-2026-2027' ? '2026-09-06' : year.startDate,
        calendarEvents: mergedEvents,
        updatedAt: now,
      });
    }
  }
}
