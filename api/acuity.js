export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const data = req.body;

    if (!data.id) {
      return res.status(400).send("Missing appointment id in webhook");
    }

    const appointmentId = data.id;

    // Fetch full appointment from Acuity
    const acuityResponse = await fetch(
      `https://acuityscheduling.com/api/v1/appointments/${appointmentId}`,
      {
        headers: {
          "Authorization": `Basic ${Buffer.from(
            process.env.ACUITY_USER + ":" + process.env.ACUITY_KEY
          ).toString("base64")}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!acuityResponse.ok) {
      const err = await acuityResponse.text();
      console.error("Error fetching appointment:", err);
      return res.status(500).send(`Error fetching appointment: ${err}`);
    }

    const appointment = await acuityResponse.json();

    // Safely extract data
    const getSafe = (value) => (value === null || value === undefined ? "" : value);

    const name = `${getSafe(appointment.firstName)} ${getSafe(appointment.lastName)}`;
    const email = getSafe(appointment.email);
    const phone = getSafe(appointment.phone);
    const date = getSafe(appointment.date);
    const time = getSafe(appointment.time);
    const service = getSafe(appointment.type);

    console.log("Posting to Smartsheet:", { appointmentId, name, email, phone, date, time, service });

    // Build cells dynamically and only if column IDs exist
    const cells = [];

    const columns = [
      { env: "COL_APPT_ID", value: appointmentId },
      { env: "COL_NAME", value: name },
      { env: "COL_EMAIL", value: email },
      { env: "COL_PHONE", value: phone },
      { env: "COL_DATE", value: date },
      { env: "COL_TIME", value: time },
      { env: "COL_SERVICE", value: service },
      { env: "COL_STATUS", value: "Scheduled" }
    ];

    columns.forEach((col) => {
      const colId = Number(process.env[col.env]);
      if (!isNaN(colId)) {
        cells.push({ columnId: colId, value: col.value });
      } else {
        console.warn(`Column ID for ${col.env} is invalid, skipping`);
      }
    });

    const smartsheetResponse = await fetch(
      `https://api.smartsheet.com/2.0/sheets/${process.env.SHEET_ID}/rows`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SMARTSHEET_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          toBottom: true,
          cells
        })
      }
    );

    if (!smartsheetResponse.ok) {
      const errorText = await smartsheetResponse.text();
      console.error("Smartsheet API error:", errorText);
      return res.status(500).send(`Smarts
