// racing team information form
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
var config;

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

  // fill in names for select
  var team = getTeam();
  var names = [];
  for (name in team) {
    if (team.hasOwnProperty(name)) {
      names.push(name);
    }
  }
  t.names = names;

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

/**
 * Get the team information
 */
function getTeam() {
  var wb = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = wb.getSheetByName('team');
  var teamdata = getRowsData(sheet, sheet.getDataRange(), 1);

  team = {}
  for (var i=1; i<teamdata.length; i++) {
    var thismember = teamdata[i];
    var name = thismember.name;
    team[name] = {};
    for (k in thismember) {
      if (thismember.hasOwnProperty(k)) {
        team[name][k] = thismember[k];
      }
    }
  }

  return team;
}

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
    
    var team = getTeam();
    var name = formdata['common-name'].val;
    var tolist = team[name].email;
    var cclist = ['racingteam@steeplechasers.org','results@steeplechasers.org'].join(',');
    var from = 'racingteam@steeplechasers.org';
//    var cclist = ['librarian@steeplechasers.org'].join(',');
    
    // log time and formdata from request
    //   collect time and formdata
    var dt = Date();
    var logdata = { timestamp : dt }
    var infotype = formdata['common-infotype'].val;
    for (var i=0; i<formdata._keyorder.length; i++) {
      field = formdata._keyorder[i];
      // get field type -- fields are like common-name or raceresult-time
      fieldtype = field.split('-')[0];
      fieldattr = field.split('-')[1];
      // pick up all the fields which were sent except infotype, which will be delineated later by selecting the right sheet
      if (field != 'common-infotype') {
        value = formdata[field].text;
        logdata[fieldattr] = value;
      }
    };
    
    //   open appropriate sheet
    var log = SpreadsheetApp.getActiveSpreadsheet();
    if (infotype == 'raceresult') {
      var sheet = log.getSheetByName('raceresults'); 
    } else {
      var sheet = log.getSheetByName('volunteering'); 
    }
    
    //   write data to sheet
    writeJSONtoSheet(sheet, logdata)

    // send email 
    GmailApp.sendEmail(tolist, 
                       '[racing-team-info] New racing team information from ' + name, 
                       html, 
                       {
                         cc: cclist,
                         htmlBody: html,
                         name: 'Racing Team Information Submission',
                         from: from,
                         replyTo: cclist,
                       });
    return 'OK';
  }
  
  catch(err) {
    try {
      GmailApp.sendEmail(
        'technology@steeplechasers.org',
        '[racing-team-info error] exception occurred on racing team information form',
        'Error details: ' + err.message
      );
    }
    
    finally {
      return err.message;
    }
  };
  
};

// dob, racedate in yyyy-mm-dd format
// see https://stackoverflow.com/questions/4060004/calculate-age-in-javascript
function getAge(dob, racedate) {
  // need good dates to proceed, else return empty string
  if (!dob || !racedate) return '';
  
  // split up dob
  Logger.log('dob-'+JSON.stringify(dob));
  var dobsplit = dob.split('-');
  var dobyear = Number(dobsplit[0]);
  var dobmonth = Number(dobsplit[1]);
  var dobday = Number(dobsplit[2]);
  
  // split up racedate
  var racesplit = racedate.split('-');
  var raceyear = Number(racesplit[0]);
  var racemonth = Number(racesplit[1]);
  var raceday = Number(racesplit[2]);
  
  // start with this
  var age = raceyear - dobyear;

  // if birthday hasn't happened yet this year, subtract one
  if (racemonth < dobmonth || (racemonth == dobmonth && raceday < dobday)) {
    age--;
  }
  
  return age;
}
      

// emulate $.params
function querystring( obj ) {
  var querystring = "";
  for (k in obj) {
    if (obj.hasOwnProperty(k)) {
      querystring += k + '=' + obj[k] + '&'
    }
  }

  // lose the last ampersand
  if (querystring.length > 0) {
    return querystring.slice(0,-1)

  } else {
    return ""
  }
};

// get age on race date (rpc)
function rpcGetAge ( name, racedate ) {
  var team = getTeam();
  var age = getAge( team[name].dateOfBirth.yyyymmdd(), racedate );

  return age
};

// get age grade for team member (rpc)
function rpcGetAgeGrade( name, racedate, dist, units, time ) {
  var team = getTeam();
  var age = getAge( team[name].dateOfBirth.yyyymmdd(), racedate );

  // convert marathon and half marathon to exact miles
  if ( (dist == 26.2 && units == 'miles') || (dist == 42.2 && units == 'km') ) {
    dist = 26.2188;
  
  } else if ( (dist == 13.1 && units == 'miles') || (dist == 21.1 && units == 'km') ) {
    dist = 13.1094;
  
  // convert dist to miles
  } else if (units == 'km') {
    dist = dist / 1.609344;  // convert to miles
  }

  // convert parameters to query string
  var theseparams = querystring ({
    age      : age,
    gender   : team[name].gender[0].toUpperCase(),  // use only first letter in case someone types 'male'
    distance : dist,
    time     : time,
  });

  // get age grade data
  // see https://ctrlq.org/code/19871-get-post-requests-google-script
  var response = UrlFetchApp.fetch('https://scoretility.com/_agegrade?'+theseparams);
  if (response.getResponseCode() == 200) {
    var jsonstring = response.getContentText();
    return jsonstring;

  } else {
    // need ERROR, to emulate error string from scoretility
    return JSON.stringify({status:'fail', errorfield:'server response', errordetail:'ERROR,bad response from agegrade fetch'});
  }
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

// adapted from https://stackoverflow.com/questions/3066586/get-string-in-yyyymmdd-format-from-js-date-object
// use:
//    var date = new Date();
//    date.yyyymmdd();
Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('-');
};
