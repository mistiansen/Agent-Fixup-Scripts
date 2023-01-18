function generateSessionId(length) {
    let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$*.';
    let sessionId = '';
    for (var i = 0; i < length; i++) {
        sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sessionId;
}

function setBuyerSessionId() {
    // let sessionId = Math.random().toString(36).substr(2, 12);
    let sessionId = generateSessionId(20);
    console.log('Storing sessionId ' + sessionId);
    $("#session-id-storage").attr("value", sessionId);
    return sessionId;
}

$(document).ready(function () {
    let queryString = window.location.search;
    console.log(queryString);
    let params = new URLSearchParams(queryString);
    console.log(params);

    // NOTE that there should be no "address" for buyers (maybe just sellers initially)
    let address = params.get("address");
    console.log('Here is the address: ' + address);

    // UPDATE ADDRESS DISPLAY AND STORAGE FIELDS
    $(".address-display").html(address);
    $("#address-storage").attr("value", address); // NOTE - consider removing    

    // CITY / STATE (GENERALLY FOR BUYERS)
    let city = params.get("city"); // either do this or just pull from the page path
    let state = params.get("state");
    $("#city-storage").attr("value", city);
    $("#state-storage").attr("value", state);
    console.log('Here are city, state: ' + city + ' ' + state);

    // STORE THE VISITOR TYPE (buyer vs. seller vs. seller-buyer)
    let visitorType = params.get("visitor");
    $("#visitor-type-storage").attr("value", visitorType);
    console.log('Here is the visitor type: ' + visitorType);

    // IT'S possible that we should query with the source site name here to ensure safety
    let destination = "6299a06cd8258300049a1a1a"; // our agentId
    $("#destination-storage").attr("value", destination);
    $("#agent-id-storage").attr("value", destination);

    // HIDE UNUSED LOADERS
    $("#market-analysis-loader").show();
    // $('#updating-home-details-loader').removeClass('hide');
    $('#updating-home-details-loader').hide();

    if ((visitorType == "seller" || visitorType == "seller-buyer") && address) {
        validateAddress(address); // THIS may be for both seller and seller-buyer, but the logic will eventually deviate based on type
        $("#seller-form").show();
    } else if (visitorType == "buyer") { // the problem here is that without validateAddress, we don't call getPropertyInfo then pull a sessionId
        setBuyerSessionId(); // we aren't validating an address or pulling property info, so there is no sessionId from the backend
        $("#buyer-form").show();
    } else if (address) {
        validateAddress(address); // DEFAULT BEHAVIOR if given an address? Proceed to seller form?
    } else {
        // SHOW SOME CATCHALL? PROMPT FOR ADDRESS?
        console.log("Don't have an address and don't know the visitorType");
    }

    // history.replaceState({}, null, "agents"); // UNCOMMENT TO HIDE QUERY STRING
    setTimeout(function () { $("#market-analysis-loader").hide(); }, 2500);
});

function getSingleRadioSelection(name) {
    /* GET the selected value of a single radio element */
    let checkedRadio = document.querySelector('input[name="' + name + '"]:checked');
    let checkedValue;
    if (checkedRadio != null) {
        checkedValue = checkedRadio.value;
    } else {
        // checkedValue = "None given";
        checkedValue = "";
    }
    console.log('Got this checkedValue: ' + checkedValue);
    return checkedValue;
}

function getSpecifiedRadioSelections(checkRadioNames, sessionInfo) {
    /* GET the selected values of ALL SPECIFIED radio elements */
    for (const checkRadioName of checkRadioNames) {
        console.log('Checking radio selections for ' + checkRadioName);
        let selection = getSingleRadioSelection(checkRadioName);
        sessionInfo[checkRadioName] = selection;
    }
    return sessionInfo;
}

function getGeneralSessionInfo() {
    let agentId = $("#agent-id-storage").val();
    let sessionId = $("#session-id-storage").val();
    let visitorType = $("#visitor-type-storage").val();
    console.log('Got this sessionId from storage: ' + sessionId);

    let sessionInfo = {
        "site": "agentfixup.com",
        "agentId": agentId,
        "sessionId": sessionId,
        "visitorType": visitorType,
        "source": "Agent Fixup"
    }
    return sessionInfo;
}


function getSellerSessionInfo() {
    let sessionInfo = getGeneralSessionInfo();

    // PULL validated address info to attempt the skiptrace in the backend
    sessionInfo['Submitted-Address'] = $("#address-storage").val();
    sessionInfo['addressSend'] = $("#address-storage").val();
    sessionInfo['validatedStreet'] = $("#street-storage").val(); // for the skiptrace if property info pull fails; we generally pull the address from the property info record so we know for sure where the value came from (not that there should be any difference)
    sessionInfo['validatedUnit'] = $("#unit-storage").val();
    sessionInfo['validatedUnitType'] = $("#unit-type-storage").val();
    sessionInfo['validatedCity'] = $("#city-storage").val();
    sessionInfo['validatedState'] = $("#state-storage").val();
    sessionInfo['validatedZip'] = $("#zip-storage").val(); // for the skiptrace if property info pull fails                
    console.log('Got seller session info before submit: ' + sessionInfo);

    let checkRadioNames = ["Relationship-to-Home", "Considering-Selling", "Ownership-Type", "Also-Buying?"];
    sessionInfo = getSpecifiedRadioSelections(checkRadioNames, sessionInfo);
    console.log('Sending this sessionInfo: ' + sessionInfo);

    return sessionInfo;
}

function getBuyerSessionInfo() {
    let sessionInfo = getGeneralSessionInfo();

    let city = $("#city-storage").val();
    let state = $("#state-storage").val();
    sessionInfo['Buying-City'] = city;
    sessionInfo['Buying-State'] = state;

    let checkRadioNames = ["Buyer-Home-Type", "Buyer-Budget", "Buyer-Timeframe", "Buyer-Pre-Approved", "Buyer-Making-Offers", "Buyer-Has-Agent"];
    sessionInfo = getSpecifiedRadioSelections(checkRadioNames, sessionInfo);
    console.log('Sending this BUYER sessionInfo: ' + sessionInfo);

    return sessionInfo;
}

function updateSession(sessionFields) {
    let backendPath = "https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod";
    console.log('Right before updateSession()');
    let request = $.ajax({
        url: backendPath + "/session",
        method: "POST",
        data: JSON.stringify(sessionFields),
    });

    request.done(function (data) {
        console.log("SUCCESS: " + data);
    });

    request.fail(function () {
        console.log("Request failed");
    });
}

function submitInitialContact(namePopupSelector, phonePopupSelector, nameInputSelector, phoneInputSelector) {
    /* Submit name and initial phone number, if available */
    let agentId = $("#agent-id-storage").val();
    let sessionId = $("#session-id-storage").val();

    // GET INITIAL CONTACT
    let submittedName = $(nameInputSelector).val();
    let submittedNumber = $(phoneInputSelector).val();

    // Send off contact update; everything else (source, visitorType, etc.) should have already been sent
    let contactInfo = {
        "agentId": agentId,
        "sessionId": sessionId,
        "Submitted-Name": submittedName,
        "Submitted-Number": submittedNumber,
    };
    updateSession(contactInfo);

    // HIDE THE FORM AND SHOW THE PHONE POPUP 5 SECS LATER
    $(namePopupSelector).hide();
    setTimeout(function () { $(phonePopupSelector).css('display', 'flex'); }, 5000);
}

function submitFinalPhone(phonePopupSelector, phoneInputSelector) {
    /* And initial phone number, if available */
    let agentId = $("#agent-id-storage").val();
    let sessionId = $("#session-id-storage").val();

    // GET PHONE
    let submittedNumber = $(phoneInputSelector).val();

    // Send off contact update; everything else (source, visitorType, etc.) should have already been sent
    let contactInfo = {
        "agentId": agentId,
        "sessionId": sessionId,
        "Submitted-Number": submittedNumber,
        "finished": true,
    };
    $("#finished").attr("value", true);
    updateSession(contactInfo);

    $(phonePopupSelector).hide();
}

/* INITIAL BUYER FORM SUBMISSION */
document.querySelectorAll('input[name="Buyer-Pre-Approved"]').forEach((elem) => {
    elem.addEventListener("change", function (event) {
        event.preventDefault(); // prevent webflow defaults

        let sessionInfo = getBuyerSessionInfo();
        console.log('Updating buyer info ... ');
        console.log(JSON.stringify(sessionInfo, null, 4));
        updateSession(sessionInfo);

        $("#buyer-form").hide();
        $("#buyer-success-page").show();
        $('#buyer-name-popup').css('display', 'flex');

        $('#success-loader').css('display', 'flex');
        setTimeout(function () { $("#success-loader").hide(); }, 3000);
    });
});

/* INITIAL SELLER FORM SUBMISSION */
document.querySelectorAll('input[name="Also-Buying"]').forEach((elem) => {
    console.log(elem);
    if (elem.id == "seller-form-not-buying-btn") {
        elem.addEventListener("change", function (event) {
            event.preventDefault(); // prevent webflow defaults

            let sessionInfo = getSellerSessionInfo();
            console.log('Updating seller info ... ');
            console.log(JSON.stringify(sessionInfo, null, 4));
            updateSession(sessionInfo);

            $("#seller-form").hide();
            console.log('Should be showing seller-success-page...');
            $("#seller-success-page").show();
            $('#seller-name-popup').css('display', 'flex');

            $('#success-loader').css('display', 'flex');
            setTimeout(function () { $("#success-loader").hide(); }, 3000);
        });
    }
});

/* INITIAL SELLER FORM SUBMISSION IF THEY'RE ALSO BUYING */
document.getElementById("seller-buying-city-btn").addEventListener('click', (event) => {
    let sellerBuyingCity = $("#seller-buying-city-input").val();
    let sessionInfo = getSellerSessionInfo();
    sessionInfo['Seller-Buying-City'] = sellerBuyingCity;
    updateSession(sessionInfo);

    $("#seller-form").hide();
    $("#seller-success-page").show();
    setTimeout(function () { $("#seller-name-popup").css('display', 'flex'); }, 3000);

    $('#success-loader').css('display', 'flex');
    setTimeout(function () { $("#success-loader").hide(); }, 3000);
});

/* INITIAL BUYER CONTACT SUBMISSION */
document.getElementById("buyer-name-btn").addEventListener('click', (event) => {
    submitInitialContact("#buyer-name-popup", "#buyer-phone-popup", "#buyer-name-input", "#buyer-phone-initial");
});

/* FINAL BUYER CONTACT SUBMISSION */
document.getElementById("buyer-phone-btn").addEventListener('click', (event) => {
    submitFinalPhone("#buyer-phone-popup", "#buyer-phone-input");
});

/* INITIAL SELLER CONTACT SUBMISSION */
document.getElementById("seller-name-btn").addEventListener('click', (event) => {
    submitInitialContact("#seller-name-popup", "#seller-phone-popup", "#seller-name-input", "#seller-phone-initial");
    document.querySelectorAll('.estimated-savings').forEach(item => item.classList.remove("blurred"));
});

/* FINAL SELLER CONTACT SUBMISSION */
document.getElementById("seller-phone-btn").addEventListener('click', (event) => {
    submitFinalPhone("#seller-phone-popup", "#seller-phone-input");
    document.querySelectorAll('.blurred').forEach(item => item.classList.remove("blurred")); // unblur everything  
});


/* HANDLE BOUNCE / BACK / EXIT */
window.onbeforeunload = function () {
    let finished = $("#finished").val();
    console.log("finished? " + finished);
    let warningMessage = null;
    if (!finished) {
        console.log('Setting warning');
        warningMessage = 'Are you sure you want to leave?';
    }
    console.log(warningMessage);
    return warningMessage;
};

function mobileCheck() {
    let isMobile = false;
    if ((window.matchMedia("(max-width: 767px)").matches) && (!!('ontouchstart' in window))) {
        isMobile = true;
    }
    return isMobile;
};

function handleBounce() {
    let finished = $("#finished").val(); // has a value if already bounced or reached report
    if (!finished) { // but if they bounce very early, this won't work. It will attempt to update the session.         
        let visitorType = $("#visitor-type-storage").val();
        let sessionInfo;
        if (visitorType == "buyer") {
            sessionInfo = getBuyerSessionInfo();
        } else {
            sessionInfo = getSellerSessionInfo();
        }
        sessionInfo["finished"] = false;
        sessionInfo["bounced"] = true;
        if (sessionInfo["sessionId"]) {
            console.log('Sending a beacon because we do have a sessionId: ' + sessionInfo["sessionId"]);
            sessionInfo = JSON.stringify(sessionInfo);
            navigator.sendBeacon(backendPath + "/session", sessionInfo);
        }
        $("#finished").attr("value", "no"); // technically "bounced", but just needs any value so we don't re-notify
    }
}

window.onunload = function () {
    handleBounce();
};

document.onvisibilitychange = function () {
    console.log('Visibility change');
    let mobileDevice = mobileCheck();
    console.log('Mobile: ' + mobileDevice);
    if ((mobileDevice) && (document.visibilityState === 'hidden')) {
        handleBounce();
    }
};


// // DO THIS IS IF WANT TO SUBMIT ON SHOW REPORT
// const showReportButtons = document.querySelectorAll('.show-report');
// for (const showReportButton of showReportButtons) {
//     showReportButton.addEventListener('click', function handleClick(event) {
//         console.log('Submitting details to show report...');

//         // TOOK THE BELOW OUT OF submitSellerDetails()
//         let addressSend = $("#address-storage").val();
//         $("#address-appointment").attr("value", addressSend); // for the form submission(s); potentially move down to unit submit section and send "unitAddress"
//         $("#address-virtual-appointment").attr("value", addressSend);

//         // Send off session update
//         let sessionInfo = getCurrentSessionInfo();
//         sessionInfo["finished"] = true;
//         $("#finished").attr("value", true);
//         updateSession(sessionInfo);
//     });
// }

// document.querySelectorAll('.show-report').forEach(item => {
//     item.addEventListener('click', event => {
//         $("#visitor-info-page").hide();
//         $("#success-page").show();
//         $('#success-loader').css('display', 'flex'); // replacing typical "$("#success-loader").show();" ; alternative may be to always show it with 'flex' in webflow then just do the .hide() step below
//         setTimeout(function () { $("#success-loader").hide(); }, 3000);
//         $(".value-div").show();
//     })
// });