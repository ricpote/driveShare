import { Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import { IRide } from "../models/ride";
import { IRideRequest } from "../models/rideRequest";

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

export const getMyRides = (db: Db) => async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const rides = await db
      .collection("rides")
      .find({ driver: new ObjectId(userId) })
      .sort({ date: 1 })
      .toArray();

    res.status(200).json(rides);

  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar as tuas boleias" });
  }
};

export const getJoinedRides = (db: Db) => async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const rides = await db
      .collection("rides")
      .find({ passengers: new ObjectId(userId) })
      .sort({ date: 1 })
      .toArray();

    res.status(200).json(rides);

  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar boleias onde participas" });
  }
};

export const requestToJoinRide = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;
    const { lat, lng } = req.body;

    const passengerId = (req as any).user.userId;

    const ride = await db.collection("rides").findOne({
      _id: new ObjectId(rideId)
    });

    if (!ride) {
      return res.status(404).json({ error: "Boleia não encontrada" });
    }

    if (ride.driver.toString() === passengerId) {
      return res.status(400).json({ error: "Não podes entrar na tua própria boleia" });
    }

    const existingRequest = await db.collection("rideRequests").findOne({
      rideId: new ObjectId(rideId),
      passengerId: new ObjectId(passengerId),
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Já tens um pedido pendente" });
    }

    const newRequest = {
      rideId: new ObjectId(rideId),
      passengerId: new ObjectId(passengerId),
      status: "pending",
      passengerLocation: { lat, lng },
      createdAt: new Date()
    };

    await db.collection("rideRequests").insertOne(newRequest);

    res.status(201).json({ message: "Pedido enviado ao condutor" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar pedido" });
  }
};

export const getRideRequests = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;

    const requests = await db
      .collection("rideRequests")
      .find({
        rideId: new ObjectId(rideId),
        status: "pending"
      })
      .toArray();

    res.status(200).json(requests);

  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
};

export const acceptRideRequest = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;
    const requestId = req.params.rId as string;

    const request = await db.collection("rideRequests").findOne({
      _id: new ObjectId(requestId)
    });

    if (!request) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    await db.collection("rides").updateOne(
      { _id: new ObjectId(rideId) },
      {
        $push: { passengers: request.passengerId },
        $inc: { availableSeats: -1 }
      }
    );

    await db.collection("rideRequests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: "accepted" } }
    );

    res.json({ message: "Passageiro aceite" });

  } catch (err) {
    res.status(500).json({ error: "Erro ao aceitar pedido" });
  }
};

export const rejectRideRequest = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;
    const requestId = req.params.requestId as string;

    // Verificar se o pedido existe
    const request = await db.collection("rideRequests").findOne({
      _id: new ObjectId(requestId),
      rideId: new ObjectId(rideId),
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({ error: "Pedido não encontrado ou já processado" });
    }

    // Atualizar o status para 'rejected'
    await db.collection("rideRequests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: "rejected" } }
    );

    res.status(200).json({ message: "Pedido rejeitado" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao rejeitar pedido" });
  }
};

export const cancelRideParticipation = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;
    const passengerId = (req as any).user.userId;

    const rideObjectId = new ObjectId(rideId);
    const passengerObjectId = new ObjectId(passengerId);

    // Verifica se a boleia existe
    const ride = await db.collection("rides").findOne({ _id: rideObjectId });
    if (!ride) {
      return res.status(404).json({ error: "Boleia não encontrada" });
    }

    // Verifica se o utilizador está realmente na boleia
    const isPassenger = ride.passengers.some(
      (p: any) => p.toString() === passengerId
    );

    if (!isPassenger) {
      return res.status(400).json({ error: "Não estás inscrito nesta boleia" });
    }

    // Remove passageiro da boleia e aumenta availableSeats
    await db.collection("rides").updateOne(
      { _id: rideObjectId },
      {
        $pull: { passengers: passengerObjectId } as any, 
        $inc: { availableSeats: 1 }
      }
    );

    // Aqui podes enviar notificação ao condutor
    // Por agora, retornamos uma mensagem para frontend
    res.status(200).json({
      message: "Cancelamento efetuado",
      note: `O condutor (${ride.driver.toString()}) deve ser notificado.`,
      availableSeats: ride.availableSeats + 1
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cancelar participação" });
  }
};

export const deleteRide = (db: Db) => async (req: Request, res: Response) => {
  try {
    const rideId = req.params.rideId as string;
    const userId = (req as any).user.userId;

    const rideObjectId = new ObjectId(rideId);

    // 1️⃣ Buscar a boleia
    const ride = await db.collection("rides").findOne({ _id: rideObjectId });

    if (!ride) {
      return res.status(404).json({ error: "Boleia não encontrada" });
    }

    // 2️⃣ Verificar se quem está apagando é o condutor
    if (ride.driver.toString() !== userId) {
      return res.status(403).json({ error: "Apenas o condutor pode apagar a boleia" });
    }

    // 3️⃣ Checar limite de tempo
    const rideDate: Date = ride.date;
    const now = new Date();

    const rideNoon = new Date(rideDate);
    rideNoon.setHours(12, 0, 0, 0); // Meio-dia da boleia

    let cancelDeadline: Date;

    if (rideDate < rideNoon) {
      // Boleia antes do meio-dia → só pode cancelar até 22h do dia anterior
      cancelDeadline = new Date(rideDate);
      cancelDeadline.setDate(cancelDeadline.getDate() - 1);
      cancelDeadline.setHours(22, 0, 0, 0);
    } else {
      // Boleia depois do meio-dia → só pode cancelar até 3h antes
      cancelDeadline = new Date(rideDate);
      cancelDeadline.setHours(rideDate.getHours() - 3); // 3 horas antes
    }

    if (now > cancelDeadline) {
      return res.status(400).json({ error: "Não é possível cancelar a boleia neste momento por limite de tempo" });
    }

    // 4️⃣ Notificar passageiros
    const passengers = ride.passengers; // array de ObjectId
    if (passengers.length > 0) {
      const notifications = passengers.map((passengerId: ObjectId) => ({
        userId: passengerId,
        rideId: ride._id,
        type: "ride_cancelled",
        message: `O condutor cancelou a boleia de ${ride.from} → ${ride.to}`,
        createdAt: new Date()
      }));

      await db.collection("notifications").insertMany(notifications);
    }

    // 5️⃣ Remover a boleia
    await db.collection("rides").deleteOne({ _id: rideObjectId });

    // 6️⃣ Remover pedidos pendentes
    await db.collection("rideRequests").deleteMany({ rideId: rideObjectId });

    res.status(200).json({ message: "Boleia apagada e passageiros notificados" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao apagar a boleia" });
  }
};