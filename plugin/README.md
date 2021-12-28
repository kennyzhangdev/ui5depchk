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

## Usage

Add `ui5depchk` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["ui5depchk"]
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

Add parameter ui5version if you want to check against a specific SAPUI5 version. Or you can set it as "latest".

```json
{
  "rules": {
    "ui5depchk/no-deprecated-api": ["warn", { "ui5version": "1.84" }]
  }
}
```

Use .eslintignore to ignore non-SAPUI5 code to avoid unexpected error.
If you see "plugin is loading initial data", just retry. This only happens for the first time plugin loaded.

## Supported Rules

- no-deprecated-api
