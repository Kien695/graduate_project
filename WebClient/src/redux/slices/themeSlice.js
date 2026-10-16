import { createSlice } from "@reduxjs/toolkit";
const initial = localStorage.getItem("theme") || "light";
document.documentElement.classList.toggle("dark", initial === "dark");
const slice = createSlice({
  name: "theme",
  initialState: { mode: initial },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("theme", state.mode);
      document.documentElement.classList.toggle("dark", state.mode === "dark");
    },
  },
});
export const { toggleTheme } = slice.actions;
export default slice.reducer;
