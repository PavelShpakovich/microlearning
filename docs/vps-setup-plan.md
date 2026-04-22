# План настройки HostFly CloudVPS-1 для Clario

## Спецификация сервера

| Параметр  | Значение                                        |
| --------- | ----------------------------------------------- |
| Тариф     | CloudVPS-1                                      |
| vCPU      | 1                                               |
| RAM       | 2 GB                                            |
| NVMe SSD  | 40 GB                                           |
| Трафик    | 1 TB/мес                                        |
| ОС        | Ubuntu 24.04 LTS                                |
| Цена      | 32.99 BYN/мес (~$10)                            |
| Провайдер | HostFly.by (ООО «Суппорт чейн», ПВТ), ЦОД Минск |

### Распределение ресурсов (2 GB RAM)

| Компонент                    | RAM (оценка)             | Диск                 |
| ---------------------------- | ------------------------ | -------------------- |
| ОС + systemd                 | ~150 MB                  | ~3 GB                |
| PostgreSQL 16                | ~300–400 MB              | ~2–10 GB             |
| Node.js (Next.js standalone) | ~300–500 MB              | ~500 MB              |
| Nginx                        | ~10 MB                   | ~50 MB               |
| Postfix                      | ~20 MB                   | ~50 MB               |
| Certbot                      | ~0 (запускается по cron) | ~10 MB               |
| Резерв для пиков             | ~600–800 MB              |                      |
| **Итого**                    | **~1.2–1.4 GB / 2 GB**   | **~6–14 GB / 40 GB** |

> CloudVPS-1 хватит для закрытой и ранней открытой беты (до ~100 одновременных пользователей). При росте — апгрейд до CloudVPS-2 без миграции данных (HostFly позволяет апгрейд на лету).

---

## Этап 1: Базовая настройка сервера (30 мин)

### 1.1 Первое подключение

```bash
# HostFly пришлёт root-пароль на email
ssh root@<IP_ADDRESS>
```

### 1.2 Обновление системы

```bash
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban htop unzip nano
```

### 1.3 Создание рабочего пользователя

```bash
adduser clario
usermod -aG sudo clario

# Копируем SSH-ключ
mkdir -p /home/clario/.ssh
cp ~/.ssh/authorized_keys /home/clario/.ssh/
chown -R clario:clario /home/clario/.ssh
chmod 700 /home/clario/.ssh
chmod 600 /home/clario/.ssh/authorized_keys
```

### 1.4 Настройка SSH (безопасность)

```bash
nano /etc/ssh/sshd_config
```

Изменить:

```
Port 2222                    # Нестандартный порт
PermitRootLogin no           # Запрет root-входа
PasswordAuthentication no    # Только SSH-ключи
MaxAuthTries 3
AllowUsers clario
```

```bash
systemctl restart sshd
```

> **ВАЖНО:** Перед изменением SSH откройте второе подключение, чтобы не потерять доступ.

### 1.5 Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 25/tcp comment 'SMTP outgoing'
ufw enable
ufw status verbose
```

### 1.6 Fail2ban

```bash
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600
findtime = 600
```

```bash
systemctl enable fail2ban
systemctl start fail2ban
```

### 1.7 Swap (страховка для 2 GB RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Настройка агрессивности swap (меньше = реже используется)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

### 1.8 Часовой пояс и локаль

```bash
timedatectl set-timezone Europe/Minsk
locale-gen ru_RU.UTF-8
update-locale LANG=ru_RU.UTF-8
```

---

## Этап 2: PostgreSQL (30 мин)

### 2.1 Установка PostgreSQL 16

```bash
# Официальный репозиторий PostgreSQL
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-client-16
```

### 2.2 Создание БД и пользователя

```bash
sudo -u postgres psql
```

```sql
-- Основная БД
CREATE USER clario WITH PASSWORD '<STRONG_PASSWORD_HERE>';
CREATE DATABASE clario_prod OWNER clario;

