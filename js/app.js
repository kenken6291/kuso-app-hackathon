// GAS_API_URL, callApi, セッション関連の関数は js/auth.js で定義済み

// ==== DOM参照 ====
const navGuest = document.getElementById("nav-guest");
const navMember = document.getElementById("nav-member");
const navNickname = document.getElementById("nav-nickname");

const authSection = document.getElementById("auth-section");
const forcePasswordSection = document.getElementById("force-password-section");
const formSection = document.getElementById("form-section");
const loadingSection = document.getElementById("loading-section");
const resultSection = document.getElementById("result-section");
const errorSection = document.getElementById("error-section");
const mypageSection = document.getElementById("mypage-section");

const loginView = document.getElementById("login-view");
const registerView = document.getElementById("register-view");
const forgotView = document.getElementById("forgot-view");
const authMessage = document.getElementById("auth-message");

const editModal = document.getElementById("edit-modal");

const loadingMessages = [
  "審査員が真顔で聞いています...",
  "審査員がツッコミどころを探しています...",
  "審査員の中で葛藤が起きています...",
  "スプレッドシートに記録中...",
  "採点基準を、今作っています..."
];

// ==== 画面切り替え共通処理 ====
// mainSections: ログイン後に切り替える「メインカード群」
const mainSections = [formSection, loadingSection, resultSection, errorSection, mypageSection];

function hideAll(list) {
  list.forEach(s => s.classList.add("hidden"));
}

function showAuthOnly() {
  hideAll(mainSections);
  forcePasswordSection.classList.add("hidden");
  authSection.classList.remove("hidden");
}

function showForcePasswordOnly() {
  hideAll(mainSections);
  authSection.classList.add("hidden");
  forcePasswordSection.classList.remove("hidden");
}

function showMain(section) {
  authSection.classList.add("hidden");
  forcePasswordSection.classList.add("hidden");
  hideAll(mainSections);
  section.classList.remove("hidden");
}

function updateNav() {
  const user = currentUser();
  if (user) {
    navGuest.classList.add("hidden");
    navMember.classList.remove("hidden");
    navNickname.textContent = `👤 ${user.nickname} さん`;
  } else {
    navGuest.classList.remove("hidden");
    navMember.classList.add("hidden");
  }
}

// ==== 起動時の状態判定 ====
function refreshView() {
  updateNav();
  const user = currentUser();

  if (!user) {
    showAuthOnly();
    return;
  }
  if (user.isTempPassword) {
    showForcePasswordOnly();
    return;
  }
  showMain(formSection);
}

// ==== 認証フォームの切り替え ====
function showLoginView() {
  loginView.classList.remove("hidden");
  registerView.classList.add("hidden");
  forgotView.classList.add("hidden");
  hideAuthMessage();
}
function showRegisterView() {
  loginView.classList.add("hidden");
  registerView.classList.remove("hidden");
  forgotView.classList.add("hidden");
  hideAuthMessage();
}
function showForgotView() {
  loginView.classList.add("hidden");
  registerView.classList.add("hidden");
  forgotView.classList.remove("hidden");
  hideAuthMessage();
}

function showAuthMessage(text, isError) {
  authMessage.textContent = text;
  authMessage.classList.remove("hidden");
  authMessage.classList.toggle("auth-message-error", !!isError);
}
function hideAuthMessage() {
  authMessage.classList.add("hidden");
}

document.getElementById("nav-login-btn").addEventListener("click", () => { showLoginView(); showAuthOnly(); });
document.getElementById("nav-register-btn").addEventListener("click", () => { showRegisterView(); showAuthOnly(); });
document.getElementById("show-register").addEventListener("click", e => { e.preventDefault(); showRegisterView(); });
document.getElementById("show-login").addEventListener("click", e => { e.preventDefault(); showLoginView(); });
document.getElementById("show-forgot").addEventListener("click", e => { e.preventDefault(); showForgotView(); });
document.getElementById("show-login-from-forgot").addEventListener("click", e => { e.preventDefault(); showLoginView(); });

