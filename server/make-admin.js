// Run: node server/make-admin.js
const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const user = await User.findOneAndUpdate(
        { email: 'supportalphafreshman@gmail.com' },
        { role: 'admin', isActive: true },
        { new: true }
    );
    if (user) {
        console.log('✅ SUCCESS:', user.fullName, 'is now', user.role);
    } else {
        console.log('❌ User not found');
    }
    process.exit(0);
}).catch(e => { console.error('❌ DB Error:', e.message); process.exit(1); });
