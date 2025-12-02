import {
  fetchServers,
  buildInfo,
  sortServers,
  filterServers,
  prepareConfigText,
  downloadTextFile,
  setConfig,
  getConfig,
  testServerConnection
} from "./vpngate.js";
import { OpenVPNService } from "./openvpn-service.js";

/* @tweakable Base URL for fetching country flags. Use {CODE} placeholder for 2-letter country code. Example: 'https://flagcdn.com/h40/{CODE}.png' */
const FLAG_BASE_URL_TEMPLATE = "https://flagcdn.com/h40/{CODE}.png";

const els = {
  // Views
  mainView: document.getElementById("main-view"),
  settingsView: document.getElementById("settings-view"),
  logView: document.getElementById("log-view"),
  
  // Navigation
  navSettings: document.getElementById("nav-settings"),
  navLogs: document.getElementById("nav-logs"),
  backBtns: document.querySelectorAll(".back-btn"),

  // Main page elements
  title: document.querySelector(".title"),
  refresh: document.getElementById("refresh"),
  testAll: document.getElementById("testAll"),
  stopTest: document.getElementById("stopTest"),
  
  countryFilter: document.getElementById("countryFilter"),
  statusFilter: document.getElementById("statusFilter"),
  
  serverList: document.getElementById("serverList"),
  progress: document.getElementById("progress"),
  status: document.getElementById("status"),
  log: document.getElementById("log"),
  clearLog: document.getElementById("clearLog"),
  
  // Settings page elements
  lang: document.getElementById("lang"),
  apiUrl: document.getElementById("apiUrl"),
  proxies: document.getElementById("proxies"),
  saveSources: document.getElementById("saveSources"),
  resetSources: document.getElementById("resetSources"),
  threads: document.getElementById("threads"),
  
  enableSources: document.getElementById("enableSources"),
  enableSourcesLabel: document.getElementById("enableSourcesLabel"),
  
  tableHeaders: document.querySelectorAll(".servers-table th[data-sort]"),
};

