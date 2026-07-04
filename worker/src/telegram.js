// PyTelegramBotAPI-এর বদলে সরাসরি Telegram Bot API-কে fetch() দিয়ে কল করা হচ্ছে।

const apiBase = (token) => `https://api.telegram.org/bot${token}`;

export async function tgCall(env, method, payload) {
  const res = await fetch(`${apiBase(env.BOT_TOKEN)}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendMessage(env, chatId, text, reply_markup) {
  return tgCall(env, "sendMessage", {
    chat_id: chatId,
    text,
    reply_markup,
    parse_mode: "Markdown",
  });
}

export async function editMessageReplyMarkup(env, chatId, messageId, reply_markup) {
  return tgCall(env, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup,
  });
}

export async function answerCallbackQuery(env, callbackQueryId, text = "") {
  // মূল Python কোডে এটা কল করা হয়নি, ফলে বাটনে ক্লিক করলে লোডিং স্পিনার আটকে থাকত।
  // এখানে যোগ করা হলো যাতে বাটন-ক্লিক ইনস্ট্যান্টলি রেসপন্স দেখায়।
  return tgCall(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function getFile(env, fileId) {
  const data = await tgCall(env, "getFile", { file_id: fileId });
  return data.result;
}

export async function downloadFile(env, filePath) {
  const res = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`);
  return res.arrayBuffer();
}

export function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function setWebhook(env, url, secretToken) {
  const payload = { url };
  if (secretToken) payload.secret_token = secretToken;
  const res = await fetch(`${apiBase(env.BOT_TOKEN)}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
