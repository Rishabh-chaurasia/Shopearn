import { useState, useRef, useEffect } from "react";
import { SPIN_PRIZES, SITE } from "./data.js";

/* ══════════════════════════════════
   SPIN & WIN WHEEL
══════════════════════════════════ */
export function SpinWheel({ D, onClose, onWin }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);
  const segAngle = 360 / SPIN_PRIZES.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 8;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    SPIN_PRIZES.forEach((prize, i) => {
      const start = (i * segAngle - 90) * Math.PI / 180;
      const end = ((i + 1) * segAngle - 90) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath(); ctx.fillStyle = prize.color; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy);
      ctx.rotate((start + end) / 2);
      ctx.textAlign = "right"; ctx.fillStyle = "#fff";
      ctx.font = "bold 13px Poppins,sans-serif";
      ctx.fillText(prize.label, r - 10, 5);
      ctx.restore();
    });
    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();
    ctx.font = "bold 11px Poppins,sans-serif"; ctx.fillStyle = "#FF5722";
    ctx.textAlign = "center"; ctx.fillText("SPIN", cx, cy + 4);
  }, []);

  const spin = () => {
    if (spinning || result) return;
    const rand = Math.random();
    let cum = 0, idx = 0;
    for (let i = 0; i < SPIN_PRIZES.length; i++) {
      cum += SPIN_PRIZES[i].prob;
      if (rand < cum) { idx = i; break; }
    }
    const targetAngle = 360 * 8 + (360 - idx * segAngle - segAngle / 2);
    setSpinning(true);
    setRotation(prev => prev + targetAngle);
    setTimeout(() => {
      setSpinning(false);
      setResult(SPIN_PRIZES[idx]);
      if (SPIN_PRIZES[idx].code) onWin(SPIN_PRIZES[idx]);
    }, 4000);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget && !spinning && onClose()}>
      <div style={{ background:D.card,borderRadius:24,padding:"32px 28px",maxWidth:380,width:"92%",textAlign:"center",position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:16,background:"none",border:"none",fontSize:22,cursor:"pointer",color:D.sub }}>✕</button>
        <div style={{ fontSize:36,marginBottom:6 }}>🎰</div>
        <h2 style={{ fontWeight:900,fontSize:20,marginBottom:4 }}>Spin & Win!</h2>
        <p style={{ color:D.sub,fontSize:13,marginBottom:20 }}>Spin the wheel for exclusive discount codes</p>

        {/* Pointer */}
        <div style={{ position:"relative",display:"inline-block" }}>
          <div style={{ position:"absolute",top:-14,left:"50%",transform:"translateX(-50%)",fontSize:22,zIndex:2 }}>▼</div>
          <canvas ref={canvasRef} width={260} height={260}
            style={{ borderRadius:"50%",boxShadow:"0 8px 32px rgba(0,0,0,.25)",transform:`rotate(${rotation}deg)`,transition:spinning?"transform 4s cubic-bezier(.17,.67,.12,.99)":"none",cursor:result?"default":"pointer" }}
            onClick={spin} />
        </div>

        {result ? (
          <div style={{ marginTop:20 }}>
            {result.code ? (
              <>
                <div style={{ fontSize:16,fontWeight:700,color:D.sub,marginBottom:6 }}>🎉 You won!</div>
                <div style={{ background:`${result.color}22`,border:`2px dashed ${result.color}`,borderRadius:12,padding:"12px 20px",fontSize:22,fontWeight:900,color:result.color,letterSpacing:2,marginBottom:14 }}>{result.code}</div>
                <button onClick={() => { navigator.clipboard.writeText(result.code); onClose(); }}
                  style={{ background:`linear-gradient(135deg,${result.color},${result.color}cc)`,color:"#fff",border:"none",borderRadius:12,padding:"11px 28px",fontWeight:800,cursor:"pointer",fontSize:14,fontFamily:"inherit" }}>
                  📋 Copy Code & Shop
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize:16,fontWeight:700,color:D.sub,marginBottom:14 }}>😅 Better luck next time!</div>
                <button onClick={() => { setResult(null); setRotation(0); }}
                  style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:12,padding:"11px 28px",fontWeight:800,cursor:"pointer",fontSize:14,fontFamily:"inherit" }}>
                  🔄 Try Again
                </button>
              </>
            )}
          </div>
        ) : (
          <button onClick={spin} disabled={spinning}
            style={{ marginTop:20,background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:12,padding:"12px 32px",fontWeight:800,cursor:spinning?"not-allowed":"pointer",fontSize:15,fontFamily:"inherit",boxShadow:"0 6px 20px rgba(255,87,34,.4)" }}>
            {spinning ? "Spinning… 🌀" : "🎰 Spin Now!"}
          </button>
        )}
        <p style={{ fontSize:11,color:D.sub,marginTop:12 }}>1 free spin per day. T&C apply.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   SOCIAL SHARE BUTTONS