const i18n = {
  ru: {
    title: "VPNGate Manager Pro",
    subtitle: "Web-клиент для поиска и загрузки .ovpn конфигураций",
    btnRefresh: "Обновить список",
    btnTestAll: "Тестировать все",
    btnStop: "Остановить",
    ready: "Готово к работе",
    
    // Navigation
    navLogs: "Лог",
    navSettings: "Настройки",
    btnBack: "Назад",

    // Settings page
    settingsTitle: "Настройки",
    settingsGeneral: "Общие",
    settingsSources: "Источники данных",
    enableSources: "Использовать пользовательские источники",
    apiUrl: "API URL:",
    mirrors: "Зеркала (CORS прокси):",
    threads: "Потоки тестирования:",
    save: "Сохранить",
    reset: "Сбросить",
    serversList: "Список серверов",
    filterCountryAll: "Все страны",
    filterStatusAll: "Все",
    filterStatusUp: "Доступные",
    filterStatusDown: "Недоступные",
    filterStatusUntested: "Непроверенные",
    thCountry: "Страна",
    thSpeed: "Скорость ↓",
    thPing: "Пинг ↑",
    thSessions: "Сессии ↓",
    thScore: "Рейтинг ↓",
    thName: "Имя хоста",
    logTitle: "Лог операций",
    clearLog: "Очистить",
    infoTitle: "Информация о сервере",
    btnTest: "Тестировать",
    btnConnect: "Подключиться",
    btnDownload: "Скачать конфиг",
    selectServer: "Выберите сервер из списка",
    emptyList: "Нет серверов для отображения",
    langLabel: "Язык",
    loadedSummary: (total, available) => `Загружено ${total} серверов (${available} доступно)`,
    
    // Connection simulation
    btnDisconnect: "Отключиться",
    statusConnecting: "Подключение...",
    statusConnected: "Подключено. Защищено.",
    statusDisconnected: "Отключено",
    statusConnError: "Ошибка подключения",
    statusReconnecting: "Переподключение...",
    statusAuth: "Аутентификация...",
    
    statusLoading: "Загрузка списка серверов...",
    statusLoaded: (n) => `Загружено ${n} серверов`,
    statusError: "Ошибка загрузки",
    statusTesting: (done, total, perc) => `Тестирование: ${done} из ${total} (${perc}%)`,
    statusTestingDone: "Тестирование завершено",
    statusCreatingConfig: (name) => `Создание конфига ${name}...`,
    statusConfigReady: (filename) => `Файл ${filename} готов`,
    statusErrorConfig: "Ошибка создания конфига",
    statusTestingServer: (name) => `Тестирую ${name}...`,
    logLoading: "📥 Получение списка серверов с VPNGate...",
    logLoaded: (n) => `✅ Список серверов успешно загружен (${n})`,
    logLoadError: (err) => `❌ Ошибка загрузки: ${err}`,
    logTestAll: (total, threads) => `🚀 Начинаю тестирование всех ${total} серверов... (${threads} потоков)`,
    logTestStopped: "⏹️ Тестирование всех серверов было остановлено.",
    logTestFinished: "✅ Тестирование всех серверов завершено.",
    logTestServerError: (name, err) => `❌ Ошибка тестирования ${name}: ${err}`,
    logCreatingConfig: (name) => `🔧 Создание конфига: ${name}`,
    logConfigSaved: (filename) => `💾 Файл сохранен: ${filename}`,
    logSourcesUpdated: "🔧 Источники данных обновлены. Обновите список серверов.",
    logSourcesReset: "↩ Источники сброшены к значениям по умолчанию.",
    logVpnConnecting: (name) => `🔌 Попытка подключения к ${name}...`,
    logVpnLog: (level, msg) => `[VPN-${level.toUpperCase()}] ${msg}`,
    logVpnStatus: (status) => `ℹ️ Статус VPN: ${status}`,
    logVpnPluginUnavailable: "⚠️ OpenVPN плагин не найден. Прямое подключение недоступно, будет скачан файл конфигурации.",
    test_available: "Доступен",
    test_available_udp: "Доступен (UDP, проверка ограничена)",
    test_unavailable: "Недоступен",
    test_timeout: "Недоступен (таймаут)",
    confirmUnavailable: (name) => `Сервер ${name} недоступен. Всё равно скачать?`,
    confirmSlow: (name, ping) => `Пинг сервера ${name} высокий (${ping}ms). Соединение может быть медленным. Продолжить?`,
    info_server: "Сервер",
    info_country: "Страна",
    info_ip: "IP",
    info_proto: "Протокол/порт",
    info_speed: "Скорость",
    info_score: "Рейтинг",
    info_ping_base: "Пинг (база)",
    info_real_ping: "Реальный пинг",
    info_status: "Статус",
    status_available: "✅ Доступен",
    status_unavailable: "❌ Недоступен",
    status_untested: "⏳ Не проверен",
    quality_excellent: "Отличное",
    quality_good: "Хорошее",
    quality_slow: "Медленное",
    tooltip_untested: "Не проверен",
    tooltip_available: (ping) => `Доступен (${ping}ms)`,
    tooltip_available_slow: (ping) => `Доступен, высокий пинг (${ping}ms)`,
    tooltip_unavailable: "Недоступен",

    test_openvpn_connected: "OpenVPN подключение успешно",
    test_openvpn_failed: "OpenVPN подключение не удалось",
    test_openvpn_timeout: "Таймаут OpenVPN подключения",
    test_openvpn_error: "Ошибка OpenVPN",
    test_no_plugin: "Плагин OpenVPN недоступен",
    status_testing_openvpn: "Тестирование OpenVPN подключения..."
  },
  en: {
    title: "VPNGate Manager Pro",
    subtitle: "Web client to find and download .ovpn configurations",
    btnRefresh: "Refresh list",
    btnTestAll: "Test all",
    btnStop: "Stop",
    ready: "Ready",

    // Navigation
    navLogs: "Logs",
    navSettings: "Settings",
    btnBack: "Back",

    // Settings page
    settingsTitle: "Settings",
    settingsGeneral: "General",
    settingsSources: "Data Sources",
    enableSources: "Use custom sources",
    apiUrl: "API URL:",
    mirrors: "Mirrors (CORS proxies):",
    threads: "Testing threads:",
    save: "Save",
    reset: "Reset",
    serversList: "Servers list",
    filterCountryAll: "All countries",
    filterStatusAll: "All",
    filterStatusUp: "Available",
    filterStatusDown: "Unavailable",
    filterStatusUntested: "Untested",
    thCountry: "Country",
    thSpeed: "Speed ↓",
    thPing: "Ping ↑",
    thSessions: "Sessions ↓",
    thScore: "Score ↓",
    thName: "Hostname",
    logTitle: "Operations log",
    clearLog: "Clear",
    infoTitle: "Server info",
    btnTest: "Test",
    btnConnect: "Connect",
    btnDownload: "Download config",
    selectServer: "Select a server from the list",
    emptyList: "No servers to display",
    langLabel: "Language",
    loadedSummary: (total, available) => `Loaded ${total} servers (${available} available)`,
    
    // Connection simulation
    btnDisconnect: "Disconnect",
    statusConnecting: "Connecting...",
    statusConnected: "Connected. You are secure.",
    statusDisconnected: "Disconnected",
    statusConnError: "Connection Error",
    statusReconnecting: "Reconnecting...",
    statusAuth: "Authenticating...",

    statusLoading: "Loading server list...",
    statusLoaded: (n) => `Loaded ${n} servers`,
    statusError: "Load error",
    statusTesting: (done, total, perc) => `Testing: ${done} of ${total} (${perc}%)`,
    statusTestingDone: "Testing finished",
    statusCreatingConfig: (name) => `Creating config for ${name}...`,
    statusConfigReady: (filename) => `File ${filename} is ready`,
    statusErrorConfig: "Config creation error",
    statusTestingServer: (name) => `Testing ${name}...`,
    logLoading: "📥 Fetching server list from VPNGate...",
    logLoaded: (n) => `✅ Successfully loaded ${n} servers`,
    logLoadError: (err) => `❌ Load error: ${err}`,
    logTestAll: (total, threads) => `🚀 Starting test for all ${total} servers... (${threads} threads)`,
    logTestStopped: "⏹️ Full test has been stopped.",
    logTestFinished: "✅ Full test finished.",
    logTestServerError: (name, err) => `❌ Error testing ${name}: ${err}`,
    logCreatingConfig: (name) => `🔧 Creating config: ${name}`,
    logConfigSaved: (filename) => `💾 File saved: ${filename}`,
    logSourcesUpdated: "🔧 Data sources updated. Please refresh the server list.",
    logSourcesReset: "↩ Sources reset to default values.",
    logVpnConnecting: (name) => `🔌 Attempting to connect to ${name}...`,
    logVpnLog: (level, msg) => `[VPN-${level.toUpperCase()}] ${msg}`,
    logVpnStatus: (status) => `ℹ️ VPN Status: ${status}`,
    logVpnPluginUnavailable: "⚠️ OpenVPN plugin not found. Direct connection unavailable, will download config file instead.",
    test_available: "Available",
    test_available_udp: "Available (UDP, limited check)",
    test_unavailable: "Unavailable",
    test_timeout: "Unavailable (timeout)",
    confirmUnavailable: (name) => `Server ${name} is unavailable. Download anyway?`,
    confirmSlow: (name, ping) => `Server ${name} has high ping (${ping}ms). Connection may be slow. Continue?`,
    info_server: "Server",
    info_country: "Country",
    info_ip: "IP",
    info_proto: "Protocol/Port",
    info_speed: "Speed",
    info_score: "Score",
    info_ping_base: "Ping (base)",
    info_real_ping: "Real ping",
    info_status: "Status",
    status_available: "✅ Available",
    status_unavailable: "❌ Unavailable",
    status_untested: "⏳ Untested",
    quality_excellent: "Excellent",
    quality_good: "Good",
    quality_slow: "Slow",
    tooltip_untested: "Untested",
    tooltip_available: (ping) => `Available (${ping}ms)`,
    tooltip_available_slow: (ping) => `Available, high ping (${ping}ms)`,
    tooltip_unavailable: "Unavailable",

    test_openvpn_connected: "OpenVPN connection successful",
    test_openvpn_failed: "OpenVPN connection failed",
    test_openvpn_timeout: "OpenVPN connection timeout",
    test_openvpn_error: "OpenVPN error",
    test_no_plugin: "OpenVPN plugin unavailable",
    status_testing_openvpn: "Testing OpenVPN connection..."
  }
};
let currentLang = 'ru';
function t(key, ...args) {
  const v = i18n[currentLang][key];
  return typeof v === 'function' ? v(...args) : v || key;
}

