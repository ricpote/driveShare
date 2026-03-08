import { Double, ObjectId } from 'mongodb';

export interface IUser {
  _id?: ObjectId;      // ID gerado pelo MongoDB
  name: string;        // Nome do aluno
  email: string;       // Email do aluno
  password: string;    // Password (pode ser hash)
  phone: string;      // Telefone 
  createdAt?: Date;    // Data de criação
  ratingAverage?: number | null; // média dos ratings recebidos
  ratingCount?: number;   //numero de ratings
}