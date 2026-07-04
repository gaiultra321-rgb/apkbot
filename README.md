# APK Bot (Cloudflare Worker + D1 + GitHub Actions Auto-Deploy)

একটাই পাবলিক রিপো — এতে থাকছে:
- `worker/` — Telegram বট (Cloudflare Worker, JavaScript, সেশন D1-এ)
- `.github/workflows/build.yml` — Android/Web APK বিল্ড করে Release/Telegram-এ পাঠায় (আগের মতোই, অপরিবর্তিত)
- `.github/workflows/deploy.yml` — কোড এডিট/পুশ হলেই Worker অটো রি-ডিপ্লয় হয়

Cloudflare Dashboard-এ "Connect to Git" ফিচারটা **ব্যবহার করা হয়নি** — এর বদলে GitHub Actions
দিয়ে সরাসরি `wrangler deploy` চালানো হচ্ছে। এতে Cloudflare-কে তোমার GitHub অ্যাকাউন্টে
অ্যাপ-লেভেল অ্যাক্সেস দিতে হয় না, শুধু একটা সীমিত API টোকেন লাগে (নিচে ব্যাখ্যা করা আছে)।

---

## ⚠️ রিপো পাবলিক থাকলে যা মাথায় রাখতে হবে

রিলিজ থেকে সহজে APK ডাউনলোডের জন্য রিপো পাবলিক রাখা ঠিক আছে, কিন্তু:
- **কোনো টোকেন/সিক্রেট কখনো কোডে বা কমিটে লেখা যাবে না** — শুধু GitHub Secrets আর Cloudflare Worker Secrets-এ থাকবে।
- `worker/wrangler.toml`-এ শুধু D1 **database_id** থাকে, এটা গোপনীয় কিছু না (এটা দিয়ে একা কেউ ডাটাবেসে ঢুকতে পারবে না, আলাদা API টোকেন লাগবে)।
- বট চালু ব্যক্তিগত/অল্প-মানুষের জন্য রাখো, বা chat_id whitelist যোগ করো — নাহলে GitHub Actions-এর ফ্রি মিনিট অন্য কেউ অপব্যবহার করতে পারে (আগের মেসেজে বিস্তারিত বলেছি)।

---

## ধাপ ১ — GitHub Actions Secrets সেট করা

**কোথায় দিতে হবে:** GitHub রিপো → **Settings → Secrets and variables → Actions → New repository secret**

| Secret নাম | মান কী, কোথা থেকে পাবে |
|---|---|
| `BOT_TOKEN` | @BotFather-কে টেলিগ্রামে `/newbot` বা `/mybots` পাঠিয়ে পাওয়া বট টোকেন। এটাই `build.yml`-এও লাগবে (APK/লগ পাঠাতে) এবং Worker-এও (মেসেজ পাঠাতে) — একই টোকেন, একবারই বসাও। |
| `GH_PAT` | নিচে ধাপে ধাপে দেখানো হলো। |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → উপরে ডানদিকে প্রোফাইল আইকন → **My Profile** → বামে **API Tokens** ট্যাব → **Create Token** → নিচের লিস্টে **"Edit Cloudflare Workers"** টেমপ্লেট খুঁজে তার পাশে **Use template** → Account Resources-এ তোমার অ্যাকাউন্ট সিলেক্ট করা থাকবে (ডিফল্ট ঠিক আছে) → নিচে **Continue to summary** → **Create Token** → যে টোকেন দেখাবে সেটা কপি করে GitHub Secret-এ বসাও (এই পেজ বন্ধ করলে আর দেখা যাবে না)। |
| `CLOUDFLARE_ACCOUNT_ID` | নিচে ধাপে ধাপে দেখানো হলো। |

`WEBHOOK_SECRET` আলাদাভাবে বসাতে হবে না — প্রতি ডিপ্লয়ে অটোমেটিক্যালি একটা নতুন র‍্যান্ডম ভ্যালু
জেনারেট হয়ে Worker-এ বসে যায়, আর সাথে সাথে Telegram webhook-ও অটোমেটিক রেজিস্টার হয়ে যায় —
এই দুইটার জন্য তোমাকে আলাদা করে কিছু কপি-পেস্ট করতে হবে না।

`REPO_NAME`-ও দিতে হবে না — workflow নিজে থেকেই `github.repository` (owner/repo) ধরে নেয়।

### GH_PAT কীভাবে বানাবে
1. GitHub-এ উপরে ডানদিকে প্রোফাইল ছবিতে ক্লিক করো → **Settings**
2. একদম নিচে বামের মেনুতে **Developer settings**
3. **Personal access tokens → Fine-grained tokens** → **Generate new token**
4. Token name যেকোনো কিছু দাও (যেমন `apkbot-worker`)
5. **Repository access** → **Only select repositories** → তোমার এই রিপোটা বেছে নাও
6. **Permissions** সেকশনে নিচে স্ক্রল করে:
   - **Contents** → **Read and write**
   - **Actions** → **Read and write**
7. **Generate token** চাপো, যে টোকেন দেখাবে সেটা কপি করে GitHub Secret `GH_PAT`-এ বসাও

