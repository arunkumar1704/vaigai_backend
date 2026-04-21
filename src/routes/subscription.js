import { Router } from "express";
import { subscribeNewsletter } from "../controllers/subscriptionController.js";

const router = Router();

router.post("/", subscribeNewsletter);

export default router;
