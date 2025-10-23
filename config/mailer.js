// config/mailer.js
const { Resend } = require("resend");
const User = require("../models/user");

// Initialize Resend with your API key from .env
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = "CampusNotes <campusnotes@bitbros.in>"; // Verified email on Resend

/**
 * Sends a notification to all users (except the poster) about a new note request.
 */
// config/mailer.js
// ... (aapka baaki code jaise Resend setup, fromEmail, etc.)

module.exports.sendNewRequestMail = async (requestData) => {
  try {
    // Exclude the request poster
    const users = await User.find(
      { _id: { $ne: requestData._id } },
      "email"
    );

    const emailList = users.map((u) => u.email);

    if (!emailList.length) {
      console.log("⚠️ No users to mail.");
      return;
    }

    // --- BATCHING LOGIC SHURU ---
    const batchSize = 50; // Resend ki limit

    for (let i = 0; i < emailList.length; i += batchSize) {
      // Har baar 50 email ka ek naya group banayega
      const batch = emailList.slice(i, i + batchSize);

      console.log(`Sending mail to batch ${Math.floor(i / batchSize) + 1}...`);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: batch, // ✅ Sirf uss 50 ke group ko bhejega
        subject: "New Notes Request Posted!",
        html:  `

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

      `,
      });

      // Har batch ka error check karega
      if (error) {
        console.error(`Resend API Error (Batch ${Math.floor(i / batchSize) + 1}):`, error);
        // Agar ek batch fail ho, to agle par jaao
        continue;
      }

      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sent:`, data.id);
    }
    // --- BATCHING LOGIC KHATM ---

    console.log("✅ All new request email batches processed.");

  } catch (err) {
    console.error("❌ Error in sendNewRequestMail function:", err.message);
  }
};

/**
 * Sends a password reset OTP to a specific user.
 */
module.exports.sendOTP = async (mail, otp) => {
  try {
    const user = await User.findOne({ email: mail });
    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: "OTP for Password Reset!",
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
      `,
    });

    // NEW - This will print the detailed error from Resend
    if (error) {
      console.error("Resend API Error:", error); // Log the full error object
      throw new Error("Failed to send email via Resend."); // Throw a generic message
    }

    console.log("✅ OTP sent successfully via Resend to:", user.email);
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
  }
};

/**
 * Sends a notification about the status of a user's uploaded note.
 */
module.exports.sendVerificationMail = async (mail, status) => {
  try {
    const user = await User.findOne({ email: mail });
    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Your uploaded note is ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #2563eb; text-align: center;">Status of Note You Uploaded!</h2>
          <p style="font-size: 16px;">
            Hello <strong>${user.name || user.username || "User"}</strong>,
          </p>
          <p>The status of your recently uploaded note is:</p>
          <div style="background: #fff; border-left: 4px solid ${
            status === "Approved" ? "#22c55e" : "#ef4444"
          }; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 20px; text-align: center; font-weight: bold;">
            ${status}
          </div>
          <p style="font-size: 14px; color: #555;">
            If it was rejected and you believe this is a mistake, please contact us at campusnotes@bitbros.in.
          </p>
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} CampusNotes. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error);
    }

    console.log("✅ Note status mail sent successfully to:", user.email);
  } catch (err) {
    console.error("❌ Error sending verification mail:", err);
  }
};

/**
 * Sends a notification about the user's account verification status.
 */
module.exports.sendAccountVerificationMail = async (mail, status) => {
  try {
    const user = await User.findOne({ email: mail });
    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Your CampusNotes Account is ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
          <h2 style="color: #2563eb; text-align: center;">Your Account Verification</h2>
          <p style="font-size: 16px;">
            Hello <strong>${user.name || user.username || "User"}</strong>, your account has been:
          </p>
          <div style="background: #fff; border-left: 4px solid ${
            status === "Verified" ? "#22c55e" : "#ef4444"
          }; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-size: 20px; text-align: center; font-weight: bold;">
            ${status}
          </div>
          <p style="font-size: 14px; color: #555;">
            If verified, you can now upload notes. If not, and you think it is a mistake, please re-submit your verification documents or contact us at campusnotes@bitbros.in.
          </p>
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            © ${new Date().getFullYear()} CampusNotes. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error);
    }

    console.log("✅ Account status mail sent successfully to:", user.email);
  } catch (err) {
    console.error("❌ Error sending account verification mail:", err);
  }
};