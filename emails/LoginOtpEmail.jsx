import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export default function LoginOtpEmail({ otp }) {
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>Login OTP from Zahra</Preview>

        <Container style={container}>
          <Section style={coverSection}>
            <Section style={upperSection}>
              <Heading
                style={h1}
              >This is your Verification Code</Heading>

              <Text style={mainText}>
                Someone (or you) requested a one-time code to sign in to your
                Zahra account. Enter the code below to complete the
                login. If you didn't request this, you can safely ignore this
                email.
              </Text>

              <Section style={verificationSection}>
                <Text style={verifyText}>Your One-Time-Password</Text>

                <Text style={codeText}>{otp}</Text>

                <Text style={validityText}>
                  (This OTP is valid for 10 minutes)
                </Text>
              </Section>

              <Text style={cautionText}>
                Sent by <strong>Zahra</strong>
              </Text>
            </Section>

            <Hr />

            <Section style={lowerSection}>
              <Text style={cautionText}>
                Zahra will never email you and ask you to disclose or
                verify your password, credit card, or banking details.
              </Text>
            </Section>
          </Section>

          <Text style={footerText}>
            This message was produced and distributed by Zahra, © {currentYear}, All rights
            reserved.{" "}
            <Link href="https://zahra.com" target="_blank" style={link}>
              zahra.com
            </Link>
            . View our{" "}
            <Link
              href="https://zahra.com/privacy"
              target="_blank"
              style={link}
            >
              privacy policy
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

LoginOtpEmail.PreviewProps = {
  otp: "596853",
};

const main = {
  backgroundColor: "#fff",
  color: "#212121",
};

const container = {
  padding: "20px",
  margin: "0 auto",
  backgroundColor: "#eee",
};

const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "15px",
};

const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline",
};

const text = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "24px 0",
};

const coverSection = { backgroundColor: "#fff" };

const upperSection = { padding: "25px 35px" };

const lowerSection = { padding: "25px 35px" };

const footerText = {
  ...text,
  fontSize: "12px",
  padding: "0 20px",
};

const verifyText = {
  ...text,
  margin: 0,
  fontWeight: "bold",
  textAlign: "center",
};

const codeText = {
  ...text,
  fontWeight: "bold",
  fontSize: "36px",
  margin: "10px 0",
  textAlign: "center",
  letterSpacing: "4px",
};

const validityText = {
  ...text,
  margin: "0px",
  textAlign: "center",
};

const verificationSection = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 0",
};

const mainText = { ...text, marginBottom: "14px" };

const cautionText = { ...text, margin: "0px" };
