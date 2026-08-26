const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

const uploadBuffer = (file, folder = "auto-dealer/inspections") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) =>
        error
          ? reject(error)
          : resolve({ url: result.secure_url, public_id: result.public_id }),
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });

const destroy = (publicId) => cloudinary.uploader.destroy(publicId);

const destroyImages = async (images = []) => {
  for (const image of images) {
    if (!image?.public_id) continue;
    const result = await destroy(image.public_id);
    if (!result || !["ok", "not found"].includes(result.result)) {
      throw new Error(`Khong the xoa anh Cloudinary: ${image.public_id}`);
    }
  }
};

const uploadMany = async (files = [], folder) => {
  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await uploadBuffer(file, folder));
    return uploaded;
  } catch (error) {
    await Promise.allSettled(uploaded.map((image) => destroy(image.public_id)));
    throw error;
  }
};

module.exports = { uploadBuffer, uploadMany, destroyImages };
