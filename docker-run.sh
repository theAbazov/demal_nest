#!/bin/bash

# Скрипт для управления Docker контейнерами

set -e

case "$1" in
  start)
    echo "🚀 Запуск всех сервисов..."
    docker-compose up -d
    echo "⏳ Ожидание готовности сервисов..."
    sleep 10
    echo "📦 Применение миграций базы данных..."
    docker-compose exec -T app npx prisma migrate deploy || echo "⚠️ Миграции уже применены или база данных еще не готова"
    echo "✅ Сервисы запущены!"
    echo ""
    echo "📋 Доступ к сервисам:"
    echo "  - API: http://localhost:3000"
    echo "  - Swagger: http://localhost:3000/api/docs"
    echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
    ;;
  
  stop)
    echo "🛑 Остановка всех сервисов..."
    docker-compose down
    echo "✅ Сервисы остановлены!"
    ;;
  
  restart)
    echo "🔄 Перезапуск всех сервисов..."
    docker-compose restart
    echo "✅ Сервисы перезапущены!"
    ;;
  
  logs)
    if [ -z "$2" ]; then
      docker-compose logs -f
    else
      docker-compose logs -f "$2"
    fi
    ;;
  
  build)
    echo "🔨 Сборка образа..."
    docker-compose build --no-cache
    echo "✅ Образ собран!"
    ;;
  
  migrate)
    echo "📦 Применение миграций..."
    docker-compose exec app npx prisma migrate deploy
    echo "✅ Миграции применены!"
    ;;
  
  shell)
    docker-compose exec app sh
    ;;
  
  clean)
    echo "🧹 Очистка контейнеров и volumes..."
    read -p "Вы уверены? Это удалит все данные! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      docker system prune -f
      echo "✅ Очистка завершена!"
    else
      echo "❌ Отменено"
    fi
    ;;
  
  status)
    docker-compose ps
    ;;
  
  *)
    echo "Использование: $0 {start|stop|restart|logs|build|migrate|shell|clean|status}"
    echo ""
    echo "Команды:"
    echo "  start   - Запустить все сервисы"
    echo "  stop    - Остановить все сервисы"
    echo "  restart - Перезапустить все сервисы"
    echo "  logs    - Показать логи (можно указать сервис: app, postgres, minio)"
    echo "  build   - Пересобрать образ"
    echo "  migrate - Применить миграции Prisma"
    echo "  shell   - Войти в контейнер приложения"
    echo "  clean   - Удалить контейнеры и volumes"
    echo "  status  - Показать статус сервисов"
    exit 1
    ;;
esac
