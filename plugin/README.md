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
    "plugins": [
        "ui5depchk"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "ui5depchk/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here


