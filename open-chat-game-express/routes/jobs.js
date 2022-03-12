var express = require("express");
var router = express.Router();
var database = require("./database");

// 役職 - 一覧取得
router.get("/get", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const sql =
    "SELECT id, name, encampments, description, fortune_disp, spirit_disp, ability, night_action, number_people FROM jobs_view";
  (async () => {
    const conn = await database.getConnection();
    const Rows = await conn.query(sql);
    await conn.release();
    res.send(Rows);
  })().catch(next);
});

// 役職 - 特定役職取得
router.get("/get/:jobId", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const jobId = req.params.jobId;
  const sql = `SELECT id, name, encampments, description, fortune_disp, spirit_disp, ability, night_action, number_people FROM jobs_view WHERE id = ${jobId}`;
  (async () => {
    const conn = await database.getConnection();
    const Rows = await conn.query(sql);
    await conn.release();
    res.send(Rows);
  })().catch(next);
});

// 役職 - 人数割り当て変更
router.get("/update/:jobId/:number/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const jobId = req.params.jobId;
  const number = req.params.number;
  const apiKey = req.params.apiKey;
  const sql = `UPDATE jobs SET number_people=${number} WHERE id=${jobId}`;
  (async () => {
    const conn = await database.getConnection();

    //APIキーが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      await conn.query(sql);
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

module.exports = router;
