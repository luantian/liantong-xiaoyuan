
const axios = require('axios')
const fs = require('fs')

const apiPath = './src/api'

// const apiUrl = 'http://172.26.11.91:9998/v2/api-docs'
const apiUrl = 'http://172.24.4.43:9999/v2/api-docs'

const apiPathIsExist = fs.existsSync(apiPath)

String.prototype.replaceAll = function(s1, s2) {
  return this.replace(new RegExp(s1, 'gm'), s2);
}

/**
 * 1. 通过api获取接口数据信息
 * 2. 将 接口文档 通过 tag的name值进行分类
 */

const main = async () => {

  const { data } = await axios.request({
    url: apiUrl,
    method: 'get'
  })

  if (apiPathIsExist) {
    delDir(apiPath, {
      force: true,
      recursive: true
    })
  }

  fs.mkdirSync(apiPath)

  const categories = dataTransform(data)

  generaterBaseFile()

  for (let key in categories) {
    const item = categories[key]
    // console.log('item', item)
    const className = urlReverseClassName(item[0].url)
    const fileName = className
    // console.log('item', item.desc)

    let fileHeader = `import Base from "./Base"

`
    let classDesc = `// ${item[0].desc}
`
    let fileClass = `class ${className} extends Base {`
    let constructor = `

  constructor() {
    super()
  }

`
    let fileContent = item.map((oApi) => { return `  // ${oApi.summary}
  ${generaterMethod(oApi)}
  `}).join('\n')
    let fileFooter = `
}

export default ${className}
`

    fs.writeFileSync(`${apiPath}/${fileName}.js`, `${fileHeader}${classDesc}${fileClass}${constructor}${fileContent}${fileFooter}`)
  }

}

const dataTransform = (data) => {

  const { tags, paths } = data

  const pathsKeys = Object.keys(paths)

  const tagNames = tags.map(item => item.name)

  const categories = {}

  tagNames.map((tagName) => {

    categories[tagName] = []

    pathsKeys.forEach((url) => {

      const oPath = paths[url]

      const oPathKeys = Object.keys(oPath)
      // console.log('oPathKeys', oPathKeys)

      oPathKeys.map((method) => {
        // console.log('method', method)
        if (!oPath[method].deprecated && tagName === oPath[method].tags[0]) {
          categories[tagName].push({
            url,
            method,
            summary: oPath[method].summary,
            desc: tagName
          })
        }
      })
    })
  })

  // 过滤空数据
  for (let item in categories) {
    if (categories[item].length === 0) {
      delete categories[item]
    }
  }

  return categories

}


const delDir = (path) => {
  let files = []
  if(fs.existsSync(path)){
    files = fs.readdirSync(path)
    files.forEach((file) => {
      let curPath = path + '/' + file;
      if(fs.statSync(curPath).isDirectory()){
        delDir(curPath) //递归删除文件夹
      } else {
        fs.unlinkSync(curPath) //删除文件
      }
    });
    fs.rmdirSync(path);
  }
}

// 将URL转换成类名
const urlReverseClassName = (url) => {
  const _url = url.replace('/', '@')

  const index = _url.indexOf('/')

  let result = ''

  if (index === -1) {
    result = _url.replace('@', '-')
  } else {
    result = _url.substring(0, index).replace('@', '-')
  }
  return convertToCamelCase(result)
}

// 将URL转换成函数
const generaterMethod = (item) => {
  let url = item.url
  let tempUrl = item.url.replaceAll('{|}', '')
  console.log('tempUrl', tempUrl)
  console.log('url', url)
  if (url.indexOf('{') > -1) {
    url = url.replaceAll('{', '${data.')
  }

  let fnName = convertToCamelCase(tempUrl.replaceAll('-', '/'), '/')

  console.log('fnName', fnName)

  if (fnName.indexOf('$') > -1) {
    const index = fnName.indexOf('$')
    fnName = fnName.substring(0, index)
  }

  const requestMethod = item.method

  return `static async ${requestMethod}${fnName}(data) {
    return await this.${requestMethod}({
      url: ` + '`'  + `${url}` + '`' + `,
      data
    })
  }`
}

// 将以bit为准的后一位字符转换成大写
/**
 *
 * @param {*} str 需要转换的字符串
 * @param {*} bit 需要转换为基准的字符
 * @param {*} isOpenOne 是否开启首字符转换 0 => 开启 1 => 不开启
 * @returns
 */
const convertToCamelCase = (str, bit = '-', isOpenOne = 0) => {

  // 去除中划线分隔符获取单词数组
  let strArr = str.split(bit)

  // 如果第一个为空，则去掉
  if(strArr[0] === '') {
    strArr.shift();
  }

  // 遍历第二个单词到最后一个单词，并转换单词首字母为大写
  for(let i = isOpenOne, len = strArr.length; i < len; i++) {
    // 如果不为空，则转成大写
    if(strArr[i] !== '') {
      strArr[i] = strArr[i][0].toUpperCase() + strArr[i].substring(1);
    }
  }

  return strArr.join('');
}

const generaterBaseFile = () => {
  let fileHeader = `import Http from '@/Http'

`
    let fileClass = `class Base extends Http {`
    let constructor = `

  constructor() {
    super()
  }

`
    let fileFooter = `
}

export default Base
`

fs.writeFileSync(`${apiPath}/Base.js`, `${fileHeader}${fileClass}${constructor}${fileFooter}`)

}



main()
