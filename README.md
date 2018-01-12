# auto-import-cli
import modules automagically based on your configuration

## Usage

Install with npm

```
npm i auto-import-cli
```

You should then setup a configuration file: `auto-import-cli.json`

After that, you can run **auto-import-cli** on your project like this:
```
$ auto-import-cli
```

## Configuration

```
[
    {
        "extname": ".vue",
        "from": "example/pages",
        "to": "example/router/index.js",
        "template": "const moduleName = () => import(modulePath)",
        "ignored": [
            "example/pages/login.vue",
            "example/pages/overall/**"
        ]
    }
]
```

**extname** : the type of file that may be a module.

**from** : the directory which contains modules.

**to** : the file which uses modules.

**template** : the way importing modules.
moduleName and modulePath will be replace when tool is working.

```
"import moduleName from modulePath"
```

```
"const moduleName = require(modulePath)"
```

```
"const moduleName = () => import(modulePath)"
```

**ignored** : the files that should be ignored, suport [anymatch](https://www.npmjs.com/package/anymatch)

The config option is an array. You can make many rules as you want.

