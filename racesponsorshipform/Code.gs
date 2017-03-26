// race sponsorship registration form

/**
 * Get "home page", or a requested page.
 * Expects a 'page' parameter in querystring.
 *
 * @param {event} e Event passed to doGet, with querystring
 * @returns {String/html} Html to be served
 */
function doGet(e) {
  Logger.log( Utilities.jsonStringify(e) );
  // When no specific page requested, return "home page"
  if (!e.parameter.page) {
    // need to set xframe options mode - see https://code.google.com/p/google-apps-script-issues/issues/detail?id=852 #89
    var t = HtmlService.createTemplateFromFile('index');
    
  // else, use page parameter to pick an html file from the script
  } else {
    var t = HtmlService.createTemplateFromFile(e.parameter['page']);
  };
  
  racedata = getRaces();
  t.levels = racedata.levels;
  t.races = racedata.races;
  t.levels_json = JSON.stringify(racedata.levels);
  t.races_json = JSON.stringify(racedata.races);
  return t.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// see http://stackoverflow.com/questions/15668119/linking-to-another-html-page-in-google-apps-script
/**
 * Get the URL for the Google Apps Script running as a WebApp.
 */
function getScriptUrl() {
 var url = ScriptApp.getService().getUrl();
 return url;
}

// see http://stackoverflow.com/questions/11344167/use-project-javascript-and-css-files-in-a-google-apps-script-web-app
/**
 * Get the raw content of a file, e.g., to include js or css in the template
 */
function getContent(filename) {
    return HtmlService.createTemplateFromFile(filename).getRawContent();
}

function getRaces() {
  
  // first folder is ok as this database is only in one folder
  var dbfoldername = 'webapp-sponsor-database';
  var thisfolder = DriveApp.getFoldersByName(dbfoldername).next();
  // first file is ok as this filename should be only once in this folder
  var dbfile = thisfolder.getFilesByName('race sponsor form database').next();
  var dbfileurl = dbfile.getUrl();
  Logger.log('dbfileurl='+dbfileurl);
  
  var db = SpreadsheetApp.open(dbfile);
  
  var levelssheet = db.getSheetByName('levels')
  var levelsdata = getRowsData(levelssheet, levelssheet.getDataRange(), 1);
  var levels = {};
  // skip header
  for (var i=1; i<levelsdata.length; i++) {
    var level = levelsdata[i];
    if (!(level.race in levels)) { levels[level.race] = [] };
    var thislevel = { 
      levelName: level.levelName, 
      minSponsorship: level.minSponsorship, 
      display: level.display 
    };
    levels[level.race].push(thislevel);
  };
  
  // sort levels for each race high to low, i.e., most important first, supports form display
  for (var thisrace in levels) {
    sortByKey(levels[thisrace], 'minSponsorship');
    levels[thisrace].reverse();
  };
  
  var racessheet = db.getSheetByName('races')
  var racesdata = getRowsData(racessheet, racessheet.getDataRange(), 1);
  var races = {};
  // skip header
  for (var i=1; i<racesdata.length; i++) {
    race = racesdata[i];
    races[race.race] = { 
      tag: race.tag,
      raceUrl: race.raceUrl,
      sponsorshipUrl: race.sponsorshipUrl,
      email: race.email,
      raceDirector: race.raceDirector,
    };
  };

  Logger.log(levels);
  Logger.log(races);
  return {levels : levels, races : races};
};

// sort array of JSON objects by a key
// credit http://stackoverflow.com/questions/8175093/simple-function-to-sort-an-array-of-objects/8175221#8175221 (David Brainer)

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}; 

// log data and send an email
function logAndSendEmail(formdata) {
  try {

    var template = HtmlService.createTemplateFromFile('email');
    template.formdata = formdata;
    var html = template.evaluate().getContent();
    
    var racename = formdata.race.text;
    
    // figure out RD email for this race
    var racelevels = getRaces();
    var rdemail = racelevels.races[racename].email;
    
    var cclist = ['treasurer@steeplechasers.org',rdemail].join(',');
    
    // log time and formdata from request
    //   collect time and formdata
    var dt = Date();
    var logdata = { time : dt }
    for (var i=0; i<formdata._keyorder.length; i++) {
      field = formdata._keyorder[i];
      value = formdata[field].text;
      logdata[field] = value;
    };
    
    //   open first sheet
    var logfoldername = 'webapp-sponsor-database';
    var thisfolder = DriveApp.getFoldersByName(logfoldername).next();
    // first file is ok as this filename should be only once in this folder
    var logfile = thisfolder.getFilesByName('race sponsor log').next();
    var log = SpreadsheetApp.open(logfile);
    var sheet = log.getSheets()[0]; // always use first sheet -- is this ok?
    
    //   write data to sheet
    writeJSONtoSheet(sheet, logdata)
    
    // send email about sponsorship
    GmailApp.sendEmail(formdata.email.text, 
                       'Thanks for sponsoring '+racename+'!', html, 
                       {
                         cc: cclist,
                         htmlBody: html,
                         name: racename,
                         from: 'treasurer@steeplechasers.org',
                         replyTo: cclist,
                       });
    return 'OK';
  }
  
  catch(err) {
    try {
      GmailApp.sendEmail(
        'technology@steeplechasers.org',
        '[race-sponsorship error] exception occurred on race sponsorship registration form',
        'Error details: ' + err.message
      );
    }
    
    finally {
      return err.message;
    }
  };
  
};

