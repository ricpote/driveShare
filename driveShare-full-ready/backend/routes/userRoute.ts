import { Router } from "express";
import { registerUser, loginUser, googleAuthCallback, getCurrentUser } from "../controllers/userController";
import { Db } from "mongodb";
import passport from "passport";
import { authMiddleware } from "../middleware/authMiddleware";

export default function userRoutes(db: Db) {
  const router = Router();

  // Rotas atuais
  router.post("/register", registerUser(db));
  router.post("/login", loginUser(db));

  // ROTA NOVA (dados do utilizador logado)
  router.get("/me", authMiddleware, getCurrentUser(db));

  // Google OAuth
  router.get("/auth/google", 
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      hd: "campus.fct.unl.pt" 
    })
  );

  router.get("/auth/google/callback", 
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=failed" }),
    googleAuthCallback(db)
  );

  return router;
}