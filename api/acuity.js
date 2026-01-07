// acuity.js
// Vercel Serverless Function for Acuity Webhook → Smartsheet

import Smartsheet from "smartsheet";

// Smartsheet client
const smartsheet = Smartsheet.createClient({
  accessToken: process.env.SMARTSHEET_TOKEN
});

// Set your sheet and column IDs here
const SHEET_ID = 1316374212202372;
const COLUMNS = {
  COL_APPT_ID: 3021801339506, // Acuity Appt ID
  COL_NAME: 3021769821064,
  COL_EMAIL: 3021717024246,
  COL_PHONE: 3021717024247,
  COL_DATE: 3021685402001,
  COL_TIME: 3021780670963,
  COL_SERVICE: 3021769170800,
  COL_STATUS: 3021808046793
};

// Vercel Serverless Function handler
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const payload = req.body;
    console.log("Webhook payload from Acuity:", payload);

    // Fetch full appointment details from Acuity API
    const ACUITY_KEY = process.env.ACUITY_API_KEY;
    const ACUITY_USER = process.env.ACUITY_API_USER;

    const acuityRes = await fetch(`https://acuityscheduling.com/api/v1/appointments/${payload.id}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${ACUITY_USER}:${ACUITY_KEY}`).toString("base64")}`
      }
    });

    if (!acuityRes.ok) {
      console.error("Error fetching appointment from Acuity:", await acuityRes.text());
      return res.status(500).send("Failed to fetch Acuity appointment");
    }

    const appointment = await acuityRes.json();
    console.log("Full appointment details:", appointment);

    // Prepare row to add/update in Smartsheet
    const row = {
      toTop: true,
      cells: [
        { columnId: COLUMNS.COL_APPT_ID, value: appointment.id.toString() },
        { columnId: COLUMNS.COL_NAME, value: `${appointment.firstName} ${appointment.lastName}` },
        { columnId: COLUMNS.COL_EMAIL, value: appointment.email },
        { columnId: COLUMNS.COL_PHONE, value: appointment.phone },
        { columnId: COLUMNS.COL_DATE, value: appointment.date },
        { columnId: COLUMNS.COL_TIME, value: appointment.time },
        { columnId: COLUMNS.COL_SERVICE, value: appointment.type },
        { columnId: COLUMNS.COL_STATUS, value: appointment.canceled ? "Canceled" : "Scheduled" }
      ]
    };

    // Add row to Smartsheet
    const response = await smartsheet.sheets.addRows({ sheetId: SHEET_ID, body: [row] });
    console.log("Smartsheet response:", response);

    res.status(200).send("Appointment synced to Smartsheet");
  } catch (err) {
    console.error("Error in handler:", err);
    res.status(500).send("Internal Server Error");
  }
}
