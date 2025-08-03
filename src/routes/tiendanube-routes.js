import { Router } from "express";
import axios from "axios";
import TiendaNubeService from "../services/tiendanube-service.js";

const router = Router();
const svc = new TiendaNubeService();
router.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post(
      "https://www.tiendanube.com/apps/authorize/token",
      {
        client_id: process.env.CLIENT_ID, // tu client_id (ej: 19314)
        client_secret: process.env.CLIENT_SECRET, // tu secret
        grant_type: "authorization_code",
        code,
      },
    );

    const { access_token, user_id } = response.data;

    // Guarda esto en la base de datos (user_id = store_id de la tienda)
    let state = await svc.SaveUser(user_id, access_token);

    res.status(200).send("✅ Tienda conectada correctamente");
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Error al obtener token");
  }
});
export default router;
