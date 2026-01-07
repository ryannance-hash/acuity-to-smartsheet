// api/acuity.js

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const webhookData = req.body;
    console.log("Webhook payload from Acuity:", webhookData);

    const appointmentId = webhookData.id;
    if (!appointmentId) {
      return res.status(400).send("Missing appointment ID in webhook");
    }

    // Fetch full appointment details from Acuity
    const ACUITY_USER = process.env.ACUITY_USER;
    const ACUITY_KEY = process.env.ACUITY_KEY;

    const acuityResponse = await fetch(
      `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`,
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${ACUITY_USER}:${ACUITY_KEY}`).toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );

    if (!acuityResponse.ok) {
      const errText = await acuityResponse.text();
      console.error("Error fetching Acuity appointment:", errText);
      return res.status(500).send(`Acuity API error: ${errText}`);
    }

    const appointment = await acuityResponse.json();
    console.log("Full appointment details:", appointment);

    // Map appointment data to Smartsheet row
    const smartsheetBody = {
      toBottom: true,
      cells: [
        { columnId: Number(process.env.COL_APPT_ID), value: appointment.id },
        {
          columnId: Number(process.env.COL_NAME),
          value: `${appointment.firstName || ""} ${appointment.lastName || ""}`.trim(),
        },
        { columnId: Number(process.env.COL_EMAIL), value: appointment.email || "" },
        { columnId: Number(process.env.COL_PHONE), value: appointment.phone || "" },
        { columnId: Number(process.env.COL_DATE), value: appointment.date || "" },
        { columnId: Number(process.env.COL_TIME), value: appointment.time || "" },
        { columnId: Number(process.env.COL_SERVICE), value: appointment.type || "" },
        { columnId: Number(process.env.COL_STATUS), value: "Scheduled" },
      ],
    };

    // Insert into Smartsheet
    const smartsheetResponse = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${process.env.SHEET_ID}/rows`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smartsheetBody),
      }
    );

    if (!smartsheetResponse.ok) {
      const errorText = await smartsheetResponse.text();
      console.error("Smartsheet API error:", errorText);
      return res.status(500).send(`Smartsheet API error: ${errorText}`);
    }

    console.log("Row added successfully to Smartsheet!");
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Unexpected error in handler:", error);
    return res.status(500).send(`Internal Server Error: ${error.message}`);
  }
}
