// racingteaminfo.js

      var currpagendx = 0;
      var pages = ['data', 'confirmation', 'submit-wait'];
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
        var currpage = getCurrentPage();
        
        // maybe we're looking for confirmation?
        if (currpage == 'confirmation') {
          setConfirmationFields();
        }
        
        // show only the current page
        $('.input').hide();
        $('#'+currpage).show();
        
        // show current races
        showRaceOrVolunteer();
        
        // add ignore-validate class to all hidden page fields we're validating
//        $('.validate').addClass('ignore-validate');
//        $('#'+currpage).removeClass('ignore-validate');
        
        // show the footer for input pages
        if (currpage != 'submit-wait') {
          $('#footer').show();
        };
          
        console.log('showCurrentInputPage(): currpage='+currpage);
      };

      // set confirmationfields object, and #confirmation-fields DOM element
      function setConfirmationFields() {
        $('#confirmation-fields *').remove();
        
        // get all the fields we are interested in
        var commonfields = ['common-name', 'common-eventname', 'common-eventdate', 'common-infotype'];
        var resultfields = ['raceresult-distance', 'raceresult-units', 'raceresult-time', 'raceresult-age', 'raceresult-agegrade', 'raceresult-awards'];
        var volunteerfields = ['volunteer-hours', 'volunteer-comments'];
        
        var formfields = [].concat(commonfields);
        if ($('#common-infotype').val() == 'raceresult') {
          formfields = formfields.concat(resultfields);
        } else {
          formfields = formfields.concat(volunteerfields);
        }
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
            formtext = $( fieldid + ' option[value="' + formval + '"]').text()
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
      function checkTimeAndSetAgeGrade() {
        // checkTime has side effects of checking validity of field and fixing time format to hh:mm:ss[.d*]
        if (checkTime("#raceresult-time")) {
          setAgeGrade();
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

            // prepend 0 to short timeparts
            for (var i=0; i<timeparts.length; i++) {
              while (timeparts[i].length < 2) {
                timeparts[i] = '0'.concat(timeparts[i]);
              }
            }

            $(fieldid).val(timeparts.join(':'));
        } else {
            $(fieldid).addClass('invalid');
            $(fieldid).removeClass('valid');
        }
        
        return isValid;
      }
      
      function showRaceOrVolunteer() {
        $('.all-questions').hide();
        $('.all-questions input,.all-questions select').addClass('ignore-validate');
        if ($('#common-infotype').val() == 'raceresult') {
          $('.raceresult-wrapper').show();
          $('.raceresult-wrapper input, .raceresult-wrapper select').removeClass('ignore-validate');
          // disable next button, enabled in show_age_grade()
          $("#next-button").attr("disabled", "disabled");
        };
        if ($('#common-infotype').val() == 'volunteer') {
          $('.volunteer-wrapper').show();
          $('.volunteer-wrapper input, .volunteer-wrapper select').removeClass('ignore-validate');
          // volunteering, NEXT is enabled
          $("#next-button").removeAttr("disabled");
        };
      };

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

  // setAgeAndAgeGrade
  function setAgeAndAgeGrade() {
    setAge();
    setAgeGrade();
  };

  // setAge
  function setAge( ) {
    // query and set age grade
    var name     = $('#common-name').val();
    var racedate = $('#common-eventdate').val();
    
    updateAge(name, racedate);
  }

  // updateAge
  //   name - team member name
  //   racedate - date of race
  function updateAge(name, racedate) {
    console.log('updateAge('+name+','+racedate+')');
    // noop if any of the parameters are missing
    if ( !name || !racedate ) return;
    
    // get age grade from back end
    google.script.run
      .withSuccessHandler(showAge)
      .rpcGetAge(name, racedate);
  }

  // handle result of rpcGetAgeGrade
  function showAge(age) {
    $( '#raceresult-age').val( age );
  };

  // setAgeGrade
  function setAgeGrade( ) {
    // query and set age grade
    var name     = $('#common-name').val();
    var racedate = $('#common-eventdate').val();
    var dist     = $('#raceresult-distance').val();
    var units    = $('#raceresult-units' ).val()
    var time     = $('#raceresult-time').val();
    
    updateAgeGrade(name, racedate, dist, units, time);
  }
  
  // updateAgeGrade
  //   name - team member name
  //   racedate - date of race
  //   dist - float distance
  //   units - 'miles' or 'km'
  //   time - [[hh:]mm:]ss[.ddd]
  function updateAgeGrade(name, racedate, dist, units, time) {
    console.log('updateAgeGrade('+name+','+racedate+','+dist+','+units+','+time+')');

    // disable next button, enabled in show_age_grade()
    // see https://forum.jquery.com/topic/disable-enable-button-in-form
    $("#next-button").attr("disabled", "disabled");

    // noop if any of the parameters are missing
    if ( !name || !racedate || !dist || !units || !time ) return;
    
    // get age grade from back end
    google.script.run
      .withSuccessHandler(showAgeGrade)
      .rpcGetAgeGrade(name, racedate, dist, units, time);
  }

  // handle result of rpcGetAgeGrade
  function showAgeGrade(data) {
    data = JSON.parse(data);
    if (data.status == 'success') {
      $( '#raceresult-agegrade').val( data.agpercent.toFixed(2) );
      // good age grade received, NEXT is re-enabled
      $("#next-button").removeAttr("disabled");
    } else {
      // pull off the first bit of the details, which is the error type
      var errordetail = data.details.split(',').slice(1).join(',');
      $( '#raceresult-agegrade').val( 'ERROR: in ' + data.errorfield + '. Details: ' + errordetail );
    };      
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
  
  // set up date field
  $('#common-eventdate').pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 2,     // Creates a dropdown of 2 years to control year
    max: true,          // today
    format: 'yyyy-mm-dd',
    formatSubmit: 'yyyy-mm-dd',
  });
  
  $('#common-eventdate').change(function() {
    checkDate('#common-eventdate');
    setAgeGrade()
  });

  $(document).ready(function() {
    $('select').material_select();
    
    // this is needed to add ignore-validate classes to hidden fields
    showCurrentInputPage();

    // disable next button initially, enabled in show_age_grade()
    // see https://forum.jquery.com/topic/disable-enable-button-in-form
    $("#next-button").attr("disabled", "disabled");
  });

