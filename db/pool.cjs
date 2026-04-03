const { Pool } = require('pg');

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "clipclip",
  user: "postgres",
  password: "123456",
});

module.exports = pool;
