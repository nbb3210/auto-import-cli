const path = require('path')
const fs = require('fs')
const readline = require('readline')
const _ = require('lodash')
const chokidar = require('chokidar')
const glob = require('glob')
const config = JSON.parse(
    fs.readFileSync('./autoImport.json')
)
const regex = /\/\*\sautoImport(.*\n)*\/\*\sautoImport\s\*\//g

class AutoImport {
    constructor ({extname, from, to, template, ignored}) {
        this.extname = extname
        this.from = _.endsWith(from, '/') ? from : from + '/'
        this.to = to
        this.template = template
        this.ignored = ignored
        this.modules = []
        this.watchInstance = {}
    }

    init () {
        glob
            .sync(`${this.from}**/*${this.extname}`, {
                ignore: this.ignored
            })
            .forEach(file => {
                this.addModule(file)
            })
        this.doImport(`Import ${this.modules.length} modules by AutoImport...`)
        this.watch()
    }

    watch () {
        this.watchInstance = chokidar
            .watch(this.from, {
                ignored: this.ignored
            })
            .on('add', file => {
                if (!this.checkModule(file)) {
                    this.addModule(file)
                    this.doImport(`Add new module [${this.getModuleName(file)}] by AutoImport...`)
                }
            })
            .on('unlink', file => {
                this.unlinkModule(file)
                this.doImport(`Remove module [${this.getModuleName(file)}] by AutoImport...`)
            })
    }

    getModuleName (file, extname = this.extname) {
        let moduleName = path.basename(file, extname)
        if (moduleName.match('-')) {
            moduleName = moduleName.replace(
                /(-)(.{1})/,
                (match, p1, p2, offset, string) => p2.toUpperCase()
            )
        }
        return moduleName
    }

    getImportPath (target, source) {
        return path.relative(path.dirname(target), source)
    }

    checkModule (file) {
        return _.findIndex(this.modules, ['moduleName', this.getModuleName(file)]) !== -1
    }

    addModule (file) {
        this.modules.push({
            moduleName: this.getModuleName(file, this.extension),
            importPath: this.getImportPath(this.to, file)
        })
    }

    unlinkModule (file) {
        _.remove(this.modules,
            p => p.moduleName === this.getModuleName(file, this.extension))
    }

    fillTemplate (template, moduleName, importPath) {
        return template
            .replace('moduleName', moduleName)
            .replace('modulePath', `'${importPath}'`)
    }

    makeImportStr (modules, template) {
        let str = ''
        modules.forEach((m, index) => {
            str =
                str +
                this.fillTemplate(template, m.moduleName, m.importPath) +
                (modules.length - 1 === index ? '' : '\n')
        })
        return str
    }

    doImport (msg) {
        readline.clearLine(process.stdout, 0)
        readline.cursorTo(process.stdout, 0)
        process.stdout.write(msg)
        let importStr = this.makeImportStr(this.modules, this.template)
        fs.readFile(this.to, 'utf8', (err, data) => {
            if (err) {
                console.log(err)
            }
            let result = ''
            if (data.match(regex)) {
                result = data.replace(
                    regex,
                    `/* autoImport */
${importStr}
/* autoImport */`
                )
            } else {
                result = data.replace(
                    /(.*import.*)(\n)([^(import)])/,
                    (match, p1, p2, p3, offset, string) => {
                        return `${p1}
/* autoImport */
${importStr}
/* autoImport */
${p3}`
                    }
                )
            }
            fs.writeFile(this.to, result, 'utf8', function (err) {
                if (err) {
                    console.log(err)
                }
            })
        })
    }
}
let autoImport = new AutoImport(config[0])
autoImport.init()
