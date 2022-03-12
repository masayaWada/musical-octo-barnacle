var express = require("express");
var router = express.Router();
var database = require("./database");

// ログイン - 管理者ログイン
router.get("/admin/:password", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const password = req.params.password;

  if (password === "1432") {
    const sql = "SELECT secret_key FROM secret_keys WHERE id = 1";
    (async () => {
      const conn = await database.getConnection();
      const Rows = await conn.query(sql);
      await conn.release();
      res.send(`{"state":"Success","secretKey":"${Rows[0].secret_key}"}`);
    })().catch(next);
  } else {
    res.send(`{"state":"Failure"}`);
  }
});

module.exports = router;
