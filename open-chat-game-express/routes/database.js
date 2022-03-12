// DB接続情報を定義
const mariadb = require("mariadb");
const pool = mariadb.createPool({
  host: "192.168.0.99",
  port: "3307",
  user: "WereWolfGameMain",
  password: "ItadoriYuji1119!",
  database: "WereWolfGame",
  connectionLimit: 5
});

module.exports = pool;
