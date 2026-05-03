/**
 * Validates and auto-corrects data across all four Sport Log tabs.
 */
function validatePicksData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Define the specific tabs to clean
  const logTabs = ["MLB Picks Log", "NBA Picks Log", "NFL Picks Log", "NHL Picks Log"];
  let totalCorrected = 0;

  logTabs.forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) return; // Skip if the tab doesn't exist yet

    let data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      let pick = String(data[i][4]).trim(); // Column E
      let type = String(data[i][5]);        // Column F
      let category = String(data[i][6]);    // Column G
      let rowNum = i + 1;
      
      // 1. TOTALS LOGIC
      let totalMatch = pick.toLowerCase().match(/([ou])\s?(\d+(\.\d+)?)/);
      if (totalMatch) {
        let correctOverUnder = totalMatch[1] === 'o' ? "OVER" : "UNDER";
        sheet.getRange(rowNum, 6).setValue("Total");
        sheet.getRange(rowNum, 7).setValue(correctOverUnder);
        sheet.getRange(rowNum, 1, 1, 7).setBackground(null); 
        totalCorrected++;
        continue; 
      }

      // 2. MONEYLINE LOGIC
      if (type === "Moneyline") {
        if (pick !== category) {
          sheet.getRange(rowNum, 5, 1, 3).setBackground("#fff2cc"); 
        } else {
          sheet.getRange(rowNum, 5, 1, 3).setBackground(null);
        }
      }

      // 3. SPREAD LOGIC
      if (type === "Spread") {
        if (pick.startsWith(category) && category !== "") {
          sheet.getRange(rowNum, 5, 1, 3).setBackground(null);
        } else {
          sheet.getRange(rowNum, 5, 1, 3).setBackground("#f4cccc");
        }
      }
    }
  });

  SpreadsheetApp.getUi().alert("System Audit Complete: Checked all Sport Logs. Logic synchronized and errors highlighted.");
}
