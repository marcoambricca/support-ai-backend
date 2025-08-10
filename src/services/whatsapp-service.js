import { generateClientReply } from "./openai-service.js";

export async function handleWhatsappMessage(idUser, clientNumber, userMessage) {
  try {
    const botResponse = await generateClientReply(
      idUser,
      clientNumber,
      userMessage,
    );
    if (!botResponse) {
      return { status: 400, success: false, message: "Failed to generate bot response" };
    }
    const [client] = await findManyByFields("clients", { phone: clientNumber });

    let clientId;
    if (!client) {
      const inserted = await insertRow("clients", {
        phone: clientNumber,
        created_at: new Date().toISOString(),
      });
      clientId = inserted.id;
    } else {
      clientId = client.id;
    }

    await insertRow("conversations", {
      client_id: clientId,
      message: userMessage,
      created_at: new Date().toISOString(),
    });

    return { success: true, botResponse };
  } catch (error) {
    // Normalize error response
    console.error("Error in handleWhatsappMessage:", error);
    return {
      success: false,
      status: error.status || 500,
      message: error.message || "Internal server error",
    };
  }
}
