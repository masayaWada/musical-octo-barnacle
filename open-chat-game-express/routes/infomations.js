var express = require("express");
var router = express.Router();
var database = require("./database");

// インフォメーション - 一覧取得
router.get("/get", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const sql = "SELECT * FROM infomations_view order by insert_date asc";
  (async () => {
    const conn = await database.getConnection();
    const Rows = await conn.query(sql);
    await conn.release();
    res.send(Rows);
  })().catch(next);
});

// インフォメーション - リセット
router.get("/reset/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;
  (async () => {
    const conn = await database.getConnection();
    //APIキーが正しい場合、メンバーを追加する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      await conn.query(`DELETE FROM infomations`);
      await conn.query(
        `INSERT INTO infomations (day, type_id, content, insert_date)VALUES(0, 1, '恐ろしい夜がやってきます。', current_timestamp())`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

module.exports = router;
