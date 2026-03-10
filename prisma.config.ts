import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from '@prisma/config';

// Load .env manually since prisma.config.ts runs before Next.js env loading
function loadEnv(): string {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === 'DATABASE_URL') return val;
    }
  }
  return process.env.DATABASE_URL || '';
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: loadEnv(),
  },
});