let servers = [];
let filtered = [];
let selectedIndex = -1;
let currentTest = null;
let stopBatchTest = false;
let currentSort = { key: 'speed', order: 'desc' };

/* @tweakable default data sources when custom sources are disabled */
const defaultConfig = {
  apiUrl: "https://download.vpngate.jp/api/iphone/",
  proxies: ["https://api.allorigins.win/raw?url=", "https://corsproxy.io/?", "https://r.jina.ai/"]
};

/* @tweakable per-server test timeout in seconds */
const testTimeoutSeconds = 10;

/* @tweakable Enable a subtle backdrop image behind the UI */
const enableBackdrop = false;
/* @tweakable Use compact mode to reduce paddings and font sizes */
const enableCompactMode = true;
/* @tweakable Corner radius in pixels for cards and containers */
const uiRadiusPx = 14;
/* @tweakable Card translucency (0.6–0.95 recommended) */
const uiCardAlpha = 0.75;
/* @tweakable Animation duration for micro-interactions (ms) */
const uiAnimFastMs = 180;

/* @tweakable Global compact scale multiplier (affects titles, table fonts, paddings) */
const compactScale = 0.92;
/* @tweakable Extra compact scale applied on small screens (<=576px) */
const mobileExtraCompactScale = 0.9;
/* @tweakable Table cell padding in compact mode (px) */
const compactCellPaddingPx = 6;

/* @tweakable Enable extra-compact layout when screen <= 576px */
const mobileCompactEnabled = true;
/* @tweakable Hide subtitle on very small screens */
const mobileHideSubtitle = true;
/* @tweakable Mobile font scale (applies when <= 576px) */
const mobileFontScale = 0.85;
/* @tweakable Mobile table cell padding (px) */
const mobileCellPadPx = 5;
/* @tweakable Mobile flag icon width (px) */
const mobileFlagPx = 16;
/* @tweakable Mobile button vertical/horizontal padding (px) */
const mobileButtonPad = { y: 8, x: 12 };
/* @tweakable Mobile container paddings (layout/card/header in px) */
const mobilePaddings = { layout: 8, card: 12, headerGap: 12 };
/* @tweakable Hide "Test all" button on very small screens (<=576px) to simplify mobile UI */
const hideTestAllOnMobile = true;

let vpnService = null;
let isVpnPluginAvailable = false;

let connectedState = {
    serverName: null,
    status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error', 'reconnecting', 'auth'
    timer: null,
};

function navigate(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
}

function log(msg) {
  const t = new Date().toLocaleTimeString();
  els.log.textContent += `[${t}] ${msg}\n`;
  els.log.scrollTop = els.log.scrollHeight;
}

function setProgress(v) {
  els.progress.value = v;
}

function setStatus(txt) {
  els.status.textContent = txt;
}

