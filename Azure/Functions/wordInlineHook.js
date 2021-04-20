const  http = require("https");
var qs = require('querystring');

const getSynonyms = (path,word) => new Promise((resolve, reject) => {
    var options = {
        'method': 'GET',
        'hostname': 'api.datamuse.com',
        'path': '/words?ml='+word,
        'headers': {
        }
    };
    //context.log("options: ",options);
    const req = http.request(options, res => {
        let buffer = "";
        res.on('data', chunk => buffer += chunk)
        res.on('end', () => resolve(JSON.parse(buffer)))
    });
    req.on('error', e => reject(e.message));
    var postData = qs.stringify({
      'ml': word
    });
    req.write(postData);
    req.end();
});
module.exports = async function(context, req) {
    context.log("\n\nInside handler\n\n");
    context.log('Received event:', JSON.stringify(req, null, 2));
    context.log("word: ",req.body.data.userProfile.word);
    if (req.body && req.body.data.userProfile.word) {
        const path = '/words';
        const word = req.body.data.userProfile.word;
        const resp = await getSynonyms(path,word);
        context.log("resp: ",resp);
        
        const resbody = {
            "commands":[
                {
                    "type":"com.okta.user.profile.update",
                    "value":{
                        "wordSynonyms":JSON.stringify(resp)
                    }
                }
            ]
        };
        context.res = {body: resbody};
    }
    else { 
        context.res = {
            "error":{
                "errorSummary":"Errors were found in the user profile",
                "errorCauses":[
                    {
                        "errorSummary":"We could not find any synonyms for the word you specified.",
                        "reason":"INVALID_word",
                        "locationType":"body",
                        "location":"data.userProfile.login",
                        "domain":"end-user"
                    }
                ]
            }
        }; 
    }
};