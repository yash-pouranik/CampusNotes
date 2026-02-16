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
        html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #050505; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #0A0A0A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            
            <div style="background: linear-gradient(90deg, #FF5722, #3B82F6); height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #FF5722; margin-top: 0; font-size: 24px; text-shadow: 0 4px 20px rgba(255, 87, 34, 0.15);">New Request on CampusNotes</h2>
              
              <p style="font-size: 16px; color: #ffffff; line-height: 1.6; margin-top: 20px;">
                <strong style="color: #FF5722;">${requestData.user.username || requestData.user.name}</strong> has requested new notes:
              </p>

              <div style="background-color: rgba(255, 255, 255, 0.05); border-left: 4px solid #FF5722; padding: 15px 20px; margin: 25px 0; border-radius: 4px; text-align: left; color: #e5e7eb; font-style: italic;">
                "${requestData.content}"
              </div>

              <div style="margin-top: 35px;">
                <a href="https://campusnotes.bitbros.in/requestnotes"
                   style="display: inline-block; background: #0A0A0A; color: #FF5722; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; border: 1px solid #FF5722; box-shadow: 0 4px 20px rgba(255, 87, 34, 0.15);">
                  View Request
                </a>
              </div>

              <p style="font-size: 12px; color: #9ca3af; margin-top: 40px;">
                You are receiving this email because you are subscribed to CampusNotes notifications.
              </p>
            </div>
            
            <div style="background-color: #050505; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
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

module.exports.sendNewRequestMailOnce = async (email, requestData) => {
  try {
    // Exclude the request poster
    // const users = await User.find(
    //   { _id: { $ne: requestData._id } },
    //   "email"
    // );
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "New Notes Request Posted!",
        html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #050505; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #0A0A0A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            
            <div style="background: linear-gradient(90deg, #FF5722, #3B82F6); height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #FF5722; margin-top: 0; font-size: 24px; text-shadow: 0 4px 20px rgba(255, 87, 34, 0.15);">New Request on CampusNotes</h2>
              
              <p style="font-size: 16px; color: #ffffff; line-height: 1.6; margin-top: 20px;">
                <strong style="color: #FF5722;">${requestData.user.username || requestData.user.name}</strong> has requested new notes:
              </p>

              <div style="background-color: rgba(255, 255, 255, 0.05); border-left: 4px solid #FF5722; padding: 15px 20px; margin: 25px 0; border-radius: 4px; text-align: left; color: #e5e7eb; font-style: italic;">
                "${requestData.content}"
              </div>

              <div style="margin-top: 35px;">
                <a href="https://campusnotes.bitbros.in/requestnotes"
                   style="display: inline-block; background: #0A0A0A; color: #FF5722; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; border: 1px solid #FF5722; box-shadow: 0 4px 20px rgba(255, 87, 34, 0.15);">
                  View Request
                </a>
              </div>

              <p style="font-size: 12px; color: #9ca3af; margin-top: 40px;">
                You are receiving this email because you are subscribed to CampusNotes notifications.
              </p>
            </div>
            
            <div style="background-color: #050505; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
      });

      // Har batch ka error check karega
      if (error) {
        console.error(`Resend API Error`, error);
      }

      console.log(`Mail sent to ${email}`);

  } catch (err) {
    console.error("❌ Error in sendNewRequestMail function:", err.message);
  }
};

/**
 * Sends a password reset OTP to a specific user.
 */
module.exports.sendOTP = async (user, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: "OTP for Password Reset!",
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #050505; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #0A0A0A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            
            <div style="background: linear-gradient(90deg, #FF5722, #3B82F6); height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: #FF5722; margin-top: 0; font-size: 24px; text-shadow: 0 4px 20px rgba(255, 87, 34, 0.15);">Password Reset Request</h2>
              
              <p style="font-size: 16px; color: #ffffff; line-height: 1.6; margin-top: 20px;">
                Hello <strong style="color: #FF5722;">${user.name || user.username || "User"}</strong>,
              </p>
              
              <p style="font-size: 15px; color: #9ca3af;">
                We received a request to reset your password. Use the OTP below to continue:
              </p>

              <div style="background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 87, 34, 0.3); padding: 20px; margin: 30px auto; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FF5722; display: inline-block; min-width: 200px; text-shadow: 0 0 15px rgba(255, 87, 34, 0.4);">
                ${otp}
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                This OTP is valid for the next 10 minutes. If you didn’t request a password reset, you can safely ignore this email.
              </p>
            </div>

            <div style="background-color: #050505; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
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

    const isApproved = status === "Approved";
    const statusColor = isApproved ? "#22c55e" : "#ef4444"; // Green or Red (Keeping these as success/error indicators, but styled w/ theme context)

    // Using theme accents for container but status colors for the specific status
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Your uploaded note is ${status}`,
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #050505; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #0A0A0A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            
            <div style="background: linear-gradient(90deg, ${isApproved ? '#22c55e' : '#ef4444'}, ${isApproved ? '#4ade80' : '#f87171'}); height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${statusColor}; margin-top: 0; font-size: 24px; text-shadow: 0 4px 20px ${statusColor}40;">Note Submission Update</h2>
              
              <p style="font-size: 16px; color: #ffffff; line-height: 1.6; margin-top: 20px;">
                Hello <strong style="color: #FF5722;">${user.name || user.username || "User"}</strong>,
              </p>
              
              <p style="font-size: 15px; color: #9ca3af;">The status of your recently uploaded note is:</p>

              <div style="background-color: rgba(255, 255, 255, 0.05); border: 1px solid ${statusColor}60; color: ${statusColor}; padding: 15px 30px; margin: 25px auto; border-radius: 12px; font-size: 20px; font-weight: bold; display: inline-block; box-shadow: 0 0 15px ${statusColor}20;">
                ${status}
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                ${isApproved
          ? "Great job! Your note is now helping other students."
          : "If you believe this is a mistake, please review our guidelines or contact us at <span style='color: #FF5722;'>campusnotes@bitbros.in</span>."}
              </p>
            </div>

            <div style="background-color: #050505; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
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

    const isVerified = status === "Verified";
    const statusColor = isVerified ? "#22c55e" : "#ef4444";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: `Your CampusNotes Account is ${status}`,
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #050505; color: #ffffff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #0A0A0A; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            
             <div style="background: linear-gradient(90deg, ${isVerified ? '#22c55e' : '#ef4444'}, ${isVerified ? '#4ade80' : '#f87171'}); height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${statusColor}; margin-top: 0; font-size: 24px; text-shadow: 0 4px 20px ${statusColor}40;">Account Verification Update</h2>
              
              <p style="font-size: 16px; color: #ffffff; line-height: 1.6; margin-top: 20px;">
                Hello <strong style="color: #FF5722;">${user.name || user.username || "User"}</strong>, your account has been:
              </p>

              <div style="background-color: rgba(255, 255, 255, 0.05); border: 1px solid ${statusColor}60; color: ${statusColor}; padding: 15px 30px; margin: 25px auto; border-radius: 12px; font-size: 20px; font-weight: bold; display: inline-block; box-shadow: 0 0 15px ${statusColor}20;">
                ${status}
              </div>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                 ${isVerified
          ? "You can now upload notes and access all features."
          : "If you think this is a mistake, please re-submit your documents or contact us at <span style='color: #FF5722;'>campusnotes@bitbros.in</span>."}
              </p>
            </div>

            <div style="background-color: #050505; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid rgba(255, 255, 255, 0.08);">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
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