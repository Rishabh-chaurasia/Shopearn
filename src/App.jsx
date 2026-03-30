import emailjs from "@emailjs/browser";import { useState, useEffect, useRef } from "react";
import { REDIRECT_MAP, SITE, PRODUCTS, COUPONS, STORES, BANNERS, CATEGORIES, SORT_OPTIONS, CREDIT_OFFERS } from "./data.js";
import { usePersist, useCountdown, useToast, useAuth, usePurchases, useClickTracker, useMissingCashback, useWishlist } from "./hooks.js";
import { SpinWheel, ShareButtons, ExpiryTimer, LoginModal, AIChatbot, ProfileDropdown } from "./components.jsx";
import { ExitIntentPopup, PWAInstallBanner, PushNotificationBanner, AntiAdblockBanner, FeaturedDealOfDay, LiveChatButton, BlogPage } from "./growth.jsx";
import { SkeletonGrid, ErrorBoundary, NotFoundPage, CookieConsent } from "./polish.jsx";

const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const disc = (mrp, price) => Math.round(((mrp - price) / mrp) * 100);
const TRENDING_THRESHOLD = 8000;
const FLASH_END = Date.now() + 48 * 3600 * 1000;

const goTo = (slug, storeName, showToast) => {
  const real = REDIRECT_MAP[slug];
  if (!real) return;
  showToast(`Opening ${storeName}… Cashback tracked! 💰`);
  setTimeout(() => window.open(real, "_blank", "noopener,noreferrer"), 650);
};

// ── HINDI TRANSLATION MAP ──────────────────────────────────────────────────
const LANG = {
  en: {
    home: "Home", deals: "Deals", coupons: "Coupons", stores: "Stores",
    wishlist: "Wishlist", tracker: "My Cashback", howItWorks: "How It Works",
    legal: "Legal", blog: "Blog", partners: "Partners",
    searchPlaceholder: "Search deals…", login: "Login",
    shopNow: "Shop Now & Earn →", outOfStock: "📦 Out of Stock",
    addToWishlist: "Added to Wishlist ❤️", removeFromWishlist: "Removed from Wishlist",
    topDeals: "⭐ Top Deals of the Week", topStores: "🏪 Top Stores",
    viewAll: "View All", findDeals: "Find Deals →",
    budget: "Budget", exploreDeals: "Explore All Deals 🎁",
    referEarn: "🏷️ Refer & Earn", copyReferral: "📋 Copy Referral Link",
    linkCopied: "✅ Link Copied!", howSaveKaroWorks: "How SaveKaro Works",
    step1T: "Find a Deal", step1D: "Browse from 50+ top Indian brands",
    step2T: "Click & Shop", step2D: "Go directly to the product via our link",
    step3T: "Earn Cashback", step3D: "Tracked automatically, paid to your wallet",
    readyToSave: "Ready to Start Saving?",
    joinUsers: "Join 5 lakh+ smart shoppers earning cashback every day",
    dealsFound: n => `${n} deals found`,
    noDeals: "No deals found", adjustFilters: "Try adjusting filters or budget",
    sortBy: "Sort by", reset: "Reset",
    cashbackCalc: "Cashback Calculator", seeEarnings: "See exactly how much you'll earn back",
    orderAmount: "Order Amount (₹)", cashbackRate: "Cashback Rate",
    youWillEarn: "You will earn back", on: "on a",
    order: "order", enterAmount: "Enter an amount above to see your savings",
    comparePrice: "📊 Price Comparison", bestPrice: "💰 Save up to",
    byBest: "by choosing best price!",
    customerReviews: "⭐ Customer Reviews", ratings: "ratings",
    writeReview: "✍️ Write a Review", submitReview: "Submit Review (+20 pts)",
    shopNowEarn: n => `Shop Now & Earn ${n}% Back →`,
    addPurchase: "➕ Add Purchase", savePurchase: "Save Purchase (+100 pts) ✅",
    myTracker: "💰 My Cashback Tracker", trackAll: "Track all purchases & earnings in one place",
    totalSpent: "Total Spent", totalEarned: "Total Earned", pending: "Pending",
    dkPoints: "DK Points", noPurchases: "No purchases yet",
    startShopping: "Start shopping through our links to track cashback here!",
    pointsHistory: "🏅 Points History",
    subscribeAlerts: "Get Exclusive Deal Alerts!", subscribeDesc: "Be first to know about flash sales & extra cashback offers via WhatsApp or Email.",
    yourName: "Your Name", whatsappOrEmail: "WhatsApp number or Email",
    subscribeCta: "🔔 Subscribe & Get +25 Points!", noSpam: "No spam. Unsubscribe anytime.",
    recentlyViewed: "🆕 Recently Viewed",
    flashSale: "⚡ FLASH SALE", extraOff: "🔥 Extra 5% off marked items",
    partnerStores: "Partner Stores", cashbackPaid: "Cashback Paid",
    happyUsers: "Happy Users", free: "Free",
    referDesc: "Share your link. Your friends shop. You earn bonus points.",
    howItWorksSubtitle: "3 simple steps to start earning cashback",
  },
  hi: {
    home: "होम", deals: "डील्स", coupons: "कूपन", stores: "स्टोर्स",
    wishlist: "विशलिस्ट", tracker: "मेरा कैशबैक", howItWorks: "कैसे काम करता है",
    legal: "नियम", blog: "ब्लॉग", partners: "पार्टनर",
    searchPlaceholder: "डील्स खोजें…", login: "लॉगिन",
    shopNow: "अभी खरीदें और कमाएं →", outOfStock: "📦 स्टॉक में नहीं",
    addToWishlist: "विशलिस्ट में जोड़ा ❤️", removeFromWishlist: "विशलिस्ट से हटाया",
    topDeals: "⭐ इस हफ्ते की टॉप डील्स", topStores: "🏪 टॉप स्टोर्स",
    viewAll: "सभी देखें", findDeals: "डील्स खोजें →",
    budget: "बजट", exploreDeals: "सभी डील्स देखें 🎁",
    referEarn: "🏷️ रेफर करें और कमाएं", copyReferral: "📋 रेफरल लिंक कॉपी करें",
    linkCopied: "✅ लिंक कॉपी हो गया!", howSaveKaroWorks: "SaveKaro कैसे काम करता है",
    step1T: "डील खोजें", step1D: "50+ टॉप भारतीय ब्रांड्स में से चुनें",
    step2T: "क्लिक करें और खरीदें", step2D: "हमारे लिंक से सीधे प्रोडक्ट पर जाएं",
    step3T: "कैशबैक कमाएं", step3D: "अपने आप ट्रैक होता है, वॉलेट में मिलता है",
    readyToSave: "बचत शुरू करने के लिए तैयार हैं?",
    joinUsers: "5 लाख+ स्मार्ट शॉपर्स से जुड़ें जो रोज कैशबैक कमाते हैं",
    dealsFound: n => `${n} डील्स मिलीं`,
    noDeals: "कोई डील नहीं मिली", adjustFilters: "फ़िल्टर या बजट बदलकर देखें",
    sortBy: "क्रमबद्ध करें", reset: "रीसेट",
    cashbackCalc: "कैशबैक कैलकुलेटर", seeEarnings: "देखें आप कितना वापस पाएंगे",
    orderAmount: "ऑर्डर राशि (₹)", cashbackRate: "कैशबैक दर",
    youWillEarn: "आप वापस पाएंगे", on: "पर",
    order: "ऑर्डर", enterAmount: "राशि डालें और बचत देखें",
    comparePrice: "📊 मूल्य तुलना", bestPrice: "💰 बचाएं",
    byBest: "सबसे अच्छी कीमत चुनकर!",
    customerReviews: "⭐ ग्राहक समीक्षाएं", ratings: "रेटिंग्स",
    writeReview: "✍️ समीक्षा लिखें", submitReview: "समीक्षा दें (+20 pts)",
    shopNowEarn: n => `अभी खरीदें और ${n}% वापस पाएं →`,
    addPurchase: "➕ खरीदारी जोड़ें", savePurchase: "खरीदारी सेव करें (+100 pts) ✅",
    myTracker: "💰 मेरा कैशबैक ट्रैकर", trackAll: "सभी खरीदारी और कमाई एक जगह",
    totalSpent: "कुल खर्च", totalEarned: "कुल कमाई", pending: "बाकी",
    dkPoints: "DK पॉइंट्स", noPurchases: "अभी तक कोई खरीदारी नहीं",
    startShopping: "हमारे लिंक से खरीदारी शुरू करें और यहाँ ट्रैक करें!",
    pointsHistory: "🏅 पॉइंट्स इतिहास",
    subscribeAlerts: "एक्सक्लूसिव डील अलर्ट पाएं!", subscribeDesc: "फ्लैश सेल और एक्स्ट्रा कैशबैक की जानकारी सबसे पहले पाएं।",
    yourName: "आपका नाम", whatsappOrEmail: "WhatsApp नंबर या Email",
    subscribeCta: "🔔 सब्सक्राइब करें और +25 पॉइंट्स पाएं!", noSpam: "स्पैम नहीं। कभी भी अनसब्सक्राइब करें।",
    recentlyViewed: "🆕 हाल में देखा",
    flashSale: "⚡ फ्लैश सेल", extraOff: "🔥 चिह्नित वस्तुओं पर 5% अतिरिक्त छूट",
    partnerStores: "पार्टनर स्टोर्स", cashbackPaid: "कैशबैक दिया गया",
    happyUsers: "खुश उपयोगकर्ता", free: "बिल्कुल मुफ्त",
    referDesc: "अपना लिंक शेयर करें। दोस्त खरीदें। आप बोनस पॉइंट्स कमाएं।",
    howItWorksSubtitle: "कैशबैक शुरू करने के 3 आसान कदम",
  }
};

