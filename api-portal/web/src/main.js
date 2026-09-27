import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router/index.js";
import { applySeo } from "./seo.js";
import "./style.css";

router.afterEach((to) => {
  applySeo(to.path);
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
