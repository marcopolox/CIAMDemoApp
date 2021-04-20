/*
 * Copyright (c) 2018, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * A simple web server that initializes the OIDC Middleware library with the
 * given options, and attaches route handlers for the example profile page
 * and logout functionality.
 */
const express = require('express');
const session = require('express-session');
const mustacheExpress = require('mustache-express');
const request = require('request');
const moment = require('moment');
const bodyParser = require('body-parser');
const path = require('path');
const { ExpressOIDC } = require('@okta/oidc-middleware');

const templateDir = path.join(__dirname, '..', 'common', 'views');
const frontendDir = path.join(__dirname, '..', 'common', 'assets');

module.exports = function SampleWebServer(
  sampleConfig,
  extraOidcOptions,
  homePageTemplateName
) {
  const oidc = new ExpressOIDC(
    Object.assign(
      {
        appBaseUrl: sampleConfig.appBaseUrl,
        issuer: sampleConfig.oidc.issuer,
        client_id: sampleConfig.oidc.clientId,
        client_secret: sampleConfig.oidc.clientSecret,
        scope: sampleConfig.oidc.scope
      },
      extraOidcOptions || {}
    )
  );
  
  const app = express();

  app.use(
    session({
      secret: '7sd8a7fds8f8sd7f87ds8f7sd8f7ds87mBD*&^S&*B78b6&*B^Hjjk',
      resave: true,
      saveUninitialized: false
    })
  );

  // This server uses mustache templates located in views/ and css assets in assets/
  app.use('/assets', express.static(frontendDir));
  app.engine('mustache', mustacheExpress());
  app.set('view engine', 'mustache');
  app.set('views', templateDir);

  app.use(oidc.router);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    const template = homePageTemplateName || 'index';
    const userinfo = req.userContext && req.userContext.userinfo;
    if (req.isAuthenticated()) {
      const idtoken = req.userContext.tokens.id_token;
      const accesstoken = req.userContext.tokens.access_token;
      let idtokendecoded = JSON.stringify(
        decodeToken(req.userContext.tokens.id_token),
        null,
        4
      );
      let accesstokendecoded = JSON.stringify(
        decodeToken(req.userContext.tokens.access_token),
        null,
        4
      );

      res.render(template, {
        isLoggedIn: !!userinfo,
        idtoken: idtoken,
        accesstoken: accesstoken,
        idtokend: idtokendecoded,
        accesstokend: accesstokendecoded,
        section: 'home'
      });
    } else {
      console.log('not authenticated');
      res.render(template, {
        isLoggedIn: !!userinfo,
        userinfo: userinfo,
        section: 'home'
      });
    }
  });

  app.post('/reghook', (req, res) => {
    let hookjson = '{"hookid": "' + sampleConfig.reg_hookid + '","data": {"userProfile":' + JSON.stringify(req.body) + ' }}';

    Promise.resolve()
      .then(async function() {
        let proxyresponse = await invokeHook(hookjson);
        res.send(proxyresponse);
      });
  });

  app.post('/getsmsfactorid', (req, res, next) => {
    var options = {
      method: 'GET',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/factors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization': sampleConfig.oktaapikey
      }
    };

    request(options, function(error, response, body) {
      if (error) next(error);
      if (response.statusCode === 200) {
        const r = JSON.parse(response.body);
        var factorid = '';
        for(let i = 0;i < r.length;i++){
          if(r[i].factorType == "sms") {
            factorid = r[i].id;
            break;
          }
        }
        res.send({"factorid": factorid});
      } else {console.log(response);}
    });

  });

  app.post('/enrollsms', (req, res, next) => {
    const factorValue = req.body.factorValue;
    let reqbody = {
        "factorType": "SMS",
        "provider": "OKTA",
        "profile": {
          "phoneNumber" : factorValue
        }
      };
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/factors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body:JSON.stringify(reqbody)
    };
    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(response.body);
    });
  });

  app.post('/activatesms', (req, res, body) => {
    let reqbody = { "passCode": req.body.passcode };
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/factors/' + req.body.factorid + '/lifecycle/activate',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(reqbody)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(response.body);
    });
  });

  app.post('/sendsmschallenge', (req, res, next) => {
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/factors/' + req.body.factorid + '/verify',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      }
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(JSON.stringify({ response: response.body }));
    });
  });

  app.post('/verifyfactor', (req, res, next) => {
    let reqbody = {
      "passCode": req.body.passcode
    };
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/factors/' + req.body.factorid + '/verify',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(reqbody)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(JSON.stringify({ response: response.body }));
    });
  });

  app.post('/createuser', (req, res, next) => {
    const pwd = req.body.password?req.body.password:sampleConfig.anonymouspwd;
    const groupid = req.body.groupid?req.body.groupid:sampleConfig.demo_group; //put the user into the group that is passed in, otherwise into 'demo' group
    var thebody = req.body;
    if(thebody.groupid) { delete thebody['groupid']; }
    if(thebody.password) { delete thebody['password']; }
    let reqbod = {
      profile: {},
      credentials: {
        password: { value: pwd }
      },
      groupIds: [groupid]
    };
    Object.keys(thebody).forEach(function(key) {
      reqbod['profile'][key] = thebody[key];
    });

    // add login if no login provided...look for login, if no login look for email, if no email look for phone number else just assign hardcoded value
    if(req.body.login) {
        reqbod['profile']['login'] = req.body.login;
    } else if(req.body.email) {
        reqbod['profile']['login'] = req.body.email;
    } else if (req.body.primaryPhone) {
        reqbod['profile']['login'] = req.body.primaryPhone;
    } else {
        reqbod['profile']['login'] = sampleConfig.demouser_login;
    }
    
    reqbod['profile']['firstName'] = req.body.firstName?req.body.firstName:sampleConfig.demouser_firstName;
    reqbod['profile']['lastName'] = req.body.lastName?req.body.lastName:sampleConfig.demouser_lastName;
    reqbod['profile']['email'] = req.body.email?req.body.email:sampleConfig.demouser_email;
        
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users?activate=true',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization': sampleConfig.oktaapikey
      },
      body: JSON.stringify(reqbod)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(response.body);
    });
  });

  app.post('/deleteuser', (req, res, next) => {
    var optionsDeactivate = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/lifecycle/deactivate?sendEmail=false',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      }
    };

    var optionsDelete = {
      method: 'DELETE',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/'+req.body.userid,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      }
    };
      request(optionsDeactivate, function(error, response, body) {
        if (error) next(error);
        if(response.statusCode === 200){
          request(optionsDelete, function(error, response, body) {
            if (error) next(error);
              res.send(response.body);
          });
        }
      });
  });

  app.post('/updateuser', oidc.ensureAuthenticated(), (req, res, next) => {
    // This is where we see okta token introspection in action on AWS
    const accesstoken = req.userContext.tokens.access_token;
    var useroptions = {
      method: 'POST',
      url: sampleConfig.aws_introspect,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': sampleConfig.aws_oapi_key,
        "Authorization": "Bearer " + accesstoken
      },
      body: JSON.stringify(req.body)
    };

    request(useroptions, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(response.body);
    });
  });

  app.post('/updateuserlocal', (req, res, next) => {
    let r = req.body;
    let userid = req.body.userid;
    delete r['userid'];
    reqbody = {
      profile: {}
    };
    Object.keys(r).forEach(function(key) {
      reqbody['profile'][key] = r[key];
    });
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl+"/api/v1/users/"+userid,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization': sampleConfig.oktaapikey,
      },
      body: JSON.stringify(reqbody)
    };

    request(options, function(error, response, body) {
      if (error) next(error);
      res.send(response.body);
    });
  });


  app.post('/mergeProfile', (req, res, next) => {
    const userid = req.body.userid;
    let payload = req.body;
    delete payload['userid'];
    let reqbody = {
        profile: {}
    };
    Object.keys(payload).forEach(function(key) {
        reqbody['profile'][key] = payload[key];
    });
  
    var useroptions = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + "/api/v1/users/"+ userid,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(reqbody)
    };

    request(useroptions, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(response.body);
    });
  });

  app.post('/updatepassword', (req, res, next) => {
    var bod = {
      "oldPassword": { "value": sampleConfig.anonymouspwd },
      "newPassword": { "value": req.body.newpassword }
    }
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/credentials/change_password',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(bod)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(response.body);
      
    });
  });

  app.post('/getuserbyusername', (req, res, next) => {
    let username = req.body.username;
    Promise.resolve()
      .then(function() {
        return username;
      })
      .then(async function(username) {
        let checkresponse = await searchOktaProfile({'login': username});
        let jsonresponse = JSON.parse(checkresponse);
        var count = Object.keys(jsonresponse).length;
        if (count > 1) {
          res
            .status(500)
            .send('More than one account is linked to this email address.');
        } else if (count == 1) {
          res.json(jsonresponse);
        } else {
          res.status(500).send('Something went wrong');
        }
      });
  });

  app.post('/finduserbyphone', (req, res, next) => {
    let primaryPhone = req.body.primaryPhone;
    Promise.resolve()
      .then(function() {
        return primaryPhone;
      })
      .then(async function(primaryPhone) {
        let checkresponse = await searchOktaProfile({'primaryPhone': primaryPhone});
        let jsonresponse = JSON.parse(checkresponse);
        var count = Object.keys(jsonresponse).length;
        if (count > 1) {
          res
            .status(500)
            .send('More than one account exists with this same phone number');
        } else if (count == 1) {
          res.json(jsonresponse);
        } else {
          res.status(500).send('Something went wrong');
        }
      });
  });

  app.post('/finduserbysearch', (req, res, next) => {
    let searchquery = req.body.searchparams;
    Promise.resolve()
      .then(function() {
        return searchquery;
      })
      .then(async function(searchquery) {
        let checkresponse = await searchOktaProfile(searchquery);
        console.log(checkresponse)
        let jsonresponse = JSON.parse(checkresponse);
        var count = Object.keys(jsonresponse).length;
        if (count > 1) {
          res
            .status(500)
            .send('More than one account exists with this same information');
        } else if (count == 1) {
          res.json(jsonresponse);
        } else {
          res.status(500).send('Something went wrong');
        }
      });
  });

  app.post('/removeuserfromgroup', (req, res, next) => {
    var options = {
      method: 'DELETE',
      url: sampleConfig.tenantBaseUrl + '/api/v1/groups/' + req.body.groupid + '/users/' + req.body.userid,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(req.body)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(JSON.stringify({ response: response.body }));
    });
  });

  app.post('/addusertogroup', (req, res, next) => {
    var options = {
      method: 'PUT',
      url: sampleConfig.tenantBaseUrl + '/api/v1/groups/' + req.body.groupid + '/users/' + req.body.userid,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(req.body)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(JSON.stringify({ response: response.body }));
    });
  });

  

  /** ****************************************************** */
  /** Activate existing user in Okta */
  /** ****************************************************** */
  app.post('/activateuser', (req, res, next) => {
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/lifecycle/activate',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(req.body)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(JSON.stringify({ response: response.body }));
    });
  });

  /** ****************************************************** */
  /** Deactivate existing user in Okta */
  /** ****************************************************** */
  app.post('/deactivateuser', (req, res, next) => {
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + req.body.userid + '/lifecycle/deactivate?sendEmail=false',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(req.body)
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      res.send(JSON.stringify({ response: response.body }));
    });
  });


  /** ****************************************************** */
  /** Authenticate user*/
  /** ****************************************************** */
  app.post('/authn', (req, res, next) => {
    let reqbody = {
      username: req.body.username,
      password: (req.body.password != null)?req.body.password:sampleConfig.anonymouspwd
    };
    var options = {
      method: 'POST',
      url: sampleConfig.tenantBaseUrl + '/api/v1/authn',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Authorization':  sampleConfig.oktaapikey
      },
      body: JSON.stringify(reqbody),
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      if (response.statusCode === 200) {
        res.status(200).send(response.body);
      } else {
        res.status(500).send("I tried to authn but something went wrong.");
      }
    });
  });
  

  /** ****************************************************** */
  /** Check how many users exist in Okta with the same email */
  /** ****************************************************** */
  app.post('/checkdupeuser', oidc.ensureAuthenticated(), (req, res) => {
    let email = req.body.email;

    Promise.resolve()
      .then(function() {
        return email;
      })
      .then(async function(email) {
        // check if the dupe email exists in okta...it will never happen if using okta to register!
        let checkresponse = await searchOktaProfile({'email': email});
        let jsonresponse = JSON.parse(checkresponse);
        var count = Object.keys(jsonresponse).length;
        if (count > 1) {
          res
            .status(500)
            .send(
              'More than one account is linked to this email address. Please use your Rewards ID to sign in.'
            );
        } else if (count == 1) {
          let uid = jsonresponse[0].profile.login;
          res.json(uid);
        } else {
          res.status(500).send('Something went wrong');
        }
      });
  });

  app.get('/signin_widget3', (req, res) => {
    res.render('signin_widget3', {section: 'signin_widget3'});
  });

  app.get('/signin_widgetR', (req, res) => {
    res.render('signin_widgetR', {section: 'signin_widgetR'});
  });

  app.get('/implicit', (req, res) => {
    res.render('implicit', {section: 'signin_widget'});
  });

  app.get('/userinfo', oidc.ensureAuthenticated(), (req, res) => {
    var userinfo;
    if(req.userContext){
      userinfo = req.userContext && req.userContext.userinfo;
    } else if(req.query.data) {
      userinfo = JSON.parse(req.query.data);
    } else {
      userinfo = {};
    }
    const attributes = Object.entries(userinfo);
    res.render('userinfo',
    {
        isLoggedIn: !!userinfo,
        userinfo: userinfo,
        attributes
    });
  });

  app.post('/userinfo', (req, res) => {
    const userinfo = req.body;
    const attributes = Object.entries(userinfo);
    res.render('userinfo',
    {
        isLoggedIn: !!userinfo,
        userinfo: userinfo,
        attributes
    });
  });

  app.get('/passwordless', (req, res) => {
    res.render('passwordless', {section: 'passwordless'});
  });

  app.get('/progressive', (req, res) => {
    var idtokendecoded = '';
    var accesstokendecoded = '';
    if(req.userContext){
      let idtokendecoded = JSON.stringify(
        decodeToken(req.userContext.tokens.id_token),
        null,
        4
      );
      let accesstokendecoded = JSON.stringify(
        decodeToken(req.userContext.tokens.access_token),
        null,
        4
      );
    }
    
    res.render('progressive', 
    {
      section: 'progressive',
      idtokend: idtokendecoded,
      accesstokend: accesstokendecoded,
    });
  });

  app.get('/sso', oidc.ensureAuthenticated(), async (req, res) => {
    const userinfo = req.userContext && req.userContext.userinfo;
    var getapps = await getApps(userinfo.sub);
    //var myapps = JSON.parse(getapps.body);
    var myapps = {};
    var app = {};
    var resbod = JSON.parse(getapps);
    myapps.apps = [];
    for (var i = 0 in resbod) {
      if(resbod[i].label.indexOf("Generated") > 0)
      {
        continue;
      }
      if (
        resbod[i].label === 'DemoPortal' ||
        resbod[i]._links.appLinks.length == 0
      ) {
        continue;
      } 
      app.label = resbod[i].label;
      app.url = resbod[i]._links.appLinks[0].href;
      app.logo = resbod[i]._links.logo[0].href;
      myapps.apps.push(app);
      app = {};
    }
    res.render('sso', {
      isLoggedIn: !!userinfo,
      userinfo: userinfo,
      myapps: myapps,
      section: 'sso'
    });
  });

  app.get('/apiam', oidc.ensureAuthenticated(), async (req, res) => {
    const userinfo = req.userContext && req.userContext.userinfo;
    res.render('apiam', {
        isLoggedIn: !!userinfo,
        accesstoken: req.userContext.tokens.access_token,
        section: 'apiam'
    });
  });

  app.get('/stepup', oidc.ensureAuthenticated(), (req, res) => {
    const userinfo = req.userContext && req.userContext.userinfo;
    let idtokendecoded = JSON.stringify(
      decodeToken(req.userContext.tokens.id_token),
      null,
      4
    );
    let accesstokendecoded = JSON.stringify(
      decodeToken(req.userContext.tokens.access_token),
      null,
      4
    );
    res.render('stepup', {
      isLoggedIn: !!userinfo,
      userinfo: userinfo,
      idtokend: idtokendecoded,
      accesstokend: accesstokendecoded,
      section: 'stepup'
    });
  });

  app.get('/profile', oidc.ensureAuthenticated(), (req, res) => {
    const userinfo = req.userContext && req.userContext.userinfo;
    console.log.info('userinfo: ' + JSON.stringify(userinfo));
    const idtoken = req.userContext.tokens.id_token;
    const accesstoken = req.userContext.tokens.access_token;
    let idtokendecoded = JSON.stringify(
      decodeToken(req.userContext.tokens.id_token),
      null,
      4
    );
    let accesstokendecoded = JSON.stringify(
      decodeToken(req.userContext.tokens.access_token),
      null,
      4
    );
    res.render('profile', {
      isLoggedIn: !!userinfo,
      userinfo: userinfo,
      idtoken: idtoken,
      accesstoken: accesstoken,
      idtokend: idtokendecoded,
      accesstokend: accesstokendecoded
    });
  });

  app.get('/inboundfed', (req, res) => {
    res.render('inboundfed', {
      section: 'inboundfed'
    });
  });

  app.get('/okta2okta', (req, res) => {
    res.render('okta2okta', {
      section: 'okta2okta'
    });
  });

  app.get('/registration', (req, res) => {
    res.render('registration');
  });

  app.get('/passwordless', (req, res) => {
    res.render('passwordless');
  });

  app.get('/android', (req, res) => {
    res.render('android');
  });

  app.get('/ios', (req, res) => {
    res.render('ios');
  });

  app.get('/forgotusername', (req, res) => {
    res.render('forgotusername');
  });

  app.post('/ccflow', (req, res) => {
    var options = {
      'method': 'POST',
      'url': sampleConfig.oidc.issuer+'/v1/token',
      'headers': {
        'Accept': 'application/json',
        'Authorization': 'Basic ' + sampleConfig.basicAuth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form: {
        'grant_type': 'client_credentials',
        'redirect_uri': sampleConfig.appBaseUrl,
      }
    };

      request(options, function (error, response, body) {
        if (error) throw new Error(error);
        res.send(response.body);
      });
  });

  app.get('/profilelinking', async (req, res) => {
    let mergeprofiles = await getaccountmergingprofiles({"firstName":"Profile"});
    let linkprofiles = await getaccountlinkingprofiles(sampleConfig.main_profileid_for_account_linking);
    const linkedobject = Object.entries(linkprofiles);
    let users = JSON.parse(mergeprofiles);
    console.log(users)
    let userinfoA = users[1];
    let userinfoB = users[0];
    res.render('profilelinking', { userinfoA: userinfoA, userinfoB: userinfoB, linkprofiles: linkedobject });
  });

  app.post('/forces-logout', oidc.forceLogoutAndRevoke(), (req, res) => {
    // Nothing here will execute, after the redirects the user will end up wherever the `routes.logoutCallback.afterCallback` specifies (default `/`)
  });

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  oidc.on('ready', () => {
    app.listen(sampleConfig.port, () =>
      console.log.info(`App started on port ${sampleConfig.port}`)
    );
  });
  oidc.on('error', err => {
    // An error occurred while setting up OIDC
    throw err;
  });


  /** ************************************************ */
  /**                   */
  /** HELPER FUNCTIONS */
  /**                   */
  /** ************************************************ */

   /** ****************************************************** */
  /** Get apps for a user - NOTE: modify the current app name below so it does not display in the list */
  /** ****************************************************** */
  getApps = function(userid) {
    return new Promise((resolve, reject) => {
      var options = {
        method: 'GET',
        url: sampleConfig.tenantBaseUrl + '/api/v1/apps?filter=user.id+eq+%22' + userid + '%22',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Authorization':  sampleConfig.oktaapikey
        }
      };

      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        if (response.statusCode === 200) {
          resolve(response.body);
        } else {
          console.log.info("Error fetching apps: ",response.body);
        }
      });
    });
  };

  decodeToken = function(token) {
    let base64Url = token.split('.')[1]; // token you get
    let base64 = base64Url.replace('-', '+').replace('_', '/');
    let decodedData = JSON.parse(
      Buffer.from(base64, 'base64').toString('binary')
    );
    return decodedData;
  }

  /** ****************************************************** */
  /** Invoke inline hooks */
  /** ****************************************************** */
  invokeHook = function(data) {
    const hookid = data.hookid;
    var thebody = data;
    if(thebody.hookid) { delete thebody['hookid']; }

    return new Promise((resolve, reject) => {
      var options = {
        method: 'POST',
        url: sampleConfig.tenantBaseUrl + '/api/v1/inlineHooks/' + hookid + '/execute',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Authorization':  sampleConfig.oktaapikey
        },
        body: JSON.stringify(thebody)
      };

      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        resolve(response);
      });
    });
  };

  /** ****************************************************** */
  /** search Okta profiles - generic search given the input params */
  /** ****************************************************** */
  searchOktaProfile = function(search_values) { 
    var searchString = "?search=";
    Object.keys(search_values).forEach(function(key) {
      searchString += 'profile.' + key + '%20eq%20%22' + search_values[key] + '%22%20and%20'; 
    });
    searchString = searchString.substr(0,searchString.length - 6);
    return new Promise((resolve, reject) => {
      var options = {
        method: 'GET',
        url: sampleConfig.tenantBaseUrl + '/api/v1/users' + searchString,
        headers: {
          'cache-control': 'no-cache',
          'Authorization':  sampleConfig.oktaapikey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        resolve(body);
      });
    });
  };

  /** ****************************************************** */
  /** get Okta profile - get a specific user based on userid */
  /** ****************************************************** */
  getOktaProfile = function(userid) {
    return new Promise((resolve, reject) => {
      var options = {
        method: 'GET',
        url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + userid,
        headers: {
          'cache-control': 'no-cache',
          'Authorization':  sampleConfig.oktaapikey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        resolve(body);
      });
    });
  };

  /** ****************************************************** */
  /** get Linked Object */
  /** ****************************************************** */
  getLinkedObject = function(userid) {
    return new Promise((resolve, reject) => {
      var options = {
        method: 'GET',
        url: sampleConfig.tenantBaseUrl + '/api/v1/users/' + userid + '/linkedObjects/AssociatedUser',
        headers: {
          'cache-control': 'no-cache',
          'Authorization':  sampleConfig.oktaapikey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      request(options, function(error, response, body) {
        if (error) throw new Error(error);
        resolve(body);
      });
    });
  };

  /** ****************************************************** */
  /** Call AWS API endpoint for a sample response...showcasing /introspect and OAuth access */
  /** ****************************************************** */
  app.post('/callapigtw', oidc.ensureAuthenticated(), (req, res) => {
    const apigtw = req.body.apigtw;
    const accesstoken = req.body.accesstoken;
    const accesstokendisplay = accesstoken.substr(0,20);
  
      var calllog =
        'Starting call to ' + apigtw + ' API ... ' + moment().format('LLLL') + '\n\n';
      const awsurl = sampleConfig.apiEndpoints.aws_introspect;
      const azureurl = sampleConfig.apiEndpoints.azure_introspect;
      const gtwurl = (apigtw == 'aws')?awsurl:azureurl;
      calllog = calllog.concat('Using following API: ' + gtwurl + '\n\n');
      calllog = calllog.concat(
        'Using following access token: ' + accesstokendisplay + '...\n\n'
      );
      var optionsaws = {
        url: awsurl,
        method: 'POST', 
        cache: 'no-cache', 
        headers: { 'x-api-key': sampleConfig.aws_oapi_key},
        body: JSON.stringify({ token: accesstoken, authzserver:  sampleConfig.authzserver})
      };
      var optionsazure = {
        url: azureurl,
        method: 'POST',
        cache: 'no-cache',
        headers: {'Ocp-Apim-Subscription-Key': sampleConfig.azureapikey},
        body: JSON.stringify({ token: accesstoken, authzserver:  sampleConfig.authzserver})
      };
      request(apigtw == 'aws'?optionsaws:optionsazure, function(error, response, body) {
        if (error) throw new Error(error);
        var resbod = response.body;
        calllog = calllog.concat(
          'Got response back from '+ apigtw + ' API on ' + moment().format('LLLL') + '\n\n'
        );
        calllog = calllog.concat(
          'RESPONSE: \n' + JSON.stringify(resbod, null, 4)
        );
        
        res.send(calllog);
        
      });
});

  /** ****************************************************** */
  /** Get account merging profiles */
  /** ****************************************************** */
  getaccountmergingprofiles = function(search_values) {
    var body = {};
    return new Promise(async (resolve, reject) => {
      let checkresponse = await searchOktaProfile(search_values);
      let jsonresponse = JSON.parse(checkresponse);
      var count = Object.keys(jsonresponse).length;
      if (count == 2) {
        let uidB = jsonresponse[0].id;
        let firstNameB = jsonresponse[0].profile.firstName;
        let lastNameB = jsonresponse[0].profile.lastName;
        let emailB = jsonresponse[0].profile.email;
        let mobilePhoneB = jsonresponse[0].profile.mobilePhone;
        
        let uidA = jsonresponse[1].id;
        let firstNameA = jsonresponse[1].profile.firstName;
        let lastNameA = jsonresponse[1].profile.lastName;
        let emailA = jsonresponse[1].profile.email;
        let mobilePhoneA = jsonresponse[1].profile.mobilePhone;

        body = JSON.stringify([{'uid':uidA,'firstName':firstNameA,'lastName':lastNameA,'email':emailA,'mobilePhone':mobilePhoneA},{'uid':uidB,'firstName':firstNameB,'lastName':lastNameB,'email':emailB,'mobilePhone':mobilePhoneB}]);
      } 
      resolve(body);
    });
  };

  /** ****************************************************** */
  /** Get account linking profiles */
  /** ****************************************************** */
  getaccountlinkingprofiles = function(userid) {
    var body = [];
    return new Promise(async (resolve, reject) => {
      let checkresponse = await getLinkedObject(userid);
      let jsonresponse = JSON.parse(checkresponse);
      var count = Object.keys(jsonresponse).length;
      for(x = 0; x < count; x++){
        let href = jsonresponse[x]._links.self.href;
        let auid = href.substr(href.lastIndexOf("/")+1);
        let theuser = await getOktaProfile(auid);
        const user = JSON.parse(theuser);
        let uid = user.id;
        let firstName = user.profile.firstName;
        let lastName = user.profile.lastName;
        let email = user.profile.email;
        let city = user.profile.city;
        let status = user.status;
        let badge = status=='ACTIVE'?'info':'danger';
        body.push({'uid':uid,'firstName':firstName,'lastName':lastName,'email':email,'city': city,'status': status,'badge': badge});
      }
      resolve(body);
    });
  };
};
