import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", component: () => import("../views/Home.vue") },
  { path: "/register", component: () => import("../views/Register.vue") },
  { path: "/login", component: () => import("../views/Login.vue") },
  { path: "/pricing", component: () => import("../views/Pricing.vue") },
  { path: "/docs", component: () => import("../views/Docs.vue") },
  { path: "/console", component: () => import("../views/Console.vue"), meta: { requiresAuth: true } },
  { path: "/membership", component: () => import("../views/Membership.vue"), meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem("mpt_token");
    if (!token) return "/login";
  }
});

export default router;
