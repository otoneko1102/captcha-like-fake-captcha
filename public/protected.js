let timerId = null;

function startTimer(expiresAt) {
  const timerEl = document.getElementById("timer");
  if (!timerEl) return;

  if (timerId) {
    clearInterval(timerId);
  }

  function updateTimer() {
    const now = Date.now();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      timerEl.textContent = "アクセス期限が切れました。";
      clearInterval(timerId);
      setTimeout(logout, 3000);
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const paddedSeconds = String(seconds).padStart(2, "0");

    timerEl.textContent = `アクセスが許可されています (残り ${minutes}分 ${paddedSeconds}秒)`;
  }

  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

async function checkAuth() {
  const statusEl = document.getElementById("status");
  const tokenEl = document.getElementById("token");
  const content = document.getElementById("content");
  const secretBtn = document.getElementById("secret-button");
  let token = localStorage.getItem("captchaToken");

  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");

  if (urlToken) {
    token = urlToken;
    localStorage.setItem("captchaToken", token);
    window.history.replaceState({}, document.title, "/protected");
  }

  if (!token) {
    content.innerHTML =
      '<p style="color:red;">トークンがありません。ホームに戻ります。</p>';
    setTimeout(() => (window.location.href = "/"), 2000);
    return;
  }

  try {
    const res = await fetch("/check-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token }),
    });

    if (res.ok) {
      const data = await res.json();
      statusEl.textContent = "MSHTA CAPTCHAをクリアしました！";
      tokenEl.textContent = token;
      content.innerHTML =
        '<p id="timer" style="color:green;"> calculating... </p>';
      secretBtn.disabled = false;
        startTimer(data.expiresAt);
    } else {
      throw new Error("Auth failed");
    }
  } catch (err) {
    statusEl.textContent = "MSHTA CAPTCHAに失敗しました。";
    content.innerHTML =
      '<p style="color:red;">認証に失敗しました。ホームに戻ります。</p>';
    localStorage.removeItem("captchaToken");
    setTimeout(() => (window.location.href = "/"), 2000);
  }
}

function secret() {
  const secretBtn = document.getElementById("secret-button");
  const secretEl = document.getElementById("secret");
  secretBtn.disabled = true;
  secretBtn.textContent = "It's a Rick Roll time!"
  secretEl.hidden = false;
  secretEl.play();
}

function callLogout() {
  const res = confirm("ログアウトしますか？");

  if (res) logout();
}

function logout() {
  localStorage.removeItem("captchaToken");
  window.location.href = "/";
}

window.onload = checkAuth;
