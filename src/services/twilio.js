import twilio from "twilio";


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

export async function createMessage(phoneNumber, otp) {
 
     const result = await client.messages.create({
       body: `your Zahra verification code is ${otp}`,
       from: process.env.TWILIO_PHONE_NUMBER,
       to: phoneNumber,
     });

     if(result.errorMessage){
      console.error("Error: while sending otp to phone", twilioError);
      return {
        success: false,
        message: "Error: while sending otp to phone",
        error: twilioError,
      };
     }

     return {
       success: true,
       message: "otp sent successfully",
       data: result
     };
  } 


