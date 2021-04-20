const  http = require("https");
const defaultOptions = {
    method: 'POST',
    host: '[YOUR OKTA TENANT NAME WITHOUT HTTPS]',
    headers: 
    { 
        'cache-control': 'no-cache',
        'Authorization': 'SSWS '+process.env.apikey,
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
    }
}
const updateUser = (path, payload) => new Promise((resolve, reject) => {
    const options = { ...defaultOptions, path};
    delete payload['userid'];
    delete payload['token'];
	let reqbody = {
		profile: {}
	};
	Object.keys(payload).forEach(function(key) {
		reqbody['profile'][key] = payload[key];
	});
    const req = http.request(options, res => {
        let buffer = "";
        res.on('data', chunk => buffer += chunk)
        res.on('end', () => resolve(JSON.parse(buffer)))
    });
    req.on('error', e => reject(e.message));
    req.write(JSON.stringify(reqbody));
    req.end();
})


exports.handler = async (event, context) => new Promise (async(resolve, reject) => {
    console.log("\n\nInside handler\n\n");
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (typeof event !== 'undefined' && event) {
        const res = await updateUser("/api/v1/users/"+event.userid,event);
        resolve(res);
    }
    else { return(null, {"general error":"Better luck next time!"}); }
    
});
