// this script is embedded in a spreadsheet which must include the following headings
//    Location - either address or lat, lon
//    Icon - icon type, Business, Rest Room, Drinking Fountain
//    Business Phone
//    Business Type
//    Comment

// see https://developers.google.com/maps/documentation/javascript/libraries
// see https://developers.google.com/maps/documentation/javascript/adding-a-google-map
// see https://developers.google.com/maps/documentation/javascript/importing_data#data
// see https://tools.ietf.org/html/rfc7946 [GeoJson]

// main get function
function doGet(event) {
  var parameters = event.parameters;

  // check for error
  if (!parameters.view) {
    return HtmlService.createHtmlOutputFromFile('error.html').setTitle("Error Encountered");

  // return map and list
  } else if (parameters.view == 'mapandlist') {
    var template = HtmlService.createTemplateFromFile('mapandlist');
    var features = getGeoJson().features
    template.features = features;
    template.jsonfeatures = JSON.stringify(features);
    // need to set xframe options mode - see https://code.google.com/p/google-apps-script-issues/issues/detail?id=852 #89
    var html = template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle("Runner Friendly Businesses");
    return html;
  
  // return map
  } else if (parameters.view == 'map') {
    var template = HtmlService.createTemplateFromFile('map');
    var features = getGeoJson().features
    template.features = features;
    template.jsonfeatures = JSON.stringify(features);
    // need to set xframe options mode - see https://code.google.com/p/google-apps-script-issues/issues/detail?id=852 #89
    var html = template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle("Runner Friendly Business Map");
    return html;
  

  // return list
  } else if (parameters.view == 'list') {
    var template = HtmlService.createTemplateFromFile('list');
    var features = getGeoJson().features
    template.features = features;
    template.jsonfeatures = JSON.stringify(features);
    // need to set xframe options mode - see https://code.google.com/p/google-apps-script-issues/issues/detail?id=852 #89
    var html = template.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setTitle("Runner Friendly Business List");
    return html;
    
  // return GeoJson
  } else if (parameters.view == 'json') {    
    geo = getGeoJson();
    return ContentService.createTextOutput(JSON.stringify(geo)).setMimeType(ContentService.MimeType.JSON);

  // bad view parameter
  } else {
    return HtmlService.createHtmlOutputFromFile('error.html').setTitle("Error Encountered");
  }
}

// retrieve GeoJson from database
function getGeoJson() {
  // hardcoded file id
  var fileid = '1pmUuqbIq01q0qDRqUScVYFEy7iebtvvo931vfneBbLo';
  var geo = 
      { type : 'FeatureCollection',
       features : [],
      };
  
  // retrieve the data in the spreadsheet and add to features list and icons object
  var ss = SpreadsheetApp.openById(fileid);
  var db = ss.getSheetByName('database');
  var dbrange = db.getRange(2, 1, db.getMaxRows() - 1, db.getMaxColumns());
  var objects = getRowsData(db, dbrange);

  var icondb = ss.getSheetByName('icons');
  var iconrange = icondb.getRange(2, 1, icondb.getMaxRows() - 1, icondb.getMaxColumns());
  var iconrows = getRowsData(icondb, iconrange);
  var icons = {};

  // add icon descriptors
  for (var i=0; i < iconrows.length; ++i) {
    // get a row object
    var iconattrs = iconrows[i];
    icons[iconattrs.icon] = iconattrs;
  }
  
  // add points from database
  for (var i = 0; i < objects.length; ++i) {
    // Get a row object
    var point = objects[i];
    var iconattrs = icons[point.icon];

    // skip rows which are being updated -- Icon needs to be set last
    if (!point.icon) continue;
    
    // if in list, may need to check a point attr to decide to include
    if (iconattrs.inList) {
      if (iconattrs.checkAttr) {
        if (!point[iconattrs.checkAttr]) continue;
      }
    };
    
    // for street locations parseFloat(city) == NaN
    var streetloc, geocode, location;
    if (isNaN(parseFloat(point.city))) {
      streetloc = true;
      geocode = Maps.newGeocoder().geocode(point.location);
      location = geocode.results[0].geometry.location; // assuming first match is the right one is probably ok
      
    // if city is a number, lat, lng is in street1, city
    } else {
      streetloc = false;
      location = { lat: point.street1, lng: point.city };
    }
      
    var thisgeo = {
      type : 'Feature',
      geometry : {
        type : 'Point',
        coordinates : [location.lat, location.lng],
        properties: {
          name : point.businessName,
          icon : point.icon,
          iconattrs : iconattrs,
          comment : point.comment,
          type : point.businessType,
          phone : point.businessPhone,
          street : point.street1,
          city : point.city,
          state : point.state,
        }
      }
    }
    geo.features.push( thisgeo );
  }
  
  // case insensitive string sort by name field
  // see http://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects
  geo.features.sort(function(a, b) {
    if (!a.geometry.properties.name) a.geometry.properties.name = '';
    if (!b.geometry.properties.name) b.geometry.properties.name = '';
    return a.geometry.properties.name.localeCompare(b.geometry.properties.name);
  });
  
  return geo;
}

//////////////////////////////////////////////////////////////////////////////////////////
//
// The code below is reused from https://developers.google.com/apps-script/articles/mail_merge
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
