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
  } else if (exists(phoneContact) && exists(emailContact)) {
    // to do
  } else if (!exists(phoneContact) && emailContact) {
    // here inside when phone contact doesn't exist but email contact does
    let isPrimary = false;
    let emailPhoneContacts;

    emailPhoneContacts = _.filter(
      emailContact,
      (d) => d.linkPrecedence == "primary"
    )[0];

    // doing this because the found email contact can be a primary or secondary
    if (emailPhoneContacts) {
      isPrimary = true;
    } else {
      emailPhoneContacts = emailContact[0];
    }

    // console.log(emailPhoneContacts, "email present");

    insertUser({
      email,
      phoneNumber,
      linkedId: isPrimary ? emailPhoneContacts.id : emailPhoneContacts.linkedId, // if found email contact is primary - then use its id otherwise use its linkedid
      linkPrecedence: "secondary",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const secondaryContacts = getUsersByLinkedId(
      isPrimary ? emailPhoneContacts.id : emailPhoneContacts.linkedId
    );

    const primaryContact = getUserById(
      isPrimary ? emailPhoneContacts.id : emailPhoneContacts.linkedId
    );

    return res.json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails: [
          primaryContact.email,
          ..._.uniq(_.map(secondaryContacts, (d) => d.email)),
        ],
        phoneNumbers: [
          primaryContact.phoneNumber,
          ..._.uniq(_.map(secondaryContacts, (d) => d.phoneNumber)),
        ],
        secondaryContactIds: _.map(secondaryContacts, (d) => d.id),
      },
    });
  } else if (!exists(emailContact) && exists(phoneContact)) {
    // here inside when email contact doesn't exist but phone contact does

    let isPrimary = false;
    let phonePhoneContacts;

    phonePhoneContacts = _.filter(
      phoneContact,
      (d) => d.linkPrecedence == "primary"
    )[0];

    // doing this because the found email contact can be a primary or secondary
    if (phonePhoneContacts) {
      isPrimary = true;
    } else {
      phonePhoneContacts = phoneContact[0];
    }

    // console.log(phonePhoneContacts, "phone present");

    insertUser({
      email,
      phoneNumber,
      linkedId: isPrimary ? phonePhoneContacts.id : phonePhoneContacts.linkedId, // if found email contact is primary - then use its id otherwise use its linkedid
      linkPrecedence: "secondary",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const secondaryContacts = getUsersByLinkedId(
      isPrimary ? phonePhoneContacts.id : phonePhoneContacts.linkedId
    );
    const primaryContact = getUserById(
      isPrimary ? phonePhoneContacts.id : phonePhoneContacts.linkedId
    );

    return res.json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails: [
          primaryContact.email,
          ..._.uniq(_.map(secondaryContacts, (d) => d.email)),
        ],
        phoneNumbers: [
          primaryContact.phoneNumber,
          ..._.uniq(_.map(secondaryContacts, (d) => d.phoneNumber)),
        ],
        secondaryContactIds: _.map(secondaryContacts, (d) => d.id),
      },
    });
  }

  return res.status(200).send("identify request default response");
});

app.listen(5000, () => {
  initDB();
  console.log("Db connected and server started on port 5000");
});
