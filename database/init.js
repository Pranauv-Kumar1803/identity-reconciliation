import Database from "better-sqlite3";

// Create in-memory DB
const db = new Database("mydb.sqlite");

// Create a sample table
const createTable = function () {
  db.prepare(`DROP TABLE IF EXISTS contact`).run();

  db.prepare(
    `
  CREATE TABLE IF NOT EXISTS contact (
    id INTEGER PRIMARY KEY,
    phoneNumber INTEGER,
    email TEXT,
    linkedId INTEGER,
    linkPrecedence TEXT CHECK(linkPrecedence IN ('primary','secondary')),
    createdAt DATETIME,
    updatedAt DATETIME,
    deletedAt DATETIME
  )
`
  ).run();
};

// Get all users
export const getUsers = () => {
  return db.prepare("SELECT * FROM contact").all();
};

export const initDB = function () {
  createTable();
  console.log("Database initialized");
};
