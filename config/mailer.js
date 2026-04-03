const { Resend } = require("resend");
const User = require("../models/user");
const emailLimiter = require("../services/emailLimiter");

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = "CampusNotes <campusnotes@bitbros.in>";

// Professional Light Theme Constants
const COLORS = {
  primary: "#FF5722",
  bg: "#F3F4F6", // Light gray background
  card: "#FFFFFF", // White card
  textHead: "#111827", // Near black
  textBody: "#374151", // Dark gray
  textMuted: "#6B7280", // Medium gray
  border: "#E5E7EB" // Light gray border
};

/**
 * Internal helper to send emails with quota checking.
 * Throws error if quota exceeded, so BullMQ can retry later.
 */
async function safeSend(mailOptions, type = "bulk") {
  const recipients = Array.isArray(mailOptions.to) ? mailOptions.to.length : 1;
  const { canSend, count } = await emailLimiter.checkQuota(type, recipients);

  if (!canSend) {
    const error = new Error(`Quota exceeded for ${type} emails. Daily limit: ${emailLimiter.DAILY_LIMIT}, Current count: ${count}, Requested: ${recipients}`);
    error.code = "QUOTA_EXCEEDED";
    throw error;
  }

  const { data, error } = await resend.emails.send(mailOptions);

  if (error) {
    console.error(`Resend API Error:`, error);
    throw new Error(error.message || "Email delivery failed");
  }

  await emailLimiter.incrementSent(recipients);
  return data;
}


