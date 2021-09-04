const fs = require('fs');
const shell = require('shelljs');
const axios = require('axios');
const url = require('url');
const R = require('ramda');

var config = { AUTH_REQUEST: {}, TOKEN_REQUEST: {} };
var oldConfig;
config.DISTRIBUTION = process.env.AUTH_CLOUDFRONT_DIST_ID;
config.AUTHN = process.env.AUTH_AUTHN;
config.AUTH_DISTRIBUTIONS_DIR_PATH = process.env.AUTH_DISTRIBUTIONS_DIR_PATH;
config.CURRENT_DIST_DIR_PATH = process.env.CURRENT_DIST_DIR_PATH;
switch (config.AUTHN) {
  case 'GOOGLE':
    googleConfiguration();
    break;
  case 'MICROSOFT':
    if (R.pathOr('', ['AUTHN'], oldConfig) != "MICROSOFT") {
      oldConfig = undefined;
    }
    config.AUTHN = "MICROSOFT";
    microsoftConfiguration();
    break;
  case 'GITHUB':
    if (R.pathOr('', ['AUTHN'], oldConfig) != "GITHUB") {
      oldConfig = undefined;
    }
    config.AUTHN = "GITHUB";
    githubConfiguration();
    break;
  case 'OKTA':
    if (R.pathOr('', ['AUTHN'], oldConfig) != "OKTA") {
      oldConfig = undefined;
    }
    config.AUTHN = "OKTA";
    oktaConfiguration();
    break;
  case 'AUTH0':
    if (R.pathOr('', ['AUTHN'], oldConfig) != "AUTH0") {
      oldConfig = undefined;
    }
    config.AUTHN = "AUTH0";
    auth0Configuration();
    break;
  case 'CENTRIFY':
    if (R.pathOr('', ['AUTHN'], oldConfig) != "CENTRIFY") {
      oldConfig = undefined;
    }
    config.AUTHN = "CENTRIFY";
    centrifyConfiguration();
    break;
  case 'OKTA_NATIVE':
    if (R.pathOr('', ['AUTHN'], oldConfig) != "OKTA_NATIVE") {
      oldConfig = undefined;
    }
    config.AUTHN = "OKTA_NATIVE";
    oktaConfiguration();
    break;
  default:
    console.log("Provider " + config.AUTHN + " not recognized. Stopping build...");
    process.exit(1);
}

function microsoftConfiguration() {
  return
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      TENANT: {
        message: colors.red("Tenant"),
        required: true,
        default: R.pathOr('', ['TENANT'], oldConfig)
      },
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'client_id'], oldConfig)
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true,
        default: R.pathOr('', ['TOKEN_REQUEST', 'client_secret'], oldConfig)
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'redirect_uri'], oldConfig)
      },
      SESSION_DURATION: {
        message: colors.red("Session Duration (hours)"),
        required: true,
        default: R.pathOr('', ['SESSION_DURATION'], oldConfig) / 60 / 60
      },
      AUTHZ: {
        description: colors.red("Authorization methods:\n   (1) Azure AD Login (default)\n   (2) JSON Username Lookup\n\n   Select an authorization method")
      }
    }
  }, function (err, result) {
    config.PRIVATE_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa', 'utf8');
    config.PUBLIC_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa.pub', 'utf8');
    config.TENANT = result.TENANT;
    config.DISCOVERY_DOCUMENT = 'https://login.microsoftonline.com/' + result.TENANT + '/.well-known/openid-configuration';
    config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10) * 60 * 60;

    config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;

    config.AUTH_REQUEST.client_id = result.CLIENT_ID;
    config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.AUTH_REQUEST.response_type = 'code';
    config.AUTH_REQUEST.response_mode = 'query';
    config.AUTH_REQUEST.scope = 'openid';

    config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
    config.TOKEN_REQUEST.grant_type = 'authorization_code';
    config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;

    config.AUTHZ = result.AUTHZ;

    shell.cp('./authz/microsoft.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
    shell.cp('./authn/openid.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
    shell.cp('./nonce.js', config.CURRENT_DIST_DIR_PATH + '/nonce.js');

    fs.writeFileSync(config.CURRENT_DIST_DIR_PATH + '/config.json', JSON.stringify(result, null, 4));

    switch (result.AUTHZ) {
      case '1':
        shell.cp('./authz/microsoft.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
        writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'nonce.js']);
        break;
      case '2':
        shell.cp('./authz/microsoft.json-username-lookup.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
        prompt.start();
        prompt.message = colors.blue(">>>");
        prompt.get({
          properties: {
            JSON_USERNAME_LOOKUP: {
              description: colors.red("JSON username lookup endpoint"),
              default: R.pathOr('', ['JSON_USERNAME_LOOKUP'], oldConfig)
            }
          }
        }, function (err, result) {
          config.JSON_USERNAME_LOOKUP = result.JSON_USERNAME_LOOKUP;
          writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'nonce.js']);
        });
        break;
      default:
        console.log("Method not recognized. Stopping build...");
    }
  });
}

