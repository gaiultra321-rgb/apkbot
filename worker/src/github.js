// PyGithub-এর বদলে GitHub REST API সরাসরি fetch() দিয়ে কল করা হচ্ছে।
// GH_TOKEN-এ অবশ্যই repo ও workflow স্কোপ থাকতে হবে (fine-grained token হলে
// Contents: Read & Write + Actions: Read & Write পারমিশন দিতে হবে)।

const API = "https://api.github.com";

function ghHeaders(env) {
  return {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "apkbot-worker",
  };
}

// content: base64 string (বাইনারি ফাইলের জন্য) বা plain text (isText=true হলে)
export async function uploadToGithub(env, content, remotePath, isText = false) {
  const [owner, repo] = env.REPO_NAME.split("/");
  const url = `${API}/repos/${owner}/${repo}/contents/${remotePath}`;

  let sha;
  const getRes = await fetch(url, { headers: ghHeaders(env) });
  if (getRes.status === 200) {
    const data = await getRes.json();
    sha = data.sha;
  }

  const base64Content = isText ? btoa(unescape(encodeURIComponent(content))) : content;

  const body = {
    message: sha ? "Update File" : "Create File",
    content: base64Content,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteFileFromGithub(env, remotePath) {
  const [owner, repo] = env.REPO_NAME.split("/");
  const url = `${API}/repos/${owner}/${repo}/contents/${remotePath}`;

  const getRes = await fetch(url, { headers: ghHeaders(env) });
  if (getRes.status !== 200) return; // ফাইল না থাকলে চুপচাপ ফিরে যাও (মূল কোডের try/except এর মতো)
  const data = await getRes.json();

  await fetch(url, {
    method: "DELETE",
    headers: { ...ghHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Remove custom file", sha: data.sha }),
  });
}

export async function triggerBuild(env, session) {
  const [owner, repo] = env.REPO_NAME.split("/");
  const url = `${API}/repos/${owner}/${repo}/actions/workflows/build.yml/dispatches`;

  const perms = (session.perms || []).join(",");

  await fetch(url, {
    method: "POST",
    headers: { ...ghHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: "main",
      inputs: {
        chat_id: String(session.chat_id),
        build_type: session.build_type || "zip",
        app_name: session.app_name || "NativeApp",
        splash_mode: session.splash_mode || "blank",
        permissions: perms,
      },
    }),
  });
}