-- Расширения (аналог того, что Supabase ставит автоматически)
\c clario_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Права
GRANT ALL PRIVILEGES ON DATABASE clario_prod TO clario;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO clario;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO clario;

\q
```

### 2.3 Оптимизация PostgreSQL для 2 GB RAM

```bash
nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# Память (консервативно для 2 GB RAM)
shared_buffers = 512MB            # 25% RAM
effective_cache_size = 1GB        # 50% RAM
work_mem = 4MB                    # Для сортировок в запросах
maintenance_work_mem = 128MB      # Для VACUUM, CREATE INDEX

# WAL
wal_buffers = 16MB
min_wal_size = 80MB
max_wal_size = 1GB
checkpoint_completion_target = 0.9

# Подключения
max_connections = 50              # Next.js standalone — один процесс, ~10–20 подключений
listen_addresses = 'localhost'    # ТОЛЬКО локальные подключения (без внешнего доступа)

# Логирование
log_min_duration_statement = 500  # Логировать запросы >500ms
log_statement = 'ddl'             # Логировать DDL-операции
log_connections = on
log_disconnections = on

# Производительность
random_page_cost = 1.1            # NVMe SSD — близко к seq_page_cost
effective_io_concurrency = 200    # Для SSD
```

```bash
nano /etc/postgresql/16/main/pg_hba.conf
```

Убедиться, что есть строка:

```
local   all   clario   scram-sha-256
host    all   clario   127.0.0.1/32   scram-sha-256
```

```bash
systemctl restart postgresql
systemctl enable postgresql
```

### 2.4 Проверка

```bash
sudo -u clario psql -d clario_prod -c "SELECT version();"
```

---

## Этап 3: Node.js и Next.js (20 мин)

### 3.1 Установка Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # v20.x
npm -v
```

### 3.2 Установка PM2 (процесс-менеджер)

```bash
npm install -g pm2
```

### 3.3 Директория приложения

> **Почему нет `git clone`?**
> Исходный код на VPS не хранится. GitHub Actions собирает Next.js (`npm run build`) локально
> и заливает готовый `.next/standalone/` на VPS через rsync. VPS получает только
> скомпилированный артефакт — это быстрее, чище и не требует Node.js-зависимостей на сервере.

```bash
sudo -u clario mkdir -p /home/clario/app/.next/standalone
sudo -u clario mkdir -p /home/clario/app/logs
sudo -u clario mkdir -p /home/clario/backups
```

### 3.4 Next.js standalone build

В `next.config.ts` проекта добавить (если нет):

```typescript
const nextConfig = {
  output: 'standalone',
  // ... остальное
};
```

### 3.5 Файл запуска PM2

Создать `/home/clario/app/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'clario',
      script: './server.js',
      cwd: '/home/clario/app/.next/standalone',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
      },
      // Ресурсы (ограничение для 2 GB RAM)
      max_memory_restart: '512M',
      // Логи
      error_file: '/home/clario/app/logs/error.log',
      out_file: '/home/clario/app/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Перезапуск
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
    },
  ],
};
```

### 3.6 Автостарт PM2 (только настройка — запуск после первого деплоя)

```bash
# Настроить автозапуск при перезагрузке сервера
pm2 startup systemd -u clario --hp /home/clario
# Выполнить команду, которую выведет pm2 startup (начинается с sudo env PATH=...)

# pm2 start и pm2 save — ПОСЛЕ первого деплоя (см. раздел 7.5)
```

---

## Этап 4: Nginx + SSL (20 мин)

### 4.1 Установка Nginx

```bash
apt install -y nginx
```

### 4.2 Конфигурация сайта

```bash
nano /etc/nginx/sites-available/clario
```

