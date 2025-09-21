import express from "express";
import _ from "lodash";
import {
  getUserByEmail,
  getUserById,
  getUserByPhone,
  getUsers,
  initDB,
  insertUser,
  getUsersByLinkedId,
  updateUser,
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
    // here when both phone and email contact exists
    let isPrimaryEmail = false;
    let emailPhoneContacts;

    // email contacts can be primary or secondary
    emailPhoneContacts = _.filter(
      emailContact,
      (d) => d.linkPrecedence == "primary"
    )[0];

    if (emailPhoneContacts) {
      isPrimaryEmail = true;
    } else {
      // take the first since everything is secondary
      emailPhoneContacts = emailContact[0];
    }

    let isPrimaryPhone = false;
    let phonePhoneContacts;

    // phone contacts can be primary or secondary
    phonePhoneContacts = _.filter(
      phoneContact,
      (d) => d.linkPrecedence == "primary"
    )[0];

    if (phonePhoneContacts) {
      isPrimaryPhone = true;
    } else {
      // take the first since everything is secondary
      phonePhoneContacts = phoneContact[0];
    }

    // console.log(phonePhoneContacts, emailPhoneContacts);

    if (phonePhoneContacts.id !== emailPhoneContacts.id) {
      // here when phone and email contacts are different

      // console.log("inside different phone and email contact");
      let newerContact = null;
      if (phonePhoneContacts.createdAt <= emailPhoneContacts.createdAt) {
        newerContact = emailPhoneContacts;
      } else {
        newerContact = phonePhoneContacts;
      }

      if (newerContact) {
        // newerContact = latest contact (that needs to be updated)
        // oldContact = oldest one (that will remain as it is)
        const oldContact =
          newerContact == phonePhoneContacts
            ? emailPhoneContacts
            : phonePhoneContacts;

        // this part is basically to get the secondary contacts by the contact's id that we're supposed to update later down
        const linkedId =
          isPrimaryEmail && isPrimaryPhone
            ? newerContact.id
            : isPrimaryEmail && newerContact == emailPhoneContacts
            ? newerContact.id
            : isPrimaryPhone && newerContact == phonePhoneContacts
            ? newerContact.id
            : null;
        let secondaryContacts = [];
        if (linkedId) {
          secondaryContacts = getUsersByLinkedId(newerContact.id);
        }

        // console.log(oldContact, "old contact");
        // console.log(newerContact, "new contact");
        // console.log(secondaryContacts, "secondary contacts");

        // this part is where we get the new primary linked id from the oldContact - depending on if old contact is primary or secondary
        let newLinkedId = null;
        if (oldContact == emailPhoneContacts) {
          if (isPrimaryEmail) newLinkedId = oldContact.id;
          else newLinkedId = oldContact.linkedId;
        } else if (oldContact == phonePhoneContacts) {
          if (isPrimaryPhone) newLinkedId = oldContact.id;
          else newLinkedId = oldContact.linkedId;
        }

        // get secondary contacts and update their linkedIds to the newer primary one
        if (exists(secondaryContacts)) {
          for (let contact of secondaryContacts) {
            updateUser({
              id: contact.id,
              linkedId: newLinkedId,
              linkPrecedence: "secondary",
              email: contact.email,
              phoneNumber: contact.phoneNumber,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // then update the latest contact with the oldest one's linkedid based off of createdAt
        const result = updateUser({
          id: newerContact.id,
          linkedId: newLinkedId,
          linkPrecedence: "secondary",
          email: newerContact.email,
          phoneNumber: newerContact.phoneNumber,
          updatedAt: new Date().toISOString(),
        });

        const newSecondaryContacts = getUsersByLinkedId(newLinkedId);

        // console.log(newSecondaryContacts, "new secondary contacts");

        const primaryContact = getUserById(newLinkedId);

        return res.json({
          contact: {
            primaryContatctId: primaryContact.id,
            emails: [
              primaryContact.email,
              ..._.uniq(_.map(newSecondaryContacts, (d) => d.email)),
            ],
            phoneNumbers: [
              primaryContact.phoneNumber,
              ..._.uniq(_.map(newSecondaryContacts, (d) => d.phoneNumber)),
            ],
            secondaryContactIds: _.map(newSecondaryContacts, (d) => d.id),
          },
        });
      }
    } else {
      // both phone and email contact selected have the same id => same row
      // console.log("inside same phone and email contact");

      const linkedId =
        isPrimaryEmail && isPrimaryPhone
          ? emailPhoneContacts.id // any of phone and email contact works
          : isPrimaryEmail
          ? emailPhoneContacts.id
          : isPrimaryPhone
          ? phonePhoneContacts.id
          : phonePhoneContacts.linkedId; // take any 1 of contact's linkedid

      const secondaryContacts = getUsersByLinkedId(linkedId);

      const primaryContact = getUserById(linkedId);

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

    if (!_.isNil(phoneNumber)) {
      insertUser({
        email,
        phoneNumber,
        linkedId: isPrimary
          ? emailPhoneContacts.id
          : emailPhoneContacts.linkedId, // if found email contact is primary - then use its id otherwise use its linkedid
        linkPrecedence: "secondary",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

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

    if (!_.isEmpty(email)) {
      insertUser({
        email,
        phoneNumber,
        linkedId: isPrimary
          ? phonePhoneContacts.id
          : phonePhoneContacts.linkedId, // if found email contact is primary - then use its id otherwise use its linkedid
        linkPrecedence: "secondary",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

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
