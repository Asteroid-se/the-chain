import { existsSync, copyFileSync, mkdirSync, closeSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
if (!existsSync('.env') && !process.env.DATABASE_URL) copyFileSync('.env.example', '.env');
if (existsSync('.env')) process.loadEnvFile('.env');
// Create the SQLite file first; Prisma 6 can fail on Windows when it is absent.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('file:')) throw new Error('DATABASE_URL must be a SQLite file URL.');
const databasePath = resolve('prisma', databaseUrl.slice(5));
mkdirSync(dirname(databasePath), { recursive: true });
if (!existsSync(databasePath)) closeSync(openSync(databasePath, 'wx'));
const result = spawnSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'],
  {
    stdio: 'inherit',
  },
);
process.exit(result.status ?? 1);
