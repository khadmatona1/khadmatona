/** Keep up to ten phone photos inside the existing 3 MB multipart limit. */
export async function compressLeadPhoto(file: File): Promise<File> {
  if (file.size <= 260_000) return file;
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing unavailable");
    let edge = 1600;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Image processing failed")),
          "image/jpeg",
          0.82 - attempt * 0.08,
        ),
      );
      if (blob.size <= 260_000)
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg",
          lastModified: file.lastModified,
        });
      edge = Math.round(edge * 0.75);
    }
    throw new Error("Image too large after compression");
  } finally {
    bitmap.close();
  }
}
