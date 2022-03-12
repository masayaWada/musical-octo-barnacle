var express = require("express");
var router = express.Router();
var database = require("./database");

// フェーズ - 選択済みプレーヤー取得
router.get("/get/:myJobId/:id/:pass", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const myJobId = parseFloat(req.params.myJobId);
  const id = req.params.id;
  const pass = req.params.pass;
  // 役職IDをもとにカラム名を取得
  const infoArray = {
    0: { job: "村人" },
    1: { columun: "kill_name", job: "人狼" },
    2: { job: "狂人" },
    3: { job: "狂信者" },
    4: { columun: "fortune_name", job: "占い師" },
    5: { columun: "protect_name", job: "騎士" },
    6: { job: "霊媒師" },
    7: { job: "共有者" },
    8: { columun: "shot_name", job: "ハンター" },
    9: { columun: "dark_protect_name", job: "黒騎士" },
    10: { job: "猫又" },
    11: { job: "妖狐" },
    12: { job: "背徳者" },
    13: { job: "てるてる" }
  };
  const info = infoArray[myJobId];

  // 役職IDをもとにカラム名を取得
  const resultArray = {
    4: { columun: "fortune_disp", table: "fortune_view", job: "占い師" },
    6: { columun: "spirit_disp", table: "spirit_view", job: "霊媒師" }
  };
  const result = resultArray[myJobId];

  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //ID,PASSWORDが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_rec from members_view WHERE id=${id} and password=${pass} and job_name='${info.job}'`
    );
    if (Rows[0].hit_rec === 1) {
      if ([1, 4, 5, 6, 8, 9].includes(myJobId)) {
        //選択済みプレイヤーを取得
        var selectedUserRow;
        if ([1, 4, 5, 8, 9].includes(myJobId)) {
          selectedUserRow = await conn.query(
            `SELECT ${info.columun} as selected_name FROM phase_view WHERE day=${latestInfoRows[0].day}`
          );
        }
        if ([1, 5, 8, 9].includes(myJobId)) {
          res.send({ selectedName: selectedUserRow[0].selected_name });
        } else {
          //占い、霊媒の結果取得
          var resultList = await conn.query(
            `SELECT * FROM ${result.table} WHERE day < ${latestInfoRows[0].day}`
          );
          if (myJobId === 4) {
            res.send({
              selectedName: selectedUserRow[0].selected_name,
              resultList: resultList
            });
          } else {
            res.send({ resultList: resultList });
          }
        }
      } else {
        res.send({ selectedName: `noneAbility` });
      }
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 本日状況取得
router.get("/get/latest/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;
  const sql = `SELECT * FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`;
  (async () => {
    const conn = await database.getConnection();
    //APIキーが正しい場合、日付を追加する。
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

// フェーズ - フェーズを進める。
router.get("/next/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;
  (async () => {
    const conn = await database.getConnection();

    //APIキーが正しい場合、日付を追加する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      //最大の日付を取得
      const latestInfoRows = await conn.query(
        `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
      );
      //日付を変更もしくは時間を進める(昼⇒夜)
      if (latestInfoRows[0].status === "昼") {
        await conn.query(
          `UPDATE phase SET status_id=1 WHERE day=${latestInfoRows[0].day}`
        );
      } else {
        await conn.query(
          `INSERT INTO phase (day) VALUES (${latestInfoRows[0].day + 1})`
        );
      }
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - リセット
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
      await conn.query(`DELETE FROM phase`);
      await conn.query(`INSERT INTO phase (day,status_id) VALUES (0,1)`);
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 襲撃対象選択
router.get("/update/kill/:tarId/:id/:pass", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const id = req.params.id;
  const pass = req.params.pass;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //ID,PASSWORDが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_rec from members_view WHERE id=${id} and password=${pass} and job_name='人狼'`
    );
    if (Rows[0].hit_rec === 1) {
      await conn.query(
        `UPDATE phase SET kill_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 占い対象選択
router.get("/update/fortune/:tarId/:id/:pass", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const id = req.params.id;
  const pass = req.params.pass;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //ID,PASSWORDが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_rec from members_view WHERE id=${id} and password=${pass} and job_name='占い師'`
    );
    if (Rows[0].hit_rec === 1) {
      await conn.query(
        `UPDATE phase SET fortune_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 護衛(騎士)対象選択
router.get("/update/protect/:tarId/:id/:pass", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const id = req.params.id;
  const pass = req.params.pass;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //ID,PASSWORDが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_rec from members_view WHERE id=${id} and password=${pass} and job_name='騎士'`
    );
    if (Rows[0].hit_rec === 1) {
      await conn.query(
        `UPDATE phase SET protect_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 銃撃対象選択
router.get("/update/shot/:tarId/:id/:pass", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const id = req.params.id;
  const pass = req.params.pass;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //ID,PASSWORDが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_rec from members_view WHERE id=${id} and password=${pass} and job_name='ハンター'`
    );
    if (Rows[0].hit_rec === 1) {
      await conn.query(
        `UPDATE phase SET fellow_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 護衛(黒騎士)対象選択
router.get("/update/dark_protect/:tarId/:id/:pass", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const id = req.params.id;
  const pass = req.params.pass;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //ID,PASSWORDが正しい場合、役職を変更する。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_rec from members_view WHERE id=${id} and password=${pass} and job_name='黒騎士'`
    );
    if (Rows[0].hit_rec === 1) {
      await conn.query(
        `UPDATE phase SET dark_protect_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 処刑対象選択
router.get("/update/execution/:tarId/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const apiKey = req.params.apiKey;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //APIキーが正しい場合、トーク内容を取得する
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    //処刑されるプレイヤー名を取得
    const tarNameRow = await conn.query(
      `SELECT name FROM members_view WHERE id = ${tarId}`
    );
    if (Rows[0].hit_key === 1) {
      //処刑対象を更新
      await conn.query(
        `UPDATE phase SET execution_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      //プレイヤーを死亡に変更
      await conn.query(`UPDATE members SET died=1 WHERE id=${tarId}`);
      //連絡に死亡を通知する
      const content = `${tarNameRow[0].name}さんは処刑されました。`;
      await conn.query(
        `INSERT INTO infomations (day, type_id, content, insert_date)VALUES(${latestInfoRows[0].day}, 2, '${content}', current_timestamp())`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

// フェーズ - 道連れ対象選択
router.get("/update/fellow/:tarId/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const tarId = req.params.tarId;
  const apiKey = req.params.apiKey;
  (async () => {
    const conn = await database.getConnection();
    //最大の日付を取得
    const latestInfoRows = await conn.query(
      `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
    );
    //APIキーが正しい場合、トーク内容を取得する
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      await conn.query(
        `UPDATE phase SET fellow_id=${tarId} WHERE day=${latestInfoRows[0].day}`
      );
      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
    await conn.release();
  })().catch(next);
});

module.exports = router;
