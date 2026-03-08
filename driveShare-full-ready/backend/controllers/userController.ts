import { Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser } from "../models/user";

// --- REGISTO MANUAL ---
export const registerUser = (db: Db) => async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser)
      return res.status(400).json({ error: "Email já registado" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: IUser = {
      name,
      email,
      password: hashedPassword,
      phone,
      createdAt: new Date()
    };

    const result = await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: "Utilizador criado", userId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar utilizador" });
  }
};

// --- LOGIN MANUAL ---
export const loginUser = (db: Db) => async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection<IUser>("users").findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email ou password inválidos" });
    }

    // Se o utilizador existir mas não tiver password (criado via Google)
    if (!user.password) {
      return res.status(400).json({ error: "Conta registada via Google. Use o Login institucional." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Email ou password inválidos" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Login bem-sucedido", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
};

// --- NOVO: GOOGLE OAUTH CALLBACK COM RESTRIÇÃO DE DOMÍNIO ---
export const googleAuthCallback = (db: Db) => async (req: Request, res: Response) => {
  try {
    // O passport coloca os dados do Google em req.user
    const googleUser = req.user as any;

    if (!googleUser || !googleUser.emails) {
      return res.redirect("/index.html?error=auth_failed");
    }

    const email = googleUser.emails[0].value.toLowerCase();
    const name = googleUser.displayName;

    // VALIDAÇÃO OBRIGATÓRIA DO DOMÍNIO DA FACULDADE
    const dominioPermitido = "@campus.fct.unl.pt"; // <--- ALTERA PARA O TEU DOMÍNIO

    if (!email.endsWith(dominioPermitido)) {
      // Se não for da faculdade, bloqueamos o acesso imediatamente
      return res.redirect("/index.html?error=dominio_invalido");
    }

    const usersCollection = db.collection<IUser>("users");
    let user = await usersCollection.findOne({ email });

    // Se o aluno é novo, registamos na base de dados automaticamente
    if (!user) {
      const newUser: any = {
        name,
        email,
        authType: "google", // Marcamos como utilizador OAuth
        createdAt: new Date(),
        // Para utilizadores Google, deixamos a password vazia ou indefinida
      };
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    if (!user) {
      return res.redirect("/index.html?error=user_creation_failed");
    }
    // GERAÇÃO DO JWT (Mesmo formato que usas no loginUser)
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Como o OAuth é um redirecionamento de browser, enviamos o token na URL 
    // para o teu frontend conseguir guardar no localStorage
    const frontendUrl = req.app.locals.frontendUrl || "http://127.0.0.1:5500";
    res.redirect(`${frontendUrl}/html/dashboard.html?token=${token}`);

  } catch (err) {
    console.error("Erro no Google Callback:", err);
    res.redirect("/index.html?error=server_error");
  }
};

export const getCurrentUser = (db: Db) => async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await db.collection<IUser>("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } } // nunca enviar password
    );

    if (!user) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao obter utilizador" });
  }
};

