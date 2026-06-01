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

// ── Firebase App Check (reCAPTCHA v3) ──────────────────────────────────────────
// Ensures only requests coming from our own pages can hit Firestore /
// Cloud Functions. reCAPTCHA v3 site key is public — verification happens
// server-side. If activation fails (old browser cache / blocker / etc),
// `__wlAppCheckActive` stays false and we show a "please refresh" banner.
//
// Deferred 200ms past first paint (perf): the reCAPTCHA enterprise script
// it pulls in is ~50KB + does a heavy crypto-init blocking the main thread.
// Auth + Firestore calls during that 200ms window go un-attested; the next
// request after activation is attested. Safe because protected endpoints
// only run after user interaction (sign-in, code redeem, etc.), all of which
// happen well after 200ms.
window.__wlAppCheckActive = false;
setTimeout(function () {
    try {
        if (firebase.appCheck && window.WIZELIFE_RECAPTCHA_SITE_KEY) {
            firebase.appCheck().activate(
                new firebase.appCheck.ReCaptchaV3Provider(window.WIZELIFE_RECAPTCHA_SITE_KEY),
                true /* automatic refresh */
            );
            window.__wlAppCheckActive = true;
        }
    } catch (e) { console.warn('App Check init failed', e); }
}, 200);

// ── "Please refresh" banner ────────────────────────────────────────────────────
// Triggered when:
//  (a) a new SW takes control (controllerchange) — handled in sw-register.js
//  (b) App Check failed to activate but the constant is set — meaning the
//      browser is running an older cached copy of this very file
//  (c) explicitly via window.wlShowUpdateBanner()
window.wlShowUpdateBanner = function (reason) {
    if (document.getElementById('wl-update-banner')) return;
    var lang = (function () { try { return (localStorage.getItem('wl_lang') || 'he').slice(0,2); } catch (e) { return 'he'; } })();
    var T = {
      he: { msg: '✨ גרסה חדשה זמינה — רענן כדי לקבל אותה', btn: 'רענן' },
      en: { msg: '✨ New version available — refresh to get it',  btn: 'Refresh' },
      pt: { msg: '✨ Nova versão disponível — atualize',         btn: 'Atualizar' },
      es: { msg: '✨ Nueva versión disponible — actualiza',      btn: 'Actualizar' },
    };
    var t = T[lang] || T.en;
    var b = document.createElement('div');
    b.id = 'wl-update-banner';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100002;background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;padding:10px 16px;text-align:center;font-family:Inter,-apple-system,sans-serif;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:14px;box-shadow:0 2px 12px rgba(0,0,0,0.2);animation:wl-up-slide .3s ease';
    b.innerHTML = '<span>' + t.msg + '</span>'
                + '<button style="background:rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:6px 14px;border-radius:99px;font:700 12px inherit;cursor:pointer">' + t.btn + '</button>';
    if (!document.getElementById('wl-up-anim')) {
        var s = document.createElement('style');
        s.id = 'wl-up-anim';
        s.textContent = '@keyframes wl-up-slide{from{transform:translateY(-100%)}to{transform:translateY(0)}}';
        document.head.appendChild(s);
    }
    b.querySelector('button').addEventListener('click', async function () {
        // 1. Tell any waiting SW to activate (skip-waiting)
        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) {
                    if (r.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' });
                    try { await r.update(); } catch (e) {}
                }
            }
        } catch (e) {}
        // 2. Clear all Cache Storage (PWA shell caches)
        try {
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(n => caches.delete(n)));
            }
        } catch (e) {}
        // 3. Force-reload with cache-busting query so HTTP cache misses too
        const url = new URL(location.href);
        url.searchParams.set('_v', Date.now());
        location.replace(url.toString());
    });
    if (document.body) document.body.appendChild(b);
    else document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(b); });
    console.log('wlShowUpdateBanner triggered, reason:', reason);
};

// Note: previously fired a "stale script" banner if App Check didn't activate
// in 3 s. Disabled — reCAPTCHA v3 can fail to fetch a token from headless /
// ad-blocked / throttled clients even when the script is current, producing
// repeating false-positive refresh prompts. SW updates still trigger the
// banner via sw-register.js, which is the only correct signal.

