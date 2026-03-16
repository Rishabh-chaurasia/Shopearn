/* hooks.js — custom hooks with Firebase Firestore per-user sync */
import { useState, useEffect, useCallback, useRef } from "react";

/* ── localStorage persist ───────────────────────────────────────────────── */
export function usePersist(key, initial) {
  const [state, setState] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

/* ── Flash sale countdown ────────────────────────────────────────────────── */
export function useCountdown(endTime) {
  const [time, setTime] = useState({ h:"00", m:"00", s:"00" });
  useEffect(() => {
    const tick = () => {
      const d = endTime - Date.now();
      if (d <= 0) { setTime({ h:"00", m:"00", s:"00" }); return; }
      setTime({
        h: String(Math.floor(d/3600000)).padStart(2,"0"),
        m: String(Math.floor((d%3600000)/60000)).padStart(2,"0"),
        s: String(Math.floor((d%60000)/1000)).padStart(2,"0"),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endTime]);
  return time;
}

/* ── Toast notifications ─────────────────────────────────────────────────── */
export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return [toast, showToast];
}

/* ── Loyalty points ──────────────────────────────────────────────────────── */
export function usePoints() {
  const [points, setPoints] = usePersist("sk_points", 0);
  const [history, setHistory] = usePersist("sk_points_history", []);
  const award = useCallback((amount, reason) => {
    setPoints(p => p + amount);
    setHistory(h => [{ amount, reason, date: new Date().toLocaleDateString("en-IN"), id: Date.now() }, ...h].slice(0, 50));
  }, [setPoints, setHistory]);
  return { points, history, award };
}

/* ── Firestore helper ────────────────────────────────────────────────────── */
async function getDB() {
  const { getFirestore } = await import("firebase/firestore");
  const { app } = await import("./firebase.js");
  return getFirestore(app);
}

/* ── Purchases — Firestore per user ──────────────────────────────────────── */
export function usePurchases(uid) {
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  useEffect(() => {
    if (!uid) { setPurchases([]); return; }
    setLoadingPurchases(true);
    let unsub = () => {};
    const setup = async () => {
      try {
        const { collection, onSnapshot, orderBy, query } = await import("firebase/firestore");
        const db = await getDB();
        const q = query(collection(db, "users", uid, "purchases"), orderBy("createdAt", "desc"));
        unsub = onSnapshot(q, snap => {
          setPurchases(snap.docs.map(d => ({ id:d.id, ...d.data() })));
          setLoadingPurchases(false);
        }, () => setLoadingPurchases(false));
      } catch { setLoadingPurchases(false); }
    };
    setup();
    return () => unsub();
  }, [uid]);

  const addPurchase = useCallback(async (purchase) => {
    if (!uid) return;
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const db = await getDB();
      await addDoc(collection(db, "users", uid, "purchases"), { ...purchase, createdAt: serverTimestamp() });
    } catch (err) { console.error("addPurchase:", err); }
  }, [uid]);

  const deletePurchase = useCallback(async (id) => {
    if (!uid) return;
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      const db = await getDB();
      await deleteDoc(doc(db, "users", uid, "purchases", id));
    } catch (err) { console.error("deletePurchase:", err); }
  }, [uid]);

  return { purchases, loadingPurchases, addPurchase, deletePurchase };
}

/* ── Click Tracking ──────────────────────────────────────────────────────── */
export function useClickTracker(uid) {
  const trackClick = useCallback(async (product, slug) => {
    const data = {
      slug:         slug || product?.slug || "",
      store:        product?.store || "",
      productTitle: product?.title || "",
      price:        product?.price || 0,
      cashbackPct:  product?.cashbackPct || 0,
      timestamp:    Date.now(),
      date:         new Date().toLocaleDateString("en-IN"),
      uid:          uid || "anonymous",
    };
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      const db = await getDB();
      // Global clicks collection (for your analytics dashboard)
      await addDoc(collection(db, "clicks"), { ...data, createdAt: serverTimestamp() });
      // Per-user clicks (for showing user's click history)
      if (uid) await addDoc(collection(db, "users", uid, "clicks"), { ...data, createdAt: serverTimestamp() });
    } catch (err) { console.warn("trackClick:", err); }
  }, [uid]);
  return { trackClick };
}

