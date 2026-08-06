import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import inspectionRouter from "./inspection";
import auditRouter from "./audit";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(inspectionRouter);
router.use(auditRouter);
router.use(chatRouter);

export default router;
