<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="MPT logo"
  >
    <defs>
      <linearGradient id="mpt-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#4f6ef7" />
        <stop offset="1" stop-color="#7b5cf0" />
      </linearGradient>
      <linearGradient id="mpt-play" x1="26" y1="20" x2="40" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#e0e7ff" />
      </linearGradient>
    </defs>

    <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#mpt-bg)" />

    <rect x="12" y="20" width="32" height="26" rx="4" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" />

    <path d="M27 24.5v17l14-8.5z" fill="url(#mpt-play)" />

    <path
      d="M48.5 12l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z"
      fill="#10b981"
    />
    <circle cx="12.5" cy="50" r="2" fill="#10b981" fill-opacity="0.85" />
    <circle cx="52.5" cy="47" r="2" fill="#ffffff" fill-opacity="0.9" />
    <circle cx="18" cy="13" r="1.8" fill="#ffffff" fill-opacity="0.8" />
  </svg>
</template>

<script setup>
defineProps({
  size: { type: [Number, String], default: 28 },
});
</script>
