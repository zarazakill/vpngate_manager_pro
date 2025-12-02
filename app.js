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

const els = {
  title: document.querySelector(".title"),
  refresh: document.getElementById("refresh"),
  testAll: document.getElementById("testAll"),
  stopTest: document.getElementById("stopTest"),
  download: document.getElementById("download"),
  testSelected: document.getElementById("testSelected"),
  
  countryFilter: document.getElementById("countryFilter"),
  statusFilter: document.getElementById("statusFilter"),
  
  serverList: document.getElementById("serverList"),
  info: document.getElementById("info"),
  progress: document.getElementById("progress"),
  status: document.getElementById("status"),
  log: document.getElementById("log"),
  clearLog: document.getElementById("clearLog"),
  
  apiUrl: document.getElementById("apiUrl"),
  proxies: document.getElementById("proxies"),
  saveSources: document.getElementById("saveSources"),
  resetSources: document.getElementById("resetSources"),
  threads: document.getElementById("threads"),
  
  enableSources: document.getElementById("enableSources"),
  enableSourcesLabel: document.getElementById("enableSourcesLabel"),
  
  tableHeaders: document.querySelectorAll(".servers-table th[data-sort]"),
};

const dom = {
  ...els,
  sidebar: document.querySelector('.sidebar'),
  mobileScrim: document.querySelector('.mobile-scrim'),
};

const i18n = {
  ru: {
    title: "VPNGate Manager Pro",
    subtitle: "Web-клиент для поиска и загрузки .ovpn конфигураций",
    btnRefresh: "Обновить список",
    btnTestAll: "Тестировать все",
    btnStop: "Остановить",
    ready: "Готово к работе",
    settingsSources: "Дополнительные источники",
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
    btnDownload: "Скачать .ovpn",
    selectServer: "Выберите сервер из списка",
    emptyList: "Нет серверов для отображения",
    langLabel: "Язык",
    loadedSummary: (total, available) => `Загружено ${total} серверов (${available} доступно)`,
    enableSources: "Использовать эти настройки",
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
    close: "Закрыть",
  },
  en: {
    title: "VPNGate Manager Pro",
    subtitle: "Web client to find and download .ovpn configurations",
    btnRefresh: "Refresh list",
    btnTestAll: "Test all",
    btnStop: "Stop",
    ready: "Ready",
    settingsSources: "Additional sources",
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
    btnDownload: "Download .ovpn",
    selectServer: "Select a server from the list",
    emptyList: "No servers to display",
    langLabel: "Language",
    loadedSummary: (total, available) => `Loaded ${total} servers (${available} available)`,
    enableSources: "Enable this section",
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
    close: "Close",
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
    els.serverList.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--muted);">${t('emptyList')}</td></tr>`;
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
    
    tr.innerHTML = `
      <td class="status-col" title="${title}"><span class="status-dot ${statusClass}">${statusIcon}</span></td>
      <td class="country-col">
          <img loading="lazy" src="https://flagcdn.com/w20/${s.country_short.toLowerCase()}.png" alt="${s.country_short}" class="flag" onerror="this.style.display='none'">
          ${s.country}
      </td>
      <td>${s.speed_mbps} Mbps</td>
      <td>${s.tested ? s.test_ping : s.ping} ms</td>
      <td>${s.sessions}</td>
      <td>${s.score}</td>
      <td>${s.name}</td>
    `;

    tr.addEventListener("click", () => selectIndex(idx));
    fragment.appendChild(tr);
  });
  els.serverList.appendChild(fragment);
}

