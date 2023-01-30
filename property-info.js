let backendPath = "https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod";
// let backendPath = "https://1snwvce58a.execute-api.us-east-1.amazonaws.com/dev";

var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

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

function parseValuationResult(result) {
    try {
        let estimatedValue = result.EstimatedValue;
        let estimatedMinValue = result.EstimatedMinValue;
        let estimatedMaxValue = result.EstimatedMaxValue;
        let confidenceScore = result.ConfidenceScore;
        console.log('Got estimate of ' + estimatedValue);

        if ((estimatedValue === "" || estimatedValue === "$0" || estimatedValue === "$NaN" || typeof estimatedValue === "undefined")) {
            throw 'Unable to pull value estimates';
        } else {
            let adjustedEstimate = estimatedValue;
            console.log('Got adjustedEstimate: ' + adjustedEstimate);

            // Added 1/3/2023 to create savings estimate
            let savingsPercent = 0.0035;
            let numericEstValue = Number(estimatedValue.replace(/[^0-9.-]+/g, ""));
            let estimatedSavings = formatter.format(savingsPercent * numericEstValue);
            $(".estimated-savings").html(estimatedSavings);
            $(".estimated-savings").val(estimatedSavings);
            console.log('Got estimated savings: ' + estimatedSavings);

            $(".selling-estimate").html(adjustedEstimate);
            $(".selling-estimate").val(adjustedEstimate);
            $(".value-estimate").html(estimatedValue);
            $(".value-estimate").val(estimatedValue);
            $(".value-estimate-min").html(estimatedMinValue);
            $(".value-estimate-min").val(estimatedMinValue);
            $(".value-estimate-max").html(estimatedMaxValue);
            $(".value-estimate-max").val(estimatedMaxValue);

            $(".confidence-score").html(confidenceScore);
            $(".confidence-score").val(confidenceScore);
        }
    } catch (error) {
        // console.log(error);
        console.log('In the catch for parseValuationResult');
        $(".estimated-savings").html("$1,000");
        $(".estimated-savings").val("$1,000");
        $(".value-estimate").html("$-");
        $(".value-estimate-min").html("$-");
        $(".value-estimate-max").html("$-");
        $(".confidence-score").html(0);
        $(".value-estimate").val("$-");
        $(".value-estimate-min").val("$-");
        $(".value-estimate-max").val("$-");
        $(".confidence-score").val(0);
    }
}

// function pullPropertyInfo(address, street, city, state, zip, agentId, domain) {
function pullPropertyInfo(address, agentId) {

    /* Currently, each pullPropertyInfo request returns a new sessionId */
    let propertyRequest = {
        "address": address,
        "agentId": agentId,
        "site": "agentfixup.com"
    };

    // ADDED 8/22/22 - Use existing sessionId if it exists
    let sessionId = $("#session-id-storage").val();
    console.log('Pulled this existing sessionId from session-id-storage before requesting property info: ' + sessionId);
    if (typeof sessionId != "undefined" && sessionId.length > 0) {
        propertyRequest['sessionId'] = sessionId;
    }

    console.log('Pulling property info for ' + address);
    let url = backendPath + "/property";
    $.ajax({
        url: url,
        method: 'POST',
        data: JSON.stringify(propertyRequest),
    }).done(function (result) {
        let property = result.Property;
        let sessionId = result.sessionId; // this becomes the sessionId that tracks subsequent changes
        $("#session-id-storage").attr("value", sessionId); // this becomes the sessionId that tracks subsequent changes
        console.log('Pulled this property: ' + property);
        console.log('Pulled this sessionId: ' + sessionId);
        return parseValuationResult(property);
    }).fail(function (err) {
        console.log('Unabled to pull home value estimate');
        console.log(err);
    });
}


