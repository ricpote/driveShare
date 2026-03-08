import { ObjectId } from 'mongodb';

export interface IRideRequest {
  _id?: ObjectId;
  rideId: ObjectId;
  passengerId: ObjectId;
  status: "pending" | "accepted" | "rejected";
  passengerLocation?: {
    lat: number;
    lng: number;
  };
  createdAt: Date;
}