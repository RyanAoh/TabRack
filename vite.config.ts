import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

// Sync manifest.json version with package.json or GitHub tag
function updateManifestVersion() {
  return {
    name: 'update-manifest-version',
    writeBundle() {
      const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
      const manifestPath = path.resolve(__dirname, 'dist/manifest.json');
      
      let version = packageJson.version;
      // If building via GitHub Actions with a tag (e.g., v1.0.1)
      if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) {
        version = process.env.GITHUB_REF_NAME.replace(/^v/, '');
      }

      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        manifest.version = version;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`\n[build] Synchronized manifest.json version to v${version}`);
      }
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), updateManifestVersion()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          background: path.resolve(__dirname, 'src/background.ts'),
          content: path.resolve(__dirname, 'src/content.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
              return '[name].js';
            }
            return 'assets/[name]-[hash].js';
          }
        }
      }
    }
  };
});
