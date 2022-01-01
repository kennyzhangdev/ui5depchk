/**
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
      let options = context.options;
      if (options.length > 0 && options[0].ui5version) {
        ui5version = options[0].ui5version;
      }

      console.debug("Target UI5 version is: " + ui5version);

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
      let aRootStatement = node.body;
      let aDefArgument;
      for (let i = 0; i < aRootStatement.length; i++) {
        let oStatement = aRootStatement[i];
        if (
          oStatement.type === "ExpressionStatement" &&
          oStatement.expression.type === "CallExpression"
        ) {
          let oCallExp = oStatement.expression;
          let sCalleeName = _assignNode(oCallExp.callee);
          if (sCalleeName === "sap.ui.define") {
            aDefArgument = oCallExp.arguments;
            break;
          }
        }
      }
      if (!aDefArgument) {
        context.report({
          node: node,
          message:
            "SAPUI5 AMD Definition is not used, add this file to .eslintignore if it is not SAPUI5 code"
        });
        return; //AMD is not used, ignore module validation
      }

      let oArrayExpressionNode, oFunctionExpressionNode;
      //sap.ui.define may have 4 parameters -> function ui5Define(sModuleName, aDependencies, vFactory, bExport)
      //Extract array and function
      aDefArgument.forEach(function (argument) {
        if (argument.type === "ArrayExpression") {
          oArrayExpressionNode = argument;
        } else if (argument.type === "FunctionExpression") {
          oFunctionExpressionNode = argument;
        }
      });
      if (!oArrayExpressionNode || !oFunctionExpressionNode) {
        return; //No module is loaded
      }
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

      let aModule = oArrayExpressionNode.elements;
      for (let i = 0; i < aModule.length; i++) {
        let sModule = aModule[i].value;

        //Ignore non-SAP control
        if (sModule.indexOf("sap") === -1) {
          continue;
        }

        let sStdModule = sModule.replace(/\//g, "."); //sap/m/Table -> sap.m.Table
        //Incase AMD module more than function parameters
        if (oFunctionExpressionNode.params[i]) {
          let sVariableName = oFunctionExpressionNode.params[i].name;
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
      let sStdModule = _assignNode(node.callee);
      sStdModule = _StdModule(sStdModule);
      checkDeprecation(node, sStdModule, "");
    }

    /**
     * Analyze declared varaible and store it is Class name into mapping object mVariableModule.
     * No reports are generated in this function.
     * @param {ASTNode} node The node contains a varable declaration statement like: var oTable = new sap.ui.table.Table. Or, var oTable = new Table();
     * @returns {void}
     */
    function processDeclareVariable(node) {
      //Ignore for(var i in array)
      if (node.parent.type === "ForInStatement") {
        return;
      }

      let aDeclearation = node.declarations;
      aDeclearation.forEach((oVariableDeclarator) => {
        //Ignore variable definition only, like: var a;
        if (!oVariableDeclarator.init) {
          return;
        }
        let sVariableName = _assignNode(oVariableDeclarator.id);
        let sStdModule = _assignNode(oVariableDeclarator.init); //sStdModule can be like "Table" or "sap.ui.table.Table", or "oTestTable"
        if (sStdModule) {
          sStdModule = _StdModule(sStdModule);
          mVariableModule[sVariableName] = sStdModule; //Todo: oTestTable4 not resolved. this.oTable6 needs to validate
        }
      });
    }

    /**
     * Analyze assigned varaible and store it is Class name into mapping object mVariableModule.
     * No reports are generated in this function.
     * @param {ASTNode} node The node contains a varable assignment statement like: this.oTable = new sap.ui.table.Table. Or, this.oTable = new Table();
     * @returns {void}
     */
    function processAssignment(node) {
      let sVariableName = _assignNode(node.left);
      let sStdModule = _assignNode(node.right);
      if (sStdModule) {
        sStdModule = _StdModule(sStdModule);
        mVariableModule[sVariableName] = sStdModule;
      }
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
      var sClassName, sStdModule, sMethodName;
      var sModuleMethod = _assignNode(node.callee);
      [sClassName, sMethodName] = _staticModuleMethod(sModuleMethod); //sClassName may also be variable/ClassName/Module name
      if (mVariableModule[sClassName]) {
        sStdModule = mVariableModule[sClassName];
      } else if (mModule[sClassName]) {
        sStdModule = mModule[sClassName];
      } else {
        sStdModule = sClassName;
      }

      sMethodName = _assignNode(node.callee.property);
      checkDeprecation(node, sStdModule, sMethodName);
    }

    /**
     * Process XML view root node to store xmlns mapping into mViewNS.
     * @param {ASTNode} node The XML view node.
     * @returns {void}
     */
    function validateXMLView(node) {
      let oRootNode = node.root;
      // var sXML = node.root.value;
      let aRootAttribute = oRootNode.attributes;
      mViewNS = {}; //Reset mViewNS. Different XML view may have different NS definition
      aRootAttribute.forEach((element) => {
        if (element.attributeName.value.indexOf("xmlns") > -1) {
          //Exclude view parameter like controllerName
          mViewNS[element.attributeName.value] = element.attributeValue.value;
        }
      });
      _validateViewControl(node.root);
    }

    //------------------------------------------------------------------------------
    // Internal function
    //------------------------------------------------------------------------------

    /**
     * Return standard module name from a variable/class/module name.
     * @param {String} sName The variable/class/module name, like: oTable/Table/sap.ui.table.Table
     * @returns {String} Standard module name like sap.ui.table.Table
     */
    function _StdModule(sName) {
      if (!sName) {
        return;
      }
      let sStdModule;
      //sName is variable name like oTable
      if (mVariableModule[sName]) {
        sStdModule = mVariableModule[sName];
        //sName is Class name like: Table
      } else if (mModule[sName]) {
        sStdModule = mModule[sName];
      } else {
        //sName is module name: sap.ui.table.Table
        sStdModule = sName;
      }
      return sStdModule;
    }

    /**
     * Assign AST node to the processing function based on its type
     * @param {ASTNode} node The node to be assigned.
     * @returns {String} Processing result, usually a variable/class/module name;
     */
    function _assignNode(node) {
      switch (node.type) {
        case "Identifier":
          return _identifier(node);

        case "AssignmentExpression":
          return _assignmentExp(node);

        case "MemberExpression":
          return _memberExp(node);

        case "NewExpression":
          return _newExp(node);

        case "ThisExpression":
          return _thisExp(node);

        default:
          return;
      }
    }

    /**
     * Return node name of AST Identifier node.
     * @param {ASTNode} node The Identifier node
     * @returns {String} Node name
     */
    function _identifier(node) {
      _validateNode(node, "Identifier");
      return node.name;
    }

    /**
     * In an assignment expression, store the variable and module mapping, then return Classname
     * @param {ASTNode} node The node we are checking for SAPUI5 module usage.
     * @returns {String} Variable class name, like 'Table'
     */
    function _assignmentExp(node) {
      _validateNode(node, "AssignmentExpression");

      let sVariableName = _assignNode(node.left);
      let sStdModule = _assignNode(node.right);
      //Process assignment logic, return right value
      if (sStdModule) {
        sStdModule = _StdModule(sStdModule);
        mVariableModule[sVariableName] = sStdModule;
      }

      return sStdModule;
    }

    /**
     * Process MemberExpression to get its full name.
     * @param {ASTNode} node MemberExpression node.
     * @returns {String} Fullname, can be like: jQuery.sap.log.debug/sap.ui.table.Table/oTestTable.getNavigationMode
     */
    function _memberExp(node) {
      _validateNode(node, "MemberExpression");
      if (node.object) {
        return _assignNode(node.object) + "." + _assignNode(node.property);
      }
      return _assignNode(node.property);
    }

    /**
     * Get class/module name from a new expression
     * @param {ASTNode} node The NewExpression node.
     * @returns {String} Processing result, class/module name;
     */
    function _newExp(node) {
      _validateNode(node, "NewExpression");
      let sClassName = _assignNode(node.callee);
      return sClassName;
    }

    /**
     * Get "this" from a ThisExpression
     * @param {ASTNode} node ThisExpression node.
     * @returns {String} The string "this";
     */
    function _thisExp(node) {
      _validateNode(node, "ThisExpression");
      return "this";
    }

    /**
     * Validate a AST node against its type. Validation failure usually indicates a program bug.
     * @param {ASTNode} node Node to be validated.
     * @param {String} sType Node type to be validated.
     * @throws {Error} Error indicating the node location
     * @returns {void}
     */
    function _validateNode(node, sType) {
      if (node.type !== sType) {
        throw new Error(
          "node is not " +
            sType +
            ": [" +
            node.loc.start.line +
            "," +
            node.loc.start.column +
            "]"
        );
      }
    }

    /**
     * Validate if XML view contains deprecated SAPUI5 control. It continue to validate its child nodes.
     * Reports are generated if control is deprecated.
     * @param {ASTNode} node The XML node(actually HTML node converted by eslint-xml-parser).
     * @returns {void}
     */
    function _validateViewControl(node) {
      if (node.type === "HTMLElement") {
        let sTagName = node.tagName;
        let aTagName = sTagName.split(":"); //key is XML control name,like: "mvc:View", or just "View"
        let sNameSpace = "";
        let sControl = "";
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
          processAssignment(node);
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
