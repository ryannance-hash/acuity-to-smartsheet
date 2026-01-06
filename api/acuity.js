export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const data = req.body;

  const appointmentId = data.id;
  const name = `${data.firstName} ${data.lastName}`;
  const email = data.email;
  const phone = data.phone;
  const date = data.date;
  const time = data.time;
  const service = data.type;

  const response = await fetch(
    `https://api.smartsheet.com/2.0/sheets/${process.env.SHEET_ID}/rows`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SMARTSHEET_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
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
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return res.status(500).send(error);
  }

  res.status(200).send("OK");
}