══════════════════════════════════ */
export function ShareButtons({ product, D }) {
  const [open, setOpen] = useState(false);
  const url = `${SITE.url}?deal=${product.slug}`;
  const text = `🔥 ${product.title} at just ₹${product.price.toLocaleString("en-IN")} (${Math.round(((product.mrp-product.price)/product.mrp)*100)}% OFF)! + ${product.cashbackPct}% cashback via SaveKaro`;

  const share = (platform) => {
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      copy:     null,
    };
    if (platform === "copy") { navigator.clipboard.writeText(`${text}\n${url}`); }
    else window.open(links[platform], "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o=>!o); }}
        style={{ background:"none",border:`1px solid ${D.border}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:13,color:D.sub,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4 }}>
        📣 Share
      </button>
      {open && (
        <div style={{ position:"absolute",bottom:"110%",left:0,background:D.card,borderRadius:12,boxShadow:"0 8px 30px rgba(0,0,0,.2)",padding:"8px",zIndex:100,display:"flex",gap:6,border:`1px solid ${D.border}`,whiteSpace:"nowrap" }}>
          {[["💬","WhatsApp","whatsapp","#25D366"],["✈️","Telegram","telegram","#2CA5E0"],["🐦","Twitter","twitter","#1DA1F2"],["📋","Copy Link","copy","#718096"]].map(([icon,label,pl,color]) => (
            <button key={pl} onClick={() => share(pl)}
              style={{ background:`${color}18`,border:"none",borderRadius:8,padding:"8px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"inherit",minWidth:52 }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <span style={{ fontSize:10,fontWeight:700,color }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════
   DEAL EXPIRY COUNTDOWN TIMER
══════════════════════════════════ */
export function ExpiryTimer({ hoursFromNow, D }) {
  const endTime = useRef(Date.now() + hoursFromNow * 3600000).current;
  const [t, setT] = useState({ h:"--", m:"--", s:"--", expired:false });

  useEffect(() => {
    const tick = () => {
      const d = endTime - Date.now();
      if (d <= 0) { setT({ h:"00", m:"00", s:"00", expired:true }); return; }
      setT({ h:String(Math.floor(d/3600000)).padStart(2,"0"), m:String(Math.floor((d%3600000)/60000)).padStart(2,"0"), s:String(Math.floor((d%60000)/1000)).padStart(2,"0"), expired:false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const urgent = !t.expired && parseInt(t.h) < 2;
  const bg = t.expired ? "#a0aec0" : urgent ? "#E53E3E" : "#2874F0";

  return (
    <div style={{ display:"flex",alignItems:"center",gap:4,marginBottom:8 }}>
      <span style={{ fontSize:10,color:t.expired?"#a0aec0":"#E53E3E",fontWeight:700 }}>
        {t.expired ? "⛔ Expired" : "⏱️ Ends in:"}
      </span>
      {!t.expired && [t.h,t.m,t.s].map((v,i) => (
        <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:2 }}>
          <span style={{ background:bg,color:"#fff",fontWeight:800,fontSize:10,padding:"2px 5px",borderRadius:5,minWidth:22,textAlign:"center" }}>{v}</span>
          {i<2 && <span style={{ color:bg,fontWeight:900,fontSize:10 }}>:</span>}
        </span>
      ))}
    </div>
  );
}

/* ══════════════════════════════════
   LOYALTY POINTS BAR
══════════════════════════════════ */
export function LoyaltyBar({ points, D }) {
  const level = points < 100 ? "Bronze" : points < 500 ? "Silver" : points < 1500 ? "Gold" : "Platinum";
  const next =  points < 100 ? 100 : points < 500 ? 500 : points < 1500 ? 1500 : 5000;
  const prev =  points < 100 ? 0   : points < 500 ? 100 : points < 1500 ? 500  : 1500;
  const pct = Math.min(100, Math.round(((points - prev) / (next - prev)) * 100));
  const colors = { Bronze:"#CD7F32", Silver:"#C0C0C0", Gold:"#F6AD55", Platinum:"#6C63FF" };
  const color = colors[level];

  return (
    <div style={{ background:D.card,borderRadius:14,padding:"16px 18px",border:`1px solid ${D.border}`,marginBottom:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:20 }}>{level==="Bronze"?"🥉":level==="Silver"?"🥈":level==="Gold"?"🥇":"💎"}</span>
          <div>
            <div style={{ fontWeight:800,fontSize:15,color }}>{level} Member</div>
            <div style={{ fontSize:11,color:D.sub }}>{points} DK Points</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11,color:D.sub }}>Next level</div>
          <div style={{ fontSize:12,fontWeight:700,color }}>{next - points} pts away</div>
        </div>
      </div>
      <div style={{ background:D.bg,borderRadius:999,height:8,overflow:"hidden" }}>
        <div style={{ width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${color},${color}88)`,borderRadius:999,transition:"width .5s ease" }} />
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:D.sub,marginTop:4 }}>
        <span>Earn points: 10pts/click • 50pts/share • 100pts/purchase</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   LOGIN MODAL
