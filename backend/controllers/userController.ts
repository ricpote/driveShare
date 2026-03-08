import { Request, Response } from "express";
import { Db } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser } from "../models/user";

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

export const loginUser = (db: Db) => async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await db.collection<IUser>("users").findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Email ou password inválidos" });
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


