import { ShopHero } from "@/components/shop/shop-hero";
import { ShopProductsSection } from "@/components/shop/shop-products-section";
import { Footer } from "@/components/footer";

export default function ShopPage() {
  return (
    <main className="min-h-screen relative">
      {/* Fixed Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center md:bg-fixed"
        style={{
          backgroundImage: `url('/gym-bg-texture.png')`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="pt-16">
          <ShopHero />
          <ShopProductsSection />
          <Footer />
        </div>
      </div>
    </main>
  );
}
