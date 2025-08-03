//Add the functions to fetch data from user's api

//Add the functions variable for the model to use

//Example
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
