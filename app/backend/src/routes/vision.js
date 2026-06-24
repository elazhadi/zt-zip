const express = require("express");
const multer = require("multer");
const { authenticate } = require("../middleware/auth");
const { lireCroquis } = require("../vision/client");

// Upload en mémoire, limité à 10 Mo. L'image ne touche jamais un disque.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const MEDIA_OK = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Lecture de croquis manuscrit. L'appel au modèle se fait CÔTÉ BACKEND uniquement
// (la clé API ne touche jamais le frontend). Le résultat PRÉ-REMPLIT le formulaire —
// le vendeur valide avant tout calcul.
module.exports = function visionRoutes(visionClient) {
  const router = express.Router();
  router.use(authenticate);

  // POST /api/vision/lire  (multipart : champ "image")
  router.post("/lire", upload.single("image"), async (req, res) => {
    if (!visionClient || !visionClient.available) {
      return res.status(503).json({
        error: "Lecture photo indisponible (clé vision non configurée). Saisie manuelle requise.",
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Aucune image fournie (champ 'image')" });
    }
    if (!MEDIA_OK.has(req.file.mimetype)) {
      return res.status(400).json({ error: `Type d'image non supporté : ${req.file.mimetype}` });
    }
    try {
      const result = await lireCroquis(visionClient, {
        mediaType: req.file.mimetype,
        base64: req.file.buffer.toString("base64"),
      });
      // Garde-fou explicite renvoyé au frontend.
      result.message = "Vérifiez les valeurs avant de calculer.";
      res.json(result);
    } catch (e) {
      res.status(502).json({ error: `Lecture du croquis échouée : ${e.message}` });
    }
  });

  return router;
};
