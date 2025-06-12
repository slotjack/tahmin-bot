const express = require('express');
const app = express();
app.use(express.json());

let predictions = {};
let gameState = 'closed'; // 'open', 'closed'
let gameId = 0;

// CORS için
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Ana sayfa (çalışıp çalışmadığını kontrol için)
app.get('/', (req, res) => {
  res.json({
    status: 'Bot çalışıyor!',
    gameState: gameState,
    activePredictions: Object.keys(predictions).length
  });
});

// Tahmin açma - POST versiyonu
app.post('/open', (req, res) => {
  predictions = {};
  gameState = 'open';
  gameId++;
  res.json({
    message: `🎯 X Tahmin Yarışması #${gameId} Başladı! 🎯\nSlot oyunundan kaç X çıkacağını tahmin edin!\nKomut: !tahmin [sayı] (Örnek: !tahmin 50)`
  });
});

// Tahmin açma - GET versiyonu (StreamElements için)
app.get('/open', (req, res) => {
  predictions = {};
  gameState = 'open';
  gameId++;
  res.json({
    message: `🎯 X Tahmin Yarışması #${gameId} Başladı! 🎯\nSlot oyunundan kaç X çıkacağını tahmin edin!\nKomut: !tahmin [sayı] (Örnek: !tahmin 50)`
  });
});

// Tahmin yapma - POST versiyonu
app.post('/predict', (req, res) => {
  const username = req.body.username;
  const prediction = parseFloat(req.body.prediction);
  
  if (gameState !== 'open') {
    return res.json({message: 'Tahmin sistemi şu anda kapalı!'});
  }
  
  if (isNaN(prediction) || prediction <= 0) {
    return res.json({message: `${username} geçersiz tahmin! Pozitif sayı girin.`});
  }
  
  if (predictions[username]) {
    return res.json({message: `${username} zaten tahmin yaptınız! (${predictions[username].prediction}x)`});
  }
  
  // Tahmin ve zaman damgası kaydet
  predictions[username] = {
    prediction: prediction,
    timestamp: Date.now()
  };
  
  res.json({
    message: `${username} ${prediction}x tahmini kaydedildi! 🎯 Toplam tahmin: ${Object.keys(predictions).length}`
  });
});

// Tahmin yapma - GET versiyonu (StreamElements için)
app.get('/predict', (req, res) => {
  const username = req.query.username;
  const prediction = parseFloat(req.query.prediction);
  
  if (gameState !== 'open') {
    return res.json({message: 'Tahmin sistemi şu anda kapalı!'});
  }
  
  if (isNaN(prediction) || prediction <= 0) {
    return res.json({message: `${username} geçersiz tahmin! Pozitif sayı girin.`});
  }
  
  if (predictions[username]) {
    return res.json({message: `${username} zaten tahmin yaptınız! (${predictions[username].prediction}x)`});
  }
  
  // Tahmin ve zaman damgası kaydet
  predictions[username] = {
    prediction: prediction,
    timestamp: Date.now()
  };
  
  res.json({
    message: `${username} ${prediction}x tahmini kaydedildi! 🎯 Toplam tahmin: ${Object.keys(predictions).length}`
  });
});

// Tahmin kapama - POST versiyonu
app.post('/close', (req, res) => {
  if (gameState === 'closed') {
    return res.json({message: 'Tahminler zaten kapalı!'});
  }
  
  gameState = 'closed';
  const totalPredictions = Object.keys(predictions).length;
  res.json({
    message: `⛔ TAHMİNLER KAPANDI! ⛔\n${totalPredictions} tahmin alındı. Satın alım başlıyor... 🎰`
  });
});

// Tahmin kapama - GET versiyonu (StreamElements için)
app.get('/close', (req, res) => {
  if (gameState === 'closed') {
    return res.json({message: 'Tahminler zaten kapalı!'});
  }
  
  gameState = 'closed';
  const totalPredictions = Object.keys(predictions).length;
  res.json({
    message: `⛔ TAHMİNLER KAPANDI! ⛔\n${totalPredictions} tahmin alındı. Satın alım başlıyor... 🎰`
  });
});

