import twilio from "twilio";

export const handleWhatsApp = async (req, res) => {
    console.log("TWILIO HIT RECEIVED");
    console.log("Body:", req.body);

    const incomingMsg = req.body.Body;

    const twiml = new twilio.twiml.MessagingResponse();

    twiml.message(`Received: ${incomingMsg}`);

    res.writeHead(200, { "Content-Type": "text/xml" });
    res.end(twiml.toString());
};