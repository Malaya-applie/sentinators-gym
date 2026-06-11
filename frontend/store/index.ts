import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import membershipReducer from "./slices/membershipSlice";
import shopReducer from "./slices/shopSlice";
import adminReducer from "./slices/adminSlice";
import eventsReducer from "./slices/eventsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    membership: membershipReducer,
    shop: shopReducer,
    admin: adminReducer,
    events: eventsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
