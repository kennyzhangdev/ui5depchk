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

// module.exports = {
//   rules: {
//     "async-func-name": {
//       create: function (context) {
//         return {
//           FunctionDeclaration(node) {
//             if (node.async && !/Async$/.test(node.id.name)) {
//               context.report({
//                 node,
//                 message: "Async function name must end in 'Async'"
//               });
//             }
//           }
//         };
//       }
//     }
//   }
// };
