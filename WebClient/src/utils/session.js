const ACCESS = "accessToken";
const USER = "currentUser";
export const session = {
  token: () => localStorage.getItem(ACCESS),
  user: () => {
    try {
      return JSON.parse(localStorage.getItem(USER) || "null");
    } catch {
      return null;
    }
  },
  save: ({ accessToken, user }) => {
    localStorage.setItem(ACCESS, accessToken);
    localStorage.setItem(USER, JSON.stringify(user));
  },
  saveToken: (token) => localStorage.setItem(ACCESS, token),
  saveUser: (user) => localStorage.setItem(USER, JSON.stringify(user)),
  clear: () => {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(USER);
  },
};
