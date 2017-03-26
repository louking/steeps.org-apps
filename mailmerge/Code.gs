// onOpen() and setSheet() adapted from https://developers.google.com/apps-script/guides/dialogs onOpen() and showPrompt()
function onOpen() {
  DocumentApp.getUi() // Or DocumentApp or FormApp.
      .createMenu('Mail Merge')
      .addItem('Send test message', 'testEmail')
      .addItem('Send merged emails', 'sendEmails')
      .addItem('Select merge sheet...', 'setSheet')
      .addItem('Set subject...', 'setSubject')
      .addItem('Set from email addr...', 'setFromEmail')
      .addItem('Set from email name...', 'setFromName')
      .addToUi();
}

function setSheet() {
  promptAndUpdate('Enter URL of sheet to merge with (open sheet, click File>Share>Advanced>copy link, then paste here)', 'mergesheet');
}

function setSubject() {
   promptAndUpdate('Enter the subject you want to use with this email blast', 'subject');
}

function setFromEmail() {
  promptAndUpdate('Enter the email address you want this mail blast to be from', 'fromemail');
}

function setFromName() {
  promptAndUpdate('Enter the name you want this email blast to be from', 'fromname');
}

function testEmail() {
  // get plain text and html versions
  var bodytext = getBodyText();
  var html = getBodyHtml();

  // send email to self
  var toaddr = Session.getActiveUser().getEmail();
  
  // get the subject and from address
  var docprops = PropertiesService.getDocumentProperties();
  var subject = docprops.getProperty('subject');
  var fromemail = docprops.getProperty('fromemail');
  var fromname = docprops.getProperty('fromname');
    
  // send the email
  GmailApp.sendEmail(
    toaddr, subject, bodytext,
    {
      from:fromemail,
      htmlBody: html,
      name: fromname,
    }
  );
}

function sendEmails() {
  var docprops = PropertiesService.getDocumentProperties();
  var sheetsurl = docprops.getProperty('mergesheet');
  var ss = SpreadsheetApp.openByUrl(sheetsurl);
  var dataSheet = ss.getSheets()[0];
  var dataRange = dataSheet.getRange(2, 1, dataSheet.getMaxRows() - 1, dataSheet.getMaxColumns());
  
  // get text and html templates
  var textTemplate = getBodyText();
  var htmlTemplate = getBodyHtml();  

  // get the subject and from address
  var docprops = PropertiesService.getDocumentProperties();
  var subjectTemplate = docprops.getProperty('subject');
  var fromemail = docprops.getProperty('fromemail');
  var fromname = docprops.getProperty('fromname');
    
  // Create one JavaScript object per row of data.
  objects = getRowsData(dataSheet, dataRange);

  // For every row object, create a personalized email from a template and send
  // it to the appropriate person.
  for (var i = 0; i < objects.length; ++i) {
    // Get a row object
    var rowData = objects[i];

    // Generate a personalized email.
    // Given a template string, replace markers (for instance ${First Name}) with
    // the corresponding value in a row object (for instance rowData.firstName).
    var emailText = fillInTemplateFromObject(textTemplate, rowData);
    var emailHtml = fillInTemplateFromObject(htmlTemplate, rowData);
    var emailSubject = fillInTemplateFromObject(subjectTemplate, rowData);
    Logger.log(emailHtml);

    // send the email
    GmailApp.sendEmail(
      rowData.email, emailSubject, emailText,
      {
        from:fromemail,
        htmlBody: emailHtml,
        name: fromname,
      }
    );
  } 
}


function getBodyText() {
  var thisdoc = DocumentApp.getActiveDocument();
  return thisdoc.getBody().getText();
}

function getBodyHtml() {
  var thisdoc = DocumentApp.getActiveDocument();
  
  // get html version
  // url fetch code from http://stackoverflow.com/questions/14663852/get-google-document-as-html
  var id = thisdoc.getId() ;
  //var forDriveScope = DriveApp.getStorageUsed(); //needed to get Drive Scope requested -- NOTE: really wasn't needed
  var url = "https://docs.google.com/feeds/download/documents/export/Export?id="+id+"&exportFormat=html";
  var param = {
    method      : "get",
    headers     : {"Authorization": "Bearer " + ScriptApp.getOAuthToken()},
    muteHttpExceptions:true,
  };
  var html = UrlFetchApp.fetch(url,param).getContentText();
  
  // decode the html until it doesn't have any coding anymore
  var lasthtml = html;
  html = decodeURIComponent(lasthtml);
  while (html != lasthtml) {
    lasthtml = html;
    html = decodeURIComponent(lasthtml);
  };
  
  // get rid of google.com wrappers around links
  googwrap = /("https:\/\/www.google.com\/url\?q=)((?:(?!&amp;).)*)(&amp;((?:(?!").)*)")/g;
  html = html.replace(googwrap, '"$2"');

  return html;
}

function getPrompt(prompt, key) {
  var retprompt = prompt;
  var docprops = PropertiesService.getDocumentProperties();
  
  var currentvalue = docprops.getProperty(key);
  if (currentvalue) {
    retprompt += '\nCurrently "' + currentvalue + '"';
  };
  
  return retprompt
};

// set document property if value is set
// if value is "" or null, delete document property
function setProperty(key, value) {
  var docprops = PropertiesService.getDocumentProperties();

  // if there's something there
  if (value != "" && value != null) {
    docprops.setProperty(key, value);
  
  // otherwise delete
  } else {
    docprops.deleteProperty(key);
  }
};

// prompt user and update property 
function promptAndUpdate(prompt, key) {
  var ui = DocumentApp.getUi(); 

  var result = ui.prompt(
      getPrompt(prompt, key),
      ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  var text = result.getResponseText();
  
  // User clicked "OK".
  if (button == ui.Button.OK) {
    setProperty(key, text);
  
  // User clicked "Cancel" or X in title bar
  } else if ( (button == ui.Button.CANCEL) || (button == ui.Button.CLOSE) ){
    // do nothing
  }  
};

// Replaces markers in a template string with values define in a JavaScript data object.
// Arguments:
//   - template: string containing markers, for instance ${Column name}
//   - data: JavaScript object with values to that will replace markers. For instance
//           data.columnName will replace marker ${Column name}
// Returns a string without markers. If no data is found to replace a marker, it is
// simply removed.
function fillInTemplateFromObject(template, data) {
  var email = template;
  // Search for all the variables to be replaced, for instance ${Column name}
  var templateVars = template.match(/\$\{[^\}]+\}/g);

  // Replace variables from the template with the actual values from the data object.
  // If no value is available, replace with the empty string.
  // skip all this if no match found for marker
  if ( templateVars != null ) {
    for (var i = 0; i < templateVars.length; ++i) {
      // normalizeHeader ignores ${"} so we can call it directly here.
      var variableData = data[normalizeHeader(templateVars[i])];
      email = email.replace(templateVars[i], variableData || "");
    }
  }
  
  return email;
}





//////////////////////////////////////////////////////////////////////////////////////////
//
// The code below is reused from the 'Reading Spreadsheet data using JavaScript Objects'
// tutorial.
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