function googleConfiguration() {
  result = {
    CLIENT_ID: process.env.AUTH_CLIENT_ID,
    CLIENT_SECRET: process.env.AUTH_CLIENT_SECRET,
    REDIRECT_URI: process.env.AUTH_REDIRECT_URI,
    HD: process.env.AUTH_HOST_DOMAIN,
    SESSION_DURATION: process.env.AUTH_SESSION_DURATION_HOURS,
    AUTHZ: process.env.AUTH_AUTHZ,
  }

  config.PRIVATE_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa', 'utf8');
  config.PUBLIC_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa.pub', 'utf8');
  config.DISCOVERY_DOCUMENT = 'https://accounts.google.com/.well-known/openid-configuration';
  config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10) * 60 * 60;

  config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;
  config.HOSTED_DOMAIN = result.HD;

  config.AUTH_REQUEST.client_id = result.CLIENT_ID;
  config.AUTH_REQUEST.response_type = 'code';
  config.AUTH_REQUEST.scope = 'openid email';
  config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;
  config.AUTH_REQUEST.hd = result.HD;

  config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
  config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
  config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
  config.TOKEN_REQUEST.grant_type = 'authorization_code';

  config.AUTHZ = result.AUTHZ;

  shell.cp('./authn/openid.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
  shell.cp('./nonce.js', config.CURRENT_DIST_DIR_PATH + '/nonce.js');

  fs.writeFileSync(config.CURRENT_DIST_DIR_PATH + '/config.json', JSON.stringify(result, null, 4));
  switch (result.AUTHZ) {
    case 'HOSTED_DOMAIN':
      shell.cp('./authz/google.hosted-domain.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
      shell.cp('./nonce.js', config.CURRENT_DIST_DIR_PATH + '/nonce.js');
      writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'nonce.js']);
      break;
    case 'EMAIL_LOOKUP':
      shell.cp('./authz/google.json-email-lookup.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
      prompt.start();
      prompt.message = colors.blue(">>>");
      prompt.get({
        properties: {
          JSON_EMAIL_LOOKUP: {
            description: colors.red("JSON email lookup endpoint"),
            default: R.pathOr('', ['JSON_EMAIL_LOOKUP'], oldConfig)
          }
        }
      }, function (err, result) {
        config.JSON_EMAIL_LOOKUP = result.JSON_EMAIL_LOOKUP;
        writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'nonce.js']);
      });
      break;
    case 'GOOGLE_GROUP_LOOKUP':
      prompt.start();
      prompt.message = colors.blue(">>>");
      prompt.get({
        properties: {
          MOVE: {
            message: colors.red("Place ") + colors.blue("google-authz.json") + colors.red(" file into ") + colors.blue(config.CURRENT_DIST_DIR_PATH) + colors.red(" folder. Press enter when done")
          }
        }
      }, function (err, result) {
        if (!shell.test('-f', config.CURRENT_DIST_DIR_PATH + '/google-authz.json')) {
          console.log('Need google-authz.json to use google groups authentication. Stopping build...');
        } else {
          var googleAuthz = JSON.parse(fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/google-authz.json'));
          if (!googleAuthz.hasOwnProperty('cloudfront_authz_groups')) {
            console.log('google-authz.json is missing cloudfront_authz_groups. Stopping build...');
          } else {
            shell.cp('./authz/google.groups-lookup.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
            googleGroupsConfiguration();
          }
        }
      });
      break;
    default:
      console.log("Method not recognized. Stopping build...");
  }
}

function googleGroupsConfiguration() {
  return
  prompt.start();
  prompt.message = colors.blue(">>>");
  prompt.get({
    properties: {
      SERVICE_ACCOUNT_EMAIL: {
        description: colors.red("Service Account Email"),
        required: true,
        default: R.pathOr('', ['SERVICE_ACCOUNT_EMAIL'], oldConfig)
      }
    }
  }, function (err, result) {
    config.SERVICE_ACCOUNT_EMAIL = result.SERVICE_ACCOUNT_EMAIL;
    writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'google-authz.json']);
  });
}

