function postValidation(func) {
    func();
}


// async function validateCity(city, state, validationCallback) {
async function validateCity(city) {
    console.log('About to validate city' + city);
    let toPath;
    try {
        // let req = await $.ajax({
        // let req = $.ajax({
        await $.ajax({
            url: 'https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod/city',
            method: 'POST',
            // data: JSON.stringify({ 'cityId': cityId, 'stateId': stateFmt }),
            data: JSON.stringify({ 'city': city }),
        }).done(function (result) {
            let cityId;
            console.log(result);
            console.log('SUPPORT CITY CHECK: ' + result.supportedCity);
            console.log('SUPPORTED CITY ID: ' + result.cityId);
            if (result.supportedCity && result.cityId) {
                cityId = result.cityId;
                toPath = "cities/" + cityId;
                console.log('IS SUPPORTED!');
                // $("#city-id-storage").attr("value", result.cityId); // 03/29/2023 - why was this commented out?
            } else {
                console.log('NOT SUPPORTED!!!');
                let closestCityInfo = result.closestSupportedCity;
                if (closestCityInfo) {
                    console.log('But do have the closest supported city' + closestCityInfo);
                    let closestCityId = closestCityInfo.closestCityId;
                    console.log('Found nearest supported city: ' + closestCityId);
                    toPath = "cities/" + closestCityId;
                    // $("#city-id-storage").attr("value", closestCityId); // 03/29/2023 - why was this commented out?
                } else {
                    console.log("Not a supported city and do not have closest city info");
                    toPath = "city";
                }
            }
        });

        // req.fail(function () {
        //     console.log('In validateCity req.fail');
        //     toPath = "city"; // 2-8-2023 new validate city page
        //     console.log('After setting toPath in fail');
        //     // toPath = "city?city=" + city; // 2-8-2023 new validate city page
        // });

    } catch (error) {
        console.log('(Caught error, not fail): Unable to find closest city' + error);
        toPath = "city"; // 2-8-2023 new validate city page
        // toPath = "city?city=" + city; // 2-8-2023 new validate city page
    }
    console.log('About to return path: ' + toPath);
    return toPath;
}


async function getValidCityId(cityInput) {
    console.log('About to validate city' + city);
    let cityId = "";
    try {
        await $.ajax({
            url: 'https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod/city',
            method: 'POST',
            data: JSON.stringify({ 'city': cityInput }),
        }).done(function (result) {
            console.log(result);
            console.log('SUPPORT CITY CHECK: ' + result.supportedCity);
            console.log('SUPPORTED CITY ID: ' + result.cityId);
            if (result.supportedCity && result.cityId) {
                console.log('IS SUPPORTED!');
                cityId = result.cityId;
            } else {
                console.log('NOT SUPPORTED!!!');
                let closestCityInfo = result.closestSupportedCity;
                if (closestCityInfo) {
                    console.log('But do have the closest supported city' + closestCityInfo);
                    cityId = closestCityInfo.closestCityId;
                    console.log('Found nearest supported city: ' + cityId);
                } else {
                    console.log("Not a supported city and do not have closest city info");
                }
            }
            $("#city-id-storage").attr("value", cityId); // 03/29/2023 - why was this commented out?
        });
    } catch (error) {
        console.log('(Caught error, not fail): Unable to find closest city' + error);
    }
    console.log('About to return path: ' + toPath);
    return cityId;
}