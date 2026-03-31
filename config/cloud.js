const multer = require("multer");
const cloudinary = require("cloudinary").v2;


const rawAccounts = [
  {
    cloud_name: process.env.CLOUD1_NAME,
    api_key: process.env.CLOUD1_KEY,
    api_secret: process.env.CLOUD1_SECRET
  },
  {
    cloud_name: process.env.CLOUD2_NAME,
    api_key: process.env.CLOUD2_KEY,
    api_secret: process.env.CLOUD2_SECRET
  },
  {
    cloud_name: process.env.CLOUD3_NAME,
    api_key: process.env.CLOUD3_KEY,
    api_secret: process.env.CLOUD3_SECRET
  }
];

const accounts = rawAccounts.filter(a => a && a.cloud_name && a.api_key && a.api_secret);

if (accounts.length === 0) {
  if (!process.env.CLOUDINARY_URL) {
    console.error("Cloudinary: no accounts configured. Set CLOUD1_NAME/CLOUD1_KEY/CLOUD1_SECRET or CLOUDINARY_URL in env.");
  } else {
    console.info("Cloudinary: using CLOUDINARY_URL from environment.");
  }
} else {
  cloudinary.config(accounts[0]);
  console.info(`Cloudinary: configured default account ${accounts[0].cloud_name}`);
}

let currentIndex = 0;
function getNextAccount() {
  if (accounts.length === 0) return null;
  const account = accounts[currentIndex];
  currentIndex = (currentIndex + 1) % accounts.length;
  return account;
}

async function deleteFromAllAccounts(publicId, options = {}) {
  if (accounts.length > 0) {
    for (const account of accounts) {
      try {
        cloudinary.config(account);
        const res = await cloudinary.uploader.destroy(publicId, options);
        console.info(`Cloudinary: destroy ${publicId} on ${account.cloud_name} => ${res.result || res}`);
      } catch (err) {
        console.warn(`Cloudinary delete failed for ${account.cloud_name}:`, err && err.message ? err.message : err);
      }
    }
    cloudinary.config(accounts[0]);
    return;
  }

  try {
    const res = await cloudinary.uploader.destroy(publicId, options);
    console.info(`Cloudinary: destroy ${publicId} => ${res.result || res}`);
  } catch (err) {
    console.warn("Cloudinary delete failed (fallback):", err && err.message ? err.message : err);
  }
}

const storage = multer.memoryStorage();

module.exports = {
  storage,
  cloudinary,
  getNextAccount,
  deleteFromAllAccounts,
  accounts
};