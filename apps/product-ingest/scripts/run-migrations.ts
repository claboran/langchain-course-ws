import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { CreateProductEmbeddingsTable1738137600000 } from '../src/database/migrations/1738137600000-CreateProductEmbeddingsTable';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/langchain',
  synchronize: false,
  logging: true,
  entities: [],
  migrations: [CreateProductEmbeddingsTable1738137600000],
  migrationsTableName: 'migrations',
});

async function runMigrations() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();

    console.log('Running migrations...');
    await AppDataSource.runMigrations();

    console.log('✓ Migrations completed successfully!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
