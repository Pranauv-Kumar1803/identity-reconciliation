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

// Insert a user
export const insertUser = ({
  phoneNumber,
  email,
  linkedId = null,
  linkPrecedence = "primary",
  createdAt,
  updatedAt = null,
  deletedAt = null,
}) => {
  const sql = `INSERT INTO contact
  (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    phoneNumber,
    email,
    linkedId,
    linkPrecedence,
    createdAt,
    updatedAt,
    deletedAt,
  ];

  // execute with parameter binding (safe)
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.lastInsertRowid;
};

// Update a user
export const updateUser = ({
  id,
  linkedId,
  linkPrecedence,
  updatedAt,
  email,
  phoneNumber,
}) => {
  const sql =
    "UPDATE contact SET linkedId = ?, linkPrecedence = ?, updatedAt = ?, email = ?, phoneNumber = ? WHERE id = ?";

  const params = [linkedId, linkPrecedence, updatedAt, email, phoneNumber, id];

  // execute with parameter binding (safe)
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes;
};

// Get all users
export const getUsers = () => {
  return db.prepare("SELECT * FROM contact").all();
};

export const getUserByEmail = ({ email }) => {
  const stmt2 = db.prepare("SELECT * FROM contact where email = ?");
  const result2 = stmt2.all(email);

  return result2;
};

export const getUserByPhone = ({ phone }) => {
  const stmt1 = db.prepare("SELECT * FROM contact where phoneNumber = ?");
  const result1 = stmt1.all(phone);

  return result1;
};

export const getUserById = (id) => {
  const stmt1 = db.prepare("SELECT * FROM contact where id = ?");
  const result1 = stmt1.get(id);

  return result1;
};

export const getUsersByLinkedId = (linkedId) => {
  const stmt1 = db.prepare("SELECT * FROM contact where linkedId = ?");
  const result1 = stmt1.all(linkedId);

  return result1;
};

// Delete a user
// function deleteUser(id) {
//   const stmt = db.prepare("DELETE FROM contact WHERE id = ?");
//   return stmt.run(id);
// }

export const initDB = function () {
  createTable();
  console.log("Database initialized");
};
