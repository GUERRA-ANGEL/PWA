const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
// Servir archivos estáticos de la PWA desde la raíz
app.use(express.static(path.join(__dirname)));

// Servir manifest.json y archivos de widgets desde la raíz para compatibilidad con Windows 11 Widgets
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});
app.get('/widgets/daily-fact-template.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'widgets', 'daily-fact-template.json'));
});
app.get('/widgets/daily-fact-data.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'widgets', 'daily-fact-data.json'));
});

const DATA_FILE = path.join(__dirname, 'widgets', 'daily-fact-data.json');
const FACTS_FILE = path.join(__dirname, 'datos.json');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJSON(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Write error', e);
    return false;
  }
}

app.get('/api/daily-fact', (req, res) => {
  const data = readJSON(DATA_FILE);
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// Ruta estática para que Edge/Widget pueda acceder al JSON directamente
app.get('/widgets/daily-fact-data.json', (req, res) => {
  const data = readJSON(DATA_FILE);
  if (!data) return res.status(404).json({ error: 'Widget data not found' });
  res.json(data);
});

// Servir también la ruta pública que algunos runtimes solicitan directamente
app.get('/widgets/daily-fact-data.json', (req, res) => {
  const data = readJSON(DATA_FILE);
  if (!data) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(data));
});

// Refresh: elegir un fact aleatorio desde datos.json y escribir en daily-fact-data.json
app.post('/api/daily-fact/refresh', (req, res) => {
  const all = readJSON(FACTS_FILE);
  if (!all || !all.facts || all.facts.length === 0) return res.status(500).json({ error: 'No facts available' });

  // elegir aleatorio
  const idx = Math.floor(Math.random() * all.facts.length);
  const f = all.facts[idx];

  const newData = {
    title: 'Dato Curioso del Día',
    fact: f.content,
    date: new Date().toISOString().slice(0,10),
    id: f.id
  };

  const ok = writeJSON(DATA_FILE, newData);
  if (!ok) return res.status(500).json({ error: 'Write failed' });

  res.json(newData);
});

// Endpoint para guardar favorito desde widget (simple: escribe en un archivo 'widget-actions.json' para pruebas)
app.post('/api/daily-fact/save', (req, res) => {
  const payload = req.body;
  // Para desarrollo, simplemente guardamos un registro con timestamp
  const out = { savedAt: new Date().toISOString(), payload };
  const outFile = path.join(__dirname, 'widgets', 'widget-actions.json');
  const ok = writeJSON(outFile, out);
  if (!ok) return res.status(500).json({ error: 'Write failed' });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Dev sync server running on port', PORT));
