import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "autoDealerTheme";
const getInitialMode = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};
const applyMode = (mode) => {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(STORAGE_KEY, mode);
};

const initialMode = getInitialMode();
applyMode(initialMode);

const themeSlice = createSlice({
  name: "theme",
  initialState: { mode: initialMode },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "dark" ? "light" : "dark";
      applyMode(state.mode);
    },
  },
});

export const { toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
