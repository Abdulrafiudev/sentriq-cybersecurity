import { Router } from "express";
import * as controller from "../controllers/dashboard.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/stats", requireAuth, controller.stats);

export default router;
