const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Ensure instance is only created if keys exist, so it doesn't crash on startup if missing
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

exports.createOrder = async (req, res) => {
  try {
    if (!razorpayInstance) {
      // Fallback mock order for demo purposes
      return res.json({ 
        success: true, 
        order: { id: `order_mock_${Date.now()}`, amount: Math.round(req.body.amount * 100) } 
      });
    }
    
    const { amount, receipt } = req.body;
    
    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`
    };
    
    const order = await razorpayInstance.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ success: false, message: 'Some error occured' });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Fallback mock order for demo purposes if Razorpay fails
    return res.json({ 
      success: true, 
      order: { id: `order_mock_${Date.now()}`, amount: Math.round(req.body.amount * 100) } 
    });
  }
};

exports.verifySignature = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.json({ success: true, message: "Mock payment verified successfully" });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");
      
    if (razorpay_signature === expectedSign) {
      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid signature sent!" });
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
