import express from 'express';
import { MongoClient, Db } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport'; // Importante
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'; // Importante
import userRoutes from "./routes/userRoute";
import rideRoutes from "./routes/rideRoute";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5500";
const PORT = Number(process.env.PORT || 5000);

if (!MONGO_URI) throw new Error("MONGO_URI em falta no .env");
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth desativado: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET em falta no .env");
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// --- CONFIGURAÇÃO DO PASSPORT ---
app.use(passport.initialize());

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/users/auth/google/callback",
      passReqToCallback: true
    },
    async (req: any, accessToken: any, refreshToken: any, profile: any, done: any) => {
      return done(null, profile);
    }
  ));
}

app.locals.frontendUrl = FRONTEND_URL;
// ---------------------------------

let db: Db;
const client = new MongoClient(MONGO_URI);

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