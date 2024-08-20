# eslint-plugin-ui5depchk

Check deprecated API usage for a specific SAPUI5 version

## Installation

You'll first need to install [ESLint](https://eslint.org/):

```sh
npm i eslint --save-dev
```

Next, install `eslint-plugin-ui5depchk`:

```sh
npm install eslint-plugin-ui5depchk --save-dev
```

To validate XML view file, it depends on `eslint-xml-parser`. Install it as well:

```sh
npm install eslint-xml-parser --save-dev
```

## Usage

Add `ui5depchk` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix.

Use `overrides` to configure xml parser on view.xml files.

```json
{
  "plugins": ["ui5depchk"],
  "overrides": [
    {
      "files": "*.view.xml",
      "parser": "eslint-xml-parser"
    }
  ]
}
```

Then configure the rules you want to use under the rules section.

```json
{
  "rules": {
    "ui5depchk/no-deprecated-api": "warn"
  }
}
```

Add parameter `ui5version` if you want to validate against a specific SAPUI5 version. Or you can set it as `latest`.

```json
{
  "rules": {
    "ui5depchk/no-deprecated-api": ["warn", { "ui5version": "1.126" }]
  }
}
```

In case you want custom deprecated API, add optional parameter `ui5DepreacatedURL`.

```json
{
  "rules": {
    "ui5depchk/no-deprecated-api": [
      "warn",
      {
        "ui5version": "1.126",
        "ui5DepreacatedURL": "https://ui5.sap.com/docs/api/api-index-deprecated.json"
      }
    ]
  }
}
```

Use `.eslintignore` to ignore non-SAPUI5 code to avoid unexpected error. You may want to ignore 'webapp/test' folder as well.

If you see "plugin is loading initial data", just retry. This only happens for the first time plugin loaded.

Due to the dependency on module `node-persist`, a `.node-persist` folder will be created. Ignore this path in your `.gitignore`

From ESLint 9.0.0, `.eslintrc` is deprecated. Use `eslint.config.mjs` instead.
Refer to target folder in Git repo for sample code.
https://github.com/kennyzhangdev/ui5depchk

After configuration, run below command to get report.

```sh
npx eslint
```

## Supported Rules

- no-deprecated-api
