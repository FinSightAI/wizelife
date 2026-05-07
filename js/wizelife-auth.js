/**
 * WizeLife — Shared Firebase Auth
 * Uses the same Firebase project as FinSight (finzilla-7f1f9)
 */
const firebaseConfig = {
    apiKey: "AIzaSyDuzJHOMe89YmEFpKlaTgxT40BCNhK6PU0",
    authDomain: "finzilla-7f1f9.firebaseapp.com",
    projectId: "finzilla-7f1f9",
    storageBucket: "finzilla-7f1f9.firebasestorage.app",
    messagingSenderId: "1027614800253",
    appId: "1:1027614800253:web:ddfb62426252e0e8ebb414"
};

firebase.initializeApp(firebaseConfig);
const wlAuth = firebase.auth();
const wlDb   = firebase.firestore();

const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Read user plan from Firestore
async function getUserPlan(uid) {
    // 1. Check Firestore (canonical source)
    let firestorePlan = null;
    try {
        const doc = await wlDb.collection("users").doc(uid).get();
        if (doc.exists && doc.data().plan) firestorePlan = doc.data().plan;
    } catch {}
    // 2. Check localStorage (set by access codes redeemed in any app)
    let localPlan = null;
    try {
        const p = localStorage.getItem("wl_plan");
        if (p && ["pro", "yolo", "free"].includes(p)) localPlan = p;
    } catch {}
    // 3. Pick highest tier: yolo > pro > free
    const rank = { yolo: 3, pro: 2, free: 1 };
    const fsRank = rank[firestorePlan] || 0;
    const lsRank = rank[localPlan] || 0;
    const best = fsRank >= lsRank ? firestorePlan : localPlan;
    const plan = best || "free";
    // 4. Sync back to Firestore if localStorage has higher tier (e.g. access code redeemed)
    if (lsRank > fsRank && wlDb && uid) {
        try { await wlDb.collection("users").doc(uid).set({ plan: localPlan }, { merge: true }); } catch {}
    }
    // 5. Save to localStorage for next visit
    try { localStorage.setItem("wl_plan", plan); } catch {}
    return plan;
}

// Redirect to dashboard if already logged in
function requireAuth(redirectTo = "auth.html") {
    return new Promise(resolve => {
        wlAuth.onAuthStateChanged(user => {
            if (!user) {
                window.location.href = redirectTo;
            } else {
                resolve(user);
            }
        });
    });
}

// Redirect to dashboard if already logged in (for auth page)
function redirectIfLoggedIn(redirectTo = "dashboard.html") {
    wlAuth.onAuthStateChanged(user => {
        if (user) window.location.href = redirectTo;
    });
}
