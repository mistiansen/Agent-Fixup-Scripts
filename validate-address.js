function addUnit(address, unit) {
    if (typeof unit != "undefined" && unit.length > 0) {
        let addressTokens = address.split(',');
        let street = addressTokens[0];
        street = street + " Unit " + unit;
        addressTokens.shift();
        let addressEnding = addressTokens.join(',');
        address = street + ',' + addressEnding;
    }
    console.log('Formed address ' + address + ' from address and unit');
    return address;
}

function formUnitAddressString(street, unitNumber, city, state, zip) {
    let addressString = street + ' Unit ' + unitNumber + ', ' + city + ', ' + state + ' ' + zip;
    return addressString
}

function addZipCode(address, zip) {
    if (typeof zip != "undefined" && zip.length > 0) {
        address = address + ' ' + zip;
    }
    console.log('Formed address ' + address + ' from address and zip');
    return address;
}

function storeValidatedAddressComponents(validationResult) {
    // PARSE AND STORE VALIDATED ADDRESS COMPONENTS                         
    let addressDisplayText = validationResult.addressTextModified;
    $(".address-display").html(addressDisplayText);
    $("#address-send").attr("value", addressDisplayText); // for the form submission(s); potentially move down to unit submit section and send "unitAddress"
    $("#address-storage").attr("value", addressDisplayText); // house number, street, and unit (if any)

    $("#street-storage").attr("value", validationResult.streetNoUnit); // NOTE 1/4/2023 - WE need without unit, so can add unit on if it needs a corrected unit. "addressLine1" may also work. 
    $("#unit-storage").attr("value", validationResult.unit); // should be included above in street, I think
    $("#unit-type-storage").attr("value", validationResult.unitType); // sub-premises type

    console.log('Storing city in storage:' + validationResult.city);
    console.log('Storing state in storage:' + validationResult.state);
    $("#city-storage").attr("value", validationResult.city);
    $("#state-storage").attr("value", validationResult.state);
    $("#zip-storage").attr("value", validationResult.zip);

    // ADDED 1/29/2023 - USE CITY ID
    console.log('SUPPORT CITY CHECK: ' + validationResult.supportedCity);
    console.log('SUPPORTED CITY ID: ' + validationResult.cityId);
    if (validationResult.supportedCity && validationResult.cityId) {
        console.log('IS SUPPORTED!');
        $("#city-id-storage").attr("value", validationResult.cityId);
    } else {
        console.log('NOT SUPPORTED!!!');
        let closestCityInfo = validationResult.closestSupportedCity;
        if (closestCityInfo) {
            console.log('But do have the closest supported city' + closestCityInfo);
            let closestCityId = closestCityInfo.closestCityId;
            $("#city-id-storage").attr("value", closestCityId);
            console.log('Found nearest supported city: ' + closestCityId);
        }
    }
}

function postValidation(func) {
    func();
}

function initialAddressValidation(address, agentId, validationCallback) {
    let request = { "address": address, "validateCity": true, "startSession": true, "agentId": agentId };
    validateAddress(request, validationCallback);
}

function correctionAddressValidation(address, agentId, sessionId, validationCallback) {
    let request = { "address": address, "validateCity": true, "agentId": agentId, "sessionId": sessionId };
    validateAddress(request, validationCallback);
}

