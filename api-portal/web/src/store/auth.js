import { defineStore } from "pinia";

const TOKEN_KEY = "mpt_token";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || "",
  }),
  actions: {
    setToken(token) {
      this.token = token;
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    },
    logout() {
      this.setToken("");
    },
  },
});