```nginx
# Редирект HTTP → HTTPS
server {
    listen 80;
    server_name tryclario.by www.tryclario.by;
    return 301 https://tryclario.by$request_uri;
}

# Основной сервер
server {
    listen 443 ssl http2;
    server_name tryclario.by;

    # SSL (certbot заполнит)
    ssl_certificate /etc/letsencrypt/live/tryclario.by/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tryclario.by/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Заголовки безопасности
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    gzip_comp_level 5;

    # Статика Next.js (кэш на год — файлы содержат hash в имени)
    location /_next/static/ {
        alias /home/clario/app/.next/standalone/.next/static/;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Публичные файлы (favicon, шрифты, og-image)
    location /fonts/ {
        alias /home/clario/app/public/fonts/;
        expires 365d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /favicon.ico {
        alias /home/clario/app/public/favicon.ico;
        expires 30d;
        access_log off;
    }

    # Проксирование всего остального на Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;

        # Лимит размера тела запроса
        client_max_body_size 2M;
    }
}

# Редирект www → без www
server {
    listen 443 ssl http2;
    server_name www.tryclario.by;

    ssl_certificate /etc/letsencrypt/live/tryclario.by/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tryclario.by/privkey.pem;

    return 301 https://tryclario.by$request_uri;
}
```

### 4.3 Активация

```bash
ln -s /etc/nginx/sites-available/clario /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
```

### 4.4 SSL с Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx

# ПЕРЕД этим шагом: DNS A-запись tryclario.by → IP VPS
# Снизить TTL до 300 за сутки до переключения DNS
certbot --nginx -d tryclario.by -d www.tryclario.by --email pavelekname@gmail.com --agree-tos --no-eff-email
```

Certbot автоматически:

- получит сертификат
- настроит автообновление (`systemctl list-timers` — certbot.timer)

### 4.5 Nginx rate limiting (защита API)

Добавить в `/etc/nginx/nginx.conf` в блок `http`:

```nginx
# Глобальные лимиты
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/s;
```

Добавить в блок `server` в `sites-available/clario`:

```nginx
# Лимит на API
location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:3000;
    # ... те же proxy_set_header что выше
}

# Строгий лимит на auth
location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://127.0.0.1:3000;
    # ... те же proxy_set_header что выше
}
```

```bash
systemctl restart nginx
```

---

## Этап 5: Postfix — отправка email (15 мин)

### 5.1 Установка

```bash
apt install -y postfix

# При установке выбрать:
# - Тип: Internet Site
# - Имя системы: tryclario.by
```

### 5.2 Конфигурация

```bash
nano /etc/postfix/main.cf
```

```ini
myhostname = mail.tryclario.by
mydomain = tryclario.by
myorigin = $mydomain
mydestination = localhost
relayhost =
inet_interfaces = loopback-only    # Только локальная отправка
inet_protocols = ipv4

# Безопасность
smtpd_tls_security_level = may
smtp_tls_security_level = may
smtp_tls_loglevel = 1

# Ограничения
message_size_limit = 5242880       # 5 MB
mailbox_size_limit = 0
```

```bash
systemctl restart postfix
systemctl enable postfix
```

### 5.3 DNS-записи (настроить в DNS-менеджере HostFly после переноса домена)

> **Перед настройкой DNS** нужно перенести домен tryclario.by с domain.by на HostFly. Порядок переноса:
>
> 1. Войти в panel.domain.by → tryclario.by → «Управление» → разблокировать домен для трансфера
> 2. Получить **EPP/Auth-код** (authinfo) в панели domain.by
> 3. В панели HostFly → «Домены» → «Перенести домен» → ввести tryclario.by и EPP-код
> 4. Подтвердить трансфер по email (придёт на контактный email регистранта)
> 5. Ждать завершения — для зоны `.by` это до **5 рабочих дней**
> 6. После переноса домен управляется полностью в панели HostFly

| Тип | Имя                  | Значение                                                   |
| --- | -------------------- | ---------------------------------------------------------- |
| A   | tryclario.by         | `<IP_VPS>`                                                 |
| A   | www.tryclario.by     | `<IP_VPS>`                                                 |
| A   | mail.tryclario.by    | `<IP_VPS>`                                                 |
| MX  | tryclario.by         | `mail.tryclario.by` (приоритет 10)                         |
| TXT | tryclario.by         | `v=spf1 ip4:<IP_VPS> -all`                                 |
| TXT | \_dmarc.tryclario.by | `v=DMARC1; p=quarantine; rua=mailto:pavelekname@gmail.com` |

### 5.4 DKIM

```bash
apt install -y opendkim opendkim-tools

