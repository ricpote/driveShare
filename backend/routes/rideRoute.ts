import { Router } from "express";
import rideRoute from "../controllers/rideController";
import { Db } from "mongodb";

export default function rideRoutes(db: Db){
    const router = Router();

    router.post("/createRide", rideRoute(db));


    return router;
};