/**
 * @fileoverview Rule to disallow deprecated SAPUI5 api
 * @author Kenny Zhang
 */

"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

var mDeprecated = {};
var mModule = {};
var mVariableModule = {};
var DEPRECATED_API;
var aApis = [];

//Init
var ui5version;

const apiUrl =
  "https://sapui5.hana.ondemand.com/docs/api/api-index-deprecated.json";

//Collect UI5 deprecation info
var request = require("sync-request");
try {
  let res = request("GET", apiUrl);
  var body = res.getBody("utf8");
  DEPRECATED_API = JSON.parse(body);
} catch (e) {
  console.log(e);
}
/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",

    docs: {
      description: "disallow deprecated API",
      category: "Possible Errors",
      recommended: false,
      url: "https://sapui5.hana.ondemand.com/#/api"
    },

    schema: [
      {
        type: "Object"
      }
    ]
  },

  create: function (context) {
    //Assemble deprecated API only once
    if (aApis.length === 0) {
      var options = context.options;
      if (options.length > 0 && options[0].ui5version) {
        ui5version = options[0].ui5version;
      }

      ui5version = ui5version ? ui5version : "latest";
      console.log("Target UI5 version is: " + ui5version);

      Object.entries(DEPRECATED_API).forEach(([key, value]) => {
        if (
          ui5version === "latest" ||
          parseFloat(key) <= parseFloat(ui5version)
        ) {
          aApis = aApis.concat(value.apis);
        }
      });

      for (let i = 0; i < aApis.length; i++) {
        let oApi = aApis[i];
        if (mDeprecated[oApi.control] === undefined) {
          mDeprecated[oApi.control] = {};
        }

        if (oApi.entityName) {
          //Method deprecated
          mDeprecated[oApi.control][oApi.entityName] = oApi;
        } else {
          //Control deprecated
          mDeprecated[oApi.control]["controlDeprecated"] = oApi;
        }
      }
    }

    function validateModule(node) {
      var oArrayExpressionNode, oFunctionExpressionNode;
      if (!node.body[0].expression.arguments) {
        return; //node type "AssignmentExpression"
      }
      node.body[0].expression.arguments.forEach(function (argument) {
        if (argument.type === "ArrayExpression") {
          oArrayExpressionNode = argument;
        } else if (argument.type === "FunctionExpression") {
          oFunctionExpressionNode = argument;
        }
      });

      if (
        oArrayExpressionNode.elements.length !==
        oFunctionExpressionNode.params.length
      ) {
        context.report({
          node: oArrayExpressionNode,
          message:
            "AMD Defined modules do not match in function param, if not fixed, the report may be incorrect"
        });
        return;
      }

      var aModule = oArrayExpressionNode.elements;
      for (let i = 0; i < aModule.length; i++) {
        var sModule = aModule[i].value;

        //Ignore non-SAP control
        if (sModule.indexOf("sap") === -1) {
          continue;
        }

        let sStdModule = sModule.replace(/\//g, "."); //sap/m/Table -> sap.m.Table
        //Incase AMD module more than function parameters
        if (oFunctionExpressionNode.params[i]) {
          var sVariableName = oFunctionExpressionNode.params[i].name;
          mModule[sVariableName] = sStdModule;

          checkDeprecation(aModule[i], sStdModule, "");
        }
      }
    }
    function checkDeprecation(node, module, method) {
      // console.log("-------------------------------------------");
      // console.log(node.loc.start.line + "|" + module + "|" + method);

      if (!module) {
        return;
      }
      if (mDeprecated[module] && mDeprecated[module]["controlDeprecated"]) {
        context.report({
          node: node,
          message:
            module +
            " is deprecated. " +
            mDeprecated[module]["controlDeprecated"].text
        });
      }
      if (method !== "" && mDeprecated[module] && mDeprecated[module][method]) {
        context.report({
          node: node,
          message:
            module +
            "#" +
            method +
            " is deprecated. " +
            mDeprecated[module][method].text
        });
      }
    }

    function validateNew(node) {
      var sStdModule;
      var sClassName = node.callee.name;
      if (sClassName) {
        sStdModule = mModule[sClassName];
      } else {
        sStdModule = _ModuleFromMemberExpression(node.callee, "");
      }

      if (!sStdModule) {
        // console.log(sClassName + " is not a SAPUI5 module");
        return;
      }
      checkDeprecation(node, sStdModule, "");
    }

    function processVariable(node) {
      var oVariableDeclarator = node.declarations[0];

      //Ignore for(var i in array)
      if (node.parent.type === "ForInStatement") {
        return;
      }
      //Ignore variable definition only, like: var a;
      if (!oVariableDeclarator.init) {
        return;
      }

      var sVariableName = oVariableDeclarator.id.name;
      //Ignore statement like: var sNavMode = oTestTable.getNavigationMode();
      if (oVariableDeclarator.init.type === "Identifier") {
        //Check statement: var oTable1 = oTable2
        var sRightVariableName = oVariableDeclarator.init.name;
        mVariableModule[sVariableName] = mVariableModule[sRightVariableName];
      } else if (oVariableDeclarator.init.type === "NewExpression") {
        //Check statement: var oTable1 = new sap.ui.table.Table();
        var sStdModule;
        var sClassName = oVariableDeclarator.init.callee.name;
        if (sClassName) {
          sStdModule = mModule[sClassName];
        } else {
          sStdModule = _ModuleFromMemberExpression(
            oVariableDeclarator.init.callee,
            ""
          );
        }
        if (!sStdModule) {
          // console.log(sClassName + " is not a SAPUI5 module");
          return;
        }

        mVariableModule[sVariableName] = sStdModule;
      }
    }

    function processAssignedVariable(node) {
      //node.left.type === "Identifier"

      var sVariableName;
      //var a; a = new Table();
      if (node.left.type === "Identifier") {
        sVariableName = node.left.name;
      } else if (node.left.type === "MemberExpression") {
        sVariableName = node.left.property.name;
      }
      if (node.right.type !== "NewExpression") {
        return;
      }

      var sClassName = node.right.callee.name;
      var sStdModule;
      if (sClassName) {
        sStdModule = mModule[sClassName];
      } else {
        if (node.right.type === "NewExpression") {
          sStdModule = _ModuleFromMemberExpression(node.right.callee, "");
        } else {
          sStdModule = _ModuleFromMemberExpression(node.right.init.callee, "");
        }
      }

      mVariableModule[sVariableName] = sStdModule;
    }

    function validateMethod(node) {
      if (!node.callee || !node.callee.object) {
        return;
      }
      var sStdModule, sMethodName;

      //Check static method jQuery.sap.log.debug("123");
      if (node.callee.object.type === "MemberExpression") {
        //Variable method like this.oTable.getSelectedIndex() should also process
        let sModuleMethod = _ModuleFromMemberExpression(node.callee, "");
        [sStdModule, sMethodName] = _staticModuleMethod(sModuleMethod); //sStdModule may also be variable name
        if (mVariableModule[sStdModule]) {
          sStdModule = mVariableModule[sStdModule];
        }
      } else if (node.callee.object.type === "Identifier") {
        var sVariableName = node.callee.object.name;
        sStdModule = mVariableModule[sVariableName];
        if (!sStdModule) {
          sStdModule = mModule[sVariableName]; //Code like: Controller.extend
        }
        sMethodName = node.callee.property.name;
      }
      checkDeprecation(node, sStdModule, sMethodName);
    }

    function _staticModuleMethod(sModuleMethod) {
      let lastIndex = sModuleMethod.lastIndexOf(".");
      if (lastIndex === -1) {
        return [null, null];
      } else {
        return [
          sModuleMethod.substr(0, lastIndex),
          sModuleMethod.substr(lastIndex + 1)
        ];
      }
    }

    //extract global variable like sap.ui.model.odata.ODataModel from new sap.ui.model.odata.ODataModel();
    function _ModuleFromMemberExpression(node, sChildName) {
      if (node.object) {
        return _ModuleFromMemberExpression(
          node.object,
          sChildName === ""
            ? node.property.name
            : node.property.name + "." + sChildName
        );
      } else if (node.type === "ThisExpression") {
        return sChildName;
      } else {
        return sChildName === "" ? node.name : node.name + "." + sChildName;
      }
    }
    return {
      //UI5 AMD control validate
      Program(node) {
        validateModule(node);
      },
      VariableDeclaration(node) {
        processVariable(node);
      },

      AssignmentExpression(node) {
        processAssignedVariable(node);
      },
      NewExpression(node) {
        validateNew(node);
      },
      CallExpression(node) {
        validateMethod(node);
      }
    };
  }
};
