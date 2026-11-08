const express = require('express');
const path = require('node:path');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'art.db'), { readonly: true });

app.get('/api/paintings', (req, res) => {
  const paintings = db.prepare(`
    SELECT PaintingID, Title, ImageFileName, YearOfWork, Medium, Description
    FROM Paintings
    ORDER BY Title
  `).all();

  res.json(paintings);
});

app.listen(port, () => {
  console.log(`Painting API listening at http://localhost:${port}`);
});