### CLOUDFLARE_ACCOUNT_ID কোথায় পাবে
1. [dash.cloudflare.com](https://dash.cloudflare.com) লগইন করো
2. বামের মেনু থেকে **Workers & Pages**-এ ক্লিক করো
3. এই পেজের ডানদিকে একটা বক্সে **Account ID** লেখা থাকবে, পাশে কপি আইকনে ক্লিক করে কপি করো

---

## ধাপ ২ — Cloudflare D1 ডাটাবেস বানানো (একবারই, ব্রাউজার থেকে)

1. Cloudflare Dashboard → **Workers & Pages → D1 → Create database**, নাম দাও `apkbot-db`।
2. তৈরি হলে **Database ID** কপি করে `worker/wrangler.toml`-এর `database_id = "..."` জায়গায় বসাও (GitHub-এ ফাইল এডিট করে কমিট করলেই হবে)।
3. ওই D1 ডাটাবেসের **Console** ট্যাবে গিয়ে `worker/schema.sql`-এর ভেতরের SQL কপি-পেস্ট করে রান করো।

---

## ধাপ ৩ — প্রথম ডিপ্লয় + অটো-আপডেট

Secrets আর `database_id` বসানো হয়ে গেলে `main` ব্রাঞ্চে যেকোনো একটা কমিট/পুশ দিলেই
`deploy.yml` অ্যাকশন চলবে আর Worker ডিপ্লয় হয়ে যাবে (GitHub রিপোর **Actions** ট্যাবে
প্রগ্রেস দেখতে পাবে)।

**এরপর থেকে:** `worker/` ফোল্ডারের যেকোনো ফাইল GitHub-এ এডিট করে সেভ/কমিট করলেই
(ওয়েব এডিটর দিয়ে বা লোকাল থেকে পুশ করে) — অটোমেটিক্যালি নতুন ভার্সন Cloudflare-এ
ডিপ্লয় হয়ে যাবে, ম্যানুয়ালি কিছু করা লাগবে না। কোনো ফিচার ঠিক না হলে বা এরর
আসলে, কোড ঠিক করে পুশ করলেই কয়েক সেকেন্ডে লাইভ আপডেট হয়ে যাবে।

---

## ধাপ ৪ — টেলিগ্রাম ওয়েবহুক (এখন অটোমেটিক)

`deploy.yml` অ্যাকশন ডিপ্লয়ের পরপরই নিজে থেকেই Worker-এর `/setwebhook` কল করে
Telegram-কে জানিয়ে দেয় — তোমাকে কিছু ভিজিট বা কপি-পেস্ট করতে হবে না। GitHub Actions-এর
লগে (Actions ট্যাব → লেটেস্ট রান → **"Auto-register Telegram webhook"** স্টেপ) গিয়ে
দেখতে পারবে সেট হয়েছে কিনা।

যদি কখনো এই স্টেপ ব্যর্থ হয় (যেমন প্রথমবার Worker সাবডোমেইন এখনো তৈরি না থাকলে), তখন
ম্যানুয়ালি একবার ব্রাউজারে `https://<তোমার-worker>.workers.dev/setwebhook` ভিজিট করে নিলেই হবে।

---

## Q: Cloudflare-এ GitHub কানেক্ট (Git integration) ছাড়া পাবলিক রিপো দিয়ে Worker/বট রান করা যায়?

হ্যাঁ, দুইভাবে:

1. **এই রিপোতে যা সেটআপ করা হয়েছে** — GitHub Actions + `wrangler deploy` দিয়ে অটো-ডিপ্লয়।
   Cloudflare-কে তোমার GitHub অ্যাকাউন্টে কোনো অ্যাক্সেস দিতে হয় না; শুধু একটা সীমিত-ক্ষমতার
   API টোকেন (`CLOUDFLARE_API_TOKEN`) GitHub Secrets-এ থাকে, আর অ্যাকশন রান হয় GitHub-এর
   নিজস্ব সার্ভারে।
2. **ম্যানুয়াল লোকাল ডিপ্লয়** — রিপো পাবলিক হওয়ায় যে কেউ (`git clone`) করে নিজের কম্পিউটারে
   নামিয়ে, Node.js + wrangler ইনস্টল করে, `wrangler login` করে `wrangler deploy` চালাতে পারবে।
   তবে সেক্ষেত্রে D1 বাইন্ডিং আর secrets নিজে থেকে সেট করতে হবে (`wrangler secret put ...`)।

দুটোই সম্পূর্ণ বৈধ পদ্ধতি — Cloudflare-এর ড্যাশবোর্ড Git-integration ফিচারটা শুধু একটা
সুবিধা, বাধ্যতামূলক না।

---

## সংক্ষেপে ফাইল-বাই-ফাইল

```
apkbot/
  .github/workflows/
    build.yml     -> APK বিল্ড + Release/Telegram ডেলিভারি (অপরিবর্তিত)
    deploy.yml     -> পুশ হলেই Worker অটো-ডিপ্লয় (নতুন)
  worker/
    wrangler.toml  -> D1 বাইন্ডিং কনফিগ
    package.json
    schema.sql     -> D1 টেবিল স্কিমা (একবার Console-এ রান করতে হবে)
    src/
      index.js     -> Webhook রাউট + /setwebhook
      handlers.js  -> মূল বট লজিক
      telegram.js  -> Telegram API কল
      github.js    -> GitHub API কল (ফাইল পুশ, workflow ট্রিগার)
      db.js        -> D1 সেশন হেল্পার
      keyboards.js -> ইনলাইন কীবোর্ড
```
