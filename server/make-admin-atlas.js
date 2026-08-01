// Run: node server/make-admin-atlas.js
const mongoose = require('mongoose');

const uri = 'mongodb+srv://rehima681_db_user:hXKyGVm34ZEfCa2z@cluster0.qwitybd.mongodb.net/alpha_tutorial?appName=Cluster0';

mongoose.connect(uri).then(async () => {
    const db = mongoose.connection.db;

    // List all users
    const users = await db.collection('users').find({}).toArray();
    console.log('Total users in Atlas:', users.length);
    users.forEach(u => console.log(' -', u.email, '|', u.role));

    // Upgrade to admin
    const result = await db.collection('users').updateOne(
        { email: 'supportalphafreshman@gmail.com' },
        { $set: { role: 'admin', isActive: true } }
    );

    if (result.modifiedCount > 0) {
        console.log('\n✅ supportalphafreshman@gmail.com is now ADMIN');
    } else if (result.matchedCount > 0) {
        console.log('\n✅ Already admin — no change needed');
    } else {
        console.log('\n❌ User not found in Atlas');
    }

    process.exit(0);
}).catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
