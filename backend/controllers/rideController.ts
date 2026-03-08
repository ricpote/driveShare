import { Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import { IRide } from "../models/ride";

export const createRide = (db: Db) => async (req: Request, res: Response) => {
  try {
    const { from, to, date, totalSeats } = req.body;

    if (!from || !to || !date || !totalSeats) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    const driverId = (req as any).user.userId;

    const newRide: IRide = {
      driver: new ObjectId(driverId),
      passengers: [],
      from,
      to,
      date: new Date(date),
      totalSeats,
      availableSeats: totalSeats,
      createdAt: new Date()
    };

    const result = await db.collection("rides").insertOne(newRide);

    res.status(201).json({
      message: "Boleia criada",
      rideId: result.insertedId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar boleia" });
  }
};

// Listar todas as boleias
export const getRides = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rides = await db
      .collection("rides")
      .find()
      .sort({ date: 1 }) // boleias mais próximas primeiro
      .toArray();

    res.status(200).json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar boleias" });
  }
};
