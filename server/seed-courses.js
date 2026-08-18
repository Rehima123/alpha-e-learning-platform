// ─── Seed all courses to MongoDB Atlas ────────────────────────────────────────
// Run: node server/seed-courses.js
// Seeds all 22 Ethiopian Freshman courses with lock/unlock status

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Course   = require('./models/Course');
const User     = require('./models/User');

const COURSES = [
  {
    title: 'Communicative English I', icon: '📖', category: 'semester1',
    level: 'Beginner', duration: '16 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Develop essential English communication skills for academic and everyday contexts. Covers reading, writing, listening and speaking.',
    chapters: [
      { title: 'Unit 1 - Reading Skills', order: 0, lessons: [
        { title: 'Introduction to Academic Reading', duration: '45 min', order: 0, notes: '## Reading Skills\nAcademic reading requires active engagement.\n\n**Key Strategies:**\n- Skimming for main ideas\n- Scanning for details\n- Identifying topic sentences' },
        { title: 'Skimming and Scanning', duration: '40 min', order: 1, notes: '## Skimming vs Scanning\n**Skimming:** Read quickly for general meaning\n**Scanning:** Search for specific information' },
        { title: 'Vocabulary in Context', duration: '35 min', order: 2, notes: '## Context Clues\nUse surrounding words to determine meaning of unfamiliar words.' }
      ]},
      { title: 'Unit 2 - Writing Skills', order: 1, lessons: [
        { title: 'Paragraph Structure', duration: '50 min', order: 0, notes: '## Paragraph Structure\nEvery paragraph has:\n- **Topic sentence**\n- **Supporting sentences**\n- **Concluding sentence**' },
        { title: 'Essay Writing Basics', duration: '55 min', order: 1, notes: '## Essay Structure\n- Introduction (hook + thesis)\n- Body paragraphs (3+)\n- Conclusion' }
      ]}
    ]
  },
  {
    title: 'Mathematics for Natural Science', icon: '📐', category: 'semester1',
    level: 'Intermediate', duration: '16 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Covers calculus, algebra and analytical geometry. Foundation for engineering, medicine and natural science students.',
    chapters: [
      { title: 'Chapter 1 - Functions & Limits', order: 0, lessons: [
        { title: 'Introduction to Functions', duration: '50 min', order: 0, notes: '## Functions\nA function f maps each input x to exactly one output f(x).' },
        { title: 'Limits and Continuity', duration: '55 min', order: 1, notes: '## Limits\nlim(x→a) f(x) = L means f(x) approaches L as x approaches a.' }
      ]},
      { title: 'Chapter 2 - Differentiation', order: 1, lessons: [
        { title: 'Derivative Rules', duration: '60 min', order: 0, notes: '## Differentiation Rules\n- Power Rule: d/dx(xⁿ) = nxⁿ⁻¹\n- Product Rule\n- Chain Rule' },
        { title: 'Applications of Derivatives', duration: '55 min', order: 1, notes: '## Applications\n- Finding maxima/minima\n- Related rates' }
      ]}
    ]
  },
  {
    title: 'Critical Thinking & Logic', icon: '🧠', category: 'semester1',
    level: 'Beginner', duration: '12 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Master logical reasoning, argument analysis and problem-solving techniques essential for all academic disciplines.',
    chapters: [
      { title: 'Unit 1 - Introduction to Logic', order: 0, lessons: [
        { title: 'What is Critical Thinking?', duration: '40 min', order: 0, notes: '## Critical Thinking\nThe ability to analyze facts and form judgments.' },
        { title: 'Arguments and Propositions', duration: '45 min', order: 1, notes: '## Arguments\nAn argument has **premises** (reasons) and a **conclusion**.' }
      ]}
    ]
  },
  {
    title: 'Introduction to Geography', icon: '🌍', category: 'semester1',
    level: 'Beginner', duration: '14 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Physical and human geography of Ethiopia and the world. Covers climate, ecosystems, population and development.',
    chapters: [
      { title: 'Chapter 1 - Physical Geography', order: 0, lessons: [
        { title: 'Introduction to Geography', duration: '45 min', order: 0, notes: '## Geography\nStudy of Earth\'s landscapes, peoples, places and environments.' },
        { title: 'Climate and Weather', duration: '50 min', order: 1, notes: '## Climate vs Weather\n**Weather:** Day-to-day atmospheric conditions\n**Climate:** Long-term weather patterns' }
      ]}
    ]
  },
  {
    title: 'General Psychology', icon: '🧩', category: 'semester1',
    level: 'Beginner', duration: '14 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Introduction to psychological principles covering behavior, cognition, emotion, personality and human development.',
    chapters: [
      { title: 'Unit 1 - Introduction', order: 0, lessons: [
        { title: 'What is Psychology?', duration: '45 min', order: 0, notes: '## Psychology\nScientific study of behavior and mental processes.' },
        { title: 'Research Methods', duration: '50 min', order: 1, notes: '## Research Methods\n- Experimental\n- Observational\n- Case studies\n- Surveys' }
      ]}
    ]
  },
  {
    title: 'General Physics I', icon: '⚛️', category: 'semester1',
    level: 'Intermediate', duration: '16 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Mechanics, thermodynamics, waves and optics. Core physics for Natural Science stream students.',
    chapters: [
      { title: 'Chapter 1 - Mechanics', order: 0, lessons: [
        { title: 'Kinematics', duration: '55 min', order: 0, notes: '## Kinematics\nStudy of motion without considering forces.\n\n**Equations:**\nv = u + at\ns = ut + ½at²' },
        { title: 'Newton\'s Laws', duration: '60 min', order: 1, notes: '## Newton\'s Laws\n1. Inertia\n2. F = ma\n3. Action-Reaction' }
      ]}
    ]
  },
  {
    title: 'Communicative English II', icon: '✍️', category: 'semester2',
    level: 'Intermediate', duration: '16 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Advanced academic writing, research skills and presentation techniques. Build on Communicative English I.',
    chapters: [
      { title: 'Unit 1 - Advanced Writing', order: 0, lessons: [
        { title: 'Research Paper Writing', duration: '55 min', order: 0, notes: '## Research Paper\n- Introduction\n- Literature Review\n- Methodology\n- Results\n- Discussion\n- Conclusion' }
      ]}
    ]
  },
  {
    title: 'Introduction to Anthropology', icon: '🏛️', category: 'semester2',
    level: 'Beginner', duration: '12 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Study human societies, cultures and evolution. Understand Ethiopia\'s diverse cultural heritage.',
    chapters: [
      { title: 'Unit 1 - What is Anthropology?', order: 0, lessons: [
        { title: 'Introduction to Anthropology', duration: '45 min', order: 0, notes: '## Anthropology\nStudy of humanity, culture and society.' }
      ]}
    ]
  },
  {
    title: 'ICT & Computer Applications', icon: '💻', category: 'semester2',
    level: 'Beginner', duration: '12 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Practical computer skills including word processing, spreadsheets, presentations, internet and basic programming.',
    chapters: [
      { title: 'Module 1 - Computer Basics', order: 0, lessons: [
        { title: 'Introduction to Computers', duration: '40 min', order: 0, notes: '## Computer Basics\n**Hardware:** Physical components\n**Software:** Programs and OS' },
        { title: 'Microsoft Word Essentials', duration: '50 min', order: 1, notes: '## MS Word\n- Creating and formatting documents\n- Tables and images' }
      ]}
    ]
  },
  {
    title: 'Entrepreneurship & Innovation', icon: '💡', category: 'semester2',
    level: 'Beginner', duration: '10 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Learn to identify opportunities, develop business ideas and build entrepreneurial mindset for the modern economy.',
    chapters: [
      { title: 'Unit 1 - Entrepreneurship Basics', order: 0, lessons: [
        { title: 'What is Entrepreneurship?', duration: '45 min', order: 0, notes: '## Entrepreneurship\nProcess of designing, launching and running a new business.' }
      ]}
    ]
  },
  {
    title: 'Ethiopian History & Heritage', icon: '📜', category: 'semester2',
    level: 'Beginner', duration: '14 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Comprehensive study of Ethiopian history from ancient civilizations to the modern state.',
    chapters: [
      { title: 'Chapter 1 - Ancient Ethiopia', order: 0, lessons: [
        { title: 'Aksum Empire', duration: '55 min', order: 0, notes: '## Aksum Empire\nOne of the greatest ancient civilizations.\n\n**Achievements:**\n- Unique Ge\'ez writing system\n- Obelisks (Stelae)\n- First African nation to adopt Christianity' },
        { title: 'Battle of Adwa', duration: '55 min', order: 1, notes: '## Battle of Adwa (1896)\nEthiopia\'s historic victory against Italian colonization.\n\nOnly African nation to defeat a European colonizer.' }
      ]}
    ]
  },
  {
    title: 'Civic Education & Democracy', icon: '⚖️', category: 'semester2',
    level: 'Beginner', duration: '12 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Rights and responsibilities of citizens, democratic governance, constitutional law and Ethiopia\'s political system.',
    chapters: [
      { title: 'Unit 1 - Civic Education', order: 0, lessons: [
        { title: 'What is Democracy?', duration: '45 min', order: 0, notes: '## Democracy\nGovernment by the people, for the people.' }
      ]}
    ]
  },
  {
    title: 'Introduction to Economics', icon: '📊', category: 'social',
    level: 'Beginner', duration: '14 weeks', price: 120,
    isPremium: true, isLocked: true, isFreePreview: true, isPublished: true,
    description: 'Microeconomics and macroeconomics fundamentals. Supply, demand, markets, GDP, inflation and monetary policy.',
    chapters: [
      { title: 'Chapter 1 - Microeconomics', order: 0, lessons: [
        { title: 'Supply and Demand', duration: '55 min', order: 0, notes: '## Supply & Demand\nFoundation of market economics.\n\n**Law of Demand:** Price↑ → Quantity demanded↓\n**Law of Supply:** Price↑ → Quantity supplied↑' },
        { title: 'Market Equilibrium (FREE PREVIEW)', duration: '50 min', order: 1, notes: '## Market Equilibrium\nWhere supply meets demand — the market clearing price.' }
      ]}
    ]
  },
  {
    title: 'General Biology', icon: '🔬', category: 'natural',
    level: 'Intermediate', duration: '16 weeks', price: 150,
    isPremium: true, isLocked: true, isFreePreview: true, isPublished: true,
    description: 'Cell biology, genetics, evolution, ecology and physiology. Foundation course for Medicine and Natural Science students.',
    chapters: [
      { title: 'Chapter 1 - Cell Biology', order: 0, lessons: [
        { title: 'Cell Structure (FREE PREVIEW)', duration: '55 min', order: 0, notes: '## The Cell\nBasic unit of life.\n\n**Organelles:**\n- Nucleus\n- Mitochondria\n- Ribosome' },
        { title: 'Cell Division', duration: '60 min', order: 1, notes: '## Cell Division\n**Mitosis:** Growth\n**Meiosis:** Reproduction' }
      ]}
    ]
  },
  {
    title: 'General Chemistry', icon: '⚗️', category: 'natural',
    level: 'Intermediate', duration: '16 weeks', price: 150,
    isPremium: true, isLocked: true, isFreePreview: true, isPublished: true,
    description: 'Atomic structure, chemical bonding, reactions, stoichiometry and thermochemistry for science stream students.',
    chapters: [
      { title: 'Chapter 1 - Atomic Structure', order: 0, lessons: [
        { title: 'Atomic Theory (FREE PREVIEW)', duration: '55 min', order: 0, notes: '## Atomic Theory\nMatter is made of atoms.\n\n**Subatomic Particles:**\n- Proton (+)\n- Neutron (0)\n- Electron (-)' },
        { title: 'Chemical Bonding', duration: '60 min', order: 1, notes: '## Chemical Bonds\n- Ionic: metal + non-metal\n- Covalent: non-metal + non-metal\n- Metallic: metal + metal' }
      ]}
    ]
  },
  {
    title: 'Advanced Mathematics', icon: '📏', category: 'natural',
    level: 'Advanced', duration: '16 weeks', price: 200,
    isPremium: true, isLocked: true, isFreePreview: true, isPublished: true,
    description: 'Differential equations, linear algebra, vector calculus and complex analysis for engineering and science majors.',
    chapters: [
      { title: 'Chapter 1 - Linear Algebra', order: 0, lessons: [
        { title: 'Matrices (FREE PREVIEW)', duration: '60 min', order: 0, notes: '## Matrices\nRectangular arrays of numbers used in linear algebra.' },
        { title: 'Differential Equations', duration: '65 min', order: 1, notes: '## ODEs\nEquations involving derivatives.\n\n**Separable:** dy/dx = g(x)h(y)' }
      ]}
    ]
  },
  {
    title: 'Global Affairs & International Relations', icon: '🌐', category: 'social',
    level: 'Intermediate', duration: '12 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'International organizations, foreign policy, global challenges and Ethiopia\'s role in the African Union and world affairs.',
    chapters: [
      { title: 'Unit 1 - Global Affairs', order: 0, lessons: [
        { title: 'Introduction to IR', duration: '45 min', order: 0, notes: '## International Relations\nStudy of relationships between nations.' }
      ]}
    ]
  },
  {
    title: 'Inclusiveness & Diversity Studies', icon: '🤝', category: 'social',
    level: 'Beginner', duration: '10 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Explore gender, disability, ethnicity and social inclusion in Ethiopian and global contexts.',
    chapters: [
      { title: 'Unit 1 - Diversity', order: 0, lessons: [
        { title: 'What is Inclusiveness?', duration: '40 min', order: 0, notes: '## Inclusiveness\nEnsuring everyone has equal access and opportunity.' }
      ]}
    ]
  },
  {
    title: 'Physical Fitness & Health', icon: '🏃', category: 'semester1',
    level: 'Beginner', duration: '8 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Physical education, nutrition, mental health and wellness strategies for academic success and lifelong fitness.',
    chapters: [
      { title: 'Module 1 - Fitness Basics', order: 0, lessons: [
        { title: 'Why Physical Fitness Matters', duration: '35 min', order: 0, notes: '## Physical Fitness\nRegular exercise improves physical and mental health.' }
      ]}
    ]
  },
  {
    title: 'Freshman Exam Preparation', icon: '🎯', category: 'natural',
    level: 'Intermediate', duration: '6 weeks', price: 250,
    isPremium: true, isLocked: true, isFreePreview: true, isPublished: true,
    description: 'Complete exam preparation with past papers, mock tests and AI-powered practice questions for all freshman subjects.',
    chapters: [
      { title: 'Module 1 - Exam Strategy', order: 0, lessons: [
        { title: 'How to Study Effectively (FREE PREVIEW)', duration: '40 min', order: 0, notes: '## Study Strategies\n- Active recall\n- Spaced repetition\n- Pomodoro technique\n- Mind mapping' },
        { title: 'Math Quick Review', duration: '55 min', order: 1, notes: '## Key Math Topics\n- Calculus fundamentals\n- Algebra\n- Statistics basics' }
      ]}
    ]
  },
  {
    title: 'Study Skills & Time Management', icon: '⏰', category: 'semester1',
    level: 'Beginner', duration: '4 weeks', price: 0,
    isPremium: false, isLocked: false, isFreePreview: false, isPublished: true,
    description: 'Evidence-based learning strategies, memory techniques, note-taking and exam strategies to maximize your GPA.',
    chapters: [
      { title: 'Unit 1 - Study Skills', order: 0, lessons: [
        { title: 'Effective Note-Taking', duration: '35 min', order: 0, notes: '## Note-Taking Methods\n- Cornell Method\n- Mind Mapping\n- Outline Method' }
      ]}
    ]
  },
  {
    title: 'Introduction to Law', icon: '📋', category: 'social',
    level: 'Intermediate', duration: '14 weeks', price: 120,
    isPremium: true, isLocked: true, isFreePreview: true, isPublished: true,
    description: 'Fundamentals of Ethiopian legal system, constitutional law, human rights and access to justice for social science students.',
    chapters: [
      { title: 'Chapter 1 - Legal Fundamentals', order: 0, lessons: [
        { title: 'What is Law? (FREE PREVIEW)', duration: '45 min', order: 0, notes: '## Law\nSystem of rules created and enforced by social or governmental institutions.' },
        { title: 'Ethiopian Constitution', duration: '55 min', order: 1, notes: '## Ethiopian Constitution\nAdopted in 1995. Federal Democratic Republic of Ethiopia.' }
      ]}
    ]
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Get admin user to set as instructor
    const admin = await User.findOne({ email: 'supportalphafreshman@gmail.com' });
    if (!admin) {
      console.error('❌ Admin user not found. Run make-admin-atlas.js first.');
      process.exit(1);
    }

    // Clear existing courses
    const existing = await Course.countDocuments();
    if (existing > 0) {
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => {
        rl.question(`⚠️  ${existing} courses already exist. Overwrite? (y/n): `, answer => {
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('Aborted.');
            process.exit(0);
          }
          resolve();
        });
      });
      await Course.deleteMany({});
      console.log('🗑️  Cleared existing courses');
    }

    // Seed courses
    let count = 0;
    for (const c of COURSES) {
      await Course.create({
        ...c,
        instructor:     admin._id,
        instructorName: 'Alpha Freshman Tutorial',
        status:         'approved',
        totalLessons:   c.chapters.reduce((s, ch) => s + ch.lessons.length, 0),
        department:     c.category === 'semester1' ? 'Semester 1' :
                        c.category === 'semester2' ? 'Semester 2' :
                        c.category === 'natural'   ? 'Natural Science' :
                        c.category === 'social'    ? 'Social Science' : c.category
      });
      const lockStatus = c.isLocked ? '🔒 LOCKED' : '🔓 FREE';
      console.log(`  ✅ ${c.icon} ${c.title} — ${lockStatus} (${c.price} ETB)`);
      count++;
    }

    console.log(`\n🎉 Seeded ${count} courses successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Free (unlocked): ${COURSES.filter(c => !c.isLocked).length} courses`);
    console.log(`   Premium (locked): ${COURSES.filter(c => c.isLocked).length} courses`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
