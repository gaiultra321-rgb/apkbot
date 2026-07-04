import { handleUpdate } from "./handlers.js";
import { setWebhook } from "./telegram.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Telegram এখানে POST করবে
    if (request.method === "POST" && url.pathname === `/webhook/${env.BOT_TOKEN}`) {
      if (env.WEBHOOK_SECRET) {
        const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (secret !== env.WEBHOOK_SECRET) {
          return new Response("Forbidden", { status: 403 });
        }
      }

      let update;
      try {
        update = await request.json();
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      // Telegram ৩ সেকেন্ডের মধ্যে 200 না পেলে রিট্রাই পাঠায়, তাই দ্রুত OK রিটার্ন
      // করে বাকি কাজ ব্যাকগ্রাউন্ডে (waitUntil) চালানো হচ্ছে।
      ctx.waitUntil(handleUpdate(env, update));
      return new Response("OK", { status: 200 });
    }

    // ব্রাউজারে ভিজিট করে ওয়েবহুক সেট করার জন্য: https://<your-worker>.workers.dev/setwebhook
    if (url.pathname === "/setwebhook") {
      const webhookUrl = `${url.origin}/webhook/${env.BOT_TOKEN}`;
      const result = await setWebhook(env, webhookUrl, env.WEBHOOK_SECRET);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("APK Bot worker is running.", { status: 200 });
  },
};
