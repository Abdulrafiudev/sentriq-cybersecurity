import { Router } from "express";
import * as controller from "../controllers/system.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/health", controller.health);
router.get("/taxonomy", controller.taxonomy);
router.get("/routing-rules", requireAuth, controller.routingRules);
router.get("/evaluation", requireAuth, controller.latestEvaluation);
router.get("/evaluation/history", requireAuth, controller.evaluationHistory);

export default router;