# Генерация ключа
mkdir -p /etc/opendkim/keys/tryclario.by
opendkim-genkey -b 2048 -d tryclario.by -D /etc/opendkim/keys/tryclario.by -s mail -v
chown opendkim:opendkim /etc/opendkim/keys/tryclario.by/mail.private
```

Настроить `/etc/opendkim.conf`:

```
Domain                  tryclario.by
KeyFile                 /etc/opendkim/keys/tryclario.by/mail.private
Selector                mail
Socket                  inet:8891@localhost
```

Добавить DNS TXT-запись из файла `/etc/opendkim/keys/tryclario.by/mail.txt`:

```
mail._domainkey.tryclario.by  TXT  "v=DKIM1; h=sha256; k=rsa; p=<PUBLIC_KEY>"
```

Связать Postfix с OpenDKIM в `/etc/postfix/main.cf`:

```ini
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
```

```bash
systemctl restart opendkim
systemctl restart postfix
```

### 5.5 Проверка

```bash
echo "Test email from Clario VPS" | mail -s "Test" pavelekname@gmail.com
# Проверить доставку и заголовки (SPF, DKIM, DMARC)
```

---

## Этап 6: Бэкапы (10 мин)

### 6.1 Скрипт бэкапа PostgreSQL

```bash
nano /home/clario/backups/backup.sh
```

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/clario/backups/db"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/clario_prod_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Дамп с сжатием
pg_dump -U clario -d clario_prod --no-owner --no-acl | gzip > "$BACKUP_FILE"

# Удаление старых бэкапов
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# Лог
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> /home/clario/backups/backup.log
```

```bash
chmod +x /home/clario/backups/backup.sh
```

### 6.2 Cron (ежедневно в 3:00 ночи)

```bash
sudo -u clario crontab -e
```

```cron
# Бэкап БД — каждый день в 03:00
0 3 * * * /home/clario/backups/backup.sh

# Обновление SSL-сертификата (certbot делает сам, но на всякий случай)
0 4 1 * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 6.3 Внешний бэкап (рекомендуется)

Раз в неделю копировать последний бэкап на другую машину:

```bash
# На локальной машине (macOS) — добавить в cron/launchd
scp -P 2222 clario@<IP_VPS>:/home/clario/backups/db/$(ssh -p 2222 clario@<IP_VPS> "ls -t /home/clario/backups/db/ | head -1") ~/clario-backups/
```

---

## Этап 7: CI/CD через GitHub Actions (15 мин)

### 7.1 SSH-ключ для деплоя

На VPS:

```bash
sudo -u clario ssh-keygen -t ed25519 -f /home/clario/.ssh/deploy_key -N ""
cat /home/clario/.ssh/deploy_key.pub >> /home/clario/.ssh/authorized_keys
cat /home/clario/.ssh/deploy_key  # Скопировать приватный ключ
```

### 7.2 GitHub Secrets

В репозитории → Settings → Secrets → Actions:

| Secret         | Значение                          |
| -------------- | --------------------------------- |
| `VPS_HOST`     | IP-адрес VPS                      |
| `VPS_USER`     | `clario`                          |
| `VPS_SSH_KEY`  | Содержимое deploy_key (приватный) |
| `VPS_SSH_PORT` | `2222`                            |

### 7.3 GitHub Actions workflow

Создать `.github/workflows/deploy.yml`:

```yaml
name: Deploy to HostFly VPS

