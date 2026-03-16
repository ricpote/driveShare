import express from 'express';
import { MongoClient, Db } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport'; // Importante
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'; // Importante
import userRoutes from "./routes/userRoute";
import rideRoutes from "./routes/rideRoute";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 5000;

app.use(express.static(path.join(__dirname, "../fronEnd/html")));
app.use('/css', express.static(path.join(__dirname, "../fronEnd/css")));
app.use('/js', express.static(path.join(__dirname, "../fronEnd/js")));

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO PASSPORT ---
app.use(passport.initialize());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: "http://localhost:5000/api/users/auth/google/callback", // URL exata que registas no Google Console
    passReqToCallback: true
  },
  async (req: any, accessToken: any, refreshToken: any, profile: any, done: any) => {
    // Este "profile" é o que vai aparecer no req.user do teu controller
    return done(null, profile);
  }
));
// ---------------------------------

let db: Db;
const client = new MongoClient(process.env.MONGO_URI as string);

const startServer = async() =>{
  try{
    await client.connect();
    db = client.db("teste");
    console.log("MongoDB connected!");

    // As tuas rotas já recebem o db, o que está ótimo
    app.use("/api/users", userRoutes(db));
    app.use("/api/rides", rideRoutes(db));

    app.listen(PORT, () =>{
      console.log(`Server running on port ${PORT}`);
    })
  }catch(err){
    console.error(err);
  }
};

startServer();