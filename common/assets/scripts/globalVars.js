/** GLOBAL VARIABLES - MODIFY ACCORDINGLY **/
/*******************************************/
const oktaBaseTenant = "[YOUR OKTA TENANT_URL]";
const localhost = "http://localhost:8899"; // make sure the port matches and that you have added the localhost to your trust4ed origins in okta
const clientId = "[YOUR OKTA APP CLIENT ID]";
const issuer = "[YOUR API AM AS SERVER]"; // if not using custom one it will be default, you must specify one here
const redirectUri_implicit = localhost+"/implicit";
const redirectUri_ac = localhost+"/authorization-code/callback";
const redirectUri_inboundfed = localhost+"/inboundfed";
const scopes = ["openid", "profile", "email"];
const logo = "../assets/images/okta.png"; // change logo as needed
const idps_social = [
        {type: "FACEBOOK", id: "[YOUR FACEBOOK IDP ID FROM OKTA]"},
        {type: "GOOGLE", id: "[YOUR GOOGLE IDP ID FROM OKTA]"}
    ];
const idps_b2b = [
        {id: "[YOUR OKTA SALESFORCE IDP ID]", text: "Login with Salesforce", className: "with-sf" },
        {id: "[YOUR OKTA AZURE IDP ID]", text: "Login with Azure", className: "with-azure" },
    ];
const signin_with_okta = issuer + '/v1/authorize?client_id=' + clientId + '&response_type=token&scope=openid%20profile&redirect_uri=http%3A%2F%2Flocalhost%3A8899&state={{csrfToken}}&nonce=foo123'; // modify the redirect_uri accordingly
const bookmarkApp = oktaBaseTenant+"[BOOKMARK URL TO THE BOOKMARK APP POINTING TO THE ACTUAL SALESFORCE APP]"; // used for idp discovery and routing
const authorize_url = issuer+"/v1/authorize?client_id="+clientId+"&redirect_uri="+redirectUri_inboundfed+"&response_mode=fragment&response_type=id_token%20token&scope=openid%20profile&state=state1234&nonce=a1b2c3random&display=page&prompt=none";
const prospect_group = "[YOUR PROSPECT GROUP ID]";
const customer_group = "[YOUUR CUSTOMER GROUP ID]";
const demo_group = "[YOUR DEMO GROUP ID]"; // this is the main demo group
const passwordlessSMS_group = "[YOUR PASSWORDLESS GROUP ID]";
const profileA = '[PROFILE A ID]'; 
const profileA_factorId = '[PROFILE A FACTOR ID]'; // user should already be inrolled in MFA before running this demo
const profileB = '[PROFILE B ID]';
const profileB_factorId = '[PROFILE B FACTOR ID]';
const udp_ios_app = "[YOUR UDP IOS APP URL]"; // Okta internal/employees only, or you can point to your local ios app/emulator
const udp_android_app = "[YOUR UDP ANDROID APP URL]"; // Okta internal/employees only, or you can point to your local android app/emulator
const okta2okta_config = {
    baseUrl: "[YOUR OTHER OKTA TENANT]",
    clientId: "[YOUR OTHER OKTA TENANT CLIENT ID]",
    redirectUri: "http://localhost:8899/okta2okta", // make sure you have this in your other okta tenant as trusted origins
    authParams: {
        issuer: "[YOUR OTHER OKTA TENANT DEFAULT AUTHORIZATION SERVER]",
        display: "page",
        responseType: ["id_token", "token"],
        scopes: ["openid", "profile"]
    },
    idps: [
        {id: "[YOUR OTHER OKTA TENANT IDP FOR CIAM TENANT]", text: "Login with Okta", className: "with-okta" }
    ],
    idpDisplay: "PRIMARY",
    logo: logo,
    features: {
        router: true,
        rememberMe: false,
        multiOptionalFactorEnroll: true,
        idpDiscovery: true
    },
    idpDiscovery: {
        requestContext: "[YOUR BOOKMARK APP POINTING TO THE ACTUAL APP FOR CIAM TENANT IN THE OTHER OKTA TENANT]" 
    },
    apikey: '[YOUR API KEY FROM YOUR OTHER OKTA TENANT]'
}
/*******************************************/