on:
  push:
    branches: [main]

concurrency:
  group: deploy
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          # Все env-переменные, нужные для build
          NEXT_PUBLIC_APP_URL: https://tryclario.by
          # ... остальные NEXT_PUBLIC_* переменные

      - name: Prepare standalone
        run: |
          # Копируем статику и public в standalone
          cp -r .next/static .next/standalone/.next/static
          cp -r public .next/standalone/public

      - name: Deploy via rsync
        uses: burnett01/rsync-deployments@7.0.1
        with:
          switches: -avz --delete --exclude='node_modules' --exclude='.env'
          path: .next/standalone/
          remote_path: /home/clario/app/.next/standalone/
          remote_host: ${{ secrets.VPS_HOST }}
          remote_port: ${{ secrets.VPS_SSH_PORT }}
          remote_user: ${{ secrets.VPS_USER }}
          remote_key: ${{ secrets.VPS_SSH_KEY }}

      - name: Restart app
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          port: ${{ secrets.VPS_SSH_PORT }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/clario/app
            pm2 restart clario --update-env
            pm2 save
```

### 7.4 Первый деплой

После настройки всех предыдущих этапов и заполнения GitHub Secrets:

```bash
# 1. На локальной машине — пуш в main запускает GitHub Actions
git push origin main
```

GitHub Actions выполнит:

1. `npm ci` + `npm run build`
2. rsync `.next/standalone/` → VPS `/home/clario/app/.next/standalone/`
3. Попытается запустить `pm2 restart clario` — **первый раз упадёт** (процесс ещё не создан)

После завершения rsync — зайти на VPS и запустить PM2 вручную первый раз:

```bash
# На VPS:
cd /home/clario/app
pm2 start ecosystem.config.cjs
pm2 save  # Сохранить список процессов для автостарта
```

Со второго пуша и далее — `pm2 restart clario` в workflow работает автоматически.

> Если нужно задеплоить без пуша в main (например, для первоначальной настройки),
> можно вручную собрать и залить с локальной машины:
>
> ```bash
> npm run build
> cp -r .next/static .next/standalone/.next/static
> cp -r public .next/standalone/public
> rsync -avz -e "ssh -p 2222" .next/standalone/ clario@<VPS_IP>:/home/clario/app/.next/standalone/
> ```

---

### 7.5 Файл .env на VPS

```bash
nano /home/clario/app/.next/standalone/.env
```

```env
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tryclario.by
NEXTAUTH_URL=https://tryclario.by
NEXTAUTH_SECRET=<GENERATE_WITH_openssl_rand_base64_32>

# Database
DATABASE_URL=postgresql://clario:<DB_PASSWORD>@localhost:5432/clario_prod

# LLM
LLM_PROVIDER=qwen
QWEN_API_KEY=<KEY>
QWEN_MODEL=qwen-plus

# Email
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_FROM=noreply@tryclario.by

# Admin
ADMIN_EMAILS=pavelekname@gmail.com
SUPPORT_EMAIL=pavelekname@gmail.com

# Yandex Metrica
NEXT_PUBLIC_YM_ID=107270131
```

---

## Этап 8: Мониторинг (10 мин)

### 8.1 Healthcheck-эндпоинт

Добавить в приложение `src/app/api/health/route.ts`:

```typescript
export async function GET() {
  // Проверка БД
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: 'ok', db: 'ok', ts: Date.now() });
  } catch {
    return Response.json({ status: 'error', db: 'down' }, { status: 503 });
  }
}
```

### 8.2 Простой мониторинг (cron на VPS)

```bash
nano /home/clario/app/healthcheck.sh
```

```bash
#!/bin/bash
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)

