module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // ---- Parse body safely ----
    let data = req.body;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }

    console.log("Webhook payload:", data);

    // ---- Map webhook fields ----
    const appointmentId = data.id || data.appointmentId || "";
    const name = `${data.first_name || data.firstName || ""} ${data.last_name || data.lastName || ""}`.trim();
    const email = data.email || "";
    const phone = data.phone || "";
    const date = data.date || "";
    const time = data.time || "";
    const service = data.appointmentType || data.type || "";

    // ---- Column map (IMPORTANT for debugging) ----
    const columns = {
      COL_APPT_ID: process.env.COL_APPT_ID,
      COL_NAME: process.env.COL_NAME,
      COL_EMAIL: process.env.COL_EMAIL,
      COL_PHONE: process.env.COL_PHONE,
      COL_DATE: process.env.COL_DATE,
      COL_TIME: process.env.COL_TIME,
      COL_SERVICE: process.env.COL_SERVICE,
      COL_STATUS: process.env.COL_STATUS
    };

    console.log("Column ID map:", columns);
    console.log("Sheet ID:", process.env.SHEET_ID);

    // ---- Smartsheet payload (array REQUIRED) ----
    const smartsheetBody = [
      {
        toBottom: true,
        cells: [
          { columnId: columns.COL_APPT_ID, value: appointmentId },
          { columnId: columns.COL_NAME, value: name },
          { columnId: columns.COL_EMAIL, value: email },
          { columnId: columns.COL_PHONE, value: phone },
          { columnId: columns.COL_DATE, value: date },
          { columnId: columns.COL_TIME, value: time },
          { columnId: columns.COL_SERVICE, value: service },
          { columnId: columns.COL_STATUS, value: "Scheduled" }
        ]
      }
    ];

    // ---- Send to Smartsheet ----
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
      const
