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
            let closestCityId = result.closest_city_id;
            console.log('Successfully found the closest city: ' + closestCityId);
            toPath = "cities/" + closestCityId;
        });

        req.fail(function () {
            console.log('Oh noes!');
            console.log('Unabled to find closest city');
            // toPath = "cities/locate";
            toPath = "locate";
            console.log('After setting toPath in fail');
        });

    } catch (error) {
        console.log('Oh noes!');
        console.log('Unabled to find closest city');
        // toPath = "cities/locate";
        toPath = "locate";
        console.log('After setting toPath in fail');
    }
    console.log('About to return path: ' + toPath);
    return toPath;
}