const express = require("express");
const multer = require("multer");
const { lireCroquis } = require("../vision/client");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo — couvre les PDFs
});

const MEDIA_OK = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

// Lecture de croquis manuscrit. L'appel au modèle se fait CÔTÉ BACKEND uniquement
// (la clé API ne touche jamais le frontend). Le résultat PRÉ-REMPLIT le formulaire —
// le vendeur valide avant tout calcul.
// La fonctionnalité vision peut être désactivée au niveau du tenant (vision_enabled).
module.exports = function visionRoutes(visionClient, { authenticate }) {
  const router = express.Router();
  router.use(authenticate);

  router.post("/lire", upload.single("image"), async (req, res) => {
    // Vérification de la feature vision pour ce tenant.
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
      result.message = "Vérifiez les valeurs avant de calculer.";
      res.json(result);
    } catch (e) {
      res.status(502).json({ error: `Lecture du croquis échouée : ${e.message}` });
    }
  });

  return router;
};
