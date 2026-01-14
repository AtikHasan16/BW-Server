const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion } = require("mongodb");
dotenv.config();
const app = express();
const port = process.env.PORT || 2000;

app.use(express.json());
app.use(cors());

// ========= MongoDB Connection =========

const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// ========= MongoDB Connection =========
const db = client.db("book-worm");
const userCollection = db.collection("users");
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    app.get("/api/", (req, res) => {
      res.send("Hello World!");
    });
    // ========= User Routes =========
    app.get("/api/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // ========= User Registration =========
    app.post("/api/users", async (req, res) => {
      const rawUser = req.body;
      // password hash
      const hashedPassword = await bcrypt.hash(rawUser.password, 10);
      rawUser.password = hashedPassword;
      // check if user already exists
      const existingUser = await userCollection.findOne({
        email: rawUser.email,
      });
      if (existingUser) {
        return res.status(400).send({ message: "User already exists" });
      }

      const result = await userCollection.insertOne(rawUser);
      res.send(result);
    });

    // ========= User Login ========
    app.post("/api/users/login", async (req, res) => {
      const rawUser = req.body;
      console.log(rawUser);

      const existingUser = await userCollection.findOne({
        email: rawUser.email,
      });
      if (!existingUser) {
        return res.status(400).send({ message: "User not found" });
      }
      const isPasswordMatched = await bcrypt.compare(
        rawUser.password,
        existingUser.password
      );
      if (!isPasswordMatched) {
        return res.status(400).send({ message: "Invalid password" });
      }
      res.status(200).send({ message: "Login successful", existingUser });
    });
    // ========= server listen ========
    app.listen(port, () => {
      console.log(`Database is breathing on http://localhost:${port}/`);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}
run().catch(console.dir);
