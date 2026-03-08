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
  comment?: string;
  startLocation?: {
    lat: number;
    lng: number;
  };
  createdAt?: Date;
}