// ==== 新規登録 ====
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("register-email").value.trim();
  const nickname = document.getElementById("register-nickname").value.trim();
  const agreed = document.getElementById("register-agree").checked;

  try {
    const data = await registerUser(email, nickname, agreed);
    showAuthMessage(data.message + " 届いた仮パスワードでログインしてください。", false);
    showLoginView();
    document.getElementById("login-email").value = email;
  } catch (err) {
    showAuthMessage(err.message, true);
  }
});

// ==== ログイン ====
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await loginUser(email, password);
    hideAuthMessage();
    refreshView();
  } catch (err) {
    showAuthMessage(err.message, true);
  }
});

// ==== パスワード再発行 ====
document.getElementById("forgot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("forgot-email").value.trim();
  try {
    const data = await forgotPassword(email);
    showAuthMessage(data.message, false);
    showLoginView();
  } catch (err) {
    showAuthMessage(err.message, true);
  }
});

// ==== 初回パスワード変更 ====
document.getElementById("force-password-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw1 = document.getElementById("new-password").value;
  const pw2 = document.getElementById("new-password-confirm").value;
  const msgEl = document.getElementById("force-password-message");

  if (pw1 !== pw2) {
    msgEl.textContent = "パスワードが一致しません";
    msgEl.classList.remove("hidden");
    msgEl.classList.add("auth-message-error");
    return;
  }

  try {
    await changePassword(pw1);
    msgEl.classList.add("hidden");
    refreshView();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.classList.remove("hidden");
    msgEl.classList.add("auth-message-error");
  }
});

// ==== ナビゲーション ====
document.getElementById("nav-logout-btn").addEventListener("click", async () => {
  await logoutUser();
  showLoginView();
  refreshView();
});

document.getElementById("nav-home-btn").addEventListener("click", () => {
  showMain(formSection);
});

document.getElementById("nav-mypage-btn").addEventListener("click", () => {
  loadMypage();
});

// ==== 審査フォーム ====
const pitchForm = document.getElementById("pitch-form");
const submitBtn = document.getElementById("submit-btn");
const scoreValueEl = document.getElementById("score-value");
const scoreCircleEl = document.getElementById("score-circle");
const scoreRankEl = document.getElementById("score-rank");
const commentTextEl = document.getElementById("comment-text");
const errorDetailEl = document.getElementById("error-detail");

function startLoadingMessageLoop() {
  const el = document.getElementById("loading-message");
  let i = 0;
  return setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    el.textContent = loadingMessages[i];
  }, 1800);
}

function getRank(score) {
  if (score >= 90) return "🏆 殿堂入りクソアプリ";
  if (score >= 70) return "🥇 見事なクソアプリ";
  if (score >= 50) return "🥈 まずまずのクソアプリ";
  if (score >= 30) return "🥉 まだまだクソアプリ未満";
  return "🗑️ ただのアイデア倒れ";
}

pitchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const params = {
    appName: document.getElementById("app-name").value.trim(),
    appSummary: document.getElementById("app-summary").value.trim(),
    appPitch: document.getElementById("app-pitch").value.trim()
  };

  showMain(loadingSection);
  const loopId = startLoadingMessageLoop();
  submitBtn.disabled = true;

  try {
    const data = await callApi("judge", params);
    renderResult(data.score, data.comment);
  } catch (err) {
    errorDetailEl.textContent = err.message || String(err);
    showMain(errorSection);
  } finally {
    clearInterval(loopId);
    submitBtn.disabled = false;
  }
});

function renderResult(score, comment) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  scoreValueEl.textContent = clamped;
  scoreRankEl.textContent = getRank(clamped);
  commentTextEl.textContent = comment;

  if (clamped >= 70) {
    scoreCircleEl.style.borderColor = "#ffd93d";
  } else if (clamped >= 40) {
    scoreCircleEl.style.borderColor = "#ff6b6b";
  } else {
    scoreCircleEl.style.borderColor = "#6b6bff";
  }

  showMain(resultSection);
}

document.getElementById("retry-btn").addEventListener("click", () => {
  pitchForm.reset();
  showMain(formSection);
});

document.getElementById("error-retry-btn").addEventListener("click", () => {
  showMain(formSection);
});

