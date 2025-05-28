import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Change 'YOUR-USERNAME' and 'YOUR-REPO' to match your GitHub username/repo
export default defineConfig({
  plugins: [react()],
  base: '/SpaceShield/', // <-- use your repo name here, with slashes
})