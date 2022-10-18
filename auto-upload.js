/*
 * @Author: Terence
 * @Date: 2021-11-19 15:34:56
 * @Last Modified by: Terence
 * @Last Modified time: 2021-12-31 18:14:26
 */

const oScp = require('scp2')
const ssh2 = require('ssh2')

const argv = process.argv.splice(2)[1]
// 本地需要上传的文件夹
const localPath = './mycyt'

// 测试环境
const testConfig = {
  host: '172.24.4.43',
  port: 3222,
  username: 'root',
  password: 'agQzuf2C/aQ=',
  remotePath:'/opt/mianyang/mycyt'
}

// 生成环境
const prodConfig = {
  host: '172.24.4.43',
  port: 3222,
  username: 'root',
  password: 'agQzuf2C/aQ=',
  remotePath:'/opt/mianyang/mycyt'
}

let config = (argv === '-p' ? prodConfig : testConfig)

const conn = new ssh2.Client()

conn.on('ready', () => {
  conn.exec(`mv ${config.remotePath} ${config.remotePath}_${dateFtt('yyyy_MM_dd_hh_mm_ss', new Date())}_bak`, ( err, stream ) => {
    if (err) throw err;
    stream.on('close', () => {
      console.log('自动部署中...')
      oScp.scp(
        localPath,
        `${config.username}:${config.password}@${config.host}:${config.port}:${config.remotePath}`,
        (err) => {
          if (err) throw err
          console.log('自动部署完成')
        }
      )
      conn.end()
    })
    .on('data', () => {})
    .stderr.on('data', () => {})
  })
}).connect(config);

function dateFtt(fmt, date) {
  let o = {
    "M+" : date.getMonth()+1,                 //月份
    "d+" : date.getDate(),                    //日
    "h+" : date.getHours(),                   //小时
    "m+" : date.getMinutes(),                 //分
    "s+" : date.getSeconds(),                 //秒
    "q+" : Math.floor((date.getMonth()+3)/3), //季度
    "S"  : date.getMilliseconds()             //毫秒
  };
  if(/(y+)/.test(fmt))
    fmt = fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
  for(let k in o)
    if(new RegExp("("+ k +")").test(fmt))
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
  return fmt;
}