// ── REACTIVE TRANSLATION HELPER ────────────────────────────────────────────
// Returns a T() function that is bound to the current lang value.
// Called inside App component so it re-creates on every lang state change.
const getT = (lang) => (key, ...args) => {
  const v = LANG[lang]?.[key] ?? LANG.en[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
};

export default function App() {
  const [page, setPage] = useState("home");
  const [dark, setDark] = usePersist("dk_dark", false);
  const [lang, setLang] = usePersist("dk_lang", "en");
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [budgetMax, setBudgetMax] = usePersist("dk_budget", 80000);
  // Wishlist from Firebase (syncs across devices) or localStorage (guests)
  // Purchases now loaded from Firestore — wired after user is known
  const [recentlyViewed, setRecentlyViewed] = usePersist("dk_recent", []);
  const [nlDone, setNlDone] = usePersist("dk_nl", false);
  const [spinShown, setSpinShown] = usePersist("dk_spin_shown", false);
  const [toast, showToast] = useToast();
  const [copied, setCopied] = useState(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [calcAmount, setCalcAmount] = useState("");
  const [calcPct, setCalcPct] = useState(8);
  const [showCompare, setShowCompare] = useState(null);
  const [showReview, setShowReview] = useState(null);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPWABanner, setShowPWABanner] = usePersist("dk_pwa_dismissed", true);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [cookieConsent, setCookieConsent] = usePersist("dk_cookie", null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingShop, setPendingShop] = useState(null); // stores intended shop after login
  const [nlForm, setNlForm] = useState({ name:"", contact:"" });
  const { user, login, logout } = useAuth();
  // Points system removed from UI — keeping award as no-op to avoid breaking other calls
  const award = () => {};
  const flashTime = useCountdown(FLASH_END);

  // Wishlist — syncs to Firestore when logged in
  const { wishlist, toggleWishlist: toggleWishlistFn, wishlistReady } = useWishlist(user?.uid);

  // Firestore hooks — wired to current user
  const { purchases, loadingPurchases, addPurchase: addPurchaseToFirestore, deletePurchase } = usePurchases(user?.uid);
  const { trackClick } = useClickTracker(user?.uid);
  const { requests: missingRequests, submitRequest: submitMissingCashback } = useMissingCashback(user?.uid);
  const [showMissingCashback, setShowMissingCashback] = useState(false);

  // ── REACTIVE T() — re-creates whenever lang changes ──────────────────────
  const T = getT(lang);

  // Auto-show newsletter after 10s
  useEffect(() => {
    if (nlDone) return;
    const t = setTimeout(() => setShowNewsletter(true), 10000);
    return () => clearTimeout(t);
  }, [nlDone]);

  // Show spin wheel after 20s if not shown today
  useEffect(() => {
    if (spinShown) return;
    const t = setTimeout(() => { setShowSpin(true); setSpinShown(true); }, 20000);
    return () => clearTimeout(t);
  }, [spinShown]);

  // Show push notification banner after 30s
  useEffect(() => {
    const t = setTimeout(() => setShowPushBanner(true), 30000);
    return () => clearTimeout(t);
  }, []);

  // Simulate initial load
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const D = dark ? {
    bg:"#0f1117", card:"#1a1d27", nav:"#13151f", border:"#2d3148",
    text:"#e2e8f0", sub:"#8892a4", input:"#1e2130", inputBorder:"#2d3148",
  } : {
    bg:"#F4F6FB", card:"#ffffff", nav:"#ffffff", border:"#f0f0f0",
    text:"#1a202c", sub:"#718096", input:"#F7F8FC", inputBorder:"#e2e8f0",
  };

  const handleShop = (slug, storeName, product) => {
    if (product) setRecentlyViewed(p => [product, ...p.filter(x => x.id !== product.id)].slice(0, 8));
    // Track every affiliate click to Firestore
    trackClick(product, slug);
    goTo(slug, storeName, showToast);
  };

  const handleCopy = (code, id, store) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    showToast(`Code "${code}" copied! Paste at checkout 🎉`);
    setTimeout(() => setCopied(null), 2500);
  };

  const toggleWishlist = async (product) => {
    if (!user) {
      showToast("Please login to save to wishlist 💛", "info");
      setShowLogin(true);
      return;
    }
    const exists = wishlist.some(p => p.id === product.id);
    showToast(exists ? T("removeFromWishlist") : T("addToWishlist"), exists ? "info" : "success");
    await toggleWishlistFn(product);
  };

  const handleNlSubmit = () => {
    if (!nlForm.name || !nlForm.contact) { showToast("Please fill both fields", "info"); return; }
    emailjs.send(
      "service_i46thd9",
      "template_vlyzseg",
      { name: nlForm.name, contact: nlForm.contact, time: new Date().toLocaleString("en-IN") },
      "DoNI46e520c5ajQHm"
    ).catch(err => console.warn("EmailJS:", err));
    setNlDone(true); setShowNewsletter(false);
    showToast("🎉 Subscribed! You'll get the best deals first.");
  };

  const handleReferral = () => {
    const ref = `${SITE.url}?ref=${user?.phone?.slice(-4) || "FRIEND"}`;
    navigator.clipboard.writeText(ref).catch(() => {});
    setLinkCopied(true);
    showToast("Referral link copied! 🔗 Share it to earn bonus points.");
    setTimeout(() => setLinkCopied(false), 2500);
  };


  const handleSpinWin = (prize) => {
    showToast(`You won ${prize.label}! Code: ${prize.code} 🎉`);
  };

  let filtered = PRODUCTS.filter(p => {
    const catOk = activeCat === "all" || p.category === activeCat;
    const searchOk = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.store.toLowerCase().includes(search.toLowerCase()) || p.tags?.some(t => t.includes(search.toLowerCase()));
    return catOk && searchOk && p.price <= budgetMax;
  });
  if (sortBy === "discount")  filtered = [...filtered].sort((a,b) => disc(b.mrp,b.price) - disc(a.mrp,a.price));
  if (sortBy === "cashback")  filtered = [...filtered].sort((a,b) => b.cashbackPct - a.cashbackPct);
  if (sortBy === "priceLow")  filtered = [...filtered].sort((a,b) => a.price - b.price);
  if (sortBy === "priceHigh") filtered = [...filtered].sort((a,b) => b.price - a.price);
  if (sortBy === "rating")    filtered = [...filtered].sort((a,b) => b.rating - a.rating);
  if (sortBy === "expiring")  filtered = [...filtered].sort((a,b) => a.expiresHours - b.expiresHours);

  const totalSpent   = purchases.reduce((s,p) => s + (p.amount||0), 0);
  const totalEarned  = purchases.filter(p=>p.status==="paid").reduce((s,p) => s + (p.cashback||0), 0);
  const totalPending = purchases.filter(p=>p.status==="pending"||p.status==="confirmed").reduce((s,p) => s + (p.cashback||0), 0);
  const calcSaving = calcAmount ? Math.round(parseFloat(calcAmount) * calcPct / 100) : 0;
  const OV = { position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center" };
  const MB = { background:D.card,borderRadius:20,padding:"32px",maxWidth:440,width:"90%",animation:"popIn .3s ease",position:"relative",color:D.text,maxHeight:"90vh",overflowY:"auto" };

  return (
    <ErrorBoundary>
    <div style={{ fontFamily:"'Poppins','Segoe UI',sans-serif",background:D.bg,minHeight:"100vh",color:D.text,transition:"background .3s,color .3s" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#888;border-radius:5px}
        @keyframes slideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        .ch{transition:transform .2s,box-shadow .2s}.ch:hover{transform:translateY(-4px);box-shadow:0 14px 44px rgba(0,0,0,.12)!important}
        .nl2{position:relative;transition:color .15s}.nl2::after{content:'';position:absolute;bottom:-4px;left:0;right:0;height:2px;background:#FF5722;border-radius:2px;transform:scaleX(0);transition:transform .2s}.nl2:hover::after,.nl2.a::after{transform:scaleX(1)}
        .fab{transition:transform .18s}.fab:hover{transform:scale(1.13)!important}
        input[type=range]{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;background:#e2e8f0;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#FF5722,#FF9800);cursor:pointer}
        select{font-family:'Poppins','Segoe UI',sans-serif}
        table{border-collapse:collapse;width:100%}th,td{padding:11px 13px;text-align:left;font-size:13px}
        @media(max-width:768px){.dnav{display:none!important}.msrch{display:none!important}}
        @media(min-width:769px){.hmb{display:none!important}}
      `}</style>

      {/* TOAST */}
      {toast && <div style={{ position:"fixed",top:20,right:20,zIndex:9999,background:dark?"#1e2130":"#1a202c",color:"#fff",padding:"13px 20px",borderRadius:12,boxShadow:"0 12px 40px rgba(0,0,0,.3)",fontSize:14,fontWeight:600,borderLeft:`4px solid ${toast.type==="info"?"#63B3ED":"#48BB78"}`,animation:"slideDown .3s ease",maxWidth:340,lineHeight:1.5 }}>{toast.msg}</div>}

      {/* MODALS */}
      {showLogin    && <LoginModal D={D} pendingShop={pendingShop} onClose={() => { setShowLogin(false); setPendingShop(null); }} onLogin={u => {
        login(u);
        showToast(`Welcome, ${u.name}! 🎉`);
        setShowLogin(false);
        // Auto-open the store they were trying to visit before login
        if (pendingShop) {
          const { slug, storeName, product } = pendingShop;
          setPendingShop(null);
          setTimeout(() => {
            if (product) setRecentlyViewed(p => [product, ...p.filter(x => x.id !== product.id)].slice(0, 8));
            trackClick(product, slug);
            goTo(slug, storeName, showToast);
          }, 800);
        }
      }} />}
      {showSpin     && <SpinWheel D={D} onClose={() => setShowSpin(false)} onWin={handleSpinWin} />}
      {showChatbot  && <AIChatbot D={D} products={PRODUCTS} onShop={handleShop} onClose={() => setShowChatbot(false)} />}

      {/* NEWSLETTER */}
      {showNewsletter && (
        <div style={OV} onClick={e => e.target===e.currentTarget && setShowNewsletter(false)}>
          <div style={MB}>
            <button onClick={() => setShowNewsletter(false)} style={{ position:"absolute",top:14,right:18,background:"none",border:"none",fontSize:22,cursor:"pointer",color:D.sub }}>✕</button>
            <div style={{ fontSize:52,textAlign:"center",marginBottom:10 }}>📧</div>
            <h2 style={{ fontSize:22,fontWeight:900,textAlign:"center",marginBottom:6 }}>{T("subscribeAlerts")}</h2>
            <p style={{ color:D.sub,fontSize:14,textAlign:"center",marginBottom:24,lineHeight:1.6 }}>{T("subscribeDesc")}</p>
            <input value={nlForm.name} onChange={e => setNlForm(f=>({...f,name:e.target.value}))} placeholder={T("yourName")} style={{ width:"100%",padding:"12px 16px",borderRadius:10,border:`1.5px solid ${D.inputBorder}`,fontSize:14,marginBottom:12,outline:"none",fontFamily:"inherit",background:D.input,color:D.text }} />
            <input value={nlForm.contact} onChange={e => setNlForm(f=>({...f,contact:e.target.value}))} placeholder={T("whatsappOrEmail")} style={{ width:"100%",padding:"12px 16px",borderRadius:10,border:`1.5px solid ${D.inputBorder}`,fontSize:14,marginBottom:20,outline:"none",fontFamily:"inherit",background:D.input,color:D.text }} />
            <button onClick={handleNlSubmit} style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit" }}>{T("subscribeCta")}</button>
            <p style={{ fontSize:11,color:D.sub,textAlign:"center",marginTop:12 }}>{T("noSpam")}</p>
          </div>
        </div>
      )}

      {/* CALCULATOR */}
      {showCalc && (
        <div style={OV} onClick={e => e.target===e.currentTarget && setShowCalc(false)}>
          <div style={MB}>
            <button onClick={() => setShowCalc(false)} style={{ position:"absolute",top:14,right:18,background:"none",border:"none",fontSize:22,cursor:"pointer",color:D.sub }}>✕</button>
            <div style={{ fontSize:48,textAlign:"center",marginBottom:10 }}>🏆</div>
            <h2 style={{ fontSize:20,fontWeight:900,textAlign:"center",marginBottom:4 }}>{T("cashbackCalc")}</h2>
            <p style={{ color:D.sub,fontSize:13,textAlign:"center",marginBottom:24 }}>{T("seeEarnings")}</p>
            <label style={{ fontSize:13,fontWeight:600,color:D.sub,display:"block",marginBottom:6 }}>{T("orderAmount")}</label>
            <input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} placeholder="e.g. 5000" style={{ width:"100%",padding:"12px 16px",borderRadius:10,border:`1.5px solid ${D.inputBorder}`,fontSize:15,marginBottom:18,outline:"none",fontFamily:"inherit",background:D.input,color:D.text }} />
            <label style={{ fontSize:13,fontWeight:600,color:D.sub,display:"block",marginBottom:8 }}>{T("cashbackRate")}: <span style={{ color:"#FF5722",fontWeight:800 }}>{calcPct}%</span></label>
            <input type="range" min={1} max={20} value={calcPct} onChange={e => setCalcPct(Number(e.target.value))} style={{ marginBottom:24 }} />
            <div style={{ background:dark?"#1e2130":"#FFF8F6",border:"2px solid #FF572222",borderRadius:16,padding:"20px",textAlign:"center" }}>
              {calcAmount ? <><div style={{ fontSize:13,color:D.sub,marginBottom:4 }}>{T("youWillEarn")}</div><div style={{ fontSize:38,fontWeight:900,color:"#FF5722" }}>{fmt(calcSaving)}</div><div style={{ fontSize:13,color:D.sub,marginTop:4 }}>{T("on")} {fmt(Number(calcAmount))} {T("order")}</div></> : <div style={{ color:D.sub,fontSize:14 }}>{T("enterAmount")}</div>}
            </div>
          </div>
        </div>
      )}

      {/* COMPARE */}
      {showCompare && (
        <div style={OV} onClick={e => e.target===e.currentTarget && setShowCompare(null)}>
          <div style={MB}>
            <button onClick={() => setShowCompare(null)} style={{ position:"absolute",top:14,right:18,background:"none",border:"none",fontSize:22,cursor:"pointer",color:D.sub }}>✕</button>
            <h2 style={{ fontSize:18,fontWeight:900,marginBottom:4 }}>{T("comparePrice")}</h2>
            <p style={{ color:D.sub,fontSize:13,marginBottom:20 }}>{showCompare.title}</p>
            {Object.entries(showCompare.comparePrice).map(([store, price]) => {
              const best = price === Math.min(...Object.values(showCompare.comparePrice));
              const icons = { Amazon:"🛒",Flipkart:"📦",Myntra:"👗",Ajio:"✨",Nykaa:"💄" };
              return (
                <div key={store} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderRadius:12,marginBottom:10,background:best?(dark?"#1a2e20":"#F0FFF4"):(dark?"#1e2130":"#F7F8FC"),border:`1.5px solid ${best?"#48BB78":D.border}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontSize:22 }}>{icons[store]||"🏪"}</span>
                    <span style={{ fontWeight:700 }}>{store}</span>
                    {best && <span style={{ background:"#48BB78",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10 }}>BEST ✓</span>}
                  </div>
                  <span style={{ fontWeight:900,fontSize:18,color:best?"#276749":D.text }}>{fmt(price)}</span>
                </div>
              );
            })}
            <div style={{ marginTop:14,padding:"12px 16px",background:dark?"#1e2130":"#FFF8F6",borderRadius:12,fontSize:13,color:"#FF5722",fontWeight:700,textAlign:"center" }}>
              {T("bestPrice")} {fmt(Math.max(...Object.values(showCompare.comparePrice))-Math.min(...Object.values(showCompare.comparePrice)))} {T("byBest")}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS */}
      {showReview && (
        <div style={OV} onClick={e => e.target===e.currentTarget && setShowReview(null)}>
          <div style={{ ...MB,maxWidth:500 }}>
            <button onClick={() => setShowReview(null)} style={{ position:"absolute",top:14,right:18,background:"none",border:"none",fontSize:22,cursor:"pointer",color:D.sub }}>✕</button>
            <h2 style={{ fontSize:18,fontWeight:900,marginBottom:4 }}>{T("customerReviews")}</h2>
            <p style={{ color:D.sub,fontSize:13,marginBottom:14 }}>{showReview.title}</p>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 16px",background:dark?"#1e2130":"#F7F8FC",borderRadius:12 }}>
              <div style={{ fontSize:34,fontWeight:900,color:"#F6AD55" }}>{showReview.rating}</div>
              <div>
                <div>{[1,2,3,4,5].map(s => <span key={s} style={{ color:s<=Math.round(showReview.rating)?"#F6AD55":"#CBD5E0",fontSize:16 }}>★</span>)}</div>
                <div style={{ fontSize:12,color:D.sub }}>{showReview.reviews.toLocaleString()} {T("ratings")}</div>
              </div>
            </div>
            {showReview.userReviews.map((r,i) => (
              <div key={i} style={{ padding:"12px 14px",borderRadius:12,marginBottom:10,background:dark?"#1e2130":"#F7F8FC",border:`1px solid ${D.border}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#FF5722,#FF9800)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:11 }}>{r.name[0]}</div>
                    <span style={{ fontWeight:700,fontSize:13 }}>{r.name}</span>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <div>{[1,2,3,4,5].map(s => <span key={s} style={{ color:s<=r.stars?"#F6AD55":"#CBD5E0",fontSize:12 }}>★</span>)}</div>
                    <span style={{ fontSize:10,color:D.sub }}>{r.date}</span>
                  </div>
                </div>
                <p style={{ fontSize:13,color:D.sub,lineHeight:1.6,paddingLeft:36 }}>"{r.text}"</p>
              </div>
            ))}
            <WriteReview D={D} product={showReview} onSubmit={(r) => { showToast("Review submitted! Thank you 🎉"); setShowReview(null); }} />
            <button onClick={() => { setShowReview(null); handleShop(showReview.slug, showReview.store, showReview); }} style={{ width:"100%",padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",marginTop:8,fontFamily:"inherit" }}>
              {T("shopNowEarn", showReview.cashbackPct)}
            </button>
          </div>
        </div>
      )}



      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div style={{ position:"fixed",inset:0,zIndex:6000 }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{ position:"absolute",top:64,right:0,width:260,background:D.nav,boxShadow:"0 8px 32px rgba(0,0,0,.2)",borderRadius:"0 0 0 16px",padding:"12px 0",maxHeight:"90vh",overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            {[["home","🏠"],["deals","🔥"],["coupons","🎟️"],["stores","🏪"],["wishlist","❤️"],["tracker","💰"],["howItWorks","❓"],["legal","📜"],["blog","📰"],["partners","🤝"]].map(([p,icon]) => (
              <button key={p} onClick={() => { setPage(p); setMobileMenuOpen(false); }} style={{ display:"block",width:"100%",padding:"13px 22px",background:"none",border:"none",textAlign:"left",fontWeight:600,fontSize:14,cursor:"pointer",color:page===p?"#FF5722":D.text,fontFamily:"inherit",borderLeft:page===p?"3px solid #FF5722":"3px solid transparent" }}>
                {icon} {T(p)}
              </button>
            ))}
            <div style={{ borderTop:`1px solid ${D.border}`,margin:"8px 22px",paddingTop:12,display:"flex",gap:8 }}>
              <button onClick={() => { setDark(d=>!d); setMobileMenuOpen(false); }} style={{ background:"none",border:`1px solid ${D.border}`,borderRadius:8,padding:"7px 12px",cursor:"pointer",color:D.text,fontSize:13 }}>{dark?"☀️":"🌙"}</button>
              <button onClick={() => { setLang(l=>l==="en"?"hi":"en"); setMobileMenuOpen(false); }} style={{ background:"linear-gradient(135deg,#6C63FF,#4A90E2)",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:800 }}>{lang==="en"?"हिं":"EN"}</button>
              <button onClick={() => { setShowSpin(true); setMobileMenuOpen(false); }} style={{ background:"linear-gradient(135deg,#F6AD55,#DD6B20)",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",color:"#fff",fontSize:13 }}>🎰</button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BUTTONS */}
      <button onClick={() => setShowChatbot(c=>!c)} className="fab" title="AI Deal Finder"
        style={{ position:"fixed",bottom:168,right:22,zIndex:7000,background:"linear-gradient(135deg,#6C63FF,#4A90E2)",borderRadius:"50%",width:52,height:52,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 20px rgba(108,99,255,.5)" }}>🤖</button>
      <a href={SITE.whatsapp} target="_blank" rel="noreferrer" className="fab"
        style={{ position:"fixed",bottom:104,right:22,zIndex:7000,background:"#25D366",borderRadius:"50%",width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:"0 6px 20px rgba(37,211,102,.45)",textDecoration:"none" }}>💬</a>
      <button onClick={() => setShowCalc(true)} className="fab"
        style={{ position:"fixed",bottom:168,left:22,zIndex:7000,background:"linear-gradient(135deg,#FF5722,#FF9800)",borderRadius:"50%",width:52,height:52,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 20px rgba(255,87,34,.4)" }}>🏆</button>
      <button onClick={() => setShowSpin(true)} className="fab"
        style={{ position:"fixed",bottom:104,left:22,zIndex:7000,background:"linear-gradient(135deg,#F6AD55,#DD6B20)",borderRadius:"50%",width:52,height:52,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 20px rgba(246,173,85,.45)" }}>🎰</button>

      {/* GROWTH COMPONENTS */}
      {showPushBanner && <PushNotificationBanner D={D} onDismiss={() => setShowPushBanner(false)} />}
      {!showPWABanner && <PWAInstallBanner D={D} onDismiss={() => setShowPWABanner(true)} />}
      <LiveChatButton />
      {cookieConsent === null && <CookieConsent D={D} onAccept={() => setCookieConsent("all")} onDecline={() => setCookieConsent("essential")} />}

      <button onClick={() => setShowNewsletter(true)} className="fab"
        style={{ position:"fixed",bottom:36,right:22,zIndex:7000,background:"#1a202c",borderRadius:"50%",width:52,height:52,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 20px rgba(0,0,0,.25)" }}>🔔</button>

      {/* MISSING CASHBACK MODAL */}
      {showMissingCashback && <MissingCashbackModal D={D} user={user} onClose={() => setShowMissingCashback(false)} submitRequest={submitMissingCashback} showToast={showToast} missingRequests={missingRequests} />}

            {/* FLASH BAR */}
      <div style={{ background:"linear-gradient(90deg,#1a202c,#2d3748)",padding:"8px 5%",display:"flex",alignItems:"center",justifyContent:"center",gap:14,flexWrap:"wrap" }}>
        <span style={{ color:"#FC8181",fontWeight:800,fontSize:12,animation:"blink 1.5s infinite" }}>{T("flashSale")}</span>
        {[flashTime.h,flashTime.m,flashTime.s].map((v,i) => (
          <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:3 }}>
            <span style={{ background:"#FF5722",color:"#fff",fontWeight:900,fontSize:13,padding:"2px 8px",borderRadius:7,minWidth:32,textAlign:"center" }}>{v}</span>
            {i<2 && <span style={{ color:"#FF5722",fontWeight:900 }}>:</span>}
          </span>
        ))}
        <span style={{ color:"#68D391",fontSize:11,fontWeight:700 }}>{T("extraOff")}</span>
      </div>

      {/* NAVBAR */}
      <nav style={{ background:D.nav,position:"sticky",top:0,zIndex:500,boxShadow:`0 2px 16px rgba(0,0,0,${dark?.15:.08})`,padding:"0 4%",display:"flex",alignItems:"center",justifyContent:"space-between",height:64,transition:"background .3s",gap:12 }}>
        <div onClick={() => setPage("home")} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",flexShrink:0 }}>
          <div style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>💸</div>
          <span style={{ fontSize:20,fontWeight:900,letterSpacing:-.5 }}>Save<span style={{ color:"#FF5722" }}>Karo</span></span>
        </div>

        <div className="dnav" style={{ display:"flex",alignItems:"center",gap:18,flex:1,justifyContent:"center" }}>
          {[["home"],["deals"],["coupons"],["stores"],["wishlist"],["tracker"]].map(([p]) => (
            <button key={p} onClick={() => setPage(p)} className={`nl2${page===p?" a":""}`} style={{ background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:13,color:page===p?"#FF5722":D.sub,padding:"4px 0",fontFamily:"inherit",position:"relative",whiteSpace:"nowrap" }}>
              {p==="wishlist" ? `❤️ ${T("wishlist")}` : p==="tracker" ? `💰 ${T("tracker")}` : T(p)}
              {p==="wishlist" && wishlist.length>0 && <span style={{ position:"absolute",top:-6,right:-8,background:"#FF5722",color:"#fff",fontSize:9,fontWeight:900,borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center" }}>{wishlist.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ display:"flex",gap:8,alignItems:"center",flexShrink:0 }}>
          <div className="msrch" style={{ position:"relative",display:"flex",alignItems:"center" }}>
            <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#999",pointerEvents:"none",zIndex:1 }}>🔍</span>
            <input value={search} onChange={e => { setSearch(e.target.value); if(e.target.value) setPage("deals"); }} onKeyDown={e => e.key==="Enter" && setPage("deals")} placeholder={T("searchPlaceholder")}
              style={{ padding:"8px 38px 8px 30px",borderRadius:10,border:`1.5px solid ${D.inputBorder}`,fontSize:13,width:180,outline:"none",background:D.input,fontFamily:"inherit",color:D.text }} />
            <button onClick={() => search.trim() && setPage("deals")} style={{ position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"linear-gradient(135deg,#FF5722,#FF9800)",border:"none",borderRadius:6,padding:"4px 8px",cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700,fontFamily:"inherit" }}>Go</button>
          </div>
          <button onClick={() => setDark(d=>!d)} style={{ background:dark?"#2d3148":"#F7F8FC",border:`1px solid ${D.inputBorder}`,borderRadius:9,padding:"7px 10px",cursor:"pointer",fontSize:14,transition:"background .3s" }}>{dark?"☀️":"🌙"}</button>
          <button onClick={() => setLang(l=>l==="en"?"hi":"en")} style={{ background:"linear-gradient(135deg,#6C63FF,#4A90E2)",color:"#fff",border:"none",borderRadius:9,padding:"7px 11px",cursor:"pointer",fontWeight:800,fontSize:11,fontFamily:"inherit" }}>{lang==="en"?"हिं":"EN"}</button>

          {/* Auth button / profile */}
          <div style={{ position:"relative" }}>
            {user ? (
              <button onClick={() => setShowProfile(p=>!p)} style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#FF5722,#FF9800)",border:"none",cursor:"pointer",color:"#fff",fontWeight:900,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {user.avatar}
              </button>
            ) : (
              <button onClick={() => setShowLogin(true)} style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit" }}>{T("login")}</button>
            )}
            {showProfile && user && <ProfileDropdown user={user} D={D} onLogout={() => { logout(); setShowProfile(false); showToast("Signed out"); }} onNavigate={(p) => { setPage(p); setShowProfile(false); }} onClose={() => setShowProfile(false)} />}
          </div>
          <button className="hmb" onClick={() => setMobileMenuOpen(o=>!o)} style={{ background:"none",border:`1px solid ${D.inputBorder}`,borderRadius:8,padding:"6px 9px",cursor:"pointer",fontSize:18,color:D.text }}>{mobileMenuOpen?"✕":"☰"}</button>
        </div>
      </nav>


      {/* PAGES */}
      {isLoading ? (
        <div style={{ padding:"32px 6%" }}><SkeletonGrid count={8} /></div>
      ) : page==="home"       ? <HomePage D={D} dark={dark} lang={lang} T={T} bannerIdx={bannerIdx} setBannerIdx={setBannerIdx} onShop={handleShop} onNavigate={setPage} stores={STORES} wishlist={wishlist} onWishlist={toggleWishlist} onCompare={setShowCompare} onReview={setShowReview} budgetMax={budgetMax} setBudgetMax={setBudgetMax} onReferral={handleReferral} linkCopied={linkCopied} creditOffers={CREDIT_OFFERS} />
      : page==="deals"      ? <DealsPage D={D} dark={dark} lang={lang} T={T} products={filtered} categories={CATEGORIES} activeCat={activeCat} setActiveCat={setActiveCat} onShop={handleShop} search={search} setSearch={setSearch} wishlist={wishlist} onWishlist={toggleWishlist} onCompare={setShowCompare} onReview={setShowReview} budgetMax={budgetMax} setBudgetMax={setBudgetMax} sortBy={sortBy} setSortBy={setSortBy} />
      : page==="coupons"    ? <CouponsPage D={D} coupons={COUPONS} onCopy={handleCopy} copied={copied} onShop={handleShop} />
      : page==="stores"     ? <StoresPage D={D} stores={STORES} onShop={handleShop} />
      : page==="wishlist"   ? <WishlistPage D={D} wishlist={wishlist} onShop={handleShop} onWishlist={toggleWishlist} onCompare={setShowCompare} onReview={setShowReview} onNavigate={setPage} />
      : page==="tracker"    ? <TrackerPage D={D} T={T} user={user} onLogin={() => setShowLogin(true)} purchases={purchases} loadingPurchases={loadingPurchases} deletePurchase={deletePurchase} totalSpent={totalSpent} totalEarned={totalEarned} totalPending={totalPending} onRaiseMissing={() => setShowMissingCashback(true)} missingRequests={missingRequests} />
      : page==="howItWorks" ? <HowItWorksPage D={D} T={T} />
      : page==="legal"      ? <LegalPage D={D} />
      : page==="blog"       ? <BlogPage D={D} dark={dark} onNavigate={setPage} />
      : page==="partners"   ? <NotFoundPage D={D} onNavigate={setPage} />
      : <NotFoundPage D={D} onNavigate={setPage} />
      }

      {/* RECENTLY VIEWED */}
      {recentlyViewed.length > 0 && !["tracker","howItWorks","legal"].includes(page) && (
        <div style={{ padding:"28px 6% 16px",background:D.card,borderTop:`1px solid ${D.border}`,transition:"background .3s" }}>
          <h3 style={{ fontSize:16,fontWeight:800,marginBottom:14 }}>{T("recentlyViewed")}</h3>
          <div style={{ display:"flex",gap:12,overflowX:"auto",paddingBottom:6 }}>
            {recentlyViewed.map(p => (
              <div key={p.id} className="ch" onClick={() => handleShop(p.slug, p.store, p)} style={{ minWidth:140,flexShrink:0,background:D.bg,borderRadius:12,overflow:"hidden",cursor:"pointer",border:`1px solid ${D.border}` }}>
                <img src={p.image} alt={p.title} style={{ width:"100%",height:86,objectFit:"cover" }} />
                <div style={{ padding:"8px 10px" }}>
                  <div style={{ fontSize:11,fontWeight:700,lineHeight:1.35,marginBottom:3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{p.title}</div>
                  <div style={{ fontSize:12,fontWeight:900,color:"#FF5722" }}>{fmt(p.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background:"#1a202c",color:"#a0aec0",padding:"44px 6% 24px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:28,marginBottom:32 }}>
          <div style={{ maxWidth:240 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
              <div style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>💸</div>
              <span style={{ fontSize:18,fontWeight:900,color:"#fff" }}>Save<span style={{ color:"#FF5722" }}>Karo</span></span>
            </div>
            <p style={{ fontSize:12,lineHeight:1.7,marginBottom:12 }}>India's smartest cashback & deals platform.</p>
            <div style={{ display:"flex",gap:8 }}>
              <a href={SITE.whatsappGroup} target="_blank" rel="noreferrer" style={{ background:"#25D36622",color:"#25D366",border:"1px solid #25D36644",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,textDecoration:"none" }}>💬 WhatsApp Group</a>
              <a href={SITE.instagram} target="_blank" rel="noreferrer" style={{ background:"#E1306C22",color:"#E1306C",border:"1px solid #E1306C44",borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,textDecoration:"none" }}>📸 Instagram</a>
            </div>
          </div>
          {[
            { title:"Quick Links", type:"page", links:[["Home","home"],["Deals","deals"],["Coupons","coupons"],["Stores","stores"],["My Cashback","tracker"],["How It Works","howItWorks"],["Legal","legal"],["Blog","blog"],["Partner Program","partners"]] },
            { title:"Top Stores",  type:"store", links:[["Amazon","go-amazon"],["Flipkart","go-flipkart"],["Myntra","go-myntra"],["Nykaa","go-nykaa"],["Ajio","go-ajio"]] },
            { title:"Contact",     type:"url",  links:[[`📧 ${SITE.email}`,`mailto:${SITE.email}`],["📱 WhatsApp",SITE.whatsapp],["📸 Instagram",SITE.instagram]] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ color:"#fff",fontWeight:700,fontSize:13,marginBottom:12 }}>{col.title}</h4>
              {col.links.map(([label,target]) => (
                <div key={label} onClick={() => col.type==="page"?setPage(target):col.type==="store"?goTo(target,label,showToast):window.open(target,"_blank")}
                  style={{ fontSize:12,marginBottom:9,color:"#a0aec0",cursor:"pointer",transition:"color .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#FF5722"} onMouseLeave={e=>e.currentTarget.style.color="#a0aec0"}>
                  {label}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid #2d3748",paddingTop:18,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,fontSize:11,color:"#718096" }}>
          <span>© 2026 SaveKaro. All rights reserved.</span>
          <span>Affiliate Disclosure: We earn a commission on purchases via our links — at no extra cost to you.</span>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}

/* ══════  WRITE REVIEW  ══════ */
function WriteReview({ D, product, onSubmit }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  return (
    <div style={{ background:D.bg,borderRadius:12,padding:"14px",marginBottom:14,border:`1px solid ${D.border}` }}>
      <div style={{ fontWeight:700,fontSize:13,marginBottom:10 }}>✍️ Write a Review</div>
      <div style={{ display:"flex",gap:4,marginBottom:10 }}>
        {[1,2,3,4,5].map(s => <span key={s} onClick={() => setStars(s)} style={{ fontSize:22,cursor:"pointer",color:s<=stars?"#F6AD55":"#CBD5E0",transition:"color .1s" }}>★</span>)}
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${D.inputBorder}`,fontSize:13,marginBottom:8,outline:"none",background:D.input,color:D.text,fontFamily:"inherit" }} />
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your experience…" rows={2} style={{ width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${D.inputBorder}`,fontSize:13,marginBottom:10,outline:"none",background:D.input,color:D.text,fontFamily:"inherit",resize:"none" }} />
      <button onClick={() => { if(stars&&text&&name) onSubmit({stars,text,name}); }} disabled={!stars||!text||!name}
        style={{ width:"100%",padding:"9px",borderRadius:9,border:"none",background:stars&&text&&name?"linear-gradient(135deg,#FF5722,#FF9800)":"#a0aec0",color:"#fff",fontWeight:700,fontSize:13,cursor:stars&&text&&name?"pointer":"not-allowed",fontFamily:"inherit" }}>
        Submit Review (+20 pts)
      </button>
    </div>
  );
}

/* ══════  HOME PAGE  ══════ */
function HomePage({ D, dark, lang, T, bannerIdx, setBannerIdx, onShop, onNavigate, stores, wishlist, onWishlist, onCompare, onReview, budgetMax, setBudgetMax, onReferral, linkCopied, creditOffers }) {
  const b = BANNERS[bannerIdx];
  const topDeals = PRODUCTS.filter(p => p.topDeal);
  return (
    <div>
      <div style={{ position:"relative" }}>
        <div key={bannerIdx} style={{ background:b.gradient,padding:"60px 6% 76px",animation:"fadeUp .5s ease" }}>
          <div style={{ maxWidth:640 }}>
            <span style={{ background:"rgba(255,255,255,.2)",color:"#fff",fontSize:11,fontWeight:800,padding:"5px 14px",borderRadius:20,letterSpacing:1.5,display:"inline-block",marginBottom:14 }}>{b.badge} • {b.store}</span>
            <h1 style={{ fontSize:"clamp(26px,4vw,50px)",fontWeight:900,color:"#fff",lineHeight:1.15,marginBottom:12 }}>{b.title}</h1>
            <p style={{ color:"rgba(255,255,255,.88)",fontSize:17,marginBottom:28,fontWeight:500 }}>{b.subtitle}</p>
            <button onClick={() => onShop(b.slug,b.store)} style={{ background:"#fff",border:"none",borderRadius:12,padding:"13px 32px",fontWeight:800,cursor:"pointer",fontSize:15,fontFamily:"inherit",color:"#FF5722",boxShadow:"0 8px 28px rgba(0,0,0,.2)" }}>{b.cta} →</button>
          </div>
        </div>
        <div style={{ position:"absolute",bottom:18,left:"6%",display:"flex",gap:7 }}>
          {BANNERS.map((_,i) => <div key={i} onClick={() => setBannerIdx(i)} style={{ width:i===bannerIdx?26:7,height:7,borderRadius:4,cursor:"pointer",transition:"all .3s",background:i===bannerIdx?"#fff":"rgba(255,255,255,.4)" }} />)}
        </div>
      </div>
      <div style={{ background:D.card,padding:"18px 6%",display:"flex",justifyContent:"center",gap:"6%",flexWrap:"wrap",boxShadow:"0 4px 20px rgba(0,0,0,.06)" }}>
        {[["50+",T("partnerStores")],["₹2 Cr+",T("cashbackPaid")],["5 Lakh+",T("happyUsers")],["100%",T("free")]].map(([v,l]) => <div key={l} style={{ textAlign:"center" }}><div style={{ fontSize:22,fontWeight:900,color:"#FF5722" }}>{v}</div><div style={{ fontSize:11,color:D.sub,fontWeight:600 }}>{l}</div></div>)}
      </div>
      <div style={{ padding:"28px 6% 0" }}>
        <div style={{ background:D.card,borderRadius:16,padding:"18px 22px",boxShadow:`0 3px 14px rgba(0,0,0,${dark?.12:.07})`,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap" }}>
          <span style={{ fontWeight:700,fontSize:14,whiteSpace:"nowrap" }}>🎯 {T("budget")}: up to <span style={{ color:"#FF5722" }}>{fmt(budgetMax)}</span></span>
          <div style={{ flex:1,minWidth:160 }}><input type="range" min={500} max={80000} step={500} value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} /></div>
          <button onClick={() => onNavigate("deals")} style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"inherit" }}>{T("findDeals")}</button>
        </div>
      </div>
      <div style={{ padding:"32px 6% 0" }}>
        <SH D={D} title={T("topStores")} sub={lang==="hi"?"किसी भी स्टोर पर क्लिक करें और कैशबैक कमाएं":"Click any store to earn cashback"} cta={T("viewAll")} onCta={() => onNavigate("stores")} />
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(108px,1fr))",gap:12,marginTop:16 }}>
          {stores.map(s => <div key={s.name} className="ch" onClick={() => onShop(s.slug,s.name)} style={{ background:D.card,borderRadius:13,padding:"14px 8px",textAlign:"center",cursor:"pointer",boxShadow:`0 2px 12px rgba(0,0,0,${dark?.12:.07})`,border:`1px solid ${D.border}` }}><div style={{ fontSize:26,marginBottom:7 }}>{s.icon}</div><div style={{ fontWeight:700,fontSize:12,marginBottom:3 }}>{s.name}</div><div style={{ fontSize:10,color:s.color,fontWeight:700,background:`${s.color}22`,padding:"2px 7px",borderRadius:18,display:"inline-block" }}>{s.cashback}</div></div>)}
        </div>
      </div>
      <FeaturedDealOfDay D={D} dark={dark} onShop={onShop} />
      <div style={{ padding:"32px 6%" }}>
        <SH D={D} title={T("topDeals")} sub={lang==="hi"?"हर सोमवार अपडेट होती हैं बेहतरीन डील्स":"Hand-picked best deals — updated every Monday"} cta={T("viewAll")} onCta={() => onNavigate("deals")} />
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:16,marginTop:16 }}>
          {topDeals.map(p => <PC key={p.id} p={p} D={D} dark={dark} T={T} onShop={onShop} wishlist={wishlist} onWishlist={onWishlist} onCompare={onCompare} onReview={onReview} featured />)}
        </div>
      </div>
      <div style={{ margin:"0 6% 32px",background:"linear-gradient(135deg,#6C63FF,#4A90E2)",borderRadius:20,padding:"28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
        <div><h3 style={{ color:"#fff",fontSize:20,fontWeight:900,marginBottom:6 }}>{T("referEarn")}</h3><p style={{ color:"rgba(255,255,255,.85)",fontSize:13 }}>{T("referDesc")}</p></div>
        <button onClick={onReferral} style={{ background:linkCopied?"#48BB78":"#fff",color:linkCopied?"#fff":"#6C63FF",border:"none",borderRadius:12,padding:"12px 24px",fontWeight:800,cursor:"pointer",fontSize:13,fontFamily:"inherit",flexShrink:0 }}>{linkCopied?T("linkCopied"):T("copyReferral")}</button>
      </div>
      {/* ══ CREDIT CARD OFFERS SECTION ══ */}
      {creditOffers && creditOffers.length > 0 && (
        <div style={{ padding:"32px 6%",background:D.bg }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10 }}>
            <div>
              <h2 style={{ fontSize:21,fontWeight:800,marginBottom:3 }}>💳 Credit Card Offers</h2>
              <p style={{ color:D.sub,fontSize:13 }}>Apply & earn rewards on every spend</p>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16 }}>
            {creditOffers.map((card, i) => (
              <div key={i} className="ch" style={{ borderRadius:18,overflow:"hidden",boxShadow:"0 8px 28px rgba(0,0,0,.18)",position:"relative" }}>
                {/* Card background */}
                <div style={{ background:`linear-gradient(135deg,${card.color},${i===0?"#334155":"#1e3a5f"})`,padding:"24px 22px 20px" }}>
                  {/* Badge */}
                  <span style={{ background:"rgba(255,87,34,.9)",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:12,letterSpacing:.5 }}>{card.badge}</span>
                  {/* Card chip design */}
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,marginBottom:20 }}>
                    <span style={{ fontSize:36 }}>{card.icon}</span>
                    <div style={{ width:40,height:30,background:"linear-gradient(135deg,#FFD700,#FFA500)",borderRadius:5,opacity:.8 }} />
                  </div>
                  {/* Card number placeholder */}
                  <div style={{ display:"flex",gap:8,marginBottom:14 }}>
                    {["●●●●","●●●●","●●●●","1234"].map((s,j) => (
                      <span key={j} style={{ color:"rgba(255,255,255,.7)",fontSize:13,letterSpacing:1 }}>{s}</span>
                    ))}
                  </div>
                  <div>
                    <div style={{ color:"#fff",fontWeight:800,fontSize:16 }}>{card.name}</div>
                    <div style={{ color:"rgba(255,255,255,.7)",fontSize:12,marginTop:2 }}>{card.subtitle}</div>
                  </div>
                </div>
                {/* Apply button */}
                <div style={{ background:D.card,padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontSize:12,color:D.sub,fontWeight:600 }}>Zero annual fee • Instant approval</span>
                  <button onClick={() => window.open(card.link,"_blank","noopener,noreferrer")}
                    style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontWeight:800,cursor:"pointer",fontSize:13,fontFamily:"inherit",whiteSpace:"nowrap" }}>
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ CREDIT CARD OFFERS SECTION ══ */}
      {creditOffers && creditOffers.length > 0 && (
        <div style={{ padding:"32px 6%",background:D.bg }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10 }}>
            <div>
              <h2 style={{ fontSize:21,fontWeight:800,marginBottom:3 }}>💳 Credit Card Offers</h2>
              <p style={{ color:D.sub,fontSize:13 }}>Apply & earn rewards on every spend</p>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
            {creditOffers.map((card, i) => (
              <div key={i} className="ch" style={{ borderRadius:18,overflow:"hidden",boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>
                <div style={{ background:`linear-gradient(135deg,${card.color},${i===0?"#334155":"#1e3a5f"})`,padding:"24px 22px 20px" }}>
                  <span style={{ background:"rgba(255,87,34,.9)",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:12,letterSpacing:.5 }}>{card.badge}</span>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,marginBottom:20 }}>
                    <span style={{ fontSize:36 }}>{card.icon}</span>
                    <div style={{ width:40,height:30,background:"linear-gradient(135deg,#FFD700,#FFA500)",borderRadius:5,opacity:.8 }} />
                  </div>
                  <div style={{ display:"flex",gap:8,marginBottom:14 }}>
                    {["●●●●","●●●●","●●●●","****"].map((s,j) => (
                      <span key={j} style={{ color:"rgba(255,255,255,.6)",fontSize:13,letterSpacing:1 }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ color:"#fff",fontWeight:800,fontSize:16 }}>{card.name}</div>
                  <div style={{ color:"rgba(255,255,255,.7)",fontSize:12,marginTop:2 }}>{card.subtitle}</div>
                </div>
                <div style={{ background:D.card,padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <span style={{ fontSize:12,color:D.sub,fontWeight:600 }}>Zero fee • Instant approval</span>
                  <button onClick={() => window.open(card.link,"_blank","noopener,noreferrer")}
                    style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontWeight:800,cursor:"pointer",fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap" }}>
                    Apply Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ CREDIT CARD OFFERS SECTION ══ */}
      {creditOffers && creditOffers.length > 0 && (
        <div style={{ padding:"32px 6%",background:D.bg }}>
          <h2 style={{ fontSize:21,fontWeight:800,marginBottom:6 }}>💳 Credit Card Offers</h2>
          <p style={{ color:D.sub,fontSize:13,marginBottom:20 }}>Apply & earn rewards on every spend</p>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
            {creditOffers.map((card, i) => (
              <div key={i} className="ch" style={{ borderRadius:18,overflow:"hidden",boxShadow:"0 8px 28px rgba(0,0,0,.18)" }}>
                <div style={{ background:`linear-gradient(135deg,${card.color},${i===0?"#334155":"#1e3a5f"})`,padding:"24px 22px 20px" }}>
                  <span style={{ background:"rgba(255,87,34,.9)",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:12 }}>{card.badge}</span>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,marginBottom:20 }}>
                    <span style={{ fontSize:36 }}>{card.icon}</span>
                    <div style={{ width:40,height:30,background:"linear-gradient(135deg,#FFD700,#FFA500)",borderRadius:5,opacity:.8 }} />
                  </div>
                  <div style={{ display:"flex",gap:8,marginBottom:12 }}>
                    {["●●●●","●●●●","●●●●","****"].map((s,j) => <span key={j} style={{ color:"rgba(255,255,255,.6)",fontSize:13,letterSpacing:1 }}>{s}</span>)}
                  </div>
                  <div style={{ color:"#fff",fontWeight:800,fontSize:16 }}>{card.name}</div>
                  <div style={{ color:"rgba(255,255,255,.7)",fontSize:12,marginTop:2 }}>{card.subtitle}</div>
                </div>
                <div style={{ background:D.card,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <span style={{ fontSize:12,color:D.sub,fontWeight:600 }}>Zero fee • Instant approval</span>
                  <button onClick={() => window.open(card.link,"_blank","noopener,noreferrer")} style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontWeight:800,cursor:"pointer",fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap" }}>Apply Now →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

            <div style={{ background:D.card,padding:"48px 6%",textAlign:"center" }}>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>{T("howSaveKaroWorks")}</h2>
        <p style={{ color:D.sub,marginBottom:40,fontSize:14 }}>{T("howItWorksSubtitle")}</p>
        <div style={{ display:"flex",justifyContent:"center",flexWrap:"wrap",gap:0 }}>
          {[
            {n:"01",icon:"🛍️",title:"Find a Deal",    desc:"Browse 50+ top stores with real cashback rates"},
            {n:"02",icon:"🖱️",title:"Click & Shop",   desc:"Go to store via our link — shop normally"},
            {n:"03",icon:"💰",title:"Claim & Get Paid",desc:"Submit order details → get cashback in 30 days"},
          ].map((s,i) => (
            <div key={s.n} style={{ maxWidth:220,padding:"0 18px",position:"relative" }}>
              {i<2&&<div style={{ position:"absolute",top:28,right:-14,width:28,height:2,background:"linear-gradient(90deg,#FF5722,#FF9800)" }}/>}
              <div style={{ width:56,height:56,background:"linear-gradient(135deg,#FF5722,#FF9800)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px",boxShadow:"0 8px 20px rgba(255,87,34,.3)" }}>{s.icon}</div>
              <div style={{ fontSize:10,color:"#FF5722",fontWeight:800,letterSpacing:1,marginBottom:4 }}>STEP {s.n}</div>
              <h3 style={{ fontWeight:800,fontSize:15,marginBottom:6 }}>{s.title}</h3>
              <p style={{ color:D.sub,fontSize:12,lineHeight:1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",padding:"44px 6%",textAlign:"center" }}>
        <h2 style={{ color:"#fff",fontSize:26,fontWeight:900,marginBottom:10 }}>{T("readyToSave")}</h2>
        <p style={{ color:"rgba(255,255,255,.88)",fontSize:15,marginBottom:24 }}>Click any deal → shop normally → email us your order → get cashback within 30 days!</p>
        <button onClick={() => onNavigate("deals")} style={{ background:"#fff",color:"#FF5722",border:"none",borderRadius:12,padding:"13px 32px",fontWeight:800,cursor:"pointer",fontSize:15,fontFamily:"inherit" }}>{T("exploreDeals")}</button>
      </div>
    </div>
  );
}

/* ══════  DEALS PAGE  ══════ */
function DealsPage({ D, dark, lang, T, products, categories, activeCat, setActiveCat, onShop, search, setSearch, wishlist, onWishlist, onCompare, onReview, budgetMax, setBudgetMax, sortBy, setSortBy }) {
  return (
    <div style={{ padding:"28px 6%" }}>
      <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16 }}>
        <div><h1 style={{ fontSize:22,fontWeight:800,marginBottom:3 }}>🔥 {T("deals")}</h1><p style={{ color:D.sub,fontSize:13 }}>{T("dealsFound", products.length)}</p></div>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#999" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T("searchPlaceholder")} style={{ padding:"10px 14px 10px 32px",borderRadius:11,border:`1.5px solid ${D.inputBorder}`,fontSize:13,width:230,outline:"none",background:D.input,fontFamily:"inherit",color:D.text }} />
        </div>
      </div>
      <div style={{ background:D.card,borderRadius:14,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
        <span style={{ fontWeight:700,fontSize:13 }}>🎯 {fmt(budgetMax)}</span>
        <div style={{ flex:1,minWidth:130 }}><input type="range" min={500} max={80000} step={500} value={budgetMax} onChange={e => setBudgetMax(Number(e.target.value))} /></div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding:"7px 12px",borderRadius:9,border:`1.5px solid ${D.inputBorder}`,fontSize:13,background:D.input,color:D.text,outline:"none",cursor:"pointer" }}>
          {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{lang==="hi"?s.labelHi:s.label}</option>)}
        </select>
        <button onClick={() => setBudgetMax(80000)} style={{ background:"none",border:`1px solid ${D.border}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:600,color:D.sub,fontFamily:"inherit" }}>{T("reset")}</button>
      </div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:22 }}>
        {categories.map(c => <button key={c.id} onClick={() => setActiveCat(c.id)} style={{ padding:"7px 15px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,whiteSpace:"nowrap",fontFamily:"inherit",background:activeCat===c.id?"linear-gradient(135deg,#FF5722,#FF9800)":D.card,color:activeCat===c.id?"#fff":D.sub,boxShadow:activeCat===c.id?"0 4px 14px rgba(255,87,34,.35)":`0 2px 8px rgba(0,0,0,${dark?.12:.07})` }}>{c.icon} {lang==="hi"?c.labelHi:c.label}</button>)}
      </div>
      {products.length===0 ? <div style={{ textAlign:"center",padding:"70px 0",color:D.sub }}><div style={{ fontSize:52,marginBottom:10 }}>🔍</div><p style={{ fontWeight:700,fontSize:17 }}>{T("noDeals")}</p><p style={{ fontSize:13,marginTop:7 }}>{T("adjustFilters")}</p></div>
        : <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:16 }}>{products.map(p => <PC key={p.id} p={p} D={D} dark={dark} T={T} onShop={onShop} wishlist={wishlist} onWishlist={onWishlist} onCompare={onCompare} onReview={onReview} />)}</div>}
    </div>
  );
}

/* ══════  COUPONS PAGE  ══════ */
function CouponsPage({ D, coupons, onCopy, copied, onShop }) {
  return (
    <div style={{ padding:"28px 6%" }}>
      <h1 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>🎟️ Latest Coupon Codes</h1>
      <p style={{ color:D.sub,fontSize:13,marginBottom:24 }}>Copy code → click "Shop Now" → paste at checkout</p>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16 }}>
        {coupons.map(c => (
          <div key={c.id} className="ch" style={{ background:D.card,borderRadius:15,overflow:"hidden",boxShadow:"0 3px 14px rgba(0,0,0,.08)",border:`1px solid ${D.border}` }}>
            <div style={{ background:c.storeBg,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div><div style={{ fontSize:10,color:"#718096",fontWeight:600 }}>STORE</div><div style={{ fontWeight:800,fontSize:16,color:c.storeColor }}>{c.store}</div></div>
              <div style={{ background:"#fff",border:`2px dashed ${c.storeColor}`,borderRadius:9,padding:"7px 14px",fontWeight:900,fontSize:14,color:c.storeColor,letterSpacing:1.5 }}>{c.code}</div>
            </div>
            <div style={{ padding:"12px 18px 16px" }}>
              <p style={{ fontSize:13,color:D.sub,marginBottom:8,lineHeight:1.6 }}>🎁 {c.desc}</p>
              <div style={{ fontSize:11,color:D.sub,marginBottom:12 }}>⏰ Expires: {c.expiry}</div>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={() => onCopy(c.code,c.id,c.store)} style={{ flex:1,padding:"9px",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",transition:"all .2s",background:copied===c.id?"#48BB78":D.input,color:copied===c.id?"#fff":D.sub,border:`1.5px solid ${copied===c.id?"#48BB78":D.inputBorder}` }}>{copied===c.id?"✅ Copied!":"📋 Copy Code"}</button>
                <button onClick={() => onShop(c.slug,c.store)} style={{ flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",background:`linear-gradient(135deg,${c.storeColor},${c.storeColor}cc)`,color:"#fff" }}>Shop Now →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════  STORES PAGE  ══════ */
function StoresPage({ D, stores, onShop }) {
  return (
    <div style={{ padding:"28px 6%" }}>
      <h1 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>🏪 All Partner Stores</h1>
      <p style={{ color:D.sub,fontSize:13,marginBottom:24 }}>Shop through any store below to earn cashback</p>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:16 }}>
        {stores.map(s => <div key={s.name} className="ch" onClick={() => onShop(s.slug,s.name)} style={{ background:D.card,borderRadius:14,padding:"22px 16px",textAlign:"center",cursor:"pointer",boxShadow:"0 3px 14px rgba(0,0,0,.08)",border:`1px solid ${D.border}` }}><div style={{ fontSize:38,marginBottom:10 }}>{s.icon}</div><h3 style={{ fontWeight:800,fontSize:15,marginBottom:6 }}>{s.name}</h3><div style={{ background:`${s.color}22`,color:s.color,padding:"5px 12px",borderRadius:16,fontSize:12,fontWeight:800,display:"inline-block",marginBottom:12 }}>{s.cashback}</div><div style={{ width:"100%",padding:"8px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${s.color},${s.color}bb)`,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>Shop & Earn 💸</div></div>)}
      </div>
    </div>
  );
}

/* ══════  WISHLIST PAGE  ══════ */
function WishlistPage({ D, wishlist, onShop, onWishlist, onCompare, onReview, onNavigate }) {
  if (!wishlist.length) return <div style={{ textAlign:"center",padding:"80px 6%",color:D.sub }}><div style={{ fontSize:60,marginBottom:12 }}>❤️</div><h2 style={{ fontWeight:800,fontSize:20,color:D.text,marginBottom:6 }}>Your Wishlist is Empty</h2><p style={{ fontSize:14,marginBottom:22 }}>Save deals you love and come back anytime</p><button onClick={() => onNavigate("deals")} style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:12,padding:"12px 28px",fontWeight:800,cursor:"pointer",fontSize:14,fontFamily:"inherit" }}>Browse Deals →</button></div>;
  return <div style={{ padding:"28px 6%" }}><h1 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>❤️ My Wishlist</h1><p style={{ color:D.sub,fontSize:13,marginBottom:22 }}>{wishlist.length} saved deal{wishlist.length!==1?"s":""}</p><div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:16 }}>{wishlist.map(p => <PC key={p.id} p={p} D={D} onShop={onShop} wishlist={wishlist} onWishlist={onWishlist} onCompare={onCompare} onReview={onReview} />)}</div></div>;
}

/* ══════  TRACKER PAGE  ══════ */
function TrackerPage({ D, T, user, onLogin, purchases, loadingPurchases, deletePurchase, totalSpent, totalEarned, totalPending, onRaiseMissing, missingRequests }) {
  const statusColor = { pending:"#F6AD55", confirmed:"#63B3ED", paid:"#68D391" };

  // Not logged in — show login prompt
  if (!user) return (
    <div style={{ textAlign:"center",padding:"80px 6%",color:D.sub }}>
      <div style={{ fontSize:64,marginBottom:16 }}>🔐</div>
      <h2 style={{ fontWeight:900,fontSize:22,color:D.text,marginBottom:8 }}>Login to View Your Cashback</h2>
      <p style={{ fontSize:14,marginBottom:24,lineHeight:1.7 }}>
        Your cashback, purchases and earnings are saved to your account.<br/>
        Login or register free to track everything in one place.
      </p>
      <button onClick={onLogin} style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:12,padding:"13px 32px",fontWeight:800,cursor:"pointer",fontSize:15,fontFamily:"inherit" }}>
        Login / Register Free →
      </button>
    </div>
  );

  return (
    <div style={{ padding:"28px 6%" }}>
      <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,marginBottom:3 }}>{T("myTracker")}</h1>
          <p style={{ color:D.sub,fontSize:13 }}>Welcome, {user.name} • {T("trackAll")}</p>
        </div>
        <button onClick={onRaiseMissing} style={{ background:"linear-gradient(135deg,#FF5722,#FF9800)",color:"#fff",border:"none",borderRadius:11,padding:"10px 20px",fontWeight:800,cursor:"pointer",fontSize:13,fontFamily:"inherit",boxShadow:"0 4px 14px rgba(255,87,34,.3)" }}>
          💰 Claim Cashback
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:24 }}>
        {[
          ["🛒", T("totalSpent"),  fmt(totalSpent),  "#2874F0"],
          ["💰", T("totalEarned"), fmt(totalEarned), "#48BB78"],
          ["⏳", T("pending"),     fmt(totalPending), "#F6AD55"],
          ["🛍️", "Total Orders",  purchases.length,  "#6C63FF"],
        ].map(([icon,label,value,color]) => (
          <div key={label} style={{ background:D.card,borderRadius:13,padding:"18px",boxShadow:"0 3px 14px rgba(0,0,0,.07)",border:`1px solid ${D.border}` }}>
            <div style={{ fontSize:26,marginBottom:7 }}>{icon}</div>
            <div style={{ fontSize:20,fontWeight:900,color,marginBottom:3 }}>{value}</div>
            <div style={{ fontSize:11,color:D.sub,fontWeight:600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* How cashback works */}
      <div style={{ background:"linear-gradient(135deg,#FF572211,#FF980011)",border:"1.5px solid #FF572233",borderRadius:14,padding:"14px 18px",marginBottom:20,fontSize:13,lineHeight:1.9,color:D.text }}>
        <strong>💡 How cashback is tracked:</strong> Click any deal → shop on the store → cashback appears here as <span style={{ color:"#F6AD55",fontWeight:700 }}>Pending</span> within 24–72 hrs → becomes <span style={{ color:"#63B3ED",fontWeight:700 }}>Confirmed</span> after return window → then <span style={{ color:"#48BB78",fontWeight:700 }}>Paid</span> to your account.
      </div>

      {/* Purchases table */}
      {loadingPurchases ? (
        <div style={{ textAlign:"center",padding:"40px 0",color:D.sub }}>
          <div style={{ fontSize:32,marginBottom:10 }}>⏳</div>
          <p>Loading your purchases…</p>
        </div>
      ) : purchases.length === 0 ? (
        <div style={{ textAlign:"center",padding:"50px 0",color:D.sub }}>
          <div style={{ fontSize:52,marginBottom:12 }}>🛒</div>
          <p style={{ fontWeight:700,fontSize:16,marginBottom:8,color:D.text }}>No purchases yet</p>
          <p style={{ fontSize:13,marginBottom:6 }}>Click any deal on SaveKaro and complete your purchase.</p>
          <p style={{ fontSize:12 }}>Your cashback will appear here automatically within 24–72 hours.</p>
        </div>
      ) : (
        <div style={{ background:D.card,borderRadius:14,overflow:"hidden",boxShadow:"0 3px 14px rgba(0,0,0,.07)",border:`1px solid ${D.border}`,overflowX:"auto" }}>
          <table>
            <thead>
              <tr style={{ background:D.bg }}>
                {["Date","Store","Product","Paid","Cashback","Status",""].map(h => (
                  <th key={h} style={{ color:D.sub,fontWeight:700,fontSize:11,letterSpacing:.4,borderBottom:`1px solid ${D.border}`,padding:"11px 13px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} style={{ borderBottom:`1px solid ${D.border}` }}>
                  <td style={{ color:D.sub,fontSize:11 }}>{p.date}</td>
                  <td style={{ fontWeight:700,fontSize:12 }}>{p.platform}</td>
                  <td style={{ maxWidth:140,fontSize:12 }}>{p.product}</td>
                  <td style={{ fontWeight:700,fontSize:12 }}>{fmt(p.amount)}</td>
                  <td style={{ fontWeight:800,color:"#48BB78",fontSize:12 }}>+{fmt(p.cashback)}</td>
                  <td>
                    <span style={{ background:`${statusColor[p.status]||"#a0aec0"}22`,color:statusColor[p.status]||"#a0aec0",fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:10,textTransform:"capitalize" }}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => deletePurchase(p.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#FC8181",fontSize:15 }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Missing cashback requests */}
      {missingRequests?.length > 0 && (
        <div style={{ marginTop:24 }}>
          <h3 style={{ fontSize:15,fontWeight:800,marginBottom:14 }}>📋 My Cashback Claims</h3>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {missingRequests.map(r => (
              <div key={r.id} style={{ background:D.card,borderRadius:10,padding:"12px 16px",border:`1px solid ${D.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:700 }}>{r.store} — {r.orderId}</div>
                  <div style={{ fontSize:11,color:D.sub }}>{r.purchaseDate} • ₹{r.amount}</div>
                </div>
                <span style={{ background:r.status==="resolved"?"#48BB7822":r.status==="reviewing"?"#63B3ED22":"#F6AD5522",color:r.status==="resolved"?"#276749":r.status==="reviewing"?"#2C7A7B":"#B7791F",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:10,textTransform:"capitalize" }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════  HOW IT WORKS PAGE  ══════ */
function HowItWorksPage({ D, T }) {
  const steps = [
    { icon:"🔍", title:"Find a Deal",         desc:"Browse deals from 50+ top Indian stores — Amazon, Flipkart, Myntra, Nykaa, Ajio and more. All showing real cashback percentages." },
    { icon:"🖱️", title:"Click & Shop",        desc:"Click 'Shop Now' — you'll be taken to the store via our special link. Shop and pay as usual. Important: do NOT use Incognito mode." },
    { icon:"📋", title:"Claim Your Cashback", desc:"After purchasing, go to My Cashback → click 'Claim My Cashback' → fill your Order ID, store name and amount paid. Takes 30 seconds." },
    { icon:"✅", title:"We Verify Your Order","desc":"Our team verifies your order with the affiliate network within 7 working days. You'll get an email once verified." },
    { icon:"💰", title:"Get Paid via UPI",    desc:"Verified cashback is sent directly to your UPI ID within 30 days. Minimum payout is ₹100." },
  ];
  return (
    <div style={{ padding:"28px 6% 48px",maxWidth:780,margin:"0 auto" }}>
      <h1 style={{ fontSize:26,fontWeight:900,marginBottom:6,textAlign:"center" }}>❓ {T("howItWorks")}</h1>
      <p style={{ color:D.sub,fontSize:14,textAlign:"center",marginBottom:36,lineHeight:1.7 }}>{T("howItWorksSubtitle")}</p>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        {steps.map((s,i) => (
          <div key={i} style={{ background:D.card,borderRadius:14,padding:"20px 22px",display:"flex",gap:16,alignItems:"flex-start",border:`1px solid ${D.border}`,boxShadow:"0 3px 12px rgba(0,0,0,.07)" }}>
            <div style={{ width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#FF5722,#FF9800)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 4px 14px rgba(255,87,34,.3)" }}>{s.icon}</div>
            <div><div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}><span style={{ background:"#FF572222",color:"#FF5722",fontSize:10,fontWeight:900,padding:"2px 9px",borderRadius:10 }}>STEP {i+1}</span><h3 style={{ fontWeight:800,fontSize:15 }}>{s.title}</h3></div><p style={{ color:D.sub,fontSize:13,lineHeight:1.7 }}>{s.desc}</p></div>
          </div>
        ))}
      </div>
      <div style={{ background:D.card,border:"2px solid #FF572233",borderRadius:14,padding:"20px",marginTop:24 }}>
        <h3 style={{ fontWeight:800,fontSize:15,color:"#FF5722",marginBottom:10 }}>⚠️ Important Notes</h3>
        {["Always click our link before adding to cart — links clicked earlier may not be tracked.","Don't use Incognito mode or clear cookies before completing purchase.","Cancelled or returned orders will have cashback reversed.","Cashback rates may vary — always check the rate shown on SaveKaro before shopping."].map((t,i) => <div key={i} style={{ display:"flex",gap:9,marginBottom:7,fontSize:13,color:D.sub,lineHeight:1.6 }}><span>•</span><span>{t}</span></div>)}
      </div>
    </div>
  );
}

/* ══════  LEGAL PAGE  ══════ */
function LegalPage({ D }) {
  const [tab, setTab] = useState("privacy");
  const content = {
    privacy:[["Information We Collect","We collect your name, email address, WhatsApp number (when you subscribe to deal alerts), and anonymous usage data to improve our service."],["How We Use It","Your contact information is used only to send deal alerts and cashback updates you opted into. We never sell your personal data to third parties."],["Cookies","We use cookies to track affiliate referrals and analyze site traffic via Google Analytics. You can disable cookies in your browser settings, but this may affect cashback tracking."],["Third-Party Links","Our site contains affiliate links to third-party stores. We are not responsible for the privacy practices of those sites."],["Contact",`For privacy concerns, email us at ${SITE.email}`]],
    terms:[["Use of Site","SaveKaro is a free affiliate deals platform. You may browse and click our links for personal, non-commercial use only."],["Affiliate Relationship","We earn a commission when you purchase through our links. This comes from the retailer — not from you — and does not affect the price you pay."],["Cashback","Cashback amounts shown are estimates. Actual cashback may vary. SaveKaro is not responsible for missed cashback due to cookie issues or retailer policy changes."],["Accuracy","We strive to keep prices and offers accurate, but deals change frequently. Always verify the final price on the retailer's site."],["Limitation of Liability","SaveKaro is not liable for any loss or damage arising from use of our site or affiliated retailers."]],
    affiliate:[["What is an Affiliate Link?","An affiliate link is a special URL with a unique tracking code. When you click our link and purchase, the retailer pays SaveKaro a small commission."],["Does It Cost You More?","No. The price you pay is exactly the same. The commission comes from the retailer's marketing budget."],["Programs We Participate In","SaveKaro participates in Amazon Associates, Flipkart Affiliate, Myntra Affiliate, Nykaa Affiliate, Ajio Affiliate, and other Indian retailer programs."],["ASCI Compliance","In accordance with ASCI guidelines (India), we disclose that this site contains affiliate links and we may earn compensation when you click them."],["Editorial Independence","Our deal selection is based on genuine value to users. Affiliate relationships do not influence which deals we feature."]],
  };
  return (
    <div style={{ padding:"28px 6% 48px",maxWidth:760,margin:"0 auto" }}>
      <h1 style={{ fontSize:24,fontWeight:900,marginBottom:4 }}>📜 Legal</h1>
      <p style={{ color:D.sub,fontSize:13,marginBottom:24 }}>Last updated: March 2026</p>
      <div style={{ display:"flex",gap:8,marginBottom:24,flexWrap:"wrap" }}>
        {[["privacy","Privacy Policy"],["terms","Terms of Use"],["affiliate","Affiliate Disclosure"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 18px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",background:tab===id?"linear-gradient(135deg,#FF5722,#FF9800)":D.card,color:tab===id?"#fff":D.sub,boxShadow:tab===id?"0 4px 14px rgba(255,87,34,.3)":`0 2px 8px rgba(0,0,0,.07)` }}>{label}</button>
        ))}
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
        {content[tab].map(([heading,body],i) => (
          <div key={i} style={{ background:D.card,borderRadius:13,padding:"18px 20px",border:`1px solid ${D.border}` }}>
            <h3 style={{ fontWeight:800,fontSize:14,marginBottom:7 }}>{heading}</h3>
            <p style={{ fontSize:13,color:D.sub,lineHeight:1.75 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════  PRODUCT CARD  ══════ */
function PC({ p, D, dark, T, onShop, wishlist, onWishlist, onCompare, onReview, featured }) {
  const d = disc(p.mrp, p.price);
  const isWished = wishlist ? wishlist.some(w => w.id === p.id) : false;
  const isTrending = p.clicks >= TRENDING_THRESHOLD;
  const cashbackAmt = Math.round(p.price * p.cashbackPct / 100);
  const hasRibbon = !p.inStock || p.flashSale || isTrending;
  const ribbonBg = !p.inStock?"linear-gradient(90deg,#718096,#4a5568)":p.flashSale?"linear-gradient(90deg,#FF5722,#FF9800)":"linear-gradient(90deg,#805AD5,#6B46C1)";
  const ribbonText = !p.inStock?"📦 Out of Stock":p.flashSale?"⚡ FLASH SALE — Extra 5% OFF":`📈 TRENDING — ${(p.clicks/1000).toFixed(1)}K views`;

  // Fallback T if not passed (e.g. from WishlistPage without T prop)
  const tFn = T || ((k) => k);

  return (
    <div className="ch" style={{ background:D.card,borderRadius:15,overflow:"hidden",boxShadow:`0 3px 13px rgba(0,0,0,${dark?.14:.07})`,border:`2px solid ${featured?"#FF572244":D.border}`,position:"relative",opacity:p.inStock?1:.85 }}>
      {hasRibbon && <div style={{ position:"absolute",top:0,left:0,right:0,background:ribbonBg,color:"#fff",fontSize:10,fontWeight:800,textAlign:"center",padding:"4px",zIndex:2,letterSpacing:.4 }}>{ribbonText}</div>}
      <div style={{ position:"relative",cursor:p.inStock?"pointer":"default" }} onClick={() => p.inStock&&onShop(p.slug,p.store,p)}>
        <img src={p.image} alt={p.title} style={{ width:"100%",height:hasRibbon?165:175,objectFit:"cover",display:"block",marginTop:hasRibbon?24:0,filter:p.inStock?"none":"grayscale(40%)" }} />
        <span style={{ position:"absolute",top:10,left:10,background:p.badgeColor,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:18 }}>{p.badge}</span>
        <span style={{ position:"absolute",top:10,right:10,background:"rgba(0,0,0,.65)",color:"#fff",fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:18 }}>{d}% OFF</span>
      </div>
      <div style={{ padding:"12px 14px 14px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
          <span style={{ fontSize:10,color:p.storeColor,fontWeight:700,background:`${p.storeColor}22`,padding:"2px 7px",borderRadius:9 }}>{p.store}</span>
          <button onClick={() => onWishlist(p)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:17,transition:"transform .15s",color:isWished?"#FF5722":"#CBD5E0" }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.25)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>{isWished?"❤️":"🤍"}</button>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:4,cursor:"pointer" }} onClick={() => onReview(p)}>
          <div>{[1,2,3,4,5].map(s => <span key={s} style={{ color:s<=Math.round(p.rating)?"#F6AD55":"#CBD5E0",fontSize:11 }}>★</span>)}</div>
          <span style={{ fontSize:10,color:D.sub }}>{p.rating} ({p.reviews.toLocaleString()})</span>
          <span style={{ fontSize:10,color:"#FF5722",fontWeight:700 }}>→</span>
        </div>
        <ExpiryTimer hoursFromNow={p.expiresHours} D={D} />
        <h3 onClick={() => p.inStock&&onShop(p.slug,p.store,p)} style={{ fontWeight:700,fontSize:13,marginBottom:6,lineHeight:1.4,cursor:p.inStock?"pointer":"default",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{p.title}</h3>
        <div style={{ display:"flex",alignItems:"baseline",gap:6,marginBottom:7 }}>
          <span style={{ fontSize:16,fontWeight:900 }}>{fmt(p.price)}</span>
          <span style={{ fontSize:11,color:D.sub,textDecoration:"line-through" }}>{fmt(p.mrp)}</span>
        </div>
        <div style={{ background:dark?"#1e2130":"#FFF8F6",border:"1px dashed #FF5722",borderRadius:7,padding:"6px 10px",marginBottom:8,display:"flex",justifyContent:"space-between" }}>
          <span style={{ fontSize:11,color:"#FF5722",fontWeight:700 }}>💰 Earn {p.cashbackPct}% Cashback</span>
          <span style={{ fontSize:11,color:"#FF5722",fontWeight:800 }}>+{fmt(cashbackAmt)}</span>
        </div>
        <div style={{ display:"flex",gap:6,marginBottom:8 }}>
          {p.comparePrice && <button onClick={() => onCompare(p)} style={{ flex:1,padding:"6px",borderRadius:7,border:`1px solid ${D.border}`,background:D.input,color:D.sub,fontWeight:600,fontSize:10,cursor:"pointer",fontFamily:"inherit" }}>📊 Compare</button>}
          <ShareButtons product={p} D={D} />
        </div>
        <button onClick={() => p.inStock&&onShop(p.slug,p.store,p)} disabled={!p.inStock} style={{ width:"100%",padding:"10px",borderRadius:9,border:"none",background:p.inStock?"linear-gradient(135deg,#FF5722,#FF9800)":"#a0aec0",color:"#fff",fontWeight:700,fontSize:12,cursor:p.inStock?"pointer":"not-allowed",fontFamily:"inherit" }}>
          {p.inStock ? tFn("shopNow") : tFn("outOfStock")}
        </button>
      </div>
    </div>
  );
}


/* ══════  MISSING CASHBACK MODAL  ══════ */
function MissingCashbackModal({ D, user, onClose, submitRequest, showToast, missingRequests }) {
  const [step, setStep]             = useState("stores"); // stores | dates | form
  const [allClicks, setAllClicks]   = useState([]);       // all raw clicks last 30 days
  const [storeList, setStoreList]   = useState([]);       // unique stores
  const [selectedStore, setSelectedStore] = useState(null);
  const [datesForStore, setDatesForStore] = useState([]); // all dates user visited that store
  const [selectedDate, setSelectedDate]   = useState(null);
  const [form, setForm]             = useState({ orderId:"", amount:"", description:"" });
  const [loading, setLoading]       = useState(false);
  const [loadingClicks, setLoadingClicks] = useState(true);

  const storeIcons  = { Amazon:"🛒", Flipkart:"📦", Myntra:"👗", Nykaa:"💄", Ajio:"✨", Swiggy:"🍔", MakeMyTrip:"✈️", Meesho:"🛍️" };
  const storeColors = { Amazon:"#FF9900", Flipkart:"#2874F0", Myntra:"#FF3F6C", Nykaa:"#FC2779", Ajio:"#1B1B1B", Swiggy:"#FC8019", MakeMyTrip:"#E8272A", Meesho:"#9B0098" };

  // Autotrack time info per store (informational)
  const autotrackTime = { Amazon:"within 24h", Flipkart:"within 5m", Myntra:"within 36h", Nykaa:"within 5m", Ajio:"within 1h", Swiggy:"within 5m", MakeMyTrip:"within 1h", Meesho:"within 30m" };

  // Load clicks from last 30 days
  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      try {
        const { collection, query, where, orderBy, getDocs, getFirestore } = await import("firebase/firestore");
        const { app } = await import("./firebase.js");
        const db = getFirestore(app);
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const q = query(
          collection(db, "users", user.uid, "clicks"),
          where("timestamp", ">=", thirtyDaysAgo),
          orderBy("timestamp", "desc")
        );
        const snap = await getDocs(q);
        const clicks = snap.docs.map(d => d.data()).filter(c => c.store);
        setAllClicks(clicks);

        // Get unique stores visited
        const stores = [];
        const seen = new Set();
        clicks.forEach(c => {
          if (!seen.has(c.store)) {
            seen.add(c.store);
            stores.push(c.store);
          }
        });
        setStoreList(stores);
      } catch (err) { console.warn("clicks load:", err); }
      setLoadingClicks(false);
    };
    load();
  }, [user?.uid]);

  // When store selected → get all unique dates for that store
  const handleSelectStore = (store) => {
    setSelectedStore(store);
    const seen = new Set();
    const dates = [];
    allClicks.filter(c => c.store === store).forEach(c => {
      if (!seen.has(c.date)) { seen.add(c.date); dates.push(c.date); }
    });
    setDatesForStore(dates);
    setSelectedDate(null);
    setStep("dates");
  };

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setForm({ orderId:"", amount:"", description:"" });
    setStep("form");
  };

  const alreadyRaised = (store, date) =>
    missingRequests?.some(r => r.store === store && r.purchaseDate === date);

  const handleSubmit = async () => {
    if (!form.orderId.trim()) { showToast("Please enter your Order ID", "info"); return; }
    if (!form.amount)          { showToast("Please enter the order amount", "info"); return; }
    setLoading(true);
    try {
      await submitRequest({
        store: selectedStore, orderId: form.orderId.trim(),
        amount: Number(form.amount), purchaseDate: selectedDate,
        description: form.description, userName: user.name, userEmail: user.email,
      });
      showToast(`Missing cashback request raised for ${selectedStore} ✅`);
      onClose();
    } catch { showToast("Failed to submit. Please try again.", "info"); }
    setLoading(false);
  };

  const OV = { position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:8000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)" };
  const MB = { background:D.card,borderRadius:20,padding:"0",maxWidth:480,width:"93%",position:"relative",color:D.text,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.35)",overflow:"hidden" };
  const inp = { width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${D.inputBorder}`,fontSize:13,outline:"none",background:D.input,color:D.text,fontFamily:"inherit",marginBottom:12 };

  return (
    <div style={OV} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={MB}>

        {/* Header */}
        <div style={{ padding:"18px 20px",borderBottom:`1px solid ${D.border}`,display:"flex",alignItems:"center",gap:12 }}>
          {step !== "stores" && (
            <button onClick={() => setStep(step==="form"?"dates":"stores")}
              style={{ background:"none",border:"none",cursor:"pointer",color:D.text,fontSize:20,padding:0,lineHeight:1 }}>←</button>
          )}
          <div style={{ flex:1 }}>
            <h2 style={{ fontSize:17,fontWeight:900,marginBottom:2 }}>
              {step==="stores" ? "Claim Your Cashback" : step==="dates" ? "Select Shopping Date" : "Order Details"}
            </h2>
            <p style={{ color:D.sub,fontSize:12 }}>
              {step==="stores" ? "Select the store you shopped at via SaveKaro" :
               step==="dates"  ? `Which date did you shop at ${selectedStore}?` :
               `${selectedStore} • ${selectedDate}`}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:D.sub }}>✕</button>
        </div>

        <div style={{ padding:"20px" }}>

          {/* ── STEP 1: STORE LIST ── */}
          {step === "stores" && (<>
            {loadingClicks ? (
              <div style={{ textAlign:"center",padding:"32px 0",color:D.sub }}>
                <div style={{ fontSize:28,marginBottom:8 }}>⏳</div>Loading your recent visits…
              </div>
            ) : storeList.length === 0 ? (
              <div style={{ textAlign:"center",padding:"32px 0",color:D.sub,lineHeight:1.8 }}>
                <div style={{ fontSize:40,marginBottom:10 }}>🛒</div>
                <strong style={{ color:D.text,fontSize:15 }}>No recent store visits found</strong><br/>
                <span style={{ fontSize:13 }}>You haven't clicked any store links via SaveKaro in the last 30 days.</span><br/>
                <span style={{ fontSize:12,marginTop:6,display:"block" }}>Make sure to always click our "Shop Now" button before purchasing to be eligible for cashback.</span>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column" }}>
                {storeList.map((store, i) => (
                  <div key={store} onClick={() => handleSelectStore(store)}
                    style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 4px",borderBottom:`1px solid ${D.border}`,cursor:"pointer",transition:"background .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=D.input}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                      <div style={{ width:48,height:48,borderRadius:12,background:`${storeColors[store]||"#FF5722"}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,border:`1.5px solid ${storeColors[store]||"#FF5722"}33` }}>
                        {storeIcons[store]||"🏪"}
                      </div>
                      <div>
                        <div style={{ fontWeight:800,fontSize:15 }}>{store}</div>
                        <div style={{ fontSize:12,color:"#48BB78",fontWeight:600 }}>
                          🕐 Autotracks {autotrackTime[store]||"within 24h"}
                        </div>
                      </div>
                    </div>
                    <span style={{ color:D.sub,fontSize:18 }}>›</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:16,background:D.input,borderRadius:10,padding:"11px 14px",fontSize:12,color:D.sub,lineHeight:1.7 }}>
              📋 <strong style={{ color:D.text }}>How it works:</strong> Select the store you shopped at → pick the date → fill your Order ID and amount → we verify and send cashback to your UPI within 30 days.
            </div>
          </>)}

          {/* ── STEP 2: DATE SELECTION ── */}
          {step === "dates" && (<>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,padding:"12px 16px",background:`${storeColors[selectedStore]||"#FF5722"}11`,borderRadius:12,border:`1.5px solid ${storeColors[selectedStore]||"#FF5722"}33` }}>
              <span style={{ fontSize:28 }}>{storeIcons[selectedStore]||"🏪"}</span>
              <div>
                <div style={{ fontWeight:800,fontSize:15 }}>{selectedStore}</div>
                <div style={{ fontSize:12,color:D.sub }}>Select the date you shopped</div>
              </div>
            </div>

            <p style={{ fontSize:13,color:D.sub,marginBottom:14,fontWeight:600 }}>These are the dates you visited {selectedStore} via SaveKaro:</p>

            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {datesForStore.map(date => {
                const raised = alreadyRaised(selectedStore, date);
                return (
                  <div key={date}
                    onClick={() => !raised && handleSelectDate(date)}
                    style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderRadius:14,border:`2px solid ${raised?"#48BB7866":D.border}`,background:raised?(D.bg):D.card,cursor:raised?"default":"pointer",transition:"all .15s" }}
                    onMouseEnter={e=>{ if(!raised) e.currentTarget.style.borderColor=storeColors[selectedStore]||"#FF5722"; }}
                    onMouseLeave={e=>{ if(!raised) e.currentTarget.style.borderColor=D.border; }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:15 }}>{date}</div>
                      <div style={{ fontSize:12,color:D.sub }}>Visited {selectedStore} via SaveKaro</div>
                    </div>
                    {raised ? (
                      <span style={{ background:"#48BB7822",color:"#276749",fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:20,whiteSpace:"nowrap" }}>✅ Already raised</span>
                    ) : (
                      <span style={{ background:`${storeColors[selectedStore]||"#FF5722"}22`,color:storeColors[selectedStore]||"#FF5722",fontSize:12,fontWeight:700,padding:"5px 14px",borderRadius:20,whiteSpace:"nowrap" }}>Continue →</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* ── STEP 3: ORDER DETAILS ── */}
          {step === "form" && (<>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,padding:"12px 16px",background:`${storeColors[selectedStore]||"#FF5722"}11`,borderRadius:12,border:`1.5px solid ${storeColors[selectedStore]||"#FF5722"}33` }}>
              <span style={{ fontSize:28 }}>{storeIcons[selectedStore]||"🏪"}</span>
              <div>
                <div style={{ fontWeight:800,fontSize:15 }}>{selectedStore}</div>
                <div style={{ fontSize:12,color:D.sub }}>Shopping date: {selectedDate}</div>
              </div>
            </div>

            <label style={{ fontSize:12,fontWeight:600,color:D.sub,display:"block",marginBottom:5 }}>
              Order ID * <span style={{ fontWeight:400 }}>(from confirmation email/SMS)</span>
            </label>
            <input value={form.orderId} onChange={e=>setForm(f=>({...f,orderId:e.target.value}))}
              placeholder={selectedStore==="Amazon"?"e.g. 408-1234567-8901234":selectedStore==="Flipkart"?"e.g. OD123456789012345":"Your order ID"}
              style={inp} autoFocus />

            <label style={{ fontSize:12,fontWeight:600,color:D.sub,display:"block",marginBottom:5 }}>Order Amount (₹) *</label>
            <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
              placeholder="e.g. 1499" style={inp} />

            <label style={{ fontSize:12,fontWeight:600,color:D.sub,display:"block",marginBottom:5 }}>
              Additional Details <span style={{ fontWeight:400 }}>(optional)</span>
            </label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="Product name, any other info…" rows={2}
              style={{ ...inp,resize:"none" }} />

            <button onClick={handleSubmit} disabled={loading}
              style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${storeColors[selectedStore]||"#FF5722"},${storeColors[selectedStore]||"#FF9800"})`,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",opacity:loading?.7:1,marginTop:4 }}>
              {loading ? "Submitting…" : "📤 Submit Request"}
            </button>
            <p style={{ fontSize:11,color:D.sub,textAlign:"center",marginTop:10,lineHeight:1.6 }}>
              We'll review and respond to <strong>{user?.email}</strong> within 3–5 working days.
            </p>
          </>)}

        </div>
      </div>
    </div>
  );
}

/* ══════  SECTION HEADER  ══════ */
function SH({ D, title, sub, cta, onCta }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10 }}>
      <div><h2 style={{ fontSize:21,fontWeight:800,marginBottom:3 }}>{title}</h2><p style={{ color:D.sub,fontSize:13 }}>{sub}</p></div>
      <button onClick={onCta} style={{ background:"none",border:"1.5px solid #FF5722",color:"#FF5722",borderRadius:9,padding:"7px 16px",fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit" }}>{cta} →</button>
    </div>
  );
}