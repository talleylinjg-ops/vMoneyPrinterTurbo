<template>
  <div class="pricing">
    <h2>完全免费</h2>
    <p class="sub">Pexels / Pixabay 素材，不限次数，无需付费</p>
    <div class="plan-grid">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card"
        :class="{ featured: plan.price === 0 }"
      >
        <h3>{{ plan.name }}</h3>
        <div class="price">
          <span class="amount">¥{{ plan.price }}</span>
          <span class="period">/ 月</span>
        </div>
        <p class="desc">{{ plan.description }}</p>
        <ul class="perks">
          <li>{{ plan.price === 0 ? "不限次数" : plan.quota + " 次/月" }}</li>
          <li>Pexels / Pixabay 免费素材</li>
          <li>本地文案，无需大模型</li>
          <li>Edge TTS 配音 + 字幕</li>
        </ul>
        <router-link to="/register" class="btn-primary">免费开始</router-link>
      </div>
    </div>
    <div v-if="msg" class="toast">{{ msg }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "../api/index.js";
import { useAuthStore } from "../store/auth.js";

const plans = ref([]);
const msg = ref("");
const auth = useAuthStore();

onMounted(async () => {
  const data = await api.plans();
  plans.value = data.plans;
});

async function buy(plan) {
  if (!auth.token) {
    window.location.href = "/login";
    return;
  }
  try {
    const data = await api.createOrder(auth.token, { plan_id: plan.id, simulate: true });
    msg.value = data.message;
    setTimeout(() => (msg.value = ""), 3000);
  } catch (e) {
    msg.value = e.message;
    setTimeout(() => (msg.value = ""), 3000);
  }
}
</script>

<style scoped>
.pricing {
  max-width: 1100px;
  margin: 0 auto;
  padding: 60px 20px;
  text-align: center;
}

.pricing h2 {
  font-size: 32px;
  margin-bottom: 8px;
}

.sub {
  color: #6b7280;
  margin-bottom: 40px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.plan-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
}

.plan-card.featured {
  border: 2px solid #4f6ef7;
}

.plan-card h3 {
  font-size: 20px;
  margin-bottom: 12px;
}

.price {
  margin-bottom: 12px;
}

.amount {
  font-size: 36px;
  font-weight: 700;
  color: #4f6ef7;
}

.period {
  color: #9ca3af;
}

.desc {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 20px;
}

.perks {
  list-style: none;
  text-align: left;
  margin-bottom: 24px;
  flex: 1;
}

.perks li {
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
  font-size: 14px;
  color: #374151;
}

.btn-primary {
  background: #4f6ef7;
  color: #fff;
  padding: 12px;
  border-radius: 6px;
  display: block;
  text-align: center;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: #fff;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 999;
}
</style>
