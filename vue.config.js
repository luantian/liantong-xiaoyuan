const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// const IS_IE_DEV = Boolean(process.env.IE_DEV);

module.exports = {
  productionSourceMap: false,
  // 正式环境
  publicPath: '/',
  // 测试环境
  // publicPath: '/',
  // webpack 配置
  configureWebpack: config => {
    // 生产环境取消 console.log
    if (IS_PRODUCTION) {
      config.optimization.minimizer[0].options.terserOptions.compress.drop_console = true
    }
  },
  css: {
    sourceMap: !IS_PRODUCTION,
    loaderOptions: {
      less: {
        lessOptions: {
          javascriptEnabled: true,
        },
      },
    },
  },

  devServer: {
    proxy: {
      '/api': { //使用"/api"来代替"http://f.apiplus.c"
        target: 'http://172.24.4.43:9999', //源地址
        changeOrigin: true, //改变源
        pathRewrite: {
          '^/api': '/' //路径重写
        }
      },
    }
  },

  // transpileDependencies: IS_IE_DEV || IS_PRODUCTION ? [
  //   /@antv/,
  //   /d3-/,
  //   /ml-matrix/,
  //   /regl/,
  //   /proxy-polyfill/,
  // ] : undefined,
};
