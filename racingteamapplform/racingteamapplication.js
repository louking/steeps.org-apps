// racingteamapplication.js

      var currpagendx = 0;
      var pages = ['data', 'confirmation', 'payment-wait'];
      var confirmationfields = {};

      // form validation on submit - validates each page
      $('#form').validate({
//        debug: true,
        submitHandler: nextOrSubmitPage,
        ignore: '.ignore-validate',
        errorClass: "invalid form-error",
        errorElement: 'div',
        errorPlacement: function(error, element) {
          error.appendTo(element.parent());
        },
      });
      
      function nextOrSubmitPage(form) {
      
        console.log('nextOrSubmitPage()');
        
        // send email if at the confirmation page
        if (getCurrentPage() == 'confirmation') {
          sendEmail();
          currpagendx += 1;
          showCurrentInputPage();
        
        // go to the next page if not at the last page
        } else {
          if ($('#form').valid()) {
            currpagendx += 1;
            showCurrentInputPage();
          };
        };

        // jump to top of form - see http://stackoverflow.com/questions/3163615/how-to-scroll-html-page-to-given-anchor-using-jquery-or-javascript
        var scroll_to = document.getElementById('form');
        scroll_to.scrollIntoView();

      };
      
      function backPage() {
        if (currpagendx > 0) {
          currpagendx -= 1;
          showCurrentInputPage();      
          // jump to top of form - http://stackoverflow.com/questions/3163615/how-to-scroll-html-page-to-given-anchor-using-jquery-or-javascript
          var scroll_to = document.getElementById('form');
          scroll_to.scrollIntoView();
          
        // hmm, how did this happen?
        } else {
          alert('*** back not permitted at start page');
        };
      };
      
      function getCurrentPage() {
        return pages[currpagendx];
      };
      
      function showCurrentInputPage () {
        // only show form if configured that applications are open
        if (config.open == 'yes') {
          var currpage = getCurrentPage();
          
          // maybe we're looking for confirmation?
          if (currpage == 'confirmation') {
            setConfirmationFields();
          }
          
          // show only the current page
          $('.input').hide();
          $('#'+currpage).show();
          
          // show current races
          showRaces();
          
          // add ignore-validate class to all hidden page fields we're validating
  //        $('.validate').addClass('ignore-validate');
  //        $('#'+currpage).removeClass('ignore-validate');
          
          // show the footer for input pages
          if (currpage != 'payment-wait') {
            $('#footer').show();
          };
            
          console.log('showCurrentInputPage(): currpage='+currpage);

        // if applications are not open, show that we're closed
        } else {
          $('.input').hide();
          $('.applications-closed').show();
        }
      };

      // set confirmationfields object, and #confirmation-fields DOM element
      function setConfirmationFields() {
        $('#confirmation-fields *').remove();
        
        // get all the fields we are interested in
        // only use 1 race if new applicant
        var formfields = ['name', 'email', 'dob', 'gender', 'applntype'];
        var racefields = 'race{i}-name,race{i}-location,race{i}-date,race{i}-distance,race{i}-units,race{i}-time,race{i}-resultslink,race{i}-agegrade';
        for (racenum=1; racenum<=2; racenum++) {
          // don't save 2nd race if new application - uncomment if only one race required for new
          // if (racenum==2 && $('#applntype').val() == 'new') break;
          var theseracefields = racefields.replace(/{i}/g, racenum).split(',');
          formfields = formfields.concat(theseracefields);
        }
        formfields.push('comments'); 
        confirmationfields._keyorder = formfields;
        
        for (var i=0; i<formfields.length; i++) {
          var outfield = formfields[i];
          var formfield = outfield;
          
          // find field id
          var fieldid = '#' + formfield;
          
          // some special processing depending on tag
          var formtag = $( fieldid ).get(0).tagName; 

          // remember label used on form, replacing ' *' with null (required fields)
          // all but select start at parent, for select start at parent.parent
          var labelsearch = $( fieldid ).parent();
          if (formtag.toLowerCase() == 'select') {
            labelsearch = labelsearch.parent();
          };
          var formlabel = labelsearch.find('label').text().replace(' \*','');
          
          // set text to be the same as val, unless select
          var formval = $( fieldid ).val();
          var formtext = formval
          if (formtag.toLowerCase() == 'select') {
            formtext = $( fieldid + ' option[value=' + formval + ']').text()
          };
          
          // update confirmationfields, which will be used to send data to server
          confirmationfields[outfield] = { val : formval, text : formtext, label : formlabel, tag : formtag };
          
          // add DOM block to #confirmation-fields
          $('#confirmation-fields').append('<div class="row" id="conf-' + outfield + '"></div>');
          var row = $('#conf-' + outfield);
          row.append('<div class="col s6">' + confirmationfields[outfield].label + '</div>');
          row.append('<div class="col s6">' + confirmationfields[outfield].text + '</div>');
        };
      };
      
      // checkTimeAndSetAgeGrade
      //   race = 'race1' or 'race2'
      function checkTimeAndSetAgeGrade(race, fieldid) {
        // checkTime has side effects of checking validity of field and fixing time format to hh:mm:ss[.d*]
        if (checkTime(fieldid)) {
          setAgeGrade(race);
        }
      }
      
      // checkTime
      //   checks time format, setting fieldid class to valid or invalid
      //   if valid, assures hh:mm:ss[.d*] formatting so sheets does not misinterpret when stored later
      function checkTime(fieldid) {
        // see https://stackoverflow.com/questions/5563028/how-to-validate-with-javascript-an-input-text-with-hours-and-minutes
        var isValid = /^((([0-1]?[0-9]|2[0-4]):)?([0-5]?[0-9]):)?([0-5][0-9])(.[0-9]*)?$/.test($(fieldid).val());

        if (isValid) {
            $(fieldid).addClass('valid');
            $(fieldid).removeClass('invalid');
            
            // prepend 00: until three time parts, i.e., need hh:mm:ss
            var timeparts = $(fieldid).val().split(':');
            while (timeparts.length < 3) {
              timeparts.splice(0,0,'00');
            };
            $(fieldid).val(timeparts.join(':'));
        } else {
            $(fieldid).addClass('invalid');
            $(fieldid).removeClass('valid');
        }
        
        return isValid;
      }
      
      function showRaces() {
        // most of this function is now commented because two races are now required for both new and renewal
        // if requirement changed back to one race for new, two for renewal, uncomment

        $('.all-registrations').hide();
        $('#race1-registration').show();
        // if ($('#applntype').val() == 'renewal') {
          $('#race2-registration').show();
        // };
        // $('.all-registrations input,.all-registrations select').addClass('ignore-validate');
        // $('#race1-registration input, #race1-registration select').removeClass('ignore-validate');
        // if ($('#applntype').val() == 'renewal') {
        //   $('#race2-registration input, #race2-registration select').removeClass('ignore-validate');
        // };
      };

      // dob, racedate in yyyy-mm-dd format
      // see https://stackoverflow.com/questions/4060004/calculate-age-in-javascript
      function getAge(dob, racedate) {
        // need good dates to proceed, else return empty string
        if (!dob || !racedate) return '';
        
        // split up dob
        var dobsplit = dob.split('-');
        var dobyear = Number(dobsplit[0]);
        var dobmonth = Number(dobsplit[1]);
        var dobday = Number(dobsplit[2]);
        
        // split up racedate
        var racesplit = racedate.split('-');
        var raceyear = Number(racesplit[0]);
        var racemonth = Number(racesplit[1]);
        var raceday = Number(racesplit[2]);
        
        var age = raceyear - dobyear;
        if (racemonth < dobmonth || (racemonth == dobmonth && raceday < dobday)) {
          age--;
        }
        
        return age;
      }
      

      function getFormData() {
        return confirmationfields;
      };
      
      function sendEmail() {
        var formdata = getFormData();
        console.log('sendEmail()');
        google.script.run
          .withSuccessHandler(showEmailSuccess)
          .logAndSendEmail(formdata);
      }

      function showEmailSuccess(e) {
        console.log('showSuccess('+e+')');
        if (e === "OK") { 
          $('.input').hide();
          $('#success').show();
        } else {
          showError(e);
        }
      }

      function showError(e) {
        $('#error-notification').append('<p style="font-style:italic;">Error details: '+e+'</p>');
        $('#error-notification').show();
      }

      // setAgeGrade
      //   race = 'race1' or 'race2' or undefined (default both)
      function setAgeGrade( race ) {
        if ( race == undefined ) {
          races = [ 'race1', 'race2' ];
        } else {
          races = [ race ];
        };
        
        // query age grade for desired races
        for (i=0; i<races.length; i++) {
            var thisrace = races[i];
            var age    = getAge ($('#dob').val(), $('#' + thisrace + '-date').val());
            var gender = $('#gender').val();
            var dist   = $('#' + thisrace + '-distance').val();
            var units  = $( '#' + thisrace + '-units' ).val()
            var time   = $('#' + thisrace + '-time').val();
            
            updateAgeGrade(thisrace, age, gender, dist, units, time);
          }
      }
      
      // updateAgeGrade
      //   race = 'race1' or 'race2'
      //   age - integer age on race date
      //   gender - 'M' or 'F'
      //   dist - float distance
      //   units - 'miles' or 'km'
      //   time - [[hh:]mm:]ss[.ddd]
      function updateAgeGrade(race, age, gender, dist, units, time) {
        console.log('updateAgeGrade('+race+','+age+','+gender+','+dist+','+units+','+time+')');
        // noop if any of the parameters are missing
        if (!age || !gender || !dist || !units || !time) return;
        
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
        var params = $.param({
          age      : age,
          gender   : gender,
          distance : dist,
          time     : time,
        });
        $.getJSON('https://scoretility.com/_agegrade?'+params, function ( data ) {
          if (data.status == 'success') {
            $( '#' + race + '-agegrade').val( data.agpercent.toFixed(2) );
          } else {
            // pull off the first bit of the details, which is the error type
            var errordetail = data.details.split(',').slice(1).join(',');
            $( '#' + race + '-agegrade').val( 'ERROR: in ' + data.errorfield + '. Details: ' + errordetail );
          };
        });
      }

    // see https://github.com/Dogfalo/materialize/issues/3216, https://jsfiddle.net/louking/9d6n4su1/
    function checkDate(dateid) {
      console.log('checkDate("'+dateid+'")');
      console.log('$("'+dateid+'").val() = ' + $(dateid).val());
      if ($(dateid).val() == '') {
        $(dateid).addClass('invalid');
      } else {
        $(dateid).removeClass('invalid');
      }
   };
  
  // set up date fields
  $('#dob').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 100,   // Creates a dropdown of 100 years to control year
    max: true,          // today
    format: 'yyyy-mm-dd',
    formatSubmit: 'yyyy-mm-dd',
  });
  $('#dob').change(function() {
    checkDate('#dob');
    setAgeGrade();
  });
  $('#race1-date').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 2,     // Creates a dropdown of 2 years to control year
    max: true,          // today
    format: 'yyyy-mm-dd',
    formatSubmit: 'yyyy-mm-dd',
    //onSet: setAgeGrade('race1'),
  });
  $('#race1-date').change(function() {
    checkDate('#race1-date');
    setAgeGrade('race1')
  });
  $('#race2-date').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 2,     // Creates a dropdown of 2 years to control year
    max: true,          // today
    format: 'yyyy-mm-dd',
    formatSubmit: 'yyyy-mm-dd',
    //onSet: setAgeGrade('race2'),
  });
  $('#race2-date').change(function() {
    checkDate('#race2-date');
    setAgeGrade('race2')
  });

  $(document).ready(function() {
    $('select').material_select();
    
    // this is needed to add ignore-validate classes to hidden fields
    showCurrentInputPage();
  });

