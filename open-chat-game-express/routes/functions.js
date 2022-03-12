var express = require("express");
var router = express.Router();
var database = require("./database");

// 配列をシャッフル
function arrayShuffle(array) {
  for (var i = array.length - 1; 0 < i; i--) {
    // 0〜(i+1)の範囲で値を取得
    var r = Math.floor(Math.random() * (i + 1));
    // 要素の並び替えを実行
    var tmp = array[i];
    array[i] = array[r];
    array[r] = tmp;
  }
  return array;
}

// 機能 - 役職振分け機能
router.get("/allocate/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  const apiKey = req.params.apiKey;

  (async () => {
    const conn = await database.getConnection();

    // メンバー数取得
    const memberRows = await conn.query("SELECT id FROM members_view");
    const memberCnt = memberRows.length;

    // 役職数取得
    const jobRows = await conn.query(
      "SELECT id,number_people FROM jobs_view where number_people > 0"
    );

    //APIキーが正しい場合、役職を割り当てる。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      // 職業リセット
      await conn.query("update members set job_id = null, died = 0");
      //職業をシャッフルする
      var jobListText = [];
      for (let i = 0; i < jobRows.length; i++) {
        for (let j = 0; j < jobRows[i].number_people; j++) {
          jobListText.push(jobRows[i].id);
        }
      }
      for (var i = 0; i < Math.floor(Math.random() * 21); i++) {
        jobListText = arrayShuffle(jobListText);
      }
      // 合計役職数と参加人数が合っている際に職業を割り当てる
      if (memberCnt === jobListText.length) {
        // 職業割り当て
        for (let i = 0; i < memberCnt; i++) {
          const jobUpdate = `update members set job_id = ${jobListText[i]} where id = ${memberRows[i].id}`;
          await conn.query(jobUpdate);
        }
        await conn.release();
        res.send(`{"state":"Success"}`);
      } else {
        res.send(`{"state":"Failure"}`);
      }
    } else {
      res.send(`{"state":"Failure"}`);
    }
  })().catch(next);
});

// 機能 - 管理者による死亡情報の更新
router.get("/update/dead/:id/:type/:apiKey", function (req, res, next) {
  res.header("Content-Type", "application/json; charset=utf-8");
  var id = parseFloat(req.params.id);
  const type = parseFloat(req.params.type);
  const apiKey = req.params.apiKey;

  (async () => {
    const conn = await database.getConnection();

    //APIキーが正しい場合、役職を割り当てる。
    const Rows = await conn.query(
      `SELECT COUNT(*) as hit_key from secret_keys WHERE secret_key = '${apiKey}'`
    );
    if (Rows[0].hit_key === 1) {
      //最大の日付を取得
      const latestInfoRows = await conn.query(
        `SELECT day,status FROM phase_view WHERE day = (SELECT Max(day) FROM phase_view)`
      );
      //猫又のみ対象者がランダム
      if (id === 0) {
        //生存プレイヤーを取得
        const liveRows = await conn.query(
          "SELECT id FROM members_view WHERE died = 0"
        );
        id = liveRows[Math.floor(Math.random() * liveRows.length)].id;
      }

      // プレイヤー情報を取得
      const infoRows = await conn.query(
        `SELECT name from members_view WHERE id = ${id}`
      );
      var message;
      if (type === 1) {
        message = `${infoRows[0].name}さんは狼に殺害されました。`;
      } else if (type === 2) {
        message = `${infoRows[0].name}さんはハンターに殺害されました。`;
      } else if (type === 3) {
        message = `${infoRows[0].name}さんは道連れにされました。`;
      } else if (type === 4) {
        message = `${infoRows[0].name}さんは妖狐でした。呪殺されました。`;
      } else if (type === 5) {
        message = `${infoRows[0].name}さんは妖狐の後を追い、自殺しました。`;
      } else if (type === 6) {
        message = `昨晩の犠牲者は誰も居ませんでした。`;
      }

      if ([1, 2, 3, 4, 5].includes(type)) {
        // 死亡済みに変更
        await conn.query(`update members set died = 1 WHERE id =${id}`);
        // プレイヤーの死亡を通知する
        await conn.query(
          `INSERT INTO infomations (day, type_id, content, insert_date)VALUES(${latestInfoRows[0].day}, 2, '${message}', current_timestamp())`
        );
      } else {
        // 犠牲者無しを通知する
        await conn.query(
          `INSERT INTO infomations (day, type_id, content, insert_date)VALUES(${latestInfoRows[0].day}, 1, '${message}', current_timestamp())`
        );
      }

      res.send(`{"state":"Success"}`);
    } else {
      res.send(`{"state":"Failure"}`);
    }
  })().catch(next);
});

module.exports = router;
