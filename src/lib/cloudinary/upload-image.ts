import { cloudinary } from "@/lib/cloudinary/client";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 2 * 1024 * 1024;

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function getUploadErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as {
      message?: unknown;
      http_code?: unknown;
    };

    if (maybeError.http_code === 401 || maybeError.http_code === 403) {
      return "Upload ditolak Cloudinary. Periksa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di .env.";
    }

    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return "Upload foto produk gagal.";
}

export function getOptionalImageFile(formData: FormData, key: string) {
  const file = formData.get(key);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!allowedImageTypes.includes(file.type)) {
    throw new Error("Foto produk harus JPG, PNG, atau WebP.");
  }

  if (file.size > maxImageSize) {
    throw new Error("Ukuran foto produk maksimal 2 MB.");
  }

  return file;
}

export async function uploadImage(file: File, folder: string) {
  if (!isConfigured()) {
    throw new Error("Cloudinary belum dikonfigurasi di environment.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          {
            width: 800,
            height: 800,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new Error(getUploadErrorMessage(error)));
          return;
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}