function renderList() {
  els.serverList.innerHTML = "";
  if (filtered.length === 0) {
    els.serverList.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted);">${t('emptyList')}</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((s, idx) => {
    const tr = document.createElement("tr");
    tr.setAttribute("role", "option");
    tr.setAttribute("aria-selected", String(idx === selectedIndex));
    tr.dataset.index = idx;
    if (idx === selectedIndex) tr.classList.add("selected");
    if (s.testing) tr.classList.add("testing");

    let statusIcon = "⚫";
    let statusClass = "offline";
    let title = t('tooltip_untested');

    if (s.tested) {
      if (s.available) {
        if (s.test_ping < 100) {
          statusIcon = "🟢"; statusClass = "good"; title = t('tooltip_available', s.test_ping);
        } else if (s.test_ping < 200) {
          statusIcon = "🟡"; statusClass = "medium"; title = t('tooltip_available', s.test_ping);
        } else {
          statusIcon = "🟠"; statusClass = "bad"; title = t('tooltip_available_slow', s.test_ping);
        }
      } else {
        statusIcon = "🔴"; statusClass = "offline"; title = t('tooltip_unavailable');
      }
    }
    
    // Construct the flag URL using the tweakable template
    const flagUrl = FLAG_BASE_URL_TEMPLATE.replace('{CODE}', s.country_short.toLowerCase());

    tr.innerHTML = `
      <td class="status-col" title="${title}"><span class="status-dot ${statusClass}">${statusIcon}</span></td>
      <td class="country-col">
          <img loading="lazy" src="${flagUrl}" alt="${s.country_short}" class="flag" onerror="this.style.display='none'">
          ${s.country}
      </td>
      <td>${s.speed_mbps} Mbps</td>
      <td>${s.tested ? s.test_ping : s.ping} ms</td>
      <td class="hide-mobile">${s.sessions}</td>
    `;
    
    const detailsRow = document.createElement("tr");
    detailsRow.className = "server-details-row";
    if (idx === selectedIndex) {
      detailsRow.classList.add("visible");
    }
    detailsRow.innerHTML = `
      <td colspan="5" class="server-details-cell">
        <div class="server-details-content">
          <pre class="info">${buildInfo(s, t)}</pre>
          <div class="actions">
             <button class="btn btn-test-mobile">
              <span class="btn-text">${t('btnTest')}</span>
              <span class="spinner" style="display: none;"></span>
            </button>
            <button class="btn btn-download-mobile">${t('btnDownload')}</button>
            ${isVpnPluginAvailable ? `<button class="btn primary btn-connect-mobile">${t('btnConnect')}</button>` : ''}
          </div>
          <div class="connection-status"></div>
        </div>
      </td>
    `;
    detailsRow.dataset.serverIp = s.ip;
    
    detailsRow.querySelector('.btn-test-mobile').addEventListener('click', (e) => {
        e.stopPropagation();
        testSelectedServer();
    });
    
    detailsRow.querySelector('.btn-download-mobile').addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSelectedConfig();
    });

    const connectBtn = detailsRow.querySelector('.btn-connect-mobile');
    if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            connectSelected();
        });
    }


    tr.addEventListener("click", () => selectIndex(idx));
    fragment.appendChild(tr);
    fragment.appendChild(detailsRow);
  });
  els.serverList.appendChild(fragment);
  updateConnectionStatusUI();
}

function updateInfo() {
  // This function is now a no-op as the info panel is removed.
  // The logic is handled directly within renderList().
}

function selectIndex(idx) {
  // If clicking the same row, toggle it off.
  if (selectedIndex === idx) {
    selectedIndex = -1;
  } else {
    selectedIndex = idx;
  }
  
  const isDifferentServer = connectedState.serverName !== (filtered[selectedIndex] ? filtered[selectedIndex].name : null);
  if (connectedState.status !== 'disconnected' && isDifferentServer) {
    disconnect();
  }

  renderList();
  updateInfo();
}

function applyFiltersAndSort() {
  const f = {
    country: els.countryFilter.value || "",
    status: els.statusFilter.value || "all"
  };

  // Find current selected server before filtering/sorting
  const selectedServer = (selectedIndex > -1 && selectedIndex < filtered.length) ? filtered[selectedIndex] : null;

  const sorted = sortServers(servers, currentSort.key, currentSort.order);
  filtered = filterServers(sorted, f);
  
  // Try to find the selected server in the new filtered list
  if (selectedServer) {
      selectedIndex = filtered.findIndex(s => s.ip === selectedServer.ip && s.port === selectedServer.port && s.proto === selectedServer.proto);
  } else if (connectedState.serverName) {
      selectedIndex = filtered.findIndex(s => s.name === connectedState.serverName);
  } else {
      selectedIndex = -1;
  }
  
  // If we are "connected" to a server that is now filtered out, reset connection state.
  if (connectedState.serverName && selectedIndex === -1) {
      disconnect();
  }
  
  renderList();
  updateInfo();
  
  const availableCount = servers.filter(s => s.tested && s.available).length;
  document.querySelector('.subtitle').textContent = t('loadedSummary', servers.length, availableCount);
}

