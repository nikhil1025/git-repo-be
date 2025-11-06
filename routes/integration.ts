import { Router } from "express";
import {
  getIntegrationDetails,
  removeIntegration,
  resyncIntegration,
} from "../controllers/integrationController";

const router = Router();

router.get("/:integrationId", getIntegrationDetails);
router.delete("/:integrationId", removeIntegration);
router.post("/:integrationId/resync", resyncIntegration);

export default router;
