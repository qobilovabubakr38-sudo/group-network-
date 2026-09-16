# 🌐 FAMILY NETWORK — 24/7 BULUTDA ISHLATISH VA CHEKSIZ HOTIRA QO‘LLANMASI

Ushbu qo‘llanma kompyuteringizni o‘chirib qo‘yganingizda ham sayt va Telegram botingiz **24 soat / 7 kun davomida to‘xtovsiz va 100% bepul** ishlashi, shuningdek xotirani tekinga ko‘paytirish bo‘yicha to‘liq yo‘riqnomadir.

---

## 1. ❓ Nega kompyuter o‘chsa sayt to‘xtab qoladi?
Hozirda dastur sizning shaxsiy kompyuteringizda (`localhost:3000`) ishlayapti. Kompyuter o‘chirilganda uning protsessori va interneti ham to‘xtaydi, natijada boshqa telefon yoki kompyuterlar saytga kira olmaydi.

**Yechim:** Loyihani 24/7 ishlaydigan bepul xalqaro bulutli serverga (Cloud Server) joylashtirish. Shunda kompyuteringiz o‘chiq bo‘lsa ham, barcha sinfdoshlar va qarindoshlar saytdan istalgan payt foydalanaveradi.

---

## 2. 🚀 Render.com orqali 24/7 Bepul Saytni Ishga Tushirish (Eng Oson Usul)

Loyihangiz papkasiga barcha kerakli sozlamalar (`render.yaml` va `Dockerfile`) oldindan tayyorlab joylashtirilgan.

