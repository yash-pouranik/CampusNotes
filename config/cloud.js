const cloudinary = require("cloudinary").v2;

const accounts = [
  // {
  //   cloud_name: process.env.CLOUD1_NAME,
  //   api_key: process.env.CLOUD1_KEY,
  //   api_secret: process.env.CLOUD1_SECRET
  // },
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

let currentIndex = 0;

function getNextAccount() {
  const account = accounts[currentIndex];
  currentIndex = (currentIndex + 1) % accounts.length;
  return account;
}

module.exports = { cloudinary, getNextAccount };
