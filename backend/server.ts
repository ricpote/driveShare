import express from 'express';
import { MongoClient, Db } from 'mongodb';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// MongoDB
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

let db: Db;

async function connectDB() {
  await client.connect();
  db = client.db('boletim-uni');
  console.log('MongoDB conectado com sucesso!');
}

connectDB().catch(console.error);

// Rotas de exemplo
app.get('/rides', async (req, res) => {
  const rides = await db.collection('rides').find({}).toArray();
  res.json(rides);
});

app.post('/rides', async (req, res) => {
  const ride = req.body;
  const result = await db.collection('rides').insertOne(ride);
  res.json(result);
});

app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));