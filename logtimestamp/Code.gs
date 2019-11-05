function onOpen() {
  var ui = DocumentApp.getUi();
  // Or FormApp or SpreadsheetApp.
  ui.createMenu('Timestamp')
      .addItem('Insert Timestamp', 'insertTimestamp')
      .addToUi();

}

function insertTimestamp() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  if (cursor) {
      // Attempt to insert text at the cursor position. If insertion returns null,
      // then the cursor's containing element doesn't allow text insertions.
      var d = new Date();
      var dd = d.getDate();
      dd = pad(dd, 2)
      var mm = d.getMonth() + 1; //Months are zero based
      mm = pad(mm, 2)
      var yyyy = d.getFullYear();
      // var date = dd + "-" + mm + "-" + yyyy;
      // var date = yyyy + '-' + mm + '-' + dd;
      // https://stackoverflow.com/questions/29103235/timestamp-date-time-format-apps-script-format-date-and-time
      var timeZone = Session.getScriptTimeZone();
      var date = Utilities.formatDate(d, timeZone, 'yyyy-MM-dd HH:mm ');
      var element = cursor.insertText(date);
      if (element) {
        element.setFontFamily('Courier New');
        doc.setCursor(doc.newPosition(element, date.length));
      } else {
        DocumentApp.getUi().alert('Cannot insert text at this cursor location.');
      }
    } else {
      DocumentApp.getUi().alert('Cannot find a cursor in the document.');
  }

}
function pad (str, max) {
  str = str.toString();
  return str.length < max ? pad("0" + str, max) : str;
}
