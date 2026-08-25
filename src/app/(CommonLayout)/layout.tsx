import Footer from "@/components/shared/Footer";
import Navbar from "@/components/shared/Navbar";
import { ReactNode } from "react";

const CommonLayout = ({ children }: { children: ReactNode }) => (
  <>
    <Navbar />
    <main className="min-h-[calc(100vh-100px)]">{children}</main>
    <Footer />
  </>
);

export default CommonLayout;