if [ "$HTTP_STATUS" != "200" ]; then
  echo "[$(date)] ALERT: Health check failed (HTTP $HTTP_STATUS)" >> /home/clario/app/logs/healthcheck.log
  pm2 restart clario
  echo "[$(date)] PM2 restart triggered" >> /home/clario/app/logs/healthcheck.log
  # Опционально: уведомление через Telegram-бот
fi
```

```bash
chmod +x /home/clario/app/healthcheck.sh
```

Cron — каждые 5 минут:

```cron
*/5 * * * * /home/clario/app/healthcheck.sh
```

### 8.3 Мониторинг диска и RAM

```bash
nano /home/clario/app/monitor-resources.sh
```

```bash
#!/bin/bash
DISK_USAGE=$(df / --output=pcent | tail -1 | tr -d ' %')
MEM_FREE=$(free -m | awk '/^Mem:/{print $7}')

if [ "$DISK_USAGE" -gt 85 ]; then
  echo "[$(date)] WARNING: Disk usage ${DISK_USAGE}%" >> /home/clario/app/logs/monitor.log
fi

if [ "$MEM_FREE" -lt 100 ]; then
  echo "[$(date)] WARNING: Free memory ${MEM_FREE}MB" >> /home/clario/app/logs/monitor.log
fi
```

```bash
chmod +x /home/clario/app/monitor-resources.sh
```

```cron
*/15 * * * * /home/clario/app/monitor-resources.sh
```

---

## Этап 9: Миграция данных из Supabase (при переходе)

### 9.1 Экспорт данных из Supabase

```bash
# На локальной машине (нужен пароль из Supabase Dashboard → Settings → Database)
pg_dump \
  --host=db.<PROJECT_REF>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --schema=auth \
  --no-owner \
  --no-acl \
  --format=plain \
  --file=supabase_dump.sql
