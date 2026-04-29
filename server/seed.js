require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alpha_tutorial';

function makeLessons(titles) {
    return titles.map((title, i) => ({
        title,
        description: `Comprehensive lesson covering ${title.toLowerCase()}.`,
        duration: `${30 + (i % 4) * 10} min`,
        order: i + 1
    }));
}

const courseData = [
    { title: 'Communicative English Language Skills I', description: 'Build strong English communication foundations — speaking, academic writing, reading comprehension, and listening skills essential for university success.', icon: '📝', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 29.99, rating: 4.7, enrolledStudents: 8500, isPremium: true, isFreePreview: true, tags: ['english','communication','writing'], lessons: makeLessons(['Introduction to Academic English','Reading Comprehension Strategies','Essay Writing Fundamentals','Paragraph Structure & Coherence','Listening Skills & Note-Taking','Oral Presentation Techniques','Grammar Review: Tenses & Voice','Vocabulary Building Strategies','Research & Citation Basics','Final Exam Preparation']) },
    { title: 'Critical Thinking', description: 'Develop analytical reasoning, logical argumentation, and problem-solving abilities. Learn to evaluate evidence, identify fallacies, and construct sound arguments.', icon: '🧠', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 34.99, rating: 4.8, enrolledStudents: 7800, isPremium: true, isFreePreview: true, tags: ['logic','reasoning','analysis'], lessons: makeLessons(['What is Critical Thinking?','Identifying Arguments & Claims','Logical Fallacies','Inductive vs Deductive Reasoning','Evaluating Evidence & Sources','Bias & Perspective','Problem-Solving Frameworks','Decision Making Under Uncertainty','Ethical Reasoning','Applying Critical Thinking in Exams']) },
    { title: 'Mathematics for Natural Sciences', description: 'Master algebra, calculus fundamentals, and mathematical reasoning required for natural science and engineering pathways.', icon: '🔢', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 39.99, rating: 4.6, enrolledStudents: 9200, isPremium: true, isFreePreview: true, tags: ['math','algebra','calculus'], lessons: makeLessons(['Number Systems & Sets','Algebraic Expressions & Equations','Functions & Graphs','Polynomial & Rational Functions','Exponential & Logarithmic Functions','Trigonometry Basics','Introduction to Limits','Derivatives & Differentiation','Integration Fundamentals','Applications of Calculus']) },
    { title: 'Geography of Ethiopia & the Horn', description: 'Explore the physical and regional geography of Ethiopia and the Horn of Africa — landscapes, climate zones, natural resources, and regional characteristics.', icon: '🗺️', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 29.99, rating: 4.5, enrolledStudents: 6900, isPremium: true, isFreePreview: false, tags: ['geography','ethiopia','africa'], lessons: makeLessons(['Physical Geography of Ethiopia','Climate & Weather Patterns','River Systems & Water Resources','Highlands & Rift Valley','Natural Resources & Biodiversity','Regional Geography: Horn of Africa','Population & Settlement Patterns','Agriculture & Land Use','Environmental Challenges','Geopolitics of the Horn']) },
    { title: 'General Psychology', description: 'Introduction to human behavior and mental processes — perception, cognition, emotion, personality, and social psychology.', icon: '🧑‍🎓', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 32.99, rating: 4.9, enrolledStudents: 8100, isPremium: true, isFreePreview: true, tags: ['psychology','behavior','cognition'], lessons: makeLessons(['Introduction to Psychology','Biological Bases of Behavior','Sensation & Perception','States of Consciousness','Learning & Conditioning','Memory & Cognition','Motivation & Emotion','Developmental Psychology','Personality Theories','Social Psychology']) },
    { title: 'Physical Fitness', description: 'Sports and fitness activities for physical health and wellness. Pass/Fail course covering exercise science, nutrition basics, and team sports.', icon: '⚽', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 0, rating: 4.8, enrolledStudents: 9500, isPremium: false, isFreePreview: false, tags: ['fitness','sports','health'], lessons: makeLessons(['Introduction to Physical Fitness','Warm-Up & Stretching Techniques','Cardiovascular Training','Strength & Resistance Training','Team Sports: Football Basics','Team Sports: Basketball Basics','Nutrition & Hydration','Injury Prevention & First Aid','Mental Health & Exercise','Fitness Assessment & Goals']) },
    { title: 'General Physics', description: 'Physics fundamentals for natural science students — mechanics, energy, waves, thermodynamics, and electromagnetism.', icon: '⚛️', category: 'semester1', level: 'Freshman', duration: '1 Semester', price: 44.99, rating: 4.7, enrolledStudents: 7400, isPremium: true, isFreePreview: true, tags: ['physics','mechanics','energy'], lessons: makeLessons(['Measurements & Units','Kinematics: Motion in 1D','Kinematics: Motion in 2D',"Newton's Laws of Motion",'Work, Energy & Power','Momentum & Collisions','Rotational Motion','Waves & Sound','Thermodynamics Basics','Introduction to Electromagnetism']) },
    { title: 'Communicative English Language Skills II', description: 'Advanced academic English — research writing, presentations, critical reading, and professional communication skills.', icon: '📚', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 29.99, rating: 4.8, enrolledStudents: 8200, isPremium: true, isFreePreview: true, tags: ['english','academic writing','research'], lessons: makeLessons(['Advanced Academic Writing','Research Paper Structure','Literature Review Writing','APA & MLA Citation','Critical Reading Strategies','Argumentative Essays','Professional Email & Reports','Debate & Discussion Skills','Editing & Proofreading','Final Research Project']) },
    { title: 'Social Anthropology', description: 'Understanding human societies and cultural diversity — kinship, religion, economics, politics, and social structures across cultures.', icon: '🌍', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 32.99, rating: 4.6, enrolledStudents: 7100, isPremium: true, isFreePreview: false, tags: ['anthropology','culture','society'], lessons: makeLessons(['Introduction to Anthropology','Culture & Cultural Relativism','Kinship & Family Systems','Religion & Ritual','Economic Anthropology','Political Systems & Power','Gender & Society','Ethnicity & Identity','Globalization & Culture Change','Ethiopian Societies & Cultures']) },
    { title: 'Introduction to Emerging Technologies', description: 'ICT basics and digital literacy — computer fundamentals, internet, cloud computing, AI overview, and cybersecurity essentials.', icon: '💻', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 39.99, rating: 4.9, enrolledStudents: 9800, isPremium: true, isFreePreview: true, tags: ['technology','ICT','AI','cybersecurity'], lessons: makeLessons(['Computer Hardware & Software','Operating Systems Overview','Internet & Networking Basics','Cloud Computing Concepts','Introduction to AI & Machine Learning','Big Data & Analytics','Cybersecurity Fundamentals','Digital Communication Tools','E-Commerce & Digital Economy','Future of Technology']) },
    { title: 'Entrepreneurship', description: 'Business and innovation fundamentals — startup thinking, business planning, marketing basics, and entrepreneurial mindset.', icon: '💼', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 34.99, rating: 4.7, enrolledStudents: 8600, isPremium: true, isFreePreview: true, tags: ['entrepreneurship','business','startup'], lessons: makeLessons(['Entrepreneurial Mindset','Identifying Business Opportunities','Business Model Canvas','Market Research Basics','Financial Planning & Budgeting','Marketing Fundamentals','Leadership & Team Building','Risk Management','Pitching Your Idea','Ethiopian Business Environment']) },
    { title: 'History of Ethiopia & the Horn', description: 'From ancient Axumite civilization to modern Ethiopia — kingdoms, colonialism, revolution, and contemporary history.', icon: '📜', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 29.99, rating: 4.5, enrolledStudents: 7300, isPremium: true, isFreePreview: false, tags: ['history','ethiopia','africa'], lessons: makeLessons(['Ancient Ethiopian Civilizations','The Axumite Empire','Medieval Ethiopian Kingdoms','The Zemene Mesafint Era','Emperor Tewodros II & Modernization','Battle of Adwa 1896','Haile Selassie Era','The Derg Revolution','Post-1991 Federal Ethiopia','Contemporary Horn of Africa']) },
    { title: 'Moral & Civic Education', description: 'Citizenship, ethics, and civic responsibility — values, human rights, democratic principles, and civic engagement in Ethiopia.', icon: '⚖️', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 27.99, rating: 4.6, enrolledStudents: 8900, isPremium: true, isFreePreview: false, tags: ['civics','ethics','democracy'], lessons: makeLessons(['Introduction to Ethics & Morality','Human Rights & Dignity','Democratic Values & Principles','Ethiopian Constitution','Civic Responsibilities & Duties','Rule of Law & Justice','Gender Equality & Social Justice','Environmental Ethics','Conflict Resolution & Peace','Active Citizenship']) },
    { title: 'Global Trends / Global Affairs', description: "International relations, global challenges, and world events — geopolitics, climate change, globalization, and Ethiopia's role in global affairs.", icon: '🌐', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 32.99, rating: 4.7, enrolledStudents: 7600, isPremium: true, isFreePreview: false, tags: ['global affairs','geopolitics','international'], lessons: makeLessons(['Introduction to Global Affairs','The United Nations System','Globalization & Its Effects','Climate Change & Environment','Global Economy & Trade','Conflict & Peacekeeping','Migration & Refugees','Technology & Global Society','Africa in Global Politics',"Ethiopia's Foreign Policy"]) },
    { title: 'Economics', description: 'Basic economic principles — microeconomics, macroeconomics, market systems, supply & demand, and Ethiopian economic context.', icon: '📊', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 36.99, rating: 4.8, enrolledStudents: 8400, isPremium: true, isFreePreview: true, tags: ['economics','microeconomics','macroeconomics'], lessons: makeLessons(['Introduction to Economics','Supply & Demand','Market Equilibrium & Price','Consumer Behavior','Production & Costs','Market Structures','National Income & GDP','Inflation & Unemployment','Monetary & Fiscal Policy','Ethiopian Economy Overview']) },
    { title: 'Inclusiveness', description: 'Diversity, inclusion, and social equity — understanding differences, disability rights, gender studies, and building inclusive communities.', icon: '🤝', category: 'semester2', level: 'Freshman', duration: '1 Semester', price: 0, rating: 4.9, enrolledStudents: 9100, isPremium: false, isFreePreview: false, tags: ['diversity','inclusion','equity'], lessons: makeLessons(['Understanding Diversity','Types of Discrimination','Disability Rights & Inclusion','Gender & Sexuality','Ethnic & Cultural Diversity','Religious Tolerance','Inclusive Education','Workplace Inclusion','Building Inclusive Communities','Ethiopian Diversity & Unity']) },
    { title: 'General Biology', description: 'Life sciences fundamentals — cell biology, genetics, ecology, evolution, and human physiology for natural science students.', icon: '🔬', category: 'natural', level: 'Freshman', duration: '1 Semester', price: 42.99, rating: 4.8, enrolledStudents: 6800, isPremium: true, isFreePreview: true, tags: ['biology','genetics','ecology'], lessons: makeLessons(['Cell Structure & Function','Cell Division: Mitosis & Meiosis','DNA, RNA & Protein Synthesis','Mendelian Genetics','Evolution & Natural Selection','Ecology & Ecosystems','Human Digestive System','Human Circulatory System','Human Nervous System','Biodiversity & Conservation']) },
    { title: 'General Chemistry', description: 'Chemistry basics — atomic structure, periodic table, chemical bonding, reactions, stoichiometry, and organic chemistry introduction.', icon: '⚗️', category: 'natural', level: 'Freshman', duration: '1 Semester', price: 44.99, rating: 4.7, enrolledStudents: 6500, isPremium: true, isFreePreview: true, tags: ['chemistry','reactions','organic chemistry'], lessons: makeLessons(['Atomic Structure & Periodic Table','Chemical Bonding','Stoichiometry & Mole Concept','States of Matter','Solutions & Concentration','Acids, Bases & pH','Oxidation-Reduction Reactions','Thermochemistry','Reaction Kinetics','Introduction to Organic Chemistry']) },
    { title: 'Calculus & Advanced Mathematics', description: 'Advanced mathematics for natural sciences — differential calculus, integral calculus, differential equations, and linear algebra.', icon: '∫', category: 'natural', level: 'Freshman', duration: '1 Semester', price: 46.99, rating: 4.6, enrolledStudents: 5900, isPremium: true, isFreePreview: true, tags: ['calculus','mathematics','linear algebra'], lessons: makeLessons(['Limits & Continuity','Differentiation Rules','Applications of Derivatives','Implicit Differentiation','Definite & Indefinite Integrals','Integration Techniques','Applications of Integration','Differential Equations Intro','Vectors & Matrices','Linear Transformations']) },
    { title: 'Advanced Geography', description: 'Human and physical geography — spatial analysis, GIS basics, urban geography, regional studies, and environmental geography.', icon: '🗺️', category: 'social', level: 'Freshman', duration: '1 Semester', price: 34.99, rating: 4.5, enrolledStudents: 5200, isPremium: true, isFreePreview: false, tags: ['geography','GIS','urban'], lessons: makeLessons(['Geographic Information Systems (GIS)','Map Reading & Cartography','Urban Geography & Cities','Rural Geography & Agriculture','Population Geography','Economic Geography','Political Geography & Borders','Environmental Geography','Regional Development',"Africa's Geographic Challenges"]) },
    { title: 'Advanced History', description: 'Historical analysis and research methods — historiography, primary sources, world history themes, and African history.', icon: '📖', category: 'social', level: 'Freshman', duration: '1 Semester', price: 32.99, rating: 4.6, enrolledStudents: 4800, isPremium: true, isFreePreview: false, tags: ['history','research','historiography'], lessons: makeLessons(['Historiography & Historical Methods','Primary vs Secondary Sources','Ancient World Civilizations','Medieval World History','Age of Exploration & Colonialism','Industrial Revolution','World Wars & Their Impact','Cold War Era','African Independence Movements','Post-Colonial Africa']) },
    { title: 'English & Communication', description: 'Advanced communication skills — rhetoric, media literacy, professional writing, public speaking, and digital communication.', icon: '🗣️', category: 'social', level: 'Freshman', duration: '1 Semester', price: 36.99, rating: 4.8, enrolledStudents: 6100, isPremium: true, isFreePreview: true, tags: ['english','communication','rhetoric'], lessons: makeLessons(['Rhetoric & Persuasion','Media Literacy & Analysis','Professional Writing Skills','Public Speaking Mastery','Interpersonal Communication','Cross-Cultural Communication','Digital Communication & Social Media','Journalism Basics','Technical Writing','Communication in the Workplace']) }
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create or find admin + instructor users
    let admin = await User.findOne({ email: 'admin@alpha.com' });
    if (!admin) {
        admin = await User.create({ fullName: 'Admin User', email: 'admin@alpha.com', password: 'admin123', role: 'admin' });
        console.log('✅ Admin created: admin@alpha.com / admin123');
    }

    let instructor = await User.findOne({ email: 'instructor@alpha.com' });
    if (!instructor) {
        instructor = await User.create({ fullName: 'Dr. Alpha Instructor', email: 'instructor@alpha.com', password: 'instructor123', role: 'instructor' });
        console.log('✅ Instructor created: instructor@alpha.com / instructor123');
    }

    // Clear existing courses
    await Course.deleteMany({});
    console.log('🗑️  Cleared existing courses');

    // Insert all courses
    const instructorNames = [
        'Dr. Abebe Tadesse', 'Prof. Mekdes Alemu', 'Dr. Yohannes Bekele',
        'Dr. Tigist Haile', 'Dr. Sara Mulugeta', 'Coach Daniel Tesfaye',
        'Prof. Alemayehu Worku', 'Dr. Hanna Girma', 'Dr. Solomon Kebede',
        'Prof. Rahel Assefa', 'Dr. Getachew Mekonnen', 'Dr. Birtukan Ayele',
        'Prof. Dawit Negash', 'Dr. Meseret Desta', 'Dr. Selamawit Tefera',
        'Dr. Tsehay Wolde', 'Prof. Mulugeta Asfaw', 'Dr. Yohannes Bekele',
        'Dr. Tigist Haile', 'Dr. Getachew Mekonnen', 'Dr. Abebe Tadesse'
    ];

    const courses = courseData.map((c, i) => ({
        ...c,
        instructor: instructor._id,
        instructorName: instructorNames[i % instructorNames.length],
        status: 'approved',
        isPublished: true,
        department: ['Engineering','Medicine','Natural Sciences','Social Sciences','Law','Business','Education'][i % 7],
        chapters: buildChapters(c)
    }));

    const inserted = await Course.insertMany(courses);
    console.log(`✅ Inserted ${inserted.length} courses`);

    console.log('\n🎉 Seed complete!');
    console.log('   Admin:      admin@alpha.com / admin123');
    console.log('   Instructor: instructor@alpha.com / instructor123');
    console.log('   Courses:    22 Ethiopian freshman courses added\n');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});

