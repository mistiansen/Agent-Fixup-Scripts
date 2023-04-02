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

async function proceedAfterAddressValidated(result) {
    console.log('In proceedAfterAddressValidated...');
    let address = result.addressTextModified;
    console.log('Using this address from the validation response: ' + address);

    continueToForm(address);
}

function continueToForm(address) {
    console.log('In continueToForm...');
    // let address = result.addressTextModified;
    // let address = $("#address-storage").val();
    // console.log('Using this address from the validation response: ' + address);

    // REQUEST PROPERTY INFO FROM BACKEND
    let agentId = $("#agent-id-storage").val();
    console.log('Proceeding after ADDRESS VALIDATION with agentId ' + agentId);
    pullPropertyInfo(address, agentId); // alternatively, we could do this in the address valdation endpoint

    $("#selling-home-condition-page").show();
    console.log('Should have just shown selling home condition page');

    $('#validating-address-loader').hide();
    $('#validating-city-loader').hide();
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
    console.log('Right before updateSession, with this payload: ' + sessionFields);
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

function routeToSuccess() {
    let cityId = $("#city-id-storage").val();
    let visitorType = $("#visitor-type-storage").val();
    let sessionId = $("#session-id-storage").val();

    let toPath = "cities/" + cityId;
    let queryString = '?visitor=' + encodeURIComponent(visitorType) + '&session=' + encodeURIComponent(sessionId); // should be unnecessary
    if (visitorType == "seller" || "visitorType" == "seller-buyer") {
        let address = $("#address-storage").val();
        queryString = queryString + '&address=' + encodeURIComponent(address);
    }
    let routeToPathBase = 'https://agentfixup.com/' + toPath;
    let routeToUrl = routeToPathBase + queryString;

    window.location.replace(routeToUrl); // REPLACES the current page, so the back button will take them to homepage rather than here
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


// ADDRESS CORRECTION ELEMENTS
async function rerouteAfterValidation(result) {
    console.log('Calling rerouteAfterValidation()...');
    let sessionId = $("#session-id-storage").val();
    let visitorType = $("#visitor-type-storage").val();
    let destination = $("#destination-storage").val(); // agentId
    let address = $("#address-storage").val(); // house number, street, and unit (if any)
    let gclid = $("#gclid-storage").val();

    // let cityId = $("#city-id-storage").val();
    let cityId = result.cityId;

    let toPath;
    let isSupportedCity = result.supportedCity;
    console.log('IS SUPPORTED CITY? ' + isSupportedCity);
    if (typeof isSupportedCity == "undefined" || !isSupportedCity) {
        let closestCityInfo = result.closestSupportedCity;
        let closestCityId = closestCityInfo.closestCityId;
        if (typeof closestCityId != "undefined") {
            console.log('Got a closest city from BACKEND' + closestCityId);
            cityId = closestCityId;
        } else {
            cityId = "locate";
        }
    }
    reroute(cityId, address, visitorType, destination, sessionId, gclid);
}

function reroute(cityId, address, visitorType, destination, sessionId, gclid) {
    let toPath = "cities/" + cityId;
    let queryString = '?address=' + encodeURIComponent(address) + '&validated=true' + '&destination=' + encodeURIComponent(destination) + '&visitor=' + encodeURIComponent(visitorType) + '&session=' + encodeURIComponent(sessionId);
    queryString = queryString + '&gclid=' + gclid
    let routeToPathBase = 'https://agentfixup.com/' + toPath;
    let routeToUrl = routeToPathBase + queryString;

    let now = new Date();
    console.log('REROUTE start @' + now.getSeconds() + "." + now.getMilliseconds() + "\n\n");
    window.location.replace(routeToUrl); // REPLACES the current page, so the back button will take them to homepage rather than here
}

document.getElementById("no-unit-btn").addEventListener('click', (event) => {
    console.log('Progressing without re-validating the no-unit address');
    $("#unit-storage").attr("value", "");
    $(".unit-display").html("");
    $("#condo-unit-page").hide(); // ADDED 2-7-2023 - NEED TO REROUTE FROM HERE

    // SHOW LOADER
    $('#validating-address-loader').removeClass('hide');
    $('#validating-address-loader').css('display', 'flex');

    // PULL COMPONTENTS FROM STORAGE AND REROUTE REGARDLESS (at this point we should always have a cityId, at least of the closest city)
    let cityId = $("#city-id-storage").val();
    let address = $("#address-storage").val();
    let visitorType = $("#visitor-type-storage").val();
    let destination = $("#destination-storage").val(); // agentId
    let sessionId = $("#session-id-storage").val(); // agentId
    let gclid = $("#gclid-storage").val(); // agentId
    reroute(cityId, address, visitorType, destination, sessionId, gclid);
});

document.getElementById("unit-submit-btn").addEventListener('click', (event) => {
    // STORE UNIT
    let unit = document.getElementById("unit-input").value.trim();
    $("#unit-storage").attr("value", unit);
    $(".unit-display").html(unit);
    console.log('User entered unit: ' + unit);

    // UPDATE ADDRESS
    console.log('Adding unit to address : ' + unit);
    let address = $("#address-storage").val();
    console.log('Adding to address from storage: ' + address);

    let unitAddress = addUnit(address, unit);
    console.log('Now validating the address with the unit added: ' + unitAddress);

    // HIDE THE CURRENT PAGE WHILE THE LOADER SHOWS
    $('#condo-unit-page').hide();

    // SHOW LOADER
    $('#validating-address-loader').removeClass('hide');
    $('#validating-address-loader').css('display', 'flex');

    let agentId = $("#destination-storage").val();
    let sessionId = $("#session-id-storage").val();

    // VALIDATE ADDRESS
    // correctionAddressValidation(unitAddress, agentId, sessionId, rerouteAfterValidation);
    correctionAddressValidation(unitAddress, agentId, sessionId, proceedAfterAddressValidated);
});

document.getElementById("unit-correction-submit-btn").addEventListener('click', (event) => {
    let unit = document.getElementById("unit-correction-input").value.trim();
    $("#unit-storage").attr("value", unit);
    $(".unit-display").html(unit);
    console.log('User entered unit: ' + unit);

    // UPDATE ADDRESS
    let street = $("#street-storage").val();
    let city = $("#city-storage").val();
    let state = $("#state-storage").val();
    let zip = $("#zip-storage").val();

    let unitAddress = formUnitAddressString(street, unit, city, state, zip);

    // HIDE THE CURRENT PAGE WHILE THE LOADER SHOWS
    $('#enter-different-unit-page').hide();

    // SHOW LOADER
    $('#validating-address-loader').removeClass('hide');
    $('#validating-address-loader').css('display', 'flex');

    let agentId = $("#destination-storage").val();
    let sessionId = $("#session-id-storage").val();

    // VALIDATE ADDRESS
    correctionAddressValidation(unitAddress, agentId, sessionId, proceedAfterAddressValidated);
});

document.getElementById("unit-is-correct-btn").addEventListener('click', (event) => {
    // HIDE THE CURRENT PAGE WHILE THE LOADER SHOWS
    $('#confirm-unit-page').hide();

    // SHOW LOADER
    $('#validating-address-loader').removeClass('hide');
    $('#validating-address-loader').css('display', 'flex');

    // PULL COMPONTENTS FROM STORAGE AND REROUTE REGARDLESS (at this point we should always have a cityId, at least of the closest city)
    let address = $("#address-storage").val();
    continueToForm(address);
});

document.getElementById("new-unit-needed-btn").addEventListener('click', (event) => {
    $("#confirm-unit-page").hide();
    $("#enter-different-unit-page").show();
});


document.getElementById("zip-submit-btn").addEventListener('click', (event) => {
    let zipCode = document.getElementById("zip-code-input").value.trim();
    $("#zip-storage").attr("value", zipCode); // NOTE - NEW ADDED 1/4/2022 (not sure it's necessary)

    let address = $("#address-storage").val();
    console.log('Adding to address from storage: ' + address);

    let zipCodeAddress = addZipCode(address, zipCode);

    // HIDE THE CURRENT PAGE WHILE THE LOADER SHOWS
    $('#zip-code-page').hide();

    // SHOW LOADER
    $('#validating-address-loader').removeClass('hide');
    $('#validating-address-loader').css('display', 'flex');

    let agentId = $("#destination-storage").val();
    let sessionId = $("#session-id-storage").val();

    // VALIDATE ADDRESS
    correctionAddressValidation(zipCodeAddress, agentId, sessionId, proceedAfterAddressValidated);
    setTimeout(function () { $("#validating-address-loader").hide(); }, 2500);
});

document.getElementById("submit-address-correction-btn").addEventListener('click', (event) => {
    event.preventDefault(); // prevent webflow defaults
    $('#submit-address-correction-btn').val("Going...");

    // HIDE THE CURRENT PAGE WHILE THE LOADER SHOWS
    $('#invalid-address-page').hide();

    // SHOW LOADER
    $('#validating-address-loader').removeClass('hide');
    $('#validating-address-loader').css('display', 'flex');

    let address = document.getElementById("address-correction-input").value.trim();
    $(".address-display").html(address);

    let agentId = $("#destination-storage").val();
    let sessionId = $("#session-id-storage").val();

    // RE-VALIDATE ADDRESS
    correctionAddressValidation(address, agentId, sessionId, proceedAfterAddressValidated); // don't set condo (false), because already did on first pull
    setTimeout(function () { $("#validating-address-loader").hide(); }, 2000);
});