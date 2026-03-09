import { Router } from "express";
import {
  registerUser,
  loginUser,
  googleAuthCallback,
  rateUser,
  getMe,
  updateMe,
  getUserById
} from "../controllers/userController";
import { Db } from "mongodb";
import passport from "passport";
import { authMiddleware } from "../middleware/authMiddleware";

export default function userRoutes(db: Db) {
  const router = Router();

  // Rotas atuais (Username/Password)
  router.post("/register", registerUser(db));
  router.post("/login", loginUser(db));

  // Rating
  router.post("/rate", authMiddleware, rateUser(db));

  // Utilizador autenticado
  router.get("/me", authMiddleware, getMe(db));
  router.put("/me", authMiddleware, updateMe(db));

  // Ver perfil de outro utilizador
  router.get("/:userId", authMiddleware, getUserById(db));

  // --- OAUTH ---

  // 1. Inicia o fluxo do Google
  router.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      hd: "campus.fct.unl.pt"
    })
  );

  // 2. Callback onde o Google devolve os dados
  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/login?error=failed"
    }),
    googleAuthCallback(db)
  );

  return router;
}