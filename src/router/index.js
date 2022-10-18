
import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);
const routes = [
  {
    path: '/',
    name: 'Index',
    component: () => import('@/views/Index.vue')
  },
]

const router = new Router({
  mode: 'history',
  routes
})

// // 标识是否第一次加载，用于在路由守卫中处理首次加载时路由路径未匹配的情况
let isFirstLoad = true;

router.beforeEach(async (to, from, next) => {

  if (Array.isArray(to.matched) && to.matched.length > 0) {
    next();
  } else if (isFirstLoad) {
    next({
      path: '/',
      replace: true
    });
  } else {
    next(false);
  }
  isFirstLoad = false;
})

export default router


