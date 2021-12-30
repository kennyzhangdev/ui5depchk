/**
 * @fileoverview Rule to disallow deprecated SAPUI5 api
 * @author Kenny Zhang
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const storage = require("node-persist");

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

var mDeprecated = {};
var mModule = {};
var mVariableModule = {};
var DEPRECATED_API = {};
var aApis = [];
var mViewNS = {};
var ui5version = "latest";

storage.initSync();

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
      DEPRECATED_API = storage.getItemSync("API");
      if (!DEPRECATED_API) {
        console.log(
          "uidepchk plugin is loading initial data, please retry later."
        );
        return {};
      }
      var options = context.options;
      if (options.length > 0 && options[0].ui5version) {
        ui5version = options[0].ui5version;
      }

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

    /**
     * Check whether SAPUI5 module is deprecated.
     * In SAPUI5 controller.js it is usually parameter of "sap.ui.define" as AMD.
     * @param {ASTNode} node The node we are checking for SAPUI5 module usage.
     * @returns {void}
     */
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
            "AMD Defined modules do not match objects in function param with position [line: " +
            oFunctionExpressionNode.loc.start.line +
            ", column: " +
            oFunctionExpressionNode.loc.start.column +
            "], if not fixed, the report may be incorrect"
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
    /**
     * Check whether a SAPUI5 control or method is deprecated.
     * General reports whenever deprecated usage is found.
     * @param {ASTNode} node The node we are checking for SAPUI5 control and method usage.
     * @param {String} module The standard module name, like: sap.ui.app
     * @param {Method} method The method name, like: getNavigationMode (from sap.ui.table.Table). It should be an empty string '' if only check the module.
     * @returns {void}
     */
    function checkDeprecation(node, module, method) {
      // console.debug("-------------------------------------------");
      // console.debug(node.loc.start.line + "|" + module + "|" + method);

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

    /**
     * Check whether a deprecated SAPUI5 control is used in a NEW statement like: new sap.ui.app();
     * General reports whenever deprecated usage is found.
     * @param {ASTNode} node The node contains a new statement.
     * @returns {void}
     */
    function validateNew(node) {
      var sStdModule;
      var sClassName = node.callee.name;
      if (sClassName) {
        sStdModule = mModule[sClassName];
      } else {
        sStdModule = _moduleFromMemberExpression(node.callee, "");
      }
      //Ignore non-SAPUI5 control
      if (!sStdModule) {
        // console.debug(sClassName + " is not a SAPUI5 module");
        return;
      }
      checkDeprecation(node, sStdModule, "");
    }

    /**
     * Analyze declared varaible and store it is Class name into mapping object mVariableModule.
     * No reports are generated in this function.
     * @param {ASTNode} node The node contains a varable declaration statement like: var oTable = new sap.ui.table.Table. Or, var oTable = new Table();
     * @returns {void}
     */
    function processDeclareVariable(node) {
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
          sStdModule = _moduleFromMemberExpression(
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

    /**
     * Analyze assigned varaible and store it is Class name into mapping object mVariableModule.
     * No reports are generated in this function.
     * @param {ASTNode} node The node contains a varable assignment statement like: this.oTable = new sap.ui.table.Table. Or, this.oTable = new Table();
     * @returns {void}
     */
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
          sStdModule = _moduleFromMemberExpression(node.right.callee, "");
        } else {
          sStdModule = _moduleFromMemberExpression(node.right.init.callee, "");
        }
      }

      mVariableModule[sVariableName] = sStdModule;
    }

    /**
     * Validate if control.method usage is deprecated like: oTable.getNavigationMode();
     * Reports are generated if control/method is deprecated.
     * @param {ASTNode} node The node contains a call statement like: oTable.getNavigationMode(). Or, this.oTable.getNavigationMode();
     * @returns {void}
     */
    function validateMethod(node) {
      if (!node.callee || !node.callee.object) {
        return;
      }
      var sStdModule, sMethodName;

      //Check static method jQuery.sap.log.debug("123");
      if (node.callee.object.type === "MemberExpression") {
        //Variable method like this.oTable.getSelectedIndex() should also process
        let sModuleMethod = _moduleFromMemberExpression(node.callee, "");
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

    /**
     * Process XML view root node to store xmlns mapping into mViewNS.
     * @param {ASTNode} node The XML view node.
     * @returns {void}
     */
    function validateXMLView(node) {
      var oRootNode = node.root;
      // var sXML = node.root.value;
      var aRootAttribute = oRootNode.attributes;
      mViewNS = {}; //Reset mViewNS. Different XML view may have different NS definition
      aRootAttribute.forEach((element) => {
        if (element.attributeName.value.indexOf("xmlns") > -1) {
          //Exclude view parameter like controllerName
          mViewNS[element.attributeName.value] = element.attributeValue.value;
        }
      });
      _validateViewControl(node.root);
    }

    /**
     * Validate if XML view contains deprecated SAPUI5 control. It continue to validate its child nodes.
     * Reports are generated if control is deprecated.
     * @param {ASTNode} node The XML node(actually HTML node converted by eslint-xml-parser).
     * @returns {void}
     */
    function _validateViewControl(node) {
      if (node.type === "HTMLElement") {
        var sTagName = node.tagName;
        var aTagName = sTagName.split(":"); //key is XML control name,like: "mvc:View", or just "View"
        var sNameSpace = "";
        var sControl = "";
        if (aTagName.length === 1) {
          sControl = aTagName[0];
        } else {
          sNameSpace = ":" + aTagName[0];
          sControl = aTagName[1];
        }
        var xmlns = mViewNS["xmlns" + sNameSpace];
        if (xmlns && sControl) {
          var sStdModule = xmlns + "." + sControl;
          checkDeprecation(node, sStdModule, "");
        }
        if (node.children) {
          node.children.forEach((element) => {
            if (element.type === "HTMLElement") {
              _validateViewControl(element);
            }
          });
        }
      }
    }

    /**
     * Extract module and method name from statement like jQuery.sap.log.debug
     * Reports are generated if control is deprecated.
     * @param {String} sModuleMethod The string in format module.method
     * @returns {Array} array in format [module, method], like: ['jQuery.sap.log','debug']
     */
    function _staticModuleMethod(sModuleMethod) {
      let lastIndex = sModuleMethod.lastIndexOf(".");
      if (lastIndex === -1) {
        return [null, null];
      } else {
        return [
          sModuleMethod.substring(0, lastIndex),
          sModuleMethod.substring(lastIndex + 1)
        ];
      }
    }

    /**
     * Extract global variable like sap.ui.model.odata.ODataModel from new sap.ui.model.odata.ODataModel();
     * This is done in traverse approach.
     * @param {ASTNode} node The node like 'sap'. Its child will be 'ui'
     * @param {String} sChildName The child name. 'ODataModel' -> 'odata.ODataModel' -> 'model.odata.ODataModel' etc.
     * @returns {String} Extracted module name like: 'sap.ui.model.odata.ODataModel'
     */
    function _moduleFromMemberExpression(node, sChildName) {
      if (node.object) {
        return _moduleFromMemberExpression(
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
        try {
          if (node.root && node.root.type === "HTMLElement") {
            validateXMLView(node); //Vallidate XML view
          } else {
            validateModule(node); //Validate JavaScript
          }
        } catch (error) {
          console.debug(error);
        }
      },
      VariableDeclaration(node) {
        try {
          processDeclareVariable(node);
        } catch (error) {
          console.debug(error);
        }
      },

      AssignmentExpression(node) {
        try {
          processAssignedVariable(node);
        } catch (error) {
          console.debug(error);
        }
      },
      NewExpression(node) {
        try {
          validateNew(node);
        } catch (error) {
          console.debug(error);
        }
      },
      CallExpression(node) {
        try {
          validateMethod(node);
        } catch (error) {
          console.debug(error);
        }
      }
    };
  }
};