### 1-qadam: GitHub ga yuklash (5 daqiqa)
1. [github.com](https://github.com) saytida bepul ro‘yxatdan o‘ting.
2. Yangi shaxsiy repozitoriy yarating (masalan: `family-network`, xavfsizlik uchun **Private** qilib belgilang).
3. Ish stolingizdagi `family-network` papkasini ushbu repozitoriyga yuklang (`git push`).

### 2-qadam: Render.com ga ulash (3 daqiqa)
1. [render.com](https://render.com) saytiga kiring va GitHub orqali ro‘yxatdan o‘ting.
2. **"New +"** tugmasini bosib, **"Web Service"** ni tanlang.
3. Yangi ochgan `family-network` repozitoriyangizni tanlang.
4. Quyidagi sozlamalarni kiriting:
   - **Name:** `oila-tarmogi` (yoki xohlagan nomingiz)
   - **Region:** Frankfurt (Germaniya) yoki Singapur (O‘zbekistonga eng yaqini)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
   - **Instance Type:** `Free` (100% bepul)
5. **"Deploy Web Service"** tugmasini bosing.

🎉 **Natija:** 2-3 daqiqada sizga quyidagicha shaxsiy xavfsiz havola beriladi:  
👉 `https://oila-tarmogi.onrender.com`  
Ushbu havolani barcha qarindosh va sinfdoshlaringizga berishingiz mumkin. Bu havola **24/7 kompyuteringiz o‘chiq bo‘lsa ham ishlaydi** va avtomatik ravishda eng yuqori darajadagi SSL (HTTPS - yashil qulf) bilan himoyalangan.

---

## 3. 🤖 Telegram Bot o‘chib qolmaydimi?

**Yo‘q, umuman o‘chib qolmaydi!**  
Chunki:
- Telegram bot kompyuteringizda emas, aynan yuqoridagi **Render.com** bulut serveri ichida ishlaydi.
- Server doimo yoniq turgani uchun bot ham 24 soat davomida tayyor turadi.
- Kimdir ovozli xabar, rasm yoki yangi xabar yozsa, bot darhol Super Adminga (sizga) xabarnoma jo‘natadi.

---

## 4. 💾 Tekinga Ko‘proq Xotira Olish Usullari

Foydalanuvchilar ko‘p rasm, video va ovozli xabarlar tashlaganda server xotirasi to‘lib qolmasligi uchun 2 ta eng zo‘r bepul yechim:

### Variant A: Telegram Bot Cloud Storage (Cheksiz va 100% Bepul)
- **Qanday ishlaydi:** Foydalanuvchilar saytga tashlagan har qanday rasm, video va ovozli xabarlar to‘g‘ridan-to‘g‘ri sizning shaxsiy Telegram kanalingizga yuklanadi.
- **Xotira hajmi:** **CHEKSIZ (Unlimited)**. Telegramda media saqlash uchun hech qanday chegara yo‘q.
- **Xavfsizlik:** Fayllar faqat sizning yopiq Telegram kanalingizda shifrlangan holda saqlanadi.

### Variant B: Cloudflare R2 (10 GB Umrbod Bepul)
- [cloudflare.com](https://www.cloudflare.com) xizmati orqali har oy **10 GB bepul xotira** beriladi.
- Hech qanday qo‘shimcha to‘lov talab qilinmaydi.
- Yuklash va yuklab olish tezligi dunyo bo‘yicha eng tezkor hisoblanadi.

---

## 5. 🛡️ Super Admin — Nazorat va Xavfsizlik Qo‘llanmasi

Siz so‘ragan barcha xavfsizlik mexanizmlari to‘liq joriy qilindi:

### 1. Sinfdoshlar va Qarindoshlar Izolyatsiyasi:
- Sinfdoshlar faqat "Sinfdoshlar" guruhini va o‘z sinfdoshlarini ko‘radi.
- Ular qarindoshlar guruhiga, oilaviy suratlarga yoki tug‘ilgan kunlarga **kira olmaydi (Server 403 darajasida to‘sib qo‘ygan)**.

### 2. Cross-Gender (Qiz bola <-> O‘g‘il bola) Nazorati:
- Agar sinfdosh o‘g‘il bola sinfdosh qiz bolaga (yoki aksincha) shaxsiy xabar yozmoqchi bo‘lsa, tizim darhol xat yozishni to‘xtatadi.
- Foydalanuvchi ekranida: **"Super Admindan Ruxsat So‘rash"** tugmasi chiqadi.
- Ular tugmani bosganda sizning Admin panelingizdagi **"🛡️ Ruxsat So‘rovlari"** bo‘limiga so‘rov keladi.
- Siz **[Ruxsat Berish]** tugmasini bosganingizdan keyingina ular bir-biri bilan yozisha oladi.

### 3. Kuzatuv Markazi ("👁️ Kuzatuv Markazi"):
- Admin panelidagi ushbu maxsus bo‘lim orqali butun tizimda kim kimga nima deb yozgani, yuborilgan audio, rasm va videolarni to‘g‘ridan-to‘g‘ri ko‘rib va eshitib tura olasiz.

### 4. 1-Tugma bilan Suhbatni Bloklash:
- Agar qaysidir juftlikning yozishmasini taqiqlamoqchi bo‘lsangiz, Kuzatuv menyusidagi **[⛔ Bloklash]** tugmasini bosasiz. Shu zahotiyoq ularning yozishmasi ikkala tomondan ham yopiladi.

---

## 🔑 Dastlabki Kirish Ma‘lumotlari:

- **Super Admin:**  
  Logini: `admin`  
  Paroli: `Admin@2026`  

- **Sinfdoshlar (namuna akkauntlar):**  
  Jasur Mirzayev (o‘g‘il bola): `jasur_sinfdosh` / `Family@2026`  
  Nigora Aliyeva (qiz bola): `nigora_sinfdosh` / `Family@2026`  
  Farhod Karimov (o‘g‘il bola): `farhod_sinfdosh` / `Family@2026`  
  Nilufar Qosimova (qiz bola): `nilufar_sinfdosh` / `Family@2026`  

- **Qarindoshlar (namuna akkauntlar):**  
  Sobir amaki: `sobir_amaki` / `Family@2026`  
  Madina xola: `madina_xola` / `Family@2026`  