module.exports.sendNewRequestMail = async (requestData) => {
  try {
    const users = await User.find(
      { _id: { $ne: requestData._id } },
      "email"
    );

    const emailList = users.map((u) => u.email);

    if (!emailList.length) {
      console.log("⚠️ No users to mail.");
      return;
    }

    const batchSize = 50;

    for (let i = 0; i < emailList.length; i += batchSize) {
      const batch = emailList.slice(i, i + batchSize);

      console.log(`Sending mail to batch ${Math.floor(i / batchSize) + 1}...`);

      await safeSend({
        from: fromEmail,
        to: batch,
        subject: "New Notes Request Posted!",
        html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.textBody}; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            
            <div style="background: ${COLORS.primary}; height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${COLORS.primary}; margin-top: 0; font-size: 24px;">New Request on CampusNotes</h2>
              
              <p style="font-size: 16px; color: ${COLORS.textBody}; line-height: 1.6; margin-top: 20px;">
                <strong style="color: ${COLORS.primary}; font-weight: 600;">${requestData.user.username || requestData.user.name}</strong> has requested new notes:
              </p>

              <div style="background-color: ${COLORS.bg}; border-left: 4px solid ${COLORS.primary}; padding: 15px 20px; margin: 25px 0; border-radius: 4px; text-align: left; color: ${COLORS.textBody}; font-style: italic;">
                "${requestData.content}"
              </div>

              <div style="margin-top: 35px;">
                <a href="https://campusnotes.bitbros.in/requestnotes"
                   style="display: inline-block; background: ${COLORS.primary}; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  View Request
                </a>
              </div>

              <p style="font-size: 12px; color: ${COLORS.textMuted}; margin-top: 40px;">
                You are receiving this email because you are subscribed to CampusNotes notifications.
              </p>
            </div>
            
            <div style="background-color: ${COLORS.card}; padding: 15px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; border-top: 1px solid ${COLORS.border};">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
      }, "bulk");

      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} sent.`);
    }

    console.log("✅ All new request email batches processed.");

  } catch (err) {
    console.error("❌ Error in sendNewRequestMail function:", err.message);
    throw err; // Allow queue to retry
  }
};

module.exports.sendNewRequestMailOnce = async (email, requestData) => {
  try {
      await safeSend({
        from: fromEmail,
        to: [email],
        subject: "New Notes Request Posted!",
        html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.textBody}; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            
            <div style="background: ${COLORS.primary}; height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${COLORS.primary}; margin-top: 0; font-size: 24px;">New Request on CampusNotes</h2>
              
              <p style="font-size: 16px; color: ${COLORS.textBody}; line-height: 1.6; margin-top: 20px;">
                <strong style="color: ${COLORS.primary};">${requestData.user.username || requestData.user.name}</strong> has requested new notes:
              </p>

              <div style="background-color: ${COLORS.bg}; border-left: 4px solid ${COLORS.primary}; padding: 15px 20px; margin: 25px 0; border-radius: 4px; text-align: left; color: ${COLORS.textBody}; font-style: italic;">
                "${requestData.content}"
              </div>

              <div style="margin-top: 35px;">
                <a href="https://campusnotes.bitbros.in/requestnotes"
                   style="display: inline-block; background: ${COLORS.primary}; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  View Request
                </a>
              </div>

              <p style="font-size: 12px; color: ${COLORS.textMuted}; margin-top: 40px;">
                You are receiving this email because you are subscribed to CampusNotes notifications.
              </p>
            </div>
            
            <div style="background-color: ${COLORS.card}; padding: 15px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; border-top: 1px solid ${COLORS.border};">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
      }, "bulk");

  } catch (err) {
    console.error("❌ Error in sendNewRequestMailOnce function:", err.message);
    throw err;
  }
};

module.exports.sendOTP = async (user, otp) => {
  try {
    await safeSend({
      from: fromEmail,
      to: [user.email],
      subject: "OTP for Password Reset!",
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.textBody}; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            
            <div style="background: ${COLORS.primary}; height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${COLORS.primary}; margin-top: 0; font-size: 24px;">Password Reset Request</h2>
              
              <p style="font-size: 16px; color: ${COLORS.textBody}; line-height: 1.6; margin-top: 20px;">
                Hello <strong style="color: ${COLORS.primary}; text-transform: capitalize;">${user.name || user.username || "User"}</strong>,
              </p>
              
              <p style="font-size: 15px; color: ${COLORS.textMuted};">
                We received a request to reset your password. Use the OTP below to continue:
              </p>

              <div style="background-color: ${COLORS.bg}; border: 1px solid ${COLORS.border}; padding: 20px; margin: 30px auto; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${COLORS.primary}; display: inline-block; min-width: 200px;">
                ${otp}
              </div>

              <p style="font-size: 14px; color: ${COLORS.textMuted}; margin-top: 20px;">
                This OTP is valid for the next 10 minutes. If you didn’t request a password reset, you can safely ignore this email.
              </p>
            </div>

            <div style="background-color: ${COLORS.card}; padding: 15px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; border-top: 1px solid ${COLORS.border};">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
    }, "critical");

    console.log("✅ OTP processed via safeSend to:", user.email);
  } catch (err) {
    console.error("❌ Error sending OTP:", err.message);
    throw err;
  }
};

module.exports.sendVerificationMail = async (mail, status) => {
  try {
    const user = await User.findOne({ email: mail });
    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }
    if(user.roles.isModerator || user.roles.isDev){
      return;
    }

    const isApproved = status === "Approved";
    const statusColor = isApproved ? "#22c55e" : "#ef4444";

    await safeSend({
      from: fromEmail,
      to: [user.email],
      subject: `Your uploaded note is ${status}`,
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.textBody}; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            
            <div style="background: ${statusColor}; height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${statusColor}; margin-top: 0; font-size: 24px;">Note Submission Update</h2>
              
              <p style="font-size: 16px; color: ${COLORS.textBody}; line-height: 1.6; margin-top: 20px;">
                Hello <strong style="color: ${COLORS.primary}; text-transform: capitalize;">${user.name || user.username || "User"}</strong>,
              </p>
              
              <p style="font-size: 15px; color: ${COLORS.textMuted};">The status of your recently uploaded note is:</p>

              <div style="background-color: ${COLORS.bg}; border: 1px solid ${statusColor}; color: ${statusColor}; padding: 15px 30px; margin: 25px auto; border-radius: 12px; font-size: 20px; font-weight: bold; display: inline-block;">
                ${status}
              </div>

              <p style="font-size: 14px; color: ${COLORS.textMuted}; margin-top: 20px;">
                ${isApproved
          ? "Great job! Your note is now helping other students."
          : "If you believe this is a mistake, please review our guidelines or contact us at <span style='color: ${COLORS.primary};'>campusnotes@bitbros.in</span>."}
              </p>
            </div>

            <div style="background-color: ${COLORS.card}; padding: 15px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; border-top: 1px solid ${COLORS.border};">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
    }, "critical");

    console.log("✅ Note status mail processed via safeSend to:", user.email);
  } catch (err) {
    console.error("❌ Error sending verification mail:", err.message);
    throw err;
  }
};

module.exports.sendAccountVerificationMail = async (mail, status) => {
  try {
    const user = await User.findOne({ email: mail });
    if (!user) {
      console.log("⚠️ No user found with this email.");
      return;
    }

    const isVerified = status === "Verified";
    const statusColor = isVerified ? "#22c55e" : "#ef4444";

    await safeSend({
      from: fromEmail,
      to: [user.email],
      subject: `Your CampusNotes Account is ${status}`,
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.textBody}; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            
             <div style="background: ${statusColor}; height: 4px;"></div>

            <div style="padding: 40px 30px; text-align: center;">
              <h2 style="color: ${statusColor}; margin-top: 0; font-size: 24px;">Account Verification Update</h2>
              
              <p style="font-size: 16px; color: ${COLORS.textBody}; line-height: 1.6; margin-top: 20px;">
                Hello <strong style="color: ${COLORS.primary}; text-transform: capitalize;">${user.name || user.username || "User"}</strong>, your account has been:
              </p>

              <div style="background-color: ${COLORS.bg}; border: 1px solid ${statusColor}; color: ${statusColor}; padding: 15px 30px; margin: 25px auto; border-radius: 12px; font-size: 20px; font-weight: bold; display: inline-block;">
                ${status}
              </div>

              <p style="font-size: 14px; color: ${COLORS.textMuted}; margin-top: 20px;">
                 ${isVerified
          ? "You can now upload notes and access all features."
          : "If you think this is a mistake, please re-submit your documents or contact us at <span style='color: ${COLORS.primary};'>campusnotes@bitbros.in</span>."}
              </p>
            </div>

            <div style="background-color: ${COLORS.card}; padding: 15px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; border-top: 1px solid ${COLORS.border};">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
    }, "critical");

    console.log("✅ Account status mail processed via safeSend to:", user.email);
  } catch (err) {
    console.error("❌ Error sending account verification mail:", err.message);
    throw err;
  }
};

module.exports.sendInvitationMail = async (email, name, stats) => {
  try {
    await safeSend({
      from: fromEmail,
      to: [email],
      subject: "Join your peers on CampusNotes 🎓",
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.textBody}; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: auto; background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
            
            <div style="background: ${COLORS.primary}; height: 4px;"></div>

            <div style="padding: 40px 30px;">
              <h2 style="color: ${COLORS.primary}; margin-top: 0; font-size: 24px; text-align: center;">Welcome to CampusNotes</h2>
              
              <p style="font-size: 16px; color: ${COLORS.textHead}; margin-top: 20px; text-transform: capitalize;">
                Hello <strong>${name}</strong>,
              </p>
              
              <p style="font-size: 15px; color: ${COLORS.textBody}; line-height: 1.6;">
                We noticed you haven’t joined the <strong>CampusNotes</strong> community yet! CampusNotes is a student-driven platform designed to make academic resources accessible and organized for everyone.
              </p>

              <div style="background-color: ${COLORS.bg}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <h3 style="color: ${COLORS.textHead}; font-size: 16px; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid ${COLORS.border}; padding-bottom: 10px;">Why join our community?</h3>
                <div style="color: ${COLORS.textBody}; font-size: 14px;">
                  <div style="margin-bottom: 10px; display: flex; align-items: center;">
                    <span style="color: ${COLORS.primary}; margin-right: 10px;">📚</span> <span><strong>${stats.totalNotes}+ Resources</strong>: Access high-quality notes and PYQs.</span>
                  </div>
                  <div style="margin-bottom: 10px; display: flex; align-items: center;">
                    <span style="color: ${COLORS.primary}; margin-right: 10px;">📥</span> <span><strong>${stats.totalDownloads}+ Downloads</strong>: Join <strong>${stats.totalUsers}+ students</strong> already on board.</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="color: ${COLORS.primary}; margin-right: 10px;">🤝</span> <span><strong>Collaborative Learning</strong>: Stay updated with your batch.</span>
                  </div>
                </div>
              </div>

              <div style="background-color: ${COLORS.bg}; border-left: 4px solid ${COLORS.primary}; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="font-size: 14px; color: ${COLORS.textBody}; margin: 0; line-height: 1.5;">
                  <strong>💡 Special Request:</strong> We currently have very few resources for the <strong>6th Semester</strong>. If you have any notes, your contribution could greatly help your batchmates!
                </p>
              </div>

              <div style="text-align: center; margin-top: 35px;">
                <a href="https://campusnotes.bitbros.in/explore" 
                   style="display: inline-block; background: ${COLORS.primary}; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Explore & Sign Up
                </a>
              </div>
            </div>

            <div style="background-color: ${COLORS.card}; padding: 15px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; border-top: 1px solid ${COLORS.border};">
              © ${new Date().getFullYear()} CampusNotes. All rights reserved.
            </div>
          </div>
        </div>
      `,
    }, "bulk");

  } catch (err) {
    console.error("❌ Error in sendInvitationMail:", err.message);
    throw err;
  }
};