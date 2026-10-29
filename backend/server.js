
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "library_management",
  waitForConnections: true,
  connectionLimit: 10
});

app.get("/", (req, res) => {
  res.send("Library Management API is running!");
});

// Get all books
app.get("/books", async (req, res) => {
  try {
    const [books] = await db.query(
      "SELECT * FROM books ORDER BY id DESC"
    );
    res.json(books);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Could not retrieve books" });
  }
});

// Add a book
app.post("/books", async (req, res) => {
  try {
    const { title, author, genre, isbn, quantity } = req.body;

    if (!title || !author || !isbn ||
        quantity === undefined ||
        !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 0) {
      return res.status(400).json({
        message: "Enter a title, author, ISBN, and valid quantity."
      });
    }

    const [result] = await db.query(
      `INSERT INTO books (title, author, genre, isbn, quantity)
       VALUES (?, ?, ?, ?, ?)`,
      [title, author, genre || null, isbn, Number(quantity)]
    );

    const [rows] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Could not add book. Check that the ISBN is unique."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
