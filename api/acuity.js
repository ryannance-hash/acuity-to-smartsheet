export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const data = req.body;

    // --- Debug logs ---
    console.log("Webhook payload from Acuity:", data);

    // --- Extract Acuity fields ---
    const appointmentId = data.id;
    const name = `${data.firstName || ""} ${data.lastName || ""}`;
    const email = data.email || "";
    const phone = data.phone || "";
    const date = data.date || "";
    const time = data.time || "";
    const service = data.type || "";

    // --- Prepare Smartsheet request body ---
    const body = {
      toBottom: true,
      cells: [
        { columnId: parseInt(process.env.COL_APPT_ID), value: appointmentId },
        { columnId: parseInt(process.env.COL_NAME), value: name },
        { columnId: parseInt(process.env.COL_EMAIL), value: email },
        { columnId: parseInt(process.env.COL_PHONE), value: phone },
        { columnId: parseInt(process.env.COL_DATE), value: date },       // format YYYY-MM-DD
        { columnId: parseInt(process.env.COL_TIME), value: time },       // format HH:mm:ss
        { columnId: parseInt(process.env.COL_SERVICE), value: service },
        { columnId: parseInt(process.env.COL_STATUS), value: "Scheduled" }
      ]
    };

    console.log("Smartsheet request body:", JSON.stringify(body, null, 2));

    // --- Send to Smartsheet ---
    const response = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${process.env.SHEET_ID}/rows`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Smartsheet API error:", text);
      return res.status(500).send(`Smartsheet API error: ${text}`);
    }

    console.log("Appointment successfully added to Smartsheet!");
    res.status(200).send("Appointment added to Smartsheet!");
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send(`Server error: ${error.message}`);
  }
}
