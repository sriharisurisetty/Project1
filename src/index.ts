const getMessage = (): string => {
    const message: string = "Hello, TypeScript!";
    return message;
}; 

console.log("This is a TypeScript project.");
console.log(getMessage());



import express from "express";
import sqlite3 from "sqlite3"; 
import { open, Database } from "sqlite";
import { Parser } from "json2csv";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";

const app = express();
app.use(express.json());
const upload = multer({ dest: "uploads/" });

let db: any;
(async () => {
  db = await open({
    filename: "./data.db",
    driver: sqlite3.Database
  });

    // Create table if not exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT
    )
  `);
})();

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}


app.get("/hello", async (req: express.Request, res: express.Response) => {
  try {
    const users = await db.all("SELECT * FROM users");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
});

app.post("/add-user", async (req: express.Request, res: express.Response) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (email.length > 50) {
    return res.status(400).json({ error: "Email must be between 20 and 50 characters long, you entered " + email.length + " characters." });
  }

  try {
    const existing = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existing) {
      return res.status(400).json({ error: "Email already exists ❌" });
    }

    await db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
    res.json({ message: "User added successfully ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add user" });
  }
});

/*app.get("/welcome", (req: express.Request, res: express.Response) => {
  res.send(`<h2>User Data from database</h2>
    <table border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr><th>ID</th><th>Name</th><th>Email</th></tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
    <script>
      async function loadUsers() {
        const res = await fetch("/hello");
        const users = await res.json();
        const body = document.getElementById("tableBody");
        body.innerHTML = users.map(u => 
          \`<tr><td>\${u.id}</td><td>\${u.name}</td><td>\${u.email}</td></tr>\`
        ).join('');
      }
      loadUsers();
    </script>
    `);
});*/

app.get("/welcome", (req: express.Request, res: express.Response) => {
  res.send(`
    <h2>User Data from Database</h2>
    <table border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr><th>ID</th><th>Name</th><th>Email</th></tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
    <br/>
    <form id="addForm">
      <input type="text" name="name" placeholder="Name" required/>
      <input type="email" name="email" placeholder="Email" required />
      <button type="submit">Add User</button>
    </form>
    <p id="msg"></p>

    <script>
      async function loadUsers() {
        const res = await fetch("/hello");
        const users = await res.json();
        const body = document.getElementById("tableBody");
        body.innerHTML = users.map(u => 
          \`<tr><td>\${u.id}</td><td>\${u.name}</td><td>\${u.email}</td></tr>\`
        ).join('');
      }

      document.getElementById("addForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get("name");
        const email = formData.get("email");

        const res = await fetch("/add-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email })
        });

        const data = await res.json();
        document.getElementById("msg").innerText = data.message || data.error;
        loadUsers(); // refresh table
      });

      loadUsers();
    </script>
  `);
});

app.get("/duplicates", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    // Delete duplicate users while keeping the row with the smallest id per email
    const result = await db.run(`
      DELETE FROM users
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM users
        GROUP BY email
      );
    `);
if(result?.changes === 0) {
      return res.json({ message: "No duplicate records found to delete." });
    } 
    res.json({ message: "Duplicate records deleted successfully ✅", changes: result?.changes });
  } catch (error) {
    console.error("Error fetching duplicates:", error);
    res.status(500).json({ error: "Failed to fetch duplicates" });
  }
});

app.delete("/users/:email", async (req, res) => {
  const email = req.params.email;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await db.run("DELETE FROM users WHERE email LIKE ?", [`%${email}%`]);

    if (result?.changes === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully ✅", changes: result?.changes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/users/export", async (req, res) => {
  const limit = Number(req.query.limit) || 100; // optional: limit number of users
  const offset = Number(req.query.offset) || 0;

  try {
    const users = await db.all(
      "SELECT id, name, email FROM users LIMIT ? OFFSET ?",
      [limit, offset]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    const fields = ["id", "name", "email"];
    const parser = new Parser({ fields });
    const csv = parser.parse(users);

    res.header("Content-Type", "text/csv");
    res.attachment("users.csv"); 
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export users" });
  }
});

app.post("/users/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "CSV file is required" });
  }

  const users: any[] = [];

  try {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        // Example CSV headers: name,email
        if (row.name && row.email) {
          users.push({ name: row.name, email: row.email });
        }
      })
      .on("end", async () => {
        try {
          // Insert all users into DB
          for (const user of users) {
            await db.run("INSERT INTO users (name, email) VALUES (?, ?)", [
              user.name,
              user.email,
            ]);
          }

          if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path); // delete uploaded file after processing
          }
          res.json({ message: "Users imported successfully ✅", count: users.length });
        } catch (dbError) {
          console.error(dbError);
          res.status(500).json({ error: "Failed to insert users" });
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to import users" });
  }
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});