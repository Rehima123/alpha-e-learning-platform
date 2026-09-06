// ─── seedCourses.js ────────────────────────────────────────────────────────────
// Unified seed script for all Ethiopian Public University Freshman courses
// (Semester 1 & 2 — Common, Natural Science, Social Science streams)
//
// Usage:  node server/seedCourses.js
// Env:    Requires MONGODB_URI in server/.env
// ──────────────────────────────────────────────────────────────────────────────

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Course   = require('./models/Course');
const User     = require('./models/User');

// ──────────────────────────────────────────────────────────────────────────────
// Course definitions
// Fields: courseCode, title, stream, semester, description, videos[]
// ──────────────────────────────────────────────────────────────────────────────

const COURSES = [
  // ── SEMESTER 1 — COMMON ──────────────────────────────────────────────────
  {
    courseCode: 'FLEN1011',
    title:      'Communicative English Language Skills I',
    stream:     'Common',
    semester:   1,
    icon:       '📖',
    category:   'semester1',
    level:      'Beginner',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Develop foundational English communication skills for academic and everyday contexts. Covers reading, writing, listening, and speaking at the freshman level.',
    videos: [
      { title: 'Introduction to Academic Reading', chapter: 'Unit 1 – Reading Skills', youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Skimming and Scanning Techniques',  chapter: 'Unit 1 – Reading Skills', youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' },
      { title: 'Paragraph Structure',               chapter: 'Unit 2 – Writing Skills', youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Essay Writing Basics',              chapter: 'Unit 2 – Writing Skills', youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Reading Skills', order: 0, lessons: [
        { title: 'Introduction to Academic Reading', duration: '45 min', order: 0 },
        { title: 'Skimming and Scanning',            duration: '40 min', order: 1 }
      ]},
      { title: 'Unit 2 – Writing Skills', order: 1, lessons: [
        { title: 'Paragraph Structure', duration: '50 min', order: 0 },
        { title: 'Essay Writing Basics', duration: '55 min', order: 1 }
      ]}
    ]
  },
  {
    courseCode: 'LOCT1011',
    title:      'Logic and Critical Thinking',
    stream:     'Common',
    semester:   1,
    icon:       '🧠',
    category:   'semester1',
    level:      'Beginner',
    duration:   '12 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Master logical reasoning, argument analysis, and problem-solving techniques essential for all academic disciplines in Ethiopian universities.',
    videos: [
      { title: 'What is Critical Thinking?',     chapter: 'Unit 1 – Introduction to Logic', youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' },
      { title: 'Arguments and Propositions',     chapter: 'Unit 1 – Introduction to Logic', youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Deductive vs Inductive Logic',   chapter: 'Unit 2 – Types of Reasoning',   youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Logical Fallacies',              chapter: 'Unit 2 – Types of Reasoning',   youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Introduction to Logic', order: 0, lessons: [
        { title: 'What is Critical Thinking?',   duration: '40 min', order: 0 },
        { title: 'Arguments and Propositions',   duration: '45 min', order: 1 }
      ]},
      { title: 'Unit 2 – Types of Reasoning', order: 1, lessons: [
        { title: 'Deductive vs Inductive Logic', duration: '50 min', order: 0 },
        { title: 'Logical Fallacies',            duration: '45 min', order: 1 }
      ]}
    ]
  },
  {
    courseCode: 'HPED1011',
    title:      'Physical Fitness and Health Education',
    stream:     'Common',
    semester:   1,
    icon:       '🏃',
    category:   'semester1',
    level:      'Beginner',
    duration:   '8 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Physical education, nutrition, mental health, and wellness strategies for academic success and lifelong fitness.',
    videos: [
      { title: 'Why Physical Fitness Matters',   chapter: 'Module 1 – Fitness Basics',    youtubeUrl: '', youtubeId: '', duration: '35 min', pdfNoteUrl: '' },
      { title: 'Nutrition and Healthy Eating',   chapter: 'Module 2 – Nutrition',         youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' },
      { title: 'Mental Health and Wellness',     chapter: 'Module 3 – Mental Wellness',   youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Module 1 – Fitness Basics', order: 0, lessons: [
        { title: 'Why Physical Fitness Matters', duration: '35 min', order: 0 }
      ]},
      { title: 'Module 2 – Nutrition', order: 1, lessons: [
        { title: 'Nutrition and Healthy Eating', duration: '40 min', order: 0 }
      ]},
      { title: 'Module 3 – Mental Wellness', order: 2, lessons: [
        { title: 'Mental Health and Wellness', duration: '40 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'GEEHO1011',
    title:      'Geography of Ethiopia and the Horn',
    stream:     'Common',
    semester:   1,
    icon:       '🌍',
    category:   'semester1',
    level:      'Beginner',
    duration:   '14 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Physical and human geography of Ethiopia and the Horn of Africa. Covers climate, landforms, ecosystems, population, and socioeconomic development.',
    videos: [
      { title: 'Introduction to Geography',       chapter: 'Chapter 1 – Physical Geography', youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Landforms of Ethiopia',           chapter: 'Chapter 1 – Physical Geography', youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Climate and Weather Patterns',    chapter: 'Chapter 2 – Climate',            youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Population and Urbanization',     chapter: 'Chapter 3 – Human Geography',   youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Physical Geography', order: 0, lessons: [
        { title: 'Introduction to Geography',    duration: '45 min', order: 0 },
        { title: 'Landforms of Ethiopia',        duration: '50 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Climate', order: 1, lessons: [
        { title: 'Climate and Weather Patterns', duration: '50 min', order: 0 }
      ]},
      { title: 'Chapter 3 – Human Geography', order: 2, lessons: [
        { title: 'Population and Urbanization',  duration: '45 min', order: 0 }
      ]}
    ]
  },

  // ── SEMESTER 1 — NATURAL SCIENCE ─────────────────────────────────────────
  {
    courseCode: 'MATH1011',
    title:      'Mathematics for Natural Science',
    stream:     'Natural',
    semester:   1,
    icon:       '📐',
    category:   'semester1',
    level:      'Intermediate',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Covers functions, limits, differentiation, integration, and analytical geometry. Foundation for engineering, medicine, and natural science students.',
    videos: [
      { title: 'Introduction to Functions',     chapter: 'Chapter 1 – Functions & Limits',  youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Limits and Continuity',         chapter: 'Chapter 1 – Functions & Limits',  youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Derivative Rules',              chapter: 'Chapter 2 – Differentiation',     youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Applications of Derivatives',  chapter: 'Chapter 2 – Differentiation',     youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Indefinite Integration',        chapter: 'Chapter 3 – Integration',         youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Functions & Limits', order: 0, lessons: [
        { title: 'Introduction to Functions',    duration: '50 min', order: 0 },
        { title: 'Limits and Continuity',        duration: '55 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Differentiation', order: 1, lessons: [
        { title: 'Derivative Rules',             duration: '60 min', order: 0 },
        { title: 'Applications of Derivatives', duration: '55 min', order: 1 }
      ]},
      { title: 'Chapter 3 – Integration', order: 2, lessons: [
        { title: 'Indefinite Integration',       duration: '60 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'PHYS1011',
    title:      'General Physics',
    stream:     'Natural',
    semester:   1,
    icon:       '⚛️',
    category:   'semester1',
    level:      'Intermediate',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Mechanics, thermodynamics, waves, and optics. Core physics course for Natural Science stream freshmen.',
    videos: [
      { title: 'Kinematics',                    chapter: 'Chapter 1 – Mechanics',         youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: "Newton's Laws of Motion",       chapter: 'Chapter 1 – Mechanics',         youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Work, Energy and Power',        chapter: 'Chapter 2 – Energy',            youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Waves and Oscillations',        chapter: 'Chapter 3 – Waves',             youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Mechanics', order: 0, lessons: [
        { title: 'Kinematics',              duration: '55 min', order: 0 },
        { title: "Newton's Laws of Motion", duration: '60 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Energy', order: 1, lessons: [
        { title: 'Work, Energy and Power',  duration: '55 min', order: 0 }
      ]},
      { title: 'Chapter 3 – Waves', order: 2, lessons: [
        { title: 'Waves and Oscillations',  duration: '50 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'CHEM1011',
    title:      'General Chemistry',
    stream:     'Natural',
    semester:   1,
    icon:       '⚗️',
    category:   'semester1',
    level:      'Intermediate',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Atomic structure, chemical bonding, reactions, stoichiometry, and thermochemistry for Natural Science stream students.',
    videos: [
      { title: 'Atomic Theory and Structure',   chapter: 'Chapter 1 – Atomic Structure',  youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Chemical Bonding',              chapter: 'Chapter 1 – Atomic Structure',  youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Stoichiometry',                 chapter: 'Chapter 2 – Chemical Reactions',youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Thermochemistry',               chapter: 'Chapter 3 – Thermochemistry',   youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Atomic Structure', order: 0, lessons: [
        { title: 'Atomic Theory and Structure', duration: '55 min', order: 0 },
        { title: 'Chemical Bonding',            duration: '60 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Chemical Reactions', order: 1, lessons: [
        { title: 'Stoichiometry',               duration: '55 min', order: 0 }
      ]},
      { title: 'Chapter 3 – Thermochemistry', order: 2, lessons: [
        { title: 'Thermochemistry',             duration: '55 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'PSYC1011',
    title:      'General Psychology and Life Skills',
    stream:     'Natural',
    semester:   1,
    icon:       '🧩',
    category:   'semester1',
    level:      'Beginner',
    duration:   '14 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Introduction to psychological principles covering behavior, cognition, emotion, personality, human development, and practical life skills.',
    videos: [
      { title: 'What is Psychology?',           chapter: 'Unit 1 – Introduction',          youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Research Methods in Psychology',chapter: 'Unit 1 – Introduction',          youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Motivation and Emotion',        chapter: 'Unit 2 – Motivation',            youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Life Skills and Goal Setting',  chapter: 'Unit 3 – Life Skills',           youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Introduction', order: 0, lessons: [
        { title: 'What is Psychology?',            duration: '45 min', order: 0 },
        { title: 'Research Methods in Psychology', duration: '50 min', order: 1 }
      ]},
      { title: 'Unit 2 – Motivation', order: 1, lessons: [
        { title: 'Motivation and Emotion',         duration: '45 min', order: 0 }
      ]},
      { title: 'Unit 3 – Life Skills', order: 2, lessons: [
        { title: 'Life Skills and Goal Setting',   duration: '50 min', order: 0 }
      ]}
    ]
  },

  // ── SEMESTER 1 — SOCIAL SCIENCE ──────────────────────────────────────────
  {
    courseCode: 'MATH1012',
    title:      'Mathematics for Social Science',
    stream:     'Social',
    semester:   1,
    icon:       '📊',
    category:   'semester1',
    level:      'Beginner',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Sets, functions, linear algebra, matrices, and basic calculus tailored for Social Science stream freshmen.',
    videos: [
      { title: 'Sets and Set Operations',         chapter: 'Chapter 1 – Sets & Functions',   youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Introduction to Functions',       chapter: 'Chapter 1 – Sets & Functions',   youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Matrices and Determinants',       chapter: 'Chapter 2 – Linear Algebra',     youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Basic Calculus for Social Science',chapter: 'Chapter 3 – Calculus',          youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Sets & Functions', order: 0, lessons: [
        { title: 'Sets and Set Operations',          duration: '45 min', order: 0 },
        { title: 'Introduction to Functions',        duration: '50 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Linear Algebra', order: 1, lessons: [
        { title: 'Matrices and Determinants',        duration: '55 min', order: 0 }
      ]},
      { title: 'Chapter 3 – Calculus', order: 2, lessons: [
        { title: 'Basic Calculus for Social Science', duration: '55 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'ECON1011',
    title:      'Introduction to Economics',
    stream:     'Social',
    semester:   1,
    icon:       '💹',
    category:   'semester1',
    level:      'Beginner',
    duration:   '14 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Microeconomics and macroeconomics fundamentals. Supply, demand, markets, GDP, inflation, and monetary policy for Social Science freshmen.',
    videos: [
      { title: 'What is Economics?',           chapter: 'Chapter 1 – Introduction',       youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Supply and Demand',            chapter: 'Chapter 2 – Microeconomics',     youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Market Equilibrium',           chapter: 'Chapter 2 – Microeconomics',     youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'GDP and National Income',      chapter: 'Chapter 3 – Macroeconomics',     youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Introduction', order: 0, lessons: [
        { title: 'What is Economics?',        duration: '45 min', order: 0 }
      ]},
      { title: 'Chapter 2 – Microeconomics', order: 1, lessons: [
        { title: 'Supply and Demand',         duration: '55 min', order: 0 },
        { title: 'Market Equilibrium',        duration: '50 min', order: 1 }
      ]},
      { title: 'Chapter 3 – Macroeconomics', order: 2, lessons: [
        { title: 'GDP and National Income',   duration: '55 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'INCL1011',
    title:      'Inclusiveness',
    stream:     'Social',
    semester:   1,
    icon:       '🤝',
    category:   'semester1',
    level:      'Beginner',
    duration:   '10 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Explore gender, disability, ethnicity, and social inclusion in Ethiopian and global contexts to foster equitable development.',
    videos: [
      { title: 'What is Inclusiveness?',         chapter: 'Unit 1 – Diversity & Inclusion', youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' },
      { title: 'Gender Equality in Ethiopia',    chapter: 'Unit 2 – Gender',                youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Disability and Accessibility',   chapter: 'Unit 3 – Disability',            youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Diversity & Inclusion', order: 0, lessons: [
        { title: 'What is Inclusiveness?',       duration: '40 min', order: 0 }
      ]},
      { title: 'Unit 2 – Gender', order: 1, lessons: [
        { title: 'Gender Equality in Ethiopia',  duration: '45 min', order: 0 }
      ]},
      { title: 'Unit 3 – Disability', order: 2, lessons: [
        { title: 'Disability and Accessibility', duration: '40 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'ANTH1011',
    title:      'Social Anthropology',
    stream:     'Social',
    semester:   1,
    icon:       '🏛️',
    category:   'semester1',
    level:      'Beginner',
    duration:   '12 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: "Study human societies, cultures, and social structures. Understand Ethiopia's diverse cultural heritage and anthropological research methods.",
    videos: [
      { title: 'What is Anthropology?',          chapter: 'Unit 1 – Introduction',          youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Culture and Society',            chapter: 'Unit 2 – Culture',               youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: "Ethiopia's Cultural Diversity",  chapter: 'Unit 3 – Ethiopian Cultures',    youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Introduction', order: 0, lessons: [
        { title: 'What is Anthropology?',        duration: '45 min', order: 0 }
      ]},
      { title: 'Unit 2 – Culture', order: 1, lessons: [
        { title: 'Culture and Society',          duration: '50 min', order: 0 }
      ]},
      { title: "Unit 3 – Ethiopian Cultures", order: 2, lessons: [
        { title: "Ethiopia's Cultural Diversity", duration: '50 min', order: 0 }
      ]}
    ]
  },

  // ── SEMESTER 2 — COMMON ──────────────────────────────────────────────────
  {
    courseCode: 'FLEN1012',
    title:      'Communicative English Language Skills II',
    stream:     'Common',
    semester:   2,
    icon:       '✍️',
    category:   'semester2',
    level:      'Intermediate',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Advanced academic writing, research skills, and presentation techniques. Builds on Communicative English I.',
    videos: [
      { title: 'Research Paper Writing',         chapter: 'Unit 1 – Advanced Writing',      youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Referencing and Citations',      chapter: 'Unit 1 – Advanced Writing',      youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Academic Presentations',         chapter: 'Unit 2 – Speaking Skills',       youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Advanced Writing', order: 0, lessons: [
        { title: 'Research Paper Writing',       duration: '55 min', order: 0 },
        { title: 'Referencing and Citations',    duration: '50 min', order: 1 }
      ]},
      { title: 'Unit 2 – Speaking Skills', order: 1, lessons: [
        { title: 'Academic Presentations',       duration: '50 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'MGMT1012',
    title:      'Entrepreneurship',
    stream:     'Common',
    semester:   2,
    icon:       '💡',
    category:   'semester2',
    level:      'Beginner',
    duration:   '10 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Learn to identify business opportunities, develop ideas, and build an entrepreneurial mindset for the modern Ethiopian and global economy.',
    videos: [
      { title: 'What is Entrepreneurship?',     chapter: 'Unit 1 – Entrepreneurship Basics', youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Business Plan Development',     chapter: 'Unit 2 – Business Planning',       youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Innovation and Creativity',     chapter: 'Unit 3 – Innovation',              youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Entrepreneurship Basics', order: 0, lessons: [
        { title: 'What is Entrepreneurship?',    duration: '45 min', order: 0 }
      ]},
      { title: 'Unit 2 – Business Planning', order: 1, lessons: [
        { title: 'Business Plan Development',    duration: '55 min', order: 0 }
      ]},
      { title: 'Unit 3 – Innovation', order: 2, lessons: [
        { title: 'Innovation and Creativity',    duration: '50 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'MCED1012',
    title:      'Moral and Civic Education',
    stream:     'Common',
    semester:   2,
    icon:       '⚖️',
    category:   'semester2',
    level:      'Beginner',
    duration:   '12 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: "Rights and responsibilities of citizens, democratic governance, constitutional law, and Ethiopia's political system.",
    videos: [
      { title: 'What is Democracy?',            chapter: 'Unit 1 – Civic Education',       youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Ethiopian Constitution',        chapter: 'Unit 1 – Civic Education',       youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Human Rights in Ethiopia',      chapter: 'Unit 2 – Human Rights',          youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Civic Education', order: 0, lessons: [
        { title: 'What is Democracy?',          duration: '45 min', order: 0 },
        { title: 'Ethiopian Constitution',      duration: '55 min', order: 1 }
      ]},
      { title: 'Unit 2 – Human Rights', order: 1, lessons: [
        { title: 'Human Rights in Ethiopia',    duration: '50 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'GLTR1012',
    title:      'Global Trends',
    stream:     'Common',
    semester:   2,
    icon:       '🌐',
    category:   'semester2',
    level:      'Beginner',
    duration:   '12 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: "International organizations, foreign policy, global challenges, sustainable development, and Ethiopia's role in the African Union and world affairs.",
    videos: [
      { title: 'Introduction to Global Trends', chapter: 'Unit 1 – Global Affairs',        youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Sustainable Development Goals', chapter: 'Unit 2 – Sustainability',        youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: "Africa's Role in World Affairs", chapter: 'Unit 3 – Africa & Ethiopia',   youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Unit 1 – Global Affairs', order: 0, lessons: [
        { title: 'Introduction to Global Trends', duration: '45 min', order: 0 }
      ]},
      { title: 'Unit 2 – Sustainability', order: 1, lessons: [
        { title: 'Sustainable Development Goals', duration: '50 min', order: 0 }
      ]},
      { title: "Unit 3 – Africa & Ethiopia", order: 2, lessons: [
        { title: "Africa's Role in World Affairs", duration: '50 min', order: 0 }
      ]}
    ]
  },

  // ── SEMESTER 2 — NATURAL SCIENCE ─────────────────────────────────────────
  {
    courseCode: 'MATH1021',
    title:      'Applied Mathematics / Calculus',
    stream:     'Natural',
    semester:   2,
    icon:       '📏',
    category:   'semester2',
    level:      'Advanced',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Integral calculus, differential equations, linear algebra, and vector calculus for engineering and science majors. Builds on Math 1011.',
    videos: [
      { title: 'Definite Integrals',             chapter: 'Chapter 1 – Integration',        youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Applications of Integration',   chapter: 'Chapter 1 – Integration',        youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Matrices and Linear Systems',   chapter: 'Chapter 2 – Linear Algebra',     youtubeUrl: '', youtubeId: '', duration: '65 min', pdfNoteUrl: '' },
      { title: 'Ordinary Differential Equations',chapter: 'Chapter 3 – ODEs',              youtubeUrl: '', youtubeId: '', duration: '65 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Integration', order: 0, lessons: [
        { title: 'Definite Integrals',             duration: '60 min', order: 0 },
        { title: 'Applications of Integration',   duration: '60 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Linear Algebra', order: 1, lessons: [
        { title: 'Matrices and Linear Systems',   duration: '65 min', order: 0 }
      ]},
      { title: 'Chapter 3 – ODEs', order: 2, lessons: [
        { title: 'Ordinary Differential Equations', duration: '65 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'BIOL1012',
    title:      'General Biology',
    stream:     'Natural',
    semester:   2,
    icon:       '🔬',
    category:   'semester2',
    level:      'Intermediate',
    duration:   '16 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Cell biology, genetics, evolution, ecology, and physiology. Foundation course for Medicine and Natural Science students.',
    videos: [
      { title: 'Cell Structure and Organelles',  chapter: 'Chapter 1 – Cell Biology',       youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Cell Division: Mitosis & Meiosis',chapter: 'Chapter 1 – Cell Biology',      youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Genetics and Heredity',          chapter: 'Chapter 2 – Genetics',           youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' },
      { title: 'Evolution and Natural Selection',chapter: 'Chapter 3 – Evolution',          youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Cell Biology', order: 0, lessons: [
        { title: 'Cell Structure and Organelles',   duration: '55 min', order: 0 },
        { title: 'Cell Division: Mitosis & Meiosis', duration: '60 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Genetics', order: 1, lessons: [
        { title: 'Genetics and Heredity',           duration: '60 min', order: 0 }
      ]},
      { title: 'Chapter 3 – Evolution', order: 2, lessons: [
        { title: 'Evolution and Natural Selection', duration: '55 min', order: 0 }
      ]}
    ]
  },
  {
    courseCode: 'EMTE1012',
    title:      'Introduction to Emerging Technologies',
    stream:     'Natural',
    semester:   2,
    icon:       '💻',
    category:   'semester2',
    level:      'Beginner',
    duration:   '12 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Practical introduction to Artificial Intelligence, Machine Learning, Cloud Computing, Cybersecurity, and the Internet of Things for Natural Science freshmen.',
    videos: [
      { title: 'What are Emerging Technologies?', chapter: 'Module 1 – Overview',           youtubeUrl: '', youtubeId: '', duration: '40 min', pdfNoteUrl: '' },
      { title: 'Introduction to AI and ML',       chapter: 'Module 2 – Artificial Intelligence', youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Cloud Computing Basics',          chapter: 'Module 3 – Cloud & IoT',        youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Cybersecurity Fundamentals',      chapter: 'Module 4 – Cybersecurity',      youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Module 1 – Overview', order: 0, lessons: [
        { title: 'What are Emerging Technologies?', duration: '40 min', order: 0 }
      ]},
      { title: 'Module 2 – Artificial Intelligence', order: 1, lessons: [
        { title: 'Introduction to AI and ML',       duration: '50 min', order: 0 }
      ]},
      { title: 'Module 3 – Cloud & IoT', order: 2, lessons: [
        { title: 'Cloud Computing Basics',           duration: '45 min', order: 0 }
      ]},
      { title: 'Module 4 – Cybersecurity', order: 3, lessons: [
        { title: 'Cybersecurity Fundamentals',       duration: '50 min', order: 0 }
      ]}
    ]
  },

  // ── SEMESTER 2 — SOCIAL SCIENCE ──────────────────────────────────────────
  {
    courseCode: 'STAT1012',
    title:      'Basic Statistics',
    stream:     'Social',
    semester:   2,
    icon:       '📈',
    category:   'semester2',
    level:      'Beginner',
    duration:   '14 weeks',
    price:      0,
    isPremium:  false,
    isLocked:   false,
    isFreePreview: false,
    isPublished: true,
    description: 'Descriptive and inferential statistics, data collection, probability, frequency distributions, hypothesis testing, and statistical software for Social Science students.',
    videos: [
      { title: 'Introduction to Statistics',     chapter: 'Chapter 1 – Descriptive Statistics', youtubeUrl: '', youtubeId: '', duration: '45 min', pdfNoteUrl: '' },
      { title: 'Measures of Central Tendency',   chapter: 'Chapter 1 – Descriptive Statistics', youtubeUrl: '', youtubeId: '', duration: '50 min', pdfNoteUrl: '' },
      { title: 'Probability Fundamentals',       chapter: 'Chapter 2 – Probability',            youtubeUrl: '', youtubeId: '', duration: '55 min', pdfNoteUrl: '' },
      { title: 'Hypothesis Testing',             chapter: 'Chapter 3 – Inferential Statistics', youtubeUrl: '', youtubeId: '', duration: '60 min', pdfNoteUrl: '' }
    ],
    chapters: [
      { title: 'Chapter 1 – Descriptive Statistics', order: 0, lessons: [
        { title: 'Introduction to Statistics',       duration: '45 min', order: 0 },
        { title: 'Measures of Central Tendency',     duration: '50 min', order: 1 }
      ]},
      { title: 'Chapter 2 – Probability', order: 1, lessons: [
        { title: 'Probability Fundamentals',         duration: '55 min', order: 0 }
      ]},
      { title: 'Chapter 3 – Inferential Statistics', order: 2, lessons: [
        { title: 'Hypothesis Testing',               duration: '60 min', order: 0 }
      ]}
    ]
  }
];

// ──────────────────────────────────────────────────────────────────────────────
// Seeder
// ──────────────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Require admin user as instructor
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ No admin user found. Run make-admin-atlas.js first.');
      process.exit(1);
    }

    console.log(`👤 Using instructor: ${admin.email}`);

    // Prompt before overwriting
    const existing = await Course.countDocuments({ courseCode: { $exists: true, $ne: null } });
    if (existing > 0) {
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => {
        rl.question(
          `⚠️  Found ${existing} seeded course(s). Delete and re-seed? (y/n): `,
          answer => {
            rl.close();
            if (answer.toLowerCase() !== 'y') {
              console.log('Aborted.');
              process.exit(0);
            }
            resolve();
          }
        );
      });
      // Remove only courses that have a courseCode (seeded ones)
      await Course.deleteMany({ courseCode: { $exists: true, $ne: null } });
      console.log('🗑️  Cleared previously seeded courses');
    }

    // Insert courses
    let count = 0;
    const summary = { Common: 0, Natural: 0, Social: 0 };

    for (const c of COURSES) {
      const totalLessons = c.chapters.reduce((s, ch) => s + ch.lessons.length, 0);

      await Course.create({
        ...c,
        instructor:     admin._id,
        instructorName: admin.fullName || 'Alpha Freshman Tutorial',
        status:         'approved',
        totalLessons,
        department: c.stream === 'Common'  ? `Semester ${c.semester} – Common` :
                    c.stream === 'Natural' ? `Semester ${c.semester} – Natural Science` :
                    c.stream === 'Social'  ? `Semester ${c.semester} – Social Science` : ''
      });

      summary[c.stream]++;
      console.log(`  ✅ [Sem ${c.semester}][${c.stream.padEnd(7)}] ${c.courseCode} – ${c.title}`);
      count++;
    }

    console.log(`\n🎉 Seeded ${count} courses successfully!\n`);
    console.log('📊 Breakdown:');
    console.log(`   Semester 1: ${COURSES.filter(c => c.semester === 1).length} courses`);
    console.log(`   Semester 2: ${COURSES.filter(c => c.semester === 2).length} courses`);
    console.log(`   Common:     ${summary.Common} courses`);
    console.log(`   Natural:    ${summary.Natural} courses`);
    console.log(`   Social:     ${summary.Social} courses`);
    console.log('\n🔍 Test filtering:');
    console.log('   GET /api/courses?stream=Natural&semester=1');
    console.log('   GET /api/courses?stream=Common&semester=2');
    console.log('   GET /api/courses?stream=Social');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
