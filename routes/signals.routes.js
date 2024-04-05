import express from "express";
import { createSignalController } from "../controllers/signals.controller.js";

const router = express.Router();

router.post("/create", createSignalController);

router.post("", (req, res) => {
  res.status(200).send({
    message: "Tredique API is running",
  });
});

export default router;
