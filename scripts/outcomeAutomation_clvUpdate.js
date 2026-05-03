/**
 * Main function to settle picks.
 */
function updateAllOutcomes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabs = ['MLB', 'NBA', 'NHL', 'NFL'];
  
  tabs.forEach(sport => {
    let sheet = ss.getSheetByName(sport + " Picks Log");
    if (sheet) processSportLog(sheet, sport.toLowerCase());
  });
}

function processSportLog(sheet, sport) {
  const data = sheet.getDataRange().getValues();
  const apiPaths = {
    'mlb': 'baseball/mlb', 
    'nba': 'basketball/nba', 
    'nhl': 'hockey/nhl', 
    'nfl': 'football/nfl'
  };
  
  for (let i = 1; i < data.length; i++) {
    let outcome = data[i][8]; // Col I
    let gameStr = data[i][2].toString().toUpperCase(); // Col C: "SEA @ NE"
    let pickStr = data[i][4].toString().trim();       // Col E: "SEA -4.5"
    let betType = data[i][5] ? data[i][5].toString().toUpperCase().trim() : ""; // Col F: "SPREAD"
    let betCat = data[i][6] ? data[i][6].toString().toUpperCase().trim() : ""; // Col G: "SEA"
    
    // Skip if already settled, if pick is empty, or if game string is invalid
    if (outcome !== "" || pickStr === "" || !gameStr.includes("@")) continue;
    
    let gameDateValue = data[i][0];
    if (!(gameDateValue instanceof Date)) continue; 
    let gameDate = Utilities.formatDate(gameDateValue, "GMT", "yyyyMMdd");

    try {
      let response = UrlFetchApp.fetch(`https://site.api.espn.com/apis/site/v2/sports/${apiPaths[sport]}/scoreboard?dates=${gameDate}`);
      let json = JSON.parse(response.getContentText());
      let event = findEventFuzzy(json.events, gameStr, 1);
      
      if (event && event.status.type.completed) {
        let summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/${apiPaths[sport]}/summary?event=${event.id}`;
        let sumJson = JSON.parse(UrlFetchApp.fetch(summaryUrl).getContentText());
        
        // Target DraftKings or first available provider
        let pc = (sumJson.pickcenter && sumJson.pickcenter.length > 0) ? 
                 (sumJson.pickcenter.find(p => p.provider && p.provider.name.toLowerCase().includes("draftkings")) || sumJson.pickcenter[0]) : null;

        if (pc) {
          // Identify Away vs Home from Column C
          let awayTeamAbbr = gameStr.split("@")[0].trim();
          let isAway = (betCat === awayTeamAbbr);
          let finalOddsString = "N/A";

          // 1. MONEYLINE: Numerical Only (e.g., -230)
          if (betType.includes("ML") || betType.includes("MONEY")) {
            let mlObj = pc.moneyline ? (isAway ? pc.moneyline.away : pc.moneyline.home) : null;
            if (mlObj && mlObj.close) {
              finalOddsString = mlObj.close.odds;
            }
          } 
          
          // 2. SPREAD / RUN LINE / PUCK LINE: Line + Odds (e.g., -4.5 (-112))
          else if (betType.includes("SPREAD") || betType.includes("RL") || betType.includes("PL")) {
            let spreadObj = pc.pointSpread ? (isAway ? pc.pointSpread.away : pc.pointSpread.home) : null;
            if (spreadObj && spreadObj.close) {
              let line = spreadObj.close.line;
              let odds = spreadObj.close.odds;
              let formattedLine = (parseFloat(line) > 0 && !line.toString().includes("+")) ? `+${line}` : line;
              finalOddsString = odds ? `${formattedLine} (${odds})` : formattedLine;
            }
          }
          
          // 3. TOTALS: Format o45.5 (-110)
          else if (betType.includes("TOTAL")) {
            let totalObj = pc.total;
            if (totalObj) {
              let isOver = pickStr.toLowerCase().includes(" o");
              let dataObj = isOver ? totalObj.over.close : totalObj.under.close;
              
              if (dataObj && dataObj.line) {
                let prefix = isOver ? "o" : "u";
                // Strip existing o/u from API string to prevent "oo45.5"
                let cleanLine = dataObj.line.toString().replace(/[ou]/gi, '');
                finalOddsString = `${prefix}${cleanLine} (${dataObj.odds})`;
              }
            }
          }

          sheet.getRange(i + 1, 13).setValue(finalOddsString);
        }

        // --- WIN/LOSS SETTLEMENT ---
        let comp = event.competitions[0];
        let hTeam = comp.competitors.find(c => c.homeAway === 'home');
        let aTeam = comp.competitors.find(c => c.homeAway === 'away');
        let result = calculateResult(pickStr, hTeam, aTeam);
        if (result) sheet.getRange(i + 1, 9).setValue(result);
      }
    } catch (e) { 
      console.log(`Error on row ${i+1}: ${e.message}`); 
    }
  }
}

/**
 * UPDATED ABBREVIATION MAP: Translates your sheet's shorthand to ESPN's API language.
 */
function findEventFuzzy(events, gameStr, occurrence) {
  let cleanedGame = gameStr.toUpperCase()
    // --- NBA SPECIFIC FIXES ---
    .replace('SAS', 'SA')   // San Antonio -> SA
    .replace('NOP', 'NO')   // New Orleans -> NO
    .replace('NYK', 'NY')   // New York -> NY
    .replace('GSW', 'GS')   // Golden State -> GS
    .replace('UTA', 'UT')   // Utah -> UT
    // --- NHL SPECIFIC FIXES ---
    .replace('TBL', 'TB')
    .replace('NJD', 'NJ')
    .replace('SJS', 'SJ')
    .replace('WPG', 'WIN')
    .replace('WAS', 'WSH')
    .replace('LAK', 'LA');

  let myTeams = cleanedGame.split(/[\s@]+/).filter(t => t !== 'AT' && t !== '');
  
  // Logic: Filter for ALL games that match your teams on this date
  let matchingEvents = events.filter(e => {
    let espnShort = e.shortName.toUpperCase();
    let espnFull = e.name.toUpperCase();
    
    // Every team in your 'cleanedGame' must exist in the ESPN short or full name
    return myTeams.every(team => espnShort.includes(team) || espnFull.includes(team));
  });

  // Return the specific occurrence (1st game, 2nd game, etc.)
  // We use [occurrence - 1] because arrays are 0-indexed
  return matchingEvents.length >= occurrence ? matchingEvents[occurrence - 1] : null;
}

/**
 * ANCHORED LOGIC: Prioritizes Letter+Number patterns for Totals.
 */
function calculateResult(pick, home, away) {
  const hScore = parseFloat(home.score);
  const aScore = parseFloat(away.score);
  const totalScore = hScore + aScore;
  const p = pick.toLowerCase().trim();

  // 1. ANCHORED TOTALS: Look for 'o' or 'u' immediately followed by a number (e.g., o6.5)
  let totalMatch = p.match(/([ou])(\d+\.?\d*)/);
  if (totalMatch) {
    const type = totalMatch[1]; // 'o' or 'u'
    const line = parseFloat(totalMatch[2]); // The number
    
    if (totalScore === line) return "Push";
    const won = (type === 'o') ? (totalScore > line) : (totalScore < line);
    return won ? "Win" : "Loss";
  }

  // 2. ANCHORED SPREADS: Look for team name + a +/- number
  let spreadMatch = p.match(/([+-]\d+\.?\d*)/);
  if (spreadMatch) {
    const spread = parseFloat(spreadMatch[0]);
    const isHome = p.includes(home.team.abbreviation.toLowerCase()) || p.includes(home.team.name.toLowerCase());
    
    const myScore = isHome ? hScore + spread : aScore + spread;
    const oppScore = isHome ? aScore : hScore;
    
    if (myScore === oppScore) return "Push";
    return myScore > oppScore ? "Win" : "Loss";
  }

  // 3. MONEYLINE: Fallback only if no O/U or Spread patterns found
  const winner = hScore > aScore ? home : away;
  const wAbbr = winner.team.abbreviation.toLowerCase();
  const wName = winner.team.name.toLowerCase();
  
  if (p.includes(wAbbr) || p.includes(wName)) return "Win";
  
  const loser = hScore > aScore ? away : home;
  const lAbbr = loser.team.abbreviation.toLowerCase();
  if (p.includes(lAbbr)) return "Loss";

  return null;
}