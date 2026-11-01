# NEXUS FORGE AI

Offline-first AI code studio (Electron). Generate and edit code with a local Ollama model, manage project files, keep history in SQLite, and export projects as ZIP.

## Requirements
- Node.js 20 or newer (build tools are needed if `better-sqlite3` has to compile)
- Ollama from https://ollama.com with a code model, e.g. `ollama pull qwen2.5-coder`

## Run
```
npm install
npm start
```
`npm install` rebuilds `better-sqlite3` for Electron automatically.

## Build an installer
```
npm run dist
```
Output goes to `dist/`.

## How it works
- `src/main/main.js`: window, SQLite (`nexus-forge.db` in the app data folder), and the Ollama bridge. Only localhost addresses are accepted.
- `src/main/preload.js`: the small, isolated API the UI may call.
- `src/renderer/index.html`: the IDE interface.

## Privacy and safety
Nothing is sent to cloud services. Generated code is never run automatically; "Run Project" asks first and opens an isolated preview. Every AI change is reviewed before it is applied.

## Known limits
The editor is a plain text area (no Monaco), the UI is a single HTML file rather than React and Tailwind, and history is stored as one JSON document inside SQLite. No automated tests yet.
