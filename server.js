const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const Achievement = require("./models/Achievement");
const Collaboration = require("./models/Collaboration");
const Image = require("./models/Image");

const app = express();
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const publicImagesDir = path.join(__dirname, "public", "images");
const dataDir = path.join(__dirname, "data");
const fallbackDataFile = path.join(dataDir, "content.json");
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
let lastDatabaseAttemptAt = 0;
let lastDatabaseStatus = null;

fs.mkdirSync(publicImagesDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(fallbackDataFile)) {
  fs.writeFileSync(
    fallbackDataFile,
    JSON.stringify({ achievements: [], collaborations: [], images: [] }, null, 2)
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, publicImagesDir),
  filename: (_req, file, cb) => {
    const originalName = path.basename(file.originalname);
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const safeName = `${Date.now()}-${sanitizedName}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      cb(new Error("Only image files are allowed (jpg, png, webp, gif)."));
      return;
    }

    cb(null, true);
  }
});

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    lastDatabaseStatus = true;
    return true;
  }

  if (mongoose.connection.readyState === 2) {
    return false;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    lastDatabaseStatus = false;
    return false;
  }

  const now = Date.now();

  if (lastDatabaseStatus === false && now - lastDatabaseAttemptAt < 15000) {
    return false;
  }

  try {
    lastDatabaseAttemptAt = now;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    lastDatabaseStatus = true;
    return true;
  } catch (_error) {
    lastDatabaseStatus = false;
    return false;
  }
}

function readFallbackData() {
  return JSON.parse(fs.readFileSync(fallbackDataFile, "utf-8"));
}

function writeFallbackData(data) {
  fs.writeFileSync(fallbackDataFile, JSON.stringify(data, null, 2));
}

function createFallbackRecord(values) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...values
  };
}

function getRecordId(record) {
  return String(record._id || record.id);
}

function checkAdmin(req, res, next) {
  const password = req.headers["x-admin-password"] || req.body.password;

  if (password !== adminPassword) {
    return res.status(401).json({ error: "Invalid admin password." });
  }

  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    const connected = await connectDatabase();
    res.json({ status: "ok", database: connected ? "mongodb" : "local-fallback" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/achievements", async (_req, res) => {
  try {
    const connected = await connectDatabase();
    const achievements = connected
      ? await Achievement.find().sort({ createdAt: -1 })
      : readFallbackData().achievements.slice().reverse();
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/achievements", checkAdmin, async (req, res) => {
  try {
    if (!req.body.title?.trim()) {
      return res.status(400).json({ error: "Achievement title is required." });
    }

    const connected = await connectDatabase();
    const payload = {
      title: req.body.title.trim(),
      description: req.body.description?.trim() || ""
    };

    const achievement = connected
      ? await Achievement.create(payload)
      : (() => {
          const data = readFallbackData();
          const record = createFallbackRecord(payload);
          data.achievements.push(record);
          writeFallbackData(data);
          return record;
        })();

    res.status(201).json(achievement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/achievements/:id", checkAdmin, async (req, res) => {
  try {
    const connected = await connectDatabase();

    if (connected) {
      const deleted = await Achievement.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: "Achievement not found." });
      }
    } else {
      const data = readFallbackData();
      const nextAchievements = data.achievements.filter((item) => getRecordId(item) !== req.params.id);

      if (nextAchievements.length === data.achievements.length) {
        return res.status(404).json({ error: "Achievement not found." });
      }

      data.achievements = nextAchievements;
      writeFallbackData(data);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/collaborations", async (_req, res) => {
  try {
    const connected = await connectDatabase();
    const collaborations = connected
      ? await Collaboration.find().sort({ createdAt: -1 })
      : readFallbackData().collaborations.slice().reverse();
    res.json(collaborations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/collaborations", checkAdmin, async (req, res) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ error: "Collaboration name is required." });
    }

    const connected = await connectDatabase();
    const payload = {
      name: req.body.name.trim(),
      description: req.body.description?.trim() || ""
    };

    const collaboration = connected
      ? await Collaboration.create(payload)
      : (() => {
          const data = readFallbackData();
          const record = createFallbackRecord(payload);
          data.collaborations.push(record);
          writeFallbackData(data);
          return record;
        })();

    res.status(201).json(collaboration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/collaborations/:id", checkAdmin, async (req, res) => {
  try {
    const connected = await connectDatabase();

    if (connected) {
      const deleted = await Collaboration.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: "Collaboration not found." });
      }
    } else {
      const data = readFallbackData();
      const nextCollaborations = data.collaborations.filter((item) => getRecordId(item) !== req.params.id);

      if (nextCollaborations.length === data.collaborations.length) {
        return res.status(404).json({ error: "Collaboration not found." });
      }

      data.collaborations = nextCollaborations;
      writeFallbackData(data);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/images", async (_req, res) => {
  try {
    const connected = await connectDatabase();
    const images = connected ? await Image.find().sort({ createdAt: -1 }) : readFallbackData().images.slice().reverse();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/images", checkAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required." });
    }

    const connected = await connectDatabase();
    const payload = {
      title: req.body.title?.trim() || req.file.originalname,
      filename: req.file.filename,
      url: `/images/${req.file.filename}`
    };

    const image = connected
      ? await Image.create(payload)
      : (() => {
          const data = readFallbackData();
          const record = createFallbackRecord(payload);
          data.images.push(record);
          writeFallbackData(data);
          return record;
        })();

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/images/:id", checkAdmin, async (req, res) => {
  try {
    const connected = await connectDatabase();
    let imageToDelete = null;

    if (connected) {
      imageToDelete = await Image.findByIdAndDelete(req.params.id);

      if (!imageToDelete) {
        return res.status(404).json({ error: "Image not found." });
      }
    } else {
      const data = readFallbackData();
      imageToDelete = data.images.find((item) => getRecordId(item) === req.params.id);

      if (!imageToDelete) {
        return res.status(404).json({ error: "Image not found." });
      }

      data.images = data.images.filter((item) => getRecordId(item) !== req.params.id);
      writeFallbackData(data);
    }

    const imagePath = path.join(publicImagesDir, imageToDelete.filename);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (req, res) => {
  const page = req.path === "/admin" ? "admin.html" : "index.html";
  res.sendFile(path.join(__dirname, "public", page));
});

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Image must be smaller than 5MB." });
    }

    return res.status(400).json({ error: error.message });
  }

  if (error?.message?.includes("Only image files are allowed")) {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

app.listen(port, () => {
  console.log(`Music website running on http://localhost:${port}`);
});