/* ── Missing Cashback Requests ───────────────────────────────────────────── */
export function useMissingCashback(uid) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!uid) { setRequests([]); return; }
    let unsub = () => {};
    const setup = async () => {
      try {
        const { collection, onSnapshot, orderBy, query } = await import("firebase/firestore");
        const db = await getDB();
        const q = query(collection(db, "users", uid, "missingCashback"), orderBy("createdAt", "desc"));
        unsub = onSnapshot(q, snap => setRequests(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
      } catch {}
    };
    setup();
    return () => unsub();
  }, [uid]);

  const submitRequest = useCallback(async (request) => {
    if (!uid) throw new Error("Please login to raise a request");
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    const db = await getDB();
    const data = { ...request, uid, status:"pending", createdAt: serverTimestamp() };
    await addDoc(collection(db, "users", uid, "missingCashback"), data);
    await addDoc(collection(db, "missingCashbackRequests"), data); // global for admin
  }, [uid]);

  return { requests, submitRequest };
}

/* ── Real Firebase Auth ──────────────────────────────────────────────────── */
export function useAuth() {
  const [user, setUser] = useState(() => {
    try { const v = localStorage.getItem("sk_user"); return v ? JSON.parse(v) : null; }
    catch { return null; }
  });
  const unsubRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import("firebase/auth");
        const { app } = await import("./firebase.js");
        if (unsubRef.current) unsubRef.current();
        unsubRef.current = onAuthStateChanged(getAuth(app), (fu) => {
          if (cancelled) return;
          if (fu) {
            const n = fu.displayName || fu.email?.split("@")[0] || "User";
            const avatar = n.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();
            const userData = { name:n, email:fu.email||"", avatar, uid:fu.uid, provider:fu.providerData?.[0]?.providerId||"email", photoURL:fu.photoURL||null };
            setUser(userData);
            try { localStorage.setItem("sk_user", JSON.stringify(userData)); } catch {}
          } else {
            setUser(null);
            try { localStorage.removeItem("sk_user"); } catch {}
          }
        });
      } catch (err) { console.warn("Firebase auth:", err); }
    };
    setup();
    return () => { cancelled = true; if (unsubRef.current) unsubRef.current(); };
  }, []);

  const login = useCallback((data) => {
    setUser(data);
    try { localStorage.setItem("sk_user", JSON.stringify(data)); } catch {}
  }, []);

  const logout = useCallback(async () => {
    try {
      const { getAuth, signOut } = await import("firebase/auth");
      const { app } = await import("./firebase.js");
      await signOut(getAuth(app));
    } catch {}
    setUser(null);
    try { localStorage.removeItem("sk_user"); } catch {}
  }, []);

  return { user, login, logout };
}

/* ── Wishlist — Firestore per user, localStorage fallback ────────────────
   Collection: users/{uid}/wishlist/{productId}
   Syncs across devices when logged in, falls back to localStorage otherwise
────────────────────────────────────────────────────────────────────────────── */
export function useWishlist(uid) {
  // localStorage fallback for guests
  const [localWishlist, setLocalWishlist] = usePersist("sk_wishlist", []);
  const [cloudWishlist, setCloudWishlist] = useState([]);
  const [wishlistReady, setWishlistReady]  = useState(false);

  // Load from Firestore when user is logged in
  useEffect(() => {
    if (!uid) {
      setCloudWishlist([]);
      setWishlistReady(true);
      return;
    }
    let unsub = () => {};
    const setup = async () => {
      try {
        const { collection, onSnapshot } = await import("firebase/firestore");
        const db = await getDB();
        unsub = onSnapshot(collection(db, "users", uid, "wishlist"), (snap) => {
          setCloudWishlist(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setWishlistReady(true);
        });
      } catch {
        setWishlistReady(true);
      }
    };
    setup();
    return () => unsub();
  }, [uid]);

  // Active wishlist — cloud if logged in, local if guest
  const wishlist = uid ? cloudWishlist : localWishlist;

  // Toggle item in wishlist
  const toggleWishlist = useCallback(async (product) => {
    if (!uid) {
      // Guest — use localStorage only
      setLocalWishlist(prev => {
        const exists = prev.find(p => p.id === product.id);
        return exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
      });
      return;
    }

    // Logged in — use Firestore
    try {
      const { doc, setDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
      const db = await getDB();
      // Use product.id as the document ID so it's easy to check existence
      const ref = doc(db, "users", uid, "wishlist", String(product.id));
      const exists = cloudWishlist.find(p => p.id === product.id);
      if (exists) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, { ...product, addedAt: serverTimestamp() });
      }
    } catch (err) {
      console.error("toggleWishlist:", err);
    }
  }, [uid, cloudWishlist, setLocalWishlist]);

  const isWished = useCallback((productId) => {
    return wishlist.some(p => p.id === productId);
  }, [wishlist]);

  return { wishlist, toggleWishlist, isWished, wishlistReady };
}