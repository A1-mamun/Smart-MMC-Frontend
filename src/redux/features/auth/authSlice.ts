import { createSlice } from "@reduxjs/toolkit";
import { TUser } from "@/types/user";

type TAuthState = {
  user: null | TUser;
  token: null | string;
};

const initialState: TAuthState = { user: null, token: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
    },
    logOut: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { setUser, logOut } = authSlice.actions;
export default authSlice.reducer;

export const useCurrentToken = (state: { auth: TAuthState }) => state.auth.token;
export const useCurrentUser = (state: { auth: TAuthState }) => state.auth.user;