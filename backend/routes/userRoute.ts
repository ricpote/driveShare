import { Router } from "express";
import { registerUser, loginUser } from "../controllers/userController";
import { Db } from "mongodb";

export default function userRoutes(db: Db) {
  const router = Router();

  router.post("/register", registerUser(db));
  router.post("/login", loginUser(db));

  return router;
}