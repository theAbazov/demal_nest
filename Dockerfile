# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Установка системных зависимостей для Prisma
RUN apk add --no-cache openssl libc6-compat

# Копируем файлы для установки зависимостей
COPY package.json yarn.lock ./

# Устанавливаем все зависимости (production + dev для сборки)
RUN yarn install --frozen-lockfile && \
    yarn cache clean

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Копируем зависимости из предыдущего stage
COPY --from=dependencies /app/node_modules ./node_modules

# Копируем исходный код
COPY . .

# Копируем Prisma schema
COPY prisma ./prisma

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение
RUN yarn build

# ============================================
# Stage 3: Production
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Устанавливаем системные зависимости
RUN apk add --no-cache openssl libc6-compat

# Создаем непривилегированного пользователя
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Копируем только production зависимости
COPY --from=dependencies /app/node_modules ./node_modules

# Копируем собранное приложение
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/package.json ./package.json

# Копируем Prisma файлы для миграций
COPY --from=build /app/prisma ./prisma

# Меняем владельца файлов
RUN chown -R nestjs:nodejs /app

# Переключаемся на непривилегированного пользователя
USER nestjs

# Открываем порт
EXPOSE 3000

# Переменные окружения по умолчанию
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1', (r) => {process.exit(r.statusCode >= 200 && r.statusCode < 500 ? 0 : 1)})"

# Запуск приложения
CMD ["node", "dist/main.js"]
