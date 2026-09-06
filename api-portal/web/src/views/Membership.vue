<template>
  <div class="membership">
    <h2>会员中心</h2>
    <p v-if="!token" class="nologin">请先 <router-link to="/login">登录</router-link> 后查看会员信息。</p>

    <template v-if="token && me">
      <div class="member-overview">
        <div class="plan-box">
          <span class="label">当前套餐</span>
          <strong class="plan-name">{{ me.membership?.plan_name || "无" }}</strong>
           <span class="quota">额度：免费不限次数</span>
          <span class="expire" v-if="me.membership">
            到期时间：{{ formatDate(me.membership.expires_at) }}
          </span>
        </div>
        <div class="usage-box">
          <span class="label">本月用量</span>
          <strong class="usage-num">{{ me.today_usage }} 次</strong>
          <span class="total">累计 {{ me.total_usage }} 次</span>
        </div>
      </div>

      <div class="section">
        <h3>账号设置</h3>
        <div class="settings-grid">
          <div class="settings-card">
            <h4>修改资料</h4>
            <div class="field">
              <label>邮箱（不可修改）</label>
              <input :value="me.user.email" disabled />
            </div>
            <div class="field">
              <label>用户名</label>
              <input v-model="profile.username" type="text" placeholder="请输入新的用户名" />
            </div>
            <p v-if="profileMsg" class="form-msg" :class="{ ok: profileOk }">{{ profileMsg }}</p>
            <button class="btn-primary btn-block" @click="saveProfile" :disabled="profileLoading">
              {{ profileLoading ? "保存中..." : "保存资料" }}
            </button>
          </div>

          <div class="settings-card">
            <h4>修改密码</h4>
            <div class="field">
              <label>原密码</label>
              <input v-model="pwd.old_password" type="password" placeholder="请输入原密码" />
            </div>
            <div class="field">
              <label>新密码</label>
              <input v-model="pwd.new_password" type="password" placeholder="至少 6 位" />
            </div>
            <p v-if="pwdMsg" class="form-msg" :class="{ ok: pwdOk }">{{ pwdMsg }}</p>
            <button class="btn-primary btn-block" @click="savePassword" :disabled="pwdLoading">
              {{ pwdLoading ? "提交中..." : "修改密码" }}
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>免费方案</h3>
        <div class="mini-plan-grid">
          <div v-for="p in plans" :key="p.id" class="mini-plan">
            <h4>{{ p.name }}</h4>
            <div class="mini-price">¥{{ p.price }}<span>/月</span></div>
            <p>{{ p.quota }} 次/月</p>
            <button class="btn-primary" disabled>免费使用中</button>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>购买记录</h3>
        <table v-if="orders.length">
          <thead>
            <tr><th>订单号</th><th>套餐</th><th>金额</th><th>状态</th><th>时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id">
              <td>{{ o.order_no }}</td>
              <td>{{ o.plan_name }}</td>
              <td>¥{{ o.amount }}</td>
              <td>{{ o.status === "paid" ? "已支付" : "待支付" }}</td>
              <td>{{ formatDate(o.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无购买记录</p>
      </div>

      <div class="section">
        <h3>使用记录</h3>
        <table v-if="usage.length">
          <thead>
            <tr><th>时间</th><th>接口</th><th>主题</th><th>状态</th><th>任务ID</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in usage" :key="u.id">
              <td>{{ formatDate(u.created_at) }}</td>
              <td>{{ u.endpoint }}</td>
              <td>{{ u.video_subject }}</td>
              <td>{{ statusText(u.status) }}</td>
              <td class="mono">{{ u.task_id || "-" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无使用记录</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { api } from "../api/index.js";
import { useAuthStore } from "../store/auth.js";

const auth = useAuthStore();
const token = computed(() => auth.token);
const me = ref(null);
const plans = ref([]);
const orders = ref([]);
const usage = ref([]);

const profile = reactive({ username: "" });
const profileMsg = ref("");
const profileOk = ref(false);
const profileLoading = ref(false);

const pwd = reactive({ old_password: "", new_password: "" });
const pwdMsg = ref("");
const pwdOk = ref(false);
const pwdLoading = ref(false);

onMounted(async () => {
  if (!token.value) return;
  try {
    me.value = await api.me(token.value);
    profile.username = me.value.user.username;
    plans.value = (await api.plans()).plans;
    orders.value = (await api.myOrders(token.value)).orders;
    usage.value = (await api.myUsage(token.value)).logs;
  } catch (e) {
    auth.logout();
  }
});

async function saveProfile() {
  profileMsg.value = "";
  profileLoading.value = true;
  try {
    const data = await api.updateProfile(token.value, { username: profile.username });
    profileMsg.value = "资料已保存";
    profileOk.value = true;
    me.value.user.username = data.username;
  } catch (e) {
    profileMsg.value = e.message;
    profileOk.value = false;
  } finally {
    profileLoading.value = false;
  }
}

async function savePassword() {
  pwdMsg.value = "";
  pwdLoading.value = true;
  try {
    const data = await api.updatePassword(token.value, pwd);
    pwdMsg.value = data.message;
    pwdOk.value = true;
    pwd.old_password = "";
    pwd.new_password = "";
  } catch (e) {
    pwdMsg.value = e.message;
    pwdOk.value = false;
  } finally {
    pwdLoading.value = false;
  }
}

async function upgrade(plan) {
  try {
    const data = await api.createOrder(token.value, { plan_id: plan.id, simulate: true });
    alert(data.message);
    me.value = await api.me(token.value);
    orders.value = (await api.myOrders(token.value)).orders;
  } catch (e) {
    alert(e.message);
  }
}

function formatDate(s) {
  if (!s) return "-";
  return s.replace("T", " ").slice(0, 19);
}

function statusText(s) {
  return { success: "成功", failed: "失败", error: "错误" }[s] || s;
}
</script>

<style scoped>
.membership {
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 20px;
}

.membership h2 {
  font-size: 28px;
  margin-bottom: 24px;
}

.nologin {
  color: #6b7280;
}

.member-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 32px;
}

.plan-box,
.usage-box {
  background: linear-gradient(135deg, #4f6ef7, #7b5cf0);
  color: #fff;
  border-radius: 12px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-box .label,
.usage-box .label {
  opacity: 0.85;
  font-size: 14px;
}

.plan-name,
.usage-num {
  font-size: 30px;
  font-weight: 700;
}

.quota,
.expire,
.total {
  font-size: 13px;
  opacity: 0.9;
}

.section {
  background: #fff;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.section h3 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.mini-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.mini-plan {
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}

.mini-plan h4 {
  margin-bottom: 8px;
}

.mini-price {
  font-size: 24px;
  font-weight: 700;
  color: #4f6ef7;
  margin-bottom: 8px;
}

.mini-price span {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 400;
}

.mini-plan p {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 14px;
}

.btn-primary {
  width: 100%;
  background: #4f6ef7;
  color: #fff;
  padding: 10px;
  border-radius: 6px;
}

.btn-primary:disabled {
  background: #cbd5e1;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 10px 12px;
  border: 1px solid #eee;
  text-align: left;
}

th {
  background: #f8fafc;
  color: #4b5563;
}

.mono {
  font-family: "SF Mono", Consolas, monospace;
  font-size: 12px;
}

.empty {
  color: #9ca3af;
  font-size: 14px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 720px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

.settings-card {
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 20px;
}

.settings-card h4 {
  margin-bottom: 16px;
  color: #2c3e50;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 6px;
}

.field input:disabled {
  background: #f1f5f9;
  color: #9ca3af;
}

.btn-block {
  width: 100%;
}

.form-msg {
  font-size: 13px;
  margin: 10px 0;
  color: #ef4444;
}

.form-msg.ok {
  color: #10b981;
}
</style>