// ─── Build chapters from lesson list ─────────────────────────────────────────
function buildChapters(course) {
    const lessons = course.lessons || [];
    if (lessons.length === 0) return [];

    // Group every 3-4 lessons into a chapter
    const chapterSize = 3;
    const chapters = [];
    let chapterIdx = 0;

    for (let i = 0; i < lessons.length; i += chapterSize) {
        const chapterLessons = lessons.slice(i, i + chapterSize);
        chapters.push({
            title: `Chapter ${chapterIdx + 1}: ${getChapterTitle(course.title, chapterIdx)}`,
            description: `This chapter covers ${chapterLessons.map(l => l.title).join(', ')}.`,
            order: chapterIdx + 1,
            lessons: chapterLessons.map((l, li) => ({
                title: l.title,
                description: l.description || `Comprehensive lesson on ${l.title.toLowerCase()}.`,
                notes: buildLessonNotes(l.title, course.title, course.category),
                duration: l.duration || `${30 + li * 10} min`,
                videoUrl: '',
                order: li + 1,
                materials: []
            }))
        });
        chapterIdx++;
    }
    return chapters;
}

function getChapterTitle(courseTitle, idx) {
    const titles = [
        'Foundations & Introduction',
        'Core Concepts',
        'Applied Knowledge',
        'Advanced Topics'
    ];
    return titles[idx % titles.length];
}

function buildLessonNotes(lessonTitle, courseTitle, category) {
    return `## 📝 Study Notes: ${lessonTitle}

### Overview
This lesson is part of **${courseTitle}** and covers the essential concepts of ${lessonTitle.toLowerCase()}.

### Key Points
- Understand the fundamental principles of ${lessonTitle.toLowerCase()}
- Apply concepts to real-world Ethiopian academic context
- Connect this topic to related subjects in your curriculum
- Practice with examples before the quiz

### Important Definitions
- **${lessonTitle}**: The systematic study and application of core principles related to this topic
- Review your textbook for additional definitions and examples

### Study Tips
- Read through these notes before watching the lesson
- Take your own notes while studying
- Complete the quiz at the end to test your understanding
- Review any questions you got wrong

### Exam Preparation
- Focus on understanding concepts, not just memorizing facts
- Practice past exam questions related to this topic
- Form a study group to discuss difficult concepts
- Ask your instructor if anything is unclear

> 💡 **Remember:** Consistent daily study is more effective than cramming before exams.`;
}
