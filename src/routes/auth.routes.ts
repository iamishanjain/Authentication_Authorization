import express from "express";
import { Router } from "express";
import {
  loginHandler,
  registerHandler,
  verifyEmailhandler,
} from "../controllers/auth";

const router = express.Router();

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/verify-email", verifyEmailhandler);

export default router;
