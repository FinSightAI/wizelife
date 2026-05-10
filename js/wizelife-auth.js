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
    // 1. Check Firestore (canonical source) — respects planExpiresAt for
    //    referral-bonus-granted plans. If expiry has passed, fall back to free.
    let firestorePlan = null;
    try {
        const doc = await wlDb.collection("users").doc(uid).get();
        if (doc.exists) {
            const d = doc.data() || {};
            const raw = d.plan;
            const expMs = d.planExpiresAt && d.planExpiresAt.toMillis
                          ? d.planExpiresAt.toMillis()
                          : (typeof d.planExpiresAt === 'number' ? d.planExpiresAt : 0);
            if (raw === 'pro' || raw === 'yolo') {
                // Only auto-downgrade if the ONLY reason this user has the
                // plan is a referral/bug bonus that has now expired. Access
                // codes (`accessCode`) and paid subs (`paypalSubscriptionId`)
                // never auto-expire.
                const hasPaidProof = !!(d.accessCode || d.paypalSubscriptionId);
                if (expMs && expMs < Date.now() && !hasPaidProof) {
                    firestorePlan = 'free';
                } else {
                    firestorePlan = raw;
                }
            } else if (raw) {
                firestorePlan = raw;
            }
        }
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

// ── Referral system ─────────────────────────────────────────────────────────────
// Each user gets a short code. Sharing wizelife.ai/auth.html?ref=CODE lets a friend
// sign up; if they later upgrade to PRO or YOLO, the referrer earns a month of the
// matching tier (30d). Stored in Firestore as users/{uid}.referralRewards = [{tier,days,from,ts}].

function _genReferralCode() {
    // 6-char alphanumeric, easy to share
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

async function getOrCreateReferralCode(uid) {
    if (!uid || !wlDb) return null;
    try {
        const ref = wlDb.collection("users").doc(uid);
        const doc = await ref.get();
        if (doc.exists && doc.data().referralCode) return doc.data().referralCode;
        // Generate + write atomically (best-effort; collisions rare)
        const code = _genReferralCode();
        await ref.set({ referralCode: code }, { merge: true });
        return code;
    } catch (e) { console.warn("getOrCreateReferralCode failed", e); return null; }
}

// Stash a ?ref=CODE that came in the URL — will be applied at signup time
function captureReferralCode() {
    try {
        const r = new URLSearchParams(location.search).get("ref");
        if (r && /^[A-Z0-9]{4,10}$/i.test(r)) {
            localStorage.setItem("wl_ref_pending", r.toUpperCase());
        }
    } catch {}
}

// Called once after a brand new user is created — records referredBy on their record
async function applyReferralOnSignup(uid) {
    if (!uid || !wlDb) return;
    let pending = null;
    try { pending = localStorage.getItem("wl_ref_pending"); } catch {}
    if (!pending) return;
    try {
        // Resolve referralCode -> referrer uid
        const q = await wlDb.collection("users").where("referralCode", "==", pending).limit(1).get();
        if (q.empty) { localStorage.removeItem("wl_ref_pending"); return; }
        const referrerUid = q.docs[0].id;
        if (referrerUid === uid) { localStorage.removeItem("wl_ref_pending"); return; }
        await wlDb.collection("users").doc(uid).set({
            referredBy: referrerUid,
            referralCodeUsed: pending,
            referralAppliedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        localStorage.removeItem("wl_ref_pending");
    } catch (e) { console.warn("applyReferralOnSignup failed", e); }
}

// Called when a user upgrades to PRO/YOLO — awards 30 days of matching tier to the referrer
async function rewardReferrerOnUpgrade(uid, newTier) {
    if (!uid || !wlDb || !["pro", "yolo"].includes(newTier)) return;
    try {
        const userDoc = await wlDb.collection("users").doc(uid).get();
        if (!userDoc.exists) return;
        const u = userDoc.data();
        if (!u.referredBy || u.referralRewardSent) return; // only first upgrade triggers reward

        // Append a reward entry to the referrer
        const refRef = wlDb.collection("users").doc(u.referredBy);
        await refRef.set({
            referralRewards: firebase.firestore.FieldValue.arrayUnion({
                tier: newTier,
                days: 30,
                from: uid,
                ts: Date.now(),
            }),
            referralCount: firebase.firestore.FieldValue.increment(1),
        }, { merge: true });

        await wlDb.collection("users").doc(uid).set({ referralRewardSent: true }, { merge: true });
    } catch (e) { console.warn("rewardReferrerOnUpgrade failed", e); }
}

// Stamp a pending capture as soon as this script loads (works on auth.html etc)
captureReferralCode();

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
