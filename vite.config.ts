import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) =>
{
  const env = loadEnv(mode, '.', '');
  // optionally load report JSON from env var REPORT_JSON
  let reportData: string | null = null;
  if (env.REPORT_JSON)
  {
    const p = path.isAbsolute(env.REPORT_JSON) ? env.REPORT_JSON : path.resolve(process.cwd(), env.REPORT_JSON);
    if (fs.existsSync(p))
    {
      reportData = fs.readFileSync(p, 'utf-8');
    } else
    {
      // leave null if not found
      console.warn('REPORT_JSON not found at', p);
    }
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [tailwindcss(), react(), viteSingleFile(), {
      name: 'inject-report-json',
      transformIndexHtml(html)
      {
        if (!reportData) return html;
        // ensure JSON is safely embedded
        const script = `<script>window.report = ${JSON.stringify(JSON.parse(reportData))}</script>`;
        return html.replace('</head>', `${script}</head>`);
      }
    }],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
