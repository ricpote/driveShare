import { ObjectId } from 'mongodb';

export interface IRide {
  _id?: ObjectId;
  driver: ObjectId;
  passengers: ObjectId[];
  from: string;
  to: string;
  date: Date;
  arrivalTime: Date;
  totalSeats: number;
  availableSeats: number;
  startLocation?: {
    lat: number;
    lng: number;
  };
  destinationLocation?: {
    lat: number;
    lng: number;
  };
  comment?: string;
  createdAt?: Date;
}