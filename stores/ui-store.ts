import { create } from "zustand";

type UIStore = {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Modals
  createBookingOpen: boolean;
  setCreateBookingOpen: (open: boolean) => void;

  createResourceOpen: boolean;
  setCreateResourceOpen: (open: boolean) => void;

  inviteMemberOpen: boolean;
  setInviteMemberOpen: (open: boolean) => void;

  createInvoiceOpen: boolean;
  setCreateInvoiceOpen: (open: boolean) => void;

  // Booking detail drawer
  selectedBookingId: string | null;
  setSelectedBookingId: (id: string | null) => void;

  // Member detail drawer
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  // Sidebar — open by default on desktop
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Modals
  createBookingOpen: false,
  setCreateBookingOpen: (open) => set({ createBookingOpen: open }),

  createResourceOpen: false,
  setCreateResourceOpen: (open) => set({ createResourceOpen: open }),

  inviteMemberOpen: false,
  setInviteMemberOpen: (open) => set({ inviteMemberOpen: open }),

  createInvoiceOpen: false,
  setCreateInvoiceOpen: (open) => set({ createInvoiceOpen: open }),

  // Drawers
  selectedBookingId: null,
  setSelectedBookingId: (id) => set({ selectedBookingId: id }),

  selectedMemberId: null,
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
}));
