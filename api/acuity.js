module.exports = async function handler(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const data = req.body;

    console.log("Webhook payload from Acuity:", data);

    // Map data from Acuity webhook
    const appointmentId = data.id || "";
    const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();
    const email = data.email || "";
    const phone = data.phone || "";
    const date = data.date || "";
    const time = data.time || "";
    const service = data.type || "";

    // Construct body for Smartsheet API
    const smartsheetBody = {
      toBottom: true,
      cells: [
        { columnId: Number(process.env.COL_APPT_ID), value: appointmentId },
        { columnId: Number(process.env.COL_NAME), value: name },
        { columnId: Number(process.env.COL_EMAIL), value: email },
        { columnId: Number(process.env.COL_PHONE), value: phone },
        { columnId: Number(process.env.COL_DATE), value: date },
        { columnId: Number(process.env.COL_TIME), value: time },
        { columnId: Number(process.env.COL_SERVICE), value: service },
        { columnId: Number(process.env.COL_STATUS), value: "Scheduled" }
      ]
    };

    // Use built-in fetch
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${process.env.SHEET_ID}/rows`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SMARTSHEET_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(smartsheetBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Smartsheet API error:", errorText);
      return res.status(500).send(`Smartsheet API error: ${errorText}`);
    }

    console.log("Row added successfully to Smartsheet!");
    res.status(200).send("OK");

  } catch (error) {
    console.error("Unexpected error in handler:", error);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
};
