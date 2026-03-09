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

    if (existingUser) {
      return res.status(400).json({ error: "Email já registado" });
    }

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

    res.status(201).json({
      message: "Utilizador criado",
      userId: result.insertedId
    });
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

    if (!user.password) {
      return res.status(400).json({
        error: "Conta registada via Google. Use o Login institucional."
      });
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

// --- GOOGLE OAUTH CALLBACK ---
export const googleAuthCallback = (db: Db) => async (req: Request, res: Response) => {
  try {
    const googleUser = req.user as any;

    if (!googleUser || !googleUser.emails) {
      return res.redirect("/index.html?error=auth_failed");
    }

    const email = googleUser.emails[0].value.toLowerCase();
    const name = googleUser.displayName;

    const dominioPermitido = "@campus.fct.unl.pt";

    if (!email.endsWith(dominioPermitido)) {
      return res.redirect("/index.html?error=dominio_invalido");
    }

    const usersCollection = db.collection<IUser>("users");
    let user = await usersCollection.findOne({ email });

    if (!user) {
      const newUser: IUser = {
        name,
        email,
        ratingAverage: null,
        ratingCount: 0,
        createdAt: new Date()
      };

      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    if (!user) {
      return res.redirect("/index.html?error=user_creation_failed");
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.redirect(`http://localhost:5500/pages/dashboard.html?token=${token}`);
  } catch (err) {
    console.error("Erro no Google Callback:", err);
    res.redirect("/index.html?error=server_error");
  }
};

// --- RATE USER ---
export const rateUser = (db: Db) => async (req: Request, res: Response) => {
  try {
    const loggedUserId = (req as any).user.userId;
    const { userId, rating } = req.body;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID de utilizador inválido" });
    }

    const numericRating = Number(rating);

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: "Rating deve ser um número entre 1 e 5" });
    }

    if (String(loggedUserId) === String(userId)) {
      return res.status(400).json({ error: "Não podes avaliar o teu próprio perfil" });
    }

    const users = db.collection<IUser>("users");
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    const currentAverage = user.ratingAverage || 0;
    const currentCount = user.ratingCount || 0;

    const newCount = currentCount + 1;
    const newAverage = (currentAverage * currentCount + numericRating) / newCount;
    const roundedAverage = Number(newAverage.toFixed(1));

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          ratingAverage: roundedAverage,
          ratingCount: newCount
        }
      }
    );

    res.status(200).json({
      message: "Rating atualizado",
      ratingAverage: roundedAverage,
      ratingCount: newCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao avaliar utilizador" });
  }
};

// --- GET ME ---
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

// --- UPDATE ME ---
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
          name: String(name).trim(),
          phone: String(phone).trim()
        }
      }
    );

    const updatedUser = await db.collection<IUser>("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    res.status(200).json({
      message: "Dados atualizados com sucesso",
      user: {
        name: updatedUser.name || null,
        email: updatedUser.email || null,
        phone: updatedUser.phone || null,
        ratingAverage: updatedUser.ratingAverage ?? null,
        ratingCount: updatedUser.ratingCount ?? 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar dados do utilizador" });
  }
};

// --- GET USER BY ID ---
export const getUserById = (db: Db) => async (
  req: Request<{ userId: string }>,
  res: Response
) => {
  try {
    const { userId } = req.params;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "ID de utilizador inválido" });
    }

    const user = await db.collection<IUser>("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: "Utilizador não encontrado" });
    }

    res.status(200).json({
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      ratingAverage: user.ratingAverage ?? null,
      ratingCount: user.ratingCount ?? 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao obter perfil do utilizador" });
  }
};