import express from "express";
import { createSignalController } from "../controllers/signals.controller.js";

const router = express.Router();

router.post("/create", createSignalController);

export default router;
