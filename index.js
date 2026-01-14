const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
const booksCollection = db.collection("books");
const genresCollection = db.collection("genres");
const tutorialsCollection = db.collection("tutorials");
const shelvesCollection = db.collection("shelves");
const reviewsCollection = db.collection("reviews");

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
      // console.log(rawUser);

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

    // ========= Books Routes =========
    // Create new book
    app.post("/api/books", async (req, res) => {
      const bookData = req.body;
      const result = await booksCollection.insertOne(bookData);
      res.send(result);
    });

    // Get all books (with optional filtering)
    app.get("/api/books", async (req, res) => {
      const { search, genre } = req.query;
      let query = {};

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
        ];
      }

      if (genre) {
        query.genre = genre;
      }

      const result = await booksCollection.find(query).toArray();
      res.send(result);
    });

    // Get single book details
    app.get("/api/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booksCollection.findOne(query);
      res.send(result);
    });

    // Update book details
    app.patch("/api/books/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await booksCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete a book
    app.delete("/api/books/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booksCollection.deleteOne(query);
      res.send(result);
      // ... existing books routes ...
    });

    // ========= Generic Routes =========

    // Get all genres
    app.get("/api/genres", async (req, res) => {
      const result = await genresCollection.find().sort({ name: 1 }).toArray();
      res.send(result);
    });

    // Add new genre
    app.post("/api/genres", async (req, res) => {
      const genreData = req.body;
      // Case insensitive check
      const existing = await genresCollection.findOne({
        name: { $regex: new RegExp(`^${genreData.name}$`, "i") },
      });
      if (existing) {
        return res.status(400).send({ message: "Genre already exists" });
      }
      const result = await genresCollection.insertOne(genreData);
      res.send(result);
    });

    // Update genre
    app.patch("/api/genres/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updatedData,
      };
      const result = await genresCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete genre
    app.delete("/api/genres/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await genresCollection.deleteOne(query);
      res.send(result);
    });

    // ========= Tutorial Routes =========

    // Get all tutorials
    app.get("/api/tutorials", async (req, res) => {
      const result = await tutorialsCollection
        .find()
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // Add new tutorial
    app.post("/api/tutorials", async (req, res) => {
      const tutorialData = req.body;
      const result = await tutorialsCollection.insertOne(tutorialData);
      res.send(result);
    });

    // Delete tutorial
    app.delete("/api/tutorials/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tutorialsCollection.deleteOne(query);
      res.send(result);
    });

    // ========= Shelf Routes =========
    app.post("/api/shelves", async (req, res) => {
      const { userId, bookInfo, shelf } = req.body;
      const filter = { userId, bookInfo };
      const updateDoc = {
        $set: { userId, bookInfo, shelf, updatedAt: new Date() },
      };
      const result = await shelvesCollection.updateOne(filter, updateDoc, {
        upsert: true,
      });
      res.send(result);
    });

    // ========= Review Routes =========
    // Get approved reviews for a book
    app.get("/api/reviews/:bookId", async (req, res) => {
      const bookId = req.params.bookId;
      const query = { bookId, status: "approved" };
      const result = await reviewsCollection
        .find(query)
        .sort({ _id: -1 })
        .toArray();
      res.send(result);
    });

    // Submit a review
    app.post("/api/reviews", async (req, res) => {
      const reviewData = req.body;
      const newReview = {
        ...reviewData,
        status: "pending",
        createdAt: new Date(),
      };
      const result = await reviewsCollection.insertOne(newReview);
      res.send(result);
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
