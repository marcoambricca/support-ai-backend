import { Router } from "express";
import { handleWhatsappMessage } from "../services/whatsapp-service.js";

const router = Router();

router.post("/gpt/:id_user", async (req, res) => {
  const {
    text: userMessage,
    number: clientNumber,
    email: clientEmail,
  } = req.body;
  const { id_user } = req.params;

  const result = await handleWhatsappMessage(
    id_user,
    clientNumber,
    userMessage,
  );

  if (!result.success) {
    return res.status(result.status).json({ error: result.message });
  }

  return res.status(200).json(result.botResponse);
});

export default router;
