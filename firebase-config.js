// ─── Firebase Configuration ───────────────────────────────────────────────────
// Get these values from: https://console.firebase.google.com
// Project Settings → Your apps → Web app → Config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ── Register student with email verification ──────────────────────────────────
async function registerStudent(fullName, email, password, role = 'student') {
    try {
        // 1. Create Firebase account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Send verification email
        await sendEmailVerification(user);

        // 3. Also register in our backend (for course data, enrollments, etc.)
        try {
            await api.register({ fullName, email, password, role });
        } catch (backendErr) {
            console.warn('Backend registration skipped:', backendErr.message);
        }

        return {
            success: true,
            message: 'ምዝገባዎ ተሳክቷል! 🎉\n\nእባክዎ ወደ ጂሜይልዎ የተላከውን ሊንክ ተጭነው አካውንትዎን ያረጋግጡ።\n\nEmail: ' + email
        };
    } catch (error) {
        const msg = {
            'auth/email-already-in-use': 'ይህ ኢሜይል አድራሻ ቀደም ሲል ተመዝግቧል።',
            'auth/weak-password':        'የይለፍ ቃሉ ቢያንስ 6 ቁምፊ መሆን አለበት።',
            'auth/invalid-email':        'ትክክለኛ ኢሜይል አድራሻ ያስፈልጋል።'
        }[error.code] || error.message;
        return { success: false, message: msg };
    }
}

// ── Login student with email verification check ───────────────────────────────
async function loginStudent(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
            await auth.signOut();
            return {
                success: false,
                message: 'እባክዎ መጀመሪያ ጂሜይልዎ ላይ የተላከውን ሊንክ ተጭነው አካውንትዎን ያረጋግጡ!\n\nEmail: ' + email
            };
        }

        // Also login to our backend for JWT token
        try {
            const backendRes = await api.login({ email, password });
            if (backendRes.success) {
                api.setAuthToken(backendRes.token);
                localStorage.setItem('currentUser', JSON.stringify(backendRes.user));
                return { success: true, user: backendRes.user };
            }
        } catch (backendErr) {
            // Backend unavailable — use Firebase user data
            const fbUser = {
                id: user.uid,
                fullName: user.displayName || email.split('@')[0],
                email: user.email,
                role: 'student'
            };
            localStorage.setItem('currentUser', JSON.stringify(fbUser));
            api.setAuthToken('firebase-' + user.uid);
            return { success: true, user: fbUser };
        }

    } catch (error) {
        const msg = {
            'auth/user-not-found':   'ይህ ኢሜይል አድራሻ አልተመዘገበም።',
            'auth/wrong-password':   'የይለፍ ቃሉ ስህተት ነው።',
            'auth/invalid-email':    'ትክክለኛ ኢሜይል አድራሻ ያስፈልጋል።',
            'auth/too-many-requests':'ብዙ ጊዜ ሞክረዋል። ትንሽ ቆይተው ይሞክሩ።',
            'auth/invalid-credential': 'ኢሜይሉ ወይም የይለፍ ቃሉ ስህተት ነው።'
        }[error.code] || error.message;
        return { success: false, message: msg };
    }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function logoutStudent() {
    await signOut(auth);
    api.removeAuthToken();
    localStorage.removeItem('currentUser');
    window.location.href = 'home.html';
}

// ── Auth state listener ───────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user && !user.emailVerified) {
        // Not verified — sign out silently
        signOut(auth);
    }
});

export { auth, registerStudent, loginStudent, logoutStudent };