function storeValidatedAddressComponents(validationResult) {
    // PARSE AND STORE VALIDATED ADDRESS COMPONENTS                         
    let addressDisplayText = validationResult.addressTextModified;
    $(".address-display").html(addressDisplayText);
    $("#address-send").attr("value", addressDisplayText); // for the form submission(s); potentially move down to unit submit section and send "unitAddress"
    $("#address-storage").attr("value", addressDisplayText); // house number, street, and unit (if any)

    // $("#street-storage").attr("value", validationResult.street);
    $("#street-storage").attr("value", validationResult.streetNoUnit); // NOTE 1/4/2023 - WE need without unit, so can add unit on if it needs a corrected unit. "addressLine1" may also work. 
    $("#unit-storage").attr("value", validationResult.unit); // should be included above in street, I think
    $("#unit-type-storage").attr("value", validationResult.unitType); // sub-premises type

    console.log('Storing city in storage:' + validationResult.city);
    console.log('Storing state in storage:' + validationResult.state);
    $("#city-storage").attr("value", validationResult.city);
    $("#state-storage").attr("value", validationResult.state);

    $("#zip-storage").attr("value", validationResult.zip);

    // ADDED 1/29/2023 - USE CITY ID
    let cityId = validationResult.cityId;
    console.log('Pulled CITY ID from validation result: ' + cityId);
    $("#city-id-storage").attr("value", cityId); // store our city-id / slug corresponding to the city collection page
}


function proceedAfterAddressValidated(result) {
    let address = result.addressTextModified
    console.log('Proceeding after ADDRESS VALIDATION');
    // REQUEST PROPERTY INFO FROM BACKEND
    let agentId = $("#agent-id-storage").val();
    pullPropertyInfo(address, agentId); // alternatively, we could do this in the address valdation endpoint

    $("#zip-code-page").hide();
    $("#condo-unit-page").hide(); // may have never gotten here
    $("#confirm-unit-page").hide(); // may have never gotten here
    $("#enter-different-unit-page").hide(); // may have never gotten here
    $("#invalid-address-page").hide(); // for good measure(?)
    $("#relationship-page").show();
}

async function rerouteAfterValidation(result) {
    console.log('REROUTING after address validation');

    // let agentId = $("#agent-id-storage").val();
    let visitorType = $("#visitor-type-storage").val();
    let destination = $("#destination-storage").val(); // agentId
    let address = $("#address-storage").val(); // house number, street, and unit (if any)
    let cityId = $("#city-id-storage").val();

    if (typeof cityId != "undefined" && cityId == result.cityId) {
        console.log('Staying on this page');
    } else {


        if (agentFixupCities.includes(cityId)) {
            toPath = "cities/" + cityId;
        } else {
            let lat = $("#lat-storage").val();
            let lng = $("#lng-storage").val();
            console.log('Need to find closest city to: ' + lat + ' ' + lng);

            try {
                let req = await $.ajax({
                    url: 'https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod/city',
                    method: 'POST',
                    data: JSON.stringify({ 'cityId': cityId, 'stateId': stateFmt, 'lat': lat, 'lng': lng }),
                })

                req.success(function (result) {
                    let closestCityId = result.closest_city_id;
                    console.log('Successfully found the closest city: ' + closestCityId);
                    toPath = "cities/" + closestCityId;
                    queryString = '?city=' + encodeURIComponent(city) + '&state=' + encodeURIComponent(state);
                });

                req.fail(function () {
                    console.log('Oh noes!');
                    console.log('Unabled to find closest city');
                    toPath = "cities/locate";
                    console.log('After setting toPath in fail');
                });

            } catch (error) {
                console.log('Oh noes!');
                console.log('Unabled to find closest city');
                toPath = "cities/locate";
                console.log('After setting toPath in fail');
            }
        }


        location.href = 'NEW URL'; // carry the address over and don't re-validate it
    }
    // NOW WE SHOULD ACTUALLY ALSO RE-ROUTE     
}

function postValidation(func) {
    func();
}

