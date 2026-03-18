const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        operator_name VARCHAR(255) NOT NULL,
        test_date VARCHAR(255) NOT NULL,
        total_pdfs INTEGER DEFAULT 0,
        classifications JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database inizializzato');
  } catch (e) {
    console.error('Errore initDB:', e);
  } finally {
    client.release();
  }
}

app.get('/api/tests', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tests ORDER BY id DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tests/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tests WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test non trovato' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tests', async (req, res) => {
  try {
    const { operatorName, testDate, totalPdfs, classifications } = req.body;
    const result = await pool.query(
      'INSERT INTO tests (operator_name, test_date, total_pdfs, classifications) VALUES ($1, $2, $3, $4) RETURNING *',
      [operatorName, testDate, totalPdfs, JSON.stringify(classifications)]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tests/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tests WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tests', async (req, res) => {
  try {
    await pool.query('DELETE FROM tests');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server in esecuzione su porta ${port}`);
  });
});
