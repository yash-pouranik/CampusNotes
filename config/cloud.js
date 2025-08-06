const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "campusNotes", // or your preferred folder
    resource_type: "raw", // ✅ enables upload of any file (not just images)
    public_id: (req, file) => file.originalname.split('.')[0] + '-' + Date.now(),
  },
});



module.exports = {
    cloudinary,
    storage
}