# Contributing to ShieldDroid

Thank you for your interest in contributing to ShieldDroid! This document outlines the process for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our commitment to a welcoming and inclusive environment.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check if the issue has already been reported. If not, create a new issue with:

- **Clear title** describing the problem
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (Browser, Android version, Device model)
- **Console logs** if applicable

### Suggesting Features

Feature requests are welcome! Please create an issue with:

- **Clear title** describing the feature
- **Use case** — why is this needed?
- **Proposed solution** — how should it work?
- **Security implications** — any security considerations?

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`: `git checkout -b feature/your-feature-name`
3. **Make your changes** following the guidelines below
4. **Test your changes** in a supported browser (Chrome/Edge/Brave)
5. **Commit** with a clear message following [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push** to your fork
7. **Open a Pull Request** against `main`

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/gaynigga.git
cd gaynigga

# Install dependencies
npm install

# Run development server
npm run dev
```

Open `http://localhost:5173` in Chrome/Edge/Brave.

## Coding Standards

### JavaScript

- Use **ES Modules** (`import`/`export`)
- **No TypeScript yet** — plain JS with JSDoc comments preferred
- Use `const`/`let`, avoid `var`
- Prefer **arrow functions** for callbacks
- **Async/await** over promises chains

### CSS

- Use **CSS Variables** (defined in `:root`) for all colors/spacing
- Follow **BEM-like** naming for component classes
- Mobile-first responsive design
- Use `rem` for spacing, `px` only for borders/thin lines

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wireless debugging network scan
fix: correct SELinux status detection on Android 14
docs: update README with Vercel deployment steps
refactor: extract auditNetworkSecurity to separate module
test: add unit tests for vital card rendering
chore: update @yume-chan/adb to v2.6.0
```

### Security Considerations

**Critical**: This project handles ADB connections to Android devices. Any changes must:

1. **Never send device data outside the browser** — All communication must be local
2. **Require explicit user consent** for any ADB command execution
3. **Use read-only commands** for audit checks by default
4. **Warn before write operations** (toggle switches require confirmation)
5. **Handle credentials securely** — RSA keys stay in IndexedDB

## Project Structure

```
src/
├── main.js         # Core application (connection, audit, UI, mitigation)
├── style.css       # Complete styling with CSS variables
├── counter.js      # Example counter (unused)
└── assets/         # Static assets
```

## Adding New Audit Checks

1. Add check function in `main.js` (or new module)
2. Follow pattern: `async function checkXyz(adb) { ... }`
3. Return structured object with findings
4. Update `runSecurityChecks()` to call new check
5. Add corresponding UI in `index.html`
6. Style in `style.css`

## Adding New Mitigation Actions

1. Add toggle/input in `index.html` audit panel
2. Add event listener in `main.js`
3. Show confirmation dialog for destructive actions
4. Execute ADB shell command via `adb.subprocess.noneProtocol.spawnWaitText()`
5. Re-run `runSecurityChecks()` after mitigation

## Browser Testing

Test in:
- ✅ Chrome (latest)
- ✅ Edge (latest)
- ✅ Brave (latest)
- ❌ Firefox (no WebUSB)
- ❌ Safari (no WebUSB)

## Questions?

Feel free to open an issue for any questions about contributing!
