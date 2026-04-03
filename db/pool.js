import pg from 'pg';
import Config from '../config';

const { Pool } = pg;
const pool = new Pool({
  host: Config.pgHost,
  port: 5432,
  database: Config.pgDatabase,
  user: Config.pgUser,
  password: Config.pgPassword,
  ssl: { rejectUnauthorized: false },
});

export default pool;
