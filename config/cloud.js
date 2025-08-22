const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const path = require("path");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});




const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname); // e.g. ".pdf"
    const name = path.basename(file.originalname, ext);

    return {
      folder: "campusNotes",
      resource_type: "raw",
      public_id: `${name}-${Date.now()}${ext}`, // ✅ extension preserve
    };
  },
});




module.exports = {
    cloudinary,
    storage
}