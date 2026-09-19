import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema } from "../validators/incident.validator";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many sign-in attempts. Wait 15 minutes." } },
});

router.get("/config", controller.config);
router.post("/login", loginLimiter, validate({ body: loginSchema }), controller.signIn);
router.get("/me", requireAuth, controller.me);

export default router;
