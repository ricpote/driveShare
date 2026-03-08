import { Request, Response } from "express";
import { Db } from "mongodb";
import { ObjectId } from "mongodb";
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
      ratingAverage: null,
      ratingCount: 0,
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
      { userId: user._id, email: user.email },
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
        ratingAverage: null,
        ratingCount: 0,
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
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Como o OAuth é um redirecionamento de browser, enviamos o token na URL 
    // para o teu frontend conseguir guardar no localStorage
    res.redirect(`http://localhost:5500/pages/dashboard.html?token=${token}`);

  } catch (err) {
    console.error("Erro no Google Callback:", err);
    res.redirect("/index.html?error=server_error");
  }
};

export const rateUser = (db: Db) => async (req: Request, res: Response) => {
  try {
    const { userId, rating } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating deve ser entre 1 e 5" });
    }

    const users = db.collection<IUser>("users");
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });

    const currentAverage = user.ratingAverage || 0;
    const currentCount = user.ratingCount || 0;

    const newCount = currentCount + 1;
    const newAverage = (currentAverage * currentCount + rating) / newCount;

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          ratingAverage: newAverage,
          ratingCount: newCount
        }
      }
    );

    res.json({ message: "Rating atualizado", ratingAverage: newAverage });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao avaliar utilizador" });
  }
};
export const getMe = (db: Db) => async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const user = await db.collection<IUser>("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          password: 0
        }
      }
    );

    if (!user) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    res.status(200).json({
      userId: user._id,
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      ratingAverage: user.ratingAverage ?? null,
      ratingCount: user.ratingCount ?? 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao obter dados do utilizador" });
  }
};
export const updateMe = (db: Db) => async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Nome e telemóvel são obrigatórios" });
    }

    await db.collection<IUser>("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          name,
          phone
        }
      }
    );

    const updatedUser = await db.collection<IUser>("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    res.status(200).json({
      message: "Dados atualizados com sucesso",
      user: {
        userId: updatedUser?._id,
        name: updatedUser?.name || null,
        email: updatedUser?.email || null,
        phone: updatedUser?.phone || null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar dados do utilizador" });
  }
};