// function validateAddress(address) {
function validateAddress(address, validationCallback) {
    console.log('About to validate address: ' + address);
    let url = backendPath + "/address";
    $.ajax({
        url: url,
        method: 'POST',
        data: JSON.stringify({ "address": address }), // data: JSON.stringify(sellingDetails),
    }).done(function (result) {
        console.log('Validation result ' + result);
        console.log('Invalid address? ' + result.invalidAddress);
        console.log('Submitted address ' + result.submittedAddress);
        $('#updating-home-details-loader').hide()
        // $('#updating-home-details-loader').css('display', 'flex');
        $('#market-analysis-loader').hide(); // maybe rename to "address-loader"
        try {
            storeValidatedAddressComponents(result); // NEW 1/4/2022 - this would ALWAYS run, so elements SHOULD be safely overridden
            if (!result.invalidAddress) {
                console.log('Looks like it was a valid address');
                // REQUEST PROPERTY INFO FROM BACKEND
                // NEW 1/4/2022 - THE ABOVE WRAPPED IN FUNCTION CALLS
                // await storeValidatedAddressComponents(result); // NEW 1/4/2022 - is the await necessary? We definitely need the address to be there 
                // storeValidatedAddressComponents(result); // NEW 1/4/2022 - is the await necessary? We definitely need the address to be there 

                // proceedAfterAddressValidated(result.addressTextModified);
                postValidation(function () { validationCallback(result) });
            } else if (result.invalidZip) {
                let addressDisplayText = address;
                $(".address-display").html(addressDisplayText);
                $("#address-storage").attr("value", addressDisplayText);
                $("#relationship-page").hide();
                $("#invalid-address-page").hide();
                $("#zip-code-page").show();
            } else if ((result.needUnit && !result.unitProvided)) {
                console.log('We need a unit and it looks like NO unit was provided');
                let addressDisplayText = result.addressTextModified;
                console.log('addressDisplayText: ' + addressDisplayText);
                $(".address-display").html(addressDisplayText);
                $("#address-storage").attr("value", addressDisplayText);
                $("#relationship-page").hide();
                $("#zip-code-page").hide();
                $("#invalid-address-page").hide();
                $("#condo-unit-page").show();
            } else if ((result.needUnit && result.invalidUnit)) {
                console.log('We need a unit and it looks an invalid one was provided');
                let addressDisplayText = result.addressTextModified;
                console.log('addressDisplayText: ' + addressDisplayText);

                let unitCorrectionAttempted = $("#unit-correction-attempted").val();
                if (unitCorrectionAttempted) {
                    console.log('Proceeding because already attempted to correct the unit');
                    storeValidatedAddressComponents(result);
                    // proceedAfterAddressValidated(result.addressTextModified);
                    postValidation(function () { validationCallback(result) });
                } else {
                    console.log('Have not yet attempted to correct the unit; doing so now');
                    $("#unit-correction-attempted").attr("value", "true"); // ADDED 1/4/2022 - SET INDICATOR for whether to keep asking for unit
                    $(".address-display").html(addressDisplayText);
                    $("#address-storage").attr("value", addressDisplayText);
                    // $("#relationship-page").hide(); // COMMENTED OUT 1/30/2022 - doesn't exist on the AF validation page and shouldn't be necessary anyway
                    $("#zip-code-page").hide();
                    $("#invalid-address-page").hide();
                    $("#condo-unit-page").hide();
                    $("#confirm-unit-page").show();
                }
            } else {
                console.log('Invalid address...deciding what to do next');
                $("#zip-code-page").hide();
                $("#condo-unit-page").hide();
                // $("#relationship-page").hide(); // but wouldn't it be this? // COMMENTED OUT 1/30/2022 - doesn't exist on the AF validation page and shouldn't be necessary anyway
                $("#invalid-address-page").show();
                let errorMessage = 'We were unable to validate that address';
                if (result.extraneousUnitProvided) {
                    errorMessage = 'Did you mean to submit a unit number?';
                }
                $(".address-error-message").html(errorMessage);
            }
        } catch (error) {
            console.log(error);
        }
    });
}

// function validateCity(cityText) {
//     console.log('About to validate address: ' + address);
//     let url = backendPath + "/city";
//     $.ajax({
//         url: url,
//         method: 'POST',
//         data: JSON.stringify({ "city": cityText }), // data: JSON.stringify(sellingDetails),
//     }).done(function (result) {
//         console.log('Validation result ' + result);
//         console.log('Invalid address? ' + result.invalidCity);
//         $('#updating-home-details-loader').hide()
//         // $('#updating-home-details-loader').css('display', 'flex');
//         $('#market-analysis-loader').hide(); // maybe rename to "address-loader"
//         try {
//             if (!result.invalidCity) {
//                 console.log('Looks like it was a valid city');
//                 let cityId = result.cityId;
//                 let routeToUrl = 'https://agentfixup.com/cities/' + cityId;
//                 console.log('Routing to URL ' + routeToUrl);
//                 location.href = routeToUrl;
//             } else {
//                 let errorMessage = "Need a valid city & state. Please select from the autocomplete.";
//                 console.log(errorMessage);
//                 alert(errorMessage);
//             }
//         } catch (error) {
//             console.log(error);
//         }
//     });
// }

