// racing team application form
// assumes executing from workbook
//    applications sheet gets log of applications
//    configuration sheet has configuration parameters

/**
 * Get "home page", or a requested page.
 * Expects a 'page' parameter in querystring.
 *
 * @param {event} e Event passed to doGet, with querystring
 * @returns {String/html} Html to be served
 */
function doGet(e) {
  Logger.log( 'e = ' + Utilities.jsonStringify(e) );

  // When no specific page requested, return "home page"
  if (!e.parameter.page) {
    // need to set xframe options mode - see https://code.google.com/p/google-apps-script-issues/issues/detail?id=852 #89
    var t = HtmlService.createTemplateFromFile('index');
    
  // else, use page parameter to pick an html file from the script
  } else {
    var t = HtmlService.createTemplateFromFile(e.parameter['page']);
  };

  // pull in configuration
  config = getConfig();
  t.config = config;
  t.config_json = JSON.stringify(config);

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

// get config from configuration sheet
function getConfig() {
  var wb = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = wb.getSheetByName('configuration'); 
  var configdata = getRowsData(sheet, sheet.getDataRange(), 1);

  config = {};
  for (i=1; i<configdata.length; i++) {
    var param = configdata[i];
    var thisparam = normalizeHeader(param.parameter)
    config[thisparam] = param.value;

    // special processing this script
    if (thisparam == 'open' && param.value) {
      config[thisparam] = param.value.toLowerCase();
    }
  };

  Logger.log( 'config = ' + Utilities.jsonStringify(config) );
  return config;
};

// see http://stackoverflow.com/questions/11344167/use-project-javascript-and-css-files-in-a-google-apps-script-web-app
/**
 * Get the raw content of a file, e.g., to include js or css in the template
 */
function getContent(filename) {
    return HtmlService.createTemplateFromFile(filename).getRawContent();
}


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
    
    var tolist = formdata.email.text;
    var cclist = ['librarian@steeplechasers.org','racingteam@steeplechasers.org'].join(',');
//    var cclist = ['librarian@steeplechasers.org'].join(',');
    
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
    var log = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = log.getSheetByName('applications'); 
    
    //   write data to sheet
    writeJSONtoSheet(sheet, logdata)
    
    // send email 
    GmailApp.sendEmail(tolist, 
                       '[racing-team-application] New racing team application from ' + formdata.name.text, 
                       html, 
                       {
                         cc: cclist,
                         htmlBody: html,
                         name: 'Racing Team Application',
                         from: 'librarian@steeplechasers.org',
                         replyTo: cclist,
                       });
    return 'OK';
  }
  
  catch(err) {
    try {
      GmailApp.sendEmail(
        'technology@steeplechasers.org',
        '[racing-team-application error] exception occurred on racing team application form',
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
  
  // if new file, header is empty
  if (last == 0) {
    var header = [];
  
  // otherwise, get current header
  } else {
    var header = sheet.getRange(1, 1, 1, last).getValues()[0];
  };
  
  var newCols = [];

  for (var k = 0; k < keys.length; k++) {
    if (header.indexOf(keys[k]) === -1) {
      newCols.push(keys[k]);
    }
  }

  if (newCols.length > 0) {
    sheet.insertColumns(last + 1, newCols.length);
    sheet.getRange(1, last + 1, 1, newCols.length).setValues([newCols]);
    header = header.concat(newCols);
  }

  var row = [];

  for (var h = 0; h < header.length; h++) {
    row.push(header[h] in json ? json[header[h]] : "");
  }

  sheet.appendRow(row);

}