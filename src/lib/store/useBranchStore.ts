import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BranchDetails {
  slug: "rockdale" | "riverwood";
  name: string;
  address: string;
  suburb: string;
  postcode: string;
  phone: string;
  hours: string;
  googleMapsUrl: string;
}

export const BRANCHES: Record<"rockdale" | "riverwood", BranchDetails> = {
  rockdale: {
    slug: "rockdale",
    name: "Fresh Stop Rockdale",
    address: "Shop 1, 2-4 King Street",
    suburb: "Rockdale",
    postcode: "2216",
    phone: "(02) 9567 1188",
    hours: "Mon-Sat 7:00am - 7:30pm | Sun 8:00am - 6:00pm",
    googleMapsUrl: "https://maps.google.com/?q=Shop+1+2-4+King+Street+Rockdale+NSW+2216"
  },
  riverwood: {
    slug: "riverwood",
    name: "Fresh Stop Riverwood",
    address: "319 Belmore Rd",
    suburb: "Riverwood",
    postcode: "2210",
    phone: "(02) 9534 8822",
    hours: "Mon-Sat 7:00am - 7:30pm | Sun 8:00am - 6:00pm",
    googleMapsUrl: "https://maps.app.goo.gl/QACdGqVR9zqDeseG9"
  }
};

interface BranchState {
  currentBranch: BranchDetails;
  isModalOpen: boolean;
  setBranch: (slug: "rockdale" | "riverwood") => void;
  openModal: () => void;
  closeModal: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      currentBranch: BRANCHES.rockdale,
      isModalOpen: false,
      setBranch: (slug) => set({ currentBranch: BRANCHES[slug], isModalOpen: false }),
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false })
    }),
    {
      name: "fresh-stop-branch-selection",
      partialize: (state) => ({ currentBranch: state.currentBranch })
    }
  )
);
