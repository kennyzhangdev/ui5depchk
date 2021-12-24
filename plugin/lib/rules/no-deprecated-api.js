"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",

    docs: {
      description: "disallow deprecated API",
      category: "Possible Errors",
      recommended: true,
      url: "https://eslint.org/docs/rules/no-extra-semi"
    },
    fixable: "code",
    schema: [] // no options
  },
  create: function (context) {
    var ui5Version = "1.84";
    const apiUrl =
      "https://sapui5.hana.ondemand.com/docs/api/api-index-deprecated.json";

    //Init

    var request = require("request");
    request.get(apiUrl, function (error, response, body) {
      if (error) {
        console.log(error);
      } else {
        var api = JSON.parse(body);
        var aApis = [];

        Object.entries(api).forEach(([key, value]) => {
          if (value.name <= ui5Version) {
            aApis = aApis.concat(value.apis);
          }
        });

        console.log(aApis);
        var oApiInfo = {};
        for (let i = 0; i < aApis.length; i++) {
          let oApi = aApis[i];
          if (oApiInfo[oApi.control] === undefined) {
            oApiInfo[oApi.control] = {};
          }

          if (oApi.entityName) {
            //Only method deprecated
            oApiInfo[oApi.control][oApi.entityName] = oApi;
          } else {
            //Control deprecated
            oApiInfo[oApi.control]["controlDeprecated"] = oApi;
          }
        }
        console.log(oApiInfo);
      }
    });

    //Todo: collect API

    //Todo: collect deprecated control
    //Todo: collect deprecated methods

    function validateControl(node) {}

    function validateMethod(node) {}

    function validate(node) {
      var sValue = node.value;
      //Ignore non-sap control
      //   if (sValue.indexOf("sap") === -1) {
      //     return;
      //   }
      //https://sapui5.hana.ondemand.com/docs/api/api-index-deprecated.json
    }
    return {
      //   FunctionDeclaration(node) {
      //     if (node.async && !/Async$/.test(node.id.name)) {
      //       context.report({
      //         node,
      //         message: "Async function name must end in 'Async'"
      //       });
      //     }
      //   }
      ArrayExpression(node) {
        validate(node);
      }
    };
  }
};
