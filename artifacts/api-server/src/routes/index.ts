import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import categoriesRouter from "./categories";
import notificationsRouter from "./notifications";
import storageRouter from "./storage";
import attachmentsRouter from "./attachments";
import googleCalendarRouter from "./google-calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(categoriesRouter);
router.use(notificationsRouter);
router.use(storageRouter);
router.use(attachmentsRouter);
router.use(googleCalendarRouter);

export default router;
