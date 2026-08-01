// One-time admin seeder — accessed via /api/seed-admin?secret=SEED_SECRET
const mongoose = require('mongoose');
const User = require('../server/models/User');
require('dotenv').config({ path: './server/.env' });

let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000
    });
    isConnected = true;
}

module.exports = async (req, res) => {
    // Security check
    const secret = req.query.secret;
    if (secret !== (process.env.SEED_SECRET || 'alpha-seed-2024')) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    try {
        await connectDB();

        const email = req.query.email || 'supportalphafreshman@gmail.com';

        const user = await User.findOneAndUpdate(
            { email },
            { role: 'admin', isActive: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: `User not found: ${email}` });
        }

        res.json({
            success: true,
            message: `✅ ${user.fullName} is now ADMIN`,
            user: { id: user._id, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
