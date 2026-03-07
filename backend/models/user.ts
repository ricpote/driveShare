import { ObjectId } from 'mongodb';

export interface IUserHistoryItem {
  type: 'ride_created' | 'ride_joined' | 'profile_updated'; // tipo de evento
  rideId?: ObjectId;       // se estiver relacionado a uma boleia
  date: Date;              // quando aconteceu
  details?: string;        // info extra opcional
}

export interface IUser {
  _id?: ObjectId;      // ID gerado pelo MongoDB
  name: string;        // Nome do aluno
  email: string;       // Email do aluno
  password: string;    // Password (pode ser hash)
  phone?: string;      // Telefone (opcional)
  createdAt?: Date;    // Data de criação
  updatedAt?: Date;    // Data de atualização
  history?: IUserHistoryItem[];
}