document.getElementById("no-unit-btn").addEventListener('click', (event) => {
    console.log('Just clicked no unit btn');
    console.log('Progressing without re-validating the no-unit address');
    $("#unit-storage").attr("value", ""); // NOTE - NEW ADDED 12/19/22
    $(".unit-display").html(""); // NOTE - NEW ADDED 01/04/22
    $("#condo-unit-page").hide();
    $("#relationship-page").show(); // NOTE - NEW ADDED 01/04/22; previously (and still) handled by a Webflow legacy interaction
});

document.getElementById("unit-submit-btn").addEventListener('click', (event) => {
    // STORE UNIT
    let unit = document.getElementById("unit-input").value.trim();
    $("#unit-storage").attr("value", unit); // NOTE - NEW ADDED 12/19/22
    $(".unit-display").html(unit); // NOTE - NEW ADDED 01/04/22
    console.log('User entered unit: ' + unit);

    // UPDATE ADDRESS
    console.log('Adding unit to address : ' + unit);
    let address = $("#address-storage").val();
    console.log('Adding to address from storage: ' + address);

    let unitAddress = addUnit(address, unit);
    console.log('Now validating the address with the unit added: ' + unitAddress);

    // SHOW LOADER
    $('#updating-home-details-loader').removeClass('hide');

    // VALIDATE ADDRESS
    validateAddress(unitAddress); // don't set condo (false), because already did on first pull
});

document.getElementById("unit-correction-submit-btn").addEventListener('click', (event) => {
    // STORE UNIT
    let unit = document.getElementById("unit-correction-input").value.trim();
    $("#unit-storage").attr("value", unit); // NOTE - NEW ADDED 12/19/22
    $(".unit-display").html(unit); // NOTE - NEW ADDED 01/04/22
    console.log('User entered unit: ' + unit);

    // UPDATE ADDRESS
    console.log('Adding unit to address : ' + unit);
    // let address = $("#address-storage").val();
    // console.log('Adding to address from storage: ' + address);
    let street = $("#street-storage").val(); // NEW 1/4/2022 - these should all be set during the initial address validation attempt
    let city = $("#city-storage").val();
    let state = $("#state-storage").val();
    let zip = $("#zip-storage").val();

    // let unitAddress = addUnit(address, unit);
    let unitAddress = formUnitAddressString(street, unit, city, state, zip);

    // SHOW LOADER
    $('#updating-home-details-loader').removeClass('hide');

    // VALIDATE ADDRESS
    validateAddress(unitAddress); // don't set condo (false), because already did on first pull
});

document.getElementById("unit-is-correct-btn").addEventListener('click', (event) => {
    // PRETEND LIKE THE ADDRESS WAS VALIDATED
    let address = $("#address-storage").val();
    proceedAfterAddressValidated(address);
});

document.getElementById("new-unit-needed-btn").addEventListener('click', (event) => {
    $("#confirm-unit-page").hide();
    $("#relationship-page").hide(); // NOT sure why this is needed, but looks like it is
    $("#enter-different-unit-page").show();
});

document.getElementById("zip-submit-btn").addEventListener('click', (event) => {
    let zipCode = document.getElementById("zip-code-input").value.trim();
    $("#zip-storage").attr("value", zipCode); // NOTE - NEW ADDED 1/4/2022 (not sure it's necessary)

    let address = $("#address-storage").val();
    console.log('Adding to address from storage: ' + address);

    let zipCodeAddress = addZipCode(address, zipCode);

    // SHOW LOADER
    $('#updating-home-details-loader').removeClass('hide');

    // VALIDATE ADDRESS
    validateAddress(zipCodeAddress); // should overwrite any invalid address items
    setTimeout(function () { $("#market-analysis-loader").hide(); }, 2500);
});