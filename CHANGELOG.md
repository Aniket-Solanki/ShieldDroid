# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive README.md with project documentation
- MIT License
- CONTRIBUTING.md with contribution guidelines
- GitHub Actions CI workflow (lint + build)
- Fixed invalid CSS color variable (#05g79c → #05f79c)
- Renamed package from "tirth" to "shielddroid"

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- CSS color typo that could cause rendering issues

### Security
- Added security disclaimer to README
- Documented data handling practices

## [0.1.0] - 2026-07-13

### Added
- Initial release: ShieldDroid Android Debugging Security Auditor
- WebUSB ADB connection via @yume-chan/adb
- Security audit checks:
  - USB Debugging status
  - Wireless Debugging (legacy TCP/IP + Android 11+ native)
  - Device Vitals: Developer Menu, SELinux, Encryption, Root access
  - Network exposure scanning (netstat + /proc/net/tcp)
- Interactive mitigation toggles:
  - USB Debugging enable/disable
  - Wireless Debugging enable/disable
  - Unknown Sources sideloading
  - Package Verification
- Real-time audit console with timestamped logs
- Dynamic security report with Critical/Vulnerable/Secure states
- One-click wireless debugging disable mitigation
- RSA credential persistence via IndexedDB
- Responsive UI with Outfit + JetBrains Mono fonts
- CSS variables for theming
- Vercel deployment configuration
