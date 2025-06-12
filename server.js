const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());

const predictions = {};

app.get("/", (req, res) => {
  res.send("SlotJack Prediction System is running!");
});

app.get("/se-predict", async (req, res) => {
  const username = (req.query.username || "").toLowerCase();
  const message = (req.query.message || "").trim();

  // Tahmin "x10", "x15", vs. gibi mi?
  const match = message.match(/^x(\d{1,3})$/i);
  if (!match) {
    return res.send(`@${username}, geçerli bir tahmin için örnek: x20`);
  }

  const prediction = parseInt(match[1]);

  // Zaten tahminde bulunmuş mu?
  if (predictions[username]) {
    return res.send(`@${username}, zaten tahminde bulundun.`);
  }

  predictions[username] = prediction;

  // Başarılı tahmin → sessiz kal
  return res.send('');
});

app.get("/reset", (req, res) => {
  Object.keys(predictions).forEach((key) => delete predictions[key]);
  res.send("Tahminler sıfırlandı.");
});

app.get("/all", (req, res) => {
  res.json(predictions);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
});
