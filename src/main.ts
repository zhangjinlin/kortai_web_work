import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useUserStore } from './stores/user'
import './styles/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化时从 Cookie 读取 Token
const userStore = useUserStore()
userStore.getTokenFromCookie()

app.mount('#app')
