<template>
  <div class="app">
    <nav class="navbar">
      <div class="nav-inner">
        <router-link to="/" class="logo">
          <LogoIcon :size="28" />
          <span>MPT API 开放平台</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/">首页</router-link>
          <router-link to="/pricing">套餐定价</router-link>
          <router-link to="/docs">API 文档</router-link>
          <template v-if="token">
            <router-link to="/console">控制台</router-link>
            <router-link to="/membership">会员中心</router-link>
            <a href="#" @click.prevent="logout" class="logout">退出</a>
          </template>
          <template v-else>
            <router-link to="/login">登录</router-link>
            <router-link to="/register" class="btn-primary btn-sm">免费注册</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main class="main">
      <router-view />
    </main>
    <footer class="footer">
      <p>MPT API 开放平台 · 基于 MoneyPrinterTurbo 构建</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "./store/auth.js";
import LogoIcon from "./components/LogoIcon.vue";

const router = useRouter();
const auth = useAuthStore();
const token = computed(() => auth.token);

function logout() {
  auth.logout();
  router.push("/");
}
</script>

<style scoped>
.navbar {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 18px;
  font-weight: 700;
  color: #4f6ef7;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
  font-size: 14px;
  color: #4b5563;
}

.nav-links a:hover {
  color: #4f6ef7;
}

.btn-primary {
  background: #4f6ef7;
  color: #fff !important;
  padding: 8px 18px;
  border-radius: 6px;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.85;
}

.btn-sm {
  padding: 7px 14px;
  font-size: 13px;
}

.logout {
  color: #ef4444;
}

.main {
  min-height: calc(100vh - 110px);
}

.footer {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 13px;
}
</style>
