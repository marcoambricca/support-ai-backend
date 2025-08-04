import crypto from "crypto";
import { Buffer } from "buffer";

const ENCRYPTION_KEY = Buffer.from(process.env.FERNET_KEY, "base64"); // 32 bytes
const IV_LENGTH = 12; // Recommended size for GCM

export function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Return iv + encrypted + authTag, all in base64
  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64")
  ].join(":");
}

export function decrypt(encryptedText) {
  const [ivB64, encryptedB64, authTagB64] = encryptedText.split(":");

  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

