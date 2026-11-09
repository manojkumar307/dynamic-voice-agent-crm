import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

async function init() {
  console.log(`[DB Setup] Connecting to MySQL at ${env.DB_HOST}:${env.DB_PORT} as user '${env.DB_USER}'...`);

  // Connect to server (without initial DB selection so it creates voice_crm)
  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      multipleStatements: true,
    });
  } catch (err: any) {
    console.error(`\n❌ Could not connect to MySQL server: ${err.message}`);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(`👉 Tip: Open .env and ensure DB_PASSWORD has your correct MySQL root password.\n`);
    } else if (err.code === 'ECONNREFUSED') {
      console.error(`👉 Tip: Check if the MySQL service is started in Windows Services.\n`);
    }
    process.exit(1);
  }

  try {
    console.log('[DB Setup] Reading schema.sql...');
    const schemaPath = path.resolve(process.cwd(), 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[DB Setup] Executing schema migrations...');
    await connection.query(sql);

    console.log('\n✅ Success! Database `voice_crm` and all tables created successfully in MySQL.');
    console.log('You can now run: npm run dev\n');
  } catch (err: any) {
    console.error('❌ Schema execution error:', err.message);
  } finally {
    await connection.end();
  }
}

init();
