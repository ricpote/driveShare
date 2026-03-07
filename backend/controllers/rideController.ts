import { Router } from "express";
import { Db, ObjectId } from "mongodb";
import { authMiddleware } from "../middleware/authMiddleware";
import { IRide } from "../models/ride";

export default function rideRoute(db: Db) {
  const router = Router();

  router.post("/", authMiddleware, async (req, res) => {
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

      res.status(201).json({ message: "Boleia criada", rideId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao criar boleia" });
    }
  });

  return router;
};
