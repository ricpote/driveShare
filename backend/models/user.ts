import { ObjectId } from 'mongodb';

export interface IUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  createdAt?: Date;
  ratingAverage?: number | null;
  ratingCount?: number;
  authType?: "manual" | "google";
}