//////////////////////////////////////////////////////////////////////////////////////////
//
// The code below is reused from the 'Reading Spreadsheet data using JavaScript Objects'
// tutorial. (see https://developers.google.com/apps-script/articles/mail_merge)
//
//////////////////////////////////////////////////////////////////////////////////////////

// getRowsData iterates row by row in the input range and returns an array of objects.
// Each object contains all the data for a given row, indexed by its normalized column name.
// Arguments:
//   - sheet: the sheet object that contains the data to be processed
//   - range: the exact range of cells where the data is stored
//   - columnHeadersRowIndex: specifies the row number where the column names are stored.
//       This argument is optional and it defaults to the row immediately above range; 
// Returns an Array of objects.
function getRowsData(sheet, range, columnHeadersRowIndex) {
  columnHeadersRowIndex = columnHeadersRowIndex || range.getRowIndex() - 1;
  var numColumns = range.getEndColumn() - range.getColumn() + 1;
  var headersRange = sheet.getRange(columnHeadersRowIndex, range.getColumn(), 1, numColumns);
  var headers = headersRange.getValues()[0];
  return getObjects(range.getValues(), normalizeHeaders(headers));
}

// For every row of data in data, generates an object that contains the data. Names of
// object fields are defined in keys.
// Arguments:
//   - data: JavaScript 2d array
//   - keys: Array of Strings that define the property names for the objects to create
function getObjects(data, keys) {
  var objects = [];
  for (var i = 0; i < data.length; ++i) {
    var object = {};
    var hasData = false;
    for (var j = 0; j < data[i].length; ++j) {
      var cellData = data[i][j];
      if (isCellEmpty(cellData)) {
        continue;
      }
      object[keys[j]] = cellData;
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}

// Returns an Array of normalized Strings.
// Arguments:
//   - headers: Array of Strings to normalize
function normalizeHeaders(headers) {
  var keys = [];
  for (var i = 0; i < headers.length; ++i) {
    var key = normalizeHeader(headers[i]);
    if (key.length > 0) {
      keys.push(key);
    }
  }
  return keys;
}

// Normalizes a string, by removing all alphanumeric characters and using mixed case
// to separate words. The output will always start with a lower case letter.
// This function is designed to produce JavaScript object property names.
// Arguments:
//   - header: string to normalize
// Examples:
//   "First Name" -> "firstName"
//   "Market Cap (millions) -> "marketCapMillions
//   "1 number at the beginning is ignored" -> "numberAtTheBeginningIsIgnored"
function normalizeHeader(header) {
  var key = "";
  var upperCase = false;
  for (var i = 0; i < header.length; ++i) {
    var letter = header[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    if (!isAlnum(letter)) {
      continue;
    }
    if (key.length == 0 && isDigit(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  return key;
}

// Returns true if the cell where cellData was read from is empty.
// Arguments:
//   - cellData: string
function isCellEmpty(cellData) {
  return typeof(cellData) == "string" && cellData == "";
}

// Returns true if the character char is alphabetical, false otherwise.
function isAlnum(char) {
  return char >= 'A' && char <= 'Z' ||
    char >= 'a' && char <= 'z' ||
    isDigit(char);
}

// Returns true if the character char is a digit, false otherwise.
function isDigit(char) {
  return char >= '0' && char <= '9';
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// The code below is adapted from 'How to Write JSON to a Google Spreadsheet'
// See https://ctrlq.org/code/20114-json-to-google-sheets
//
//////////////////////////////////////////////////////////////////////////////////////////

function writeJSONtoSheet(sheet, json) {

  var keys = Object.keys(json).sort();
  var last = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, last).getValues()[0];
  var newCols = [];

  for (var k = 0; k < keys.length; k++) {
    if (header.indexOf(keys[k]) === -1) {
      newCols.push(keys[k]);
    }
  }

  if (newCols.length > 0) {
    sheet.insertColumnsAfter(last, newCols.length);
    sheet.getRange(1, last + 1, 1, newCols.length).setValues([newCols]);
    header = header.concat(newCols);
  }

  var row = [];

  for (var h = 0; h < header.length; h++) {
    row.push(header[h] in json ? json[header[h]] : "");
  }

  sheet.appendRow(row);

}