function oktaConfiguration() {
  return
  var properties = {
    BASE_URL: {
      message: colors.red("Base URL"),
      required: true,
      default: R.pathOr('', ['BASE_URL'], oldConfig)
    },
    CLIENT_ID: {
      message: colors.red("Client ID"),
      required: true,
      default: R.pathOr('', ['AUTH_REQUEST', 'client_id'], oldConfig)
    },
    REDIRECT_URI: {
      message: colors.red("Redirect URI"),
      required: true,
      default: R.pathOr('', ['AUTH_REQUEST', 'redirect_uri'], oldConfig)
    },
    SESSION_DURATION: {
      pattern: /^[0-9]*$/,
      description: colors.red("Session Duration (hours)"),
      message: colors.green("Entry must only contain numbers"),
      required: true,
      default: R.pathOr('', ['SESSION_DURATION'], oldConfig) / 60 / 60
    }
  };

  if (config.AUTHN == 'OKTA') {
    properties['CLIENT_SECRET'] = {
      message: colors.red("Client Secret"),
      required: true,
      default: R.pathOr('', ['TOKEN_REQUEST', 'client_secret'], oldConfig)
    }
  } else if (config.AUTHN == 'OKTA_NATIVE') {
    properties['PKCE_CODE_VERIFIER_LENGTH'] = {
      message: colors.red("Length of random PKCE code_verifier"),
      required: true,
      default: R.pathOr('', ['PKCE_CODE_VERIFIER_LENGTH'], oldConfig)
    }
  }

  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: properties
  }, function (err, result) {
    config.PRIVATE_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa', 'utf8');
    config.PUBLIC_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa.pub', 'utf8');
    config.DISCOVERY_DOCUMENT = result.BASE_URL + '/.well-known/openid-configuration';
    config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10) * 60 * 60;

    config.BASE_URL = result.BASE_URL;
    config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;

    config.AUTH_REQUEST.client_id = result.CLIENT_ID;
    config.AUTH_REQUEST.response_type = 'code';
    config.AUTH_REQUEST.scope = 'openid email';
    config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;

    config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
    config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.TOKEN_REQUEST.grant_type = 'authorization_code';
    var files = ['config.json', 'index.js', 'auth.js', 'nonce.js'];
    if (result.CLIENT_SECRET) {
      config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
      shell.cp('./authn/openid.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
    } else {
      config.PKCE_CODE_VERIFIER_LENGTH = result.PKCE_CODE_VERIFIER_LENGTH || "96";
      shell.cp('./code-challenge.js', config.CURRENT_DIST_DIR_PATH + '/code-challenge.js');
      shell.cp('./authn/pkce.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
      files.push('code-challenge.js');
    }
    config.AUTHZ = "OKTA";

    shell.cp('./nonce.js', config.CURRENT_DIST_DIR_PATH + '/nonce.js');
    fs.writeFileSync(config.CURRENT_DIST_DIR_PATH + '/config.json', JSON.stringify(result, null, 4));
    shell.cp('./authz/okta.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
    writeConfig(config, zip, files);
  });
}

function githubConfiguration() {
  return
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'client_id'], oldConfig)
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true,
        default: R.pathOr('', ['TOKEN_REQUEST', 'client_secret'], oldConfig)
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'redirect_uri'], oldConfig)
      },
      SESSION_DURATION: {
        pattern: /^[0-9]*$/,
        description: colors.red("Session Duration (hours)"),
        message: colors.green("Entry must only contain numbers"),
        required: true,
        default: R.pathOr('', ['SESSION_DURATION'], oldConfig) / 60 / 60
      },
      ORGANIZATION: {
        description: colors.red("Organization"),
        required: true,
        default: R.pathOr('', ['ORGANIZATION'], oldConfig)
      }
    }
  }, function (err, result) {
    axios.get('https://api.github.com/orgs/' + result.ORGANIZATION)
      .then(function (response) {
        if (response.status == 200) {
          config.PRIVATE_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa', 'utf8');
          config.PUBLIC_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa.pub', 'utf8');
          config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10) * 60 * 60;
          config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;
          config.ORGANIZATION = result.ORGANIZATION;
          config.AUTHORIZATION_ENDPOINT = 'https://github.com/login/oauth/authorize';
          config.TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';

          config.AUTH_REQUEST.client_id = result.CLIENT_ID;
          config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;
          config.AUTH_REQUEST.scope = 'read:org user:email';

          config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
          config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
          config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;

          shell.cp('./authz/github.membership-lookup.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
          shell.cp('./authn/github.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
          writeConfig(config, zip, ['config.json', 'index.js', 'auth.js']);
        } else {
          console.log("Organization could not be verified (code " + response.status + "). Stopping build...");
        }
      })
      .catch(function (error) {
        console.log("Organization could not be verified. Stopping build... (" + error.message + ")");
      });
  });
}

