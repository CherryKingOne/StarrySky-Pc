import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import ion from '@iconify-json/ion/icons.json'

import App from './App.vue'
import router from './router'
import { tooltip } from './directives/tooltip'

addCollection(ion)

createApp(App).use(createPinia()).use(router).directive('tooltip', tooltip).mount('#app')
