import { Router } from "express";
import axios from "axios";
import { decrypt } from "../utils/encryption.js";

const router = Router();

router.post("/register", async (req, res) => {
  const existing = await findOneByField("users", "email", req.body.email);
  if (existing) {
    return res.status(409).json({ error: "User already registered" });
  }

  const fechaActual = new Date();
  const fechaRenovacion = new Date(fechaActual);
  fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);

  const user = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.name,
    store_url: req.body.store_url,
    plan: req.body.plan,
    creation_date: fechaActual,
    renovation_date: fechaRenovacion,
  };
  try {
    const newUser = await insertRow("users", user, {
      encryptFields: ["password"],
    });
    if (newUser) {
      return res.status(200).send("User succesfully created");
    } else {
      return res.status(401).send("Error creating user");
    }
  } catch (error) {
    console.log("Error in register: ", error);
    return res.status(500).send("Internal error");
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let response;
  try {
    const user = await findOneByField("users", "email", req.body.email);
    if (user && password === decrypt(user.password)) {
      response = res.status(200).json(user);
    } else {
      response = res.status(401).send("Usuario o contraseña incorrectos");
    }
  } catch (error) {
    console.log("Error in login: ", error);
    response = res.status(500).send("Internal error");
  }
  return response;
});

router.get('/:id_user', async (req, res) => {
    let response;
    try {
        const user = await findOneByField("users", "id", req.params.id_user);

        if (user) {
            response = res.status(200).json(user);
        } else {
            response = res.status(401).send('Internal error while fetching user.');
        }
    } catch (error) {
        response = res.status(500).send('Internal error while fetching user.');
    }

    return response;
});

export default router;