```

### 9.2 Что мигрировать

| Supabase-схема    | Что содержит                        | Действие                                                               |
| ----------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `public.*`        | Все таблицы приложения (~17 таблиц) | Импорт как есть                                                        |
| `auth.users`      | Пользователи, хэши паролей          | Преобразовать в свою таблицу `users` (bcrypt-хэши Supabase совместимы) |
| `auth.identities` | OAuth-провайдеры                    | Не используются (только email/password) — пропустить                   |
| `storage.*`       | Файловое хранилище                  | Не используется — пропустить                                           |

### 9.3 Порядок миграции

```
1. Снизить TTL DNS до 300 сек (за 24ч до переключения)
2. Объявить технические работы (email пользователям)
3. Включить режим maintenance на старом сервере
4. Финальный pg_dump из Supabase
5. Импорт в PostgreSQL на VPS: psql -U clario -d clario_prod < supabase_dump.sql
6. Проверить целостность данных (количество записей, тестовые запросы)
7. Обновить .env на VPS (DATABASE_URL → localhost)
8. Запустить приложение на VPS
9. Переключить DNS A-запись → IP VPS
10. Проверить работоспособность (регистрация, логин, карты, разборы)
11. Отключить Supabase проект
```

---

## Изменения в коде (масштаб)

### Что нужно переписать

| Компонент                                     | Файлов | Сложность   | Подход                                                                                 |
| --------------------------------------------- | ------ | ----------- | -------------------------------------------------------------------------------------- |
| **Supabase Client → Drizzle ORM**             | ~35    | Высокая     | Заменить все `supabaseAdmin.from('table')...` на Drizzle-запросы. Механическая работа. |
| **Supabase Auth → собственные таблицы**       | ~10    | Высокая     | Таблица `users` + bcrypt. Заменить 16 вызовов Admin API. Подробно — раздел ниже.       |
| **Supabase типы → Drizzle-схема**             | ~5     | Средняя     | Сгенерировать `schema.ts` из SQL-миграций. Заменить `Tables<'name'>` → Drizzle-типы.   |
| **set-password-form.tsx** (браузерный клиент) | 1      | Низкая      | Заменить `supabase.auth.updateUser()` на `POST /api/auth/set-password`.                |
| **Dual-auth (src/lib/api/auth.ts)**           | 1      | Низкая      | Убрать Supabase cookie-ветку (`supabase.auth.getUser()`), оставить только NextAuth.    |
| **Resend → nodemailer**                       | ~3     | Низкая      | `Resend.emails.send()` → `nodemailer.sendMail({ host: 'localhost', port: 25 })`.       |
| **Vercel Analytics**                          | 1      | Тривиальная | Уже удалён (`@vercel/analytics` uninstalled).                                          |
| **env-переменные**                            | 1      | Тривиальная | Убрать `SUPABASE_*`, добавить `DATABASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`.   |
| **next.config.ts**                            | 1      | Тривиальная | Добавить `output: 'standalone'`.                                                       |

**Общая оценка: 5–7 рабочих дней** при фокусной работе.

---

### Детали: миграция Supabase Auth

NextAuth JWT уже является сессионным слоем — middleware и большинство приложения не зависят от Supabase для сессий. Supabase Auth используется только как **хранилище пользователей** (пароли, email-верификация).

#### Новая таблица `users`

```sql
-- Добавить в SQL-миграции (новый файл: 0041_add_users_table.sql)
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  role           TEXT NOT NULL DEFAULT 'user',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_email_idx ON users (email);
```

> **Bcrypt-совместимость:** Supabase хранит пароли в bcrypt. Хэши переносятся как есть — существующие пользователи входят без сброса пароля.

#### Новый файл: `src/lib/auth/users.ts`

Заменяет все 16 вызовов Supabase Admin API:

| Supabase Admin API                             | Замена в `users.ts`                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `signInWithPassword(email, pass)`              | `SELECT` user by email + `bcrypt.compare(pass, hash)`                                       |
| `createUser(email, pass)`                      | `INSERT INTO users` + `bcrypt.hash(pass, 12)`                                               |
| `deleteUser(id)`                               | `DELETE FROM users WHERE id = $1` (CASCADE удаляет всё)                                     |
| `getUserById(id)`                              | `SELECT FROM users WHERE id = $1`                                                           |
| `listUsers()`                                  | `SELECT FROM users` с пагинацией                                                            |
| `updateUserById(id, { email_verified: true })` | `UPDATE users SET email_verified = true WHERE id = $1`                                      |
| `generateLink('signup', email)`                | Генерировать UUID-токен → `INSERT INTO email_verification_tokens` → отправить через Postfix |
| `generateLink('recovery', email)`              | То же — таблица `email_verification_tokens` уже есть в миграциях                            |

#### `set-password-form.tsx` — замена браузерного Supabase-клиента

Сейчас: `supabase.auth.updateUser({ password })` — единственный браузерный вызов Supabase.

Замена:

```typescript
// Новый API-маршрут: POST /api/auth/set-password
// Принимает: { token: string, password: string }
// Верифицирует токен из email_verification_tokens
// Обновляет password_hash в таблице users
// Инвалидирует токен
```

#### NextAuth `options.ts` — что меняется

```typescript
// Было:
const user = await supabaseAuthClient.auth.signInWithPassword({ email, password });

// Станет:
const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
const valid = await bcrypt.compare(password, user.password_hash);
```

#### Зависимости

```bash
# Добавить
npm i bcrypt drizzle-orm pg
npm i -D @types/bcrypt @types/pg drizzle-kit