async function loadServers() {
  try {
    els.refresh.disabled = true;
    els.testAll.disabled = true;
    setStatus(t('statusLoading'));
    setProgress(0);
    log(t('logLoading'));
    
    if (connectedState.status !== 'disconnected') {
        await disconnect();
    }
    
    servers = await fetchServers(setProgress);
    setProgress(100);
    setStatus(t('statusLoaded', servers.length));
    log(t('logLoaded', servers.length));
    
    const countries = Array.from(new Set(servers.map(s => s.country))).sort();
    const currentCountry = els.countryFilter.value;
    els.countryFilter.innerHTML = `<option value="">${t('filterCountryAll')}</option>` +
    countries.map(c => `<option value="${c}" ${c === currentCountry ? 'selected' : ''}>${c}</option>`).join("");
    
    applyFiltersAndSort();
    
  } catch (e) {
    log(t('logLoadError', e.message || e));
    setStatus(t('statusError'));
  } finally {
    els.refresh.disabled = false;
    els.testAll.disabled = false;
  }
}

async function testSelectedServer() {
  if (selectedIndex < 0) return;
  const server = filtered[selectedIndex];
  if (server.testing) return; // Prevent re-testing
  await testServer(server);
  applyFiltersAndSort();
}

async function testAllServers() {
    if (!servers || servers.length === 0) {
        log("⚠️ " + t('emptyList'));
        return;
    }
    const threads = Math.max(1, Math.min(20, parseInt(els.threads.value || "5", 10)));
    log(t('logTestAll', servers.length, threads));
    setProgress(0);
    setStatus(t('statusTesting', 0, servers.length, 0));
    await runBatchTest(servers, threads);
    
    if (stopBatchTest) {
        log(t('logTestStopped'));
    } else {
        log(t('logTestFinished'));
    }
    
    setProgress(0);
    setStatus(t('statusTestingDone'));
}

async function runBatchTest(serversToTest, threads = 5) {
    stopBatchTest = false;
    els.testAll.style.display = 'none';
    els.stopTest.style.display = 'inline-flex';
    els.refresh.disabled = true;
    const total = serversToTest.length; let testedCount = 0; let idx = 0;
    const worker = async () => {
      while (!stopBatchTest) {
        const i = idx++; if (i >= total) break;
        await testServer(serversToTest[i], true);
        testedCount++;
        const p = Math.round((testedCount / total) * 100);
        setProgress(p); setStatus(t('statusTesting', testedCount, total, p));
        applyFiltersAndSort(); await new Promise(r => setTimeout(r, 30));
      }
    };
    await Promise.all(Array.from({ length: threads }, () => worker()));
    els.testAll.style.display = 'inline-flex';
    els.stopTest.style.display = 'none';
    els.refresh.disabled = false;
    stopBatchTest = false;
}

function setTestButtonState(server, testing) {
    const mobileBtn = document.querySelector(`.server-details-row[data-server-ip="${server.ip}"] .btn-test-mobile`);

    if (mobileBtn) {
        const mobileText = mobileBtn.querySelector('.btn-text');
        const mobileSpinner = mobileBtn.querySelector('.spinner');
        if (testing) {
            mobileBtn.disabled = true;
            if (mobileText) mobileText.style.display = 'none';
            if (mobileSpinner) mobileSpinner.style.display = 'inline-block';
        } else {
            mobileBtn.disabled = false;
            if (mobileText) mobileText.style.display = 'inline-block';
            if (mobileSpinner) mobileSpinner.style.display = 'none';
        }
    }
}


// В функции testServer в app.js заменим вызов тестера:

async function testServer(server, batchMode = false) {
  if (!batchMode) {
    setStatus(t('statusTestingServer', server.name));
    setTestButtonState(server, true);
  }
  server.testing = true;
  if (!batchMode) applyFiltersAndSort();

  els.testAll.disabled = true;

  const timeout = testTimeoutSeconds;

  try {
    // Используем реальное OpenVPN тестирование если доступен плагин
    let tester;
    if (isVpnPluginAvailable && server.config_base64) {
      tester = testServerConnection(server.ip, server.port, server.proto, timeout, server.config_base64);
    } else {
      // Fallback к старому методу
      tester = testServerConnection(server.ip, server.port, server.proto, timeout);
    }

    currentTest = tester;
    const result = await tester.test();

    server.tested = true;
    server.available = result.success;
    server.test_ping = result.ping;

    // Обновим тексты результатов
    const resultMessages = {
      'available': t('test_available'),
      'available_udp': t('test_available_udp'),
      'unavailable': t('test_unavailable'),
      'timeout': t('test_timeout'),
      'openvpn_connected': '✅ OpenVPN подключение успешно',
      'openvpn_failed': '❌ OpenVPN подключение не удалось',
      'openvpn_timeout': '❌ Таймаут OpenVPN подключения',
      'openvpn_error': '❌ Ошибка OpenVPN',
      'no_plugin': '⚠️ Плагин OpenVPN недоступен'
    };

    const message = resultMessages[result.reasonKey] || result.reasonKey;

    if (result.success) {
      let qualityKey = result.ping < 100 ? 'quality_excellent' : result.ping < 200 ? 'quality_good' : 'quality_slow';
      let quality = ` (${t(qualityKey)})`;
      log(`✅ ${server.name} [${server.proto}/${server.port}]: ${message}${quality}`);
    } else {
      log(`❌ ${server.name} [${server.proto}/${server.port}]: ${message}`);
    }
  } catch (error) {
    if (error.message !== 'Cancelled') {
      log(t('logTestServerError', server.name, error.message));
    }
  } finally {
    server.testing = false;
    if (!batchMode) {
      setStatus(t('statusTestingDone'));
      setTestButtonState(server, false);
    }
    els.testAll.disabled = false;
    currentTest = null;
    if (!batchMode) applyFiltersAndSort();
  }
}

