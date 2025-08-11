import fs from "fs-extra";
import path from "path";
import qrcode from "qrcode";
import pkg from "whatsapp-web.js";
import {
  findManyByFields,
  insertRow,
  updateRowByFields,
} from "../services/supabase.js";
import { generateClientReply } from "./openai-service.js";

const { Client, LocalAuth } = pkg;

const SESSIONS_DIR = path.join(process.cwd(), "data", "whatsapp_sessions");
fs.ensureDirSync(SESSIONS_DIR);

const sessions = new Map();

async function persistSessionToDb(userId, sessionObj) {
  try {
    const existing = await findManyByFields("whatsapp_sessions", {
      user_id: userId,
    });
    if (existing.length > 0) {
      await updateRowByFields(
        "whatsapp_sessions",
        { user_id: userId },
        { session: sessionObj },
      );
    } else {
      await insertRow("whatsapp_sessions", {
        user_id: userId,
        session: sessionObj,
      });
    }
  } catch (err) {
    console.error("Failed to persist session to DB:", err);
  }
}

async function loadSessionData(userId) {
  const fpath = path.join(SESSIONS_DIR, `${userId}.json`);
  if (await fs.pathExists(fpath)) {
    try {
      return await fs.readJson(fpath);
    } catch (err) {
      console.warn("Failed reading session file:", fpath, err);
    }
  }

  try {
    const rows = await findManyByFields("whatsapp_sessions", {
      user_id: userId,
    });
    if (rows.length) return rows[0].session;
  } catch (err) {
    console.warn("Failed reading session from DB:", err);
  }

  return null;
}

async function saveSessionToFile(userId, sessionObj) {
  const fpath = path.join(SESSIONS_DIR, `${userId}.json`);
  try {
    await fs.writeJson(fpath, sessionObj, { spaces: 2 });
  } catch (err) {
    console.error("Error saving session file:", err);
  }
}

export async function createClientForUser(userId, onQrCallback = () => {}) {
  const uid = String(userId);
  console.log("userid in wpp", userId);

  // If client already running, return early
  if (sessions.has(uid) && sessions.get(uid).client) {
    return { alreadyRunning: true };
  }

  // Load session (file or db)
  const sessionData = await loadSessionData(userId);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: uid,
      dataPath: path.join(SESSIONS_DIR, uid),
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  let qrSent = false;
  let qrResolve;
  const qrPromise = new Promise((resolve) => {
    qrResolve = resolve;
  });

  client.on("qr", async (qr) => {
    if (qrSent) return; // avoid duplicate QR send

    const dataUrl = await qrcode.toDataURL(qr);
    qrSent = true;
    onQrCallback(null, dataUrl);
    qrResolve({ qr: dataUrl });
  });

  client.on("authenticated", async (session) => {
    if (!session) {
      console.warn("No session data received on authenticated event");
      return;
    }
    await persistSessionToDb(userId, session);
    await saveSessionToFile(userId, session);
    console.log(`WhatsApp authenticated for user ${userId}`);
  });

  client.on("ready", () => {
    console.log(`WhatsApp client ready for user ${userId}`);
    sessions.set(uid, {
      client,
      status: "ready",
      lastSeen: new Date(),
    });
  });

  client.on("auth_failure", (msg) => {
    console.error(`Auth failure for user ${userId}:`, msg);
  });

  client.on("disconnected", (reason) => {
    console.log(`WhatsApp client disconnected for user ${userId}: ${reason}`);
    const s = sessions.get(uid) || {};
    s.status = "disconnected";
    sessions.set(uid, s);
  });

  client.on("message_create", async (msg) => {
    console.log("entered message create: ", msg);
    if (msg.fromMe) return;

    const from = msg.from.split("@")[0];

    try {
      const userMessage = msg._data.body || "";
      console.log("usermsg", userMessage);
      const result = await handleWhatsappMessage(userId, from, userMessage);
      console.log("result", result);

      if (result.success && result.botResponse) {
        await client.sendMessage(msg.from, result.botResponse);
      } else {
        console.log("Marked for human review:", from);
      }
    } catch (err) {
      console.error("Error handling incoming whatsapp message:", err);
    }
  });

  try {
    await client.initialize();

    // Save client immediately after init to prevent race conditions
    sessions.set(uid, {
      client,
      status: "initializing",
      lastSeen: new Date(),
    });
  } catch (err) {
    console.error("Failed to initialize WhatsApp client:", err);
    onQrCallback(err);
    throw err;
  }

  return { client, qrPromise, alreadyRunning: false };
}

export async function stopClientForUser(userId) {
  const uid = String(userId);
  const s = sessions.get(uid);
  if (!s) return false;
  try {
    await s.client.destroy();
  } catch (err) {
    console.warn("Error destroying client:", err);
  }
  sessions.delete(uid);
  return true;
}

export async function handleWhatsappMessage(idUser, clientNumber, userMessage) {
  console.log("iduser in handlewpp", idUser);
  console.log("clientNumber in handle wpp", clientNumber);
  console.log("usermsg in handle wpp", userMessage);
  try {
    if (!idUser || !clientNumber || typeof userMessage !== "string") {
      return { success: false, status: 400, message: "Invalid params" };
    }

    const existingClientRows = await findManyByFields("clients", {
      phone: clientNumber,
    });
    let client = existingClientRows && existingClientRows[0];

    let clientId;
    if (!client) {
      const inserted = await insertRow("clients", {
        phone: clientNumber,
        id_user: Number(idUser),
      });
      clientId = inserted.id;
    } else {
      clientId = client.id;
      if (!client.id_user) {
        try {
          await updateRowByFields(
            "clients",
            { id: client.id },
            { id_user: Number(idUser) },
          );
        } catch (e) {
          console.log(e);
        }
      }
    }

    const botResponse = await generateClientReply({
      userIdentificator: idUser,
      from: clientNumber,
      text: userMessage,
    });
    console.log("botresponse in handlewpp", botResponse);

    await insertRow("conversations", {
      client_id: clientId,
      message: userMessage,
      created_at: new Date().toISOString(),
    });

    if (!botResponse) {
      await updateRowByFields(
        "clients",
        { id: clientId },
        { needs_human: true },
      );
      return {
        success: false,
        status: 202,
        message: "Marked for human review",
      };
    }

    return { success: true, botResponse };
  } catch (error) {
    console.error("Error in handleWhatsappMessage:", error);
    return {
      success: false,
      status: error.status || 500,
      message: error.message || "Internal server error",
    };
  }
}
