import { useState, useEffect } from "react";
import {
  listenWallet, listenTransactions,
  requestWithdrawal, MIN_WITHDRAWAL,
  ensureWalletDoc
} from "./firebase.js";

const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#10b981",
  credited: "#3b82f6",
  processing: "#8b5cf6",
  paid: "#10b981",
  failed: "#ef4444",
};

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function WalletPage({ D, user, onLogin }) {

  const [wallet, setWallet] = useState({
    balance: 0,
    pending: 0,
    totalEarned: 0,
    totalWithdrawn: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("wallet");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [upiId, setUpiId] = useState("");
  const [msg, setMsg] = useState(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Ensure wallet doc exists
  useEffect(() => {
    if (user?.uid) {
      ensureWalletDoc(user.uid, user.name, user.email);
    }
  }, [user]);

  // Wallet listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenWallet(user.uid, setWallet);
    return unsub;
  }, [user]);

  // Transactions listener
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenTransactions(user.uid, setTransactions);
    return unsub;
  }, [user]);

  // Withdraw logic
  const handleWithdraw = async () => {
    setMsg(null);

    const amount = parseFloat(withdrawAmt);

    if (!amount || isNaN(amount)) {
      return setMsg({ type: "error", text: "Enter valid amount" });
    }

    if (amount < MIN_WITHDRAWAL) {
      return setMsg({ type: "error", text: `Minimum ₹${MIN_WITHDRAWAL} required` });
    }

    if (amount > (wallet.balance || 0)) {
      return setMsg({ type: "error", text: "Amount exceeds available balance" });
    }

    if (!upiId.trim()) {
      return setMsg({ type: "error", text: "Enter UPI ID" });
    }

    setWithdrawLoading(true);

    const result = await requestWithdrawal(user.uid, amount, upiId.trim());

    setWithdrawLoading(false);

    if (result.success) {
      setMsg({ type: "success", text: "✅ Withdrawal request submitted!" });
      setWithdrawAmt("");
      setUpiId("");
    } else {
      setMsg({ type: "error", text: result.error });
    }
  };

  // NOT LOGGED IN
  if (!user) {
    return (
      <div style={{ padding: "60px 6%", textAlign: "center" }}>
        <div style={{ fontSize: 64 }}>💰</div>
        <h2 style={{ color: D.text }}>My Cashback Wallet</h2>
        <p style={{ color: D.sub }}>Login to view your earnings</p>
        <button onClick={onLogin}>Login</button>
      </div>
    );
  }

  // MAIN UI
  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>

     <div style={{
  padding: 20,
  borderRadius: 16,
  background: "linear-gradient(135deg,#FF5722,#FF9800)",
  color: "#fff",
  textAlign: "center"
}}>
  <h2>💰 Total Balance</h2>
  <h1 style={{ fontSize: 32 }}>{fmt(wallet.balance)}</h1>
  <p>Pending: {fmt(wallet.pending)}</p>
</div>
<div style={{ marginTop: 30 }}>
  <h3>🎁 Refer & Earn ₹20</h3>

  <input
    value={`${window.location.origin}?ref=${user.uid}`}
    readOnly
    style={{ width: "100%", padding: 10 }}
  />

  <button onClick={() => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${user.uid}`);
    alert("Referral link copied!");
  }}>
    📋 Copy Referral Link
  </button>

  <button onClick={() => {
    const text = `💰 Earn cashback using SaveKaro!\n${window.location.origin}?ref=${user.uid}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }}>
    📤 Share on WhatsApp
  </button>
</div><div style={{ marginTop: 30 }}>
  <h3>🎁 Refer & Earn ₹20</h3>

  <input
    value={`${window.location.origin}?ref=${user.uid}`}
    readOnly
    style={{ width: "100%", padding: 10 }}
  />

  <button onClick={() => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${user.uid}`);
    alert("Referral link copied!");
  }}>
    📋 Copy Referral Link
  </button>

  <button onClick={() => {
    const text = `💰 Earn cashback using SaveKaro!\n${window.location.origin}?ref=${user.uid}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }}>
    📤 Share on WhatsApp
  </button>
</div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setTab("wallet")}>Wallet</button>
        <button onClick={() => setTab("history")}>History</button>
        <button onClick={() => setTab("withdraw")}>Withdraw</button>
      </div>

      {/* HISTORY */}
      {tab === "history" && (
        <div>
          {transactions.map(tx => (
            <div key={tx.id}>
              <p>{tx.brand}</p>
              <p>{fmt(tx.amount)}</p>
              <p>{tx.status}</p>
            </div>
          ))}
        </div>
      )}

      {/* WITHDRAW */}
      {tab === "withdraw" && (
        <div>
          <input
            type="number"
            value={withdrawAmt}
            onChange={e => setWithdrawAmt(e.target.value)}
            placeholder="Amount"
          />

          <input
            type="text"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
            placeholder="UPI ID"
          />

          {msg && <p>{msg.text}</p>}

          <button onClick={handleWithdraw} disabled={withdrawLoading}>
            Withdraw
          </button>
        </div>
      )}
    </div>
  );
}