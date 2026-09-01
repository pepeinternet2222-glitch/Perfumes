const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        cb(null, ext && mime);
    }
});

const uploadVideo = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /mp4|webm|ogg|mov/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = /video/.test(file.mimetype);
        cb(null, ext && mime);
    }
});

// Helpers
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

function readProducts() {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
    return JSON.parse(data);
}

function writeProducts(products) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 4), 'utf-8');
}

function readSettings() {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
}

function writeSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 4), 'utf-8');
}

// ========== API ROUTES ==========

// GET all products
app.get('/api/products', (req, res) => {
    try {
        const products = readProducts();
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET single product
app.get('/api/products/:id', (req, res) => {
    try {
        const products = readProducts();
        const product = products.find(p => p.id === parseInt(req.params.id));
        if (!product) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST create product
app.post('/api/products', (req, res) => {
    try {
        const products = readProducts();
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        const product = {
            id: newId,
            brand: req.body.brand || '',
            name: req.body.name || '',
            type: req.body.type || '',
            price: parseInt(req.body.price) || 0,
            originalPrice: req.body.originalPrice ? parseInt(req.body.originalPrice) : null,
            gender: req.body.gender || 'mujer',
            category: req.body.category || 'original',
            badge: req.body.badge || null,
            image: req.body.image || '',
            emoji: req.body.emoji || '🧴',
            tags: req.body.tags || []
        };
        products.push(product);
        writeProducts(products);
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT update product
app.put('/api/products/:id', (req, res) => {
    try {
        const products = readProducts();
        const index = products.findIndex(p => p.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

        products[index] = {
            ...products[index],
            brand: req.body.brand ?? products[index].brand,
            name: req.body.name ?? products[index].name,
            type: req.body.type ?? products[index].type,
            price: req.body.price !== undefined ? parseInt(req.body.price) : products[index].price,
            originalPrice: req.body.originalPrice !== undefined ? (req.body.originalPrice ? parseInt(req.body.originalPrice) : null) : products[index].originalPrice,
            gender: req.body.gender ?? products[index].gender,
            category: req.body.category ?? products[index].category,
            badge: req.body.badge !== undefined ? (req.body.badge || null) : products[index].badge,
            image: req.body.image ?? products[index].image,
            emoji: req.body.emoji ?? products[index].emoji,
            tags: req.body.tags ?? products[index].tags
        };

        writeProducts(products);
        res.json({ success: true, product: products[index] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
    try {
        let products = readProducts();
        const index = products.findIndex(p => p.id === parseInt(req.params.id));
        if (index === -1) return res.status(404).json({ success: false, error: 'Producto no encontrado' });

        const deleted = products.splice(index, 1)[0];

        // Delete associated image if exists
        if (deleted.image && deleted.image.startsWith('/uploads/')) {
            const imgPath = path.join(__dirname, deleted.image);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }

        writeProducts(products);
        res.json({ success: true, deleted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No se envio ningun archivo' });
        const imageUrl = '/uploads/' + req.file.filename;
        res.json({ success: true, url: imageUrl });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE image
app.delete('/api/upload/:filename', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'uploads', req.params.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Archivo no encontrado' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========== SETTINGS API ==========

// GET settings
app.get('/api/settings', (req, res) => {
    try {
        const settings = readSettings();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT update settings
app.put('/api/settings', (req, res) => {
    try {
        const settings = readSettings();
        if (req.body.hero) {
            settings.hero = { ...settings.hero, ...req.body.hero };
        }
        if (req.body.featured) {
            settings.featured = { ...settings.featured, ...req.body.featured };
        }
        if (req.body.categories) {
            settings.categories = { ...settings.categories, ...req.body.categories };
        }
        writeSettings(settings);
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST upload video
app.post('/api/upload-video', uploadVideo.single('video'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No se envio ningun archivo de video' });
        const videoUrl = '/uploads/' + req.file.filename;
        res.json({ success: true, url: videoUrl });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Serve pages
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║         AROMALUXE SERVER                 ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║  Tienda:   http://localhost:${PORT}          ║`);
    console.log(`  ║  Admin:    http://localhost:${PORT}/admin    ║`);
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});
