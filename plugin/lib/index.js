/**
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * @fileoverview Check deprecated SAPUI5 API usage for a specific SAPUI5 version
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

// storage.initSync();
// if (!storage.getItemSync("API")) {
//   let apiUrl =
//     "https://sapui5.hana.ondemand.com/docs/api/api-index-deprecated.json";
//   // let options = context.options;
//   // if (options.length > 0 && options[0].ui5DepreacatedURL) {
//   //   apiUrl = options[0].ui5DepreacatedURL;
//   // }
//   axios
//     .get(apiUrl)
//     .then(function (response) {
//       // handle success
//       storage.setItemSync("API", response.data);
//     })
//     .catch(function (error) {
//       // handle error
//       console.log(error);
//     });
// }

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
