# Web QR Bao Hanh Can Cau

Next.js app quan ly QR bao hanh cho tung serial san pham. Admin tao loai san pham, sinh QR theo so luong, in tem, xem serial va tru luot bao hanh thu cong. Khach quet QR, nhap ten + so dien thoai de kich hoat bao hanh va xem phieu bao hanh dien tu.

## Chay local voi PostgreSQL Docker

```bash
npm install
copy .env.local.example .env.local
docker compose up -d postgres
npm run dev
```

Mo `http://localhost:3000`.

PostgreSQL local:

```txt
host: localhost
port: 15432
database: web_bao_hanh
user: web_bao_hanh
password: web_bao_hanh_password
```

Schema duoc tu dong chay lan dau khi container Postgres tao volume moi tu file `postgres/schema.sql`.

## Chay full Docker Compose

```bash
copy .env.example .env
docker compose up -d --build
```

App se chay tai `http://localhost:3000`, Postgres chay trong container rieng va du lieu nam trong Docker volume `postgres_data`.

## Chay production tren VPS

Nen dung Docker Compose va reverse proxy Caddy/Nginx:

```bash
cp .env.example .env
# sua .env: domain, shop, admin password, postgres password
docker compose up -d --build
```

Sau do tro domain vao app port `3000` hoac sua compose/reverse proxy theo ha tang cua anh.

Bien moi truong quan trong trong file `.env`:

```bash
NEXT_PUBLIC_SITE_URL=https://ten-domain-cua-anh.vn
NEXT_PUBLIC_SHOP_NAME=Ten shop
NEXT_PUBLIC_SHOP_PHONE=0900000000
NEXT_PUBLIC_SHOP_ZALO=https://zalo.me/0900000000
ADMIN_PASSWORD=mat-khau-admin
POSTGRES_DB=web_bao_hanh
POSTGRES_USER=web_bao_hanh
POSTGRES_PASSWORD=mat-khau-postgres
APP_HOST_PORT=3000
POSTGRES_HOST_PORT=15432
```

## Backup database

Backup nhanh tren server:

```bash
docker exec web-bao-hanh-postgres pg_dump -U web_bao_hanh web_bao_hanh | gzip > backup-$(date +%F).sql.gz
```

Nen dat cron backup hang ngay va copy file backup ra ngoai server.

## Luong chinh

- Vao `/admin/login` va nhap `ADMIN_PASSWORD`.
- Tao loai san pham.
- Mo loai san pham de sinh QR/serial theo so luong.
- In tem QR va dan len can cau.
- Khach quet QR, nhap ten + so dien thoai de kich hoat bao hanh.
- Admin mo serial de xem thong tin khach va tru luot bao hanh khi can.

## Kiem tra

```bash
npm run lint
npm run build
```
