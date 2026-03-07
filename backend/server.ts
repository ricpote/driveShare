import express from 'express';
import { MongoClient, Db } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from "./routes/userRoute";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let db: Db;
const client = new MongoClient(process.env.MONGO_URI as string);

const startServer = async() =>{
  try{
    await client.connect();
    db = client.db("teste");
    console.log("MongoDB connected!");

    app.use("/api/users", userRoutes(db));
    

    app.listen(PORT, () =>{
      console.log(`Server running on port ${PORT}`);
    })
  }catch(err){
    console.error(err);
  }
};

startServer();