function updateInfo() {
  if (selectedIndex < 0 || selectedIndex >= filtered.length) {
    els.info.textContent = t('selectServer');
    els.download.disabled = true;
    els.testSelected.disabled = true;
    return;
  }
  const s = filtered[selectedIndex];
  els.info.textContent = buildInfo(s, t);
  els.download.disabled = false;
  els.testSelected.disabled = false;
  
  if (window.innerWidth <= 768) {
    dom.sidebar.classList.add('visible');
    dom.mobileScrim.classList.add('visible');
    
    // Scroll to the selected server in the table if it's not visible
    const selectedRow = document.querySelector('.servers-table tbody tr.selected');
    if (selectedRow) {
      // Use smooth scrolling to bring the selected row into view
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function selectIndex(idx) {
  if (idx === selectedIndex && window.innerWidth <= 768 && dom.sidebar.classList.contains('visible')) {
    hideMobileInfo();
    return;
  }
  selectedIndex = idx;
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
  } else {
      selectedIndex = -1;
  }
  
  renderList();
  updateInfo();
  
  const availableCount = servers.filter(s => s.tested && s.available).length;
  document.querySelector('.subtitle').textContent = t('loadedSummary', servers.length, availableCount);
}

async function loadServers() {
  try {
    els.refresh.disabled = true;
    els.download.disabled = true;
    els.testAll.disabled = true;
    els.testSelected.disabled = true;
    setStatus(t('statusLoading'));
    setProgress(0);
    log(t('logLoading'));
    servers = await fetchServers(setProgress);
    setProgress(100);
    setStatus(t('statusLoaded', servers.length));
    log(t('logLoaded', servers.length));
    
    const countries = Array.from(new Set(servers.map(s => s.country))).sort();
    const currentCountry = els.countryFilter.value;
    els.countryFilter.innerHTML = `<option value="">${t('filterCountryAll')}</option>` +
    countries.map(c => `<option value="${c}" ${c === currentCountry ? 'selected' : ''}>${c}</option>`).join("");
    
    // After loading, if a server was selected, the info might be stale.
    // Let's re-select to update info, or clear if it's gone.
    const reselected = selectedIndex > -1 && filtered[selectedIndex] ? filtered[selectedIndex] : null;
    if (!reselected) {
        selectedIndex = -1;
        hideMobileInfo();
    }
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

function setTestButtonState(testing) {
    const textEl = els.testSelected.querySelector('.btn-text');
    const spinnerEl = els.testSelected.querySelector('.spinner');
    if (testing) {
        els.testSelected.disabled = true;
        textEl.style.display = 'none';
        spinnerEl.style.display = 'inline-block';
    } else {
        els.testSelected.disabled = selectedIndex < 0;
        textEl.style.display = 'inline-block';
        spinnerEl.style.display = 'none';
    }
}

async function testServer(server, batchMode = false) {
  if (!batchMode) {
      setStatus(t('statusTestingServer', server.name));
      setTestButtonState(true);
  }
  server.testing = true;
  if (!batchMode) applyFiltersAndSort();

  els.testAll.disabled = true;
  
  const timeout = 10; // Default timeout
  
  try {
    const tester = testServerConnection(server.ip, server.port, server.proto, timeout);
    currentTest = tester;
    const result = await tester.test();
    
    server.tested = true;
    server.available = result.success;
    server.test_ping = result.ping;
    
    const message = t(`test_${result.reasonKey}`) || result.reasonKey;

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
        setTestButtonState(false);
    }
    els.testAll.disabled = false;
    currentTest = null;
    if (!batchMode) applyFiltersAndSort();
  }
}

function downloadSelected() {
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
  document.getElementById('lang').value = currentLang;

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
  document.querySelector('.advanced-settings summary').textContent = t('settingsSources');
  document.querySelector('label.block:nth-of-type(1)').firstChild.textContent = t('apiUrl') + ' ';
  document.querySelector('label.block:nth-of-type(2)').firstChild.textContent = t('mirrors') + ' ';
  document.querySelector('label.block:nth-of-type(3)').firstChild.textContent = t('threads') + ' ';
  els.saveSources.textContent = t('save');
  els.resetSources.textContent = t('reset');
  els.enableSourcesLabel.textContent = t('enableSources');
  els.clearLog.textContent = t('clearLog');
  document.getElementById('closeInfo')?.setAttribute('aria-label', t('close'));
  
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
  document.getElementById('i18n-log-header').textContent = t('logTitle');
  document.getElementById('i18n-info-header').textContent = t('infoTitle');
  // Buttons in info card
  els.testSelected.querySelector('.btn-text').textContent = t('btnTest');
  els.download.textContent = t('btnDownload');
  // Table headers
  const ths = document.querySelectorAll('.servers-table thead th');
  if (ths.length >= 7) {
    ths[1].textContent = t('thCountry');
    ths[2].textContent = t('thSpeed');
    ths[3].textContent = t('thPing');
    ths[4].textContent = t('thSessions');
    ths[5].textContent = t('thScore');
    ths[6].textContent = t('thName');
  }
  // Lang label
  document.getElementById('i18n-lang-label').textContent = t('langLabel');
}

function hideMobileInfo() {
    if (window.innerWidth <= 768) {
        dom.sidebar.classList.remove('visible');
        dom.mobileScrim.classList.remove('visible');
    }
    const currentSelected = document.querySelector('.servers-table tr.selected');
    if (currentSelected) {
      currentSelected.classList.remove('selected');
    }
    // Don't fully deselect, just hide panel. Re-clicking will show it again.
    // selectedIndex = -1;
    // updateInfo();
}

function bindEvents() {
  els.refresh.addEventListener("click", loadServers);
  els.download.addEventListener("click", downloadSelected);
  els.testSelected.addEventListener("click", testSelectedServer);
  els.testAll.addEventListener("click", testAllServers);
  
  // Handle window resize to adjust mobile layout
  window.addEventListener('resize', () => {
    // If we're switching from mobile to desktop view, ensure sidebar is visible
    if (window.innerWidth > 768) {
      dom.sidebar.classList.remove('visible');
      dom.mobileScrim.classList.remove('visible');
    } else if (selectedIndex >= 0 && !dom.sidebar.classList.contains('visible')) {
      // If we're on mobile and sidebar was hidden, show it if needed
      dom.sidebar.classList.add('visible');
      dom.mobileScrim.classList.add('visible');
    }
  });
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
  
  document.getElementById('lang').addEventListener('change', (e) => {
    currentLang = e.target.value;
    localStorage.setItem('vpngate-lang', currentLang);
    applyI18nStatic();
    applyFiltersAndSort(); // This re-renders everything with new text
  });

  dom.mobileScrim.addEventListener('click', hideMobileInfo);
  document.getElementById('closeInfo')?.addEventListener('click', hideMobileInfo);
}

// Init
(function init() {
  restoreSettings();
  applyI18nStatic();
  try {
    const src = JSON.parse(localStorage.getItem("vpngate-sources") || "null");
    if (src) setConfig(src);
  } catch (e) {
    console.error("Error applying sources:", e);
  }
  bindEvents();
  updateSortHeaders();
  loadServers();
})();