var express = require("express");
var router = express.Router();
var database = require("./database");

// トーク - トーク内容取得
router.get("/get/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;
  const sql = `SELECT content,date_format(insert_date, '%k:%i') as insert_date,insert_user_id as user_id,insert_user_name as user_name FROM talks_view`;
  (async () => {
    const conn = await database.getConnection();

    //APIキーが正しい場合、トーク内容を取得する
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      const Rows = await conn.query(sql);
      res.send(Rows);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// トーク - トーク内容取得
router.get("/get/:id/:password", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const id = req.params.id;
  const password = req.params.password;
  const sql = `SELECT v1.content,date_format(v1.insert_date, '%k:%i') as insert_date,v1.insert_user_id as user_id,v1.insert_user_name as user_name FROM talks_view v1 WHERE v1.job_type = (SELECT job_id FROM members_view WHERE id = ${id} AND password = ${password})`;
  (async () => {
    const conn = await database.getConnection();

    //ID,PASSWORDが正しい場合、投稿内容を取得する。
    const Rows = await conn.query(sql);
    res.send(Rows);
    await conn.release();
  })().catch(next);
});

// トーク - 新規投稿
router.get("/insert/:content/:id/:password", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const content = decodeURI(req.params.content);
  const id = req.params.id;
  const password = req.params.password;
  const sql = `INSERT INTO talks (job_type, content, insert_date, insert_user_id) SELECT job_id, '${content}', SYSDATE(), id FROM members_view WHERE id = ${id} and password = ${password}`;
  (async () => {
    const conn = await database.getConnection();

    //ID,PASSWORDが正しい場合、投稿内容を追加する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from  members_view WHERE id = ${id} and password = '${password}'`
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

// トーク - トーク内容リセット
router.get("/reset/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;
  const sql = "DELETE FROM talks";
  (async () => {
    const conn = await database.getConnection();

    //APIキーが正しい場合、メンバーを追加する。
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
