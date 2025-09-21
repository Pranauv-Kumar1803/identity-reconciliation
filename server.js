import express from "express";
import _ from "lodash";
import {
  getUserByEmail,
  getUserById,
  getUserByPhone,
  getUsers,
  initDB,
  insertUser,
} from "./database/init.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  console.log("inside home page");
  const result = getUsers();
  console.log(result);
  res.status(200).json({ result, time: new Date().toISOString() });
});

const exists = (ele) => _.size(ele) > 0;

app.post("/identify", (req, res) => {
  const { email, phoneNumber } = req.body;

  // console.log(req.body);

  const emailContact = getUserByEmail({ email });
  const phoneContact = getUserByPhone({ phone: phoneNumber });

  console.log(emailContact, phoneContact);

  // when both phone and email does not exist
  if (!exists(emailContact) && !exists(phoneContact)) {
    const newContact = insertUser({
      phoneNumber,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkPrecedence: "primary",
    });

    // newContact contains the last inserted row's id
    const contact = getUserById(newContact);
    return res.json({
      contact: {
        primaryContatctId: newContact,
        emails: [contact.email],
        phoneNumbers: [contact.phoneNumber],
        secondaryContactIds: [],
      },
    });
  }

  return res.status(200).send("identify request default response");
});

app.listen(5000, () => {
  initDB();
  console.log("Db connected and server started on port 5000");
});
