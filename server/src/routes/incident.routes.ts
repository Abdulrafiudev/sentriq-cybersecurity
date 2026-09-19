import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/incident.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createIncidentSchema,
  incidentIdSchema,
  listIncidentsSchema,
  updateIncidentSchema,
} from "../validators/incident.validator";

const router = Router();

/** Submission runs the LLM pipeline, so it gets a tighter budget than reads. */
const submitLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many reports submitted. Try again shortly." } },
});

router.use(requireAuth);

router.post("/", submitLimiter, validate({ body: createIncidentSchema }), controller.create);
router.get("/", validate({ query: listIncidentsSchema }), controller.list);
router.get("/:id", validate({ params: incidentIdSchema }), controller.getOne);
router.get("/:id/related", validate({ params: incidentIdSchema }), controller.getRelated);
router.get(
  "/:id/original",
  requireRole("lead"),
  validate({ params: incidentIdSchema }),
  controller.getOriginal,
);
router.patch(
  "/:id",
  validate({ params: incidentIdSchema, body: updateIncidentSchema }),
  controller.patch,
);
router.delete("/:id", requireRole("lead"), validate({ params: incidentIdSchema }), controller.remove);

export default router;
