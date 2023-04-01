var formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

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

function parsePropertyDescription(result) {
    try {
        let propertyDescription = result.propertyDescription;
        let descriptionText = propertyDescription.description;
        let features = propertyDescription.features;
        console.log('Got propertyDescription ' + propertyDescription);
        console.log('Got description text ' + descriptionText);
        console.log('Got features ' + features);

        if (descriptionText && descriptionText != "") {
            $(".home-info-found-header").html("Great! We found some info on your home");
            $(".home-details-text").html(descriptionText);
            $(".home-details-text").val(descriptionText);
            // $("$home-details-description").val(descriptionText);

        } else {
            // $(".home-info-found-header").html("Anything you'd like us to know about your home?");
            $("#home-details-description").hide();
            $("#add-details-invitation").hide();
        }
        if (features && features != "") {
            let featuresText = "It features a " + features.toLowerCase();
            $(".home-features-text").html(featuresText);
            $(".home-features-text").val(featuresText);
            // $("$home-features-description").val(descriptionText);
        } else {
            $("#home-features-description").hide();
        }
        // $("#property-description-storage").val(descriptionText); // not sure the purpose of this
        // $("#property-features-storage").val(features); // not sure the purpose of this
    } catch (error) {
        // console.log(error);
        console.log('Failed parsePropertyDescription');
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
    let url = "https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod/property";
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
        parsePropertyDescription(property);
        return parseValuationResult(property);
    }).fail(function (err) {
        console.log('Unabled to pull home value estimate');
        console.log(err);
    });
}