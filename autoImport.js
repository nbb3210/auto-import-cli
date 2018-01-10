const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const config = fs.readFileSync('./autoImport.json')
const { extname, from, to, template, exclude } = JSON.parse(config)

let excludeArr = []
exclude.forEach(e => {
    let files = glob.sync(e)
    files.forEach(f => {
        excludeArr.push(path.resolve(__dirname, f))
    })
})
const regex = /\/\*\sautoImport(.*\n)*\/\*\sautoImport\s\*\//g
let cache = []
let modules = []

const fillTemplate = (template, moduleName, modulePath) =>
    template
        .replace('moduleName', moduleName)
        .replace('modulePath', `'${modulePath}'`)

const mapDir = d => {
    // 获得当前文件夹下的所有的文件夹和文件
    const [dirs, files] = _(fs.readdirSync(d)).partition(p =>
        fs.statSync(path.join(d, p)).isDirectory()
    )

    // 映射文件夹
    dirs.forEach(dir => {
        modules.concat(mapDir(path.join(d, dir)))
    })

    // 映射文件
    files.forEach(file => {
        // 文件后缀名
        let filename = path.join(d, file)
        if (path.extname(file) === extname) {
            if (!excludeArr.includes(path.resolve(__dirname, filename))) {
                let moduleName = path.basename(file, extname)
                // 若存在 -
                if (moduleName.match('-')) {
                    moduleName = moduleName.replace(
                        /(-)(.{1})/,
                        (match, p1, p2, offset, string) => p2.toUpperCase()
                    )
                }
                modules.push({
                    moduleName,
                    modulePath: path.relative(path.dirname(to), filename)
                })
            }
        }
    })
}

fs.watch(
    from,
    {
        recursive: true
    },
    (event, filename) => {
        if (event === 'rename') {
            modules = []
            mapDir(from)
            if (!_.isEqual(modules, cache)) {
                cache = modules
                let importStr = ''
                cache.forEach((m, index) => {
                    importStr =
                        importStr +
                        fillTemplate(template, m.moduleName, m.modulePath) +
                        (cache.length - 1 === index ? '' : '\n')
                })
                fs.readFile(to, 'utf8', (err, data) => {
                    if (err) return console.log(err)
                    let result = ''
                    if (data.match(regex)) {
                        result = data.replace(
                            regex,
                            `/* autoImport */
${importStr}
/* autoImport */`
                        )
                    } else {
                        /* 首次插入在文件最后的import插入 */
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

                    fs.writeFile(to, result, 'utf8', err => {
                        if (err) return console.log(err)
                    })
                })
            }
        }
    }
)