══════════════════════════════════ */
export function LoginModal({ D, onClose, onLogin }) {
  const [mode, setMode] = useState("options");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const mockGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin({ name:"Rahul Sharma", email:"rahul@gmail.com", phone:"", avatar:"RS", provider:"google", points:120 });
      setLoading(false); onClose();
    }, 1500);
  };

  const sendOtp = () => {
    if (phone.length < 10) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setMode("otp"); }, 1200);
  };

  const verifyOtp = () => {
    if (otp.length < 4) return;
    setLoading(true);
    setTimeout(() => {
      onLogin({ name:"User "+phone.slice(-4), email:"", phone, avatar:phone.slice(-2), provider:"phone", points:50 });
      setLoading(false); onClose();
    }, 1000);
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:D.card,borderRadius:22,padding:"36px 30px",maxWidth:380,width:"92%",textAlign:"center",position:"relative",color:D.text }}>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:16,background:"none",border:"none",fontSize:22,cursor:"pointer",color:D.sub }}>✕</button>
        <div style={{ fontSize:44,marginBottom:10 }}>👤</div>
        <h2 style={{ fontWeight:900,fontSize:20,marginBottom:4 }}>Join SaveKaro</h2>
        <p style={{ color:D.sub,fontSize:13,marginBottom:24,lineHeight:1.6 }}>Sign in to save wishlist, track cashback & earn loyalty points</p>

        {mode === "options" && (
          <>
            <button onClick={mockGoogleLogin} disabled={loading}
              style={{ width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${D.border}`,background:D.input,color:D.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12 }}>
              <span style={{ fontSize:20 }}>🔵</span> {loading ? "Signing in…" : "Continue with Google"}
            </button>
            <button onClick={() => setMode("phone")}
              style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
              <span style={{ fontSize:20 }}>📱</span> Continue with Phone OTP
            </button>
            <p style={{ fontSize:11,color:D.sub,marginTop:16,lineHeight:1.6 }}>By continuing, you agree to our Terms of Use and Privacy Policy</p>
          </>
        )}

        {mode === "phone" && (
          <>
            <div style={{ display:"flex",gap:8,marginBottom:14 }}>
              <div style={{ background:D.input,border:`1.5px solid ${D.border}`,borderRadius:10,padding:"12px 14px",fontWeight:700,fontSize:14,color:D.sub }}>🇮🇳 +91</div>
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/,"").slice(0,10))} placeholder="10-digit mobile number" maxLength={10}
                style={{ flex:1,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${D.border}`,fontSize:14,outline:"none",background:D.input,color:D.text,fontFamily:"inherit" }} />
            </div>
            <button onClick={sendOtp} disabled={phone.length<10||loading}
              style={{ width:"100%",padding:"12px",borderRadius:12,border:"none",background:phone.length===10?"linear-gradient(135deg,#FF5722,#FF9800)":"#a0aec0",color:"#fff",fontWeight:800,cursor:phone.length===10?"pointer":"not-allowed",fontSize:14,fontFamily:"inherit" }}>
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
            <button onClick={() => setMode("options")} style={{ background:"none",border:"none",color:D.sub,cursor:"pointer",marginTop:12,fontSize:13 }}>← Back</button>
          </>
        )}

        {mode === "otp" && (
          <>
            <p style={{ color:D.sub,fontSize:13,marginBottom:16 }}>OTP sent to +91 {phone}</p>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/,"").slice(0,6))} placeholder="Enter 6-digit OTP" maxLength={6}
              style={{ width:"100%",padding:"14px",borderRadius:12,border:`1.5px solid ${D.border}`,fontSize:20,textAlign:"center",letterSpacing:8,outline:"none",background:D.input,color:D.text,fontFamily:"inherit",marginBottom:14 }} />
            <button onClick={verifyOtp} disabled={otp.length<4||loading}
              style={{ width:"100%",padding:"12px",borderRadius:12,border:"none",background:otp.length>=4?"linear-gradient(135deg,#FF5722,#FF9800)":"#a0aec0",color:"#fff",fontWeight:800,cursor:otp.length>=4?"pointer":"not-allowed",fontSize:14,fontFamily:"inherit" }}>
              {loading ? "Verifying…" : "Verify & Login"}
            </button>
            <button onClick={() => setMode("phone")} style={{ background:"none",border:"none",color:D.sub,cursor:"pointer",marginTop:12,fontSize:13 }}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   AI DEAL FINDER CHATBOT
   ✅ Uses Claude API via Anthropic (artifact-safe proxy)
   ✅ Falls back to smart local search if API unavailable
