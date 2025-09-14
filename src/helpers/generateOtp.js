import crypto from "crypto";

export async function createOtpHash(plainOtp){
    const secret = process.env.OTP_SECRET || "change_me";
    return crypto.createHmac("sha256", secret).update(plainOtp).digest("hex");
}


export async function generateOtp(
  channel = "sms",
  ttlSeconds = 600
) {
  const plainOtp = String(Math.floor(Math.random() * 900000 + 100000));
  const otpHash = await createOtpHash(plainOtp);
  const expires = new Date(Date.now() + ttlSeconds * 1000);

  return {
    toStore: { otpHash, channel, expiresAt: expires, createdAt: new Date() },
    plainOtp
  };
};

