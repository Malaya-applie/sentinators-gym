import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function adminApi() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("gym_admin_token")
      : null;
  return axios.create({
    baseURL: BASE,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  goal?: string;
  createdAt: string;
  _count: { memberships: number; orders: number };
}

export interface AdminMembership {
  id: number;
  status: string;
  registrationFee?: number;
  totalAmount?: number;
  startDate?: string;
  endDate?: string;
  emergencyContact?: string;
  address?: string;
  acceptedAgreement?: boolean;
  acceptedTerms?: boolean;
  signatureDataUrl?: string;
  paymentFrequency?: string;
  registrationDetails?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string };
  plan: {
    id: number;
    name: string;
    duration: string;
    price: number;
    currency: string;
  };
  additionalPlanIds?: number[];
  additionalPlans?: {
    id: number;
    name: string;
    duration: string;
    price: number;
    currency: string;
  }[];
}

export interface AdminOrder {
  id: number;
  status: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  user: { id: number; name: string; email: string };
  items: {
    quantity: number;
    unitPrice: number;
    product: { id: number; name: string };
  }[];
}

export interface AdminStats {
  totalUsers: number;
  pendingMemberships: number;
  approvedMemberships: number;
  pendingOrders: number;
  approvedOrders: number;
  totalOrders: number;
}

export interface AdminUserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  goal?: string;
  experience?: string;
  createdAt: string;
  memberships: (Omit<AdminMembership, "user"> & {
    additionalPlans: {
      id: number;
      name: string;
      duration: string;
      price: number;
      currency: string;
    }[];
  })[];
  orders: Omit<AdminOrder, "user">[];
}

interface AdminState {
  admin: { id: number; name: string; email: string } | null;
  token: string | null;
  stats: AdminStats | null;
  users: AdminUser[];
  selectedUser: AdminUserDetail | null;
  memberships: AdminMembership[];
  orders: AdminOrder[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  admin: null,
  token:
    typeof window !== "undefined"
      ? localStorage.getItem("gym_admin_token")
      : null,
  stats: null,
  users: [],
  selectedUser: null,
  memberships: [],
  orders: [],
  loading: false,
  actionLoading: false,
  error: null,
};

export const fetchAdminMe = createAsyncThunk(
  "admin/me",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi().get("/admin/me");
      return res.data.admin as { id: number; name: string; email: string };
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch admin",
      );
    }
  },
);

export const adminLogin = createAsyncThunk(
  "admin/login",
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await axios.post(`${BASE}/admin/login`, data);
      return res.data as {
        token: string;
        admin: { id: number; name: string; email: string };
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Admin login failed");
    }
  },
);

export const fetchAdminStats = createAsyncThunk(
  "admin/stats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi().get("/admin/stats");
      return res.data as AdminStats;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

export const fetchAdminUsers = createAsyncThunk(
  "admin/users",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi().get("/admin/users");
      return res.data.users as AdminUser[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

export const fetchAdminUserDetail = createAsyncThunk(
  "admin/userDetail",
  async (id: number, { rejectWithValue }) => {
    try {
      const res = await adminApi().get(`/admin/users/${id}`);
      return res.data.user as AdminUserDetail;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

export const fetchAdminMemberships = createAsyncThunk(
  "admin/memberships",
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      const params = status ? `?status=${status}` : "";
      const res = await adminApi().get(`/admin/memberships${params}`);
      return res.data.purchases as AdminMembership[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

export const updateMembershipStatus = createAsyncThunk(
  "admin/updateMembership",
  async (
    data: { id: number; status: "APPROVED" | "REJECTED"; notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await adminApi().patch(`/admin/memberships/${data.id}`, {
        status: data.status,
        notes: data.notes,
      });
      return res.data.purchase as AdminMembership;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

export const fetchAdminOrders = createAsyncThunk(
  "admin/orders",
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      const params = status ? `?status=${status}` : "";
      const res = await adminApi().get(`/admin/orders${params}`);
      return res.data.orders as AdminOrder[];
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

export const renewMembership = createAsyncThunk(
  "admin/renewMembership",
  async (
    data: {
      userId: number;
      planId: number;
      additionalPlanIds?: number[];
      startDate?: string;
      endDate?: string;
      paymentFrequency?: string;
      registrationFee?: number;
      totalAmount?: number;
      notes?: string;
      signatureDataUrl?: string;
      registrationDetails?: Record<string, unknown>;
    },
    { rejectWithValue },
  ) => {
    try {
      const res = await adminApi().post("/admin/memberships/renew", data);
      return res.data.purchase as AdminMembership;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to renew membership",
      );
    }
  },
);

export const updateOrderStatus = createAsyncThunk(
  "admin/updateOrder",
  async (
    data: { id: number; status: "APPROVED" | "REJECTED"; notes?: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await adminApi().patch(`/admin/orders/${data.id}`, {
        status: data.status,
        notes: data.notes,
      });
      return res.data.order as AdminOrder;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Failed");
    }
  },
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    adminLogout(state) {
      state.admin = null;
      state.token = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem("gym_admin_token");
      }
    },
    clearAdminError(state) {
      state.error = null;
    },
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.admin = action.payload.admin;
        state.token = action.payload.token;
        if (typeof window !== "undefined") {
          localStorage.setItem("gym_admin_token", action.payload.token);
        }
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchAdminStats.fulfilled, (state, action) => {
      state.stats = action.payload;
    });

    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchAdminUserDetail.pending, (state) => {
        state.loading = true;
        state.selectedUser = null;
      })
      .addCase(fetchAdminUserDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedUser = action.payload;
      })
      .addCase(fetchAdminUserDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchAdminMemberships.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdminMemberships.fulfilled, (state, action) => {
        state.loading = false;
        state.memberships = action.payload;
      })
      .addCase(fetchAdminMemberships.rejected, (state) => {
        state.loading = false;
      });

    builder
      .addCase(updateMembershipStatus.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateMembershipStatus.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.memberships.findIndex(
          (m) => m.id === action.payload.id,
        );
        if (idx !== -1) state.memberships[idx] = action.payload;
      })
      .addCase(updateMembershipStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchAdminOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchAdminOrders.rejected, (state) => {
        state.loading = false;
      });

    builder
      .addCase(updateOrderStatus.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.orders.findIndex((o) => o.id === action.payload.id);
        if (idx !== -1) state.orders[idx] = action.payload;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(renewMembership.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(renewMembership.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.memberships.unshift(action.payload);
      })
      .addCase(renewMembership.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchAdminMe.fulfilled, (state, action) => {
        state.admin = action.payload;
      })
      .addCase(fetchAdminMe.rejected, (state) => {
        state.admin = null;
        state.token = null;
        if (typeof window !== "undefined") {
          localStorage.removeItem("gym_admin_token");
        }
      });
  },
});

export const { adminLogout, clearAdminError, clearSelectedUser } =
  adminSlice.actions;
export default adminSlice.reducer;
