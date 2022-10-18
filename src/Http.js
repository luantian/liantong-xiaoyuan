import axios from 'axios';
// import qs from 'qs';

import LocalStorageExpires from '@/cache/LocalStorageExpires'

const baseUrl = process.env.VUE_APP_BASE_URL

// import { message } from 'ant-design-vue'

const service = axios.create({
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
  },
  timeout: 2000 * 60, //请求超时时间
})

const version = ''

const METHODS1 = ['post', 'put', 'patch']
const METHODS2 = ['get', 'delete']

// http request 拦截器
service.interceptors.request.use(
  config => {

    const userId = LocalStorageExpires.getItem('_userId')

    config.headers.userId = userId

    // 发送请求之前
    if (config.method.includes(METHODS1)) {
      //如果是FormData类型，重新设置请求头
      if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data'
      } else {
        //将参数变成  a=xx&b=xx&c=xx这样的参数列表，配合php后台
        // config.data = qs.stringify({
        //   ...config.data
        // });
      }
    }
    return config;
  },
  err => {
    return Promise.reject(err);
  }
)

//响应拦截器即异常处理
service.interceptors.response.use(
  response => response,
  err => {
    if (err && err.response) {
      switch (err.response.status) {
        case 400:
          console.log('错误请求')
          break;
        case 401:
          console.log('未授权，请重新登录')
          break;
        case 403:
          console.log('拒绝访问')
          break;
        case 404:
          console.log('请求错误,未找到该资源')
          break;
        case 405:
          console.log('请求方法未允许')
          break;
        case 408:
          console.log('请求超时')
          break;
        case 500:
          console.log('服务器端出错')
          break;
        case 501:
          console.log('网络未实现')
          break;
        case 502:
          console.log('网络错误')
          break;
        case 503:
          console.log('服务不可用')
          break;
        case 504:
          console.log('网络超时')
          break;
        case 505:
          console.log('http版本不支持该请求')
          break;
        default:
          console.log(`连接错误${err.response.status}`)
      }
    } else {
      return Promise.resolve({data: '', error: err})
    }
    return Promise.reject(err.response)
  })

class Http {

  static getParams(params) {
    let url = params.url;
    let data = params.data;
    if (url.indexOf('http') === -1) {
      url = `${baseUrl}${version}${url}`;
    }
    return { url, data }
  }

  static proxyPromise(method, url, data, config) {
    let par = {};
    if (METHODS1.includes(method)) {
      par = data
    }
    if (METHODS2.includes(method)) {
      par = { params: data }
    }
    return new Promise((resolve, reject) => {
      Object.assign(service.defaults, config)
      service[method](url, par, config)
        .then(response => {
          const { data } = response
          resolve(data)
          // if (data.status && data.status !== 200) message.error(data.message)
          // if (data.code && data.code !== 1) message.error(data.message)
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  static get(params, config) {
    let { url, data } = Http.getParams(params)
    return Http.proxyPromise('get', url, data, config)
  }

  static delete(params, config) {
    let { url, data } = Http.getParams(params)
    return Http.proxyPromise('delete', url, data, config)
  }

  static post(params, config) {
    let { url, data } = Http.getParams(params)
    return Http.proxyPromise('post', url, data, config)
  }

  static put(params, config) {
    let { url, data } = Http.getParams(params)
    return Http.proxyPromise('put', url, data, config)
  }

  static patch(params, config) {
    let { url, data } = Http.getParams(params)
    return Http.proxyPromise('patch', url, data, config)
  }

}

export default Http
