import { Router } from "express";
import { syncGithubData } from "../controllers/githubController";

const router = Router();

router.post("/sync/:integrationId", syncGithubData);

export default router;
