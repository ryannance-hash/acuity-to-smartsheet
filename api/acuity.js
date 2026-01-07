module.exports = async function handler(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // ---- Safely parse webhook body (Vercel-safe) ----
    let data = req.body;

    if (typeof req.body === "string") {
      try {
        data = JSON.parse(req.body);
      } catch (err) {
        console.error("Failed to parse request body:", err);
        data = {};
      }
    }

    console.log("Webhook payload from Acuity:", data);

    // ---- Map Acuity webhook fields defensively ----
    const appointmentId = data.id || data.appointmentId || "";
    const name = `${data.first_name || data.firstName || ""} ${data.last_name || data.lastName || ""}`.trim();
    const email = data.email || "";
    const phone = data.phone || "";
    const date = data.date || "";
    const time = data.time || "";
    const service = data.appointmentType || data.type || "";

    // ---- Build Smartsheet rows payload (MUST be an array) ----
    const smartsheetBody = [
      {
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
      }
    ];

    // ---- Send row to Smartsheet ----
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${process.env.SHEET_ID}/rows`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
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

    console.log("Row successfully added to Smartsheet");
    return res.status(200).send("OK");

  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
};
