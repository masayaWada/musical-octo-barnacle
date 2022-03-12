var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");
var membersRouter = require("./routes/members");
var jobsRouter = require("./routes/jobs");
var talksRouter = require("./routes/talks");
var functionsRouter = require("./routes/functions");
var loginRouter = require("./routes/login");
var phaseRouter = require("./routes/phase");
var infomationsRouter = require("./routes/infomations");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/functions", functionsRouter);
app.use("/jobs", jobsRouter);
app.use("/login", loginRouter);
app.use("/members", membersRouter);
app.use("/phase", phaseRouter);
app.use("/talks", talksRouter);
app.use("/infomations", infomationsRouter);

// 404をキャッチし、エラーハンドラへ転送する
app.use(function (req, res, next) {
  next(createError(404));
});

// エラーハンドラ
app.use(function (err, req, res, next) {
  // ローカルに設定し、開発時のエラーのみ提供
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // エラーページのレンダリング
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
