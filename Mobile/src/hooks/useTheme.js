// src/hooks/useTheme.js
import { useSelector } from "react-redux";
import { LIGHT_COLORS, DARK_COLORS } from "../utils/theme";

export const useTheme = () => {
  const mode = useSelector((state) => state.theme.mode);
  const isDark = mode === "dark";
  return { mode, isDark, colors: isDark ? DARK_COLORS : LIGHT_COLORS };
};
