import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/langchain',
  synchronize: false,
  logging: false,
  entities: [],
  migrations: [join(__dirname, 'src/database/migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
});
