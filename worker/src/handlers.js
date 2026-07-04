import {
  sendMessage,
  editMessageReplyMarkup,
  answerCallbackQuery,
  getFile,
  downloadFile,
  arrayBufferToBase64,
} from "./telegram.js";
import { uploadToGithub, deleteFileFromGithub, triggerBuild } from "./github.js";
import { getSession, createSession, updateSession, deleteSession } from "./db.js";
import { mainMenu, defaultBtn, permKeyboard } from "./keyboards.js";

export async function handleUpdate(env, update) {
  if (update.callback_query) {
    await handleCallback(env, update.callback_query);
  } else if (update.message) {
    await handleMessage(env, update.message);
  }
}

async function handleMessage(env, message) {
  const chatId = message.chat.id;

  if (message.text === "/start") {
    const name = message.from?.first_name || "there";
    await sendMessage(
      env,
      chatId,
      `Hello, ${name}!\n\nWelcome to APK BOT.\nPlease use /build to start.`
    );
    return;
  }

  if (message.text === "/build") {
    await createSession(env, chatId);
    await sendMessage(env, chatId, "Select your project type:", mainMenu());
    return;
  }

  const session = await getSession(env, chatId);
  if (!session) {
    await sendMessage(env, chatId, "Please use the /build command to start.");
    return;
  }

  if (message.document) {
    await handleDocument(env, chatId, session, message.document);
    return;
  }
  if (message.photo && message.photo.length) {
    await handlePhoto(env, chatId, session, message.photo);
    return;
  }
  if (message.text) {
    await handleText(env, chatId, session, message.text);
    return;
  }
}

async function handleText(env, chatId, session, text) {
  const step = session.step;

  if (step === "wait_link") {
    if (text.includes("http")) {
      await uploadToGithub(env, text, "project_source.txt", true);
      await updateSession(env, chatId, { build_type: "url", step: "wait_name" });
      await sendMessage(env, chatId, "Link Received.\n\nEnter App Name:", defaultBtn("name"));
    } else {
      await sendMessage(env, chatId, "Invalid Link. Try again.");
    }
    return;
  }

  if (step === "wait_name") {
    await updateSession(env, chatId, { app_name: text, step: "wait_icon" });
    await sendMessage(env, chatId, "Send App Icon (Image):", defaultBtn("icon"));
    return;
  }

  await sendMessage(env, chatId, "Invalid input for this step.");
}

async function handleDocument(env, chatId, session, document) {
  if (session.step !== "wait_file") {
    await sendMessage(env, chatId, "Not expecting a file at this step.");
    return;
  }

  await sendMessage(env, chatId, "Uploading file to server...");

  const file = await getFile(env, document.file_id);
  const buffer = await downloadFile(env, file.file_path);
  const base64 = arrayBufferToBase64(buffer);

  let target = "uploaded_source.zip";
  let buildType = "zip";
  if (document.file_name && document.file_name.endsWith(".html")) {
    target = "uploaded_source.html";
    buildType = "html";
  }

  await uploadToGithub(env, base64, target, false);
  await updateSession(env, chatId, { build_type: buildType });

  if (session.mode === "native") {
    await sendMessage(env, chatId, "Native Project Uploaded!");
    const fresh = await getSession(env, chatId);
    await runBuild(env, chatId, fresh);
  } else {
    await updateSession(env, chatId, { step: "wait_name" });
    await sendMessage(env, chatId, "File Received.\n\nEnter App Name:", defaultBtn("name"));
  }
}

async function handlePhoto(env, chatId, session, photos) {
  const step = session.step;
  const largest = photos[photos.length - 1];

  if (step === "wait_icon") {
    const file = await getFile(env, largest.file_id);
    const buffer = await downloadFile(env, file.file_path);
    await uploadToGithub(env, arrayBufferToBase64(buffer), "app_icon.png", false);
    await updateSession(env, chatId, { step: "wait_splash" });
    await sendMessage(env, chatId, "Send Splash Screen (Image):", defaultBtn("splash"));
    return;
  }

  if (step === "wait_splash") {
    const file = await getFile(env, largest.file_id);
    const buffer = await downloadFile(env, file.file_path);
    await uploadToGithub(env, arrayBufferToBase64(buffer), "splash_screen.png", false);
    await updateSession(env, chatId, { splash_mode: "custom", step: "wait_perms", perms: [] });
    await sendMessage(env, chatId, "Select Permissions for your Web/HTML App:", permKeyboard([]));
    return;
  }

  await sendMessage(env, chatId, "Not expecting an image at this step.");
}

async function handleCallback(env, callback) {
  const chatId = callback.message.chat.id;
  const data = callback.data;

  // মূল Python কোডে এটা ছিল না — যোগ করা হলো যাতে বাটনে ক্লিকের পর লোডিং স্পিনার আটকে না থাকে
  await answerCallbackQuery(env, callback.id);

  const session = await getSession(env, chatId);
  if (!session) {
    await sendMessage(env, chatId, "Session expired. Please use /build again.");
    return;
  }

  if (data === "mode_link") {
    await updateSession(env, chatId, { mode: "link", step: "wait_link" });
    await sendMessage(env, chatId, "Send the Website Link (URL):");
    return;
  }

  if (data === "mode_html") {
    await updateSession(env, chatId, { mode: "html", step: "wait_file" });
    await sendMessage(env, chatId, "Send your HTML file or ZIP (with JS/CSS):");
    return;
  }

  if (data === "mode_native") {
    await updateSession(env, chatId, { mode: "native", step: "wait_file" });
    await sendMessage(
      env,
      chatId,
      "Send your Java/Kotlin Project ZIP file:\n(Build will start immediately after upload)"
    );
    return;
  }

  if (data === "def_name") {
    await updateSession(env, chatId, { app_name: "MyApp", step: "wait_icon" });
    await sendMessage(env, chatId, "Send App Icon (Image):", defaultBtn("icon"));
    return;
  }

  if (data === "def_icon") {
    await deleteFileFromGithub(env, "app_icon.png");
    await updateSession(env, chatId, { icon_custom: false, step: "wait_splash" });
    await sendMessage(env, chatId, "Send Splash Screen (Image):", defaultBtn("splash"));
    return;
  }

  if (data === "def_splash") {
    await deleteFileFromGithub(env, "splash_screen.png");
    await updateSession(env, chatId, { splash_mode: "blank", step: "wait_perms", perms: [] });
    await sendMessage(env, chatId, "Select Permissions for your Web/HTML App:", permKeyboard([]));
    return;
  }

  if (data.startsWith("perm_")) {
    // NOTE: মূল Python কোডে "call.data.split('_')[1]" ব্যবহার হয়েছিল, যেটা
    // "perm_record_audio"-এর ক্ষেত্রে ভুলভাবে "record" পড়ত (আসল ভ্যালু হারিয়ে যেত)।
    // এখানে .slice(5) দিয়ে ফিক্স করা হলো যাতে multi-word পারমিশন-ও ঠিকভাবে কাজ করে।
    const perm = data.slice(5);
    let current = session.perms || [];
    current = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];

    await updateSession(env, chatId, { perms: current });
    await editMessageReplyMarkup(env, chatId, callback.message.message_id, permKeyboard(current));
    return;
  }

  if (data === "build_final") {
    await runBuild(env, chatId, session);
    return;
  }
}

async function runBuild(env, chatId, session) {
  await sendMessage(env, chatId, "Building your APK! It will take 5 to 10 minutes.");
  await triggerBuild(env, { ...session, chat_id: chatId });
  await deleteSession(env, chatId);
}
