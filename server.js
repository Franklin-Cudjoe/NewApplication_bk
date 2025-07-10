const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "..", "public"))); // Serve static files from public/

// Path to the messages file
const messagesFile = path.join(__dirname, "messages.json");
const PRODUCTS_PATH = path.join(__dirname, "products.json");

// Ensure messages.json exists
if (!fs.existsSync(messagesFile)) {
  fs.writeFileSync(messagesFile, "[]", "utf8");
}

// Set up multer to save files in the images folder
const imagesDir = path.join(__dirname, "images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "images")); // Points images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Endpoint to receive contact messages
app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  const newMessage = {
    name,
    email,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Read existing messages
  const messages = JSON.parse(fs.readFileSync(messagesFile, "utf8"));
  messages.push(newMessage);

  // Write updated messages
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2), "utf8");
  res.send({ status: "success", message: "Message saved" });
});

// Endpoint to view all messages
app.get("/api/messages", (req, res) => {
  const messages = JSON.parse(fs.readFileSync(messagesFile, "utf8"));
  res.json(messages);
});

// Endpoint to mark message as read
app.patch("/api/messages/:index/read", (req, res) => {
  const messages = JSON.parse(fs.readFileSync(messagesFile, "utf8"));
  const idx = parseInt(req.params.index, 10);
  if (isNaN(idx) || idx < 0 || idx >= messages.length) {
    return res.status(400).json({ error: "Invalid message index" });
  }
  messages[idx].read = req.body.read;
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2), "utf8");
  res.json({ success: true });
});

// GET all products
app.get("/products", (req, res) => {
  fs.readFile(PRODUCTS_PATH, "utf8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Failed to read products.json" });
    try {
      const products = JSON.parse(data);
      res.json(products);
    } catch (e) {
      res.status(500).json({ error: "Invalid products.json format" });
    }
  });
});

// POST to add a product with images
app.post("/products", upload.array("images"), (req, res) => {
  fs.readFile(PRODUCTS_PATH, "utf8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Failed to read products.json" });
    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: "Invalid products.json format" });
    }
    const { name, price, scripture, category } = req.body;
    const images = (req.files || []).map((file) => "images/" + file.filename);
    const newProduct = { name, price, scripture, category, images };
    products.push(newProduct);
    fs.writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2), (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to write products.json" });
      res.json(newProduct);
    });
  });
});

// PUT to update a product by index
app.put("/products/:index", upload.array("images"), (req, res) => {
  fs.readFile(PRODUCTS_PATH, "utf8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Failed to read products.json" });
    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: "Invalid products.json format" });
    }
    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= products.length) {
      return res.status(400).json({ error: "Invalid product index" });
    }
    const { name, price, scripture, category } = req.body;
    const images =
      (req.files || []).length > 0
        ? req.files.map((file) => "images/" + file.filename)
        : products[idx].images;
    products[idx] = { name, price, scripture, category, images };
    fs.writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2), (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to write products.json" });
      res.json({ success: true });
    });
  });
});

// DELETE to remove a product by index
app.delete("/products/:index", (req, res) => {
  fs.readFile(PRODUCTS_PATH, "utf8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Failed to read products.json" });
    let products = [];
    try {
      products = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: "Invalid products.json format" });
    }
    const idx = parseInt(req.params.index, 10);
    if (isNaN(idx) || idx < 0 || idx >= products.length) {
      return res.status(400).json({ error: "Invalid product index" });
    }
    products.splice(idx, 1);
    fs.writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2), (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to write products.json" });
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