// Auth0 configuration
function auth0Configuration() {
  return
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      BASE_URL: {
        message: colors.red("Base URL"),
        required: true,
        default: R.pathOr('', ['BASE_URL'], oldConfig)
      },
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'client_id'], oldConfig)
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true,
        default: R.pathOr('', ['TOKEN_REQUEST', 'client_secret'], oldConfig)
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'redirect_uri'], oldConfig)
      },
      SESSION_DURATION: {
        pattern: /^[0-9]*$/,
        description: colors.red("Session Duration (hours)"),
        message: colors.green("Entry must only contain numbers"),
        required: true,
        default: R.pathOr('', ['SESSION_DURATION'], oldConfig) / 60 / 60
      }
    }
  }, function (err, result) {
    config.PRIVATE_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa', 'utf8');
    config.PUBLIC_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa.pub', 'utf8');
    config.DISCOVERY_DOCUMENT = 'https://' + result.BASE_URL + '/.well-known/openid-configuration';
    config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10) * 60 * 60;

    config.BASE_URL = result.BASE_URL;
    config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;

    config.AUTH_REQUEST.client_id = result.CLIENT_ID;
    config.AUTH_REQUEST.response_type = 'code';
    config.AUTH_REQUEST.scope = 'openid email';
    config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;

    config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
    config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
    config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.TOKEN_REQUEST.grant_type = 'authorization_code';

    config.AUTHZ = "AUTH0";

    shell.cp('./authn/openid.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
    shell.cp('./nonce.js', config.CURRENT_DIST_DIR_PATH + '/nonce.js');

    fs.writeFileSync(config.CURRENT_DIST_DIR_PATH + '/config.json', JSON.stringify(result, null, 4));

    shell.cp('./authz/auth0.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
    writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'nonce.js']);
  });
}

// Centrify configuration
function centrifyConfiguration() {
  return
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      BASE_URL: {
        message: colors.red("Base URL"),
        required: true,
        default: R.pathOr('', ['BASE_URL'], oldConfig)
      },
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'client_id'], oldConfig)
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true,
        default: R.pathOr('', ['TOKEN_REQUEST', 'client_secret'], oldConfig)
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true,
        default: R.pathOr('', ['AUTH_REQUEST', 'redirect_uri'], oldConfig)
      },
      SESSION_DURATION: {
        pattern: /^[0-9]*$/,
        description: colors.red("Session Duration (hours)"),
        message: colors.green("Entry must only contain numbers"),
        required: true,
        default: R.pathOr('', ['SESSION_DURATION'], oldConfig) / 60 / 60
      }
    }
  }, function (err, result) {
    config.PRIVATE_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa', 'utf8');
    config.PUBLIC_KEY = fs.readFileSync(config.CURRENT_DIST_DIR_PATH + '/id_rsa.pub', 'utf8');
    config.DISCOVERY_DOCUMENT = result.BASE_URL + '/.well-known/openid-configuration';
    config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10) * 60 * 60;

    config.BASE_URL = result.BASE_URL;
    config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;

    config.AUTH_REQUEST.client_id = result.CLIENT_ID;
    config.AUTH_REQUEST.response_type = 'code';
    config.AUTH_REQUEST.scope = 'openid email';
    config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;

    config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
    config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
    config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.TOKEN_REQUEST.grant_type = 'authorization_code';

    config.AUTHZ = "CENTRIFY";

    shell.cp('./authn/openid.index.js', config.CURRENT_DIST_DIR_PATH + '/index.js');
    shell.cp('./nonce.js', config.CURRENT_DIST_DIR_PATH + '/nonce.js');

    fs.writeFileSync(config.CURRENT_DIST_DIR_PATH + '/config.json', JSON.stringify(result, null, 4));

    shell.cp('./authz/centrify.js', config.CURRENT_DIST_DIR_PATH + '/auth.js');
    writeConfig(config, zip, ['config.json', 'index.js', 'auth.js', 'nonce.js']);
  });
}

function zip(files) {
  var filesString = '';
  for (var i = 0; i < files.length; i++) {
    filesString += " " + config.CURRENT_DIST_DIR_PATH + "/" + files[i] + " ";
  }
  shell.exec('zip -q distributions/' + config.DISTRIBUTION + '/' + config.DISTRIBUTION + '.zip ' + 'package-lock.json package.json -r node_modules');
  shell.exec('zip -q -r -j distributions/' + config.DISTRIBUTION + '/' + config.DISTRIBUTION + '.zip ' + filesString);
}

function writeConfig(result, callback, files) {
  fs.writeFile(config.CURRENT_DIST_DIR_PATH + '/config.json', JSON.stringify(result, null, 4), (err) => {
    if (err) throw err;
    callback(files);
  });
}
