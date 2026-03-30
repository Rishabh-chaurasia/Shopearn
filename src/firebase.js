import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc,
  collection, addDoc, updateDoc, increment,
  query, where, orderBy, onSnapshot, getDocs,
  serverTimestamp
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAaHebqqr3j3QnbDP4tFpElkh-lisbGX5Q",
  authDomain: "savekaro-d340d.firebaseapp.com",
  projectId: "savekaro-d340d",
  storageBucket: "savekaro-d340d.firebasestorage.app",
  messagingSenderId: "403614895229",
  appId: "1:403614895229:web:9d84553ba1518e26e9b514"
};

export const app            = initializeApp(firebaseConfig);
export const db             = getFirestore(app);
export const auth           = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const MIN_WITHDRAWAL = 250;

/* ── Save / Load helpers ─────────────────────────────────────────── */
export async function saveToCloud(userId, key, value) {
  if (!userId) return;
  try {
    await setDoc(
      doc(db, "users", userId, "data", key),
      { value, updatedAt: Date.now() },
      { merge: true }
    );
  } catch (err) { console.warn("saveToCloud:", err.message); }
}

export async function loadFromCloud(userId, key) {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, "users", userId, "data", key));
    return snap.exists() ? snap.data().value : null;
  } catch (err) { console.warn("loadFromCloud:", err.message); return null; }
}

/* ── Ensure wallet doc exists on first login ─────────────────────── */
export async function ensureWalletDoc(userId, name, email) {
  if (!userId) return;
  try {
    const ref  = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name:   name  || "User",
        email:  email || "",
        wallet: { balance: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 },
        fraud:  { flagged: false },
        createdAt: serverTimestamp(),
      });
    } else if (!snap.data().wallet) {
      await updateDoc(ref, {
        wallet: { balance: 0, pending: 0, totalEarned: 0, totalWithdrawn: 0 }
      });
    }
  } catch (err) { console.warn("ensureWalletDoc:", err.message); }
}

/* ── Add pending cashback after affiliate sale confirmed ─────────── */
export async function addPendingCashback(userId, brand, orderId, orderAmount, commissionRate) {
  if (!userId) return false;
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const txSnap = await getDocs(
      query(
        collection(db, "cashback_transactions"),
        where("uid", "==", userId),
        where("type", "==", "cashback")
      )
    );
    const todayCount = txSnap.docs.filter(d => {
      const ts = d.data().createdAt?.toDate?.();
      return ts && ts >= today;
    }).length;

    if (todayCount >= 10) {
      await updateDoc(doc(db, "users", userId), {
        "fraud.flagged":   true,
        "fraud.reason":    "Too many daily cashback transactions",
        "fraud.flaggedAt": serverTimestamp(),
      });
      return false;
    }

    const cashbackAmount = parseFloat(((orderAmount * commissionRate) / 100).toFixed(2));
    const creditAfter    = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);

    await addDoc(collection(db, "cashback_transactions"), {
      uid: userId, type: "cashback",
      brand, orderId: orderId || "",
      orderAmount, commissionRate,
      amount: cashbackAmount,
      status: "pending",
      holdDays: 45, creditAfter,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "users", userId), {
      "wallet.pending":     increment(cashbackAmount),
      "wallet.totalEarned": increment(cashbackAmount),
    });
    return true;
  } catch (err) { console.error("addPendingCashback:", err); return false; }
}

/* ── Approve cashback (admin) ────────────────────────────────────── */
export async function approveCashback(transactionId) {
  try {
    const txRef  = doc(db, "cashback_transactions", transactionId);
    const txSnap = await getDoc(txRef);
    if (!txSnap.exists() || txSnap.data().status !== "pending") return false;
    const tx = txSnap.data();
    await updateDoc(txRef, { status: "approved", updatedAt: serverTimestamp() });
    await updateDoc(doc(db, "users", tx.uid), {
      "wallet.balance": increment(tx.amount),
      "wallet.pending": increment(-tx.amount),
    });
    return true;
  } catch (err) { console.error("approveCashback:", err); return false; }
}

/* ── Request withdrawal ──────────────────────────────────────────── */
export async function requestWithdrawal(userId, amount, upiId) {
  if (!userId) return { success: false, error: "Not logged in" };
  if (amount < MIN_WITHDRAWAL)
    return { success: false, error: `Minimum withdrawal is Rs.${MIN_WITHDRAWAL}` };
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return { success: false, error: "User not found" };
    const balance = snap.data().wallet?.balance || 0;
    if (balance < amount) return { success: false, error: "Insufficient balance" };
    await updateDoc(doc(db, "users", userId), {
      "wallet.balance":        increment(-amount),
      "wallet.totalWithdrawn": increment(amount),
    });
    await addDoc(collection(db, "withdrawals"), {
      uid: userId, amount, upiId,
      status: "processing",
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}

/* ── Real-time wallet listener ───────────────────────────────────── */
export function listenWallet(userId, callback) {
  if (!userId) return () => {};
  return onSnapshot(doc(db, "users", userId), snap => {
    if (snap.exists()) callback(snap.data().wallet || {});
  });
}

/* ── Real-time transactions listener ────────────────────────────── */
export function listenTransactions(userId, callback) {
  if (!userId) return () => {};
  const q = query(
    collection(db, "cashback_transactions"),
    where("uid", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/* ── Give referral bonus ─────────────────────────────────────────── */
export async function giveReferralBonus(referrerId, newUserId) {
  try {
    await setDoc(doc(db, "referrals", `${referrerId}_${newUserId}`), {
      referrerId, newUserId, amount: 20, createdAt: Date.now()
    });
    await updateDoc(doc(db, "users", referrerId), {
      "wallet.balance":     increment(20),
      "wallet.totalEarned": increment(20),
    });
  } catch (err) { console.warn("giveReferralBonus:", err.message); }
}