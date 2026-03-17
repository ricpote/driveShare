import { Router } from "express";
import { Db } from "mongodb";
import { authMiddleware } from "../middleware/authMiddleware";
import * as rideController from "../controllers/rideController";

export default function rideRoutes(db: Db) {
  const router = Router();

  router.post("/", authMiddleware, rideController.createRide(db));
  router.get("/", authMiddleware, rideController.getRides(db));
  router.get("/my-rides", authMiddleware, rideController.getMyRides(db));
  router.get("/joined-rides", authMiddleware, rideController.getJoinedRides(db));
  router.post("/:rideId/request", authMiddleware, rideController.requestToJoinRide(db));
  router.get("/:rideId/requests", authMiddleware, rideController.getRideRequests(db));
  router.post("/:rideId/requests/:requestId/accept", authMiddleware, rideController.acceptRideRequest(db));
  router.post("/:rideId/requests/:requestId/reject", authMiddleware, rideController.rejectRideRequest(db));
  router.post("/:rideId/cancel", authMiddleware, rideController.cancelRideParticipation(db));
  router.post("/:rideId/confirm", authMiddleware, rideController.confirmRide(db));
  router.delete("/:rideId", authMiddleware, rideController.deleteRide(db));


  return router;
}