var express = require("express");
var router = express.Router();
var database = require("./database");

// メンバー - 一覧取得
router.get("/get", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const sql = "SELECT id,name,died FROM members_view";
  (async () => {
    const conn = await database.getConnection();
    const Rows = await conn.query(sql);
    await conn.release();
    res.send(Rows);
  })().catch(next);
});

// メンバー - 生存者取得
router.get("/get/live", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const sql = "SELECT id,name FROM members_view WHERE died = 0";
  (async () => {
    const conn = await database.getConnection();
    const Rows = await conn.query(sql);
    await conn.release();
    res.send(Rows);
  })().catch(next);
});

// メンバー - 一覧取得(職業含む)
router.get("/get/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;
  const sql = "SELECT id,name,died,job_name FROM members_view";
  (async () => {
    const conn = await database.getConnection();
    //APIキーが正しい場合、メンバーを追加する。
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

// メンバー - my役職取得
router.get("/get/:id/:password", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const id = req.params.id;
  const password = req.params.password;
  const getPasswordSql = `SELECT password FROM members WHERE id = ${id}`;
  const getUserInfoSql = `SELECT * FROM members_view WHERE id = ${id} and password = '${password}'`;
  const updatePasswordSql = `UPDATE members SET password=${password} WHERE id=${id}`;
  (async () => {
    const conn = await database.getConnection();

    //パスワードが空白の場合、今回入力したバスワードで更新する。
    const getPasswordRows = await conn.query(getPasswordSql);
    if (getPasswordRows[0].password === null) {
      await conn.query(updatePasswordSql);
    }

    //情報を取得
    const Rows = await conn.query(getUserInfoSql);
    if (Rows[0] !== null) {
      // 人狼・狂信者・共有者・背徳者 の場合、他メンバー情報を取得。
      if ([1, 3, 7, 12].includes(Rows[0].job_id)) {
        // 狂信者・背徳者は人狼・妖狐の情報を取得。
        var jobId = Rows[0].job_id;
        if (Rows[0].job_id === 3) {
          jobId = 1; //人狼の役職ID
        } else if (Rows[0].job_id === 12) {
          jobId = 11; //妖狐の役職ID
        }

        const sql2 = `SELECT id, job_id FROM members_view WHERE job_id = ${jobId}`;
        const addRows = await conn.query(sql2);
        // 追加情報をマージし、返却する。
        const mergedObj = { myInfo: Rows[0], addInfo: addRows };
        res.send(mergedObj);
      } else {
        // 追加情報(Null)をマージし、返却する。
        const mergedObj = { myInfo: Rows[0], addInfo: null };
        res.send(mergedObj);
      }
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// メンバー - メンバー追加
router.get("/add/:name/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const name = req.params.name;
  const apiKey = req.params.apiKey;
  const sql = `INSERT INTO members (name,password,job_id) VALUES('${name}',NULL,NULL)`;
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

// メンバー - メンバー削除
router.get("/delete/:id/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const id = req.params.id;
  const apiKey = req.params.apiKey;
  const sql = `DELETE FROM members WHERE id=${id}`;
  (async () => {
    const conn = await database.getConnection();

    //APIキーが正しい場合、メンバーを削除する。
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

// メンバー - 役職変更
router.get("/update/:id/:jobId/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const id = req.params.id;
  const jobId = req.params.jobId;
  const apiKey = req.params.apiKey;
  const sql = `UPDATE members SET job_id=${jobId} WHERE id=${id}`;
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
