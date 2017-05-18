/*

    from http://www.labnol.org/internet/receive-files-in-google-drive/19697/
      
*/

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('forms.html').setTitle("FSRC Memorial Scholarship Application");
}


var dropbox = "FSRC-Memorial-Scholarship-Applications";

function uploadFileToGoogleDrive(data, file, name, email) {
  
  try {
    
    var folder, 
        applicantfoldername,
        applicantfolders,
        applicantfolder,
        folders = DriveApp.getFoldersByName(dropbox);
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(dropbox);
    }
    
 
    var contentType = data.substring(5,data.indexOf(';'));
    var bytes = Utilities.base64Decode(data.substr(data.indexOf('base64,')+7));
    var blob = Utilities.newBlob(bytes, contentType, file);
    
    /* if folder already exists, use it, otherwise create */
    applicantfoldername = [name, email].join(" ");
    applicantfolders = folder.getFoldersByName(applicantfoldername);
    if (applicantfolders.hasNext()) {
      applicantfolder = applicantfolders.next();
    } else {
      applicantfolder = folder.createFolder(applicantfoldername);
    }
    var appfile = applicantfolder.createFile(blob);
    
    return "OK";
    
  } catch (f) {
    return f.toString();
  }
  
}

function sendEmail(name, email) {
  try {
    var folder, 
        folders,
        applicantfoldername,
        applicantfolders,
        applicantfolder;

    folders = DriveApp.getFoldersByName(dropbox);
    folder = folders.next();
    
    applicantfoldername = [name, email].join(" ");
    applicantfolders = folder.getFoldersByName(applicantfoldername);
    applicantfolder = applicantfolders.next();
    
    var attachments = [];
    var files = applicantfolder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      attachments.push(file.getBlob());
    };
    
    var body = "Application received from " + name + " " + email + "\n\nSee " + applicantfolder.getUrl();
    GmailApp.sendEmail("memorialscholarship@steeplechasers.org", "[FSRC Memorial Scholarship] Application from " + name, body, 
                       {
                         /* name : "FSRC Memorial Scholarship Application", */
                         from : "memorialscholarship@steeplechasers.org",
                         /* attachments : attachments */
                       } );

    return "OK";
    
  } catch (f) {
    return f.toString();
  }
}