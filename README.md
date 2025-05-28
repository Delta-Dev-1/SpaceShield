# 🛰️ SpaceShield

SpaceShield is a modern satellite tracking web app built with React, TypeScript, and Vite.
It offers live orbits, real-time satellite stats, and global space events—right in your browser!

## Features

- Live Satellite Tracking with Apple Maps-like dark/light themes
- Multiple Satellite Groups: Starlink, ISS, Iridium, OneWeb, and more
- Interactive Map (Leaflet.js) showing orbits & real-time positions
- Collapsible Fleet Stats & Sidebar
- Dark/Light Mode Toggle
- Space Events: Asteroids, Solar flares, Aurora, Meteor showers, and more (NASA, NOAA, etc.)
- Smart Caching & Proxy Support for Celestrak, N2YO, and Space-Track sources
- Mobile-friendly UI

## Getting Started

1. Clone and Install

```sh
git clone https://github.com/Delta-Dev-1/SpaceShield.git
cd SpaceShield
npm install
```

2. Run Locally

```sh
npm run dev
```
Then open http://localhost:5173 in your browser.

## Configuration

- API Keys: Place your NASA and N2YO API keys in a `.env` file or directly in the code for now.
- CORS Proxy: Uses a server (see `/proxy` folder) for fetching satellite TLE data.

## Linting & ESLint

This template uses Vite’s recommended setup, but for production-quality apps, consider stricter ESLint:

```js
export default tseslint.config({
  extends: [
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install eslint-plugin-react-x and eslint-plugin-react-dom for React-specific lint rules:

```js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

---

**MIT License** – DeltaDev
