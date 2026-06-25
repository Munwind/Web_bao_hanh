import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";

const rods = [
  { src: "/rod-1.jpg", alt: "Bộ nhiều cần câu" },
  { src: "/rod-2.jpg", alt: "Cần câu đỏ đen" },
  { src: "/rod-3.jpg", alt: "Cần câu xanh" },
  { src: "/rod-4.jpg", alt: "Cần câu cán gỗ" },
];

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Hệ thống bảo hành QR</p>
          <h1>Quản lý bảo hành cần câu</h1>
          <p>
            Admin đăng nhập để quản lý sản phẩm, xuất QR cho từng cây cần câu và trừ lượt bảo
            hành khi đã xử lý xong.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/admin">
              <LogIn size={18} /> Đăng nhập admin
            </Link>
          </div>
        </div>

        <div className="rod-gallery" aria-label="Ảnh sản phẩm cần câu">
          {rods.map((rod, index) => (
            <figure className="rod-card" key={rod.src}>
              <Image src={rod.src} alt={rod.alt} width={720} height={720} priority={index === 0} />
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
