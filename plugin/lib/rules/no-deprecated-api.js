"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

var mDeprecated = {};
var mModule = {};
var mVariableModule = {};
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
    //Init
    var ui5Version = "1.84";
    const apiUrl =
      "https://sapui5.hana.ondemand.com/docs/api/api-index-deprecated.json";

    //Collect UI5 deprecation info
    var request = require("sync-request");
    try {
      let res = request("GET", apiUrl);
      var body = res.getBody("utf8");
      var api = JSON.parse(body);
      var aApis = [];

      Object.entries(api).forEach(([key, value]) => {
        if (value.name <= ui5Version) {
          aApis = aApis.concat(value.apis);
        }
      });

      for (let i = 0; i < aApis.length; i++) {
        let oApi = aApis[i];
        if (mDeprecated[oApi.control] === undefined) {
          mDeprecated[oApi.control] = {};
        }

        if (oApi.entityName) {
          //Only method deprecated
          mDeprecated[oApi.control][oApi.entityName] = oApi;
        } else {
          //Control deprecated
          mDeprecated[oApi.control]["controlDeprecated"] = oApi;
        }
      }
    } catch (e) {
      console.log(e);
    }

    function validateModule(node) {
      var oArrayExpressionNode, oFunctionExpressionNode;
      node.body[0].expression.arguments.forEach(function (argument) {
        if (argument.type === "ArrayExpression") {
          oArrayExpressionNode = argument;
        } else if (argument.type === "FunctionExpression") {
          oFunctionExpressionNode = argument;
        }
      });

      var aModule = oArrayExpressionNode.elements;
      for (let i = 0; i < aModule.length; i++) {
        var sModule = aModule[i].value;

        //Ignore non-SAP control
        if (sModule.indexOf("sap") === -1) {
          continue;
        }

        let sStdModule = sModule.replace(/\//g, "."); //sap/m/Table -> sap.m.Table
        var sVariableName = oFunctionExpressionNode.params[i].name;
        mModule[sVariableName] = sStdModule;

        checkDeprecation(aModule[i], sStdModule, "");
      }
    }
    function checkDeprecation(node, module, method) {
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
        console.log(sClassName + " is not a SAPUI5 module");
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
          console.log(sClassName + " is not a SAPUI5 module");
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
        return; //Todo: var b = new Table(); var a = b;
      }

      var sClassName = node.right.callee.name;
      var sStdModule;
      if (sClassName) {
        sStdModule = mModule[sClassName];
      } else {
        sStdModule = _ModuleFromMemberExpression(node.right.init.callee, "");
      }

      mVariableModule[sVariableName] = sStdModule;
    }

    function validateMethod(node) {
      if (
        !node.callee ||
        !node.callee.object ||
        node.callee.object.type !== "Identifier"
      ) {
        return;
      }

      var sVariableName = node.callee.object.name;
      var sStdModule = mVariableModule[sVariableName];
      var sMethodName = node.callee.property.name;
      checkDeprecation(node, sStdModule, sMethodName);
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
      //Todo validate static method
    };
  }
};
