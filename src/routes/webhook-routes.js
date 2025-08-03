import { Router } from "express";
//import WebhookService from '../services/webhook-service.js';
import axios from "axios";

const router = Router();
//const svc = new WebhookService();
router.post("/store/redact", async (req, res) => {
  let respuesta;
  try {
    respuesta = res.status(200).send("OK");
  } catch (error) {
    respuesta = res.status(500).send("Error interno.");
  }

  return respuesta;
});
router.post("/customers/redact", async (req, res) => {
  let respuesta;
  try {
    respuesta = res.status(200).send("OK");
  } catch (error) {
    respuesta = res.status(500).send("Error interno.");
  }

  return respuesta;
});
router.post("/customers/data_request", async (req, res) => {
  let respuesta;
  try {
    respuesta = res.status(200).send("OK");
  } catch (error) {
    respuesta = res.status(500).send("Error interno.");
  }

  return respuesta;
});

export default router;
