// api/acuity.js
import fetch from 'node-fetch';
import Smartsheet from 'smartsheet';

const smartsheet = new Smartsheet({
  accessToken: process.env.SMARTSHEET_TOKEN
});

const SHEET_ID = process.env.SHEET_ID;

// Column mapping in Smartsheet
const COLUMN_MAP = {
  COL_APPT_ID: 'Acuity Appt ID',
  COL_NAME: 'Associate Name',
  COL_EMAIL: 'Email Address',
  COL_PHONE: 'Phone Number',
  COL_DATE: 'OB Calendar',
  COL_TIME: 'Appt Time',
  COL_SERVICE: 'Acuity Appt Type',
  COL_STATUS: 'Acuity Status'
};

// Helper: find Smartsheet column ID by title
async function getColumnIds(sheetId) {
  const sheet = await smartsheet.sheets.getSheet({ id: sheetId });
  const columns = {};
  sheet.columns.forEach(col => {
    for (const key in COLUMN_MAP) {
      if (col.title === COLUMN_MAP[key]) {
        columns[key] = col.id;
      }
    }
  });
  return columns;
}

// Vercel handler
export default async function handler(req, res) {
  try {
    const payload = req.body;

    console.log('Webhook payload from Acuity:', payload);

    // Fetch full appointment details from Acuity
    const acuityResponse = await fetch(
      `https://acuityscheduling.com/api/v1/appointments/${payload.id}`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${process.env.ACUITY_KEY}:`).toString('base64')
        }
      }
    );

    const appointment = await acuityResponse.json();
    console.log('Full appointment details:', appointment);

    // Get current column IDs from Smartsheet
    const columnIds = await getColumnIds(SHEET_ID);
    console.log('Column IDs:', columnIds);

    // Prepare row data
    const newRow = {
      toTop: true,
      cells: [
        { columnId: columnIds.COL_APPT_ID, value: appointment.id },
        { columnId: columnIds.COL_NAME, value: `${appointment.firstName} ${appointment.lastName}` },
        { columnId: columnIds.COL_EMAIL, value: appointment.email },
        { columnId: columnIds.COL_PHONE, value: appointment.phone },
        { columnId: columnIds.COL_DATE, value: appointment.date },
        { columnId: columnIds.COL_TIME, value: appointment.time },
        { columnId: columnIds.COL_SERVICE, value: appointment.type },
        { columnId: columnIds.COL_STATUS, value: appointment.action }
      ]
    };

    // Add row to Smartsheet
    const addedRow = await smartsheet.sheets.addRows({
      sheetId: SHEET_ID,
      body: [newRow]
    });

    console.log('Added row to Smartsheet:', addedRow);

    res.status(200).send('OK');
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: err.message });
  }
}
