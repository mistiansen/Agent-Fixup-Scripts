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

function setBuyerSessionId() {
    let sessionId = Date.now();
    console.log('Storing sessionId ' + sessionId);
    $("#session-id-storage").attr("value", sessionId);
    return sessionId;
}

function proceedAfterAddressValidated(result) {
    console.log('In proceedAfterAddressValidated...');
    let address = result.addressTextModified;
    // REQUEST PROPERTY INFO FROM BACKEND
    let agentId = $("#agent-id-storage").val();
    console.log('Proceeding after ADDRESS VALIDATION with agentId ' + agentId);
    pullPropertyInfo(address, agentId); // alternatively, we could do this in the address valdation endpoint

    $("#seller-form").show();
    console.log('Should have just shown seller-form');

    $("#selling-home-condition-page").show();
    console.log('Should have just shown selling home condition page');

    $("#zip-code-page").hide();
    $("#condo-unit-page").hide(); // may have never gotten here
    $("#confirm-unit-page").hide(); // may have never gotten here
    $("#enter-different-unit-page").hide(); // may have never gotten here
    $("#invalid-address-page").hide(); // for good measure(?)
}

function getGeneralSessionInfo() {
    let agentId = $("#agent-id-storage").val();
    let sessionId = $("#session-id-storage").val();
    let visitorType = $("#visitor-type-storage").val();
    let site = $("#domain-storage").val();
    console.log('Got this sessionId from storage: ' + sessionId);

    let sessionInfo = {
        // "site": "agentfixup.com",
        "site": site,
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

    // Get the values indicated by the radio button groups
    let checkRadioNames = ["Seller-Property-Condition", "Seller-Timeframe", "Seller-Has-Agent", "Seller-Also-Buying"];
    sessionInfo = getSpecifiedRadioSelections(checkRadioNames, sessionInfo);

    // Add any provided home feature notes submitted by the seller
    sessionInfo['Submitted-Home-Feature-Notes'] = $("#home-features-notes").val();
    console.log('Sending this sessionInfo: ' + sessionInfo);

    return sessionInfo;
}

function getBuyerSessionInfo() {
    let sessionInfo = getGeneralSessionInfo();

    let city = $("#city-storage").val(); // NOTE - these values are set in WEBFLOW EMBED from the collection item info
    let state = $("#state-storage").val(); // NOTE - these values are set in WEBFLOW EMBED from the collection item info
    sessionInfo['Buying-City'] = city;
    sessionInfo['Buying-State'] = state;

    let checkRadioNames = ["Buyer-Process-Step", "Buyer-Home-Type", "Buyer-Budget", "Buyer-Pre-Approved", "Buyer-Has-Agent"];
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

function submitVistorName(namePageId, nameInputId) {
    /* Submit name and initial phone number, if available */
    let agentId = $("#agent-id-storage").val();
    let sessionId = $("#session-id-storage").val();

    // GET INITIAL CONTACT
    let submittedName = $("#" + nameInputId).val();

    // Send off contact update; everything else (source, visitorType, etc.) should have already been sent
    let contactInfo = {
        "agentId": agentId,
        "sessionId": sessionId,
        "Submitted-Name": submittedName,
    };
    updateSession(contactInfo);

    // HIDE THE FORM AND SHOW THE PHONE POPUP 5 SECS LATER
    $("#" + namePageId).hide();
}

function submitFinalContacts(contactPageId, phoneInputId, emailInputId) {
    /* And initial phone number, if available */
    let agentId = $("#agent-id-storage").val();
    let sessionId = $("#session-id-storage").val();

    // GET PHONE
    let submittedNumber = $("#" + phoneInputId).val();
    let submittedEmail = $("#" + emailInputId).val();

    // Send off contact update; everything else (source, visitorType, etc.) should have already been sent
    let contactInfo = {
        "agentId": agentId,
        "sessionId": sessionId,
        "Submitted-Number": submittedNumber,
        "Submitted-Email": submittedEmail,
        "finished": true,
    };
    $("#finished").attr("value", true);
    updateSession(contactInfo);

    $("#" + contactPageId).hide();
}







function mobileCheck() {
    let isMobile = false;
    if ((window.matchMedia("(max-width: 767px)").matches) && (!!('ontouchstart' in window))) {
        isMobile = true;
    }
    return isMobile;
};

function handleBounce() {
    let backendPath = "https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod";
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
