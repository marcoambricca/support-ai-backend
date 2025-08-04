import { Router } from "express";
import axios from "axios";
import { generateToken } from "../utils/jwt.js";
import { authenticate } from "../middleware/auth.js";
import bcrypt from "bcrypt";

const router = Router();

router.post("/register", async (req, res) => {
  const existing = await findOneByField("users", "email", req.body.email);
  if (existing) {
    return res.status(409).json({ error: "User already registered" });
  }

  const fechaActual = new Date();
  const fechaRenovacion = new Date(fechaActual);
  fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1);
  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  const user = {
    email: req.body.email,
    password: hashedPassword,
    name: req.body.name,
    store_url: req.body.store_url,
    plan: req.body.plan,
    creation_date: fechaActual,
    renovation_date: fechaRenovacion,
  };
  try {
    const newUser = await insertRow("users", user);
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

  try {
    const user = await findOneByField("users", "email", email);
    if (!user) {
      return res.status(401).send("Usuario o contraseña incorrectos");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).send("Usuario o contraseña incorrectos");
    }

    // Generate JWT token with minimal info
    const token = generateToken({ id: user.id, email: user.email });

    // Respond with user data AND the token
    return res.status(200).json({ user, token });
  } catch (error) {
    console.error("Error in login: ", error);
    return res.status(500).send("Internal error");
  }
});

router.get("/:id_user", authenticate, async (req, res) => {
  let response;
  try {
    const user = await findOneByField("users", "id", req.params.id_user);

    if (user) {
      response = res.status(200).json(user);
    } else {
      response = res.status(401).send("Internal error while fetching user.");
    }
  } catch (error) {
    response = res.status(500).send("Internal error while fetching user.");
  }

  return response;
});

export default router;
