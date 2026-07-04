// D1 দিয়ে সেশন (per-user state) সেভ/রিড করার হেল্পার ফাংশনগুলো।
// আগের Python বটে এগুলো ছিল RAM-এর মধ্যে একটা dict (user_data = {}),
// Workers স্টেটলেস হওয়ায় এখানে D1 টেবিলে রাখা হচ্ছে।

export async function getSession(env, chatId) {
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE chat_id = ?")
    .bind(chatId)
    .first();
  if (!row) return null;
  return {
    ...row,
    icon_custom: !!row.icon_custom,
    perms: JSON.parse(row.perms || "[]"),
  };
}

export async function createSession(env, chatId) {
  await env.DB.prepare(
    `INSERT INTO sessions (chat_id, mode, step, app_name, splash_mode, build_type, icon_custom, perms, updated_at)
     VALUES (?, NULL, NULL, NULL, NULL, NULL, 0, '[]', ?)
     ON CONFLICT(chat_id) DO UPDATE SET
       mode=NULL, step=NULL, app_name=NULL, splash_mode=NULL,
       build_type=NULL, icon_custom=0, perms='[]', updated_at=excluded.updated_at`
  )
    .bind(chatId, Date.now())
    .run();
}

export async function updateSession(env, chatId, patch) {
  const current = (await getSession(env, chatId)) || {};
  const merged = { ...current, ...patch };
  await env.DB.prepare(
    `INSERT INTO sessions (chat_id, mode, step, app_name, splash_mode, build_type, icon_custom, perms, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET
       mode=excluded.mode,
       step=excluded.step,
       app_name=excluded.app_name,
       splash_mode=excluded.splash_mode,
       build_type=excluded.build_type,
       icon_custom=excluded.icon_custom,
       perms=excluded.perms,
       updated_at=excluded.updated_at`
  )
    .bind(
      chatId,
      merged.mode ?? null,
      merged.step ?? null,
      merged.app_name ?? null,
      merged.splash_mode ?? null,
      merged.build_type ?? null,
      merged.icon_custom ? 1 : 0,
      JSON.stringify(merged.perms ?? []),
      Date.now()
    )
    .run();
}

export async function deleteSession(env, chatId) {
  await env.DB.prepare("DELETE FROM sessions WHERE chat_id = ?").bind(chatId).run();
}
