import { useState, useEffect } from "react";
import {
  db, addPendingCashback, approveCashback, MIN_WITHDRAWAL
} from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp, where, getDocs
} from "firebase/firestore";

// ─── ADMIN EMAILS — add your email here ───────────────────────────────────────
const ADMIN_EMAILS = [
  "rishuchaurasia.13@gmail.com",  // Your email
];

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ─── AFFILIATE LINK GENERATOR WITH SUB ID ─────────────────────────────────────
// Call this when user clicks a deal — pass their Firebase UID as sub_id
// vCommission will return it in postback so you know who to credit
export function generateAffiliateLink(baseTrackingUrl, userId) {
  if (!userId || !baseTrackingUrl) return baseTrackingUrl;
  const separator = baseTrackingUrl.includes("?") ? "&" : "?";
  return `${baseTrackingUrl}${separator}sub_id=${userId}`;
}

// ─── STATUS COLORS ─────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  pending:    { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
  approved:   { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
  credited:   { bg: "#dbeafe", text: "#1e40af", border: "#3b82f6" },
  processing: { bg: "#ede9fe", text: "#5b21b6", border: "#8b5cf6" },
  paid:       { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
  failed:     { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" },
};

/* ══════════════════════════════════════════════════════════
   MAIN ADMIN PANEL COMPONENT
   Usage in App.js:
   import AdminPanel from "./admin.jsx";
   Add to navbar: only show if ADMIN_EMAILS.includes(user?.email)
   Add page route: page==="admin" ? <AdminPanel user={user} D={D} />
══════════════════════════════════════════════════════════ */
export default function AdminPanel({ user, D }) {

  const [tab, setTab]                   = useState("add");
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers]               = useState([]);
  const [withdrawals, setWithdrawals]   = useState([]);
  const [stats, setStats]               = useState({ totalPending: 0, totalApproved: 0, totalUsers: 0, totalWithdrawals: 0 });
  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchUser, setSearchUser]     = useState("");

  // Add cashback form
  const [form, setForm] = useState({
    userEmail: "", brand: "Myntra", orderId: "",
    orderAmount: "", commissionRate: "7", notes: ""
  });

  // ── Access check ───────────────────────────────────────────────────────────
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div style={{ padding: "80px 6%", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: D.text, fontWeight: 900 }}>Access Denied</h2>
        <p style={{ color: D.sub, marginTop: 8 }}>Admin access only.</p>
      </div>
    );
  }

  // ── Real-time data ─────────────────────────────────────────────────────────
  useEffect(() => {
    // All transactions
    const txUnsub = onSnapshot(
      query(collection(db, "cashback_transactions"), orderBy("createdAt", "desc")),
      (snap) => {
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTransactions(txs);
        setStats(s => ({
          ...s,
          totalPending:  txs.filter(t => t.status === "pending").reduce((a, t) => a + (t.amount || 0), 0),
          totalApproved: txs.filter(t => t.status === "approved").reduce((a, t) => a + (t.amount || 0), 0),
        }));
      }
    );

    // All withdrawals
    const wUnsub = onSnapshot(
      query(collection(db, "withdrawals"), orderBy("createdAt", "desc")),
      (snap) => {
        const ws = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setWithdrawals(ws);
        setStats(s => ({ ...s, totalWithdrawals: ws.filter(w => w.status === "processing").reduce((a, w) => a + (w.amount || 0), 0) }));
      }
    );

    return () => { txUnsub(); wUnsub(); };
  }, []);

  // ── Find user by email ─────────────────────────────────────────────────────
  const findUserByEmail = async (email) => {
    try {
      const snap = await getDocs(query(collection(db, "users"), where("email", "==", email.trim())));
      if (snap.empty) return null;
      return { uid: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      return null;
    }
  };

  // ── Add cashback ───────────────────────────────────────────────────────────
  const handleAddCashback = async () => {
    setMsg(null);
    if (!form.userEmail || !form.orderAmount || !form.commissionRate) {
      return setMsg({ type: "error", text: "Please fill all required fields" });
    }
    setLoading(true);

    const foundUser = await findUserByEmail(form.userEmail);
    if (!foundUser) {
      setLoading(false);
      return setMsg({ type: "error", text: `No user found with email: ${form.userEmail}` });
    }

    const success = await addPendingCashback(
      foundUser.uid,
      form.brand,
      form.orderId || `MANUAL-${Date.now()}`,
      parseFloat(form.orderAmount),
      parseFloat(form.commissionRate)
    );

    setLoading(false);
    if (success) {
      const cashback = (parseFloat(form.orderAmount) * parseFloat(form.commissionRate) / 100).toFixed(2);
      setMsg({ type: "success", text: `✅ Added ₹${cashback} pending cashback for ${foundUser.name || form.userEmail} (${form.brand})` });
      setForm(f => ({ ...f, userEmail: "", orderId: "", orderAmount: "", notes: "" }));
    } else {
      setMsg({ type: "error", text: "Failed to add cashback. User may be flagged for fraud." });
    }
  };

  // ── Approve cashback ───────────────────────────────────────────────────────
  const handleApprove = async (txId, amount, uid) => {
    if (!window.confirm(`Approve ₹${amount} cashback? This will move it to user's available balance.`)) return;
    const ok = await approveCashback(txId);
    setMsg(ok
      ? { type: "success", text: `✅ Approved ₹${amount} cashback successfully!` }
      : { type: "error",   text: "Failed to approve. Transaction may already be approved." }
    );
  };

  // ── Reject/decline cashback ────────────────────────────────────────────────
  const handleReject = async (txId) => {
    if (!window.confirm("Reject this cashback? This cannot be undone.")) return;
    try {
      const txRef  = doc(db, "cashback_transactions", txId);
      const txSnap = await import("firebase/firestore").then(({ getDoc }) => getDoc(txRef));
      const tx     = txSnap.data();

      await updateDoc(txRef, { status: "failed", updatedAt: serverTimestamp() });
      // Return pending amount back
      await updateDoc(doc(db, "users", tx.uid), {
        "wallet.pending":     (await import("firebase/firestore")).then(({ increment }) => increment(-tx.amount)),
        "wallet.totalEarned": (await import("firebase/firestore")).then(({ increment }) => increment(-tx.amount)),
      });
      setMsg({ type: "success", text: "Transaction rejected and amount reversed." });
    } catch (e) {
      setMsg({ type: "error", text: "Failed to reject: " + e.message });
    }
  };

  // ── Mark withdrawal as paid ────────────────────────────────────────────────
  const handleMarkPaid = async (withdrawalId) => {
    if (!window.confirm("Mark this withdrawal as PAID?")) return;
    try {
      await updateDoc(doc(db, "withdrawals", withdrawalId), {
        status: "paid",
        paidAt: serverTimestamp(),
      });
      setMsg({ type: "success", text: "✅ Withdrawal marked as paid!" });
    } catch (e) {
      setMsg({ type: "error", text: "Failed: " + e.message });
    }
  };

  // ── Mark withdrawal as failed ──────────────────────────────────────────────
  const handleMarkFailed = async (withdrawal) => {
    if (!window.confirm("Mark as FAILED? This will refund the amount back to user's wallet.")) return;
    try {
      await updateDoc(doc(db, "withdrawals", withdrawal.id), {
        status: "failed", updatedAt: serverTimestamp(),
      });
      // Refund to wallet
      const { increment } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", withdrawal.uid), {
        "wallet.balance":        increment(withdrawal.amount),
        "wallet.totalWithdrawn": increment(-withdrawal.amount),
      });
      setMsg({ type: "success", text: "Withdrawal failed & amount refunded to user wallet." });
    } catch (e) {
      setMsg({ type: "error", text: "Failed: " + e.message });
    }
  };

  const filteredTx = transactions.filter(tx => {
    const statusOk = filterStatus === "all" || tx.status === filterStatus;
    const searchOk = !searchUser || tx.uid?.includes(searchUser) || tx.brand?.toLowerCase().includes(searchUser.toLowerCase());
    return statusOk && searchOk;
  });

  const BRANDS = ["Myntra","Flipkart","Ajio","Nykaa","Amazon","Meesho","Tata Cliq","Uniqlo","Swiggy","Zomato","MakeMyTrip","Mamaearth","Boat","Other"];

  const inp = {
    width: "100%", padding: "10px 12px",
    border: `1.5px solid ${D.border}`, borderRadius: 9,
    fontSize: 13, outline: "none",
    background: D.input, color: D.text,
    fontFamily: "inherit", boxSizing: "border-box",
    marginBottom: 10,
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 40px" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a202c,#2d3748)", padding: "24px 24px", borderRadius: "0 0 20px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 28 }}>⚙️</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>SaveKaro Admin Panel</div>
            <div style={{ color: "#a0aec0", fontSize: 12 }}>Logged in as {user.email}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Pending Cashback",      value: fmt(stats.totalPending),    icon: "⏳", color: "#f59e0b" },
          { label: "Approved Cashback",     value: fmt(stats.totalApproved),   icon: "✅", color: "#10b981" },
          { label: "Pending Withdrawals",   value: fmt(stats.totalWithdrawals),icon: "💸", color: "#8b5cf6" },
        ].map((s, i) => (
          <div key={i} style={{ background: D.card, borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${D.border}` }}>
            <div style={{ fontSize: 10, color: D.sub, marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Global message */}
      {msg && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 14, fontWeight: 600, fontSize: 13,
          background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
          color:      msg.type === "success" ? "#065f46" : "#991b1b",
          border:     `1px solid ${msg.type === "success" ? "#10b981" : "#ef4444"}`,
        }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: 900, color: "inherit" }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", background: D.card, borderRadius: 12, padding: 4, border: `1px solid ${D.border}`, marginBottom: 16, gap: 4 }}>
        {[["add","➕ Add Cashback"],["transactions","📋 Transactions"],["withdrawals","💸 Withdrawals"],["links","🔗 Affiliate Links"]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "9px 4px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: tab === t ? 800 : 500, color: tab === t ? "#fff" : D.sub, background: tab === t ? "linear-gradient(135deg,#FF5722,#FF9800)" : "transparent", fontFamily: "inherit", transition: "all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ADD CASHBACK TAB ── */}
      {tab === "add" && (
        <div style={{ background: D.card, borderRadius: 16, padding: 20, border: `1px solid ${D.border}` }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: D.text }}>➕ Add Cashback Manually</h3>
          <p style={{ color: D.sub, fontSize: 12, marginBottom: 20 }}>Use this when you see a confirmed sale in vCommission / Admitad dashboard</p>

          <label style={{ fontSize: 12, fontWeight: 700, color: D.sub, display: "block", marginBottom: 4 }}>User Email *</label>
          <input value={form.userEmail} onChange={e => setForm(f => ({ ...f, userEmail: e.target.value }))}
            placeholder="user@example.com" style={inp} />

          <label style={{ fontSize: 12, fontWeight: 700, color: D.sub, display: "block", marginBottom: 4 }}>Brand *</label>
          <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            style={{ ...inp, cursor: "pointer" }}>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: D.sub, display: "block", marginBottom: 4 }}>Order Amount (₹) *</label>
              <input type="number" value={form.orderAmount} onChange={e => setForm(f => ({ ...f, orderAmount: e.target.value }))}
                placeholder="e.g. 1500" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: D.sub, display: "block", marginBottom: 4 }}>Commission Rate (%) *</label>
              <input type="number" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))}
                placeholder="e.g. 7" style={inp} />
            </div>
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: D.sub, display: "block", marginBottom: 4 }}>Order ID (optional)</label>
          <input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))}
            placeholder="e.g. MYN123456789" style={inp} />

          {/* Preview */}
          {form.orderAmount && form.commissionRate && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #10b981", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 13 }}>
              💰 Cashback to credit: <strong style={{ color: "#059669", fontSize: 16 }}>
                {fmt(parseFloat(form.orderAmount || 0) * parseFloat(form.commissionRate || 0) / 100)}
              </strong>
              <span style={{ color: "#6b7280", fontSize: 11 }}> ({form.commissionRate}% of {fmt(form.orderAmount)})</span>
            </div>
          )}

          <button onClick={handleAddCashback} disabled={loading}
            style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#FF5722,#FF9800)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Adding…" : "➕ Add Pending Cashback"}
          </button>

          {/* Step by step guide */}
          <div style={{ marginTop: 20, padding: "14px 16px", background: D.bg, borderRadius: 12, border: `1px solid ${D.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: D.text, marginBottom: 10 }}>📋 How to use — Step by Step</div>
            {[
              "Login to vCommission / Admitad dashboard",
              "Go to Reports → Conversions",
              "Find a confirmed/approved sale",
              "Note: User email, Brand, Order Amount, Commission %",
              "Enter those details above and click Add",
              "After 45 days → Go to Transactions tab → Click Approve",
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 7, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FF5722", color: "#fff", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: D.sub, lineHeight: 1.5 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {tab === "transactions" && (
        <div style={{ background: D.card, borderRadius: 16, padding: 20, border: `1px solid ${D.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: D.text }}>📋 All Cashback Transactions</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${D.border}`, background: D.input, color: D.text, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: D.sub }}>No transactions found</div>
          ) : (
            filteredTx.map(tx => {
              const sc = STATUS_COLOR[tx.status] || STATUS_COLOR.pending;
              const canApprove = tx.status === "pending";
              const holdOver = tx.creditAfter && new Date() > (tx.creditAfter.toDate ? tx.creditAfter.toDate() : new Date(tx.creditAfter));
              return (
                <div key={tx.id} style={{ padding: "14px 16px", borderRadius: 12, marginBottom: 10, border: `1.5px solid ${sc.border}`, background: sc.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: sc.text }}>{tx.brand}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sc.border, color: "#fff", fontWeight: 700 }}>{tx.status}</span>
                        {canApprove && holdOver && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#10b981", color: "#fff", fontWeight: 700 }}>✅ Hold Over — Ready to Approve</span>}
                        {canApprove && !holdOver && <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>⏳ Still in hold period</span>}
                      </div>
                      <div style={{ fontSize: 11, color: sc.text, opacity: 0.8 }}>UID: {tx.uid?.slice(0, 12)}…</div>
                      <div style={{ fontSize: 11, color: sc.text, opacity: 0.8 }}>Order: {tx.orderId || "—"} • {formatDate(tx.createdAt)}</div>
                      <div style={{ fontSize: 11, color: sc.text, opacity: 0.8 }}>Order: {fmt(tx.orderAmount)} × {tx.commissionRate}%</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: sc.text }}>{fmt(tx.amount)}</div>
                      {canApprove && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => handleApprove(tx.id, tx.amount, tx.uid)}
                            style={{ padding: "6px 14px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            ✅ Approve
                          </button>
                          <button onClick={() => handleReject(tx.id)}
                            style={{ padding: "6px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── WITHDRAWALS TAB ── */}
      {tab === "withdrawals" && (
        <div style={{ background: D.card, borderRadius: 16, padding: 20, border: `1px solid ${D.border}` }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: D.text }}>💸 Withdrawal Requests</h3>

          {withdrawals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: D.sub }}>No withdrawal requests yet</div>
          ) : (
            withdrawals.map(w => {
              const sc = STATUS_COLOR[w.status] || STATUS_COLOR.processing;
              return (
                <div key={w.id} style={{ padding: "14px 16px", borderRadius: 12, marginBottom: 10, border: `1.5px solid ${sc.border}`, background: sc.bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: sc.text }}>{fmt(w.amount)}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sc.border, color: "#fff", fontWeight: 700 }}>{w.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: sc.text, fontWeight: 700 }}>UPI: {w.upiId}</div>
                      <div style={{ fontSize: 11, color: sc.text, opacity: 0.8, marginTop: 2 }}>UID: {w.uid?.slice(0, 16)}… • {formatDate(w.createdAt)}</div>
                    </div>
                    {w.status === "processing" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleMarkPaid(w.id)}
                          style={{ padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          ✅ Mark Paid
                        </button>
                        <button onClick={() => handleMarkFailed(w)}
                          style={{ padding: "8px 16px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          ❌ Failed
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div style={{ marginTop: 16, padding: "12px 16px", background: D.bg, borderRadius: 10, border: `1px solid ${D.border}`, fontSize: 12, color: D.sub }}>
            💡 To pay: Open your UPI app (GPay/PhonePe/Paytm) → Send money to the UPI ID shown → Come back and click "Mark Paid"
          </div>
        </div>
      )}

      {/* ── AFFILIATE LINKS TAB ── */}
      {tab === "links" && (
        <div style={{ background: D.card, borderRadius: 16, padding: 20, border: `1px solid ${D.border}` }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: D.text }}>🔗 Affiliate Link Generator</h3>
          <p style={{ color: D.sub, fontSize: 12, marginBottom: 20 }}>Generate tracking links with user Sub IDs so you know who to credit cashback to</p>

          <AffiliateLinkGenerator D={D} />
        </div>
      )}

    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   AFFILIATE LINK GENERATOR COMPONENT
   Generates links with sub_id for tracking which user
   made a purchase via your affiliate link
────────────────────────────────────────────────────────── */
function AffiliateLinkGenerator({ D }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [userId, setUserId]   = useState("");
  const [generated, setGenerated] = useState("");
  const [copied, setCopied]   = useState(false);

  const generate = () => {
    if (!baseUrl) return;
    const link = generateAffiliateLink(baseUrl, userId || "GUEST");
    setGenerated(link);
    setCopied(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inp = {
    width: "100%", padding: "10px 12px",
    border: `1.5px solid #e0e0e0`, borderRadius: 9,
    fontSize: 13, outline: "none",
    background: "#fff", color: "#222",
    fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10,
  };

  const EXAMPLE_LINKS = [
    { brand: "vCommission Myntra", url: "https://track.vcommission.com/XXXXX" },
    { brand: "Admitad Nykaa",      url: "https://ad.admitad.com/g/XXXXX" },
    { brand: "Cuelinks",           url: "https://cl.awins.in/XXXXX" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 4 }}>Base Tracking URL (from vCommission/Admitad)</label>
        <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://track.vcommission.com/abc123" style={inp} />

        <label style={{ fontSize: 12, fontWeight: 700, color: "#555", display: "block", marginBottom: 4 }}>User Firebase UID (optional — leave blank for testing)</label>
        <input value={userId} onChange={e => setUserId(e.target.value)}
          placeholder="Firebase UID of the user" style={inp} />

        <button onClick={generate}
          style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#FF5722,#FF9800)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
          🔗 Generate Link
        </button>
      </div>

      {generated && (
        <div style={{ padding: "14px 16px", background: "#f0fdf4", border: "1.5px solid #10b981", borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>✅ Generated Link:</div>
          <div style={{ fontSize: 12, color: "#374151", wordBreak: "break-all", background: "#fff", padding: "8px 10px", borderRadius: 8, border: "1px solid #d1fae5", marginBottom: 10 }}>{generated}</div>
          <button onClick={copy}
            style={{ padding: "8px 16px", background: copied ? "#10b981" : "#065f46", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {copied ? "✅ Copied!" : "📋 Copy Link"}
          </button>
        </div>
      )}

      <div style={{ padding: "14px 16px", background: "#fff8f6", borderRadius: 12, border: "1px solid #ffe0d6" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#FF5722", marginBottom: 10 }}>📌 How Sub ID works in your code</div>
        <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7, marginBottom: 10 }}>
          In your <strong>App.js</strong>, update the <code>handleShop</code> function to include the user's UID in every affiliate link:
        </div>
        <div style={{ background: "#1a202c", borderRadius: 8, padding: "12px 14px", fontSize: 11, color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.8 }}>
          {`import { generateAffiliateLink } from "./admin.jsx";\n\nconst handleShop = (slug, storeName, product) => {\n  const baseUrl = REDIRECT_MAP[slug];\n  // Add user UID as sub_id to track who clicked\n  const trackedUrl = generateAffiliateLink(baseUrl, user?.uid);\n  window.open(trackedUrl, "_blank");\n};`}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#666", lineHeight: 1.7 }}>
          Then in vCommission → Campaign Settings → set <strong>PostBack URL</strong> to your API endpoint that calls <code>addPendingCashback(sub_id, ...)</code>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: "12px 16px", background: "#f0f9ff", borderRadius: 12, border: "1px solid #bae6fd" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0369a1", marginBottom: 8 }}>📚 Example Base URLs</div>
        {EXAMPLE_LINKS.map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0369a1" }}>{l.brand}</span>
            <button onClick={() => setBaseUrl(l.url)}
              style={{ fontSize: 10, padding: "3px 10px", background: "#0369a1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>
              Use
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}