# Удалить
npm uninstall @supabase/supabase-js @supabase/ssr
```

---

### Рекомендуемый ORM: Drizzle

- Лёгкий (90 KB), без кодогенерации
- SQL-first — ближе к текущим Supabase-запросам
- Поддержка `uuid`, `jsonb`, `timestamp` из коробки
- Схема описывается в TypeScript (один файл `schema.ts`)
- Существующие SQL-миграции можно переиспользовать напрямую

### Порядок миграции кода

```
День 1 — фундамент:
  1. npm i drizzle-orm pg bcrypt && npm i -D drizzle-kit @types/pg @types/bcrypt
  2. Создать src/lib/db/schema.ts (из SQL-миграций, включая новую таблицу users)
  3. Создать src/lib/db/index.ts (подключение через DATABASE_URL)
  4. Создать src/lib/auth/users.ts (CRUD — замена всех 16 вызовов Supabase Admin API)
  5. Переписать src/lib/auth/options.ts (NextAuth authorize: bcrypt вместо supabase.auth)

День 2 — auth API-маршруты:
  6. Переписать POST /api/auth/register → users.createUser()
  7. Переписать POST /api/auth/forgot-password → users.generateResetToken() + Postfix
  8. Создать POST /api/auth/set-password → users.setPassword(token, newHash)
  9. Переписать GET /api/auth/verify-email → users.verifyEmail(token)
  10. Переписать src/lib/api/auth.ts — убрать Supabase cookie-ветку

День 3 — подготовка Drizzle-схемы:
  11. Создать полный src/lib/db/schema.ts для всех ~17 таблиц public.*
  12. Генерировать типы: npx drizzle-kit generate
  13. Заменить импорты Supabase types (Tables<'name'>) → Drizzle types

Дни 4–5 — переписать ~35 файлов с supabaseAdmin.from():
  14. Начать с простых (profiles, usage_counters, user_preferences)
  15. Затем сложные связи (charts → chart_snapshots → positions/aspects)
  16. Readings, follow_up_threads, compatibility_reports
  17. Admin routes (listUsers, deleteUser, resetUsage)

День 6 — email и финализация:
  18. Заменить Resend → nodemailer (3 файла)
  19. Тестирование: регистрация, логин, сброс пароля, верификация email
  20. Тестирование: удаление аккаунта (ON DELETE CASCADE)
  21. npm uninstall @supabase/supabase-js @supabase/ssr
  22. Убрать SUPABASE_* из .env.example, добавить DATABASE_URL, SMTP_*
  23. Добавить output: 'standalone' в next.config.ts

День 7 — деплой:
  24. Тестирование на локальном PostgreSQL (полный прогон)
  25. Настройка VPS (этапы 1–8 этого документа)
  26. Деплой на VPS, финальные проверки по чеклисту
```

---

## Чеклист готовности

### Перед запуском VPS

- [ ] VPS заказан и доступен по SSH
- [ ] Пользователь `clario` создан, root-вход отключён
- [ ] UFW настроен (22→2222, 80, 443)
- [ ] Fail2ban работает
- [ ] Swap 2 GB создан
- [ ] PostgreSQL установлен, БД создана, пароль сгенерирован
- [ ] Nginx установлен, конфиг проверен (`nginx -t`)
- [ ] DNS A-запись указывает на VPS
- [ ] SSL-сертификат получен (certbot)
- [ ] Postfix отправляет письма (SPF, DKIM, DMARC)
- [ ] PM2 запускает Next.js
- [ ] Cron бэкапов работает
- [ ] Healthcheck работает
- [ ] `.env` на VPS заполнен

### После миграции

- [ ] Регистрация нового пользователя работает
- [ ] Логин существующего пользователя работает
- [ ] Создание карты работает
- [ ] Генерация разбора (LLM) работает
- [ ] Follow-up чат работает
- [ ] Email (подтверждение, сброс) доставляются
- [ ] Cookie-баннер работает
- [ ] Удаление аккаунта удаляет все данные
- [ ] Админка работает
- [ ] HTTPS и www→non-www редирект работают
- [ ] `pm2 logs clario` — нет ошибок
- [ ] Бэкап БД можно восстановить (`psql < backup.sql`)

---

_Документ создан: 23 апреля 2026 г._