// ==== マイページ（履歴の一覧・編集・削除） ====
const entryListEl = document.getElementById("entry-list");
const mypageEmptyEl = document.getElementById("mypage-empty");

function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function loadMypage() {
  showMain(mypageSection);
  entryListEl.innerHTML = "<p>読み込み中...</p>";
  mypageEmptyEl.classList.add("hidden");

  try {
    const data = await callApi("listEntries");
    renderEntryList(data.entries || []);
  } catch (err) {
    entryListEl.innerHTML = "";
    mypageEmptyEl.textContent = "履歴の取得に失敗しました: " + err.message;
    mypageEmptyEl.classList.remove("hidden");
  }
}

function renderEntryList(entries) {
  entryListEl.innerHTML = "";

  if (entries.length === 0) {
    mypageEmptyEl.textContent = "まだ審査履歴がありません。エントリーしてみましょう。";
    mypageEmptyEl.classList.remove("hidden");
    return;
  }
  mypageEmptyEl.classList.add("hidden");

  entries.forEach(entry => {
    const card = document.createElement("div");
    card.className = "entry-card";
    card.innerHTML = `
      <div class="entry-card-header">
        <span class="entry-score">${escapeHtml(entry.score)}点</span>
        <span class="entry-name">${escapeHtml(entry.appName)}</span>
      </div>
      <p class="entry-summary">${escapeHtml(entry.appSummary)}</p>
      <p class="entry-pitch">${escapeHtml(entry.appPitch)}</p>
      <p class="entry-comment">🎙️ ${escapeHtml(entry.comment)}</p>
      <p class="entry-date">エントリー日: ${escapeHtml(formatDate(entry.createdAt))}${
        entry.updatedAt && entry.updatedAt !== entry.createdAt ? "（更新: " + escapeHtml(formatDate(entry.updatedAt)) + "）" : ""
      }</p>
      <div class="entry-actions">
        <button class="btn-secondary btn-edit" data-id="${escapeHtml(entry.entryId)}">編集</button>
        <button class="btn-danger-outline btn-delete" data-id="${escapeHtml(entry.entryId)}">削除</button>
      </div>
    `;
    entryListEl.appendChild(card);

    card.querySelector(".btn-edit").addEventListener("click", () => openEditModal(entry));
    card.querySelector(".btn-delete").addEventListener("click", () => deleteEntry(entry.entryId, entry.appName));
  });
}

function openEditModal(entry) {
  document.getElementById("edit-entry-id").value = entry.entryId;
  document.getElementById("edit-app-name").value = entry.appName;
  document.getElementById("edit-app-summary").value = entry.appSummary;
  document.getElementById("edit-app-pitch").value = entry.appPitch;
  document.getElementById("edit-score").value = entry.score;
  document.getElementById("edit-comment").value = entry.comment;
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
}

document.getElementById("edit-cancel-btn").addEventListener("click", closeEditModal);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

document.getElementById("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const entryId = document.getElementById("edit-entry-id").value;
  const params = {
    entryId,
    appName: document.getElementById("edit-app-name").value.trim(),
    appSummary: document.getElementById("edit-app-summary").value.trim(),
    appPitch: document.getElementById("edit-app-pitch").value.trim(),
    score: Number(document.getElementById("edit-score").value),
    comment: document.getElementById("edit-comment").value.trim()
  };

  try {
    await callApi("updateEntry", params);
    closeEditModal();
    loadMypage();
  } catch (err) {
    alert("更新に失敗しました: " + err.message);
  }
});

async function deleteEntry(entryId, appName) {
  if (!confirm(`「${appName}」を削除します。よろしいですか？`)) return;
  try {
    await callApi("deleteEntry", { entryId });
    loadMypage();
  } catch (err) {
    alert("削除に失敗しました: " + err.message);
  }
}

// ==== 退会 ====
document.getElementById("withdraw-btn").addEventListener("click", async () => {
  if (!confirm("退会すると、登録情報と全ての審査履歴が完全に削除されます。よろしいですか？")) return;
  try {
    await withdrawUser();
    showLoginView();
    refreshView();
  } catch (err) {
    alert("退会処理に失敗しました: " + err.message);
  }
});

// ==== 初期化 ====
refreshView();
