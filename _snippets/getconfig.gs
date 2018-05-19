// *******************************************************
// the following requires getrowsdata.gs snippet
// *******************************************************

// get config from configuration sheet
function getConfig(sheetname) {
  var wb = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = wb.getSheetByName(sheetname); 
  var configdata = getRowsData(sheet, sheet.getDataRange(), 1);

  config = {};
  for (i=1; i<configdata.length; i++) {
    var param = configdata[i];
    var thisparam = normalizeHeader(param.parameter)
    config[thisparam] = param.value;
  };

  Logger.log( 'config = ' + Utilities.jsonStringify(config) );
  return config;
};

