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

    // Log environment variables to verify
    console.log("Column IDs:", {
      COL_APPT_ID: process.env.COL_APPT_ID,
      COL_NAME: process.env.COL_NAME,
      COL_EMAIL: process.env.COL_EMAIL,
      COL_PHONE: process.env.COL_PHONE,
      COL_DATE: process.env.COL_DATE,
      COL_TIME: process.env.COL_TIME,
      COL_SERVICE: process.env.COL_SERVICE,
      COL_STATUS: process.env.COL_STATUS
    });
    console.log("Sheet ID:", process.env.SHEET_ID);

    // Construct body for Smartsheet API
    const smartsheetBody = {
      toBottom: true,
      cells: [
        { columnId: process.env.COL_APPT_ID, value: appointmentId },
        { columnId: process.env.COL_NAME, value: name },
        { columnId: process.env.COL_EMAIL, value: email },
        { columnId: process.env.COL_PHONE, value: phone },
        { columnId: process.env.COL_DATE, value: date },
        { columnId: process.env.COL_TIME, value: time },
        { columnId: process.env.COL_SERVICE, value: service },
        { columnId: process.env.COL_STATUS, value: "Scheduled" }
      ]
    };

    // Send request to Smartsheet
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
