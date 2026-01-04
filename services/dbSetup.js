import readline from 'node:readline';
import { Client } from 'pg';
import { databaseConfig } from '../config/database.js';
import { sequelize } from '../models/index.js';
import { seedAdmin } from '../seeders/adminSeeder.js';

const { host, port, user, password, database } = databaseConfig;

function askQuestion(prompt) {
  // If not running in TTY (e.g., CI/CD), default to 'no'
  if (!process.stdin.isTTY) {
    return Promise.resolve(false);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${prompt} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function ensureDatabaseExists() {
  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();

    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database]
    );

    if (result.rowCount === 0) {
      // Database doesn't exist, create it
      console.log(`Database "${database}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`Database "${database}" created successfully.`);
      return true;
    }

    // Database exists, ask user if they want to recreate it
    console.log(`Database "${database}" already exists.`);
    const shouldRecreate = await askQuestion('Do you want to drop and recreate the database?');

    if (shouldRecreate) {
      console.log(`Dropping database "${database}"...`);
      
      // Terminate existing connections
      await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [database]);
      
      await client.query(`DROP DATABASE "${database}"`);
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`Database "${database}" recreated successfully.`);
      return true;
    }

    console.log('Using existing database.');
    return false;
  } finally {
    await client.end();
  }
}

export async function initDatabase() {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log('Database connection established.');
    
    await sequelize.sync();
    console.log('Database models synchronized.');
    
    await seedAdmin();
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
}

