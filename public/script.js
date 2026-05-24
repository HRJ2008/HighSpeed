const speedNumber = document.getElementById("speedNumber");
const download = document.getElementById("download");
const upload = document.getElementById("upload");
const resultDownload = document.getElementById("resultDownload");
const resultUpload = document.getElementById("resultUpload");
const ping = document.getElementById("ping");
const jitter = document.getElementById("jitter");
const speedCard = document.getElementById("speedCard");
const startBtn = document.getElementById("startBtn");
const gaugeProgress = document.getElementById("gaugeProgress");
const gaugeGlow = document.querySelector(".gauge-glow");
const testStatus = document.getElementById("testStatus");
const resultMessage = document.getElementById("resultMessage");
const appShell = document.getElementById("appShell");
const optionsBtn = document.getElementById("optionsBtn");
const optionsPanel = document.getElementById("optionsPanel");
const privacyBtn = document.getElementById("privacyBtn");
const privacyCard = document.getElementById("privacyCard");
const themeBtn = document.getElementById("themeBtn");
const sizeOptions = document.querySelectorAll(".size-option");
const serverNote = document.getElementById("serverNote");

const SPEED_LIMIT_MBPS = 1000;
const PING_SAMPLES = 6;
const REMOTE_API_BASE_URL = "https://highspeed-8hm4.onrender.com";
const GAUGE_ANIMATION_MS = 900;
const THEMES = [
  "https://i.pinimg.com/originals/ec/b9/2d/ecb92d18c7855c986a5571c1b6f7cad2.jpg",
  "https://www.pixelstalk.net/wp-content/uploads/images5/4K-Ultra-Mountain-Wallpapers-For-PC-scaled.jpg",
  "https://wallpapers.com/images/featured/4k-oaax18kaapkokaro.jpg",
  "https://cdn.wallpapersafari.com/10/59/SP241Z.jpg",
  "https://cdn.wallpapersafari.com/18/91/j9Msa3.jpg",
  "https://wallpaperaccess.com/full/33939.jpg",
  "https://wallpaperaccess.com/full/57909.jpg",
  "https://wallpaperaccess.com/full/1315312.jpg"
];

let timer;
let isRunning = false;
let currentThemeIndex = -1;
let selectedSizeMb = 25;
let displayedGaugeValue = 0;

function isLocalServer() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getApiUrl(path) {
  const baseUrl = isLocalServer() ? "" : REMOTE_API_BASE_URL;
  return `${baseUrl}${path}`;
}

function setServerNote() {
  if (isLocalServer()) {
    serverNote.textContent =
      "Local test: this measures browser to this laptop. Cloudflare uses the Render backend for real network testing.";
    return;
  }

  serverNote.textContent = "Testing speed between this device and the Render backend server.";
}

function setTheme(index) {
  currentThemeIndex = index;
  appShell.style.setProperty("--bg-image", `url("${THEMES[currentThemeIndex]}")`);
}

function getGaugePercent(value) {
  const clampedValue = Math.max(0, Math.min(value, SPEED_LIMIT_MBPS));

  if (clampedValue <= 0) {
    return 0;
  }

  // Speedometer-style mapping: low real speeds still move the arc visibly.
  return Math.log10(clampedValue + 1) / Math.log10(SPEED_LIMIT_MBPS + 1);
}

function setGauge(value) {
  const percent = getGaugePercent(value);

  gaugeProgress.style.strokeDashoffset = 100 - percent * 100;
  gaugeGlow.style.strokeDashoffset = 100 - percent * 100;
  displayedGaugeValue = value;
}

