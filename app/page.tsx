import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Benefits } from "@/components/benefits";
import { Comparison } from "@/components/comparison";
import { HowItWorks } from "@/components/how-it-works";
import { Solutions } from "@/components/solutions";
import { FAQ } from "@/components/faq";
import { CTA } from "@/components/cta";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Calculator } from "@/components/calculator";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Benefits />
        <Calculator />
        <Comparison />
        <HowItWorks />
        <Solutions />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
