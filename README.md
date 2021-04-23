
# Welcome to Okta for CIAM demo app

> Web application running on NodeJS that showcases (a subset of) Okta's capabilities in the world of CIAM (Customer Identity and Access Management)
> 

https://user-images.githubusercontent.com/4019770/115900194-87d33880-a414-11eb-8635-f8a56179b44a.mp4



## Overview

This is a full blown project. The project is organized into several different directories and key files.  This project is built to run either as a standalone Node server locally or on any other web platform that supports NodeJS. Some of the API calls to Okta API are proxied via AWS API Gateway utilizing Lambdas (showcasing API gateway integration and security). The webhooks (registration inline hook and token inline hook run on Azure API gateway with Azure functions as a backend APIs while the event hook runs on AWS using SNS to forward events to email). Code for Lambdas and Functions is included, however instructions for setting up AWS and Azure are NOT included, you're on your own :)

## Get Started

THERE IS A LOT OF LEGWORK TO BE DONE BEFORE YOU CAN RUN THE PROJECT, YOU CANNOT SKIP THESE STEPS AND EXPECT THINGS TO RUN...THE UI MIGHT LOAD BUT YOU WON'T BE ABLE TO DO ANYTHING UNTIL YOU HAVE EVERYTHING SET UP. ALSO PLEASE NOTE, THERE IS A LOT HERE AND I MIGHT HAVE MISSED SOME INSTRUCTIONS OR MAYBE I MISSED TO REMOVE SOME HARDCODED VALUES, IF YOU FIND SOMETHING PLEASE LET ME KNOW AND WHAT BETTER WAY TO LEARN YOURSELF THEN TO DEBUG ;)

First, you should make sure you're environment is setup and ready to go. There are mulltiple moving pieces:
- The application code itself (more on the structure below)
- AWS API Gateway and Lambdas for updating user and hook operations with Okta
- Azure Api Gateway and functions for web hooks and token introspection
- Okta Org settings

## Project Structure

The project has the following main folders:

- _App_
    - _common_
        - _assets_
            - _css_
            - _fonts_
            - _images_
            - _scripts_
            - _vids_
            - _tenant.config.json_
            - _web-server.js_
        - _views_
    - _package.json_
    - _server.js_
- _AWS_
    - _Lambdas_ - all the lambdas you will need
- _Azure_
    - _Functions_ - all the functions you will need

## Configuration

Modify both configuration files below accordingly:

Server side configuration file is located in the root, and it is called _.tenant.config.json_

Client side configuration file is located in common/assets/scripts, and it is called _globalVars.js_

### .tenant.config.json
This is the most important file as it has all your Okta information as well as API keys. Modify accordingly, should be self-explanatory (adjust the port accordingly)

### globalVars.json
This is all your front-end stuff, you will need to do some leg work to find the groupids, userids, etc.

### Other Application configs/hardcoded values
- In Accouunt Linking file there are some hardcoded values for the primary user (Vito Corleone). Modify accordingly if using a different user. (see below)

## Okta Configuration

The following are configuration settings required in your Okta tenant (adjust the app port accordingly):

### Main Application

- Name: DemoPortal
- Type: Web
- Allowed Grant Types: Client Credentials, Authorization Code, Implicit both tokens
- Groups claim filter : groups Matches regex .*

- Login redirect URIs:
    - http://localhost:8899	
    - http://localhost:8899/authorization-code/callback	
    - http://localhost:8899/inboundfed	
    - http://localhost:8899/progressive	
    - http://localhost:8899/implicit
    - http://localhost:8899/about      
            |
- Logout redirect URIs: http://localhost:8899/logout/callback

### Other pieces
- Feature Flags (possibly others)
    - LINKED_OBJECT_PROPERTIES
    - PASSWORDLESS_AUTHN_SIGNON_POLICY
    - UD_MAP_FIELD_TO_LOGIN
    - SELF_SERVICE_REGISTRATION

- Groups (create these first before creating other pieces in Okta)
    - Demo - primary demo group
    - AccountLinking - group for linked accounts
    - Anonymous - group for passwordless
    - PasswordlessEmail - group for passwordless login
    - PasswordlessSMS - group for passwordless login
    - SelfRegistration - group for self registration
    - Social - group for inbound fed via social
    - Prospect - group for progressive profiling
    - Customer - group for progressive profiling

- Authorization server:
    - Add following custom scopes: 
        - gold
        - customer
        - prospect
        - anonymous
    - Add a following rule to a policy:
        - Rule name: prospect
        - Grant type: Authorization code, Implicit
        - User is a member of a specific group: Prospect
        - Scopes requested: openid, profile, prospect
- Okta Profile editor modifications:
    - Base attributes:
        - login: change format restrictions = none
        - firstName: mark as not required
        - lastName: mark as not required
    - Custom Attributes (add these):
        - browser_fingerprint = string
        - oldProfileId = string
        - newsletter = boolean
        - word = string
        - wordSynonyms = string
        - PrimaryAccountHolder = linked object (you should create this via API, call primary object PrimaryAccountHolder and secondary object AssociatedUser)

### Authentication policies (needed for passwordless authentication)
> make sure you have SMS Factor enabled in Multifactor section

- Policy Name: PasswordlessSMS
- Authentication methods: Factor Sequence
    - Choose SMS authenticaation and no additional authentications (basically sms only for factor sequence)
  

### Hooks
- Type: Inline hook - Registration
- Name: Add external data to profile during registration
- URL: [your Azure or AWS api url for the hook]
- Authentication field: Ocp-Apim-Subscription-Key (Azure) or x-api-key (AWS)
- Authentication secret: [your Azure or AWS api key]

