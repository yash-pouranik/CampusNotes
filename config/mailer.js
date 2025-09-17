// config/mailer.js
const nodemailer = require("nodemailer");
const User = require("../models/user");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.USER_EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});


module.exports.sendNewRequestMail = async (requestData) => {
  try {
    // exclude the request poster
    const users = await User.find(
      { _id: { $ne: requestData._id } },  // 👈 poster exclude
      "email"
    );

    const emailList = users.map(u => u.email);

    if (!emailList.length) return console.log("⚠️ No users to mail.");

    await transporter.sendMail({
      from: '"CamousNotes" <campusnotes@bitbros.in>',
      bcc: emailList,
      subject: "📢 New Notes Request Posted!",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #2563eb; text-align: center;">New Request on CampusNotes</h2>
          
          <p style="font-size: 16px;">
            <strong>${requestData.user.username || requestData.user.name}</strong> has requested new notes:
          </p>
          
          <div style="background: #fff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic;">
            ${requestData.content}
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://campusnotes.bitbros.in/requestnotes" 
              style="display: inline-block; background-color: #2563eb; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              View Request
            </a>
          </div>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            You are receiving this email because you are subscribed to CampusNotes notifications.
          </p>
        </div>
      `
    });


    console.log("✅ Emails sent (excluding poster)");
  } catch (err) {
    console.error("❌ Error sending mails:", err);
  }
};


module.exports.sendOTP = async (mail, otp) => {
  try {
    // check user
    const user = await User.findOne({ email: mail });

    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    await transporter.sendMail({
      from: '"CamousNotes" <campusnotes@bitbros.in>',
      to: user.email,  // ✅ bcc ki zarurat nahi yaha
      subject: "📢 OTP for Password Reset!",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #2563eb; text-align: center;">CampusNotes Password Reset</h2>
          
          <p style="font-size: 16px;">
            Hello <strong>${user.name || user.username || "User"}</strong>,
          </p>
          
          <p style="font-size: 15px;">
            We received a request to reset your password. Use the OTP below to continue:
          </p>
          
          <div style="background: #fff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 20px; text-align: center; font-weight: bold; letter-spacing: 3px;">
            ${otp}
          </div>
          
          <p style="font-size: 14px; color: #555;">
            This OTP is valid for the next 10 minutes. If you didn’t request a password reset, you can safely ignore this email.
          </p>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} CampusNotes. All rights reserved.
          </p>
        </div>
      `
    });

    console.log("✅ OTP sent successfully to:", user.email);
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
  }
};


module.exports.sendVerificationMail = async (mail, status) => {
  try {
    // check user
    const user = await User.findOne({ email: mail });

    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    await transporter.sendMail({
      from: '"CampusNotes" <campusnotes@bitbros.in>',
      to: user.email,
      subject: `Your uploaded note is ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #2563eb; text-align: center;">Status of note you Uploaded!</h2>
          
          <p style="font-size: 16px;">
            Hello <strong>${user.name || user.username || "User"}</strong>,
          </p>
  
          
          <div style="background: #fff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 20px; text-align: center; font-weight: bold; letter-spacing: 3px;">
            ${status}
          </div>
          
          <p style="font-size: 14px; color: #555;">
            If it is rejected, it is deleted as well, and if you think this is a mistake contact campusnotes@bitbros.in
          </p>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} CampusNotes. All rights reserved.
          </p>
        </div>
      `
    });

    console.log("✅ OTP sent successfully to:", user.email);
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
  }
};


module.exports.sendAccountVerificationMail = async (mail, status) => {
  try {
    // check user
    const user = await User.findOne({ email: mail });

    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    await transporter.sendMail({
      from: '"CamousNotes" <campusnotes@bitbros.in>',
      to: user.email,
      subject: `Your Account is ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #2563eb; text-align: center;">Your Account verification.</h2>
          
          <p style="font-size: 16px;">
            Hello <strong>${user.name || user.username || "User"}</strong>, your account is
          </p>
  
          
          <div style="background: #fff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 20px; text-align: center; font-weight: bold; letter-spacing: 3px;">
            ${status}
          </div>
          
          <p style="font-size: 14px; color: #555;">
            If Verified, then you are allowed to upload notes.
            <br>
            If not verified, and you think it is a mistake then mail send correct verificaition doc again or mail at campusnotes@bitbros.in 
          </p>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} CampusNotes. All rights reserved.
          </p>
        </div>
      `
    });

    console.log("veri mail successfully sent to", user.email);
  } catch (err) {
    console.error("❌ Error sending mail:", err);
  }
};

