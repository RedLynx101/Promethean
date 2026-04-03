import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workflowsRouter from "./workflows";
import pipelineRouter from "./pipeline";
import templatesRouter from "./templates";
import executionsRouter from "./executions";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workflowsRouter);
router.use(pipelineRouter);
router.use(templatesRouter);
router.use(executionsRouter);
router.use(alertsRouter);
router.use(dashboardRouter);

export default router;
