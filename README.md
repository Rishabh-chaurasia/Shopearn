# SaveKaro 💸

A cashback and deals platform built for Indian shoppers. Find deals from top stores like Amazon, Flipkart, Myntra, Nykaa and more — click through our links, shop normally, and claim your cashback.

---

## What is this?

I built SaveKaro because I was tired of missing out on cashback while shopping online. Most cashback apps are either too complicated, don't support Indian payment methods, or take forever to pay out. SaveKaro keeps it simple — you shop, you claim, we verify, we pay.

The site works as an affiliate cashback platform. When you click a deal through SaveKaro and buy something, the store pays us a small commission. We share a portion of that commission back with you as cashback.

---

## Features

**For users**
- Browse deals from 50+ Indian stores with real cashback rates
- Search and filter by category, price range, discount, rating
- Save products to wishlist (syncs across devices via Firebase)
- AI deal finder chatbot — type what you want, get matched products
- Spin & Win wheel for discount coupon codes
- Dark mode and Hindi/English language toggle
- Claim cashback after purchase — just fill your Order ID and amount
- Track all your cashback claims and their status
- Raise missing cashback requests linked to your actual store visits

**For the platform**
- Every affiliate link click is logged to Firestore with store, date, user ID
- Missing cashback requests saved to Firebase for admin review
- Google Sign-In and Email/Password authentication
- Wishlist and purchase history synced per user to Firestore

---

## Tech Stack

- **Frontend** — React 18
- **Auth** — Firebase Authentication (Google + Email/Password)
- **Database** — Cloud Firestore
- **Hosting** — Vercel
- **Affiliate programs** — Amazon Associates India, vCommission

---

## How cashback works

This is not automatic tracking. Here is the real flow:

1. User logs in (required before any store redirect)
2. User clicks a deal — the click is saved to Firestore with timestamp and store name
3. User shops and completes their purchase on the store's website
4. User comes back to SaveKaro → My Cashback → Claim Cashback
5. The modal shows only the stores they actually visited (from click history)
6. User selects the store and date, fills in their Order ID and purchase amount
7. We receive this in Firebase and cross-check with our Amazon Associates / vCommission dashboard
8. Once verified, we send cashback to the user's UPI ID
9. We update the claim status in Firestore to Confirmed → Paid

---

## Project Structure

```
src/
├── App.jsx          — main app, all pages, routing, state
├── components.jsx   — SpinWheel, LoginModal, AIChatbot, ShareButtons, etc.
├── hooks.js         — useAuth, usePurchases, useWishlist, useClickTracker, useMissingCashback
├── data.js          — products, stores, coupons, banners, spin prizes
├── firebase.js      — Firebase config and Firestore helpers
├── growth.jsx       — PWA banner, push notification banner, blog page
└── polish.jsx       — ErrorBoundary, SkeletonGrid, CookieConsent, NotFoundPage

public/
├── sw.js            — service worker for PWA
├── manifest.json    — PWA manifest
├── sitemap.xml      — for SEO
└── robots.txt
```

---

## Getting Started

**Prerequisites**
- Node.js 16+
- A Firebase project with Firestore and Authentication enabled
- An Amazon Associates account (for the affiliate tag)

**Install**

```bash
git clone https://github.com/yourusername/savekaro.git
cd savekaro
npm install --legacy-peer-deps
```

**Firebase setup**

Create a `.env` file in the root or update `src/firebase.js` with your config:

```js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

Enable these in Firebase Console:
- Authentication → Google and Email/Password
- Firestore Database → create in your preferred region
- Add your domain to Authorized Domains

**Firestore Security Rules**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /clicks/{doc} {
      allow create: if true;
      allow read: if false;
    }
    match /missingCashbackRequests/{doc} {
      allow create: if request.auth != null;
      allow read: if false;
    }
  }
}
```

**Run locally**

```bash
npm start
```

**Build for production**

```bash
set CI=false && npm run build   # Windows
CI=false npm run build          # Mac/Linux
```

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}/wishlist` | User's saved products |
| `users/{uid}/purchases` | Cashback claims submitted by user |
| `users/{uid}/clicks` | Stores visited via SaveKaro (last 30 days used for claim flow) |
| `users/{uid}/missingCashback` | User's view of their claim requests |
| `clicks` | Global click log for analytics |
| `missingCashbackRequests` | All cashback claims for admin review |

---

## Affiliate Setup

Update `src/data.js` with your affiliate tags:

```js
// Amazon — replace with your Associates tag
"go-amazon": "https://www.amazon.in/?tag=YOUR_TAG"

// vCommission stores — replace after approval
"go-myntra": "YOUR_VCOMMISSION_LINK"
"go-nykaa":  "YOUR_VCOMMISSION_LINK"
```

---

## Deployment

The project is deployed on Vercel. Connect your GitHub repo to Vercel and it deploys automatically on every push to main.

Add your Vercel domain to Firebase Console → Authentication → Authorized Domains.

---

## License

MIT — free to use, modify and distribute.

---

## Contact

Built by Rishabh Chaurasia  
Email: support@savekaro.in  
Site: https://save-karo.vercel.app
