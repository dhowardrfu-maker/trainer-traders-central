import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { FavouritesProvider } from "@/hooks/useFavourites";
import { NotificationsProvider } from "@/hooks/useNotifications";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import CompleteProfile from "./pages/CompleteProfile.tsx";
import Sell from "./pages/Sell.tsx";
import ListingDetail from "./pages/ListingDetail.tsx";
import Checkout from "./pages/Checkout.tsx";
import OrderConfirmation from "./pages/OrderConfirmation.tsx";
import Profile from "./pages/Profile.tsx";
import Search from "./pages/Search.tsx";
import Messages from "./pages/Messages.tsx";
import MessageThread from "./pages/MessageThread.tsx";
import EditListing from "./pages/EditListing.tsx";
import About from "./pages/About.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import NotFound from "./pages/NotFound.tsx";
import ShippingLabel from "./pages/ShippingLabel.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <FavouritesProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/sell" element={<Sell />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route path="/checkout/:id" element={<Checkout />} />
                <Route path="/order/:id" element={<OrderConfirmation />} />
                <Route path="/shipping/:id" element={<ShippingLabel />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/search" element={<Search />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<MessageThread />} />
                <Route path="/listing/:id/edit" element={<EditListing />} />
                <Route path="/about" element={<About />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </FavouritesProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
