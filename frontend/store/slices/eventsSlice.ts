import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/lib/api";

export interface EventTrainer {
  id: number;
  name: string;
  role: string;
  description?: string | null;
  image?: string | null;
}

export interface GymEvent {
  id: number;
  title: string;
  description?: string | null;
  image?: string | null;
  date: string;
  time?: string | null;
  location?: string | null;
  capacity?: number | null;
  isActive: boolean;
  createdAt: string;
  trainerId?: number | null;
  trainer?: EventTrainer | null;
  _count: { bookings: number };
}

export interface EventBooking {
  id: number;
  eventId: number;
  userId: number;
  createdAt: string;
  event: GymEvent;
}

interface EventsState {
  events: GymEvent[];
  myBookedEventIds: number[];
  loading: boolean;
  bookingLoading: number | null; // eventId being booked
  error: string | null;
  successMessage: string | null;
}

const initialState: EventsState = {
  events: [],
  myBookedEventIds: [],
  loading: false,
  bookingLoading: null,
  error: null,
  successMessage: null,
};

export const fetchEvents = createAsyncThunk(
  "events/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/events");
      return res.data.events as GymEvent[];
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch events",
      );
    }
  },
);

export const fetchMyBookings = createAsyncThunk(
  "events/myBookings",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/events/my-bookings");
      return (res.data.bookings as EventBooking[]).map((b) => b.eventId);
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch bookings",
      );
    }
  },
);

export const bookEvent = createAsyncThunk(
  "events/book",
  async (eventId: number, { rejectWithValue }) => {
    try {
      const res = await api.post(`/events/${eventId}/book`);
      return { eventId, message: res.data.message as string };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Booking failed");
    }
  },
);

export const cancelBooking = createAsyncThunk(
  "events/cancel",
  async (eventId: number, { rejectWithValue }) => {
    try {
      await api.delete(`/events/${eventId}/book`);
      return eventId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || "Cancel failed");
    }
  },
);

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    clearEventMessages(state) {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchMyBookings.fulfilled, (state, action) => {
      state.myBookedEventIds = action.payload;
    });

    builder
      .addCase(bookEvent.pending, (state, action) => {
        state.bookingLoading = action.meta.arg;
        state.error = null;
      })
      .addCase(bookEvent.fulfilled, (state, action) => {
        state.bookingLoading = null;
        state.myBookedEventIds.push(action.payload.eventId);
        state.successMessage = action.payload.message;
        // increment local booking count
        const ev = state.events.find((e) => e.id === action.payload.eventId);
        if (ev) ev._count.bookings += 1;
      })
      .addCase(bookEvent.rejected, (state, action) => {
        state.bookingLoading = null;
        state.error = action.payload as string;
      });

    builder
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.myBookedEventIds = state.myBookedEventIds.filter(
          (id) => id !== action.payload,
        );
        const ev = state.events.find((e) => e.id === action.payload);
        if (ev) ev._count.bookings = Math.max(0, ev._count.bookings - 1);
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearEventMessages } = eventsSlice.actions;
export default eventsSlice.reducer;
