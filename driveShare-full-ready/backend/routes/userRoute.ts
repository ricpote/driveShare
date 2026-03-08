import { Router } from "express";
import { registerUser, loginUser, googleAuthCallback } from "../controllers/userController";
import { Db } from "mongodb";
import passport from "passport";

export default function userRoutes(db: Db) {
  const router = Router();

  // Rotas atuais (Username/Password)
  router.post("/register", registerUser(db));
  router.post("/login", loginUser(db));

  // --- NOVAS ROTAS OAUTH ---

  // 1. Inicia o fluxo do Google
  router.get("/auth/google", 
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      // Tenta forçar o Google a mostrar apenas contas da faculdade na UI
      hd: "campus.fct.unl.pt" 
    })
  );

  // 2. Callback onde o Google devolve os dados
  router.get("/auth/google/callback", 
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=failed" }),
    googleAuthCallback(db) // Controller que criaremos para validar o domínio
  );

  return router;
}