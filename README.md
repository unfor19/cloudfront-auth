# cloudfront-auth

**Work-In-Progress (WIP)**

An attempt to automate the build process of AWS Lambda@Edge function, that is used for authentication and authorization.

## Requirements

- Docker

## Getting Started

### Configure an Identity Provider (IdP)

#### Google SSO

<details>

<summary>Expand/Collapse</summary>

### Create Google's Credentials

1. [Google Developer Console](https://console.cloud.google.com/apis/dashboard?pli=1) > [Create a New Project](https://console.cloud.google.com/projectcreate?previousPage=%2Fapis%2Fdashboard%3Fproject%3Dkubemaster-me&folder=&organizationId=0)
    - Project Name: `app`
    - Organization: Leave empty
2. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) > Select **External** > Click **CREATE**
    - App name: `app`
    - User support email: `your email address`
    - Authorised domains > Add domain > `example.com`
    - Developer contact information: `your email address`
    Click **SAVE AND CONTINUE**
3. **Scopes** > Click **SAVE AND CONTINTUE** - there's no need for a scope, we don't plan on using Google APIs (authorization), we just need the authentication mechanism (OAuth2/OIDC)
4. (Optional) **Test users** > Click **SAVE AND CONTINTUE** - it's irrelevant since either way we're allowing any Google user to login to the app since it's a local app
5. **Summary** > Click **BACK TO DASHBOARD** 
6. **NOTE**: There's no need to **PUBLISH APP**, keep it in sandbox mode
7. [Credentials](https://console.cloud.google.com/apis/credentials) > Click **CREATE CREDENTIALS** > Select **OAuth Client ID** > Select Application type **Web application**
    - Name: `app-sso`
    - Authorised JavaScript origins **ADD URI** > `https://app.example.com`
    - Authorised redirect URIs **ADD URI** > `https://app.example.com/callback`
    Click **CREATE**
    - Save **Your Client ID** and **Your Client Secret** in a safe place, we'll use them in the following section

</details>

### Build The Function Locally

1. Set environment variables according to your application and IdP, either with `export MY_VAR=MY_VALUE` or with the `.env` file
   ```bash
   AUTHN="GOOGLE" # Identity Provider (IdP)
   AUTH_AUTHZ="HOSTED_DOMAIN" # Authorize by email domain   
   AUTH_HOST_DOMAIN="example.com" # Only users with this domain will be authorized to login
   AUTH_REDIRECT_URI="https://app.example.com/callback"
   AUTH_CLIENT_ID="myClientId"
   AUTH_CLIENT_SECRET="myClientSecret"
   AUTH_CLOUDFRONT_DIST_ID="E1TU2EGCZDDALR"   
   AUTH_SESSION_DURATION_HOURS=12
   ```

2. Run a container that will build your customized Lambda@Edge function
   ```bash
   # Copy `env` to `.env`, or pass environment variables with `-e MY_VAR=MY_VALUE`
   docker run --rm -it --env-file .env -v "${PWD}/distributions/":/usr/src/app/distributions/ -v "${PWD}/out/":/usr/src/app/out/ unfor19/cloudfront-auth
   # Check for a new ZIP file in PWD/out/, named after your CloudFront Distribution ID, like `E1TU2EGCZDDALR.zip`
   ```

Some explanations about the Docker volume mounts

1. `-v "${PWD}/distributions/":/usr/src/app/distributions/` - Contains a sub-directory per CloudFront Distribution Id. Each directory contains the artifacts that will be zipped per distribution. This mount is for debugging purposes, to see what's inside the package. Also, the `pem` and `pub` are generated only if they don't exist, so having this mount means you'll use the same `pem` and `pub` keys per distribution, instead of generating new ones.
2. `-v "${PWD}/out/":/usr/src/app/out/` - Contains the final artifacts `${DISTRIBUTION_ID}.ZIP` files. The ZIP file is then uploaded as the Lambda@Edge function code.

## Local Development

Clone or fork this repository.

### App Docker Image

1. **Build** a Docker image
   ```bash
   docker build -t cloudfront-auth .
   ```
1. **Run** a Docker container
   ```bash
   # Copy `env` to `.env`, or pass environment variables with `-e MY_VAR=MY_VALUE`
   docker run --rm -it --env-file .env -v "${PWD}/distributions/":/usr/src/app/distributions/ -v "${PWD}/out/":/usr/src/app/out/ cloudfront-auth
   ```
1. **Artifact**: The final artifact after running running the container will be a ZIP file, like `E1TU2EGCZDDALR.zip`. The ZIP file is a ready-to-deploy [**Viewer-Request** Lambda@Edge Function](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html).

TODO: Add code snippets of how to automatically deploy this function as part of CloudFormation/Terraform.

### Development Docker Image

1. **Build** a Docker image
   ```bash
   docker build -t cloudfront-auth:dev --target=dev .
   ```
1. **Run** a Docker container
   ```bash
   # Copy `env` to `.env`, or pass environment variables with `-e MY_VAR=MY_VALUE`
   docker run --rm -it --env-file .env -v "$PWD":/usr/src/app/ cloudfront-auth:dev
   ```
1. **Build app in container**
  ```bash
  # Make sure you set environment variables according to the `env` file before executing this command
  yarn build:ci
  ```
4. **Artifact**: check the directories `/usr/src/app/distributions` and `/usr/src/app/out`

### Run 

# Original README.md

<details>

<summary>Expand/Collapse</summary>

[Google Apps (G Suite)](https://developers.google.com/identity/protocols/OpenIDConnect), [Microsoft Azure AD](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-protocols-oauth-code), [GitHub](https://developer.github.com/apps/building-oauth-apps/authorization-options-for-oauth-apps/), [OKTA](https://www.okta.com/), [Auth0](https://auth0.com/), [Centrify](https://centrify.com) authentication for [CloudFront](https://aws.amazon.com/cloudfront/) using [Lambda@Edge](http://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html). The original use case for `cloudfront-auth` was to serve private S3 content over HTTPS without running a proxy server in EC2 to authenticate requests; but `cloudfront-auth` can be used authenticate requests of any Cloudfront origin configuration.

## Description

Upon successful authentication, a cookie (named `TOKEN`) with the value of a signed JWT is set and the user redirected back to the originally requested path. Upon each request, Lambda@Edge checks the JWT for validity (signature, expiration date, audience and matching hosted domain) and will redirect the user to configured provider's login when their session has timed out.

## Usage

If your CloudFront distribution is pointed at a S3 bucket, [configure origin access identity](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html#private-content-creating-oai-console) so S3 objects can be stored with private permissions. (Origin access identity requires the S3 ACL owner be the account owner. Use our [s3-object-owner-monitor](https://github.com/Widen/s3-object-owner-monitor) Lambda function if writing objects across multiple accounts.)

Enable SSL/HTTPS on your CloudFront distribution; AWS Certificate Manager can be used to provision a no-cost certificate.

Session duration is defined as the number of hours that the JWT is valid for. After session expiration, cloudfront-auth will redirect the user to the configured provider to re-authenticate. RSA keys are used to sign and validate the JWT. If the files `id_rsa` and `id_rsa.pub` do not exist they will be automatically generated by the build. To disable all issued JWTs upload a new ZIP using the Lambda Console after deleting the `id_rsa` and `id_rsa.pub` files (a new key will be automatically generated).

## Identity Provider Guides

### Github

1. Clone or download this repo
1. Navigate to your organization's [profile page](https://github.com/settings/profile), then choose OAuth Apps under Developer settings.
   1. Select **New OAuth App**
   1. For **Authorization callback URL** enter your Cloudfront hostname with your preferred path value for the authorization callback. Example: `https://my-cloudfront-site.example.com/_callback`
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
   1. Choose `Github` as the authorization method and enter the values for Client ID, Client Secret, Redirect URI, Session Duration and Organization
      - cloudfront-auth will check that users are a member of the entered Organization.
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

### Google

1. Clone or download this repo
1. Go to the **Credentials** tab of your [Google developers console](https://console.developers.google.com)
   1. Create a new Project
   1. Create an **OAuth Client ID** from the **Create credentials** menu
   1. Select **Web application** for the Application type
   1. Under **Authorized redirect URIs**, enter your Cloudfront hostname with your preferred path value for the authorization callback. Example: `https://my-cloudfront-site.example.com/_callback`
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
1. Choose `Google` as the authorization method and enter the values for Client ID, Client Secret, Redirect URI, Hosted Domain and Session Duration
1. Select the preferred authentication method
   1. Hosted Domain (verify email's domain matches that of the given hosted domain)
   1. JSON Email Lookup
      1. Enter your JSON Email Lookup URL (example below) that consists of a single JSON array of emails to search through
   1. Google Groups Lookup
      1. [Use Google Groups to authorize users](https://github.com/Widen/cloudfront-auth/wiki/Google-Groups-Setup)
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

### Microsoft Azure

1. Clone or download this repo
1. In your Azure portal, go to Azure Active Directory and select **App registrations**
   1. Create a new application registration with an application type of **Web app / api**
   1. Once created, go to your application `Settings -> Keys` and make a new key with your desired duration. Click save and copy the value. This will be your `client_secret`
   1. Above where you selected `Keys`, go to `Reply URLs` and enter your Cloudfront hostname with your preferred path value for the authorization callback. Example: https://my-cloudfront-site.example.com/_callback
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
1. Choose `Microsoft` as the authorization method and enter the values for [Tenant](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-howto-tenant), Client ID (**Application ID**), Client Secret (**previously created key**), Redirect URI and Session Duration
1. Select the preferred authentication method
   1. Azure AD Membership (default)
   1. JSON Username Lookup
      1. Enter your JSON Username Lookup URL (example below) that consists of a single JSON array of usernames to search through
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

### OKTA

1. Clone or download this repo
1. Sign in to OKTA with your administrator account and navigate to the `Applications` tab.
1. Add Application
   1. Select the `Web` application type
   1. Base URI: CloudFront distribution domain name (`https://{cf-endpoint}.cloudfront.net`)
   1. Login Redirect URI: CloudFront distribution domain name with callback path (`https://{cf-endpoint}.cloudfront.net/_callback`)
   1. Group Assignments: Optional
   1. Grant Type Allowed: Authorization Code
   1. Done
1. Gather the following information for Lambda configuration
   1. Client Id and Client Secret from the application created in our previous step (can be found at the bottom of the general tab)
   1. Base Url
      1. This is named the 'Org URL' and can be found in the top right of the Dashboard tab.
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
1. Choose `OKTA` as the authorization method and enter the values for Base URL (Org URL), Client ID, Client Secret, Redirect URI, and Session Duration
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

### Auth0

1. Clone or download this repo
1. Go to the **Dashboard** of your Auth0 admin page
   1. Click **New Application**
   1. Select **Regular Web App** and click **Create**.
   1. Now select an application type and follow the steps for 'Quick Start' or use your own app.
   1. Go to application **Settings** and enter required details. In **Allowed Callback URLs** enter your Cloudfront hostname with your preferred path value for the authorization callback. Example: `https://my-cloudfront-site.example.com/_callback`
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
1. Choose `AUTH0` as the authorization method and enter the values for Base URL (Auth0 Domain), Client ID, Client Secret, Redirect URI, and Session Duration
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

### Centrify

1. Clone or download this repo
1. Go to the **Dashboard** of your Centrify admin page
   1. Click **Web Apps** from the LHS.
   1. Click **Add Web App** and select the **Custom Tab**.
   1. Add an **OpenID Connect** webapp and click **Yes** to confirm.
1. Fill in naming and logo information and then switch to the **Trust** tab.
1. Enter service provider information. In **Authorized Redirect URIs** enter your Cloudfront hostname with your preferred path value for the authorization callback. Example: `https://my-cloudfront-site.example.com/_callback`
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
1. Choose `CENTRIFY` as the authorization method and enter the values for Base URL (Centrify Resource application URL), Client ID, Client Secret, Redirect URI, and Session Duration (which is available from the **Tokens** tab).
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

### OKTA Native

1. Clone or download this repo
1. Sign in to OKTA with your administrator account and navigate to the `Applications` tab.
1. Add Application
   1. Select the `Native` application type
   1. Base URI: CloudFront distribution domain name (`https://{cf-endpoint}.cloudfront.net`)
   1. Login Redirect URI: CloudFront distribution domain name with callback path (`https://{cf-endpoint}.cloudfront.net/_callback`)
   1. Group Assignments: Optional
   1. Grant Type Allowed: Authorization Code
   1. Done
1. Gather the following information for Lambda configuration
   1. Client Id from the application created in our previous step (can be found at the bottom of the general tab)
   1. Base Url
      1. This is named the 'Org URL' and can be found in the top right of the Dashboard tab.
1. Execute `./build.sh` in the downloaded directory. NPM will run to download dependencies and a RSA key will be generated.
1. Choose `OKTA Native` as the authorization method and enter the values for Base URL (Org URL), Client ID, PKCE Code Verifier Length, Redirect URI, and Session Duration
1. Upload the resulting `zip` file found in your distribution folder using the AWS Lambda console and jump to the [configuration step](#configure-lambda-and-cloudfront)

## Configure Lambda and CloudFront

[Manual Deployment](https://github.com/Widen/cloudfront-auth/wiki/Manual-Deployment) **_or_** [AWS SAM Deployment](https://github.com/Widen/cloudfront-auth/wiki/AWS-SAM-Deployment)

## Authorization Method Examples

- [Use Google Groups to authorize users](https://github.com/Widen/cloudfront-auth/wiki/Google-Groups-Setup)

- JSON array of email addresses

  ```
  [ "foo@gmail.com", "bar@gmail.com" ]
  ```

## Testing

Detailed instructions on testing your function can be found [in the Wiki](https://github.com/Widen/cloudfront-auth/wiki/Debug-&-Test).

## Build Requirements
 - [npm](https://www.npmjs.com/) ^5.6.0
 - [node](https://nodejs.org/en/) ^10.0
 - [openssl](https://www.openssl.org)

## Contributing

All contributions are welcome. Please create an issue in order open up communication with the community.

When implementing a new flow or using an already implemented flow, be sure to follow the same style used in `build.js`. The config.json file should have an object for each request made. For example, `openid.index.js` converts config.AUTH_REQUEST and config.TOKEN_REQUEST to querystrings for simplified requests (after adding dynamic variables such as state or nonce). For implementations that are not generic (most), endpoints are hardcoded in to the config (or discovery documents).

Be considerate of our [limitations](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-lambda-at-edge). The zipped function can be no more than 1MB in size and execution cannot take longer than 5 seconds, so we must pay close attention to the size of our dependencies and complexity of operations.

</details>