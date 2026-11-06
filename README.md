# ShieldDroid 🛡️

**Android Debugging Security Auditor** — A WebUSB-based ADB security audit tool that connects to Android devices via browser to assess and mitigate debugging-related security risks.

## 🎯 Purpose

Android's **Developer Options** and **USB Debugging (ADB)** are powerful features for developers. However, leaving them enabled on personal devices introduces severe security risks:

- 🔓 **Bypassing Android's Permission Sandbox** — ADB has elevated shell privileges
- 🌐 **Unauthorized Local Network Access** — Wireless debugging exposes ports on Wi-Fi
- 💾 **Silent Malware Installation** — ADB can install apps without user consent
- 🔑 **Physical Data Extraction** — Authorized computers can extract all personal data

ShieldDroid helps you **audit**, **monitor**, and **remediate** these risks directly from your browser.

## ✨ Features

### Security Audit
- **USB Debugging Status** — Detects active ADB sessions
- **Wireless Debugging** — Checks legacy TCP/IP (port 5555) and Android 11+ native wireless debugging
- **Device Vitals** — Developer Menu, SELinux, Encryption, Root/Superuser status
- **Network Exposure** — Scans for active ADB connections via `netstat` and `/proc/net/tcp`

### Interactive Mitigation
- **Toggle USB Debugging** — Enable/disable ADB daemon (with confirmation)
- **Toggle Wireless Debugging** — Enable/disable network ADB
- **Toggle Unknown Sources** — Control sideloading permissions
- **Toggle Package Verification** — Enable/disable app verification

### Real-time Console
- Timestamped audit logs
- Command execution tracking
- Color-coded output (info/success/warning/error/command)

### Security Report
- **Critical Alert** (Red) — Active remote session detected
- **Vulnerable** (Orange) — Wireless debugging enabled, no active connections
- **Secure** (Green) — No debugging interfaces exposed
- One-click mitigation to disable wireless debugging

## 🚀 Quick Start

### Prerequisites
- **Browser**: Chrome, Edge, or Brave (WebUSB support required)
- **Android Device**: USB debugging enabled
- **USB Cable**: For initial connection

### Run Locally
```bash
# Clone the repository
git clone https://github.com/Aniket-Solanki/gaynigga.git
cd gaynigga

# Install dependencies
npm install

# Start development server
npm run dev
```

Open the displayed URL (typically `http://localhost:5173`) in a supported browser.

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to [Vercel](https://vercel.com) for automatic deployments.

## 📁 Project Structure

```
shielddroid/
├── index.html          # Main HTML with UI structure
├── package.json        # Project config (Vite + dependencies)
├── vercel.json         # Vercel deployment config
├── .gitignore          # Standard Node.js ignores
├── public/
│   ├── favicon.svg     # Shield icon
│   └── icons.svg       # Additional icons
└── src/
    ├── main.js         # Core application logic (~27KB)
    ├── style.css       # Complete styling with CSS variables
    ├── counter.js      # Unused counter example
    └── assets/
        ├── hero.png    # Hero image
        ├── javascript.svg
        └── vite.svg
```

## 🔧 Tech Stack

| Category | Technology |
|----------|------------|
| **Build Tool** | Vite 8.x |
| **Language** | Vanilla JavaScript (ES Modules) |
| **ADB Stack** | @yume-chan/adb, @yume-chan/adb-daemon-webusb, @yume-chan/adb-credential-web |
| **Styling** | Custom CSS with CSS Variables |
| **Fonts** | Outfit (UI), JetBrains Mono (Console) |
| **Deployment** | Vercel (Static) |

## 🔐 Security & Privacy

### How It Works
1. **WebUSB API** requests permission to access USB ADB interface
2. **@yume-chan/adb** establishes ADB connection in-browser
3. **ADB shell commands** run read-only security checks
4. **RSA keys** stored in browser IndexedDB for session persistence

### Data Handling
- **No data leaves your browser** — All ADB communication is local
- **No telemetry, analytics, or tracking**
- **RSA credentials** stored locally in IndexedDB (cleared on disconnect)
- **Open source** — Full code auditable on GitHub

### Browser Requirements
- Chrome 89+, Edge 89+, Brave, or any Chromium-based browser with WebUSB
- **Firefox/Safari NOT supported** (no WebUSB implementation)

## ⚠️ Disclaimer

**This tool is for educational and personal security auditing purposes only.**

- Only use on devices you own or have explicit permission to audit
- Disabling USB debugging will terminate the ADB session immediately
- Some toggle actions require manual confirmation on the Android device
- Certain settings (sideloading, package verification) may be read-only via ADB on newer Android versions

## 🛣️ Roadmap

- [ ] Modularize `main.js` into separate modules (connection, audit, UI, mitigation)
- [ ] Add TypeScript support
- [ ] Implement automated tests (Vitest)
- [ ] Add GitHub Actions CI/CD pipeline
- [ ] Support for scoped storage auditing (Android 10+)
- [ ] Export audit report as PDF/JSON
- [ ] Dark/light theme toggle

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: your feature description"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 👤 Author

**Aniket Solanki** — [@Aniket-Solanki](https://github.com/Aniket-Solanki)

---

*Built with ❤️ for Android security awareness*
