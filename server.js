const express = require('express');
const path = require('node:path');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'art.db'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/art', express.static(path.join(__dirname, 'art')));

app.get('/api/paintings', (req, res) => {
  const paintings = db.prepare(`
    SELECT PaintingID, Title, ImageFileName, YearOfWork, Medium, Description,
           Width, Height, Cost, MSRP
    FROM Paintings
    ORDER BY Title
  `).all();

  res.json(paintings);
});

app.put('/api/paintings/:id', (req, res) => {
  const paintingId = Number(req.params.id);
  if (!Number.isInteger(paintingId)) {
    return res.status(400).json({ error: 'Painting ID must be an integer.' });
  }

  const textFields = ['Title', 'Medium', 'Description'];
  const numberFields = ['YearOfWork', 'Width', 'Height', 'Cost', 'MSRP'];
  const updates = {};

  for (const field of textFields) {
    if (typeof req.body[field] !== 'string') {
      return res.status(400).json({ error: `${field} must be text.` });
    }
    updates[field] = req.body[field].trim() || null;
  }

  for (const field of numberFields) {
    const rawValue = req.body[field];
    if (rawValue === '' || rawValue === null) {
      updates[field] = null;
      continue;
    }
    const number = Number(rawValue);
    if (!Number.isFinite(number) || (['YearOfWork', 'Width', 'Height'].includes(field) && !Number.isInteger(number))) {
      return res.status(400).json({ error: `${field} must be a valid number.` });
    }
    updates[field] = number;
  }

  if (!updates.Title) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  const result = db.prepare(`
    UPDATE Paintings
    SET Title = @Title, Medium = @Medium, Description = @Description,
        YearOfWork = @YearOfWork, Width = @Width, Height = @Height,
        Cost = @Cost, MSRP = @MSRP
    WHERE PaintingID = @PaintingID
  `).run({ ...updates, PaintingID: paintingId });

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Painting not found.' });
  }

  const painting = db.prepare(`
    SELECT PaintingID, Title, ImageFileName, YearOfWork, Medium, Description,
           Width, Height, Cost, MSRP
    FROM Paintings WHERE PaintingID = ?
  `).get(paintingId);
  res.json(painting);
});

app.listen(port, () => {
  console.log(`Painting API listening at http://localhost:${port}`);
});
