import { Router } from "express";
import {
  checkUser,
  getAllUser,
  onBoardUser,
} from "../controllers/AuthController.js";

const router = Router();

router.post("/check-user", checkUser);
router.post("/onboard-user", onBoardUser);
router.get("/get-contacts", getAllUser);

export default router;
