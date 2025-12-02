/**
 * @typedef {'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'auth' | 'error' | 'exit' | 'unknown'} VPNStatus
 */

/* @tweakable Custom compression directive added to configurations to fix LZO errors (e.g., 'comp-lzo no' or '') */
const customCompressionDirective = ''; // Set to empty string to prevent injection of 'comp-lzo' which caused error 42.

/**
 * @tweakable Mobile optimization directives for OpenVPN config
 */
const mobileOptimizations = {
  enabled: true,
  directives: `
  connect-retry-max 3
  connect-retry 5
  resolv-retry 10
  auth-retry none
  ping 10
  ping-exit 60
  ping-restart 30
  float
  script-security 2
  persist-tun
  persist-key
  nobind
  tun-mtu 1500
  mssfix 1450
  reneg-sec 0
  ` // Removed 'comp-lzo' directive to prevent 'Bad LZO decompression header byte: 42' error
};

/* @tweakable How much OpenVPN internal detail to log: 'minimal' | 'normal' | 'verbose' | 'debug' */
const logVerbosity = 'verbose';
/* @tweakable Redact sensitive config fields in logs */
const redactSensitive = true;
/* @tweakable Number of config lines to include as a snippet in logs (0 = none) */
const configSnippetLines = 6;

/* @tweakable Global name of the Android WebView bridge that proxies ics-openvpn */
const icsBridgeGlobal = 'AndroidICSOpenVPN';
/* @tweakable Poll interval for ICS status (ms) */
const statusPollIntervalMs = 1500;
/* @tweakable Credentials used for OpenVPN connections */
const vpnCredentials = { username: 'vpn', password: 'vpn' };

function emitLog(level, message) {
  document.dispatchEvent(new CustomEvent('vpnConnectionLog', { detail: { level, message } }));
}

/**
 * Service to interact with the OpenVPN Capacitor plugin.
 * Handles connection, disconnection, and status/log event listeners.
 */
export class OpenVPNService {
  constructor() {
    this.isConnected = false;
    this.currentConfig = null;
    this.vpnAvailable = false;
    this.lastStatus = 'disconnected';
    this.backend = 'none'; // 'capacitor' | 'ics' | 'none'
    this.pollId = null;
  }

  async initialize() {
    try {
      if (typeof window.OpenVpn !== 'undefined') {
        this.backend = 'capacitor';
        this.vpnAvailable = true;
        document.addEventListener('openvpnStatus', (e) => this.handleVPNStatus(e));
        document.addEventListener('openvpnLog', (e) => this.handleVPNLog(e));
        emitLog('info', 'OpenVPN plugin detected. Initializing...');
        const status = await this.getStatus();
        this.isConnected = status === 'connected';
        console.log('OpenVPN service initialized successfully');
        return true;
      }
      // Try ics-openvpn WebView bridge
      if (typeof window[icsBridgeGlobal] !== 'undefined') {
        this.backend = 'ics';
        this.vpnAvailable = true;
        emitLog('info', `ICS OpenVPN bridge detected: ${icsBridgeGlobal}`);
        // Optional native-to-web events
        window.addEventListener?.('icsOpenvpnStatus', (e) => this.handleVPNStatus(e));
        window.addEventListener?.('icsOpenvpnLog', (e) => this.handleVPNLog(e));
        const status = await this.getStatus();
        this.isConnected = status === 'connected';
        return true;
      }
      console.warn('OpenVPN plugin not available. Direct connection is disabled.');
      emitLog('warn', 'OpenVPN plugin not available. Falling back to config download.');
      return false;
    } catch (error) {
      console.error('OpenVPN service initialization failed:', error);
      emitLog('error', `OpenVPN init failed: ${error.message}`);
      return false;
    }
  }

