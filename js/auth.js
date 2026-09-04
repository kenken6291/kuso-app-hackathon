// ==============================
// 設定：GAS_API_URLは app.js と同じ値に合わせてください
// ==============================
const GAS_API_URL = "https://script.google.com/macros/s/【ここにデプロイIDを貼り付け】/exec";

const STORAGE_KEY = "kuso_app_session";

// ---- セッション情報の読み書き ----
function saveSession(sessionToken, user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionToken, user }));
}

function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---- GAS API 共通呼び出し ----
async function callApi(action, params = {}) {
  const session = getSession();
  const body = {
    action,
    sessionToken: session ? session.sessionToken : undefined,
    ...params
  };

  const res = await fetch(GAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error("HTTP " + res.status);

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "エラーが発生しました");
  return data;
}

// ---- 各種認証アクション ----
async function registerUser(email, nickname, agreedTerms) {
  return callApi("register", { email, nickname, agreedTerms });
}

async function loginUser(email, password) {
  const data = await callApi("login", { email, password });
  saveSession(data.sessionToken, data.user);
  return data;
}

async function changePassword(newPassword) {
  const data = await callApi("changePassword", { newPassword });
  const session = getSession();
  if (session) {
    session.user.isTempPassword = false;
    saveSession(session.sessionToken, session.user);
  }
  return data;
}

async function forgotPassword(email) {
  return callApi("forgotPassword", { email });
}

async function logoutUser() {
  try { await callApi("logout"); } catch { /* セッション切れでも気にせずクリア */ }
  clearSession();
}

async function withdrawUser() {
  const data = await callApi("withdraw");
  clearSession();
  return data;
}

function isLoggedIn() {
  return !!getSession();
}

function currentUser() {
  const session = getSession();
  return session ? session.user : null;
}
