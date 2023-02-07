let backendPath = "https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod";
// let backendPath = "https://1snwvce58a.execute-api.us-east-1.amazonaws.com/dev";

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
    // let cityId = validationResult.cityId;
    // console.log('Pulled CITY ID from validation result: ' + cityId);
    // $("#city-id-storage").attr("value", cityId); // store our city-id / slug corresponding to the city collection page
    console.log('SUPPORT CITY CHECK: ' + validationResult.supportedCity);
    console.log('SUPPORTED CITY ID: ' + validationResult.cityId);
    if (validationResult.supportedCity && validationResult.cityId) {
        console.log('IS SUPPORTED!');
        $("#city-id-storage").attr("value", validationResult.cityId);
    } else {
        console.log('NOT SUPPORTED!!!');
        let closestCityInfo = validationResult.closestSupportedCity;
        let closestCityId = closestCityInfo.closestCityId;
        if (closestCityId) {
            console.log('Found nearest supported city: ' + closestCityId);
            $("#city-id-storage").attr("value", closestCityId);
        }
    }

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
        // data: JSON.stringify({ "address": address }), // data: JSON.stringify(sellingDetails),
        data: JSON.stringify({ "address": address, "validateCity": true }), // data: JSON.stringify(sellingDetails),
    }).done(function (result) {
        console.log('Validation result ' + result);
        console.log('Invalid address? ' + result.invalidAddress);
        console.log('Submitted address ' + result.submittedAddress);

        $('#validating-location-loader').hide();
        // $('#validating-location-loader').css('display', 'none');

        $('#updating-home-details-loader').hide()
        // $('#updating-home-details-loader').css('display', 'flex');
        $('#market-analysis-loader').hide(); // maybe rename to "address-loader"
        try {
            storeValidatedAddressComponents(result); // NEW 1/4/2022 - this would ALWAYS run, so elements SHOULD be safely overridden

            // console.log('SUPPORT CITY CHECK: ' + result.supportedCity);
            // console.log('SUPPORTED CITY ID: ' + result.cityId);
            // if (result.supportedCity && result.cityId) {
            //     console.log('IS SUPPORTED!');
            //     $("#city-id-storage").attr("value", result.cityId);
            // } else {
            //     console.log('NOT SUPPORTED!!!');
            //     let closestCityInfo = result.closestSupportedCity;
            //     let closestCityId = closestCityInfo.closestCityId;
            //     if (closestCityId) {
            //         console.log('Found nearest supported city: ' + closestCityId);
            //         $("#city-id-storage").attr("value", closestCityId);
            //     }
            // }

            if (!result.invalidAddress) {
                console.log('Looks like it was a valid address');
                // REQUEST PROPERTY INFO FROM BACKEND
                // NEW 1/4/2022 - THE ABOVE WRAPPED IN FUNCTION CALLS
                // await storeValidatedAddressComponents(result); // NEW 1/4/2022 - is the await necessary? We definitely need the address to be there 
                // storeValidatedAddressComponents(result); // NEW 1/4/2022 - is the await necessary? We definitely need the address to be there 

                // proceedAfterAddressValidated(result.addressTextModified);
                postValidation(function () { validationCallback(result) });
            } else if (result.invalidZip) {
                console.log('Looks like an invalid zip or no zip provided');
                let addressDisplayText = address;
                $(".address-display").html(addressDisplayText);
                $("#address-storage").attr("value", addressDisplayText);
                $("#invalid-address-page").hide();
                $("#zip-code-page").show();
                // $('#validating-location-loader').hide();
            } else if ((result.needUnit && !result.unitProvided)) {
                console.log('We need a unit and it looks like NO unit was provided');
                let addressDisplayText = result.addressTextModified;
                console.log('addressDisplayText: ' + addressDisplayText);
                $(".address-display").html(addressDisplayText);
                $("#address-storage").attr("value", addressDisplayText);
                $("#zip-code-page").hide();
                $("#invalid-address-page").hide();
                $("#condo-unit-page").show();
                // $('#validating-location-loader').hide();
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
                    $("#zip-code-page").hide();
                    $("#invalid-address-page").hide();
                    $("#condo-unit-page").hide();
                    $("#confirm-unit-page").show();
                    // $('#validating-location-loader').hide();
                }
            } else {
                console.log('Invalid address...deciding what to do next');
                $("#zip-code-page").hide();
                $("#condo-unit-page").hide();
                $("#invalid-address-page").show();
                // $('#validating-location-loader').hide();
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





// document.getElementById("no-unit-btn").addEventListener('click', (event) => {
//     console.log('Just clicked no unit btn');
//     console.log('Progressing without re-validating the no-unit address');
//     $("#unit-storage").attr("value", ""); // NOTE - NEW ADDED 12/19/22
//     $(".unit-display").html(""); // NOTE - NEW ADDED 01/04/22
//     $("#condo-unit-page").hide();
//     $("#relationship-page").show(); // NOTE - NEW ADDED 01/04/22; previously (and still) handled by a Webflow legacy interaction
// });

// document.getElementById("unit-submit-btn").addEventListener('click', (event) => {
//     // STORE UNIT
//     let unit = document.getElementById("unit-input").value.trim();
//     $("#unit-storage").attr("value", unit); // NOTE - NEW ADDED 12/19/22
//     $(".unit-display").html(unit); // NOTE - NEW ADDED 01/04/22
//     console.log('User entered unit: ' + unit);

//     // UPDATE ADDRESS
//     console.log('Adding unit to address : ' + unit);
//     let address = $("#address-storage").val();
//     console.log('Adding to address from storage: ' + address);

//     let unitAddress = addUnit(address, unit);
//     console.log('Now validating the address with the unit added: ' + unitAddress);

//     // SHOW LOADER
//     $('#updating-home-details-loader').removeClass('hide');

//     // VALIDATE ADDRESS
//     validateAddress(unitAddress); // don't set condo (false), because already did on first pull
// });

// document.getElementById("unit-correction-submit-btn").addEventListener('click', (event) => {
//     // STORE UNIT
//     let unit = document.getElementById("unit-correction-input").value.trim();
//     $("#unit-storage").attr("value", unit); // NOTE - NEW ADDED 12/19/22
//     $(".unit-display").html(unit); // NOTE - NEW ADDED 01/04/22
//     console.log('User entered unit: ' + unit);

//     // UPDATE ADDRESS
//     console.log('Adding unit to address : ' + unit);
//     // let address = $("#address-storage").val();
//     // console.log('Adding to address from storage: ' + address);
//     let street = $("#street-storage").val(); // NEW 1/4/2022 - these should all be set during the initial address validation attempt
//     let city = $("#city-storage").val();
//     let state = $("#state-storage").val();
//     let zip = $("#zip-storage").val();

//     // let unitAddress = addUnit(address, unit);
//     let unitAddress = formUnitAddressString(street, unit, city, state, zip);

//     // SHOW LOADER
//     $('#updating-home-details-loader').removeClass('hide');

//     // VALIDATE ADDRESS
//     validateAddress(unitAddress); // don't set condo (false), because already did on first pull
// });

// document.getElementById("unit-is-correct-btn").addEventListener('click', (event) => {
//     // PRETEND LIKE THE ADDRESS WAS VALIDATED
//     let address = $("#address-storage").val();
//     proceedAfterAddressValidated(address);
// });

// document.getElementById("new-unit-needed-btn").addEventListener('click', (event) => {
//     $("#confirm-unit-page").hide();
//     $("#relationship-page").hide(); // NOT sure why this is needed, but looks like it is
//     $("#enter-different-unit-page").show();
// });

// document.getElementById("zip-submit-btn").addEventListener('click', (event) => {
//     let zipCode = document.getElementById("zip-code-input").value.trim();
//     $("#zip-storage").attr("value", zipCode); // NOTE - NEW ADDED 1/4/2022 (not sure it's necessary)

//     let address = $("#address-storage").val();
//     console.log('Adding to address from storage: ' + address);

//     let zipCodeAddress = addZipCode(address, zipCode);

//     // SHOW LOADER
//     $('#updating-home-details-loader').removeClass('hide');

//     // VALIDATE ADDRESS
//     validateAddress(zipCodeAddress); // should overwrite any invalid address items
//     setTimeout(function () { $("#market-analysis-loader").hide(); }, 2500);
// });