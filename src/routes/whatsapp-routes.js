import { Router } from "express";
import { generateClientReply } from "../services/openai-service.js";

const router = Router();

router.post("/gpt/:id_user", async (req, res) => {
  const userMessage = req.body.text;
  const clientNumber = req.body.number || null;
  const clientEmail = req.body.email || null;

  try {
    const botResponse = await generateClientReply(
      req.params.id_user,
      clientNumber,
      userMessage,
    );

    if (!botResponse) {
      return res.status(400).send("Failed to generate bot response");
    }

    if (!clientNumber) {
      return res.status(400).send("Client number is required");
    }

    const [client] = await findManyByFields("clients", { phone: clientNumber });

    if (!client) {
      return res.status(404).send("Client not found");
    }

    await insertRow("conversations", {
      client_id: client.id,
      message: userMessage,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json(botResponse);

  } catch (error) {
    console.error("Internal error answering WhatsApp message:", error);
    return res.status(500).json({ error: error.message || error });
  }
});

export default router;