// Kazanan belirleme - POST versiyonu
app.post('/result', (req, res) => {
  const actualResult = parseFloat(req.body.result);
  
  if (isNaN(actualResult)) {
    return res.json({message: 'Geçersiz sonuç değeri!'});
  }
  
  if (Object.keys(predictions).length === 0) {
    return res.json({message: 'Hiç tahmin yapılmadı!'});
  }
  
  let winner = null;
  let winnerPrediction = 0;
  let exactMatch = false;
  let closestDiff = Infinity;
  let earliestTime = Infinity;
  
  // Önce tam isabet var mı kontrol et
  for (const [user, data] of Object.entries(predictions)) {
    if (data.prediction === actualResult) {
      winner = user;
      winnerPrediction = data.prediction;
      exactMatch = true;
      break; // Tam isabet bulundu, diğerlerine bakmaya gerek yok
    }
  }
  
  // Tam isabet yoksa en yakın tahmini bul (ilk yapan kazanır)
  if (!exactMatch) {
    for (const [user, data] of Object.entries(predictions)) {
      const diff = Math.abs(data.prediction - actualResult);
      
      // Daha yakın tahmin VEYA aynı mesafede ama daha erken yapılmış
      if (diff < closestDiff || (diff === closestDiff && data.timestamp < earliestTime)) {
        closestDiff = diff;
        winner = user;
        winnerPrediction = data.prediction;
        earliestTime = data.timestamp;
      }
    }
  }
  
  // Sonraki oyun için sıfırla
  predictions = {};
  gameState = 'closed';
  
  const resultMessage = exactMatch 
    ? `🎯 SONUÇ: ${actualResult}x çıktı! 🎯\n🏆 TAM İSABET! Kazanan: ${winner} (${winnerPrediction}x) 🏆\nMükemmel tahmin! 🎉`
    : `🏆 SONUÇ: ${actualResult}x çıktı! 🏆\nKazanan: ${winner} (Tahmin: ${winnerPrediction}x, Fark: ${closestDiff.toFixed(1)})\nTebrikler! 🎉`;
  
  res.json({message: resultMessage});
});

// Kazanan belirleme - GET versiyonu (StreamElements için)
app.get('/result', (req, res) => {
  const actualResult = parseFloat(req.query.result);
  
  if (isNaN(actualResult)) {
    return res.json({message: 'Geçersiz sonuç değeri!'});
  }
  
  if (Object.keys(predictions).length === 0) {
    return res.json({message: 'Hiç tahmin yapılmadı!'});
  }
  
  let winner = null;
  let winnerPrediction = 0;
  let exactMatch = false;
  let closestDiff = Infinity;
  let earliestTime = Infinity;
  
  // Önce tam isabet var mı kontrol et
  for (const [user, data] of Object.entries(predictions)) {
    if (data.prediction === actualResult) {
      winner = user;
      winnerPrediction = data.prediction;
      exactMatch = true;
      break; // Tam isabet bulundu, diğerlerine bakmaya gerek yok
    }
  }
  
  // Tam isabet yoksa en yakın tahmini bul (ilk yapan kazanır)
  if (!exactMatch) {
    for (const [user, data] of Object.entries(predictions)) {
      const diff = Math.abs(data.prediction - actualResult);
      
      // Daha yakın tahmin VEYA aynı mesafede ama daha erken yapılmış
      if (diff < closestDiff || (diff === closestDiff && data.timestamp < earliestTime)) {
        closestDiff = diff;
        winner = user;
        winnerPrediction = data.prediction;
        earliestTime = data.timestamp;
      }
    }
  }
  
  // Sonraki oyun için sıfırla
  predictions = {};
  gameState = 'closed';
  
  const resultMessage = exactMatch 
    ? `🎯 SONUÇ: ${actualResult}x çıktı! 🎯\n🏆 TAM İSABET! Kazanan: ${winner} (${winnerPrediction}x) 🏆\nMükemmel tahmin! 🎉`
    : `🏆 SONUÇ: ${actualResult}x çıktı! 🏆\nKazanan: ${winner} (Tahmin: ${winnerPrediction}x, Fark: ${closestDiff.toFixed(1)})\nTebrikler! 🎉`;
  
  res.json({message: resultMessage});
});