- Type: Inline hook - Token
- Name: Add external claims to access token
- URL: [your Azure or AWS api url]
- Authentication field: Ocp-Apim-Subscription-Key (Azure) or x-api-key (AWS)
- Authentication secret: [your Azure or AWS api key]

- Type: Event hook - Event
- Name: Send events to email
- URL: [your AWS api url]
- Authentication field: x-api-key
- Authentication secret: [your AWS api key]
- Subscribe to events: User's Okta profile updated, User created, User signed in and session started, Phone verification SMS sent

The Okta settingS have the following properties:

- Profiles (Hardcoded profileids and factors for account linking)
    - Profile A:
        - Groups: AccountLinking
        - Profile:
            - login: profileA
            - firstName: Profile
            - lastName: A
            - email: [some_user_name]@mailinator.com
        - Profile B:
            - Groups: AccountLinking
            - Profile:
                - login: profileB
                - firstName: Profile
                - lastName: B
                - email: [some_user_name]@mailinator.com (this email MUST be the same as above for user A)
                - primaryPhone: [your_phone_number] (must be a real number as you will get sms on it)
                - mobilePhone: xxxxx
    - (I am using linked objects for the below 4 users. If you do not like the example users you can rename them but will need to update your accountlinking.mustache file accordingly)
        -   Vito Corleone
            - Groups: Demo
            - Profile Status: Active
            - Profile:
                - login: don
                - firstName: Vito
                - lastName: Corleone
                - email: xxxxxx@mailinator.com
                - nickname: Don Corleone
                - primaryPhone: xxxxxx
                - streetAddress: 123 NE Canoli St
                - city: Bronx
                - state: NY
                - zipCode: 10011
                - countryCode: US
                - locale: en_US
                - timezone: America/New_York
                - organization: Syndicate
                - LinkedObject: PrimaryAccountHolder
        - Sonny Corleone
            - Groups: Demo
            - Profile Status: Deactivated
            - Profile:
                - login: sonny
                - firstName: Sonny
                - lastName: Corleone
                - email: xxxxxx@mailinator.com
                - city: New York
                - state: NY
                - LinkedObject: PrimaryAccountHolder Vito Corleone (xxxxxx@mailinator.com)
        - Tom Hagen
            - Groups: Demo
            - Profile Status: Active
            - Profile:
                - login: tom
                - firstName: Tom
                - lastName: Hagen
                - email: xxxxxx@mailinator.com
                - city: Staten Island
                - state: NY
                - LinkedObject: PrimaryAccountHolder Vito Corleone (xxxxxx@mailinator.com)
        - Frank Pentangeli
            - Groups: Demo
            - Profile Status: Active
            - Profile:
                - login: frank
                - firstName: Frank
                - lastName: Pentangeli
                - email: xxxxxx@mailinator.com
                - city: New York
                - state: NY
                - LinkedObject: PrimaryAccountHolder Vito Corleone (xxxxxx@mailinator.com)
                
    - (regular user, used for anonymous/passwordless login via SMS)
        - Name: Anonymous User
        - Groups: PasswordlessSMS
        - Profile Status: Active
        - Profile:
            - login: [phone number that you want to use for demos]
            - firstName: Anonymous
            - lastName: User
            - email: do.not.reply@your-okta-tenant.com
            - primaryPhone: [actual phone number for demos]
            
    - (Salesforce mastered user, used for salesforce inbound fed login, can be any username as long as it starts with 'sf' as that is what the idp discovery rule will look at)
        - Name: SF User
        - Groups: Salesforce idP
        - Profile Status: Active
        - Profile:
            - login: [some username that starts with sf]

- MFA enrollment policies

| Priority     | Name                 | Description                                           | Assigned to group      | Factors  
|--------------|----------------------|-------------------------------------------------------|------------------------|-----------
|       1      | DemoandSelfRegGroup  | A policy that enrolls users into MFA                  | Demo, SelfRegistration | Okta Verify, Google, SMS, Webauthn (all optional, the first time a user is challenged for MFA)

- Authentication policies

| Priority     | Name                 | Description                                           | Assigned to group    | Behavior  | Auth Method 
|--------------|----------------------|-------------------------------------------------------|----------------------|-----------|--------------
|       1      | Verbotten            | A policy to block specific countries, access denied   | Everyone             |           |
|       2      | New City             | Policy based on Behavior Detection for new city       | Demo, Social         | New City  | Pwd + Any factor
|       3      | Always MFA           | A policy to apply MFA every time                      | Demo, Social         |           | Pwd + Any factor
|       4      | Passwordless (sms)   | Policy for users doing passwordless via sms           | PasswordlessSMS      |           | Factor Sequence (sms)
|       4      | Passwordless (email) | Policy for users doing passwordless via email         | PasswordlessEmail    |           | Factor Sequence (email)
|       4      | FactorSequence       | Policy for passwordless access                        | Demo                 |           | Factor Sequence (sms OR webauthn OR password)

### Social Auth Providers

- Facebook
- Google
- Microsoft

### B2B IDPs

- Salesforce IDP
- Azure IDP
- Other okta tenant (Okta2Okta)

### Running the app
From the App root folder:

```bash
$ npm install
$ npm run okta-demo
```

If everything goes well, you should see output similar to the following:

```bash
$ App started on port 8899
```

After starting the server, you should be able to browse to the main application page by navigating to http://localhost:8899

