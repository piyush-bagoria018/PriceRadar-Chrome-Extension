import { Resend } from "resend";

function createResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  return new Resend(process.env.RESEND_API_KEY);
}

function getFromAddress() {
  const fromEmail = process.env.FROM_EMAIL;
  if (!fromEmail) {
    throw new Error("FROM_EMAIL is missing");
  }

  const fromName = process.env.FROM_NAME || "PriceRadar";
  return `${fromName} <${fromEmail}>`;
}

export const sendPriceAlertEmail = async ({
  userEmail,
  productName,
  targetPrice,
  currentPrice,
  productUrl = '',
}) => {
  try {
    const resend = createResendClient();
    const productLink = productUrl || '';

    const response = await resend.emails.send({
      from: getFromAddress(),
      to: userEmail,
      subject: `Price Alert: ${productName} is now below your target`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333;">Price Alert</h2>
            <p style="color: #666; font-size: 16px;">
              ${productName} has dropped in price.
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 10px 0; color: #666;">
                <span style="display: inline-block; width: 120px;">Current Price:</span>
                <strong style="color: #27ae60; font-size: 18px;">₹${currentPrice.toFixed(2)}</strong>
              </p>
              <p style="margin: 10px 0; color: #666;">
                <span style="display: inline-block; width: 120px;">Your Target:</span>
                <strong style="color: #2980b9; font-size: 18px;">₹${targetPrice.toFixed(2)}</strong>
              </p>
              <p style="margin: 10px 0; color: #27ae60; font-weight: bold;">
                You are saving ₹${(targetPrice - currentPrice).toFixed(2)}
              </p>
            </div>
            <p style="color: #666; margin: 20px 0;">
              Check the product now before the price changes.
            </p>
            ${productLink ? `
            <a href="${productLink}" 
               style="display: inline-block; background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
              View Product
            </a>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated alert from PriceRadar. You received this email because you set a price alert for this product.
            </p>
          </div>
        </div>
      `,
    });

    return { success: true, messageId: response.id };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export const sendAlertConfirmationEmail = async ({
  userEmail,
  productName,
  targetPrice,
}) => {
  try {
    const resend = createResendClient();

    const response = await resend.emails.send({
      from: getFromAddress(),
      to: userEmail,
      subject: `Alert confirmed for ${productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333;">Alert confirmed</h2>
            <p style="color: #666; font-size: 16px;">
              Your alert has been set successfully for <strong>${productName}</strong>.
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 10px 0; color: #666;">
                <span style="display: inline-block; width: 120px;">Target Price:</span>
                <strong style="color: #2980b9; font-size: 18px;">₹${targetPrice.toFixed(2)}</strong>
              </p>
            </div>
            <p style="color: #666; margin: 20px 0;">
              We will email you again as soon as the price drops below your target.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              This is a confirmation email from PriceRadar.
            </p>
          </div>
        </div>
      `,
    });

    return { success: true, messageId: response.id };
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    throw new Error(`Failed to send confirmation email: ${error.message}`);
  }
};