// Aktif tahminleri listele (opsiyonel)
app.get('/list', (req, res) => {
  if (Object.keys(predictions).length === 0) {
    return res.json({message: 'Henüz tahmin yapılmadı.'});
  }
  
  let list = 'Mevcut Tahminler:\n';
  // Zaman sırasına göre sırala (ilk tahmin edenden son tahmin edene)
  const sortedPredictions = Object.entries(predictions)
    .sort(([,a], [,b]) => a.timestamp - b.timestamp);
  
  for (const [user, data] of sortedPredictions) {
    list += `${user}: ${data.prediction}x\n`;
  }
  
  res.json({message: list});
});
// StreamElements için temiz mesaj endpoint'leri
app.get('/se-open', (req, res) => {
  predictions = {};
  gameState = 'open';
  gameId++;
  res.send(`🎯 X Tahmin Yarışması #${gameId} Başladı! 🎯\nSlot oyunundan kaç X çıkacağını tahmin edin!\nKomut: !tahmin [sayı] (Örnek: !tahmin 50)`);
});

app.get('/se-predict', (req, res) => {
  const username = req.query.username;
  const prediction = parseFloat(req.query.prediction);
  
  if (gameState !== 'open') {
    return res.send('Tahmin sistemi şu anda kapalı!');
  }
  
  if (isNaN(prediction) || prediction <= 0) {
    return res.send(`${username} geçersiz tahmin! Pozitif sayı girin.`);
  }
  
  if (predictions[username]) {
    return res.send(`${username} zaten tahmin yaptınız! (${predictions[username].prediction}x)`);
  }
  
  predictions[username] = {
    prediction: prediction,
    timestamp: Date.now()
  };
  
  res.send(`${username} ${prediction}x tahmini kaydedildi! 🎯 Toplam tahmin: ${Object.keys(predictions).length}`);
});

app.get('/se-close', (req, res) => {
  if (gameState === 'closed') {
    return res.send('Tahminler zaten kapalı!');
  }
  
  gameState = 'closed';
  const totalPredictions = Object.keys(predictions).length;
  res.send(`⛔ TAHMİNLER KAPANDI! ⛔\n${totalPredictions} tahmin alındı. Satın alım başlıyor... 🎰`);
});

app.get('/se-result', (req, res) => {
  const actualResult = parseFloat(req.query.result);
  
  if (isNaN(actualResult)) {
    return res.send('Geçersiz sonuç değeri!');
  }
  
  if (Object.keys(predictions).length === 0) {
    return res.send('Hiç tahmin yapılmadı!');
  }
  
  let winner = null;
  let winnerPrediction = 0;
  let exactMatch = false;
  let closestDiff = Infinity;
  let earliestTime = Infinity;
  
  for (const [user, data] of Object.entries(predictions)) {
    if (data.prediction === actualResult) {
      winner = user;
      winnerPrediction = data.prediction;
      exactMatch = true;
      break;
    }
  }
  
  if (!exactMatch) {
    for (const [user, data] of Object.entries(predictions)) {
      const diff = Math.abs(data.prediction - actualResult);
      
      if (diff < closestDiff || (diff === closestDiff && data.timestamp < earliestTime)) {
        closestDiff = diff;
        winner = user;
        winnerPrediction = data.prediction;
        earliestTime = data.timestamp;
      }
    }
  }
  
  predictions = {};
  gameState = 'closed';
  
  const resultMessage = exactMatch 
    ? `🎯 SONUÇ: ${actualResult}x çıktı! 🎯\n🏆 TAM İSABET! Kazanan: ${winner} (${winnerPrediction}x) 🏆\nMükemmel tahmin! 🎉`
    : `🏆 SONUÇ: ${actualResult}x çıktı! 🏆\nKazanan: ${winner} (Tahmin: ${winnerPrediction}x, Fark: ${closestDiff.toFixed(1)})\nTebrikler! 🎉`;
  
  res.send(resultMessage);
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Tahmin bot servisi ${port} portunda çalışıyor!`);
});
