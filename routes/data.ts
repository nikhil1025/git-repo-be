import { Router } from "express";
import {
  getCollectionData,
  getCollectionFields,
  getCollections,
  globalSearch,
} from "../controllers/dataController";

const router = Router();

router.get("/collections", getCollections);
router.get("/collections/:collectionName", getCollectionData);
router.get("/collections/:collectionName/fields", getCollectionFields);
router.post("/search", globalSearch);

export default router;
