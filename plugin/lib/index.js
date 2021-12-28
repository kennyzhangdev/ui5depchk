/**
 * @fileoverview Check deprecated API usage for a specific SAPUI5 version
 * @author eslint-plugin-ui5depchk
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const requireIndex = require("requireindex");

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------
var axios = require("axios");
const storage = require("node-persist");
storage.initSync();
if (!storage.getItemSync("API")) {
  const apiUrl =
    "https://sapui5.hana.ondemand.com/docs/api/api-index-deprecated.json";
  axios
    .get(apiUrl)

    .then(function (response) {
      // handle success
      storage.setItemSync("API", response.data);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
}

module.exports = {
  rules: requireIndex(__dirname + "/rules"),
  environments: {
    jquery: {
      globals: {
        $: true
      }
    }
  }
};