══════════════════════════════════ */
export function AIChatbot({ D, products, onShop, onClose }) {
  const [messages, setMessages] = useState([
    { role:"assistant", text:"Hi! 👋 I'm SaveKaro AI. Tell me what you're looking for — like 'best earphones under ₹2000' or 'show me top fashion deals' or 'gift ideas under ₹3000'." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
  const discPct = p => Math.round(((p.mrp - p.price) / p.mrp) * 100);

  // ── PRODUCT CATALOG SUMMARY (sent to Claude as context) ──────────────
  const buildCatalog = () => products.map(p =>
    `[ID:${p.id}] "${p.title}" | ${p.store} | ₹${p.price} (MRP ₹${p.mrp}, ${discPct(p)}% off) | ${p.cashbackPct}% cashback | cat:${p.category} | rating:${p.rating} | tags:${(p.tags||[]).join(",")} | inStock:${p.inStock}`
  ).join("\n");

  // ── LOCAL FALLBACK SEARCH ─────────────────────────────────────────────
  const localSearch = (query) => {
    const q = query.toLowerCase();

    // Budget extraction — handles "under 2000", "₹1500", "2000 se kam", "2k"
    const budgetRaw = q.match(/(\d+)\s*k\b/)?.[1] * 1000
      || parseInt((q.match(/(?:under|below|less than|upto|up to|within|₹|rs\.?)\s*(\d[\d,]*)/i)
         || q.match(/(\d[\d,]+)\s*(?:se kam|tak|me|budget)/)
         || q.match(/(\d{3,})/))?.[1]?.replace(/,/g,"")) || 999999;
    const budget = budgetRaw;

    // Keyword → category mapping
    const catWords = {
      electronics: ["phone","mobile","iphone","android","samsung","oneplus","laptop","tv","television","earphone","earbuds","headphone","speaker","tablet","camera","gadget","boat","noise","jbl","realtek","redmi","xiaomi","oppo","vivo"],
      fashion:     ["fashion","clothes","clothing","shirt","jeans","denim","dress","saree","kurta","tshirt","t-shirt","shoes","sandal","sneaker","watch","bag","purse","wallet","levis","myntra","ajio","zara","h&m","western","ethnic"],
      beauty:      ["beauty","skincare","skin","makeup","serum","cream","lotion","lipstick","nykaa","moisturizer","hair","face wash","sunscreen","toner","foundation","blush","mascara","kajal","perfume","deodorant"],
      food:        ["food","swiggy","zomato","restaurant","pizza","biryani","meal","snack","grocery","order food"],
      travel:      ["travel","flight","hotel","trip","makemytrip","holiday","tour","booking","vacation","mmt"],
      fitness:     ["gym","fitness","workout","exercise","protein","supplement","dumbbell","yoga","sports","badminton","cricket","cycling","running","shoes","bold","boldfit"],
      home:        ["home","kitchen","cooker","appliance","furniture","bedding","cooktop","mixer","blender","induction","prestige","havells","philips","bajaj","fan","ac","refrigerator","fridge","washing machine"],
    };

    let matchedCat = null;
    for (const [cat, kws] of Object.entries(catWords)) {
      if (kws.some(k => q.includes(k))) { matchedCat = cat; break; }
    }

    // Intents
    const wantsCheap    = /cheap|budget|affordable|sasta|सस्ता|low price|lowest/.test(q);
    const wantsBest     = /best|top|popular|trending|recommended|highest rated|must buy/.test(q);
    const wantsCashback = /cashback|earn|kama|reward/.test(q);
    const wantsSale     = /sale|discount|offer|deal|off/.test(q);
    const wantsGift     = /gift|present|birthday|anniversary|surprise|someone/.test(q);

    // Score every in-stock product
    const results = products
      .filter(p => p.inStock && p.price <= budget * 1.08)
      .map(p => {
        let score = 0;
        const blob = `${p.title} ${p.store} ${p.category} ${(p.tags||[]).join(" ")} ${p.badge}`.toLowerCase();

        // Word-by-word match (most important)
        const queryWords = q.replace(/[₹,]/g,"").split(/\s+/).filter(w => w.length > 2 && !/^(best|top|show|give|find|me|the|a|an|for|and|or|with|under|below|above|in|on|at|by)$/.test(w));
        queryWords.forEach(w => {
          if (blob.includes(w)) score += 10;           // exact word in title/tags
          if (p.title.toLowerCase().includes(w)) score += 5; // extra if in title
        });

        // Category bonus
        if (matchedCat && p.category === matchedCat) score += 20;

        // Intent boosts
        if (wantsCheap)    score += Math.max(0, (budget - p.price) / budget * 15);
        if (wantsBest)     score += p.rating * 4;
        if (wantsCashback) score += p.cashbackPct * 3;
        if (wantsSale)     score += discPct(p) / 3;
        if (wantsGift)     score += p.topDeal ? 8 : 2;

        // General quality boost
        if (p.topDeal)  score += 6;
        if (p.flashSale)score += 3;
        score += p.rating;

        return { p, score };
      })
      .filter(x => x.score > 5)           // must have some relevance
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.p);

    // If nothing matches query but budget is set, show cheapest in budget
    if (results.length === 0 && budget < 999999) {
      const budgetPicks = products.filter(p => p.inStock && p.price <= budget)
        .sort((a,b) => b.rating - a.rating).slice(0,3);
      return { results: budgetPicks, matchedCat, budget, wantsCashback, wantsSale, wantsGift, wantsBest, queryWords: q.split(/\s+/).filter(w=>w.length>2) };
    }

    // If still nothing, show top deals
    if (results.length === 0) {
      return { results: products.filter(p=>p.inStock&&p.topDeal).slice(0,3), matchedCat, budget, wantsCashback, wantsSale, wantsGift, wantsBest, noMatch:true };
    }

    return { results, matchedCat, budget, wantsCashback, wantsSale, wantsGift, wantsBest };
  };

  // ── BUILD REPLY TEXT ──────────────────────────────────────────────────
  const buildReply = ({ results, matchedCat, budget, wantsCashback, wantsSale, wantsGift, wantsBest, noMatch }) => {
    if (noMatch) return `🔍 Couldn't find an exact match. Here are our top deals today — you might find something you like! 🛍️`;
    if (results.length === 0) return `😅 No deals found right now. Try a different search!`;

    const maxCashback = Math.max(...results.map(p=>p.cashbackPct));
    const maxDisc = Math.max(...results.map(p=>discPct(p)));

    if (wantsGift)     return `🎁 Found ${results.length} great gift idea${results.length>1?"s":" "}! Best pick has ${maxDisc}% off + ${maxCashback}% cashback. 💝`;
    if (wantsCashback) return `💰 Highest cashback picks for you! Up to ${maxCashback}% cashback on these. 🤑`;
    if (wantsSale)     return `🔥 Best discounts right now — up to ${maxDisc}% off! + cashback on top. 💸`;
    if (budget < 999999) return `✅ Found ${results.length} deal${results.length>1?"s":""} under ${fmt(budget)}! Up to ${maxDisc}% off + ${maxCashback}% cashback. 🎯`;
    if (matchedCat)    return `🎯 Top ${matchedCat} picks for you! Up to ${maxDisc}% off + ${maxCashback}% cashback. ⭐`;
    if (wantsBest)     return `⭐ Here are the top-rated deals matching your search! Up to ${maxDisc}% off + ${maxCashback}% cashback.`;
    return `🛍️ Found ${results.length} great match${results.length>1?"es":""}! Up to ${maxDisc}% off + ${maxCashback}% cashback. 💸`;
  };

  // ── MAIN SEND HANDLER ─────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role:"user", text:userMsg }]);
    setLoading(true);

    try {
      // Try Claude API first
      const catalog = buildCatalog();
      const historyForAPI = messages.slice(1).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text
      }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: `You are SaveKaro AI, a helpful shopping assistant for an Indian cashback & deals website.

PRODUCT CATALOG (all available products):
${catalog}

RULES:
- Recommend 1-3 most relevant products from the catalog ONLY
- ALWAYS mention price, discount %, cashback %, and store name
- If user specifies a budget, ONLY show products within that budget
- Mark product IDs exactly like [ID:5] so they can be shown as cards
- Be friendly, enthusiastic, concise. Use emojis.
- Reply in the same language as the user (Hindi or English)
- If no good match, say so honestly and suggest closest alternatives`,
          messages: [
            ...historyForAPI,
            { role: "user", content: userMsg }
          ]
        })
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const rawReply = data.content?.[0]?.text || "";

      // Extract product IDs mentioned by Claude
      const idMatches = [...rawReply.matchAll(/\[ID:(\d+)\]/g)].map(m => parseInt(m[1]));
      const mentionedProducts = products.filter(p => idMatches.includes(p.id));
      const cleanReply = rawReply.replace(/\[ID:\d+\]/g, "").trim();

      setMessages(m => [...m, { role:"assistant", text:cleanReply, products:mentionedProducts }]);

    } catch {
      // API failed — use smart local search
      const { results, ...meta } = localSearch(userMsg);
      const reply = buildReply({ results, ...meta });
      setMessages(m => [...m, { role:"assistant", text:reply, products:results }]);
    }

    setLoading(false);
  };

  const quickPrompts = ["earphones under ₹1500","best fashion deals","top cashback today","gift under ₹2000","home appliances sale"];

  return (
    <div style={{ position:"fixed",bottom:24,left:24,zIndex:8500,width:340,maxWidth:"calc(100vw - 48px)" }}>
      <div style={{ background:D.card,borderRadius:20,boxShadow:"0 16px 60px rgba(0,0,0,.25)",border:`1px solid ${D.border}`,overflow:"hidden",display:"flex",flexDirection:"column",height:500 }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#6C63FF,#4A90E2)",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,background:"rgba(255,255,255,.2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🤖</div>
            <div>
              <div style={{ color:"#fff",fontWeight:800,fontSize:14 }}>SaveKaro AI</div>
              <div style={{ color:"rgba(255,255,255,.75)",fontSize:11 }}>Smart deal finder ✨</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,.8)",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:6 }}>
              <div style={{ maxWidth:"85%",background:m.role==="user"?"linear-gradient(135deg,#FF5722,#FF9800)":D.input,color:m.role==="user"?"#fff":D.text,padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",fontSize:13,lineHeight:1.6 }}>
                {m.text}
              </div>
              {m.products?.map(p => (
                <div key={p.id} onClick={() => onShop(p.slug, p.store, p)}
                  style={{ maxWidth:"92%",background:D.card,border:`1.5px solid ${D.border}`,borderRadius:12,padding:"10px 12px",cursor:"pointer",display:"flex",gap:10,alignItems:"center",transition:"all .15s",boxShadow:"0 2px 10px rgba(0,0,0,.07)" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="#FF5722";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=D.border;}}>
                  <img src={p.image} alt={p.title} style={{ width:46,height:46,borderRadius:9,objectFit:"cover",flexShrink:0 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:D.text,lineHeight:1.3,marginBottom:4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{p.title}</div>
                    <div style={{ display:"flex",gap:5,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={{ fontSize:13,fontWeight:900,color:"#FF5722" }}>{fmt(p.price)}</span>
                      <span style={{ fontSize:10,background:"#FF572222",color:"#FF5722",padding:"1px 6px",borderRadius:8,fontWeight:700 }}>+{p.cashbackPct}% back</span>
                      <span style={{ fontSize:10,background:"#48BB7822",color:"#276749",padding:"1px 6px",borderRadius:8,fontWeight:700 }}>{discPct(p)}% OFF</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {loading && (
            <div style={{ display:"flex",alignItems:"center",gap:8,color:D.sub,fontSize:13,padding:"4px 0" }}>
              <div style={{ display:"flex",gap:4 }}>
                {[0,1,2].map(i => <span key={i} style={{ width:7,height:7,borderRadius:"50%",background:"#6C63FF",display:"inline-block",animation:`chatDot 1.2s ${i*0.2}s infinite` }} />)}
              </div>
              <span>Finding best deals…</span>
              <style>{`@keyframes chatDot{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div style={{ padding:"0 12px 8px",display:"flex",gap:6,overflowX:"auto" }}>
          {quickPrompts.map(q => (
            <button key={q} onClick={() => setInput(q)}
              style={{ background:D.input,border:`1px solid ${D.border}`,borderRadius:20,padding:"5px 12px",fontSize:11,whiteSpace:"nowrap",cursor:"pointer",color:D.sub,fontFamily:"inherit",fontWeight:600,flexShrink:0 }}>
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding:"10px 12px",borderTop:`1px solid ${D.border}`,display:"flex",gap:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Ask me anything…"
            style={{ flex:1,padding:"10px 14px",borderRadius:12,border:`1.5px solid ${D.inputBorder}`,fontSize:13,outline:"none",background:D.input,color:D.text,fontFamily:"inherit" }} />
          <button onClick={sendMessage} disabled={!input.trim()||loading}
            style={{ background:"linear-gradient(135deg,#6C63FF,#4A90E2)",border:"none",borderRadius:12,padding:"10px 14px",cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:16,opacity:input.trim()&&!loading?1:.5,transition:"opacity .2s" }}>
            🚀
          </button>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════
   USER PROFILE DROPDOWN
══════════════════════════════════ */
export function ProfileDropdown({ user, points, D, onLogout, onNavigate, onClose }) {
  const level = points < 100 ? "Bronze 🥉" : points < 500 ? "Silver 🥈" : points < 1500 ? "Gold 🥇" : "Platinum 💎";
  return (
    <div style={{ position:"absolute",top:"110%",right:0,background:D.card,borderRadius:16,boxShadow:"0 12px 40px rgba(0,0,0,.2)",border:`1px solid ${D.border}`,minWidth:220,zIndex:600,overflow:"hidden" }}>
      <div style={{ padding:"16px 18px",borderBottom:`1px solid ${D.border}`,display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#FF5722,#FF9800)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:16 }}>{user.avatar}</div>
        <div>
          <div style={{ fontWeight:800,fontSize:14 }}>{user.name}</div>
          <div style={{ fontSize:11,color:"#F6AD55",fontWeight:700 }}>{level} • {points} pts</div>
        </div>
      </div>
      {[["💰 My Cashback","tracker"],["❤️ Wishlist","wishlist"],["👤 Profile","profile"]].map(([label,page]) => (
        <button key={page} onClick={() => { onNavigate(page); onClose(); }}
          style={{ display:"block",width:"100%",padding:"12px 18px",background:"none",border:"none",textAlign:"left",fontSize:14,fontWeight:600,cursor:"pointer",color:D.text,fontFamily:"inherit",borderBottom:`1px solid ${D.border}` }}
          onMouseEnter={e=>e.currentTarget.style.background=D.input} onMouseLeave={e=>e.currentTarget.style.background="none"}>
          {label}
        </button>
      ))}
      <button onClick={onLogout}
        style={{ display:"block",width:"100%",padding:"12px 18px",background:"none",border:"none",textAlign:"left",fontSize:14,fontWeight:600,cursor:"pointer",color:"#FC8181",fontFamily:"inherit" }}
        onMouseEnter={e=>e.currentTarget.style.background="#FFF5F5"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
        🚪 Sign Out
      </button>
    </div>
  );
}