  async connect(configBase64, serverName) {
    if (!this.vpnAvailable) throw new Error('OpenVPN plugin not available');
    try {
      const t0 = performance.now();
      const configText = this.prepareConfig(configBase64);
      const meta = this.parseConfigMeta(configText);
      this.currentConfig = { config: configText, name: serverName, timestamp: Date.now() };
      emitLog('info', `Connecting to ${serverName} (${meta.remoteHost || 'remote?'}:${meta.port || '?'}/${meta.proto || '?'})`);
      if (this.backend === 'capacitor') {
        await window.OpenVpn.connect(configText, vpnCredentials.username, vpnCredentials.password);
      } else if (this.backend === 'ics') {
        window[icsBridgeGlobal].connect(configText, vpnCredentials.username, vpnCredentials.password);
        this.startIcsPolling(); // poll status if bridge doesn't emit events
      }
      emitLog('info', `OpenVPN.connect invoked in ${Math.round(performance.now() - t0)}ms`);
      return true;
    } catch (error) {
      console.error('OpenVPN connect error:', error);
      emitLog('error', `Connect error: ${error.message}`);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (!this.vpnAvailable) throw new Error('OpenVPN plugin not available');
    try {
      emitLog('info', 'Disconnecting OpenVPN...');
      if (this.backend === 'capacitor') {
        await window.OpenVpn.disconnect();
      } else if (this.backend === 'ics') {
        this.stopIcsPolling();
        window[icsBridgeGlobal].disconnect();
      }
      emitLog('info', 'Disconnect request sent.');
      return true;
    } catch (error) {
      console.error('OpenVPN disconnect error:', error);
      emitLog('error', `Disconnect error: ${error.message}`);
      throw error;
    }
  }

  async getStatus() {
    if (!this.vpnAvailable) return 'disconnected';
    try {
      const status = this.backend === 'capacitor'
      ? await window.OpenVpn.getStatus()
      : (typeof window[icsBridgeGlobal]?.getStatus === 'function' ? await window[icsBridgeGlobal].getStatus() : 'unknown');
      if (logVerbosity === 'debug') emitLog('debug', `Polled status: ${status}`);
      this.isConnected = status === 'connected';
      return status;
    } catch (error) {
      console.error('OpenVPN status error:', error);
      emitLog('error', `Status error: ${error.message}`);
      return 'disconnected';
    }
  }

  prepareConfig(configBase64) {
    try {
      const raw = atob(configBase64);
      let content = raw;
      let addedAuth = false, addedMobile = false;
      if (!content.includes("auth-user-pass")) {
        content += `\n# --- VPNGate Manager Pro ---\n# Username: vpn\n# Password: vpn\nauth-user-pass\n# -------------------------`;
        addedAuth = true;
      }
      if (mobileOptimizations.enabled && !content.includes("script-security")) {
        content += `\n# Mobile optimizations\n${mobileOptimizations.directives.trim()}`;

        // Inject custom compression directive if provided
        if (customCompressionDirective) {
          content += `\n${customCompressionDirective}`;
        }

        addedMobile = true;
      }
      if (logVerbosity !== 'minimal') {
        emitLog('debug', `Config prepared. addedAuth=${addedAuth}, addedMobile=${addedMobile}`);
      }
      if (configSnippetLines > 0 && logVerbosity === 'debug') {
        const snippet = content.split(/\r?\n/).slice(0, configSnippetLines).join('\n');
        emitLog('debug', `Config snippet:\n${snippet}`);
      }
      return content;
    } catch (error) {
      emitLog('error', `Config preparation error: ${error.message}`);
      throw new Error(`Config preparation error: ${error.message}`);
    }
  }

  async testConnection(configBase64, timeout = 15000) {
    return new Promise(async (resolve, reject) => {
      if (!this.vpnAvailable) {
        return resolve({ success: false, error: 'Plugin not available' });
      }

      let timeoutId;
      const cleanup = () => {
        clearTimeout(timeoutId);
        document.removeEventListener('vpnConnectionStatus', statusHandler);
      };

      const statusHandler = (event) => {
        const { status } = event.detail;

        if (status === 'connected') {
          cleanup();
          this.disconnect().finally(() => {
            resolve({ success: true });
          });
        } else if (status === 'error' || status === 'disconnected') {
          cleanup();
          resolve({ success: false, error: status });
        }
      };

      document.addEventListener('vpnConnectionStatus', statusHandler);

      timeoutId = setTimeout(() => {
        cleanup();
        this.disconnect().catch(() => {});
        resolve({ success: false, error: 'timeout' });
      }, timeout);

      try {
        await this.connect(configBase64, 'test-connection');
      } catch (error) {
        cleanup();
        resolve({ success: false, error: error.message });
      }
    });
  } // Закрывающая скобка для testConnection

  /**
   * Universal handler for status updates, regardless of source (Capacitor/ICS/Polling)
   * @param {CustomEvent | string} event
   */
  handleVPNStatus(event) {
    // Attempt to extract status string from event detail, or use the event itself if it's a raw string payload
    let status = 'unknown';
    if (typeof event === 'string') {
      status = event;
    } else if (event && typeof event.detail?.status === 'string') {
      status = event.detail.status;
    } else if (event && typeof event.status === 'string') { // Fallback for simple objects if detail is missing
      status = event.status;
    }

    const prev = this.lastStatus;
    this.isConnected = status === 'connected';
    if (status === 'disconnected' || status === 'error' || status === 'exit') {
      this.currentConfig = null;
      this.stopIcsPolling();
    }
    if (logVerbosity !== 'minimal' && status !== 'unknown') emitLog('info', `Status: ${prev} -> ${status}`);
    this.lastStatus = status;
    const statusEvent = new CustomEvent('vpnConnectionStatus', {
      detail: { status, configName: this.currentConfig?.name }
    });
    document.dispatchEvent(statusEvent);
  }

  handleVPNLog(event) {
    const level = event.detail?.level || 'info';
    const rawMsg = event.detail?.message ?? String(event?.message ?? event ?? '');
    const msg = redactSensitive ? rawMsg.replace(/auth-user-pass.*$/mi, 'auth-user-pass [REDACTED]') : rawMsg;
    const logEvent = new CustomEvent('vpnConnectionLog', { detail: { message: msg, level } });
    document.dispatchEvent(logEvent);
  }

  isVPNConnected() {
    return this.isConnected;
  }

  parseConfigMeta(text) {
    const lines = text.split(/\r?\n/);
    const meta = { proto: null, port: null, remoteHost: null, ciphers: [] };
    for (const l of lines) {
      const line = l.trim();
      if (line.startsWith('proto ')) meta.proto = line.split(/\s+/)[1]?.toLowerCase();
      if (line.startsWith('remote ')) { const parts = line.split(/\s+/); meta.remoteHost = parts[1]; meta.port = parseInt(parts[2], 10) || meta.port; }
      if (line.startsWith('port ')) meta.port = parseInt(line.split(/\s+/)[1], 10) || meta.port;
      if (line.startsWith('cipher ')) meta.ciphers.push(line.split(/\s+/)[1]);
      if (line.startsWith('data-ciphers ')) meta.ciphers.push(...line.replace('data-ciphers ','').split(':'));
    }
    return meta;
  }

  startIcsPolling() {
    this.stopIcsPolling();
    this.pollId = setInterval(async () => {
      try {
        const s = await this.getStatus();
        if (s && s !== this.lastStatus) this.handleVPNStatus({ detail: { status: s } });
      } catch (error) {
        console.error('ICS polling error:', error);
        if (logVerbosity === 'debug') {
          emitLog('debug', `ICS polling error: ${error.message}`);
        }
      }
    }, statusPollIntervalMs);
  }

  stopIcsPolling() {
    if (this.pollId) { clearInterval(this.pollId); this.pollId = null; }
  }
} // ← Конец класса OpenVPNService


/* @tweakable URL Python сервера для тестирования */
const PYTHON_SERVER_URL = 'http://localhost:8090';

// Обновляем функцию тестирования в vpngate.js
export function testServerConnection(ip, port = 1194, proto = 'udp', timeout = 10, configBase64 = null) {
  // Если есть конфиг и Python сервер доступен, используем его для тестирования
  if (configBase64) {
    // Сначала проверяем доступность Python сервера
    return checkPythonServer().then(available => {
      if (available) {
        return new PythonServerTester(configBase64, 15);
      } else {
        // Fallback к WebRTC тестированию
        return new WebRTCConnectionTester(ip, port, proto, timeout);
      }
    });
  }

  // Иначе используем старый метод проверки порта
  return new WebRTCConnectionTester(ip, port, proto, timeout);
}

// Функция проверки доступности Python сервера
async function checkPythonServer() {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/api/vpn/status`, {
      method: 'GET',
      timeout: 3000
    });
    return response.ok;
  } catch {
    return false;
  }
}