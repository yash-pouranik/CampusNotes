// config/mailer.js
const nodemailer = require("nodemailer");
const User = require("../models/user");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

module.exports.sendNewRequestMail = async (requestData) => {
  try {
    // exclude the request poster
    const users = await User.find(
      { _id: { $ne: requestData.user._id } },  // 👈 poster exclude
      "email"
    );

    const emailList = users.map(u => u.email);

    if (!emailList.length) return console.log("⚠️ No users to mail.");

    await transporter.sendMail({
      from: '"CampusNotes" <yashpouranik1245@gmail.com>',
      bcc: emailList,
      subject: "📢 New Notes Request Posted!",
      html: `
        <h2>New Request on CampusNotes</h2>
        <p><strong>${requestData.user.username || requestData.user.name}</strong> requested:</p>
        <blockquote>${requestData.content}</blockquote>
        <br/>
        <a href="https://campusnotes.com/requestnotes/${requestData._id}" 
           style="background:#2563eb;color:#fff;padding:10px 16px;
                  border-radius:6px;text-decoration:none;">
          View Request
        </a>
      `
    });

    console.log("✅ Emails sent (excluding poster)");
  } catch (err) {
    console.error("❌ Error sending mails:", err);
  }
};
