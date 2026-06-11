import { Router, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer + Cloudinary storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "gym-uploads",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
    resource_type: "image",
  } as object,
});

// Allow only image files
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMime = /^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/i;
  const allowedExt = /\.(jpg|jpeg|png|webp|gif|svg)$/i;
  if (allowedMime.test(file.mimetype) || allowedExt.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ─── POST /api/upload (admin only) ─────────────────────
router.post(
  "/",
  requireAdmin,
  upload.single("image"),
  (req: AuthRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }
    // Cloudinary returns the full URL in req.file.path
    res.json({
      url: (req.file as Express.Multer.File & { path: string }).path,
    });
  },
);

export default router;