function validateAddress(request, validationCallback) {
    let address = request.address;
    console.log('About to validate address with request: ' + request);
    let url = "https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod/address";
    $.ajax({
        url: url,
        method: 'POST',
        data: JSON.stringify(request), // data: JSON.stringify(sellingDetails),
    }).done(function (result) {
        console.log('Validation result ' + result);
        console.log('Invalid address? ' + result.invalidAddress);
        console.log('Submitted address ' + result.submittedAddress);
        if (result.sessionId) {
            console.log('Got returned sessionId: ' + result.sessionId);
            $("#session-id-storage").attr("value", result.sessionId);
        }

        // TODO - MAYBE put these directly in the validationCallback if they're needed. We shouldn't rely on / expect their existence in all cases. 
        // $('#validating-location-loader').hide();
        // $('#validating-location-loader').css('display', 'none');

        // $('#updating-home-details-loader').hide()
        // $('#updating-home-details-loader').css('display', 'flex');
        // $('#market-analysis-loader').hide(); // maybe rename to "address-loader"

        try {
            storeValidatedAddressComponents(result); // NEW 1/4/2022 - this would ALWAYS run, so elements SHOULD be safely overridden
            if (!result.invalidAddress) {
                console.log('Looks like it was a valid address');
                postValidation(function () { validationCallback(result) });
            } else if (result.invalidZip) {
                console.log('Looks like an invalid zip or no zip provided');
                let addressDisplayText = address;
                $(".address-display").html(addressDisplayText);
                $("#address-storage").attr("value", addressDisplayText);
                $("#invalid-address-page").hide();
                $("#zip-code-page").show();
                $('#validating-location-loader').hide();
            } else if ((result.needUnit && !result.unitProvided)) {
                console.log('We need a unit and it looks like NO unit was provided');
                let addressDisplayText = result.addressTextModified;
                console.log('addressDisplayText: ' + addressDisplayText);
                $(".address-display").html(addressDisplayText);
                $("#address-storage").attr("value", addressDisplayText);
                $("#zip-code-page").hide();
                $("#invalid-address-page").hide();
                $("#condo-unit-page").show();
                $('#validating-location-loader').hide();
            } else if ((result.needUnit && result.invalidUnit)) {
                console.log('We need a unit and it looks an invalid one was provided');
                let addressDisplayText = result.addressTextModified;
                console.log('addressDisplayText: ' + addressDisplayText);

                let unitCorrectionAttempted = $("#unit-correction-attempted").val();
                if (unitCorrectionAttempted) {
                    console.log('Proceeding because already attempted to correct the unit');
                    postValidation(function () { validationCallback(result) });
                } else {
                    console.log('Have not yet attempted to correct the unit; doing so now');
                    $("#unit-correction-attempted").attr("value", "true"); // ADDED 1/4/2022 - SET INDICATOR for whether to keep asking for unit
                    $(".address-display").html(addressDisplayText);
                    $("#address-storage").attr("value", addressDisplayText);
                    $("#zip-code-page").hide();
                    $("#invalid-address-page").hide();
                    $("#condo-unit-page").hide();
                    $("#confirm-unit-page").show();
                    $('#validating-location-loader').hide();
                }
            } else {
                // TODO - NEED some more attention here...
                // // should we check for unit again even if already attempted before? probably
                // // more importantly should we first make sure there is a valid cityId to route to?

                // let failureCityId = validationResult.cityId; // do we also need to check the "closestCityId" in the response?
                // if (!failureCityId || failureCityId == "null" || failureCityId == "") {
                //     $("#seller-invalid-city-page").show();
                //     $("#zip-code-page").hide();
                //     $("#condo-unit-page").hide();
                //     $("#invalid-address-page").hide();
                // }
                let addressCorrectionAttempted = $("#address-correction-attempted").val();
                if (addressCorrectionAttempted) {
                    console.log('Proceeding because already attempted to correct the address');
                    postValidation(function () { validationCallback(result) });
                } else {
                    console.log('Invalid address...deciding what to do next');
                    $("#address-correction-attempted").attr("value", "true"); // ADDED 1/4/2022 - SET INDICATOR for whether to keep asking for unit
                    $("#zip-code-page").hide();
                    $("#condo-unit-page").hide();
                    $("#invalid-address-page").show();
                    let errorMessage = 'We were unable to validate that address';
                    if (result.extraneousUnitProvided) {
                        errorMessage = 'Did you mean to submit a unit number?';
                    }
                    $(".address-error-message").html(errorMessage);
                }
            }
        } catch (error) {
            console.log(error);
        }
    });
}