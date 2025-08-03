import OpenAI from "openai";
import { decrypt } from "../utils/encryption.js";
import {
  findOneByField,
  updateRowByFields,
  insertRow,
  findManyByFields,
} from "./supabase.js";
import { isEmailOrPhone, isEmailOrId } from "../utils/helpers.js";

//import aiFunctionMetadata from '../utils/ai-apicall-functions.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//Delete this after solving problem
async function getDeliveryStatus(orderId) {
  return `El estado del pedido ${orderId} es: En camino. Llegará mañana.`;
}

// FUNCTION METADATA FOR GPT
const functions = [
  {
    name: "getDeliveryStatus",
    description: "Obtiene el estado de un pedido dado su ID",
    parameters: {
      type: "object",
      properties: {
        orderId: { type: "string", description: "ID del pedido del cliente" },
      },
      required: ["orderId"],
    },
  },
];

export async function generateClientReply({ userIdentificator, from, text }) {
  console.log("entered ai reply function");
  console.log("user identificator:", userIdentificator);
  //Fetches user by Id or Email
  let userKey = isEmailOrId(userIdentificator);
  console.log("user key", userKey);
  const [user] = await findManyByFields("users", {
    [userKey]: userIdentificator,
  });
		console.log("user in ai func", user)

  const clientKey = isEmailOrPhone(from);
  console.log("client key", clientKey);
  const [client] = await findManyByFields("clients", { [clientKey]: from });
  console.log("check user inside ai");
  //Check if user remaining queries
  if (!user || user.remaining_queries <= 0 || !client || client.needs_human)
    return null;

  //Fetches client by phone or email

  const faqs = await findManyByFields("faqs", { user_id: user.id });
  const pastMessages = await findManyByFields(
    "conversations",
    {
      client_id: client.id,
    },
    {
      order: "timestamp",
      ascending: false,
      limit: 10,
    },
  );

  const messages = [];

  //Add FAQs to context
  if (faqs.length) {
    const formattedFaqs = faqs
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n");
    messages.push({
      role: "system",
      content: `Utiliza estas FAQs si ayudan a responder:\n${formattedFaqs}`,
    });
  }

  //Add past client messages to context
  if (pastMessages.length) {
    const contextMsgs = pastMessages.reverse().map((msg) => ({
      role: msg.from_user ? "assistant" : "user",
      content: msg.message,
    }));
    messages.push(...contextMsgs);
  }

  //Add client email body to context
  messages.push({ role: "user", content: text });

  //Add AI behaviour instructions to context
  messages.push({
    role: "system",
    content:
      "Eres un bot de atención al cliente que responde en español de forma cordial y concisa. Si el correo o mensaje de Whatsapp requiere atención humana (por ejemplo, es una queja o confuso), di: 'Un administrador se contactará contigo.'",
  });

  // INITIAL COMPLETION
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    functions,
    function_call: "auto",
  });

  const choice = response.choices[0].message;

  // If GPT wants to call a function
  if (choice.function_call) {
    console.log("entered ai function call logic");
    const { name, arguments: argsJSON } = choice.function_call;
    const args = JSON.parse(argsJSON);

    //Change this so it calls any function in an array without if statements
    let functionResult;
    if (name === "getDeliveryStatus") {
      functionResult = await getDeliveryStatus(args.orderId);
    }

    // Continue conversation with function result
    messages.push(choice); // Add assistant function_call message
    messages.push({
      role: "function",
      name,
      content: functionResult,
    });

    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });

    const reply = secondResponse.choices[0].message.content;

    const needsHuman =
      reply.includes("Un administrador se contactará contigo.") ||
      reply.toLowerCase().includes("administrador");

    if (needsHuman) {
      await updateRowByFields(
        "clients",
        {
          [clientKey]: from,
        },
        { needs_human: true },
      );

      return null;
    }

    await updateRowByFields(
      "users",
      { [userKey]: userIdentificator },
      {
        remaining_queries: user.remaining_queries - 1,
      },
    );

    return reply;
  }

  // If no function was called, return direct reply
  const reply = choice.content;
  const needsHuman =
    reply.includes("Un administrador se contactará contigo.") ||
    reply.toLowerCase().includes("administrador");

  if (needsHuman) {
    await updateRowByFields(
      "clients",
      {
        [clientKey]: from,
      },
      { needs_human: true },
    );

    return null;
  }

  await updateRowByFields(
    "users",
    { [userKey]: userIdentificator },
    {
      remaining_queries: user.remaining_queries - 1,
    },
  );

  return reply;
}
