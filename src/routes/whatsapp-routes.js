import { Router } from "express";
import { authenticate } from "../middleware/auth.js"; // your JWT auth middleware
import {
  createClientForUser,
  stopClientForUser,
} from "../services/whatsapp-service.js";

const router = Router();

// Start WhatsApp session & return QR code
router.post("/:userId/start", authenticate, async (req, res) => {
  const { userId } = req.params;

  // Ownership check: user can only start their own session
  if (!req.user || String(req.user.id) !== String(userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { qrPromise, alreadyRunning } = await createClientForUser(userId);

    if (alreadyRunning) {
      return res.status(200).json({ message: "Session already running" });
    }

    const qr = await qrPromise;
    return res.status(200).json({ qr: qr.qr });
  } catch (err) {
    console.error("Failed creating WhatsApp session:", err);
    return res.status(500).json({ error: "Failed to create WhatsApp session" });
  }
});

// Stop WhatsApp session
router.post("/:userId/stop", authenticate, async (req, res) => {
  const { userId } = req.params;

  if (!req.user || String(req.user.id) !== String(userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const stopped = await stopClientForUser(userId);
    return res.status(200).json({ stopped });
  } catch (err) {
    console.error("Failed to stop session:", err);
    return res.status(500).json({ error: "Failed to stop session" });
  }
});

export default router;

