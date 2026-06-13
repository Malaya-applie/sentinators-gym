import { Router, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Allow only image/video files
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMime =
    /^(image\/(jpeg|jpg|png|webp|gif|svg\+xml)|video\/(mp4|webm|ogg|quicktime|x-matroska))$/i;
  const allowedExt = /\.(jpg|jpeg|png|webp|gif|svg|mp4|webm|ogg|mov|mkv)$/i;
  if (allowedMime.test(file.mimetype) || allowedExt.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Only image or video files are allowed"));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ─── POST /api/upload (admin only) ─────────────────────
router.post(
  "/",
  requireAdmin,
  upload.any(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[] | undefined;
    const file = files?.[0];

    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    try {
      const uploaded = await new Promise<{
        secure_url: string;
        resource_type: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "gym-uploads",
            resource_type: "auto",
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error("Upload failed"));
              return;
            }
            resolve({
              secure_url: result.secure_url,
              resource_type: result.resource_type,
            });
          },
        );

        stream.end(file.buffer);
      });

      res.json({
        url: uploaded.secure_url,
        resourceType: uploaded.resource_type,
      });
    } catch (error) {
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

export default router;
