function postValidation(func) {
    func();
}


// async function validateCity(city, state, validationCallback) {
async function validateCity(city) {
    console.log('About to validate city' + city);
    let toPath;
    try {
        let req = await $.ajax({
            url: 'https://hhvjdbhqp4.execute-api.us-east-1.amazonaws.com/prod/city',
            method: 'POST',
            // data: JSON.stringify({ 'cityId': cityId, 'stateId': stateFmt }),
            data: JSON.stringify({ 'city': city }),
        })

        // FINE FOR BUYERS AND SELLERS (unless we end up wanting to remove address validation from lead-forms.js)
        req.success(function (result) {
            let cityId;
            console.log(result);
            console.log('SUPPORT CITY CHECK: ' + result.supportedCity);
            console.log('SUPPORTED CITY ID: ' + result.cityId);
            if (result.supportedCity && result.cityId) {
                cityId = result.cityId;
                console.log('IS SUPPORTED!');
                // $("#city-id-storage").attr("value", result.cityId);
            } else {
                console.log('NOT SUPPORTED!!!');
                let closestCityInfo = result.closestSupportedCity;
                if (closestCityInfo) {
                    console.log('But do have the closest supported city' + closestCityInfo);
                    let closestCityId = closestCityInfo.closestCityId;
                    console.log('Found nearest supported city: ' + closestCityId);
                    cityId = closestCityId;
                    // $("#city-id-storage").attr("value", closestCityId);
                }
            }
            toPath = "cities/" + cityId;
            console.log('Returning this path with cityId: ' + toPath);
        });

        req.fail(function () {
            console.log('In validateCity req.fail');
            toPath = "city"; // 2-8-2023 new validate city page
            console.log('After setting toPath in fail');
        });

    } catch (error) {
        console.log('(Caught error, not fail): Unable to find closest city' + error);
        toPath = "city"; // 2-8-2023 new validate city page
    }
    console.log('About to return path: ' + toPath);
    return toPath;
}