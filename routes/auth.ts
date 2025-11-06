import { Router } from "express";
import {
  getAuthUrl,
  getIntegrationStatus,
  handleCallback,
} from "../controllers/authController";

const router = Router();

router.get("/auth-url", getAuthUrl);
router.get("/callback", handleCallback);
router.post("/callback", handleCallback);
router.get("/status", getIntegrationStatus);

export default router;
