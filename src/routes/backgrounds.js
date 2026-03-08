'use strict';

const fs = require('fs').promises;
const path = require('path');

const BG_DIR = path.join(__dirname, '../../public/backgrounds');

function register(app) {
    // 1. Listar fondos guardados
    app.get('/api/backgrounds', async (req, res) => {
        try {
            await fs.mkdir(BG_DIR, { recursive: true });
            const files = await fs.readdir(BG_DIR);
            const urls = files.filter(f => f.startsWith('custom-bg-'))
                              .map(f => `/backgrounds/${f}`);
            res.json({ bgs: urls });
        } catch (e) { res.json({ bgs: [] }); }
    });

    // 2. Subir nuevo fondo
    app.post('/api/backgrounds/upload', async (req, res) => {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'No image data' });
        try {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const filename = `custom-bg-${Date.now()}.png`;
            await fs.writeFile(path.join(BG_DIR, filename), buffer);
            res.json({ ok: true, url: `/backgrounds/${filename}` });
        } catch (e) { res.status(500).json({ error: 'Save failed' }); }
    });

    // 3. Borrar un fondo
    app.delete('/api/backgrounds/:name', async (req, res) => {
        try {
            const name = req.params.name;
            await fs.unlink(path.join(BG_DIR, name));
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: 'Delete failed' }); }
    });
}

module.exports = { register };