import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue')
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('@/views/main/index.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/main/home.vue')
      },
      {
        path: 'text-to-image',
        name: 'TextToImage',
        component: () => import('@/views/main/tools/TextToImage.vue')
      },
      {
        path: 'image-to-image',
        name: 'ImageToImage',
        component: () => import('@/views/main/tools/ImageToImage.vue')
      },
      {
        path: 'text-to-video',
        name: 'TextToVideo',
        component: () => import('@/views/main/tools/TextToVideo.vue')
      },
      {
        path: 'image-to-video',
        name: 'ImageToVideo',
        component: () => import('@/views/main/tools/ImageToVideo.vue')
      },
      {
        path: 'frame-to-video',
        name: 'FrameToVideo',
        component: () => import('@/views/main/tools/FrameToVideo.vue')
      },
      {
        path: 'reference-video',
        name: 'ReferenceVideo',
        component: () => import('@/views/main/tools/ReferenceVideo.vue')
      },
      {
        path: 'creator',
        name: 'Creator',
        component: () => import('@/views/main/creator/index.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  
  if (to.path === '/login') {
    next()
  } else {
    if (!userStore.token) {
      next('/login')
    } else {
      next()
    }
  }
})

export default router
