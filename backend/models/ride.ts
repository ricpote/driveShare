import { ObjectId } from 'mongodb';

export interface IRide {
  _id?: ObjectId;           // ID gerado pelo MongoDB
  driver: ObjectId;         // ID do motorista
  passengers: ObjectId[];   // IDs dos passageiros
  from: string;             // Local de partida
  to: string;               // Destino
  date: Date;               // Data/hora da boleia
  seatsAvailable: number;   // Lugares disponíveis
  createdAt?: Date; 
  updatedAt?: Date;
}