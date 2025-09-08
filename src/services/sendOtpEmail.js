import { Resend } from "resend";
import LoginOtpEmail from "../../emails/LoginOtpEmail.jsx";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(email, verifyCode) {
    const result = await resend.emails.send({
      from: "oboarding@resend.dev",
      to: email,
      subject: "Verification Code",
      react: LoginOtpEmail({ otp: verifyCode }),
    });

    if(result.error){
      return {
        success: false,
        message: "Error: while sending verification email",
        error: result.error,
      };
    }

    return {
      success: true,
      message: "otp sent successfully",
      data: result.data
    }

}