async function downloadSelectedConfig() {
  if (selectedIndex < 0) return;
  const server = filtered[selectedIndex];
  
  if (server.tested) {
    if (!server.available) {
      if (!confirm(t('confirmUnavailable', server.name))) return;
    } else if (server.test_ping > 300) {
      if (!confirm(t('confirmSlow', server.name, server.test_ping))) return;
    }
  }

  try {
    setStatus(t('statusCreatingConfig', server.name));
    log(t('logCreatingConfig', server.name));
    const text = prepareConfigText(server.config_base64);
    downloadTextFile(server.filename, text);
    setStatus(t('statusConfigReady', server.filename));
    log(t('logConfigSaved', server.filename));
  } catch (e) {
    log(t('logLoadError', e.message || e));
    setStatus(t('statusErrorConfig'));
  }
}

async function connectSelected() {
  if (selectedIndex < 0) return;
  const server = filtered[selectedIndex];

  if (connectedState.serverName && connectedState.serverName === server.name) {
    await disconnect();
    return;
  }

  if (connectedState.serverName) {
    await disconnect();
  }
  
  if (!isVpnPluginAvailable) {
      log(t('logVpnPluginUnavailable'));
      alert(t('logVpnPluginUnavailable'));
      return;
  }
  
  // Pre-connection checks
  if (server.tested) {
    if (!server.available) {
      if (!confirm(t('confirmUnavailable', server.name))) return;
    } else if (server.test_ping > 300) {
      if (!confirm(t('confirmSlow', server.name, server.test_ping))) return;
    }
  }

  try {
      log(t('logVpnConnecting', server.name));
      setConnectionState(server.name, 'connecting');
      await vpnService.connect(server.config_base64, server.name);
  } catch (e) {
      log(t('logLoadError', e.message || e));
      setStatus(t('statusErrorConfig'));
      setConnectionState(server.name, 'error');
  }
}

async function disconnect() {
    if (connectedState.timer) clearTimeout(connectedState.timer);
    
    if (isVpnPluginAvailable && vpnService.isVPNConnected()) {
        await vpnService.disconnect();
    } else {
        // For non-plugin environments or if the service status wasn't 'connected'
        const lastConnectedServerName = connectedState.serverName;
        setConnectionState(null, 'disconnected');
        if (lastConnectedServerName) {
            const lastIndex = filtered.findIndex(s => s.name === lastConnectedServerName);
            if (lastIndex !== -1 && lastIndex === selectedIndex) {
                updateConnectionStatusUI();
            }
        }
    }
}

function setConnectionState(serverName, status) {
    connectedState.serverName = serverName;
    connectedState.status = status;
    updateConnectionStatusUI();
}

function updateConnectionStatusUI() {
    if (selectedIndex < 0) return;

    const server = filtered[selectedIndex];
    const detailsRow = els.serverList.querySelector(`tr[data-index="${selectedIndex}"] + .server-details-row`);
    if (!detailsRow) return;

    const statusEl = detailsRow.querySelector('.connection-status');
    const connectBtn = detailsRow.querySelector('.btn-connect-mobile');
    const downloadBtn = detailsRow.querySelector('.btn-download-mobile');
    
    if (!statusEl || !downloadBtn) return;

    const isCurrentServerConnected = connectedState.serverName && connectedState.serverName === server.name;

    if (isCurrentServerConnected && connectBtn) {
        statusEl.className = `connection-status visible ${connectedState.status}`;
        let statusTextKey = `status${connectedState.status.charAt(0).toUpperCase() + connectedState.status.slice(1)}`;
        statusEl.textContent = t(statusTextKey) || connectedState.status;

        switch (connectedState.status) {
            case 'connecting':
            case 'reconnecting':
            case 'auth':
                connectBtn.textContent = t('btnDisconnect');
                connectBtn.disabled = true;
                downloadBtn.disabled = true;
                break;
            case 'connected':
                connectBtn.textContent = t('btnDisconnect');
                connectBtn.disabled = false;
                downloadBtn.disabled = true;
                break;
            case 'error':
            case 'disconnected':
            default:
                statusEl.className = connectedState.status === 'disconnected' ? 'connection-status' : statusEl.className;
                connectBtn.textContent = t('btnConnect');
                connectBtn.disabled = false;
                downloadBtn.disabled = false;
                break;
        }
    } else {
        // Not connected to this server, or plugin is unavailable (connectBtn might be null)
        statusEl.className = 'connection-status';
        if (connectBtn) {
            connectBtn.textContent = t('btnConnect');
            connectBtn.disabled = false;
        }
        downloadBtn.disabled = false;
    }
}


function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("vpngate-web-settings") || "{}");
    if (saved.sort) currentSort = saved.sort;
    if (els.threads) els.threads.value = String(saved.threads ?? 5);
    if (typeof saved.enableSources === 'boolean') els.enableSources.checked = saved.enableSources;
  } catch (e) {
    console.error("Error loading settings:", e);
  }
  try {
    const src = JSON.parse(localStorage.getItem("vpngate-sources") || "null") || getConfig();
    els.apiUrl.value = src.apiUrl || getConfig().apiUrl;
    els.proxies.value = (src.proxies || getConfig().proxies).join("\n");
  } catch (e) {
    console.error("Error loading sources:", e);
  }
  const savedLang = localStorage.getItem('vpngate-lang');
  currentLang = savedLang || (navigator.language || 'ru').toLowerCase().startsWith('en') ? 'en' : 'ru';
  els.lang.value = currentLang;

  updateSourcesUI();
}

