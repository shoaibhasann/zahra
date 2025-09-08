import { Resend } from "resend";
import LoginOtpEmail from "../../emails/LoginOtpEmail.jsx";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(email, verifyCode) {
  try {
    await resend.emails.send({
      from: "oboarding@resend.dev",
      to: email,
      subject: "Verification Code",
      react: LoginOtpEmail({ otp: verifyCode }),
    });

    return {
      success: true,
      message: "Login otp send successfully"
    }
  } catch (emailError) {
    console.error("Error: sending verification email", emailError);
    return {
      success: false,
      message: "Error: sending verification email",
      error: emailError
    }
  }
}
