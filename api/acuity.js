import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // 1️⃣ Get the webhook payload from Acuity
    const acuityData = req.body;
    console.log("Webhook payload from Acuity:", acuityData);

    // 2️⃣ Map the fields we want from Acuity
    const rowData = {
      "Acuity Appt ID": acuityData.id,
      "Associate Name": `${acuityData.firstName} ${acuityData.lastName}`,
      "Email Address": acuityData.email,
      "Phone Number": acuityData.phone,
      "OB Calendar": acuityData.date,
      "Appt Time": acuityData.time,
      "Acuity Appt Type": acuityData.type,
      "Acuity Status": acuityData.action
    };

    // 3️⃣ Get the sheet columns dynamically
    const sheetId = process.env.SHEET_ID;
    const smartsheetResp = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}`, {
      headers: {
        Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
        "Content-Type": "application/json"
      }
    });
    const sheetData = await smartsheetResp.json();

    // Build a map: column title -> column id
    const columnMap = {};
    sheetData.columns.forEach(col => {
      columnMap[col.title] = col.id;
    });
    console.log("Column map:", columnMap);

    // 4️⃣ Convert Acuity data to Smartsheet row format
    const smartsheetRow = {
      toTop: true,
      cells: Object.entries(rowData).map(([title, value]) => {
        const columnId = columnMap[title];
        if (!columnId) {
          console.warn(`⚠️ Column "${title}" not found on sheet`);
        }
        return { columnId, value };
      }).filter(cell => cell.columnId) // only include cells with valid column IDs
    };

    // 5️⃣ Insert row into Smartsheet
    const addRowResp = await fetch(`https://api.smartsheet.com/2.0/sheets/${sheetId}/rows`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SMARTSHEET_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([smartsheetRow])
    });

    const addRowData = await addRowResp.json();
    console.log("Smartsheet row added:", addRowData);

    res.status(200).json({ success: true, data: addRowData });
  } catch (error) {
    console.error("Error inserting into Smartsheet:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
