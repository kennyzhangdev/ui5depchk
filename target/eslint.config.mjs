import ui5Depchk from "eslint-plugin-ui5depchk";
import parser from "eslint-xml-parser";

export default [
  {
    ignores: [
      "**/dist",
      "webapp/dist",
      "webapp/resources",
      "**/npmscript",
      "**/webapp/test/"
    ]
  },
  {
    plugins: {
      ui5depchk: ui5Depchk
    },

    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "script"
    },

    settings: {
      ui5depchk: {}
    },

    rules: {
      "ui5depchk/no-deprecated-api": [
        "warn",
        {
          ui5version: "1.126",
          ui5DepreacatedURL:
            "https://ui5.sap.com/docs/api/api-index-deprecated.json"
        }
      ]
    }
  },
  {
    files: ["**/*.view.xml"],

    languageOptions: {
      parser: parser
    }
  }
];
