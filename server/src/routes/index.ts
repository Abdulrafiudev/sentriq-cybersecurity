import { Router } from "express";
import incidentRoutes from "./incident.routes";
import dashboardRoutes from "./dashboard.routes";
import authRoutes from "./auth.routes";
import systemRoutes from "./system.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/incidents", incidentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/", systemRoutes);

export default router;
