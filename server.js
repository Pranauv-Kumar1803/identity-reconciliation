import express from "express";
import _ from "lodash";
import { getUsers, initDB } from "./database/init.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  console.log("inside home page");
  const result = getUsers();
  console.log(result);
  res.status(200).json({ result, time: new Date().toISOString() });
});

app.listen(5000, () => {
  initDB();
  console.log("Db connected and server started on port 5000");
});
