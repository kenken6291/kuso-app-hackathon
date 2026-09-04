// ==============================
// 設定：デプロイ後のGAS WebアプリURLに書き換えてください
// ==============================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzSQ8MjcJM3UAVvPf7kGFEdnCdVUXJzj-IrqP9WWeELKC8CAHSfsWo7IMUIjEg72YXb/exec";

const form = document.getElementById("pitch-form");
const submitBtn = document.getElementById("submit-btn");

const formSection = document.getElementById("form-section");
const loadingSection = document.getElementById("loading-section");
const resultSection = document.getElementById("result-section");
const errorSection = document.getElementById("error-section");

const scoreValueEl = document.getElementById("score-value");
const scoreCircleEl = document.getElementById("score-circle");
const scoreRankEl = document.getElementById("score-rank");
const commentTextEl = document.getElementById("comment-text");
const errorDetailEl = document.getElementById("error-detail");

const loadingMessages = [
  "審査員が真顔で聞いています...",
  "審査員がツッコミどころを探しています...",
  "審査員の中で葛藤が起きています...",
  "スプレッドシートに記録中...",
  "採点基準を、今作っています..."
];

function showSection(section) {
  [formSection, loadingSection, resultSection, errorSection].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
}

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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    appName: document.getElementById("app-name").value.trim(),
    appSummary: document.getElementById("app-summary").value.trim(),
    appPitch: document.getElementById("app-pitch").value.trim()
  };

  showSection(loadingSection);
  const loopId = startLoadingMessageLoop();
  submitBtn.disabled = true;

  try {
    // GAS側のCORS対応(text/plain受信)に合わせ、Content-Typeはtext/plainで送信する
    const res = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();

    if (!data.success) throw new Error(data.error || "審査に失敗しました");

    renderResult(data.score, data.comment);
  } catch (err) {
    console.error(err);
    errorDetailEl.textContent = err.message || String(err);
    showSection(errorSection);
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

  // スコアに応じて枠の色を変える
  if (clamped >= 70) {
    scoreCircleEl.style.borderColor = "#ffd93d";
  } else if (clamped >= 40) {
    scoreCircleEl.style.borderColor = "#ff6b6b";
  } else {
    scoreCircleEl.style.borderColor = "#6b6bff";
  }

  showSection(resultSection);
}

document.getElementById("retry-btn").addEventListener("click", () => {
  form.reset();
  showSection(formSection);
});

document.getElementById("error-retry-btn").addEventListener("click", () => {
  showSection(formSection);
});
