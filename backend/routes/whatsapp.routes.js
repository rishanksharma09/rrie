import express from "express";
import { handleWhatsApp } from "../controllers/whatsapp.controller.js";

const router = express.Router();

router.post("/", handleWhatsApp);

export default router;