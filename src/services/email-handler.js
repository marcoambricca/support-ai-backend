import Imap from "imap";
import { simpleParser } from "mailparser";
import { findOneByField, insertRow } from "./supabase.js";
import { generateClientReply } from "./openai-service.js";
import { decrypt } from "../utils/encryption.js";
import nodemailer from "nodemailer";

async function sendEmailReply({ user, to, subject = "Re: Tu consulta", text }) {
  const decryptedPassword = decrypt(user.password);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user.email,
      pass: decryptedPassword,
    },
  });

  const mailOptions = {
    from: user.email,
    to,
    subject,
    text,
  };

  return transporter.sendMail(mailOptions);
}

export async function handleEmailsForUser(user) {
  const decryptedPassword = decrypt(user.encryptedPassword);

  console.log("Entered email handling function");
  console.log("User received:\n", user);
  //Create IMAP connection
  const imap = new Imap({
    user: user.email,
    password: decryptedPassword,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
  });

  //Initialize IMAP Connection
  imap.once("ready", function () {
    console.log("initialized imap connection");
    imap.openBox("INBOX", false, function (err, box) {
      if (err) throw err;

      imap.search(["UNSEEN"], function (err, results) {
        if (err || !results.length) {
          imap.end();
          return;
        }

        const f = imap.fetch(results, { bodies: "", markSeen: true });

        console.log("emails fetched:\n", f);

        f.on("message", function (msg) {
          msg.on("body", async function (stream) {
            const parsed = await simpleParser(stream);
            const from = parsed.from.value[0].address;
            const subject = parsed.subject || "";
            const text = parsed.text || "";

            try {
              // Check if client already exists
              let client = await findOneByField("clients", "email", from);

              if (!client) {
                client = await insertRow("clients", {
                  email: from,
                  id_user: user.user_id,
                });
              }

              // Save message to conversations table
              await insertRow("conversations", {
                client_id: client.id,
                message: text,
                created_at: new Date().toISOString(),
              });

              // Call AI to generate a reply
              const reply = await generateClientReply({
                userIdentificator: user.email,
                from,
                text,
              });

              if (reply) {
                try {
                  await sendEmailReply({
                    user,
                    to: from,
                    text: reply,
                  });
                  console.log(`Reply sent to ${from}`);
                } catch (err) {
                  console.error("Failed to send email:", err);
                }
              } else {
                console.log(`Marked for human review: ${from}`);
              }
            } catch (e) {
              console.error("Error processing email:", e);
            }
          });
        });

        f.once("end", function () {
          imap.end();
        });
      });
    });
  });

  imap.once("error", function (err) {
    console.error("IMAP error:", err);
  });

  imap.connect();
}
