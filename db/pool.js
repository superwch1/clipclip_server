import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "clipclip",
  user: "postgres",
  password: "123456",
});

export default pool;
