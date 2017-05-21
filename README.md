# steeps.org-apps
google apps scripts stored on steeplechasers.org

Each directory represents a single google apps script.

To reuse the scripts under the directories, you need to create a google apps script, 
and then create file within the script for each file in the directory.

For .js and .css files, the filename within the script will have .html after the given filename.

Best workflow

* edit script file(s) within git directory using editor of choice
* for each file which changed
  * copy all from editor of choice
  * select all in google apps script file, paste (overwrite complete file)

To embed application in steeplechasers.org page, edit page using View Source and use similar to 
    <iframe src="https://script.google.com/macros/s/AKfycbzsOhGsmQwZvzVMHG-3p9QzrBYP9_ju3yxqu4w793EQRYQXNalN/exec" scrolling="yes" width="800" height="1500"> </iframe>

    also see http://stackoverflow.com/questions/5867985/full-screen-iframe-with-a-height-of-100
             http://stackoverflow.com/questions/5867985/full-screen-iframe-with-a-height-of-100/27853830#27853830
    or       http://davidjbradshaw.github.io/iframe-resizer/
    
    need .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) after evaluate()
        see see https://code.google.com/p/google-apps-script-issues/issues/detail?id=852 #89

Google APIs
    May need to create project and credentials at https://console.developers.google.com/apis/credentials
    May need to enable API at https://console.developers.google.com/apis/dashboard