function saveSettings() {
  const data = {
    sort: currentSort,
    threads: Math.max(1, Math.min(20, parseInt(els.threads?.value || "5", 10))),
    enableSources: !!els.enableSources?.checked
  };
  localStorage.setItem("vpngate-web-settings", JSON.stringify(data));
}

function updateSortHeaders() {
    els.tableHeaders.forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.sort === currentSort.key) {
            th.classList.add(currentSort.order);
        }
    });
}

function updateSourcesUI() {
  const enabled = !!els.enableSources.checked;
  els.apiUrl.disabled = !enabled;
  els.proxies.disabled = !enabled;
  els.saveSources.disabled = !enabled;
  els.resetSources.disabled = !enabled;
  if (!enabled) {
    setConfig(defaultConfig);
  } else {
    const apiUrl = els.apiUrl.value.trim();
    const proxies = els.proxies.value.split("\n").map(s => s.trim()).filter(Boolean);
    setConfig({ apiUrl: apiUrl || defaultConfig.apiUrl, proxies: proxies.length ? proxies : defaultConfig.proxies });
  }
}

function applyI18nStatic() {
  document.documentElement.lang = currentLang;
  els.title.textContent = t('title');
  document.querySelector('.subtitle').textContent = t('subtitle');
  els.refresh.textContent = t('btnRefresh');
  els.testAll.textContent = t('btnTestAll');
  els.stopTest.textContent = t('btnStop');
  els.status.textContent = t('ready');
  
  // Navigation
  els.navLogs.textContent = t('navLogs');
  els.navSettings.textContent = t('navSettings');
  els.backBtns.forEach(btn => btn.innerHTML = `&larr; ${t('btnBack')}`);
  
  // Settings page
  document.getElementById('i18n-settings-title').textContent = t('settingsTitle');
  document.getElementById('i18n-settings-general').textContent = t('settingsGeneral');
  document.getElementById('i18n-settings-sources').textContent = t('settingsSources');
  document.querySelector('#settings-view label.block span#i18n-threads-label').textContent = t('threads');
  document.querySelector('#settings-view label.block:nth-of-type(1) span').textContent = t('apiUrl') + ' ';
  document.querySelector('#settings-view label.block:nth-of-type(2) span').textContent = t('mirrors') + ' ';
  els.saveSources.textContent = t('save');
  els.resetSources.textContent = t('reset');
  els.enableSourcesLabel.textContent = t('enableSources');
  document.getElementById('apiUrlLabel').textContent = t('apiUrl') + ' ';
  document.getElementById('mirrorsLabel').textContent = t('mirrors') + ' ';
  
  // Log page
  document.getElementById('i18n-log-header-page').textContent = t('logTitle');
  els.clearLog.textContent = t('clearLog');
  
  applyI18nDynamic();
}

function applyI18nDynamic() {
  // Filters
  const currentCountry = els.countryFilter.value;
  const currentStatus = els.statusFilter.value;

  if (els.countryFilter.options[0]) {
    els.countryFilter.options[0].textContent = t('filterCountryAll');
    els.countryFilter.options[0].value = "";
  }
  els.countryFilter.value = currentCountry;

  if (els.statusFilter.options.length >= 4) {
    els.statusFilter.options[0].textContent = t('filterStatusAll'); els.statusFilter.options[0].value = "all";
    els.statusFilter.options[1].textContent = t('filterStatusUp'); els.statusFilter.options[1].value = "up";
    els.statusFilter.options[2].textContent = t('filterStatusDown'); els.statusFilter.options[2].value = "down";
    els.statusFilter.options[3].textContent = t('filterStatusUntested'); els.statusFilter.options[3].value = "untested";
  }
  els.statusFilter.value = currentStatus;

  // Section headers
  document.getElementById('i18n-servers-list-header').textContent = t('serversList');
  
  // Table headers
  const ths = document.querySelectorAll('.servers-table thead th');
  if (ths.length >= 5) {
    ths[1].textContent = t('thCountry');
    ths[2].textContent = t('thSpeed');
    ths[3].textContent = t('thPing');
    ths[4].textContent = t('thSessions');
  }
  ths.forEach(th => {
      if (th.dataset.sort === 'sessions') {
        th.classList.add('hide-mobile');
      }
  });

  // Lang label
  document.querySelector('#settings-view #i18n-lang-label').textContent = t('langLabel');
}

