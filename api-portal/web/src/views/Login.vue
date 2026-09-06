<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>登录</h2>
      <form @submit.prevent="submit">
        <div class="field">
          <label>邮箱</label>
          <input v-model="form.email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="你的密码" required />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
      </form>
      <p class="switch">
        还没有账号？<router-link to="/register">免费注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api/index.js";
import { useAuthStore } from "../store/auth.js";

const router = useRouter();
const auth = useAuthStore();
const form = reactive({ email: "", password: "" });
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const data = await api.login(form);
    auth.setToken(data.token);
    localStorage.setItem("mpt_api_key", data.api_key);
    router.push("/console");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: 80px 20px;
}

.auth-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.auth-card h2 {
  margin-bottom: 24px;
}

.field {
  margin-bottom: 18px;
}

.field label {
  display: block;
  font-size: 14px;
  margin-bottom: 6px;
  color: #4b5563;
}

.btn-primary {
  width: 100%;
  background: #4f6ef7;
  color: #fff;
  padding: 12px;
  border-radius: 6px;
  font-size: 15px;
  margin-top: 8px;
}

.btn-primary:disabled {
  opacity: 0.6;
}

.error {
  color: #ef4444;
  font-size: 13px;
  margin-bottom: 12px;
}

.switch {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}

.switch a {
  color: #4f6ef7;
}
</style>
