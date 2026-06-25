# Web QR Bao Hanh Can Cau

Next.js app quan ly QR bao hanh cho tung san pham cu the. Admin tao san pham, sinh QR, tim serial va tru luot bao hanh thu cong. Khach quet QR de kich hoat bao hanh lan dau va xem trang thai.

## Chay local

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

Mo `http://localhost:3000`.

## Chay production khong Docker

Phu hop VPS cai Node.js truc tiep:

```bash
npm ci
npm run build
npm run start
```

Nen chay bang process manager nhu `pm2`:

```bash
npm install -g pm2
pm2 start npm --name web-bao-hanh -- start
pm2 save
```

Neu dung domain that, dat `NEXT_PUBLIC_SITE_URL=https://ten-domain-cua-anh.vn` de QR sinh dung link public.

## Chay production bang Docker

```bash
docker build -t web-bao-hanh .
docker run -d --name web-bao-hanh --env-file .env.local -p 3000:10000 web-bao-hanh
```

Sau do tro Nginx/Caddy tu domain vao `http://127.0.0.1:3000`.

## Cau hinh Supabase

1. Tao project Supabase.
2. Chay SQL trong `supabase/schema.sql`.
3. Dien cac bien trong `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SHOP_NAME=Ten shop
NEXT_PUBLIC_SHOP_PHONE=0900000000
NEXT_PUBLIC_SHOP_ZALO=https://zalo.me/0900000000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=mat-khau-admin
```

`SUPABASE_SERVICE_ROLE_KEY` chi duoc dung o server, khong dua vao client.

## Luong chinh

- Vao `/admin/login` va nhap `ADMIN_PASSWORD`.
- Tao san pham moi de he thong sinh QR rieng.
- Mo chi tiet san pham de tai QR PNG va in/dan len can cau.
- Khach quet QR vao `/warranty/[qrCode]`; lan dau se tu kich hoat bao hanh.
- Sau khi xu ly bao hanh ngoai doi, admin vao chi tiet san pham, nhap ghi chu va bam `Tru 1 luot bao hanh`.

## Kiem tra

```bash
npm run lint
npm run build
```
