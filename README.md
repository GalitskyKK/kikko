# Kikkō

Launcher (command palette + clipboard + snippets + dashboard) на `Tauri 2 + React + TypeScript`.

## Local development

### Windows prerequisites

Для Tauri на Windows нужен [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/).
Если при `npm run tauri dev` появляется `0xc0000139 (STATUS_ENTRYPOINT_NOT_FOUND)`, установите [Evergreen Standalone Installer](https://go.microsoft.com/fwlink/p/?LinkId=2124703) и перезапустите.

### Start

```bash
npm ci
npm run tauri dev
```

## CI/CD and releases

В репозитории настроены GitHub Actions:

- `.github/workflows/ci.yml`:
  - `npm run lint`
  - `npm run build`
  - `cargo check` (в `src-tauri`)
- `.github/workflows/release.yml`:
  - запускается автоматически при пуше тега `v*`
  - собирает артефакты для:
    - Windows (`windows-latest`)
    - macOS (`macos-latest`)
    - Linux (`ubuntu-22.04`)
  - публикует артефакты в GitHub Release

### How to publish first release

1. Инициализируйте git и подключите удаленный репозиторий:

```bash
git init
git branch -M main
git remote add origin https://github.com/GalitskyKK/kikko.git
```

2. Закоммитьте и запушьте код:

```bash
git add .
git commit -m "chore: bootstrap project and CI/CD"
git push -u origin main
```

3. Создайте тег релиза и запушьте:

```bash
git tag v0.1.0
git push origin v0.1.0
```

После этого workflow `Release` соберет установщики/пакеты и прикрепит их к релизу на GitHub.

### Optional signing secrets

Если используете автообновления/подписанные артефакты Tauri, добавьте в `GitHub -> Settings -> Secrets and variables -> Actions`:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Если секреты не заданы, сборка релиза продолжит работать без подписи.

---

# React + TypeScript + Vite (template)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
