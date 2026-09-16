# 🚀 GROUP Saytini Render.com orqali 24/7 Bepul Ishga Tushirish Qo‘llanmasi

Ushbu qo‘llanma yordamida kompyuteringiz o‘chiq bo‘lsa ham, sayt internetda kechayu-kunduz to‘xtovsiz ishlab turadi.

---

## 1-Qadam: Render.com da Bepul Ro‘yxatdan O‘tish
1. Brauzerda [render.com](https://render.com) saytiga kiring.
2. **"Get Started"** yoki **"Sign In"** tugmasini bosib, GitHub yoki Google orqali kiring.

---

## 2-Qadam: Loyihani Yuklash va Ulash
1. Render bosh sahifasida **"New +"** tugmasini bosing va **"Web Service"** ni tanlang.
2. Loyihangiz joylashgan GitHub repositoriyasini tanlang (yoki "Public Git repository" havolasini kiriting).
3. Sozlamalarni quyidagicha to‘ldiring:
   - **Name:** `group-network`
   - **Region:** `Frankfurt (EU)` (O‘zbekistonga eng yaqini)
   - **Branch:** `main`
   - **Root Directory:** (bo‘sh qoldiring)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Instance Type:** `Free` (Mutlaqo bepul!)

---

## 3-Qadam: Muhit O‘zgaruvchilarini (Environment Variables) Kiritish
"Environment Variables" bo‘limiga quyidagilarni qo‘shing:
- `NODE_ENV` = `production`
- `PORT` = `10000`
- `JWT_SECRET` = `group_secure_jwt_secret_2026`
- (Ixtiyoriy) `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHANNEL_ID`

---

## 4-Qadam: Saytni Ishga Tushirish
1. Pastdagi **"Create Web Service"** tugmasini bosing.
2. Render 2-3 daqiqa ichida saytingizni to‘liq yig‘ib, internetga chiqaradi!
3. Sizga shaxsiy bepul havola beriladi: masalan, `https://group-network.onrender.com`.
4. Endi ushbu havolani sinfdoshlaringiz va qarindoshlaringizga yuborishingiz mumkin! Kompyuteringizni bemalol o‘chirib qo‘ysangiz ham sayt ishlayveradi.

---

## 5-Qadam: Telegram Botni Ulash (Bepul Cheksiz Xotira)
1. Telegramda **@BotFather** ga kiring va `/newbot` buyrug‘ini bering.
2. Botga nom bering (masalan, `GroupNetworkBot`) va sizga berilgan **Token**ni nusxalang.
3. Telegramda yangi **Shaxsiy Kanal (Private Channel)** oching va botingizni kanalga **Admin** qilib qo‘shing.
4. Kanal ID raqamini (masalan, `-1001234567890`) oling.
5. Saytingizga kirib, **"Super Admin Paneli" -> "Sozlamalar"** bo‘limiga Token va Kanal ID ni kiriting va **"Saqlash"** tugmasini bosing!
6. Tamom! Endi yuklangan barcha rasm, video va audiolar bepul Telegram bulutida cheksiz saqlanadi va yangi so‘rovlar bevosita Telegramingizga keladi!
