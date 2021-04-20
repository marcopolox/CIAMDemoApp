module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let body = {
		"commands": [{
			"type": "com.okta.access.patch",
			"value": [
    			{
    				"op": "add",
    				"path": "/claims/externalClaim",
                    "value": "External value fetched via Token Inline Hook"
    			}
			]
		}]
	}

    let errorres = {
        "commands": [{
            "error": [{
                "errorSummary": "Your token does not contain appropriate scope"
            }]
        }]
    }
    
    let scopes = req.body.data.access.scopes;
    context.log("scopes: ",scopes);

    if (scopes && scopes.gold) {
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: JSON.stringify(body)
        };
    }
    else {
        context.res = {
            status: 400,
            body: JSON.stringify(errorres)
        };
    }
};