function bindEvents() {
  els.refresh.addEventListener("click", loadServers);
  els.testAll.addEventListener("click", testAllServers);
  els.stopTest.addEventListener('click', () => {
    stopBatchTest = true;
    if (currentTest) {
      currentTest.cancel();
    }
  });
  els.clearLog.addEventListener("click", () => { els.log.textContent = ""; });
  
  els.countryFilter.addEventListener("change", applyFiltersAndSort);
  els.statusFilter.addEventListener("change", applyFiltersAndSort);
  
  els.tableHeaders.forEach(th => {
    th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (currentSort.key === key) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.key = key;
            currentSort.order = (key === 'ping' || key === 'name' || key === 'country') ? 'asc' : 'desc';
        }
        updateSortHeaders();
        saveSettings();
        applyFiltersAndSort();
    });
  });

  els.saveSources.addEventListener("click", () => {
    const apiUrl = els.apiUrl.value.trim();
    const proxies = els.proxies.value.split("\n").map(s => s.trim()).filter(Boolean);
    const newConfig = { apiUrl, proxies };
    setConfig(newConfig);
    localStorage.setItem("vpngate-sources", JSON.stringify(newConfig));
    log(t('logSourcesUpdated'));
  });
  els.enableSources.addEventListener("change", () => {
    saveSettings();
    updateSourcesUI();
  });
  els.resetSources.addEventListener("click", () => {
    const defaultConfig = {
      apiUrl: "https://download.vpngate.jp/api/iphone/",
      proxies: [
        "https://api.allorigins.win/raw?url=",
        "https://corsproxy.io/?",
        "https://r.jina.ai/",
      ]
    };
    setConfig(defaultConfig);
    els.apiUrl.value = defaultConfig.apiUrl;
    els.proxies.value = defaultConfig.proxies.join("\n");
    localStorage.removeItem("vpngate-sources");
    log(t('logSourcesReset'));
    updateSourcesUI();
  });
  els.threads.addEventListener("change", saveSettings);
  
  els.lang.addEventListener('change', (e) => {
    currentLang = e.target.value;
    localStorage.setItem('vpngate-lang', currentLang);
    applyI18nStatic();
    applyFiltersAndSort(); // This re-renders everything with new text
  });

  // Navigation events
  els.navSettings.addEventListener('click', () => navigate('settings-view'));
  els.navLogs.addEventListener('click', () => navigate('log-view'));
  els.backBtns.forEach(btn => {
    btn.addEventListener('click', () => navigate('main-view'));
  });
}

function handleVpnStatusChange(event) {
    const { status, configName } = event.detail;
    log(t('logVpnStatus', status));
    if (configName) {
        setConnectionState(configName, status);
    } else if (status === 'disconnected' || status === 'error') {
        setConnectionState(null, status);
    }
}

function handleVpnLog(event) {
    const { level, message } = event.detail;
    log(t('logVpnLog', level, message));
}

function applyDesignTweaks() {
  document.documentElement.style.setProperty('--radius', `${uiRadiusPx}px`);
  document.documentElement.style.setProperty('--card-alpha', String(uiCardAlpha));
  document.documentElement.style.setProperty('--anim-fast-ms', `${uiAnimFastMs}ms`);
  document.body.classList.toggle('has-backdrop', !!enableBackdrop);
  document.body.classList.toggle('compact', !!enableCompactMode);
  if (enableCompactMode) {
    document.documentElement.style.setProperty('--font-scale', String(compactScale));
    document.documentElement.style.setProperty('--cell-pad', `${compactCellPaddingPx}px`);
  }
  const mq = window.matchMedia('(max-width: 576px)');
  const applyMobileScale = () => {
    const isMobile = mq.matches && mobileCompactEnabled;
    const scale = isMobile ? mobileFontScale : (enableCompactMode ? compactScale : 1);
    document.documentElement.style.setProperty('--font-scale', String(scale));
    document.documentElement.style.setProperty('--cell-pad', `${isMobile ? mobileCellPadPx : compactCellPaddingPx}px`);
    document.documentElement.style.setProperty('--flag-size', `${isMobile ? mobileFlagPx : 20}px`);
    document.documentElement.style.setProperty('--btn-pad-y', `${isMobile ? mobileButtonPad.y : 10}px`);
    document.documentElement.style.setProperty('--btn-pad-x', `${isMobile ? mobileButtonPad.x : 16}px`);
    document.documentElement.style.setProperty('--layout-pad', `${isMobile ? mobilePaddings.layout : 24}px`);
    document.documentElement.style.setProperty('--layout-pad-mobile', `${mobilePaddings.layout}px`);
    document.documentElement.style.setProperty('--card-pad', `${isMobile ? mobilePaddings.card : 20}px`);
    document.documentElement.style.setProperty('--header-gap', `${isMobile ? mobilePaddings.headerGap : 24}px`);
    const subtitleEl = document.querySelector('.subtitle');
    if (subtitleEl) subtitleEl.style.display = isMobile && mobileHideSubtitle ? 'none' : '';

    // Hide or show "Test all" button on very small screens based on tweakable flag
    if (hideTestAllOnMobile && isMobile) {
      els.testAll.style.display = 'none';
    } else {
      els.testAll.style.display = '';
    }
  };
  mq.addEventListener?.('change', applyMobileScale);
  applyMobileScale();
}

// Init
(async function init() {
  restoreSettings();
  applyI18nStatic();
  try {
    const src = JSON.parse(localStorage.getItem("vpngate-sources") || "null");
    if (src) setConfig(src);
  } catch (e) {
    console.error("Error applying sources:", e);
  }

  vpnService = new OpenVPNService();
  isVpnPluginAvailable = await vpnService.initialize();
  applyDesignTweaks();

  bindEvents();
  document.addEventListener('vpnConnectionStatus', handleVpnStatusChange);
  document.addEventListener('vpnConnectionLog', handleVpnLog);
  
  updateSortHeaders();
  loadServers();
})();