function animateGaugeTo(targetValue) {
  clearInterval(timer);
  const startValue = displayedGaugeValue;
  const startedAt = performance.now();

  timer = setInterval(() => {
    const progress = Math.min((performance.now() - startedAt) / GAUGE_ANIMATION_MS, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const nextValue = startValue + (targetValue - startValue) * easedProgress;

    setGauge(nextValue);

    if (progress >= 1) {
      clearInterval(timer);
      setGauge(targetValue);
    }
  }, 16);
}

function resetTest() {
  clearInterval(timer);
  isRunning = false;
  speedNumber.textContent = "0.00";
  download.textContent = "0.00";
  upload.textContent = "--";
  resultDownload.textContent = "-- Mbps";
  resultUpload.textContent = "-- Mbps";
  ping.textContent = "-- ms";
  jitter.textContent = "-- ms";
  testStatus.textContent = "Ready to test";
  startBtn.textContent = "Run speed test";
  startBtn.classList.remove("is-running");
  startBtn.hidden = false;
  speedCard.classList.remove("is-complete");
  resultMessage.classList.remove("show");
  setGauge(0);
}

function setRunningState(isTesting) {
  isRunning = isTesting;
  startBtn.disabled = isTesting;
  sizeOptions.forEach((option) => {
    option.disabled = isTesting;
  });

  if (isTesting) {
    startBtn.textContent = "Running...";
    startBtn.classList.add("is-running");
    return;
  }

  startBtn.classList.remove("is-running");
}

function formatMbps(value) {
  return value.toFixed(2);
}

function calculateMbps(bytes, milliseconds) {
  const seconds = milliseconds / 1000;

  if (seconds <= 0) {
    return 0;
  }

  return (bytes * 8) / seconds / 1000000;
}

async function measurePing() {
  const samples = [];

  for (let index = 0; index < PING_SAMPLES; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(getApiUrl(`/api/ping?cacheBust=${Date.now()}-${index}`), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Ping request failed");
    }

    await response.json();
    samples.push(performance.now() - startedAt);
  }

  const averagePing = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  const jitterValue =
    samples.slice(1).reduce((sum, sample, index) => sum + Math.abs(sample - samples[index]), 0) /
    (samples.length - 1);

  ping.textContent = `${Math.round(averagePing)} ms`;
  jitter.textContent = `${Math.round(jitterValue)} ms`;

  return {
    ping: averagePing,
    jitter: jitterValue
  };
}

async function measureDownload(sizeMb) {
  const startedAt = performance.now();
  const response = await fetch(getApiUrl(`/api/download?size=${sizeMb}&cacheBust=${Date.now()}`), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Download request failed");
  }

  const data = await response.arrayBuffer();
  const mbps = calculateMbps(data.byteLength, performance.now() - startedAt);
  const formatted = formatMbps(mbps);

  speedNumber.textContent = formatted;
  download.textContent = formatted;
  resultDownload.textContent = `${formatted} Mbps`;
  animateGaugeTo(mbps);

  return mbps;
}

async function measureUpload(sizeMb) {
  const bytes = sizeMb * 1024 * 1024;
  const data = new Uint8Array(bytes);
  const startedAt = performance.now();
  const response = await fetch(getApiUrl(`/api/upload?cacheBust=${Date.now()}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream"
    },
    body: data
  });

  if (!response.ok) {
    throw new Error("Upload request failed");
  }

  await response.json();

  const mbps = calculateMbps(bytes, performance.now() - startedAt);
  const formatted = formatMbps(mbps);

  speedNumber.textContent = formatted;
  upload.textContent = formatted;
  resultUpload.textContent = `${formatted} Mbps`;
  animateGaugeTo(mbps);

  return mbps;
}

function setFailureState() {
  testStatus.textContent = "Test failed. Try again.";
  startBtn.textContent = "Run speed test";
  setRunningState(false);
}

async function runSpeedTest() {
  if (isRunning) {
    return;
  }

  setRunningState(true);
  speedCard.classList.remove("is-complete");
  resultMessage.classList.remove("show");

  speedNumber.textContent = "0.00";
  download.textContent = "0.00";
  upload.textContent = "--";
  resultDownload.textContent = "-- Mbps";
  resultUpload.textContent = "-- Mbps";
  ping.textContent = "-- ms";
  jitter.textContent = "-- ms";
  setGauge(0);

  try {
    testStatus.textContent = "Testing ping...";
    await measurePing();

    testStatus.textContent = "Testing download...";
    await measureDownload(selectedSizeMb);

    testStatus.textContent = "Testing upload...";
    setGauge(0);
    await measureUpload(selectedSizeMb);

    testStatus.textContent = "Test complete";
    startBtn.textContent = "Test again";
    setRunningState(false);
    speedCard.classList.add("is-complete");
    resultMessage.classList.add("show");
  } catch (error) {
    console.error(error);
    setFailureState();
  }
}

function closeOptionsMenu() {
  optionsPanel.hidden = true;
  optionsBtn.setAttribute("aria-expanded", "false");
}

function hidePrivacyCard() {
  privacyCard.hidden = true;
}

function togglePrivacyCard() {
  privacyCard.hidden = !privacyCard.hidden;
  closeOptionsMenu();
}

function changeTheme() {
  let nextThemeIndex = Math.floor(Math.random() * THEMES.length);

  if (nextThemeIndex === currentThemeIndex) {
    nextThemeIndex = (nextThemeIndex + 1) % THEMES.length;
  }

  setTheme(nextThemeIndex);
  hidePrivacyCard();
  closeOptionsMenu();
}

startBtn.addEventListener("click", runSpeedTest);
optionsBtn.addEventListener("click", () => {
  const isOpen = !optionsPanel.hidden;

  optionsPanel.hidden = isOpen;
  optionsBtn.setAttribute("aria-expanded", String(!isOpen));
});
privacyBtn.addEventListener("click", togglePrivacyCard);
themeBtn.addEventListener("click", changeTheme);
sizeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    selectedSizeMb = Number(option.dataset.size);

    sizeOptions.forEach((item) => {
      item.classList.toggle("is-active", item === option);
    });
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".options-menu") || event.target.closest(".privacy-card")) {
    return;
  }

  closeOptionsMenu();
  hidePrivacyCard();
});

window.addEventListener("load", () => {
  setTheme(Math.floor(Math.random() * THEMES.length));
  setServerNote();
  resetTest();
});