const wlAuth = firebase.auth();
const wlDb   = firebase.firestore();

// Login alert — fire once per session when auth resolves to a signed-in user.
// Backend dedupes per-device-fingerprint and only emails on a NEW device.
// Heavily defensive: every step is wrapped, missing SDKs become silent no-ops
// so the auth flow itself never breaks.
wlAuth.onAuthStateChanged((user) => {
    // Lightweight marker so the landing can skip the full Firebase SDK for
    // brand-new (logged-out) visitors. Set on sign-in, cleared on sign-out.
    try { if (user) localStorage.setItem('wl_authed', '1'); else localStorage.removeItem('wl_authed'); } catch (e) {}
    if (!user) return;
    try {
        if (sessionStorage.getItem('wl_login_alert_fired')) return;
        sessionStorage.setItem('wl_login_alert_fired', '1');

        // Schedule the alert call AFTER first paint so it never blocks the
        // critical render. Use _wlLazy if available (most pages); fall back
        // to direct firebase.functions if the page has the script tag.
        const fire = (fns) => {
            try {
                if (!fns) return;
                fns.httpsCallable('notifyLoginAlert')({
                    ua: navigator.userAgent.slice(0, 300),
                    platform: (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '',
                }).catch(() => {});
            } catch (e) { /* silent */ }
        };
        const schedule = (cb) => {
            if (typeof requestIdleCallback === 'function') requestIdleCallback(cb, { timeout: 4000 });
            else setTimeout(cb, 1500);
        };
        schedule(() => {
            if (window._wlLazy && typeof window._wlLazy.functions === 'function') {
                window._wlLazy.functions().then(fire).catch(() => {});
            } else if (typeof firebase.functions === 'function') {
                fire(firebase.functions());
            }
        });
    } catch (e) { console.warn('login alert skipped', e); }
});

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

// Redirect already-logged-in user away from auth page.
// Honors ?next=<url> when the host is on the SAFE_HOSTS allow-list, otherwise
// falls back to the default redirect (dashboard.html). Without this, YOLO/Pro
// users clicking a deep-link CTA (e.g., salary-compare → "open Pro account")
// ended up on the dashboard with no obvious path back to the deep analysis
// they came to do.
function redirectIfLoggedIn(redirectTo = "dashboard.html") {
    const SAFE_HOSTS = [
        'finsightai.github.io', 'check-deal.vercel.app', 'mastermove.vercel.app',
        'wizetravel.hf.space', 'ofirofir-wizetravel.hf.space', 'vitara.onrender.com',
        'wizelife.ai', 'tax.wizelife.ai', 'deal.wizelife.ai', 'travel.wizelife.ai',
        'health.wizelife.ai', 'money.wizelife.ai',
    ];
    wlAuth.onAuthStateChanged(async user => {
        if (!user) return;
        // Try ?next= first
        try {
            const next = new URLSearchParams(window.location.search).get('next');
            if (next) {
                const u = new URL(next, window.location.origin);
                const safe = SAFE_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
                if (safe) {
                    // For cross-app destinations, hand off the token via URL fragment
                    // (same shape that _afterAuthRedirect uses on the login flow).
                    const sameOrigin = u.origin === window.location.origin;
                    if (sameOrigin) {
                        window.location.href = next;
                        return;
                    }
                    try {
                        const token = await user.getIdToken();
                        const nick  = localStorage.getItem('wl_nickname') || user.displayName || '';
                        let plan = 'free';
                        try {
                            if (typeof wlDb !== 'undefined') {
                                const d = await wlDb.collection('users').doc(user.uid).get();
                                if (d.exists && d.data().plan) plan = d.data().plan;
                            }
                        } catch {}
                        const params = 'wl_token=' + encodeURIComponent(token)
                                     + '&wl_nick=' + encodeURIComponent(nick)
                                     + '&wl_plan=' + encodeURIComponent(plan);
                        const sep = next.indexOf('#') === -1 ? '#' : '&';
                        window.location.href = next + sep + params;
                        return;
                    } catch {
                        // Token attach failed — still send them to the destination,
                        // they can sign in there if needed.
                        window.location.href = next;
                        return;
                    }
                }
            }
        } catch {}
        window.location.href = redirectTo;
    });
}
