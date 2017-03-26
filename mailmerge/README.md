This code gets incorporated into a goggle doc file, which has the text of the email to be merged. The 
file can have markers like ${colName} which will be taken from a merge sheet with "Col Name" as the column
header. 

For best results, set File > Page setup to have all 0 margins.

When the doc file is opened, a Mail Merge menu is created. This menu has configuration items as follows

* Select merge sheet - google sheet which has the fields to be merged into the markers
* Set subject - subject which will be sent in the email, can have markers
* Set from email address - email address to be used as from address -- sender must have this as an alias - see https://support.google.com/mail/answer/22370?hl=en
* Set from name - name to be used in the from address 

