import './style.css';
import { Adb, AdbDaemonTransport } from '@yume-chan/adb';
import { AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';

// DOM Elements
const startAuditBtn = document.getElementById('startAuditBtn');
const connectionStatus = document.getElementById('connectionStatus');
const connectionStatusText = document.getElementById('connectionStatusText');
const authPromptInstruction = document.getElementById('authPromptInstruction');
const consoleBody = document.getElementById('consoleBody');
const auditResults = document.getElementById('auditResults');
const modelResultItem = document.getElementById('modelResultItem');
const deviceModelText = document.getElementById('deviceModelText');

// Interactive Toggles
const usbDebugToggle = document.getElementById('usbDebugToggle');
const wifiDebugToggle = document.getElementById('wifiDebugToggle');
const sideloadToggle = document.getElementById('sideloadToggle');
const verifierToggle = document.getElementById('verifierToggle');

// System Vitals
const vitalDevMenuBadge = document.getElementById('vitalDevMenuBadge');
const vitalDevMenuDesc = document.getElementById('vitalDevMenuDesc');
const vitalSelinuxBadge = document.getElementById('vitalSelinuxBadge');
const vitalSelinuxDesc = document.getElementById('vitalSelinuxDesc');
const vitalEncryptBadge = document.getElementById('vitalEncryptBadge');
const vitalEncryptDesc = document.getElementById('vitalEncryptDesc');
const vitalRootBadge = document.getElementById('vitalRootBadge');
const vitalRootDesc = document.getElementById('vitalRootDesc');

// Security Report DOM Elements
const securityReportPanel = document.getElementById('securityReportPanel');
const securityStatusBadge = document.getElementById('securityStatusBadge');
const mitigationContent = document.getElementById('mitigationContent');
const disconnectBtn = document.getElementById('disconnectBtn');

// Active ADB session state
let activeAdb = null;
let isAuditing = false; // Flag to prevent toggle event loops

// Logger helper
function log(message, type = 'info') {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  const line = document.createElement('div');
  line.className = 'log-line';
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${timeStr}]`;
  
  const textSpan = document.createElement('span');
  textSpan.className = `log-${type}`;
  textSpan.textContent = message;
  
  line.appendChild(timeSpan);
  line.appendChild(textSpan);
  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Check Browser Compatibility on Load
const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
if (!manager) {
  log('Compatibility Error: WebUSB is not supported in this browser. Please use Chrome, Edge, or Brave.', 'error');
  connectionStatus.className = 'connection-status disconnected';
  connectionStatusText.textContent = 'WebUSB Unsupported';
  startAuditBtn.disabled = true;
  startAuditBtn.className = 'btn btn-disabled';
} else {
  log('ShieldDroid initialized. Browser WebUSB interface is ready.', 'info');
}

// Store for private/public RSA keys in IndexedDB
const credentialStore = new AdbWebCredentialStore('shielddroid-keys-store');

// Disconnect & Clean Up click listener
disconnectBtn.addEventListener('click', async () => {
  log('Safely terminating WebUSB ADB session...', 'command');
  if (activeAdb) {
    try {
      await activeAdb.close();
      log('ADB session closed successfully.', 'success');
    } catch (err) {
      log(`Error during ADB closure: ${err.message}`, 'error');
    }
    activeAdb = null;
  }
  
  // Hide results and report panels
  auditResults.style.display = 'none';
  securityReportPanel.style.display = 'none';
  modelResultItem.style.display = 'none';
  
  log('Clean up complete. USB interface released.', 'info');
  resetUI();
});

// Click listener to initialize audit
startAuditBtn.addEventListener('click', async () => {
  if (!manager) return;
  
  log('Starting Device Security Audit...', 'info');
  log('Requesting WebUSB permission for Android Debug Bridge...', 'command');
  
  startAuditBtn.disabled = true;
  startAuditBtn.textContent = 'Auditing...';
  
  connectionStatus.className = 'connection-status connecting';
  connectionStatusText.textContent = 'Requesting Device';
  
  let device;
  try {
    device = await manager.requestDevice({
      filters: [{
        classCode: 255,
        subclassCode: 66,
        protocolCode: 1
      }]
    });
    
    if (!device) {
      throw new Error('No device selected or user cancelled the device selection.');
    }
    
    log(`Device selected: ${device.name || 'Android Device'} (Serial: ${device.serial || 'Unknown'})`, 'success');
    connectionStatusText.textContent = 'Connecting...';
    
  } catch (err) {
    log(`Device selection failed: ${err.message}`, 'error');
    resetUI();
    return;
  }
  
  let connection;
  try {
    log('Claiming USB ADB Interface and opening streams...', 'info');
    connection = await device.connect();
    log('USB interface claimed successfully.', 'success');
  } catch (err) {
    log(`USB connection failed: ${err.message}`, 'error');
    if (err.name === 'NetworkError' || err.message.includes('busy') || err.message.includes('claim')) {
      log('Suggestion: Ensure that any native ADB server running on your computer is stopped. Run "adb kill-server" in your terminal.', 'warning');
    }
    resetUI();
    return;
  }
  
  // Perform RSA Authentication Handshake
  try {
    log('Starting cryptographic handshake. Checking RSA key store in IndexedDB...', 'info');
    connectionStatusText.textContent = 'Authenticating';
    
    // Toggle on visual instruction for device popup approval
    authPromptInstruction.classList.add('active');
    log('ACTION REQUIRED: Please check your Android device screen and accept the prompt to "Allow USB Debugging" from this computer.', 'warning');
    
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore
    });
    
    authPromptInstruction.classList.remove('active');
    
    // Successful Authentication
    connectionStatus.className = 'connection-status connected';
    connectionStatusText.textContent = 'Secure Connection Established. Ready to Audit';
    log('Secure Connection Established. Ready to Audit', 'success');
    log('Device paired successfully using RSA key from IndexedDB.', 'success');
    
    activeAdb = new Adb(transport);
    
    // Run Security Audit Commands
    await runSecurityChecks(activeAdb);
    
  } catch (err) {
    authPromptInstruction.classList.remove('active');
    log(`Authentication Handshake failed: ${err.message}`, 'error');
    resetUI();
  }
});

// Run security audits using ADB Shell Subprocess API
async function runSecurityChecks(adb) {
  try {
    isAuditing = true; // Block change events during state updates
    log('Initiating device profile audit...', 'command');
    
    // Query device model
    const rawModel = await adb.subprocess.noneProtocol.spawnWaitText('getprop ro.product.model');
    const model = rawModel ? rawModel.trim() : 'Unknown Android Device';
    
    // Query Android version
    const rawVersion = await adb.subprocess.noneProtocol.spawnWaitText('getprop ro.build.version.release');
    const version = rawVersion ? rawVersion.trim() : 'Unknown';
    
    // Query Security Patch level
    const rawPatch = await adb.subprocess.noneProtocol.spawnWaitText('getprop ro.build.version.security_patch');
    const patch = rawPatch ? rawPatch.trim() : 'Unknown';
    
    log(`Audited Device: ${model} running Android version ${version}`, 'success');
    log(`Current Security Patch Level: ${patch}`, 'info');
    
    // Update Profile UI
    deviceModelText.textContent = `${model} (Android ${version}, Security Patch: ${patch})`;
    modelResultItem.style.display = 'block';
    
    log('Querying device security vitals and toggles...', 'command');
    
    // 1. USB Debugging Status
    const rawAdbEnabled = await adb.subprocess.noneProtocol.spawnWaitText('settings get global adb_enabled');
    const adbEnabled = rawAdbEnabled ? rawAdbEnabled.trim() : '0';
    usbDebugToggle.checked = (adbEnabled === '1');
    usbDebugToggle.disabled = false;

    // 2. Wireless Debugging Status
    const rawWifiEnabled = await adb.subprocess.noneProtocol.spawnWaitText('settings get global adb_wifi_enabled');
    const adbWifiEnabled = rawWifiEnabled ? rawWifiEnabled.trim() : '0';
    wifiDebugToggle.checked = (adbWifiEnabled === '1');
    wifiDebugToggle.disabled = false;

    // 3. Sideloading (Unknown Sources)
    const rawSideload = await adb.subprocess.noneProtocol.spawnWaitText('settings get global install_non_market_apps');
    const sideloadEnabled = rawSideload ? rawSideload.trim() : '0';
    sideloadToggle.checked = (sideloadEnabled === '1');
    sideloadToggle.disabled = false;

    // 4. Package Verification (Play Protect / Verify Apps)
    const rawVerifier = await adb.subprocess.noneProtocol.spawnWaitText('settings get global package_verifier_enable');
    const verifierEnabled = rawVerifier ? rawVerifier.trim() : '0';
    verifierToggle.checked = (verifierEnabled === '1');
    verifierToggle.disabled = false;

    // 5. Developer Menu Status Vital
    const rawDevMenu = await adb.subprocess.noneProtocol.spawnWaitText('settings get global development_settings_enabled');
    const devMenuEnabled = rawDevMenu ? rawDevMenu.trim() : '0';
    if (devMenuEnabled === '1') {
      vitalDevMenuBadge.className = 'badge badge-warning';
      vitalDevMenuBadge.textContent = 'Active';
      vitalDevMenuDesc.textContent = 'Developer Options are active, revealing diagnostic APIs to host PC.';
    } else {
      vitalDevMenuBadge.className = 'badge badge-success';
      vitalDevMenuBadge.textContent = 'Secure';
      vitalDevMenuDesc.textContent = 'Developer Options menu is hidden from system settings.';
    }

    // 6. SELinux Kernel State Vital
    let selinux = 'Unknown';
    try {
      const rawSelinux = await adb.subprocess.noneProtocol.spawnWaitText('getenforce');
      selinux = rawSelinux ? rawSelinux.trim() : 'Unknown';
    } catch (e) {
      console.error(e);
    }
    if (selinux === 'Enforcing') {
      vitalSelinuxBadge.className = 'badge badge-success';
      vitalSelinuxBadge.textContent = 'Enforcing';
      vitalSelinuxDesc.textContent = 'Standard kernel-level security rules are strictly active.';
    } else if (selinux === 'Permissive' || selinux === 'Disabled') {
      vitalSelinuxBadge.className = 'badge badge-danger';
      vitalSelinuxBadge.textContent = selinux.toUpperCase();
      vitalSelinuxDesc.textContent = 'SELinux is disabled/permissive. Android kernel sandbox is bypassed!';
    } else {
      vitalSelinuxBadge.className = 'badge';
      vitalSelinuxBadge.textContent = 'Unknown';
      vitalSelinuxDesc.textContent = 'Could not verify device SELinux integrity.';
    }

    // 7. System Encryption State Vital
    let encryption = 'Unknown';
    try {
      const rawEncrypt = await adb.subprocess.noneProtocol.spawnWaitText('getprop ro.crypto.state');
      encryption = rawEncrypt ? rawEncrypt.trim() : 'Unknown';
    } catch (e) {
      console.error(e);
    }
    if (encryption === 'encrypted') {
      vitalEncryptBadge.className = 'badge badge-success';
      vitalEncryptBadge.textContent = 'Encrypted';
      vitalEncryptDesc.textContent = 'Full filesystem encryption is active. Files are protected when locked.';
    } else if (encryption === 'unencrypted') {
      vitalEncryptBadge.className = 'badge badge-danger';
      vitalEncryptBadge.textContent = 'Raw Files';
      vitalEncryptDesc.textContent = 'Filesystem is unencrypted! Device storage is susceptible to extraction.';
    } else {
      vitalEncryptBadge.className = 'badge badge-info';
      vitalEncryptBadge.textContent = encryption.toUpperCase();
      vitalEncryptDesc.textContent = `FileSystem cryptography state is: ${encryption}.`;
    }

    // 8. Root Access / Safe Build Vital
    let rooted = false;
    try {
      const rawSu = await adb.subprocess.noneProtocol.spawnWaitText('which su');
      if (rawSu && rawSu.trim().length > 0 && !rawSu.includes('not found')) {
        rooted = true;
      }
    } catch (e) {
      console.error(e);
    }
    if (rooted) {
      vitalRootBadge.className = 'badge badge-danger';
      vitalRootBadge.textContent = 'Rooted';
      vitalRootDesc.textContent = 'Superuser su binary detected. Android sandbox limits are fully compromise-prone.';
      log('WARNING: Superuser (su) binary detected! Device is rooted.', 'warning');
    } else {
      vitalRootBadge.className = 'badge badge-success';
      vitalRootBadge.textContent = 'Safe Build';
      vitalRootDesc.textContent = 'No su binaries found. Standard user sandbox borders are preserved.';
    }

    // Run Network Exposure Auditing
    log('Auditing Network Debugging configurations...', 'command');
    const netAudit = await auditNetworkSecurity(adb);

    // Reveal Audit Results container in DOM
    auditResults.style.display = 'flex';
    log('Security vitals load complete.', 'success');

    // Generate Security Report & Mitigation UI
    securityReportPanel.style.display = 'flex';
    mitigationContent.innerHTML = '';
    
    if (netAudit.activeConnections > 0) {
      // 1. Critical Alert (Red)
      securityReportPanel.style.borderColor = 'rgba(255, 77, 77, 0.4)';
      securityReportPanel.style.boxShadow = '0 0 15px rgba(255, 77, 77, 0.15)';
      securityStatusBadge.className = 'badge badge-danger';
      securityStatusBadge.style.backgroundColor = 'rgba(255, 77, 77, 0.15)';
      securityStatusBadge.style.color = '#f87171';
      securityStatusBadge.style.border = '1px solid rgba(255, 77, 77, 0.3)';
      securityStatusBadge.textContent = 'Critical Alert';
      
      const ipList = netAudit.connectionList.join(', ');
      
      mitigationContent.innerHTML = `
        <p style="color: var(--color-danger); font-weight: 600; font-size: 1rem; margin: 0;">⚠️ ACTIVE ATTACK VECTOR DETECTED</p>
        <p style="margin: 0;">An active remote session is established from IP: <strong style="color: #fff; font-family: var(--font-mono);">${ipList}</strong>. A remote host has complete terminal/shell access to your device over the network.</p>
        <p style="font-weight: 600; color: #fff; margin: 0.5rem 0 0 0;">Urgent Mitigation Steps:</p>
        <ol style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; padding: 0;">
          <li>Disconnect your phone's Wi-Fi network or unplug the network interface immediately to break the remote channel.</li>
          <li>On your phone, navigate to <strong>Settings</strong> &gt; <strong>Developer Options</strong>.</li>
          <li>Scroll down and tap <strong>"Revoke USB debugging authorizations"</strong>. This will instantly delete all authorized RSA keys, blocking any further connection attempts until manually re-paired.</li>
        </ol>
        <button id="disableWifiDebugBtn" class="btn" style="background: rgba(255, 77, 77, 0.15); border: 1px solid var(--color-danger); color: #fff; width: 100%; max-width: 100%; font-size: 0.9rem; padding: 0.75rem 1.5rem; margin-top: 0.5rem; cursor: pointer; border-radius: 8px;">
          Disable Wireless Debugging Now
        </button>
      `;
      document.getElementById('disableWifiDebugBtn').addEventListener('click', executeWifiDisableMitigation);
      log('CRITICAL SECURITY REPORT: Active wireless connection detected. Mitigation required immediately!', 'error');
      
    } else if (netAudit.legacyWifi || netAudit.modernWifi) {
      // 2. Vulnerable (Orange)
      securityReportPanel.style.borderColor = 'rgba(255, 159, 67, 0.4)';
      securityReportPanel.style.boxShadow = '0 0 15px rgba(255, 159, 67, 0.15)';
      securityStatusBadge.className = 'badge';
      securityStatusBadge.style.backgroundColor = 'rgba(255, 159, 67, 0.15)';
      securityStatusBadge.style.color = 'var(--color-warning)';
      securityStatusBadge.style.border = '1px solid rgba(255, 159, 67, 0.3)';
      securityStatusBadge.textContent = 'Vulnerable';
      
      mitigationContent.innerHTML = `
        <p style="color: var(--color-warning); font-weight: 600; font-size: 1rem; margin: 0;">⚠️ NETWORK EXPOSURE DETECTED</p>
        <p style="margin: 0;">Wireless Debugging is currently <strong>enabled</strong>, but there are no active connections. Leaving wireless debugging active on public Wi-Fi networks (airports, cafes) exposes your device ports (e.g. 5555) to remote network scanners and exploit tools.</p>
        <p style="font-weight: 600; color: #fff; margin: 0.5rem 0 0 0;">Mitigation Steps to Secure Your Device:</p>
        <ol style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; padding: 0;">
          <li>Open your phone's <strong>Settings</strong>.</li>
          <li>Go to <strong>System</strong> &gt; <strong>Developer Options</strong>.</li>
          <li>Toggle off <strong>Wireless Debugging</strong> (or run <code>adb tcpip -1</code> to turn off legacy network listening).</li>
          <li>Make it a habit to only enable debugging interfaces when actively developing apps in secure environments.</li>
        </ol>
        <button id="disableWifiDebugBtn" class="btn" style="background: rgba(255, 159, 67, 0.15); border: 1px solid var(--color-warning); color: #fff; width: 100%; max-width: 100%; font-size: 0.9rem; padding: 0.75rem 1.5rem; margin-top: 0.5rem; cursor: pointer; border-radius: 8px;">
          Disable Wireless Debugging Now
        </button>
      `;
      document.getElementById('disableWifiDebugBtn').addEventListener('click', executeWifiDisableMitigation);
      log('SECURITY REPORT: Device is vulnerable to network scanning. Mitigation recommended.', 'warning');
      
    } else {
      // 3. Secure (Green)
      securityReportPanel.style.borderColor = 'rgba(0, 245, 160, 0.4)';
      securityReportPanel.style.boxShadow = '0 0 15px rgba(0, 245, 160, 0.15)';
      securityStatusBadge.className = 'badge badge-success';
      securityStatusBadge.style.backgroundColor = 'rgba(0, 245, 160, 0.1)';
      securityStatusBadge.style.color = 'var(--color-success-hex)';
      securityStatusBadge.style.border = '1px solid rgba(0, 245, 160, 0.3)';
      securityStatusBadge.textContent = 'Secure';
      
      mitigationContent.innerHTML = `
        <p style="color: var(--color-success-hex); font-weight: 600; font-size: 1rem; margin: 0;">✅ SECURITY AUDIT PASSED</p>
        <p style="margin: 0;">No network debugging features are active and no remote ADB sessions were found. Congratulation on practicing excellent Android device hygiene!</p>
        <p style="margin: 0;">Your device's exposure level to unauthorized local network access via ADB is zero.</p>
      `;
      log('SECURITY REPORT: Secure status verified. Good device hygiene detected.', 'success');
    }
    
  } catch (err) {
    log(`Failed to execute security audit shell commands: ${err.message}`, 'error');
  } finally {
    isAuditing = false;
    startAuditBtn.disabled = false;
    startAuditBtn.textContent = 'Re-Run Security Audit';
  }
}

// UI Reset helper on failure
function resetUI() {
  startAuditBtn.disabled = false;
  startAuditBtn.textContent = 'Start Security Audit';
  connectionStatus.className = 'connection-status disconnected';
  connectionStatusText.textContent = 'Disconnected';
  
  // Disable switch checkboxes when disconnected
  usbDebugToggle.disabled = true;
  wifiDebugToggle.disabled = true;
  sideloadToggle.disabled = true;
  verifierToggle.disabled = true;
}

// Executes wireless debugging mitigation shell commands
async function executeWifiDisableMitigation() {
  if (!activeAdb) {
    log('No active ADB connection to apply mitigation.', 'error');
    return;
  }
  
  const disableBtn = document.getElementById('disableWifiDebugBtn');
  if (disableBtn) {
    disableBtn.disabled = true;
    disableBtn.textContent = 'Executing Commands...';
  }
  
  log('Executing wireless debugging mitigation commands...', 'command');
  
  try {
    log('Running: settings put global adb_wifi_enabled 0', 'command');
    await activeAdb.subprocess.noneProtocol.spawnWaitText('settings put global adb_wifi_enabled 0');
    
    log('Running: setprop service.adb.tcp.port -1', 'command');
    await activeAdb.subprocess.noneProtocol.spawnWaitText('setprop service.adb.tcp.port -1');
    
    log('Mitigation commands executed. Re-running security audit...', 'info');
    await runSecurityChecks(activeAdb);
    
  } catch (err) {
    log(`Failed to execute mitigation commands: ${err.message}`, 'error');
    if (disableBtn) {
      disableBtn.disabled = false;
      disableBtn.textContent = 'Disable Wireless Debugging Now';
    }
  }
}

// Audit Engine function to silently run read-only network checks
export async function auditNetworkSecurity(adb) {
  let legacyWifi = false;
  let modernWifi = false;
  let activeConnections = 0;
  let tcpPort = 0;
  let connectionList = [];

  // 1. Check Legacy TCP/IP Debugging (Android 10 and older)
  try {
    const tcpPortStr = (await adb.subprocess.noneProtocol.spawnWaitText('getprop service.adb.tcp.port')).trim();
    const port = parseInt(tcpPortStr, 10);
    if (!isNaN(port) && port > 0) {
      legacyWifi = true;
      tcpPort = port;
    }
  } catch (e) {
    console.error('Error checking legacy TCP/IP debugging', e);
  }

  // 2. Check Native Wireless Debugging (Android 11+)
  try {
    const wifiEnabledStr = (await adb.subprocess.noneProtocol.spawnWaitText('settings get global adb_wifi_enabled')).trim();
    if (wifiEnabledStr === '1') {
      modernWifi = true;
    }
  } catch (e) {
    console.error('Error checking native wireless debugging settings', e);
  }

  // 3. Check for active wireless sessions via netstat or proc/net/tcp fallback
  try {
    const netstatOut = await adb.subprocess.noneProtocol.spawnWaitText('netstat -nt');
    const lines = netstatOut.split('\n');
    for (const line of lines) {
      if (line.includes('ESTABLISHED')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddress = parts[3];
          const foreignAddress = parts[4];
          const localPortMatch = localAddress.match(/:(\d+)$/);
          if (localPortMatch) {
            const localPort = parseInt(localPortMatch[1], 10);
            if (localPort === 5555 || (localPort >= 30000 && localPort <= 50000)) {
              activeConnections++;
              connectionList.push(`${foreignAddress} -> local:${localPort}`);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('netstat -nt command failed/restricted. Attempting fallback by reading /proc/net/tcp...');
    try {
      const procTcp = await adb.subprocess.noneProtocol.spawnWaitText('cat /proc/net/tcp');
      const lines = procTcp.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const state = parts[3];
          if (state === '01') {
            const localAddrHex = parts[1];
            const portHex = localAddrHex.split(':')[1];
            if (portHex) {
              const localPort = parseInt(portHex, 16);
              if (localPort === 5555 || (localPort >= 30000 && localPort <= 50000)) {
                activeConnections++;
                const remoteAddrHex = parts[2].split(':');
                const remoteIPHex = remoteAddrHex[0];
                const remotePort = parseInt(remoteAddrHex[1], 16);
                if (remoteIPHex) {
                  const ipParts = [
                    parseInt(remoteIPHex.substring(6, 8), 16),
                    parseInt(remoteIPHex.substring(4, 6), 16),
                    parseInt(remoteIPHex.substring(2, 4), 16),
                    parseInt(remoteIPHex.substring(0, 2), 16)
                  ];
                  connectionList.push(`${ipParts.join('.')}:${remotePort} -> local:${localPort}`);
                }
              }
            }
          }
        }
      }
    } catch (procErr) {
      console.error('Fallback /proc/net/tcp reading failed', procErr);
    }
  }

  return { legacyWifi, tcpPort, modernWifi, activeConnections, connectionList };
}

// --- INTERACTIVE SWITCH WRITE EVENT LISTENERS ---

wifiDebugToggle.addEventListener('change', async () => {
  if (isAuditing) return;
  if (!activeAdb) return;
  
  const targetVal = wifiDebugToggle.checked ? '1' : '0';
  log(`Toggling Wireless Debugging to ${targetVal}...`, 'command');
  try {
    await activeAdb.subprocess.noneProtocol.spawnWaitText(`settings put global adb_wifi_enabled ${targetVal}`);
    log('Wireless Debugging configuration updated successfully.', 'success');
    await runSecurityChecks(activeAdb);
  } catch (err) {
    log(`Failed to toggle Wireless Debugging settings: ${err.message}`, 'error');
    wifiDebugToggle.checked = !wifiDebugToggle.checked;
  }
});

sideloadToggle.addEventListener('change', async () => {
  if (isAuditing) return;
  if (!activeAdb) return;
  
  const targetVal = sideloadToggle.checked ? '1' : '0';
  log(`Toggling Sideloading (Unknown Sources) to ${targetVal}...`, 'command');
  try {
    await activeAdb.subprocess.noneProtocol.spawnWaitText(`settings put global install_non_market_apps ${targetVal}`);
    log('Sideloading configurations updated successfully.', 'success');
    await runSecurityChecks(activeAdb);
  } catch (err) {
    log(`Write Restricted: Android system blocks write access to 'install_non_market_apps' via standard ADB shell. Please disable it manually under Settings -> Security.`, 'warning');
    sideloadToggle.checked = !sideloadToggle.checked; // revert
  }
});

verifierToggle.addEventListener('change', async () => {
  if (isAuditing) return;
  if (!activeAdb) return;
  
  const targetVal = verifierToggle.checked ? '1' : '0';
  log(`Toggling App Verification to ${targetVal}...`, 'command');
  try {
    await activeAdb.subprocess.noneProtocol.spawnWaitText(`settings put global package_verifier_enable ${targetVal}`);
    log('Package verification settings updated successfully.', 'success');
    await runSecurityChecks(activeAdb);
  } catch (err) {
    log(`Write Restricted: Android system blocks write access to 'package_verifier_enable' via standard ADB shell. Please configure it manually.`, 'warning');
    verifierToggle.checked = !verifierToggle.checked; // revert
  }
});

usbDebugToggle.addEventListener('change', async () => {
  if (isAuditing) return;
  if (!activeAdb) return;
  
  if (!usbDebugToggle.checked) {
    const confirmDisable = confirm("WARNING: Disabling USB Debugging will immediately stop the ADB daemon. This will close your current auditing session, and you must manually re-enable it on your phone settings menu. Proceed?");
    if (!confirmDisable) {
      usbDebugToggle.checked = true;
      return;
    }
    
    log('Disabling USB Debugging on device. ADB daemon shutting down...', 'warning');
    try {
      await activeAdb.subprocess.noneProtocol.spawnWaitText('settings put global adb_enabled 0');
    } catch (err) {
      log(`Failed to disable USB Debugging: ${err.message}`, 'error');
    }
    
    log('Session closed by USB Debugging shutdown.', 'info');
    disconnectBtn.click(); // term session & clean UI
  } else {
    usbDebugToggle.checked = true;
  }
});
